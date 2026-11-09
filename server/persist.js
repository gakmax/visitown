'use strict';
// page_view·커스텀 이벤트만 5초마다 배치로 Supabase REST에 넣는다. SUPABASE_URL이 없으면 아무것도 하지 않는다(로컬 개발).
class Persister {
  constructor({ url, key, interval = 5000, log = console } = {}) { this.url = url; this.key = key; this.buf = []; this.log = log; this.enabled = !!(url && key); if (this.enabled) this.timer = setInterval(() => this.flush(), interval).unref(); }
  push(ev, isBot) { if (!this.enabled) return; this.buf.push({ id: ev.event_id, site_id: ev.site_id, session_id: ev.session_id, event_type: ev.event_type, page_path: ev.page_path, properties: ev.properties, is_bot: !!isBot, occurred_at: ev.timestamp }); if (this.buf.length >= 500) this.flush(); }
  async flush() { if (!this.buf.length) return; const rows = this.buf.splice(0, 500);
    try { const r = await fetch(`${this.url}/rest/v1/events`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: this.key, Authorization: `Bearer ${this.key}`, Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify(rows) });
      if (!r.ok) this.log.error('persist failed', r.status, (await r.text()).slice(0, 200)); }
    catch (e) { this.log.error('persist error', e.message); } }
}
module.exports = { Persister };
