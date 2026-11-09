import type { Metadata } from 'next';
import { serverT } from '../../lib/locale';
import DashboardShell from '../../components/DashboardShell';

export async function generateMetadata(): Promise<Metadata> { const { T } = await serverT(); return { title: T("Visitown 대시보드") }; }
// /app?api=&site=&token= · ?tv=초&sites= · ?join=초대토큰 은 shell/dashboard.js가 location.search에서 읽는다(개발·TV·초대용). 아무것도 없으면 진입 화면(#gate)
export default function AppPage() { return <DashboardShell />; }
