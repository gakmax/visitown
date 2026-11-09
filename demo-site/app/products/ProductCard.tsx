"use client";
import Link from "next/link";
import { track } from "../visitown";
export default function ProductCard({ id, name, price }: { id: number; name: string; price: number }) {
  return (
    <div className="card">
      <div className="thumb" />
      <strong>{name}</strong>
      <span>{price.toLocaleString()}원</span>
      <Link href={`/products/${id}`} onClick={() => track("product_click", { amount: price })}>자세히 보기</Link>
    </div>
  );
}
