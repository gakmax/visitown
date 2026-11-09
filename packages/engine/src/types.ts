// 엔진·SDK·서버가 같이 보는 모양(로드맵 51의 packages/types 씨앗). 서버 normalize 뒤의 이벤트, 세션, 스토어 변경 알림
export type SysEventType = 'session_start' | 'page_view' | 'heartbeat' | 'page_leave' | 'note';
export interface VtEvent { event_id: string; site_id?: string; session_id: string; event_type: SysEventType | (string & {}); page_path: string; timestamp: string; properties?: Record<string, any>; path?: string; started_at?: number; }
export interface SessionProps { device: string; returning: boolean; referrer: string; plan: string; me: boolean; country: string | null; campaign: string | null; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; rare: string | null; visitNo: number | null; }
export interface Session { id: string; code: string; page: string; path: string; startedAt: number; lastSeen: number; lastTs: number; events: { type: string; at: number; page: string }[]; seed: number; props: SessionProps; bot: string | null; }
export interface PageMapping { path: string; pattern?: string; name?: string; kind?: string; slot?: number; }
export interface EventConfig { type: string; label?: string; effect?: string; sound?: string; notify?: boolean; value?: boolean; feed?: boolean; }
export type StoreChange =
  | { type: 'event'; event: VtEvent; session: Session | undefined; moved: boolean }
  | { type: 'enter'; session: Session } | { type: 'move'; session: Session; from: string; to: string }
  | { type: 'leave'; session: Session; reason: 'leave' | 'timeout' } | { type: 'custom'; session: Session; event: string; props: Record<string, any> }
  | { type: 'duplicate'; event: VtEvent } | { type: 'note'; event: VtEvent } | { type: 'select'; id: string | null };
export type Listener = (change: StoreChange) => void;
