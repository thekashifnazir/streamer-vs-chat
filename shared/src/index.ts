export const MOVES = ['JAB', 'HOOK_L', 'HOOK_R', 'COMBO', 'SUPER'] as const;
export type Move = typeof MOVES[number];
export type ChatVote = { kind: 'vote'; user: string; move: Move; at: number; simulated: boolean };
export type PoseState = { kind: 'pose'; guard: boolean; lean: 'L'|'R'|null; at: number; source: 'pose'|'keyboard' };
export type PunchEvent = { kind: 'punch'; side: 'L'|'R'; at: number; source: 'pose'|'keyboard' };
export type Control = { kind: 'control'; action: 'pause'|'resume'|'veto'|'stop'; by: string };
// The engine's state shape arrives with the engine. Keep Tick generic until then.
export type Tick<GameState> = { kind: 'tick'; state: GameState };
export type Telegraph = { kind: 'telegraph'; move: Move; landsAt: number; exploit?: string };
export type Resolved = { kind: 'resolved'; move: Move; outcome: 'HIT'|'BLOCK'|'PERFECT'|'DODGE'|'CHIP'; dmg: number; counterDmg: number };
export type TallySnapshot = { kind: 'tally'; tally: Record<Move, number>; voters: number; simulated: boolean };
const COMMANDS: Record<string, Move> = { '!jab':'JAB', '!hookl':'HOOK_L', '!hookr':'HOOK_R', '!combo':'COMBO', '!super':'SUPER' };
export function parseChatVote(text: string, user: string, at: number, simulated: boolean): ChatVote | null {
  const command = text.trim().split(/\s+/, 1)[0]?.toLowerCase();
  const move = Object.hasOwn(COMMANDS, command) ? COMMANDS[command] : undefined;
  return move ? { kind: 'vote', user, move, at, simulated } : null;
}
