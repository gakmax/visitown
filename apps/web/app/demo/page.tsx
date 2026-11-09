import type { Metadata } from 'next';
import DashboardShell from '../../components/DashboardShell';

export const metadata: Metadata = { title: 'Visitown 데모' };
// 서버 없이 시뮬레이터로 도는 가상 마을(예전 index.html?demo=1)
export default function DemoPage() { return <DashboardShell demo />; }
