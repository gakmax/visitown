import type { Metadata } from 'next';
import '../../shell/shell.css';
import '../../shell/ds.css';
import { shellFile } from '../../components/DashboardShell';
import DsBoot from '../../components/DsBoot';

export const metadata: Metadata = { title: 'Visitown 디자인 시스템' };
// 버튼·드롭다운·확인창·색 토큰·효과음의 쓰임과 복사용 코드(예전 /design-system/, src/ds.html). 마크업은 shell/ds.html, 동작은 shell/ds.js
export default function DesignSystemPage() {
  return <>
    <div className="vt-shell" dangerouslySetInnerHTML={{ __html: shellFile('ds.html') + shellFile('dlg.html') }} />
    <DsBoot />
  </>;
}
