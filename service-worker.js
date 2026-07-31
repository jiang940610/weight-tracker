const CACHE_NAME = 'weight-tracker-v3';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './体重记录工作台.html',
  './manifest.json',
  './service-worker.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

// 安装：预缓存核心资源，但立即激活新版本
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(URLS_TO_CACHE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// 激活：清理所有旧版本缓存，立即接管页面
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] 清理旧缓存:', key);
            return caches.delete(key);
          })
      )
    ).then(() => {
      console.log('[SW] 激活完成，版本:', CACHE_NAME);
      return self.clients.claim();
    })
  );
});

// 拦截请求：网络优先，失败再用缓存（确保更新能自动生效）
// 仅对同源 GET 请求启用，其他请求直接放行
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then(response => {
        // 联网成功：复制一份到缓存，返回最新内容
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone)).catch(() => {});
        }
        return response;
      })
      .catch(() => {
        // 联网失败（离线）：回退到缓存
        return caches.match(req).then(cached => cached || caches.match('./'));
      })
  );
});
