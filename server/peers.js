'use strict';
// 수평 확장(로드맵 46): 서버 여러 대가 한 사이트의 이벤트·설정 변경을 서로 주고받아 어느 서버에 붙어도 같은 마을을 본다.
// 전송로는 Supabase Realtime broadcast(phoenix 프로토콜 위의 WebSocket) — Node 22 내장 WebSocket이라 의존성 0. PEER_WS_URL로 다른 릴레이(테스트)를 줄 수도 있다.
// 보내는 모양: { topic, event:'broadcast', payload:{ type:'broadcast', event:'vt', payload:{ from, type, data } }, ref }. 자기 것은 from으로 거른다.
class Peers {
  constructor({ url, channel = 'visitown', id, onMessage, log = console }) { Object.assign(this, { url, topic: 'realtime:' + channel, id, onMessage, log }); this.ws = null; this.ref = 0; this.open = false; this.backoff = 0; this.sent = 0; this.received = 0; this.queue = []; this.joinedAt = 0; }
  connect() {
    let ws; try { ws = new WebSocket(this.url); } catch (e) { this.log.warn('peers: ws', e.message); return this.retry(); } this.ws = ws;
    ws.onopen = () => { this.backoff = 0; this.raw({ topic: this.topic, event: 'phx_join', payload: { config: { broadcast: { self: false, ack: false }, presence: { key: '' }, postgres_changes: [] } } }); };
    ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.event === 'phx_reply' && !this.open && m.payload && m.payload.status === 'ok') { this.open = true; this.joinedAt = Date.now(); this.log.log('peers: joined', this.topic, 'as', this.id); for (const q of this.queue.splice(0)) this.raw(q); }
      else if (m.event === 'phx_error' || (m.event === 'phx_reply' && m.payload && m.payload.status === 'error')) this.log.warn('peers:', JSON.stringify(m.payload).slice(0, 200));
      if (m.event === 'broadcast' && m.payload && m.payload.event === 'vt') { const p = m.payload.payload; if (!p || p.from === this.id) return; this.received++; try { this.onMessage(p.type, p.data, p.from); } catch (err) { this.log.warn('peers: handle', p.type, err.message); } } };
    ws.onclose = () => { this.open = false; this.retry(); }; ws.onerror = () => {};
    clearInterval(this.hb); this.hb = setInterval(() => { if (this.open) this.raw({ topic: 'phoenix', event: 'heartbeat', payload: {} }); }, 30000); if (this.hb.unref) this.hb.unref();
  }
  retry() { if (this.closed) return; this.backoff = Math.min(30000, this.backoff ? this.backoff * 2 : 1000); const t = setTimeout(() => this.connect(), this.backoff); if (t.unref) t.unref(); }
  raw(msg) { msg.ref = String(++this.ref); try { this.ws.send(JSON.stringify(msg)); } catch (e) { /* 끊긴 소켓: onclose가 다시 잇는다 */ } }
  // 다른 인스턴스에 보낸다. 아직 안 붙었으면 1,000건까지 쌓아 뒀다 붙으면 보낸다
  send(type, data) { const msg = { topic: this.topic, event: 'broadcast', payload: { type: 'broadcast', event: 'vt', payload: { from: this.id, type, data } } }; this.sent++; if (this.open) this.raw(msg); else if (this.queue.length < 1000) this.queue.push(msg); }
  close() { this.closed = true; clearInterval(this.hb); try { this.ws && this.ws.close(); } catch {} }
}
function supabaseWsUrl(supabaseUrl, key) { return supabaseUrl.replace(/^http/, 'ws').replace(/\/$/, '') + '/realtime/v1/websocket?apikey=' + encodeURIComponent(key) + '&vsn=1.0.0'; }
module.exports = { Peers, supabaseWsUrl };
