import { Suspense } from 'react';
import JournifiApp from './JournifiApp';

export default function Page() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:'100vh', background:'#0F1117', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ color:'#C9993A', fontFamily:'serif', fontSize:24 }}>Journifi</div>
      </div>
    }>
      <JournifiApp />
    </Suspense>
  );
}
