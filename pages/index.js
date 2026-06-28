import dynamic from 'next/dynamic';

const JournifiApp = dynamic(() => import('../app/JournifiApp'), { 
  ssr: false,
  loading: () => null
});

export default function Home() {
  return <JournifiApp />;
}
