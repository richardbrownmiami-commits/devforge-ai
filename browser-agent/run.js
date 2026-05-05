#!/usr/bin/env node
/**
 * BrainForge Browser Agent
 * Opens Caffeine AI, types the current instruction, captures the response.
 * Uses a persistent Chromium profile so login is preserved across runs.
 */

const { chromium } = require('playwright');
const https = require('https');

const GITHUB_PAT = process.env.GITHUB_PAT;
const REPO = 'richardbrownmiami-commits/devforge-ai';
const HOP = process.env.HOP_NUMBER || '0';
const RAW_BASE = 'https://raw.githubusercontent.com/' + REPO + '/main';
const API_BASE = 'https://api.github.com/repos/' + REPO + '/contents';

// ── helpers ──────────────────────────────────────────────────────────────────

function githubRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'Authorization': 'token ' + GITHUB_PAT,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'BrainForge-Agent/1.0',
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function fetchRaw(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

async function getFileSHA(path) {
  const res = await githubRequest('GET', '/repos/' + REPO + '/contents/' + path);
  return res.status === 200 ? res.data.sha : null;
}

async function writeFile(filePath, content, message) {
  const sha = await getFileSHA(filePath);
  const body = {
    message,
    content: Buffer.from(content).toString('base64'),
    ...(sha ? { sha } : {})
  };
  const res = await githubRequest('PUT', '/repos/' + REPO + '/contents/' + filePath, body);
  if (res.status !== 200 && res.status !== 201) {
    throw new Error('GitHub write failed for ' + filePath + ': ' + JSON.stringify(res.data));
  }
  return res.data;
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[Agent] Starting hop ' + HOP);

  // 1. Read current instruction
  console.log('[Agent] Reading instructions...');
  const instruction = (await fetchRaw(RAW_BASE + '/browser-agent/instructions.md')).trim();
  console.log('[Agent] Instruction: ' + instruction);

  // 2. Launch browser with persistent profile
  console.log('[Agent] Launching browser...');
  const browser = await chromium.launchPersistentContext('./browser-agent/profile', {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  let response = '';

  try {
    const page = await browser.newPage();

    // 3. Navigate to Caffeine AI
    console.log('[Agent] Navigating to caffeine.ai...');
    await page.goto('https://caffeine.ai', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // 4. Find chat input — try multiple selectors
    const chatSelectors = [
      'textarea[placeholder*="message" i]',
      'textarea[placeholder*="type" i]',
      'textarea[placeholder*="ask" i]',
      'textarea',
      'input[type="text"][placeholder*="message" i]',
      '[contenteditable="true"]',
      '[data-testid*="chat"]',
      '[data-testid*="input"]'
    ];

    let chatInput = null;
    for (const sel of chatSelectors) {
      try {
        const el = await page.waitForSelector(sel, { timeout: 5000 });
        if (el) { chatInput = sel; break; }
      } catch { /* continue */ }
    }

    if (!chatInput) {
      console.log('[Agent] Chat input not found — may need login');
      // Take screenshot for debug
      await page.screenshot({ path: 'browser-agent/debug-screenshot.png' });
      response = 'ERROR: Chat input not found. Browser may need login. See debug-screenshot.png';
    } else {
      // 5. Type the instruction
      console.log('[Agent] Typing instruction...');
      await page.click(chatInput);
      await page.fill(chatInput, instruction);
      await page.keyboard.press('Enter');
      console.log('[Agent] Message sent. Waiting for response...');

      // 6. Wait for response (poll for new content, max 60s)
      await page.waitForTimeout(3000);
      let lastContent = '';
      let stableCount = 0;
      const deadline = Date.now() + 60000;

      while (Date.now() < deadline) {
        const responseSelectors = [
          '[data-role="assistant"]',
          '.assistant-message',
          '.ai-message',
          '[data-testid*="assistant"]',
          '[data-testid*="response"]',
          '.message:last-child',
          '.chat-message:last-child'
        ];
        let currentContent = '';
        for (const rSel of responseSelectors) {
          try {
            const els = await page.$$(rSel);
            if (els.length > 0) {
              const last = els[els.length - 1];
              currentContent = await last.textContent() || '';
              if (currentContent) break;
            }
          } catch { /* continue */ }
        }

        if (!currentContent) {
          // fallback: grab all text on page
          currentContent = await page.textContent('body') || '';
        }

        if (currentContent === lastContent) {
          stableCount++;
          if (stableCount >= 3) { break; } // stable for 3 checks = done
        } else {
          stableCount = 0;
          lastContent = currentContent;
        }
        await page.waitForTimeout(2000);
      }

      response = lastContent.substring(0, 4000); // cap at 4KB
      console.log('[Agent] Response captured (' + response.length + ' chars)');
    }
  } finally {
    await browser.close();
  }

  // 7. Write response to repo
  console.log('[Agent] Writing response to repo...');
  const timestamp = new Date().toISOString();
  const responseContent = '# Agent Response — Hop ' + HOP + '\n\n**Timestamp:** ' + timestamp + '\n\n**Instruction:**\n' + instruction + '\n\n**Response:**\n' + response + '\n';
  await writeFile('browser-agent/response.md', responseContent, 'Agent hop ' + HOP + ' response');

  // 8. Append to log
  console.log('[Agent] Appending to log...');
  let existingLog = '';
  try { existingLog = await fetchRaw(RAW_BASE + '/browser-agent/log.md'); } catch { /* new file */ }
  const logEntry = '\n## Hop ' + HOP + ' — ' + timestamp + '\n- **Instruction:** ' + instruction + '\n- **Response length:** ' + response.length + ' chars\n- **First 200 chars:** ' + response.substring(0, 200).replace(/\n/g, ' ') + '\n';
  await writeFile('browser-agent/log.md', existingLog + logEntry, 'Agent hop ' + HOP + ' log entry');

  console.log('[Agent] Hop ' + HOP + ' complete.');
}

main().catch(err => {
  console.error('[Agent] Fatal error:', err);
  process.exit(1);
});
