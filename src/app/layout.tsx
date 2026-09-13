import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/providers';
export const metadata: Metadata={title:'Afterprint — Truth leaves a trace.',description:'An evidence workspace for the complete picture. Preserve originals. Connect the details. Trace every claim.',icons:{icon:'/afterprint-logo.png'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><Providers>{children}</Providers></body></html>}
