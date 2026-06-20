#!/usr/bin/env node
/** NL: Kopieer logo's van logos/ naar public/ / EN: Copy logos from logos/ to public/ */

import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const copies = [
  ['logos/SVG/logo.svg', 'public/logo.svg'],
  ['logos/SVG/logo-white.svg', 'public/logo-white.svg'],
  ['logos/SVG/favicon.svg', 'public/favicon.svg'],
  ['logos/SVG/favicon-white.svg', 'public/favicon-white.svg'],
  ['logos/1x/logo.png', 'public/logo.png'],
  ['logos/1x/logo-white.png', 'public/logo-white.png'],
  ['logos/1x/favicon.png', 'public/favicon.png'],
  ['logos/1x/favicon-white.png', 'public/favicon-white.png'],
  ['logos/1x/card.png', 'public/card.png'],
  ['logos/2x/logo@2x.png', 'public/logo@2x.png'],
  ['logos/2x/logo-white@2x.png', 'public/logo-white@2x.png'],
  ['logos/2x/favicon@2x.png', 'public/favicon@2x.png'],
  ['logos/2x/favicon-white@2x.png', 'public/favicon-white@2x.png'],
  ['logos/2x/card@2x.png', 'public/card@2x.png'],
];

for (const [from, to] of copies) {
  const target = join(root, to);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(root, from), target);
  console.log(`[sync-logos] ${to}`);
}
