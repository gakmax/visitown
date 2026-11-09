"use client";
import { useState } from "react";
import { track } from "../visitown";
export default function Community() {
  const [joined, setJoined] = useState(false);
  return (<>
    <h1>커뮤니티</h1>
    <p className="lead">가입하면 <code>sign_up</code> 이벤트가 갑니다. 폭죽이 터져요.</p>
    <div className="card" style={{ maxWidth: 420 }}>
      <strong>오늘의 글</strong>
      <span>마을에 새 분수가 생겼어요 · 댓글 3</span>
      <span>로봇 캐릭터는 어디서 오나요? · 댓글 7</span>
    </div>
    <div className="row" style={{ marginTop: 16 }}>
      <button className="primary" onClick={() => { track("sign_up"); setJoined(true); }} disabled={joined}>{joined ? "가입 완료" : "커뮤니티 가입"}</button>
    </div>
  </>);
}
