import ProductCard from "./ProductCard";
import { PRODUCTS } from "./data";
export default function Products() {
  return (<>
    <h1>상품</h1>
    <p className="lead">상품을 누르면 <code>product_click</code> 이벤트가 갑니다. 대시보드에서 별이 반짝여요.</p>
    <div className="grid">{PRODUCTS.map(p => <ProductCard key={p.id} {...p} />)}</div>
  </>);
}
