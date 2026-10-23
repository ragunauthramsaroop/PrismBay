#!/usr/bin/env node
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import {completeVia9Router} from "./agency-agents-model-client.mjs";
import { DatabaseSync } from "node:sqlite";

const ROUTER_BASE = "http://127.0.0.1:20128";
const ROUTER_API = `${ROUTER_BASE}/v1`;
const PREFERRED_MODEL = "oc/muse-spark-1.3-contributor-free";
const PINNED_9ROUTER = "9router@0.5.91";
const PINNED_CLAUDE = "@anthropic-ai/claude-code@2.1.283";
// Keep all generated router credentials local to the active cloud runtime.

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function commandExists(name) {
  return spawnSync("which", [name], { stdio: "ignore" }).status === 0;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: options.env || process.env,
    cwd: options.cwd || process.cwd(),
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status}`);
}

function runCapture(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    env: options.env || process.env,
    cwd: options.cwd || process.cwd(),
    maxBuffer: 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status}`);
  return result.stdout || "";
}

function argValue(prefix) {
  const item = process.argv.slice(2).find((arg) => arg.startsWith(`${prefix}=`));
  return item ? item.slice(prefix.length + 1) : "";
}

async function ensureTools() {
  if (commandExists("9router") && commandExists("claude")) return;
  console.log("Installing pinned 9Router and Claude Code packages...");
  run("npm", [
    "install",
    "-g",
    "--allow-scripts=9router,@anthropic-ai/claude-code",
    PINNED_9ROUTER,
    PINNED_CLAUDE,
  ]);
  if (!commandExists("9router") || !commandExists("claude")) {
    throw new Error("9Router or Claude Code is still unavailable after installation.");
  }
}

async function probe(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2500) });
    return response.ok;
  } catch {
    return false;
  }
}

async function routerHealthy() {
  if (await probe(`${ROUTER_BASE}/api/health`)) return true;
  return probe(`${ROUTER_BASE}/health`);
}

