const VERSION='1.0.1';
const PREFIX='ant-adventure-shell-';
const CACHE=PREFIX+VERSION+'-chapters';
const ASSETS=['./','./index.html','./stage2.html','./stage2-engine.js?v='+VERSION,'./stage2-view.js?v='+VERSION,'./stage3-engine.js?v='+VERSION,'./stage3-view.js?v='+VERSION,'./journey.js?v='+VERSION,'./profile-store.js','./style.css?v='+VERSION,'./app.js?v='+VERSION,'./engine.js?v='+VERSION,'./viewport.js','./name-keyboard.js','./pwa.js','./manifest.webmanifest','./assets/ant-original.webp','./assets/grasshoppers.webp','./assets/living-room.webp','./assets/kitchen.webp','./assets/threshold.webp','./assets/endings/ordinary.webp','./assets/endings/collar-v2.webp','./assets/endings/drag-v2.webp','./assets/endings/carry-v2.webp','./assets/endings/perfect.webp','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png','./icons/apple-touch-icon.png'];
const urls=ASSETS.map(path=>new URL(path,self.registration.scope).href);
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(urls.map(url=>new Request(url,{cache:'reload'})))));});
// Wait for the player to choose an update; never reload a running boss fight.
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);await self.clients.claim();})());});
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url),base=new URL(self.registration.scope);if(request.method!=='GET'||url.origin!==base.origin)return;
  if(request.mode==='navigate'&&(url.pathname===base.pathname||(url.pathname===base.pathname+'index.html'||url.pathname===base.pathname+'stage2.html'))){
    event.respondWith((async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4000);try{const response=await fetch(request,{signal:controller.signal});if(!response.ok)throw Error('navigation unavailable');return response;}catch(error){const cache=await caches.open(CACHE);const offline=await cache.match(new URL(url.pathname.endsWith('stage2.html')?'./stage2.html':'./index.html',base).href);if(offline)return offline;throw error;}finally{clearTimeout(timer);}})());
  }else if(urls.includes(url.href)){
    event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(request))||fetch(request)));
  }
});
