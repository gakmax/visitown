"use client";
import { useState } from "react";
import { track } from "../visitown";
export default function Checkout() {
  const [paid, setPaid] = useState(false);
  return (<>
    <h1>결제</h1>
    <p className="lead">결제하면 <code>purchase</code> 이벤트가 갑니다. 동전이 튀어요.</p>
    <div className="card" style={{ maxWidth: 420 }}><strong>주문 내역</strong><span>도트 티셔츠 × 1</span><span>합계 29,000원</span></div>
    <div className="row" style={{ marginTop: 16 }}>
      <button className="primary" onClick={() => { track("purchase", { amount: 29000 }); setPaid(true); }} disabled={paid}>{paid ? "결제 완료" : "29,000원 결제"}</button>
    </div>
  </>);
}
