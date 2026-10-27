// Vendor the user-provided reference, pinned for reproducible motion and visuals.
// Run from this repository: node scripts/import-confirmation-reference.mjs <reference checkout>
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const source = process.argv[2];
if (!source) throw new Error('Provide the obrigado-x5med checkout path');
const revision = '0bc2798';
const read = name => execFileSync('git', ['show', `${revision}:${name}`], { cwd: source, maxBuffer: 20 * 1024 * 1024 });
function write(name, content) {
  fs.mkdirSync(path.dirname(name), { recursive: true });
  fs.writeFileSync(name, content);
}
for (const name of ['hero-ribbons.tsx', 'journey-transition.tsx', 'next-steps.tsx', 'site-header.tsx', 'site-header.module.css', 'ui/admit-one-ticket.tsx', 'ui/admit-one-ticket.module.css', 'ui/icons.ts']) {
  let text = read(`components/${name}`).toString();
  text = text.replaceAll('@/components/ui/icons', name.startsWith('ui/') ? './icons' : './ui/icons');
  text = text.replaceAll('@/lib/courses', '@/lib/confirmation-types');
  // Preserve the form's existing deep link and anchor to the stable section,
  // not the heading whose scroll animation changes its visual coordinates.
  text = text.replaceAll('href="#next-steps-title"', 'href="#success-next-steps"');
  text = text.replaceAll('href="#page-title"', 'href="#confirmation-top"');
  if (name === 'journey-transition.tsx') {
    // The application already owns the document's main landmark.
    text = text.replace('useRef<HTMLElement>(null)', 'useRef<HTMLDivElement>(null)')
      .replace('<main ref=', '<div ref=').replace('</main>', '</div>');
  }
  if (name === 'ui/admit-one-ticket.tsx') text = text.replace('Pedido recebido', 'Inscrição recebida');
  if (name === 'next-steps.tsx') text = text.replace('        setCompleted(steps.map', '        // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate the optional checklist after SSR, matching the reference.\n        setCompleted(steps.map');
  write(`components/confirmation/${name}`, text);
}
for (const name of ['fundo-azul-grid.png', 'logo-azul-seta-dourada.png', 'logo-branca-seta-dourada.png', 'selo-x5.png', 'fonts/Anton.ttf', 'fonts/Sora.ttf', 'fonts/Anton-OFL.txt', 'fonts/Sora-OFL.txt']) {
  write(`public/assets/escalamed/${name}`, read(`public/assets/escalamed/${name}`));
}
write('lib/confirmation-fonts.ts', read('lib/escalamed-fonts.ts'));
let css = read('app/globals.css').toString()
  .replace(/^@layer[^;]+;\s*/m, '').replace(/^@import[^;]+;\s*/gm, '')
  .replaceAll(':root', ':scope').replace(/^html\s*\{[^}]*\}/gm, '')
  .replace(/^body\s*\{/gm, ':scope {')
  .replace(/(?<![-\w])main(?![-\w])/g, '.thank-you-main');
// Native scope keeps the original keyframes, media queries, selectors and values
// while preventing its element resets from changing the registration form.
write('components/confirmation/reference.css', `/* Source: x5med/obrigado-x5med @ ${revision}. See README.md. */\n@scope (.confirmation-reference) {\n${css}\n}\n`);
