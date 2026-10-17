import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const output = path.join(root, 'dist-public');
const publicOrigin = new URL(process.env.PUBLIC_SITE_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:4186').origin;
const appOrigin = new URL(process.env.APP_ORIGIN || 'https://liquiditylens-f536.onrender.com').origin;
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
const elements = new Map();
const document = {
  getElementById(id) { if (!elements.has(id)) elements.set(id, { innerHTML: '' }); return elements.get(id); },
  documentElement: { dataset: { theme: 'dark' } },
  addEventListener() {},
  querySelector() { return null; },
  querySelectorAll() { return []; },
};
const context = vm.createContext({
  document, window: { addEventListener() {} },
  location: new URL(publicOrigin),
  localStorage: { getItem() { return null; } }, sessionStorage: { getItem() { return null; } },
  console, URL, URLSearchParams, Intl, setTimeout() {}, clearTimeout() {},
  appBaseUrl: publicOrigin,
});
const appSource = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const end = appSource.lastIndexOf('\nrender();\nbootAuth();');
if (end < 0) throw new Error('Cannot find app boot boundary; refusing incomplete export.');
vm.runInContext(appSource.slice(0, end), context);
const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const start = serverSource.indexOf('function metaForPath(');
const stop = serverSource.indexOf('app.get("/robots.txt"', start);
if (start < 0 || stop < 0) throw new Error('Cannot find metadata export boundary.');
vm.runInContext(serverSource.slice(start, stop), context);
vm.runInContext('bind = () => {}; state.authReady = true; state.loading = false;', context);
const routes = vm.runInContext('[...publicRoutes]', context);
for (const route of routes) {
  context.currentRoute = route;
  vm.runInContext('state.path = currentRoute; render();', context);
  const rendered = elements.get('app').innerHTML;
  if (!rendered.includes('marketing-main')) throw new Error(`Public page did not render: ${route}`);
  let html = vm.runInContext('renderShell({ path: currentRoute })', context);
  html = html.replace(/<div id="app">[\s\S]*?<\/div>\s*<script src="\/app\.js\?v=\d+"><\/script>/,
    () => `<div id="app">${rendered}</div>\n<script src="/public-config.js"></script>\n<script src="/app.js?v=41"></script>`);
  // Keep app access on its existing origin, and expose the owner editor there.
  html = html.replace(/href="\/(login|dashboard|connect|forecasts|inventory|analytics|marketplace|social|community|admin|reports|profile)(\?[^"]*)?"/g,
    (_match, routeName, query = '') => `href="${appOrigin}/${routeName}${query}"`);
  html = html.replace('href="/?edit=1"', `href="${appOrigin}/?edit=1"`);
  // Static HTML must remain visible before JavaScript and to non-JS crawlers.
  html = html.replace('</head>', '<style>.marketing-main > section,.marketing-main > .feature-zigzag > article,.marketing-card,.product-frame,.chart,.chart-block,.screen-chart,.hero-forecast{opacity:1!important;transform:none!important}</style></head>');
  const target = route === '/' ? path.join(output, 'index.html') : path.join(output, route.slice(1), 'index.html');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html);
}
for (const file of ['app.js', 'styles.css']) fs.copyFileSync(path.join(root, file), path.join(output, file));
fs.cpSync(path.join(root, 'assets'), path.join(output, 'assets'), { recursive: true });
fs.writeFileSync(path.join(output, 'public-config.js'), `window.LIQUIDITY_PUBLIC_SITE = ${JSON.stringify({ appOrigin })};\n`);
fs.writeFileSync(path.join(output, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${publicOrigin}/sitemap.xml\n`);
fs.writeFileSync(path.join(output, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map(route => `  <url><loc>${publicOrigin}${route}</loc></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(output, 'google3a56a25c5ae125f2.html'), 'google-site-verification: google3a56a25c5ae125f2.html');
fs.writeFileSync(path.join(output, '404.html'), '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="robots" content="noindex"><title>Page not found | LiquidityLink</title><h1>Page not found</h1><a href="/">Return to LiquidityLink</a></html>');
console.log(`Built ${routes.length} complete public pages in dist-public for ${publicOrigin}`);
