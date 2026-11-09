'use strict';
// 대시보드 요청 인증. Supabase가 설정돼 있으면 사용자 JWT를 검증하고, 아니면 DEV_TOKEN(기본 'dev')만 받는다.
function makeAuth({ supabase, devToken }) {
  const cache = new Map(); // token → {user, at}
  return async function authenticate(req) {
    const h = req.headers.authorization || ''; const q = new URL(req.url, 'http://x').searchParams.get('token') || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : q; if (!token) return null;
    if (token === devToken && (!supabase || !supabase.enabled || process.env.ALLOW_DEV_TOKEN === '1')) return { userId: 'dev', email: 'dev@local', name: 'dev', dev: true };
    // 개발 서버(DB 없음)에서 두 번째 사용자 흉내: token=dev:이름 → 로컬 사이트의 주인은 아니고 멤버 초대를 받을 수 있다
    if (!supabase || !supabase.enabled) { const dm = /^dev:([a-z0-9_-]{1,20})$/i.exec(token); return dm ? { userId: 'dev:' + dm[1], email: dm[1] + '@local', name: dm[1], dev: true } : null; }
    if (!supabase || !supabase.enabled) return null;
    const c = cache.get(token); if (c && Date.now() - c.at < 300000) return c.user;
    const p = await supabase.verifyUser(token); if (!p) return null;
    const md = p.user_metadata || {}; const user = { userId: p.sub, email: p.email, name: String(md.user_name || md.preferred_username || md.full_name || md.name || '').slice(0, 40) }; cache.set(token, { user, at: Date.now() }); if (cache.size > 1000) cache.delete(cache.keys().next().value); return user; // name: 표시용 이름(GitHub 로그인)
  };
}
module.exports = { makeAuth };
