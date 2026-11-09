// 커스텀 이벤트 보내기. 스크립트가 아직 안 떴거나 차단됐으면 조용히 넘어간다.
declare global { interface Window { visitown?: { track: (type: string, props?: Record<string, unknown>) => void; sessionId: string } } }
export function track(type: string, props?: Record<string, unknown>) { if (typeof window !== "undefined" && window.visitown) window.visitown.track(type, props); }
