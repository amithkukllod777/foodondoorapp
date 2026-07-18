/*
 * Reads a Claude Code session .jsonl transcript and writes a clean Markdown
 * file containing only the human-readable conversation: user messages and the
 * assistant's text replies. Tool calls / tool results / large blobs are
 * summarised to one line so the output stays readable in a browser or phone.
 *
 * Usage: node scripts/export-chat.mjs <input.jsonl> <output.md>
 */
import fs from "node:fs";
import readline from "node:readline";

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error("Usage: node export-chat.mjs <input.jsonl> <output.md>");
  process.exit(1);
}

function textFromContent(content) {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  const parts = [];
  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    if (block.type === "text" && block.text) parts.push(block.text.trim());
    else if (block.type === "tool_use") parts.push(`\n> 🔧 _tool: ${block.name}_`);
    else if (block.type === "tool_result") {
      // skip — these are large outputs, not conversation
    } else if (block.type === "thinking") {
      // skip internal thinking
    }
  }
  return parts.join("\n").trim();
}

const out = fs.createWriteStream(outPath, { encoding: "utf8" });
out.write("# Nutriwow — Chat History\n\n");
out.write(`_Exported from Claude Code session. Source: ${inPath}_\n\n---\n\n`);

const rl = readline.createInterface({ input: fs.createReadStream(inPath), crlfDelay: Infinity });

let count = 0;
for await (const line of rl) {
  const t = line.trim();
  if (!t) continue;
  let obj;
  try { obj = JSON.parse(t); } catch { continue; }

  const role = obj.type; // "user" | "assistant" | "summary" | ...
  const msg = obj.message;
  if (!msg || !msg.content) continue;

  const text = textFromContent(msg.content);
  if (!text) continue;

  // Skip tool-result-only user turns (they carry no human text)
  if (role === "user" && Array.isArray(msg.content) &&
      msg.content.every((b) => b && b.type === "tool_result")) continue;

  if (role === "user") {
    out.write(`### 🧑 You\n\n${text}\n\n`);
    count++;
  } else if (role === "assistant") {
    out.write(`### 🤖 Claude\n\n${text}\n\n`);
    count++;
  }
}

out.end();
await new Promise((r) => out.on("finish", r));
console.log(`Wrote ${count} messages to ${outPath}`);
