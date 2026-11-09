"use client";
import { useEffect, useState } from "react";
export default function MyPage() {
  const [sid, setSid] = useState("");
  useEffect(() => { const t = setInterval(() => { if (window.visitown) { setSid(window.visitown.sessionId); clearInterval(t); } }, 200); return () => clearInterval(t); }, []);
  const markMe = () => { try { localStorage.setItem("vt_me", "1"); } catch {} location.reload(); };
  return (<>
    <h1>마이페이지</h1>
    <p className="lead">이 탭의 익명 세션 ID: <code>{sid || "(스크립트 로딩 중)"}</code></p>
    <p className="hint">대시보드에서 이 세션이 캐릭터 하나와 1:1로 연결됩니다. 다른 탭을 열면 다른 캐릭터가 생겨요.</p>
    <div className="row"><button onClick={markMe}>이 브라우저를 &quot;나&quot;로 표시</button></div>
    <p className="hint">설치 확인 화면이 남기는 임시 토큰을 흉내 냅니다. 누르면 새로고침 뒤 대시보드에 빨간 ME 표시가 붙어요.</p>
  </>);
}
