const CACHE_NAME = "echo-match-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/play.html",
  "/setup.html",
  "/score.html",
  "/result.html",
  "/style.css",
  "/play.js",
  "/setup.js",
  "/score.js",
  "/result.js",
  "/audio/audioList.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
  // 必要に応じて他のJS/CSS/音声ファイルも追加
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});