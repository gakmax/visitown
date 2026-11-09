// 대시보드 서버 껍데기(로드맵 56): 마크업(shell/dashboard.html + dlg.html)을 서버에서 그대로 넣고, 클라이언트 <DashboardBoot>가 마운트 뒤 shell/dashboard.js를 불러 붙인다.
// 캔버스·SSE는 브라우저 전용이라 서버에서 그릴 게 없고, 마크업만 먼저 보내 첫 화면이 빨리 뜬다. 피드·정보·헤더 숫자는 dashboard.js가 @visitown/ui(React)를 #feed·#infoBody·#statsBox에 마운트한다
import fs from 'node:fs';
import path from 'node:path';
import '../shell/dashboard.css';
import '../shell/shell.css';
import DashboardBoot from './DashboardBoot';
import { requestLocale, translateHtml } from '../lib/locale';

const cache = new Map<string, string>();
export function shellFile(name: string) {
  if (process.env.NODE_ENV !== 'development' && cache.has(name)) return cache.get(name)!;
  const s = fs.readFileSync(path.join(process.cwd(), 'shell', name), 'utf8'); cache.set(name, s); return s;
}

export default async function DashboardShell({ demo = false }: { demo?: boolean }) {
  const html = translateHtml(shellFile('dashboard.html') + shellFile('dlg.html'), await requestLocale()); // 영어면 마크업 글자를 서버에서 바꿔 보낸다(로드맵 60)
  return <>
    <div className="vt-shell" dangerouslySetInnerHTML={{ __html: html }} />
    <DashboardBoot demo={demo} />
  </>;
}
