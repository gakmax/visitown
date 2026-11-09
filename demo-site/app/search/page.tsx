"use client";
import { useState } from "react";
import { track } from "../visitown";
export default function Search() {
  const [q, setQ] = useState(""); const [done, setDone] = useState<string | null>(null);
  return (<>
    <h1>검색</h1>
    <p className="lead">검색하면 <code>search</code> 이벤트가 갑니다. 캐릭터 머리 위에 돋보기 말풍선이 떠요.</p>
    <form className="row" onSubmit={e => { e.preventDefault(); track("search"); setDone(q); }}>
      <input type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="검색어" aria-label="검색어" />
      <button className="primary" type="submit">검색</button>
    </form>
    {done !== null && <p className="hint">&quot;{done}&quot; 검색 결과 0건 (테스트 사이트라 결과는 없어요)</p>}
  </>);
}
