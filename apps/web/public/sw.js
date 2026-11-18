self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.delete("quiz-battle-v1").then(() => self.clients.claim()));
});

const connectionPage = `<!doctype html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#101923">
  <title>سيف المعرفة | Sword of Knowledge</title>
  <script>
    const invitationLanguage = new URLSearchParams(location.search).get("lang");
    let preferred;
    try { preferred = JSON.parse(localStorage.getItem("quiz-battle-storage"))?.state?.language; } catch {}
    const language = [invitationLanguage, preferred, navigator.language.split("-")[0]]
      .find(value => value === "ar" || value === "en") || "en";
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  </script>
  <style>
    * { box-sizing: border-box }
    html { color-scheme: dark; background: #101923; color: #f4eee2; font: 100%/1.65 system-ui, sans-serif }
    body { max-width: 48rem; margin: auto; padding: clamp(20px, 6vw, 56px) }
    header { border-block-end: 1px solid #425360; padding-block-end: 1.25rem; font-weight: 700 }
    main { margin-block-start: clamp(2rem, 12vh, 7rem) }
    h1 { line-height: 1.35; font-size: clamp(1.9rem, 6vw, 3.4rem); margin: 0 }
    p { max-width: 38ch; color: #c0cbd0; margin-block: .75rem 1.6rem }
    a { display: inline-block; background: #e6b65c; color: #101923; border-radius: .5rem; padding: .65rem 1.4rem; font-weight: 700; text-decoration: none }
    a:focus-visible { outline: 3px solid #f4eee2; outline-offset: 4px }
    html[lang="ar"] [lang="en"], html[lang="en"] [lang="ar"] { display: none }
  </style>
</head>
<body>
  <header><span lang="en">Sword of Knowledge</span><span lang="ar">سيف المعرفة</span></header>
  <main>
    <h1><span lang="en">Connection interrupted</span><span lang="ar">انقطع الاتصال</span></h1>
    <p><span lang="en">This page will reopen when your connection returns. You can also retry now.</span><span lang="ar">ستُفتح هذه الصفحة مجددًا عند عودة الاتصال. يمكنك أيضًا إعادة المحاولة الآن.</span></p>
    <a href=""><span lang="en">Retry</span><span lang="ar">إعادة المحاولة</span></a>
    <p role="status" id="retry-status"></p>
  </main>
  <script>
    const status = document.getElementById("retry-status");
    let checking = false;
    async function retry() {
      if (checking) return;
      checking = true;
      const arabic = document.documentElement.lang === "ar";
      status.textContent = arabic ? "جارٍ التحقق من الاتصال…" : "Checking your connection…";
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      try {
        const response = await fetch(location.href, { method: "HEAD", cache: "no-store", signal: controller.signal });
        if (response.status >= 500) throw new Error();
        location.reload();
      } catch {
        status.textContent = arabic ? "تعذّر الاتصال. حاول مجددًا عند عودة الشبكة." : "Still unable to connect. Retry when your connection returns.";
      } finally {
        clearTimeout(timer);
        checking = false;
      }
    }
    document.querySelector("a").addEventListener("click", event => {
      event.preventDefault();
      void retry();
    });
    window.addEventListener("online", retry);
  </script>
</body>
</html>`;

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate" || new URL(request.url).origin !== self.location.origin) return;
  const offline = () => new Response(connectionPage, {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
  event.respondWith(self.navigator.onLine === false ? offline() : fetch(request).catch(offline));
});
