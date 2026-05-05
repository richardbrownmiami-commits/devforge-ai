const { chromium } = require("playwright");
const https = require("https");
const http = require("http");
const path = require("path");
const fs = require("fs");

// ── Config ────────────────────────────────────────────────────────────────────
const REPO = "richardbrownmiami-commits/devforge-ai";
const PAT = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN || "";
const MAX_HOPS = 50;
const HOP_DELAY_MS = 10000; // 10s between hops
const ROLE_DECLARATION = "AGENT ROLE: Autonomous research agent reading memory and continuing research.\n\n";
const PROFILE_DIR = path.join(__dirname, "user-data");

// ── GitHub API helpers ────────────────────────────────────────────────────────
async function ghRequest(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "api.github.com",
      path: `/repos/${REPO}${endpoint}`,
      method,
      headers: {
        Authorization: `token ${PAT}`,
        "User-Agent": "BrainForge-Agent/1.0",
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: raw ? JSON.parse(raw) : {} }); }
        catch (e) { resolve({ status: res.statusCode, data: raw }); }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function ghGetFile(filePath) {
  const r = await ghRequest("GET", `/contents/${filePath}`);
  if (r.status === 404) return { exists: false, content: "", sha: null };
  const content = Buffer.from(r.data.content || "", "base64").toString("utf8");
  return { exists: true, content, sha: r.data.sha };
}

async function ghWriteFile(filePath, content, commitMsg) {
  const existing = await ghGetFile(filePath);
  const body = {
    message: commitMsg || `agent-loop: update ${filePath}`,
    content: Buffer.from(content).toString("base64"),
  };
  if (existing.sha) body.sha = existing.sha;
  const r = await ghRequest("PUT", `/contents/${filePath}`, body);
  return r;
}

async function ghCheckStop() {
  const r = await ghGetFile("browser-agent/STOP");
  return r.exists;
}

async function getHopCount() {
  const r = await ghGetFile("browser-agent/hop-count.txt");
  if (!r.exists) return 0;
  const n = parseInt(r.content.trim(), 10);
  return isNaN(n) ? 0 : n;
}

async function setHopCount(n) {
  await ghWriteFile("browser-agent/hop-count.txt", String(n), `agent-loop: hop ${n}`);
}

async function appendLog(entry) {
  const r = await ghGetFile("browser-agent/log.md");
  const ts = new Date().toISOString();
  const newLine = `\n## [${ts}] Hop ${entry.hop}\n- Instruction: ${entry.instruction.slice(0, 200)}\n- Response preview: ${entry.response.slice(0, 300)}\n`;
  const updated = (r.content || "# Agent Loop Log\n") + newLine;
  await ghWriteFile("browser-agent/log.md", updated, `agent-loop: log hop ${entry.hop}`);
}

async function appendMemory(entry) {
  const r = await ghGetFile("memory.md");
  const ts = new Date().toISOString();
  const newEntry = `\n\n---\n## [Agent Loop] Hop ${entry.hop} — ${ts}\n**Instruction:** ${entry.instruction}\n**Response summary:** ${entry.response.slice(0, 500)}\n`;
  const updated = (r.content || "") + newEntry;
  await ghWriteFile("memory.md", updated, `agent-loop: memory update hop ${entry.hop}`);
}

// ── Browser helpers ───────────────────────────────────────────────────────────
async function waitForSelector(page, selector, timeout = 15000) {
  await page.waitForSelector(selector, { timeout });
}

async function typeAndSend(page, message) {
  // Try common chat input selectors
  const selectors = [
    "textarea[placeholder*=message i]",
    "textarea[placeholder*=chat i]",
    "textarea[placeholder*=type i]",
    "textarea[placeholder*=send i]",
    "div[contenteditable=true]",
    "textarea",
    "input[type=text]",
  ];

  let inputEl = null;
  for (const sel of selectors) {
    try {
      inputEl = await page.waitForSelector(sel, { timeout: 5000 });
      if (inputEl) break;
    } catch (e) { /* try next */ }
  }

  if (!inputEl) throw new Error("No chat input found");

  await inputEl.click();
  await inputEl.fill("");
  await inputEl.type(message, { delay: 30 });

  // Try to find send button
  const sendSelectors = [
    "button[aria-label*=\"send\" i]",
    "button[type=\"submit\"]",
    "button:has-text(\"Send\")",
    "button:has-text(\"▶\")",
  ];
  let sent = false;
  for (const sel of sendSelectors) {
    try {
      const btn = await page.$(sel);
      if (btn) {
        await btn.click();
        sent = true;
        break;
      }
    } catch (e) { /* try next */ }
  }
  if (!sent) await page.keyboard.press("Enter");
}

async function waitForResponse(page, prevResponseCount) {
  // Wait up to 60s for a new AI response to appear
  const timeout = 60000;
  const start = Date.now();
  while (Date.now() - start < timeout) {
    await page.waitForTimeout(3000);
    // Count AI response elements
    const responseSelectors = [
      ".message.assistant",
      "[data-role=\"assistant\"]",
      ".ai-message",
      ".response",
      "[class*=\"assistant\"]",
      "[class*=\"response\"]",
    ];
    for (const sel of responseSelectors) {
      try {
        const els = await page.$$(sel);
        if (els.length > prevResponseCount) {
          const last = els[els.length - 1];
          const text = await last.textContent();
          if (text && text.trim().length > 20) return text.trim();
        }
      } catch (e) { /* try next */ }
    }
  }
  // Fallback: get last text block on page
  return "Response timeout — no clear AI response detected after 60s";
}

