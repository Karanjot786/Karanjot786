// Pre-computes the ENTIRE tic-tac-toe game tree as static markdown pages.
// Deterministic bot => the tree never changes => generate once, play instantly
// by navigating precomputed pages. No JS, no Actions, no account, no wait.
// Usage: node scripts/gen-ttt-tree.mjs [outDir]   (no outDir = count only)
import { writeFileSync, mkdirSync, rmSync } from "node:fs";

const WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const winner = (b) => {
  for (const [a,c,d] of WINS) if (b[a] !== "-" && b[a]===b[c] && b[a]===b[d]) return b[a];
  return b.includes("-") ? null : "draw";
};
const bot = (b) => {   // deterministic O: win, block, center, first corner, first empty
  const empties = [...b].map((v,i)=> v==="-"?i:-1).filter(i=>i>=0);
  const tryWin = (p) => { for (const i of empties){ const t=[...b]; t[i]=p; if (winner(t.join(""))===p) return i; } return -1; };
  let i = tryWin("O"); if (i>=0) return i;
  i = tryWin("X"); if (i>=0) return i;
  if (b[4]==="-") return 4;
  for (const c of [0,2,6,8]) if (b[c]==="-") return c;
  return empties[0];
};
const put = (b,i,p) => { const t=[...b]; t[i]=p; return t.join(""); };
const enc = (b) => b.replaceAll("-","_");   // no filename/URL starts with '-'
const file = (b) => `${enc(b)}.md`;

function successors(b) {
  const out = {};
  [...b].forEach((v,i) => {
    if (v !== "-") return;
    let nb = put(b,i,"X");
    if (winner(nb)) { out[i] = nb; return; }
    nb = put(nb, bot(nb), "O");
    out[i] = nb;
  });
  return out;
}

const START = "---------";
const seen = new Map();
const q = [START];
while (q.length) {
  const b = q.shift();
  if (seen.has(b)) continue;
  const res = winner(b);
  if (res) { seen.set(b, { terminal: true, result: res }); continue; }
  const moves = successors(b);
  seen.set(b, { terminal: false, moves });
  for (const t of Object.values(moves)) if (!seen.has(t)) q.push(t);
}

const nodes = seen.size;
const terminals = [...seen.values()].filter(n=>n.terminal).length;
console.log(`reachable boards: ${nodes} (playable: ${nodes-terminals}, terminal: ${terminals})`);

const outDir = process.argv[2];
if (!outDir) process.exit(0);

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const GLYPH = { X:"❌", O:"⭕" };
const showCell = (b,i,linkable) =>
  b[i] !== "-" ? GLYPH[b[i]]
  : linkable ? `[${i+1}](${file(linkable[i])})`
  : `${i+1}`;
const grid = (b, moves) => [0,3,6]
  .map(r => `| ${showCell(b,r,moves)} | ${showCell(b,r+1,moves)} | ${showCell(b,r+2,moves)} |`)
  .join("\n");

for (const [b, n] of seen) {
  let body;
  if (n.terminal) {
    const msg = n.result==="X" ? "You win. 🏆" : n.result==="O" ? "Bot wins. 🤖" : "Draw. 🤝";
    body = `### ${msg}\n\n|   |   |   |\n|:-:|:-:|:-:|\n${grid(b,null)}\n\n▶ [**play again →**](${file(START)}) · [back to profile](../../README.md)\n`;
  } else {
    body = `### tic-tac-toe — you're ❌\n\nClick a number. Instant, no sign-in.\n\n|   |   |   |\n|:-:|:-:|:-:|\n${grid(b,n.moves)}\n\n[back to profile](../../README.md)\n`;
  }
  writeFileSync(`${outDir}/${file(b)}`, body);
}
// root move-map for the README's inline starting board (values are file stems)
const rootMoves = Object.fromEntries(
  Object.entries(seen.get(START).moves).map(([k,v]) => [k, enc(v)])
);
writeFileSync(`${outDir}/root.json`, JSON.stringify(rootMoves) + "\n");
console.log(`wrote ${nodes} pages to ${outDir}`);
