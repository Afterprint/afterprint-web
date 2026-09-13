'use client';
import Link from 'next/link';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {api} from '@/lib/api';
import {Fingerprint,ArrowRight,ExternalLink,Shield,Check} from 'lucide-react';

type Step='idle'|'connecting'|'signing'|'verifying'|'done';

export default function Login(){
  const router=useRouter();
  const [step,setStep]=useState<Step>('idle');
  const [error,setError]=useState('');
  const [publicKey,setPublicKey]=useState('');

  async function connect(){
    setError('');
    setStep('connecting');
    try{
      // Check Freighter is installed
      const freighter=(window as any).freighterApi;
      if(!freighter){
        setError('Freighter is not installed. Install it from freighter.app, then reload this page.');
        setStep('idle');
        return;
      }
      // Check connection
      const {isConnected}=await freighter.isConnected();
      if(!isConnected){
        setError('Freighter is not connected. Open the extension and unlock your wallet, then try again.');
        setStep('idle');
        return;
      }
      // Get the wallet address
      const addressResult=await (freighter.getAddress?.()??freighter.getPublicKey?.().then((pk:string)=>({address:pk})));
      const walletAddress:string=addressResult?.address??addressResult;
      if(!walletAddress){
        setError('Could not read your wallet address. Check Freighter permissions.');
        setStep('idle');
        return;
      }
      setPublicKey(walletAddress);
      // Request a challenge from the API
      const {challenge}=await api<{challenge:string}>('/auth/challenge',{method:'POST',body:JSON.stringify({publicKey:walletAddress})});
      // Ask Freighter to sign the challenge
      setStep('signing');
      let signedMessage:string;
      if(freighter.signMessage){
        const result=await freighter.signMessage({message:challenge,address:walletAddress});
        signedMessage=result?.signedMessage??result;
      }else{
        setError('This version of Freighter does not support message signing. Update to the latest version.');
        setStep('idle');
        return;
      }
      if(!signedMessage){
        setError('Signing was cancelled or failed. Try again.');
        setStep('idle');
        return;
      }
      // Verify with the API
      setStep('verifying');
      await api<{id:string;name:string}>('/auth/verify',{method:'POST',body:JSON.stringify({publicKey:walletAddress,signature:signedMessage})});
      setStep('done');
      setTimeout(()=>router.push('/cases'),600);
    }catch(e:any){
      setError(e?.message||'Authentication failed. Try again.');
      setStep('idle');
    }
  }

  const busy=step!=='idle'&&step!=='done';
  const stepLabel:Record<Step,string>={idle:'Connect Freighter wallet',connecting:'Reading wallet address…',signing:'Sign the challenge in Freighter…',verifying:'Verifying signature…',done:'Authenticated — opening workspace…'};

  return(
    <div className="login-page">
      {/* ── Left panel ────────────────────────────────────────────────── */}
      <div className="login-art">
        <Link href="/" className="brand" style={{color:'#e9ede4',fontSize:26}}>
          <img src="/afterprint-logo.png" alt="" style={{background:'rgba(255,255,255,0.1)',borderRadius:'50%',padding:3,width:31,height:31}}/>
          afterprint<span style={{color:'#92a18c',fontSize:10,alignSelf:'flex-start',marginTop:7}}>®</span>
        </Link>
        <div>
          <h1>Evidence<br/>intelligence<br/><span>for serious</span><br/>investigations.</h1>
          <p style={{marginTop:28,maxWidth:320}}>
            Afterprint ingests recordings, documents, sensor logs, and reports.
            The AI extracts, synchronizes, and cites. You review and finalize.
          </p>
        </div>
        <div>
          {[
            'Immutable originals — originals are never modified',
            'Append-only custody chain',
            'Stellar blockchain anchoring',
            'Human review before any report is finalized',
          ].map(l=>(
            <div key={l} style={{display:'flex',gap:10,alignItems:'center',fontSize:10,color:'#96abae',marginBottom:12}}>
              <Check size={13} style={{color:'#7da889',flexShrink:0}}/>{l}
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ───────────────────────────────────────────────── */}
      <div className="login-form">
        <div style={{maxWidth:380}}>
          <Fingerprint size={44} strokeWidth={1} style={{color:'#ff641c',marginBottom:28}}/>
          <h2 style={{fontSize:32,letterSpacing:'-1.5px',marginBottom:12}}>
            Connect your<br/>Freighter wallet.
          </h2>
          <p>
            Afterprint uses the <strong>Freighter</strong> browser wallet for authentication.
            No password. No email address. Your Stellar public key identifies you.
          </p>

          {error&&(
            <div className="login-error">
              {error}
            </div>
          )}

          <button
            className="login-wallet-btn"
            onClick={connect}
            disabled={busy||step==='done'}
            id="connect-freighter-btn"
            aria-live="polite"
            aria-busy={busy}
          >
            <Shield size={18}/>
            {stepLabel[step]}
            {!busy&&step==='idle'&&<ArrowRight size={16} style={{marginLeft:'auto'}}/>}
          </button>

          {publicKey&&step!=='idle'&&(
            <div className="freighter-status">
              <span style={{fontFamily:'monospace',fontSize:10,display:'block',marginTop:12,color:'#6b7970',wordBreak:'break-all'}}>
                {publicKey.slice(0,8)}…{publicKey.slice(-8)}
              </span>
            </div>
          )}

          <div className="login-divider"><span>FREIGHTER</span></div>

          <p style={{fontSize:11,color:'#8c9d82',lineHeight:1.8}}>
            Freighter is a free Stellar browser extension for Chrome, Firefox, and Brave.
          </p>
          <a
            href="https://freighter.app"
            target="_blank"
            rel="noopener noreferrer"
            style={{display:'inline-flex',alignItems:'center',gap:7,fontSize:11,color:'#6b8a60',borderBottom:'1px solid currentColor',paddingBottom:2,marginTop:8}}
          >
            Get Freighter <ExternalLink size={12}/>
          </a>

          <div style={{marginTop:40,paddingTop:24,borderTop:'1px solid #e2e8d9'}}>
            <p style={{fontSize:10,color:'#9aab8c',lineHeight:1.8,margin:0}}>
              By connecting, you confirm you are an authorized user of this workspace.
              All access is audited and logged.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
