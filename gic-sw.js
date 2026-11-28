// Cache only public static architectural assets, never HTML, Excel, user requests or API data.
const CACHE='gic-public-assets-v1';
const allowed=/^\/(?:EDIFICIO_AULAS_(?:WEB|M3D)\.glb|PLANTA_[1-5]_HUNZA\.svg|PLANOS_LABORATORIOS_ARQ\.svg|LOGO_ISOTIPO\.png)$/i;
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('gic-public-assets-')&&k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||u.search||e.request.headers.has('range')||!allowed.test(u.pathname))return;e.respondWith((async()=>{const cache=await caches.open(CACHE);try{const response=await fetch(e.request);if(response.ok&&response.status===200)await cache.put(e.request,response.clone());return response;}catch(err){const cached=await cache.match(e.request);if(cached)return cached;throw err;}})());});