async function ensureRouter() {
  if (await routerHealthy()) {
    console.log("9Router is already running.");
    return;
  }

  const dataDir = process.env.DATA_DIR || path.join(os.homedir(), ".9router");
  await fsp.mkdir(dataDir, { recursive: true });
  const logPath = path.join(dataDir, "prismbay-9router.log");
  const out = fs.openSync(logPath, "a");
  const child = spawn(
    "9router",
    ["--host", "127.0.0.1", "--no-browser", "--skip-update"],
    {
      detached: true,
      stdio: ["ignore", out, out],
      env: { ...process.env, NO_COLOR: "1" },
    },
  );
  child.unref();
  fs.closeSync(out);

  console.log("Starting 9Router privately on 127.0.0.1:20128...");
  for (let attempt = 0; attempt < 45; attempt += 1) {
    if (await routerHealthy()) {
      console.log("9Router is ready.");
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`9Router did not become healthy. Inspect ${logPath}`);
}

function readLegacyKey(dataDir) {
  const legacyPath = path.join(dataDir, "db.json");
  if (!fs.existsSync(legacyPath)) return "";
  try {
    const parsed = JSON.parse(fs.readFileSync(legacyPath, "utf8"));
    const rows = parsed.apiKeys || parsed.data?.apiKeys || [];
    const row = rows.find((item) => item?.isActive !== false && typeof item?.key === "string");
    return row?.key || "";
  } catch {
    return "";
  }
}

export function readActiveKey({
  homeDir = os.homedir(),
  dataDir = process.env.DATA_DIR || path.join(homeDir, ".9router"),
} = {}) {
  if (process.env.NINE_ROUTER_API_KEY) return process.env.NINE_ROUTER_API_KEY;

  const dbPath = path.join(dataDir, "db", "data.sqlite");
  if (fs.existsSync(dbPath)) {
    try {
      const db = new DatabaseSync(dbPath, { readOnly: true });
      const row = db
        .prepare("SELECT key FROM apiKeys WHERE isActive = 1 ORDER BY createdAt DESC LIMIT 1")
        .get();
      db.close();
      if (row?.key) return String(row.key);
    } catch {
      // Try the legacy JSON store below.
    }
  }
  return readLegacyKey(dataDir);
}

export function createLocalKey({
  homeDir = os.homedir(),
  dataDir = process.env.DATA_DIR || path.join(homeDir, ".9router"),
} = {}) {
  const dbPath = path.join(dataDir, "db", "data.sqlite");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const machineFile = path.join(dataDir, "machine-id");
  let machineId = "";
  try {
    machineId = fs.readFileSync(machineFile, "utf8").trim();
  } catch {
    machineId = crypto.randomBytes(8).toString("hex");
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(machineFile, machineId, { mode: 0o600 });
  }
  if (!machineId) machineId = crypto.randomBytes(8).toString("hex");

  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let keyId = "";
  for (let i = 0; i < 6; i += 1) {
    keyId += alphabet[crypto.randomInt(0, alphabet.length)];
  }
  const secret = process.env.API_KEY_SECRET || "endpoint-proxy-api-key-secret";
  const crc = crypto
    .createHmac("sha256", secret)
    .update(machineId + keyId)
    .digest("hex")
    .slice(0, 8);
  const key = `sk-${machineId}-${keyId}-${crc}`;

  const db = new DatabaseSync(dbPath);
  try {
    db.exec(
      "CREATE TABLE IF NOT EXISTS apiKeys(id TEXT PRIMARY KEY, key TEXT UNIQUE NOT NULL, name TEXT, machineId TEXT, isActive INTEGER DEFAULT 1, createdAt TEXT NOT NULL)",
    );
    db.exec("CREATE INDEX IF NOT EXISTS idx_ak_key ON apiKeys(key)");
    const id = crypto.randomUUID();
    db.prepare(
      "INSERT INTO apiKeys(id, key, name, machineId, isActive, createdAt) VALUES(?, ?, ?, ?, 1, ?)",
    ).run(id, key, "PrismBay Claude automation", machineId, new Date().toISOString());
  } finally {
    db.close();
  }
  return key;
}

function ensureActiveKey() {
  const existing = readActiveKey();
  if (existing) return existing;
  const created = createLocalKey();
  if (!created) return "";
  console.log("Created a local 9Router API key for this cloud runtime. Key was not printed.");
  return created;
}

async function listModels(apiKey) {
  const response = await fetch(`${ROUTER_API}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    throw new Error(`9Router model catalog returned HTTP ${response.status}`);
  }
  const payload = await response.json();
  const ids = Array.isArray(payload?.data)
    ? payload.data.map((item) => item?.id).filter((id) => typeof id === "string")
    : [];
  if (!ids.length) throw new Error("9Router returned no model IDs.");
  return ids;
}

export function selectModel(ids, requested = process.env.NINE_ROUTER_MODEL || PREFERRED_MODEL) {
  if (ids.includes(requested)) return requested;
  return (
    ids.find((id) => id.startsWith("oc/") && id.includes("muse-spark-1.3") && id.includes("free")) ||
    ids.find((id) => id.startsWith("oc/") && id.includes("free")) ||
    ""
  );
}

export function buildClaudeSettings(existing, apiKey, model) {
  return {
    ...(existing || {}),
    hasCompletedOnboarding: true,
    env: {
      ...(existing?.env || {}),
      ANTHROPIC_BASE_URL: ROUTER_API,
      ANTHROPIC_AUTH_TOKEN: apiKey,
      ANTHROPIC_DEFAULT_FABLE_MODEL: model,
      ANTHROPIC_DEFAULT_OPUS_MODEL: model,
      ANTHROPIC_DEFAULT_SONNET_MODEL: model,
      ANTHROPIC_DEFAULT_HAIKU_MODEL: model,
    },
  };
}

async function configureClaude(apiKey, model, homeDir = os.homedir()) {
  const claudeDir = path.join(homeDir, ".claude");
  const settingsPath = path.join(claudeDir, "settings.json");
  const backupPath = path.join(claudeDir, "settings.json.prismbay-backup");
  await fsp.mkdir(claudeDir, { recursive: true, mode: 0o700 });

  let existing = {};
  if (fs.existsSync(settingsPath)) {
    const raw = await fsp.readFile(settingsPath, "utf8");
    try {
      existing = JSON.parse(raw.replace(/,(\s*[}\]])/g, "$1"));
    } catch {
      throw new Error(`Existing Claude settings are not valid JSON: ${settingsPath}`);
    }
    if (!fs.existsSync(backupPath)) await fsp.copyFile(settingsPath, backupPath);
  }

  const next = buildClaudeSettings(existing, apiKey, model);
  const tempPath = `${settingsPath}.tmp`;
  await fsp.writeFile(tempPath, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
  await fsp.rename(tempPath, settingsPath);
  await fsp.chmod(settingsPath, 0o600);
  console.log(`Claude Code configured for ${model}. API key was not printed.`);
}

function wrapperEnv(apiKey, model) {
  const env = {
    ...process.env,
    NINE_ROUTER_API_KEY: apiKey,
    NINE_ROUTER_MODEL: model,
    // 9Router exposes provider IDs that Claude Code may not recognize in its
    // built-in model catalog. Allow the gateway to handle the advertised model
    // rather than aborting on Claude Code's local window-size lookup.
    CLAUDE_CODE_DISABLE_UNKNOWN_MODEL_WINDOW_ENFORCEMENT: "1",
  };
  delete env.ANTHROPIC_API_KEY;
  return env;
}

async function selfTest() {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), "prismbay-router-test-"));
  try {
    const dataDir = path.join(root, ".9router");
    await fsp.mkdir(path.join(dataDir, "db"), { recursive: true });
    const db = new DatabaseSync(path.join(dataDir, "db", "data.sqlite"));
    db.exec("CREATE TABLE apiKeys(id TEXT PRIMARY KEY, key TEXT, name TEXT, machineId TEXT, isActive INTEGER, createdAt TEXT)");
    db.prepare("INSERT INTO apiKeys(id, key, name, machineId, isActive, createdAt) VALUES (?, ?, ?, ?, ?, ?)").run(
      "1",
      "sk-self-test",
      "self-test",
      "machine-self-test",
      1,
      "2026-09-28T00:00:00Z",
    );
    db.close();

    const prior = process.env.NINE_ROUTER_API_KEY;
    delete process.env.NINE_ROUTER_API_KEY;
    const key = readActiveKey({ homeDir: root, dataDir });
    if (key !== "sk-self-test") throw new Error("SQLite key lookup failed.");
    const writable = new DatabaseSync(path.join(dataDir, "db", "data.sqlite"));
    writable.exec("DELETE FROM apiKeys");
    writable.close();
    const generated = createLocalKey({ homeDir: root, dataDir });
    if (!generated.startsWith("sk-")) throw new Error("Local key generation failed.");
    const reread = readActiveKey({ homeDir: root, dataDir });
    if (reread !== generated) throw new Error("Generated key was not persisted.");
    if (prior) process.env.NINE_ROUTER_API_KEY = prior;

    const ids = ["oc/union-alpha", PREFERRED_MODEL];
    const model = selectModel(ids);
    if (model !== PREFERRED_MODEL) throw new Error("Preferred model selection failed.");

    const settings = buildClaudeSettings({ env: { KEEP_ME: "1" } }, "secret", model);
    if (
      settings.env.KEEP_ME !== "1" ||
      settings.env.ANTHROPIC_AUTH_TOKEN !== "secret" ||
      settings.env.ANTHROPIC_DEFAULT_SONNET_MODEL !== PREFERRED_MODEL
    ) {
      throw new Error("Claude settings merge failed.");
    }
    console.log("PASS: Claude + 9Router automation self-test");
  } finally {
    await fsp.rm(root, { recursive: true, force: true });
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has("--self-test")) {
    await selfTest();
    return;
  }

  const launch = args.has("--launch");
  const verify = args.has("--verify");
  const promptFile = argValue("--prompt-file");
  const chatPromptFile = argValue("--chat-prompt-file");
  const outputFile = argValue("--output-file");

  await ensureTools();
  await ensureRouter();

  const apiKey = ensureActiveKey();
  if (!apiKey) {
    throw new Error("Unable to create or load a local 9Router API key.");
  }

  const models = await listModels(apiKey);
  const model = selectModel(models);
  if (!model) {
    throw new Error(
      "No approved OpenCode free model is currently advertised by this 9Router instance.",
    );
  }

  await configureClaude(apiKey, model);

  const env = wrapperEnv(apiKey, model);
  run("bash", ["scripts/claude-9router.sh", "--check"], { env });

  // Agency Agents advisory needs text only. Use the router's supported
  // OpenAI-compatible HTTP endpoint instead of Claude Code's model catalog.
  // The old --prompt-file flow remains unchanged for existing GitHub agents.
  if (chatPromptFile) {
    const prompt = (await fsp.readFile(chatPromptFile, "utf8")).trim();
    const response = await completeVia9Router({apiKey,model,prompt});
    if (outputFile) {
      await fsp.writeFile(outputFile, response + "\n", {mode:0o600});
      console.log("Free-model advisory completed and saved to protected output.");
    } else {
      console.log(response);
    }
    return;
  }

  if (promptFile) {
    const prompt = (await fsp.readFile(promptFile, "utf8")).trim();
    if (!prompt) throw new Error("Claude task prompt is empty.");
    const response = runCapture(
      "bash",
      ["scripts/claude-9router.sh", "--run", "--print", prompt],
      { env },
    ).trim();
    if (!response) throw new Error("Claude returned an empty response.");
    if (outputFile) {
      await fsp.writeFile(outputFile, `${response}\n`, { mode: 0o600 });
      console.log("Claude task completed. Response written to the protected output file.");
    } else {
      console.log(response);
    }
    return;
  }

  if (verify) {
    run(
      "bash",
      [
        "scripts/claude-9router.sh",
        "--run",
        "--print",
        "Reply only with: CLAUDE ROUTER WORKING",
      ],
      { env },
    );
    return;
  }

  if (launch) {
    console.log("Opening Claude Code through the free 9Router model...");
    run("bash", ["scripts/claude-9router.sh", "--run"], { env });
    return;
  }

  console.log("Setup complete. Run: npm run claude:free");
}

main().catch((error) => fail(error?.message || String(error)));
