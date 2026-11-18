self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.delete("quiz-battle-v1").then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  if (event.request.mode !== "navigate" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(() => new Response(
    `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>سيف المعرفة | Sword of Knowledge</title>
    <style>body{font:1.15rem/1.65 system-ui;background:#08090d;color:#f0f2ff;max-width:34rem;margin:12vh auto;padding:1.25rem}a{color:#a8d9ff}</style>
    <main><h1>سيف المعرفة</h1><p>تحتاج إلى اتصال بالإنترنت للعودة إلى المعركة.</p>
    <p lang="en" dir="ltr">Reconnect to the internet to return to your battle.</p>
    <a href="">إعادة المحاولة / Retry</a></main></html>`,
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  )));
});
