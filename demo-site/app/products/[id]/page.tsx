import Link from "next/link";
import { PRODUCTS } from "../data";
export default async function Product({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const p = PRODUCTS.find(x => String(x.id) === id);
  if (!p) return <h1>없는 상품이에요</h1>;
  return (<>
    <h1>{p.name}</h1>
    <p className="lead">{p.price.toLocaleString()}원 · 이 페이지 경로는 <code>/products/{p.id}</code>라서 서버 설정의 패턴 <code>^/products(/|$)</code>으로 상점 건물에 묶입니다.</p>
    <div className="row"><Link className="btn primary" href="/checkout">바로 구매</Link><Link className="btn" href="/products">목록으로</Link></div>
  </>);
}
