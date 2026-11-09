import type { Metadata } from "next";
import Script from "next/script";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = { title: "demo-shop — Visitown 테스트 사이트", description: "Visitown 추적 스크립트 테스트용 샘플 쇼핑몰" };
const VT_API = process.env.NEXT_PUBLIC_VT_API || "http://localhost:8787";
const VT_SITE = process.env.NEXT_PUBLIC_VT_SITE || "site_demo";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <header>
          <strong>demo-shop</strong>
          <nav>
            <Link href="/">홈</Link>
            <Link href="/products">상품</Link>
            <Link href="/search">검색</Link>
            <Link href="/community">커뮤니티</Link>
            <Link href="/mypage">마이페이지</Link>
            <Link href="/checkout">결제</Link>
          </nav>
        </header>
        <main>{children}</main>
        {/* Visitown 추적 스크립트. 실제 고객 사이트에는 이 한 줄만 들어간다. */}
        <Script src={`${VT_API}/visitown.js`} data-site={VT_SITE} strategy="afterInteractive" />
      </body>
    </html>
  );
}
