// Visitown 최소 서비스워커: 홈 화면 설치 조건만 채운다. 대시보드는 실시간이라 오프라인 캐시는 하지 않는다
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {}); // 네트워크 그대로
