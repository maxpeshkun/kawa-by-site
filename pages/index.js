import dynamic from 'next/dynamic'
const AppShell = dynamic(()=>import('../components/AppShell'),{ssr:false})
export default function Home(){return <AppShell/>}
