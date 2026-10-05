// Service worker do Inspeção Ex: permite abrir o MODO CAMPO sem internet.
//
//  - /campo (a tela do modo campo): tenta a rede; sem rede, usa a cópia guardada.
//  - Arquivos do app (/_next/static, ícones, manifesto): guardados no primeiro
//    uso e servidos do aparelho (têm nome único por versão).
//  - Fotos (/api/fotos/:id): imutáveis; guardadas ao serem vistas, para
//    aparecerem também sem internet.
//  - Todo o resto (API, login, demais telas) passa direto para a rede.

const VERSION = "v1";
const PAGES = `campo-pages-${VERSION}`;
const ASSETS = `campo-assets-${VERSION}`;
const PHOTOS = `campo-photos-${VERSION}`;
const KEEP = [PAGES, ASSETS, PHOTOS];

// A tela do modo campo é guardada no primeiro acesso já logado (ver
// networkFirstPage) — guardar na instalação poderia guardar a tela de login.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon") ||
    url.pathname === "/apple-icon" ||
    url.pathname === "/manifest.webmanifest"
  );
}

async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await fetch(request);
    // Só guarda a tela de verdade (não um redirecionamento para o login).
    if (response.ok && !response.redirected) cache.put("/campo", response.clone());
    return response;
  } catch {
    const hit = await cache.match("/campo");
    if (hit) return hit;
    return new Response(
      "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><body style='font-family:system-ui;padding:24px'><h1>Sem internet</h1><p>Abra o Modo campo uma vez com internet para usá-lo depois sem sinal.</p></body>",
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate" && url.pathname === "/campo") {
    event.respondWith(networkFirstPage(request));
  } else if (isAsset(url)) {
    event.respondWith(cacheFirst(ASSETS, request));
  } else if (/^\/api\/fotos\/[^/]+$/.test(url.pathname)) {
    event.respondWith(cacheFirst(PHOTOS, request));
  }
});
