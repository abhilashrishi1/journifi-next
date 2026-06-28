'use client';

import dynamic from 'next/dynamic';

const JournifiApp = dynamic(() => import('./JournifiApp'), { 
  ssr: false,
  loading: () => (
    <div style={{ minHeight:'100vh', background:'#0F1117', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'#C9993A', fontFamily:'serif', fontSize:24 }}>Journifi</div>
    </div>
  )
});

export default function Page() {
  return <JournifiApp />;
}
