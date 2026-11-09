'use client';
import { useEffect } from 'react';

export default function DsBoot() {
  useEffect(() => { let on = true; import('../shell/ds.js').then(m => { if (on) m.boot(); }); return () => { on = false; }; }, []);
  return null;
}
