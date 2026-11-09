'use client';
// 마운트 뒤 대시보드 셸(shell/dashboard.js, 엔진·React 패널 포함)을 동적으로 불러 한 번 붙인다. 서버 HTML에는 마크업만 있고 이 청크는 클라이언트에서만 받는다(next/dynamic ssr:false와 같은 효과).
// StrictMode의 이중 effect: 첫 effect의 cleanup이 on=false로 막고, boot() 자체도 두 번 불리지 않게 되어 있다
import { useEffect } from 'react';

export default function DashboardBoot({ demo }: { demo: boolean }) {
  useEffect(() => {
    let on = true;
    import('../shell/dashboard.js').then(m => { if (on) m.boot({ demo }); });
    return () => { on = false; };
  }, [demo]);
  return null;
}
