import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { assetCredit, inventoryTable, trackedAssets } from './asset-credits';

describe('tracked asset credits', () => {
  it('credits every tracked asset exactly once in the regenerated inventory', () => {
    const credits = readFileSync('CREDITS.md', 'utf8');
    const levels = JSON.parse(readFileSync('assets/sfx-ready/levels.json', 'utf8'));
    const paths = trackedAssets();
    expect(paths.length).toBeGreaterThan(60);
    const table = inventoryTable(paths, levels);
    expect(credits).toContain(table);
    const credited = [...table.matchAll(/^\| `([^`]+)` \|/gm)].map(match => match[1]);
    expect(credited).toEqual(paths);
    expect(new Set(credited).size).toBe(paths.length);
  });

  it('preserves the original source of every prepared audio file', () => {
    const levels = JSON.parse(readFileSync('assets/sfx-ready/levels.json', 'utf8'));
    for (const [name, entry] of Object.entries(levels) as [string, { source: string }][]) {
      expect(assetCredit(`assets/sfx-ready/${name}.wav`, levels)).toEqual([`\`${entry.source}\``, 'CC0 1.0']);
    }
  });

  it('requires explicit provenance for new assets rather than inventing a licence', () => {
    expect(() => assetCredit('assets/new-unknown.png', {})).toThrow('Unclassified tracked asset');
    expect(() => assetCredit('assets/sfx-ready/unknown.wav', {})).toThrow('Missing original SFX source');
  });
});
