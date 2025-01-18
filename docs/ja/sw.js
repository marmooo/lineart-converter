const CACHE_NAME="2025-01-18 19:00",urlsToCache=["/lineart-converter/","/lineart-converter/ja/","/lineart-converter/coi-serviceworker.js","/lineart-converter/index.js","/lineart-converter/img/before.webp","/lineart-converter/img/after.webp","/lineart-converter/img/anime-64.webp","/lineart-converter/img/car-64.webp","/lineart-converter/img/cat-64.webp","/lineart-converter/img/castle-64.webp","/lineart-converter/favicon/favicon.svg","https://cdn.jsdelivr.net/npm/wasm-feature-detect@1.6.1/dist/umd/index.min.js"];importScripts("https://cdn.jsdelivr.net/npm/wasm-feature-detect@1.6.1/dist/umd/index.min.js");async function getOpenCVPath(){const e=await wasmFeatureDetect.simd(),t=self.crossOriginIsolated&&await wasmFeatureDetect.threads();return e&&t?"/lineart-converter/opencv/threaded-simd/opencv_js.js":e?"/lineart-converter/opencv/simd/opencv_js.js":t?"/lineart-converter/opencv/threads/opencv_js.js":"/lineart-converter/opencv/wasm/opencv_js.js"}async function addOpenCVPaths(){const e=await getOpenCVPath();urlsToCache.push(e),urlsToCache.push(e.slice(0,-3)+".wasm")}addOpenCVPaths(),self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE_NAME).then(e=>e.addAll(urlsToCache)))}),self.addEventListener("fetch",e=>{e.respondWith(caches.match(e.request).then(t=>t||fetch(e.request)))}),self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(e=>Promise.all(e.filter(e=>e!==CACHE_NAME).map(e=>caches.delete(e)))))})