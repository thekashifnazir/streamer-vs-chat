import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const START = '<!-- asset-inventory:start -->';
const END = '<!-- asset-inventory:end -->';
export const ANNOUNCER_PROVENANCE = 'Announcer voice: ElevenLabs (Voice Library voice Rex Thunder - Deep N Tough), generated on a paid Creator plan.';
/** One short row per voice-bank file (~900 files); the full provenance is in the bank README and the header above the table. */
export const VOICE_BANK_PROVENANCE = 'ElevenLabs voice bank (paid plan), `assets/voice/bank/README.md`';

const fontNotices: Record<string, string> = {
  Anton: 'anton-OFL.txt', BarlowCondensed: 'barlowcondensed-OFL.txt',
  Bungee: 'Bungee-OFL.txt', RussoOne: 'RussoOne-OFL.txt', Inter: 'inter-OFL.txt',
};

export function trackedAssets(): string[] {
  return execFileSync('git', ['ls-files', '-z', '--', 'assets'], { encoding: 'utf8' }).split('\0').filter(Boolean).sort();
}

export function assetCredit(path: string, levels: Record<string, { source: string }>): [string, string] {
  if (path === 'assets/SOUNDS.md' || path === 'assets/voice/README.md') return ['Project provenance and preparation documentation', 'Documentation; underlying asset terms listed here and in this file'];
  if (path.startsWith('assets/boss/')) return ['Original Chat Golem art, atlas and provenance by Kashif Nazir; `assets/boss/README.md`', 'CC0 1.0 Universal'];
  if (path.startsWith('assets/fonts/')) {
    const notice = Object.entries(fontNotices).find(([family]) => path.split('/').at(-1)!.startsWith(family));
    if (path.endsWith('-OFL.txt')) return ['Original font copyright and licence notice', 'SIL Open Font License 1.1 (notice text)'];
    if (notice) return [`${notice[0]} project; original notice: \`assets/fonts/${notice[1]}\``, 'SIL Open Font License 1.1'];
  }
  if (path === 'assets/licences/Apache-2.0.txt') return ['Apache Software Foundation licence text retained for MediaPipe', 'Apache License 2.0 (notice text)'];
  if (/^assets\/licences\/kenney-.*-[Ll]icense\.txt$/.test(path)) return ['Original Kenney pack notice; pack named in the file', 'CC0 1.0 (notice text)'];
  if (path === 'assets/sfx-ready/levels.json') return ['Project source attribution, trim and level metadata for prepared SFX/music', 'Metadata; underlying audio CC0 1.0'];
  if (path.startsWith('assets/sfx-ready/') && /\.(wav|mp3)$/.test(path)) {
    const source = levels[path.split('/').at(-1)!.slice(0, -4)]?.source;
    if (!source) throw new Error(`Missing original SFX source for ${path}`);
    return [`\`${source}\``, 'CC0 1.0'];
  }
  if (/^assets\/landing\/gameplay-loop-SIMULATED(?:-poster)?\.(?:webm|mp4|webp)$/.test(path)) return ['Original footage of this game: screen capture of its own offline demo (simulated chat), cut from b-roll clip 03-lean-dodge-SIMULATED', 'Project footage, same terms as this repository; shows the CC0 Chat Golem art and OFL fonts credited here'];
  if (path.startsWith('assets/voice/ready/') && /\.(wav|mp3)$/.test(path)) return [ANNOUNCER_PROVENANCE, 'Generated audio; see provenance'];
  if (/^assets\/voice\/bank\/(?:README\.md|lines\.json|durations\.json|[a-z]+\/qc\.json)$/.test(path)) return ['Project voice-bank script data, QC and provenance documentation', 'Documentation/metadata; underlying audio terms listed here'];
  if (/^assets\/voice\/bank\/sfx\/[a-z-]+\.mp3$/.test(path)) return ['ElevenLabs Sound Effects, generated on Kash\'s paid ElevenLabs plan; `assets/voice/bank/README.md`', 'Generated audio; see provenance'];
  const bankVoice = /^assets\/voice\/bank\/([a-z]+)\/[a-z0-9-]+-\d+\.mp3$/.exec(path)?.[1];
  if (bankVoice) return [`${VOICE_BANK_PROVENANCE}: \`${bankVoice}\``, 'Generated audio'];
  throw new Error(`Unclassified tracked asset: ${path}; add its verified provenance before generating credits`);
}

export function inventoryTable(paths: string[], levels: Record<string, { source: string }>): string {
  const rows = paths.map(path => {
    const [source, licence] = assetCredit(path, levels);
    return `| \`${path}\` | ${source} | ${licence} |`;
  });
  return `${START}\n| Tracked asset | Source / provenance | Licence / terms |\n|---|---|---|\n${rows.join('\n')}\n${END}`;
}

export function regenerateCredits(): void {
  const credits = readFileSync('CREDITS.md', 'utf8');
  const levels = JSON.parse(readFileSync('assets/sfx-ready/levels.json', 'utf8'));
  const start = credits.indexOf(START);
  const end = credits.indexOf(END);
  if (start < 0 || end < start) throw new Error('CREDITS.md asset inventory markers missing');
  writeFileSync('CREDITS.md', credits.slice(0, start) + inventoryTable(trackedAssets(), levels) + credits.slice(end + END.length));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) regenerateCredits();
