import './style.css';

import type { Move, TallySnapshot } from '@svc/shared';

const commands: [Move, string][] = [
  ['JAB', '!jab'], ['HOOK_L', '!hookl'], ['HOOK_R', '!hookr'],
  ['COMBO', '!combo'], ['SUPER', '!super'],
];
const votes = document.querySelector<HTMLDivElement>('#votes')!;
const voters = document.querySelector<HTMLElement>('#voters')!;
const badge = document.querySelector<HTMLElement>('#simulated-badge')!;
const connection = document.querySelector<HTMLElement>('#connection')!;
const hud = document.querySelector<HTMLElement>('#hud')!;

function fit(): void {
  const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  hud.style.transform = `scale(${scale})`;
  hud.style.left = `${(window.innerWidth - 1920 * scale) / 2}px`;
  hud.style.top = `${(window.innerHeight - 1080 * scale) / 2}px`;
}
window.addEventListener('resize', fit);
fit();

const rows = commands.map(([move, command]) => {
  const row = document.createElement('div');
  row.className = `vote-row${move === 'SUPER' ? ' locked' : ''}`;
  row.dataset.move = move;
  row.innerHTML = `<div class="vote-command">${command}<small>${move.replaceAll('_', ' ')} <span class="vote-count">0</span></small></div><div class="vote-track"><div class="vote-fill"></div></div><div class="vote-percent">${move === 'SUPER' ? 'LOCKED' : '0%'}</div>`;
  votes.append(row);
  return { move, row, count: row.querySelector<HTMLElement>('.vote-count')!, fill: row.querySelector<HTMLElement>('.vote-fill')!, percent: row.querySelector<HTMLElement>('.vote-percent')! };
});

function isTally(value: unknown): value is TallySnapshot {
  if (!value || typeof value !== 'object') return false;
  const message = value as Partial<TallySnapshot>;
  return message.kind === 'tally' && typeof message.simulated === 'boolean'
    && typeof message.voters === 'number' && Number.isFinite(message.voters) && message.voters >= 0
    && !!message.tally && commands.every(([move]) => Number.isSafeInteger(message.tally?.[move]) && message.tally![move] >= 0);
}

function render(message: TallySnapshot): void {
  const total = commands.reduce((sum, [move]) => sum + message.tally[move], 0);
  const highest = Math.max(...commands.filter(([move]) => move !== 'SUPER').map(([move]) => message.tally[move]));
  voters.textContent = String(message.voters);
  badge.hidden = !message.simulated;
  for (const { move, row, count, fill, percent } of rows) {
    const value = message.tally[move];
    const share = total ? Math.round(value / total * 100) : 0;
    count.textContent = String(value);
    fill.style.width = `${share}%`;
    if (move !== 'SUPER') percent.textContent = `${share}%`;
    row.classList.toggle('leader', move !== 'SUPER' && highest > 0 && value === highest);
    row.setAttribute('aria-label', `${move.replaceAll('_', ' ')} ${value}${move === 'SUPER' ? ', locked' : `, ${share} percent`}`);
  }
}

function connect(): void {
  const socket = new WebSocket(`ws://${window.location.hostname || 'localhost'}:3000/ws`);
  socket.addEventListener('open', () => { connection.textContent = '● CHAT LINK CONNECTED'; });
  socket.addEventListener('message', event => {
    try {
      const message: unknown = JSON.parse(String(event.data));
      if (isTally(message)) render(message);
    } catch { /* Ignore malformed network messages; a later snapshot replaces them. */ }
  });
  socket.addEventListener('close', () => {
    connection.textContent = 'CHAT LINK LOST · RECONNECTING';
    window.setTimeout(connect, 1000);
  });
  socket.addEventListener('error', () => { socket.close(); });
}
connect();
