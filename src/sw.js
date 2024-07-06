const CACHE_NAME = "2024-06-28 11:40";
const urlsToCache = [
  "/lineart-converter/",
  "/lineart-converter/en/",
  "/lineart-converter/coi-serviceworker.js",
  "/lineart-converter/index.js",
  "/lineart-converter/img/before.webp",
  "/lineart-converter/img/after.webp",
  "/lineart-converter/img/anime-64.webp",
  "/lineart-converter/img/car-64.webp",
  "/lineart-converter/img/cat-64.webp",
  "/lineart-converter/img/castle-64.webp",
  "/lineart-converter/favicon/favicon.svg",
  "https://cdn.jsdelivr.net/npm/wasm-feature-detect@1.6.1/dist/umd/index.min.js",
];

importScripts(
  "https://cdn.jsdelivr.net/npm/wasm-feature-detect@1.6.1/dist/umd/index.min.js",
);

async function getOpenCVPath() {
  const simdSupport = await wasmFeatureDetect.simd();
  const threadsSupport = self.crossOriginIsolated &&
    await wasmFeatureDetect.threads();
  if (simdSupport && threadsSupport) {
    return "/lineart-converter/opencv/threaded-simd/opencv_js.js";
  } else if (simdSupport) {
    return "/lineart-converter/opencv/simd/opencv_js.js";
  } else if (threadsSupport) {
    return "/lineart-converter/opencv/threads/opencv_js.js";
  } else {
    return "/lineart-converter/opencv/wasm/opencv_js.js";
  }
}

async function addOpenCVPaths() {
  const opencvPath = await getOpenCVPath();
  urlsToCache.push(opencvPath);
  urlsToCache.push(opencvPath.slice(0, -3) + ".wasm");
}

addOpenCVPaths();

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    }),
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      );
    }),
  );
});
