const { chromium } = require('playwright');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PAT = process.env.GITHUB_PAT || '';
const REPO = 'richardbrownmiami-commits/devforge-ai';
const MAX_HOPS = 3;
const DELAY_MS = 3000;
const USER_DATA_DIR = path.join(__dirname, 'user-data');
const SETUP_MODE = process.argv.includes('--setup');

// ── GitHub API helpers ────────────────────────────────────────────────────────

function githubRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.github.com',
      path: apiPath,
      method,
      headers: {
        'Authorization': `token ${PAT}`,
        'User-Agent': 'browser-agent',
        'Accept': 'application/vnd.github.v3+json',
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch (e) { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function getFileSha(filePath) {
  const res = await githubRequest('GET', `/repos/${REPO}/contents/${filePath}`);
  if (res.status === 200) return res.data.sha;
  return null;
}

async function writeFileToRepo(filePath, content, message) {
  const sha = await getFileSha(filePath);
  const body = {
    message,
    content: Buffer.from(content).toString('base64'),
    ...(sha ? { sha } : {})
  };
  const res = await githubRequest('PUT', `/repos/${REPO}/contents/${filePath}`, body);
  if (res.status === 200 || res.status === 201) {
    console.log(`✓ Written: ${filePath} — ${res.data.commit?.html_url}`);
    return res.data;
  }
  throw new Error(`Failed to write ${filePath}: ${JSON.stringify(res.data)}`);
}

async function readFileFromRepo(filePath) {
  const res = await githubRequest('GET', `/repos/${REPO}/contents/${filePath}`);
  if (res.status === 200) {
    return Buffer.from(res.data.content, 'base64').toString('utf8').trim();
  }
  return null;
}

// ── Browser helpers ───────────────────────────────────────────────────────────

async function getResponse(page, timeoutMs = 8000) {
  await page.waitForTimeout(timeoutMs);

  const selectors = [
    '[data-role="assistant"]:last-child',
    '.assistant-message:last-child',
    '[class*="assistant"]:last-child',
    '[class*="response"]:last-child',
    '[class*="message"]:last-child',
    '[class*="chat"] [class*="ai"]:last-child',
  ];

  for (const sel of selectors) {
    try {
      const el = page.locator(sel).last();
      const count = await el.count();
      if (count > 0) {
        const text = await el.innerText();
        if (text && text.trim().length > 0) return text.trim();
      }
    } catch (_) {}
  }

  // Fallback: grab last substantive text node on the page
  const allText = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll('p, div, span')];
    return nodes
      .filter(n => n.children.length === 0 && n.innerText && n.innerText.trim().length > 10)
      .map(n => n.innerText.trim());
  });
  if (allText.length > 0) return allText[allText.length - 1];
  return '(no response detected)';
}

async function findChatInput(page) {
  const selectors = [
    'textarea',
    'input[type="text"]',
    '[contenteditable="true"]',
    '[role="textbox"]',
    '[class*="chat"] input',
    '[class*="message"] textarea',
  ];
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).last();
      if (await el.count() > 0 && await el.isVisible()) return el;
    } catch (_) {}
  }
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (SETUP_MODE) {
    console.log('🔧 Setup mode — browser will open visibly.');
    console.log('   Log in to Caffeine AI, then close the browser window to save your session.\n');
    const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
      headless: false,
      args: ['--no-sandbox'],
    });
    const page = browser.pages()[0] || await browser.newPage();
    await page.goto('https://caffeine.ai');
    await new Promise((resolve) => browser.on('disconnected', resolve));
    console.log('\n✓ Session saved to user-data/');
    console.log('  Run `node run.js` for headless operation.');
    return;
  }

  if (!fs.existsSync(USER_DATA_DIR)) {
    console.error('❌ No user-data/ folder found.');
    console.error('   Run `node run.js --setup` first to save your Caffeine AI login session.');
    process.exit(1);
  }

  if (!PAT) {
    console.warn('⚠  GITHUB_PAT env var not set — responses will not be written back to the repo.');
  }

  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: true,
    args: ['--no-sandbox'],
  });

  const page = browser.pages()[0] || await browser.newPage();

  console.log('🌐 Navigating to https://caffeine.ai …');
  await page.goto('https://caffeine.ai', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  let hop = 0;
  const log = [];

  while (hop < MAX_HOPS) {
    hop++;

    // Read instruction from repo; fall back to "hi"
    let instruction = 'hi';
    if (PAT) {
      const remote = await readFileFromRepo('browser-agent/instructions.md');
      if (remote) instruction = remote;
    }
    console.log(`\n[Hop ${hop}/${MAX_HOPS}] Sending: "${instruction}"`);

    const input = await findChatInput(page);
    if (!input) {
      console.error('❌ Could not find chat input. The workspace may not have loaded or your login session may have expired.');
      console.error('   Re-run `node run.js --setup` to refresh your session.');
      break;
    }

    await input.click();
    await input.fill(instruction);
    await page.keyboard.press('Enter');

    console.log('⏳ Waiting for response…');
    const response = await getResponse(page, 5000);
    console.log(`💬 Response: ${response.slice(0, 120)}${response.length > 120 ? '…' : ''}`);

    const timestamp = new Date().toISOString();
    log.push(`## Hop ${hop} — ${timestamp}\n\n**Sent:** ${instruction}\n\n**Response:**\n${response}\n`);

    if (PAT) {
      const content = `# Browser Agent Response Log\n\n_Last updated: ${timestamp}_\n\n---\n\n${log.join('\n---\n\n')}`;
      await writeFileToRepo(
        'browser-agent/response.md',
        content,
        `browser-agent: hop ${hop} response — ${timestamp}`
      );
    }

    if (hop < MAX_HOPS) {
      console.log(`⏸  Waiting ${DELAY_MS / 1000}s before next hop…`);
      await page.waitForTimeout(DELAY_MS);
    }
  }

  console.log(`\n✅ Completed ${hop} hop(s). Closing browser.`);
  await browser.close();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
