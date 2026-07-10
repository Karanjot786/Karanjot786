// Applies one tic-tac-toe move to game/tictactoe.json.
// Human is X; the bot is O and replies in the same run.
// The move arrives (untrusted) via process.env.TITLE as "ttt|<0-8>" or "ttt|new".
// build-readme.mjs renders the board FROM this JSON — this script never writes README.
import { readFileSync, writeFileSync } from "node:fs";

const FILE = "game/tictactoe.json";
const WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const empty = () => ({ board: Array(9).fill(""), turn: "X", status: "playing", moves: 0, lastMove: null });
const load = () => { try { return JSON.parse(readFileSync(FILE, "utf8")); } catch { return empty(); } };
const winner = (b) => {
  for (const [a,c,d] of WINS) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  return b.every(Boolean) ? "draw" : null;
};

// O's move: take a win, else block X's win, else center, else random empty.
function botMove(b) {
  const empties = b.map((v,i)=> v ? null : i).filter(v=> v !== null);
  const tryWin = (p) => { for (const i of empties){ const t=[...b]; t[i]=p; if (winner(t)===p) return i; } return -1; };
  let i = tryWin("O"); if (i >= 0) return i;
  i = tryWin("X"); if (i >= 0) return i;
  if (b[4] === "") return 4;
  return empties[Math.floor(Math.random() * empties.length)];
}

function selfTest() {
  let b = ["X","X","","","O","","","",""];              // X threatens 2 -> O blocks
  if (botMove(b) !== 2) throw new Error("bot should block at 2");
  b = ["O","O","","X","X","","","",""];                  // O can win at 2
  if (botMove(b) !== 2) throw new Error("bot should win at 2");
  if (winner(["X","X","X","","","","","",""]) !== "X") throw new Error("row-win detect");
  if (winner(["X","O","X","X","O","O","O","X","X"]) !== "draw") throw new Error("draw detect");
  console.log("tictactoe self-test ok");
}

const arg = (process.argv[2] || process.env.TITLE || "").trim();
if (arg === "test") { selfTest(); process.exit(0); }
if (/^ttt\|new$/.test(arg)) { writeFileSync(FILE, JSON.stringify(empty(), null, 2) + "\n"); console.log("new game"); process.exit(0); }

const m = /^ttt\|([0-8])$/.exec(arg);
if (!m) { console.log("no valid move in:", JSON.stringify(arg)); process.exit(0); }
const cell = Number(m[1]);

let g = load();
if (g.status !== "playing") g = empty();      // prior game ended -> fresh board
if (g.board[cell] !== "") { console.log("cell taken; ignoring"); process.exit(0); }

g.board[cell] = "X"; g.moves++;
let w = winner(g.board);
if (!w) { const o = botMove(g.board); g.board[o] = "O"; g.moves++; w = winner(g.board); }
g.status = w || "playing";
g.turn = "X";
g.lastMove = cell;
writeFileSync(FILE, JSON.stringify(g, null, 2) + "\n");
console.log("applied; status:", g.status);
