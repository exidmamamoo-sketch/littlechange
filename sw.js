/* Offline cache. After you upload a new version of the app, change VERSION so phones drop the old copy. */
var VERSION='v1';
var CACHE='qingying-'+VERSION;
var ASSETS=[
  './','index.html','daily.html','sober.html','backup-core.js','manifest.webmanifest',
  'fonts/fonts.css','fonts/fraunces-latin-500-normal.woff2','fonts/fraunces-latin-600-normal.woff2',
  'fonts/ibm-plex-mono-latin-400-normal.woff2','fonts/ibm-plex-mono-latin-500-normal.woff2',
  'icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png','icons/apple-touch-icon.png'
];

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(ASSETS)}).then(function(){return self.skipWaiting()}));
});

self.addEventListener('activate',function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){return k.indexOf('qingying-')===0&&k!==CACHE}).map(function(k){return caches.delete(k)}));
    }).then(function(){return self.clients.claim()})
  );
});

/* Answer from the cache first so the app opens offline; refresh the cached copy in the background. */
self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET') return;
  var url=new URL(req.url);
  if(url.origin!==self.location.origin) return;
  e.respondWith(caches.open(CACHE).then(function(cache){
    return cache.match(req,{ignoreSearch:true}).then(function(hit){
      var net=fetch(req).then(function(res){
        if(res&&res.ok&&res.type==='basic') cache.put(req,res.clone());
        return res;
      }).catch(function(){return hit||cache.match('index.html')});
      return hit||net;
    });
  }));
});
