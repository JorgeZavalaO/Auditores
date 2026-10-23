import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('the llms directory describes the firm and links only to its published resources', () => {
  const content = readFileSync(new URL('../public/llms.txt', import.meta.url), 'utf8');
  assert.equal(content.charCodeAt(0), 0xfeff, 'UTF-8 BOM keeps accents readable when served without a charset');
  assert.match(content.replace(/^\uFEFF/, ''), /^# J&J CONSULTORES Y AUDITORES\n\n> /);
  const links = [...content.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map((match) => match[1]);
  assert.deepEqual(links, ['https://jjconsultores.pe/', 'https://jjconsultores.pe/nosotros/',
    'https://jjconsultores.pe/servicios/', 'https://jjconsultores.pe/sitemap-index.xml']);
  assert.ok(content.includes('jzavala@jjconsultores.pe'));
  assert.ok(content.includes('+51 956 481 871'));
  assert.doesNotMatch(content, /demo[123]|RESEND_API_KEY|TURNSTILE_SECRET_KEY|localhost|example\.com/);
});