// ── Main loop ─────────────────────────────────────────────────────────────────
async function main() {
  const setupMode = process.argv.includes("--setup");

  if (!PAT) {
    console.error("ERROR: GITHUB_PAT environment variable not set");
    process.exit(1);
  }

  console.log(`[agent-loop] Starting. Setup mode: ${setupMode}`);
  console.log(`[agent-loop] Profile dir: ${PROFILE_DIR}`);

  // Check STOP signal
  const shouldStop = await ghCheckStop();
  if (shouldStop) {
    console.log("[agent-loop] STOP signal detected. Exiting.");
    process.exit(0);
  }

  // Check hop count
  const hopCount = await getHopCount();
  console.log(`[agent-loop] Current hop: ${hopCount + 1} / ${MAX_HOPS}`);
  if (hopCount >= MAX_HOPS) {
    console.log(`[agent-loop] Max hops (${MAX_HOPS}) reached. Exiting.`);
    await ghWriteFile("browser-agent/log.md",
      (await ghGetFile("browser-agent/log.md")).content + `\n## [${new Date().toISOString()}] LOOP COMPLETE\nMax hops (${MAX_HOPS}) reached.\n`,
      "agent-loop: max hops reached"
    );
    process.exit(0);
  }

  // Read current instruction
  const instrFile = await ghGetFile("browser-agent/instructions.md");
  const rawInstruction = instrFile.content.trim() ||
    "Read all memories file you saved them ask your next question";
  const fullMessage = ROLE_DECLARATION + rawInstruction;
  console.log(`[agent-loop] Instruction: ${rawInstruction.slice(0, 100)}`);

  // Launch browser with persistent profile
  const browser = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: !setupMode,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  try {
    console.log("[agent-loop] Navigating to caffeine.ai...");
    await page.goto("https://caffeine.ai", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    if (setupMode) {
      console.log("[agent-loop] SETUP MODE: Log in manually, then close the browser window.");
      console.log("[agent-loop] The session will be saved to:", PROFILE_DIR);
      // Wait for browser to be closed manually
      await new Promise((resolve) => {
        browser.on("disconnected", resolve);
      });
      console.log("[agent-loop] Session saved. Run without --setup flag to start the loop.");
      process.exit(0);
    }

    // Try to navigate to workspace/chat
    const chatUrls = [
      "https://caffeine.ai/workspace",
      "https://caffeine.ai/chat",
      "https://caffeine.ai/app",
    ];
    let foundChat = false;
    for (const chatUrl of chatUrls) {
      try {
        await page.goto(chatUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
        await page.waitForTimeout(2000);
        const content = await page.content();
        if (content.includes("textarea") || content.includes("contenteditable")) {
          foundChat = true;
          console.log(`[agent-loop] Chat found at: ${chatUrl}`);
          break;
        }
      } catch (e) { /* try next */ }
    }

    if (!foundChat) {
      // Stay on current page — try current URL as chat
      console.log("[agent-loop] Using current page as chat interface");
    }

    // Count existing responses before sending
    let prevCount = 0;
    try {
      prevCount = (await page.$$("[class*=\"assistant\"],[class*=\"response\"],.ai-message")).length;
    } catch (e) { /* ok */ }

    console.log("[agent-loop] Sending message...");
    await typeAndSend(page, fullMessage);
    await page.waitForTimeout(2000);

    console.log("[agent-loop] Waiting for response...");
    const response = await waitForResponse(page, prevCount);
    console.log(`[agent-loop] Response received (${response.length} chars)`);

    // Write response to file
    await ghWriteFile("browser-agent/response.md",
      `# Latest Response\n\n**Hop:** ${hopCount + 1}\n**Timestamp:** ${new Date().toISOString()}\n**Instruction:** ${rawInstruction}\n\n**Response:**\n${response}\n`,
      `agent-loop: response hop ${hopCount + 1}`
    );

    // Append to log
    await appendLog({ hop: hopCount + 1, instruction: rawInstruction, response });

    // Update memory
    await appendMemory({ hop: hopCount + 1, instruction: rawInstruction, response });

    // Determine next instruction — use AI response to set next question
    // Extract any question from the response, or default to continue research
    let nextInstruction = "Continue: based on your last response, go deeper on the most important finding. Ask your next research question.";
    const questionMatch = response.match(/[^.!?]*\?[^.!?]*/g);
    if (questionMatch && questionMatch.length > 0) {
      nextInstruction = questionMatch[questionMatch.length - 1].trim();
      if (nextInstruction.length < 10) nextInstruction = "Continue research on the previous topic and ask your next question.";
    }

    await ghWriteFile("browser-agent/instructions.md",
      nextInstruction,
      `agent-loop: next instruction hop ${hopCount + 1}`
    );

    // Increment hop count
    await setHopCount(hopCount + 1);

    // Rate limit pause
    console.log(`[agent-loop] Hop ${hopCount + 1} complete. Waiting ${HOP_DELAY_MS / 1000}s...`);
    await new Promise(r => setTimeout(r, HOP_DELAY_MS));

  } catch (err) {
    console.error("[agent-loop] Error:", err.message);
    await ghWriteFile("browser-agent/log.md",
      (await ghGetFile("browser-agent/log.md")).content + `\n## [${new Date().toISOString()}] ERROR on hop ${hopCount + 1}\n${err.message}\n`,
      "agent-loop: error"
    );
    process.exit(1);
  } finally {
    await browser.close();
  }

  console.log("[agent-loop] Done.");
  process.exit(0);
}

main().catch((e) => {
  console.error("[agent-loop] Fatal:", e.message);
  process.exit(1);
});
