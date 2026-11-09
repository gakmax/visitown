import Link from "next/link";
export default function Home() {
  return (<>
    <h1>demo-shop에 오신 걸 환영해요</h1>
    <p className="lead">이 사이트는 Visitown 추적 스크립트 테스트용입니다. 페이지를 옮겨 다니면 대시보드의 캐릭터가 따라 움직여요.</p>
    <div className="row">
      <Link className="btn primary" href="/products">상품 보러 가기</Link>
      <Link className="btn" href="/search">검색하기</Link>
      <Link className="btn" href="/community">커뮤니티</Link>
    </div>
    <div className="notice">대시보드는 <code>http://localhost:5173/app?api=http://localhost:8787&amp;site=site_demo&amp;token=dev</code>로 열면 됩니다.</div>
  </>);
}
