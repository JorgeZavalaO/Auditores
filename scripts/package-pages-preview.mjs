import { spawnSync } from 'node:child_process';
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Usage: node scripts/package-pages-preview.mjs
// Publish only the reported .astro/pages-preview payload, never this source tree.
export const prefix = '/auditores-preview/';
export const routes = ['index.html', 'nosotros/index.html', 'servicios/index.html'];
const root = fileURLToPath(new URL('../', import.meta.url));
export const output = path.join(root, '.astro', 'pages-preview');
const origin = 'https://jorgezavalao.github.io';
const attributes = /\b(href|src|srcset|poster|action)\s*=\s*(["'])(.*?)\2/gi;
const cssUrls = /url\(\s*(["']?)(.*?)\1\s*\)/gi;
const decodeEntities = value => value.replace(/&amp;/g, '&');

export function relocateUrl(value) {
  if (!value.startsWith('/') || value.startsWith('//')) return value;
  return value.startsWith(prefix) ? value : `${prefix}${value.slice(1)}`;
}

// Read URL tokens separately: data URI commas are part of their URL, not separators.
export function srcsetCandidates(value) {
  const candidates = [];
  let rest = value.trim();
  while (rest) {
    const token = rest.match(/^([^\s]+)(?:\s+|$)/);
    if (!token) throw new Error(`Unsupported srcset: ${value}`);
    let url = token[1];
    rest = rest.slice(token[0].length);
    const trailingComma = url.endsWith(',');
    if (trailingComma) url = url.replace(/,+$/, '');
    let descriptor = '';
    if (!trailingComma && rest) {
      const end = rest.indexOf(',');
      descriptor = (end < 0 ? rest : rest.slice(0, end)).trim();
      rest = end < 0 ? '' : rest.slice(end + 1).trim();
      if (!/^\d+(?:\.\d+)?[wx]$/.test(descriptor)) {
        throw new Error(`Unsupported srcset descriptor: ${descriptor}`);
      }
    }
    if (!url || (!url.startsWith('data:') && url.includes(','))) {
      throw new Error(`Unsupported srcset URL: ${url}`);
    }
    candidates.push({ url, descriptor });
    rest = rest.trim();
  }
  return candidates;
}

export function relocateText(text, extension) {
  if (extension === '.html') {
    text = text.replace(attributes, (match, name, quote, value) => {
      const relocated = name.toLowerCase() === 'srcset'
        ? srcsetCandidates(value).map(({ url, descriptor }) =>
          `${relocateUrl(url)}${descriptor ? ` ${descriptor}` : ''}`).join(', ')
        : relocateUrl(value);
      return `${name}=${quote}${relocated}${quote}`;
    });
  }
  return text.replace(cssUrls, (match, quote, value) =>
    `url(${quote}${relocateUrl(value.trim())}${quote})`);
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error(`Symlink is not publishable: ${entry.name}`);
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (entry.isFile()) files.push(full);
    else throw new Error(`Unsupported entry: ${entry.name}`);
  }
  return files;
}

export function allowedFile(file) {
  return routes.includes(file) || ['favicon.svg', 'jj-favicon.svg', 'robots.txt', '.nojekyll', 'README.md'].includes(file)
    || /^_astro\/[\w.-]+\.(?:css|js|webp|woff2?)$/.test(file);
}

export async function validatePayload(directory) {
  const files = await walk(directory);
  const names = files.map(file => path.relative(directory, file).split(path.sep).join('/'));
  for (const name of names) {
    if (!allowedFile(name)) throw new Error(`Unexpected publication file: ${name}`);
  }
  const pages = new Map();
  for (const route of routes) {
    if (!names.includes(route)) throw new Error(`Missing preview route: ${route}`);
    const html = await readFile(path.join(directory, route), 'utf8');
    const robots = [...html.matchAll(/<meta\b[^>]*>/gi)].filter(([tag]) =>
      /\bname=["']robots["']/i.test(tag));
    if (robots.length !== 1 || !/\bcontent=["']noindex,\s*nofollow["']/i.test(robots[0][0])) {
      throw new Error(`Preview must be noindex, nofollow: ${route}`);
    }
    if (/\brel=["']canonical["']|application\/ld\+json|sitemap/i.test(html)) {
      throw new Error(`Launch metadata in preview: ${route}`);
    }
    pages.set(route, html);
  }
  const available = new Set(names);
  function verify(value, from, kind) {
    value = decodeEntities(value);
    if (!value) return;
    if (/^(?:https?:|\/\/|data:|mailto:|tel:)/i.test(value)) return;
    if (/^[a-z][\w+.-]*:/i.test(value) || /\\/.test(value)) {
      throw new Error(`Unsupported URL in ${from}: ${value}`);
    }
    const url = new URL(value, `${origin}${prefix}${from}`);
    const decodedPath = decodeURIComponent(url.pathname);
    if (!decodedPath.startsWith(prefix)) throw new Error(`URL escapes project prefix: ${value}`);
    let target = decodedPath.slice(prefix.length);
    if (!target || target.endsWith('/')) target += 'index.html';
    if (target.split('/').includes('..') || !available.has(target)) {
      throw new Error(`Unresolved ${kind} in ${from}: ${value}`);
    }
    if (url.hash) {
      const html = pages.get(target);
      const fragment = decodeURIComponent(url.hash.slice(1));
      const ids = html && [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]);
      if (!ids?.includes(fragment)) throw new Error(`Unresolved fragment in ${from}: ${value}`);
    }
  }
  for (const name of names.filter(name => /\.(html|css|js)$/.test(name))) {
    const text = await readFile(path.join(directory, name), 'utf8');
    if (name.endsWith('.html')) {
      for (const [, kind, , value] of text.matchAll(attributes)) {
        const values = kind.toLowerCase() === 'srcset' ? srcsetCandidates(value).map(c => c.url) : [value];
        for (const url of values) verify(url, name, kind);
      }
      for (const [tag] of text.matchAll(/<(?:link|img|script|source|form)\b[^>]*>/gi)) {
        if (/\b(?:href|src|srcset|action)\s*=\s*(?!["'])\S/.test(tag)) {
          throw new Error(`Unsupported unquoted reference in ${name}`);
        }
      }
    }
    for (const [, , value] of text.matchAll(cssUrls)) verify(value.trim(), name, 'CSS resource');
    if (/@import\b/i.test(text)) throw new Error(`Unsupported CSS import in ${name}`);
    const scripts = name.endsWith('.js') ? [text] : [...text.matchAll(/<script\b[^>]*>(.*?)<\/script>/gis)].map(m => m[1]);
    for (const script of scripts) {
      if (/\b(?:import|export)\s.*?["']|(?:fetch|new\s+URL)\s*\(|["']\/(?!\/)/s.test(script)) {
        throw new Error(`Unsupported script resource reference in ${name}`);
      }
    }
  }
  return { files: names.sort(), bytes: (await Promise.all(files.map(file => stat(file)))).reduce((sum, item) => sum + item.size, 0) };
}

export async function packagePayload(directory) {
  for (const file of await walk(directory)) {
    const extension = path.extname(file);
    if (['.html', '.css'].includes(extension)) {
      await writeFile(file, relocateText(await readFile(file, 'utf8'), extension));
    }
  }
  await writeFile(path.join(directory, '.nojekyll'), '');
  // Project-subpath robots is not authoritative for github.io; every page has noindex.
  await writeFile(path.join(directory, 'robots.txt'), 'User-agent: *\nAllow: /\n');
  await writeFile(path.join(directory, 'README.md'), '# Approval preview\n\nGenerated J&J CONSULTORES Y AUDITORES website for design testing and approval only.\n\nRoutes: /, /nosotros/, /servicios/. All pages request noindex, nofollow. Public access is not restricted.\nThe supplied contact email and phone are used throughout. The contact form does not send messages.\n\nGitHub Pages: deploy the main branch root, without Jekyll.\n');
  return validatePayload(directory);
}

export function buildEnvironment(env) {
  const names = ['PATH', 'SYSTEMROOT', 'COMSPEC', 'TEMP', 'TMP', 'HOME', 'USERPROFILE', 'LOCALAPPDATA'];
  const clean = Object.fromEntries(Object.entries(env).filter(([key]) => names.includes(key.toUpperCase())));
  return { ...clean, NODE_ENV: 'production', PUBLIC_LAUNCH_READY: 'false', SITE_URL: '' };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  if (process.argv.includes('--build-only')) {
    const { build } = await import('astro');
    // An independent static config prevents loading the project's .env files or plugins.
    await build({ root, configFile: false, output: 'static', trailingSlash: 'always',
      outDir: output, integrations: [], vite: { envDir: false },
    });
  } else {
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--build-only'], {
      cwd: root, env: buildEnvironment(process.env), stdio: 'inherit',
    });
    if (result.error || result.status !== 0) throw result.error || new Error('Preview build failed');
    const report = await packagePayload(output);
    console.log(JSON.stringify({ directory: output, ...report }, null, 2));
  }
}
