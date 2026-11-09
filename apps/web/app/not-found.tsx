import Link from 'next/link';
import '../shell/shell.css';
import './landing.css';
import { serverT } from '../lib/locale';

export default async function NotFound() {
  const { T } = await serverT();
  return <div className="wrap"><header className="hero"><h1 style={{ fontFamily: 'var(--font-tiny)', fontSize: 16 }}>404</h1><p className="tag">{T("그런 페이지가 없어요.")}</p>
    <div className="row"><Link className="btn primary" href="/">{T("처음으로")}</Link><Link className="btn" href="/demo">{T("데모 둘러보기")}</Link></div></header></div>;
}
