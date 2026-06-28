import dynamic from 'next/dynamic';

const JournifiApp = dynamic(() => import('./JournifiApp'), { 
  ssr: false,
  loading: () => null
});

export default function Page() {
  return <JournifiApp />;
}
