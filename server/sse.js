'use strict';
// SSE 재접속 무손실(로드맵 44). 사이트별 링버퍼에 보낸 항목을 "부팅ID.순번" id와 함께 두고, 재접속한 대시보드가 Last-Event-ID를 주면 그 뒤의 빈 구간만 다시 보낸다.
// 버퍼 밖(너무 오래전·서버 재시작으로 부팅ID가 다름·형식 오류)이면 null → 예전처럼 스냅샷 전체. 본문 JSON은 한 번만 만들어 모든 구독자에게 같은 문자열을 쓴다.
const BOOT = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const SSE_BUFFER = +(process.env.SSE_BUFFER || 1000); // 사이트당 보관 항목 수. 바쁜 사이트(분당 6,000건)의 10초 = 1,000건
class Ring {
  constructor({ size = SSE_BUFFER, boot = BOOT } = {}) { this.size = size; this.boot = boot; this.seq = 0; this.buf = []; }
  id(n = this.seq) { return `${this.boot}.${n}`; }
  push(event, data) { const e = { n: ++this.seq, event, payload: JSON.stringify(data) }; this.buf.push(e); if (this.buf.length > this.size) this.buf.shift(); return e; }
  line(e) { return `id: ${this.id(e.n)}\nevent: ${e.event}\ndata: ${e.payload}\n\n`; }
  // lastId 뒤의 항목 전부(없으면 빈 배열). null = 이어받을 수 없음(스냅샷으로)
  after(lastId) {
    const m = /^([a-z0-9]+)\.(\d+)$/.exec(String(lastId || '')); if (!m || m[1] !== this.boot) return null;
    const n = +m[2]; if (n > this.seq) return null;
    const first = this.buf.length ? this.buf[0].n : this.seq + 1; if (n < first - 1) return null; // n 바로 다음 항목부터 전부 남아 있어야 한다
    return this.buf.filter(e => e.n > n);
  }
}
function frame(event, data, id) { return (id ? `id: ${id}\n` : '') + `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`; }
module.exports = { Ring, frame, BOOT, SSE_BUFFER };
