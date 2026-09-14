'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {
  ArrowUpRight,ArrowRight,ArrowDown,Shield,FileText,
  Clock,Network,TriangleAlert,MessagesSquare,FileCheck2,
  Download,Hash,Eye,Scale,ChevronRight,Check,AlertCircle,
  HelpCircle,Fingerprint,ScanLine,AudioLines,Video,Link2,
  Lock,Users,Search,Database,Cpu,GitBranch,ShieldCheck,
  Radio,Layers,ExternalLink,Compass
} from 'lucide-react';

const CATEGORIES=[
  {
    key:'VERIFIED_FACT',
    color:'#22c55e',
    label:'Verified Fact',
    subtitle:'Direct authenticated source support',
    desc:'Directly supported by an authenticated evidence source. The CCTV footage displays the vehicle timestamped at 20:54:12 UTC. The door sensor log records an access trigger. No model inference or guessing is involved.'
  },
  {
    key:'CORROBORATED_CLAIM',
    color:'#3b82f6',
    label:'Corroborated Claim',
    subtitle:'Multiple independent sources agree',
    desc:'Supported by two or more independent, uncoordinated sources (e.g. independent radio dispatch logs plus physical gate telemetry). Stronger corroboration than an isolated claim, but still requires explicit human sign-off.'
  },
  {
    key:'INFERENCE',
    color:'#f59e0b',
    label:'Inference',
    subtitle:'Reasoned hypothesis — never presented as fact',
    desc:'A deductive interpretation or pattern identified from circumstantial evidence. Clearly marked as an inference in all screens and exports. Never disguised as an established fact.'
  },
  {
    key:'CONFLICT',
    color:'#ef4444',
    label:'Conflict',
    subtitle:'Sources disagree — preserved for review',
    desc:'Two or more evidence sources disagree (e.g., driver claims arrival after 21:00, but gate CCTV records vehicle entering at 20:54). Afterprint surfaces both sides with exact citations and never silently reconciles them.'
  },
  {
    key:'UNKNOWN',
    color:'#6b7280',
    label:'Unknown',
    subtitle:'Evidence gap — zero AI hallucinations',
    desc:'The available evidence does not cover this question or time window. Afterprint preserves the gap explicitly. It will never invent missing events or hallucinate transitions to create a neat story.'
  },
] as const;

const STEPS=[
  {icon:ScanLine,title:'01. Multi-modal ingest',body:'Upload CCTV footage, dashcam video, radio dispatch audio, witness statements, PDFs, GPS logs, vehicle telemetry, and sensor exports. All formats are accepted without lossy re-encoding.'},
  {icon:Hash,title:'02. Cryptographic hashing',body:'Every evidence file is SHA-256 hashed immediately upon intake. An immutable version is sealed in write-protected object storage. The original byte stream is never modified or overwritten.'},
  {icon:Shield,title:'03. Append-only custody log',body:'Every action creates a custody event chained to the previous event hash: who uploaded, inspected, transferred, or exported the evidence. The chain is append-only and cryptographically tamper-evident.'},
  {icon:Cpu,title:'04. Grounded AI extraction',body:'Automatic transcription for audio and video with millisecond timestamp markers. OCR for scanned documents. Entity extraction across people, vehicles, locations, and time claims.'},
  {icon:Clock,title:'05. Synchronized timeline',body:'Events across all disparate sources are mapped onto a unified timeline. Each event retains its source basis (device metadata, visible clock, statement) and precision level (Exact, Minute, Approximate).'},
  {icon:Network,title:'06. Evidence relationship graph',body:'Entities, locations, and events are linked in a navigable graph. Every edge represents an evidence connection and carries a direct pointer to the underlying source span.'},
  {icon:TriangleAlert,title:'07. Automatic conflict detection',body:'When two or more sources make incompatible claims regarding timestamps, identities, or locations, a conflict is automatically flagged. Both sources are preserved for human inspection.'},
  {icon:MessagesSquare,title:'08. Grounded investigation Q&A',body:'Query the entire case in natural language. Every answer is synthesized as atomic claims where each fact or inference cites the exact page, recording timestamp, or video frame.'},
  {icon:FileCheck2,title:'09. Structured reconstruction',body:'The system drafts an end-to-end incident reconstruction cleanly separating Verified Facts, Corroborated Claims, Inferences, Conflicts, and Unknown Gaps. Nothing is conflated.'},
  {icon:Eye,title:'10. Mandatory human review',body:'An AI draft never becomes an official report automatically. Authorized investigators and legal reviewers must individually inspect and confirm claims before finalization.'},
  {icon:Lock,title:'11. Stellar blockchain anchor',body:'Evidence manifests, custody head hashes, and finalized report hashes are anchored to Soroban smart contracts on the Stellar blockchain for decentralized, tamper-evident proof.'},
  {icon:Download,title:'12. Auditable court bundle export',body:'Generate cryptographic export packages containing evidence manifests, SHA-256 hashes, full custody history, citations, and finalized reports for disclosure and third-party audit.'},
] as const;

const USERS=[
  {
    role:'Investigators',
    icon:Search,
    cases:[
      'Organize fragmented evidence across CCTV, audio, and documents',
      'Ask complex timeline questions in plain language with exact citations',
      'Identify critical blind spots and timeline gaps requiring follow-up',
      'Track the precise origin of every single factual claim in the case'
    ]
  },
  {
    role:'Forensic Analysts',
    icon:ScanLine,
    cases:[
      'Maintain an unbroken, append-only chain of custody from intake',
      'Verify byte-level file integrity against recorded SHA-256 hashes at any time',
      'Register derived artifacts (transcripts, extracted frames) without modifying originals',
      'Audit access events and transfers with immutable cryptographic receipts'
    ]
  },
  {
    role:'Legal Reviewers',
    icon:Scale,
    cases:[
      'Review each atomic claim against its cited video frame or document span',
      'Ensure inferences are never mischaracterized as established facts',
      'Sign off on finalized incident reconstructions with cryptographic attestation',
      'Generate courtroom-ready export packages with independent verification scripts'
    ]
  },
  {
    role:'Insurers & Regulators',
    icon:FileCheck2,
    cases:[
      'Receive structured, auditable evidence reconstructions with zero guesswork',
      'Independently verify that no evidence was altered after submission',
      'Validate that custody events match the immutable Stellar blockchain anchor',
      'Audit the entire decision trail from raw ingest to final claim approval'
    ]
  },
] as const;

export default function Home(){
  const [activeCat,setActiveCat]=useState(0);
  const [approachStep,setApproachStep]=useState(0);
  const [previewTab,setPreviewTab]=useState<'timeline'|'graph'|'conflicts'|'ask'>('timeline');
  const approachRef=useRef<HTMLElement>(null);

  useEffect(()=>{
    const updateScroll=()=>{
      const scrollY=window.scrollY;
      const totalScroll=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
      document.documentElement.style.setProperty('--scroll',String(scrollY/totalScroll));
      document.documentElement.style.setProperty('--hero-scroll',`${Math.min(scrollY,1000)}px`);

      if(approachRef.current){
        const rect=approachRef.current.getBoundingClientRect();
        const progress=Math.min(Math.max(-rect.top/(rect.height-window.innerHeight),0),1);
        const s=Math.min(2,Math.floor(progress*3));
        setApproachStep(s);
      }
    };
    window.addEventListener('scroll',updateScroll,{passive:true});
    updateScroll();

    const observer=new IntersectionObserver(entries=>{
      entries.forEach(e=>{
        if(e.isIntersecting)e.target.classList.add('visible');
      });
    },{threshold:0.08});

    document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));

    return()=>{
      window.removeEventListener('scroll',updateScroll);
      observer.disconnect();
    };
  },[]);

  return(
    <main className="landing">
      <div className="scroll-progress"/>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="site-nav">
        <Link href="/" className="brand">
          <img src="/afterprint-logo.png" alt="Afterprint"/>afterprint<span>®</span>
        </Link>
        <nav>
          <a href="#approach">The pipeline</a>
          <a href="#workspace">Workspace</a>
          <a href="#evidence-model">Evidence model</a>
          <a href="#how-it-works">12 Steps</a>
          <a href="#trust">Trust architecture</a>
          <a href="#who">Who uses it</a>
        </nav>
        <Link href="/login" className="nav-enter">
          Open workspace <ArrowUpRight size={16}/>
        </Link>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-grid"/>
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="orange-dot"/> EVIDENCE INTELLIGENCE PLATFORM
          </div>
          <h1>
            Fragmented evidence.<br/>
            One auditable<br/>
            <span>picture.</span>
          </h1>
          <p>
            Afterprint ingests CCTV recordings, dispatch audio, witness statements, telemetry, and forensic reports.
            Our AI synchronizes timelines, links entities, flags contradictions, and drafts an incident reconstruction —
            where <strong>every single claim</strong> cites its exact evidence source.
          </p>
          <p style={{marginTop:12,opacity:0.75,fontSize:'0.92rem'}}>
            Tamper-evident custody proofs and evidence hashes anchored to the Stellar blockchain.
            Authenticated solely via your Freighter wallet.
          </p>
          <div className="hero-actions">
            <Link href="/login" className="button orange">
              Connect Freighter wallet <ArrowUpRight size={18}/>
            </Link>
            <a href="#approach" className="text-link">
              <span className="play-ring"><ArrowDown size={12}/></span> Explore the pipeline
            </a>
          </div>
        </div>

        {/* ── Evidence Scene (Mad Animations) ────────────────────────────── */}
        <div className="evidence-scene" aria-label="Interactive evidence intelligence illustration">
          <div className="orbit orbit-one"/>
          <div className="orbit orbit-two"/>
          <svg className="trace-path" viewBox="0 0 660 660">
            <path d="M80 440 Q390 470 250 255 T535 155"/>
            <path className="orange-path" d="M80 440 Q390 470 250 255 T535 155"/>
          </svg>
          <div className="scene-cross cross-one">+</div>
          <div className="scene-cross cross-two">+</div>

          {/* Video card with live camera simulation */}
          <div className="evidence-card video-card">
            <div className="card-top">
              <span><ScanLine size={13}/> EVIDENCE 001</span>
              <span>↗</span>
            </div>
            <div className="camera-visual">
              <div className="warehouse">
                <i/><i/><i/><i/>
                <div className="vehicle"/>
              </div>
              <div className="camera-stamp">
                CAM 04 · NORTH ENTRANCE<br/>
                20:54:12 UTC · SECURE FEED
              </div>
              <div className="camera-target"/>
              <div className="camera-bottom">
                <span>● REC</span>
                <span>00:42 / 02:18</span>
              </div>
            </div>
            <div className="card-caption">
              <span>North gate surveillance</span>
              <span className="tiny-check"><Check size={11}/> SHA-256 sealed</span>
            </div>
          </div>

          {/* Audio card with oscillating waveform */}
          <div className="evidence-card audio-card">
            <div className="card-top">
              <span><AudioLines size={13}/> EVIDENCE 002</span>
              <span>↗</span>
            </div>
            <div className="waveform">
              {Array.from({length:43},(_,i)=>(
                <i key={i} style={{height:`${8+Math.abs(Math.sin(i*1.7))*31}px`,animationDelay:`${i*0.06}s`}}/>
              ))}
            </div>
            <div className="card-caption">
              Dispatch radio recording <span>02:18</span>
            </div>
          </div>

          {/* Statement note card */}
          <div className="evidence-card note-card">
            <div className="card-top">
              <span><FileText size={13}/> EVIDENCE 003</span>
              <span>↗</span>
            </div>
            <p>“The delivery arrived<br/>shortly before nine.”</p>
            <div className="note-lines"><i/><i/></div>
            <div className="card-caption">
              Driver statement <span>p. 02</span>
            </div>
          </div>

          <div className="connection-chip">
            <Link2 size={14}/>
            <span>3 sources synchronized · 1 auditable timeline</span>
          </div>
          <span className="scene-coordinate">
            51°30′26″ N &nbsp; 00°07′39″ W<br/>
            IMMUTABLE INGEST / CASE REF: AP-2026-001
          </span>
        </div>

        <div className="hero-bottom">
          <span>TRUTH LEAVES A TRACE.</span>
          <a href="#approach">SCROLL TO SEE THE TRACE <ArrowDown size={14}/></a>
          <span>STELLAR TESTNET ANCHORED</span>
        </div>
      </section>

      {/* ── Trust strip ─────────────────────────────────────────────────── */}
      <section className="trust-strip">
        <p>The evidence intelligence platform for<br/><b>investigations requiring a legally defensible record.</b></p>
        <span>INVESTIGATION</span>
        <span>FORENSIC ANALYSIS</span>
        <span>LEGAL REVIEW</span>
        <span>INSURANCE</span>
        <span>REGULATORY AUDIT</span>
      </section>

      {/* ── Sticky Interactive Thread Animation (MAD ANIMATION) ────────── */}
      <section id="approach" className="approach" ref={approachRef}>
        <div className="approach-sticky">
          <div className="section-label">01 / RECONSTRUCTING THE TRUTH</div>
          <div className="approach-layout">
            <div>
              <h2>The evidence<br/>is there.<br/><span>Follow the thread.</span></h2>
              <p>
                A video file. A radio transmission. A timestamp that contradicts a witness statement.
                Bring every fragmented perspective into one synchronized view — without ever losing where each byte came from.
              </p>
              <div className="step-list">
                {[
                  '01 / Ingest & immutable preservation',
                  '02 / Synchronize & connect sources',
                  '03 / Human review & Stellar anchor'
                ].map((s,i)=>(
                  <button
                    key={s}
                    onClick={()=>{
                      if(approachRef.current){
                        window.scrollTo({
                          top:approachRef.current.offsetTop+i*(approachRef.current.offsetHeight-window.innerHeight)/3+8,
                          behavior:'smooth'
                        });
                      }
                      setApproachStep(i);
                    }}
                    className={approachStep===i?'active':''}
                  >
                    <span>0{i+1}</span>
                    {s.split(' / ')[1]}
                    <ArrowRight size={18}/>
                  </button>
                ))}
              </div>
            </div>

            <div className={`thread-panel stage-${approachStep}`}>
              <div className="panel-label">
                AFTERPRINT / {['INGEST & HASH','CONNECT & EXTRACT','RECONSTRUCT & ANCHOR'][approachStep]}
              </div>

              <div className="thread-central">
                <Fingerprint size={66} strokeWidth={0.75}/>
                <span>
                  {['Originals SHA-256 sealed','Sources linked with citations','Audited & Stellar anchored'][approachStep]}
                </span>
              </div>

              {[
                {Icon:FileText,name:'Statement',loc:'p. 02'},
                {Icon:AudioLines,name:'Dispatch',loc:'01:14'},
                {Icon:ScanLine,name:'CCTV Cam',loc:'20:54:12'},
                {Icon:ShieldCheck,name:'Custody',loc:'Chain'}
              ].map(({Icon,name,loc},i)=>(
                <div className={`thread-node node-${i}`} key={name}>
                  <Icon size={24} strokeWidth={1.2}/>
                  <span>{name}</span>
                  <small style={{fontSize:8,opacity:0.6,fontFamily:'monospace'}}>{loc}</small>
                </div>
              ))}

              <svg viewBox="0 0 500 440">
                <path d="M100 90L250 220L400 90 M100 350L250 220L400 350"/>
              </svg>

              <div className="panel-footer">
                <span className="orange-dot"/>
                {[
                  'SHA-256 · IMMUTABLE WRITE-PROTECTED ORIGINALS',
                  'EVERY CONNECTION CITES EXACT SOURCE SPANS',
                  'HUMAN REVIEW MANDATORY · STELLAR PROOFS'
                ][approachStep]}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive Live Workspace Simulator (MAD INTERACTIVITY) ───── */}
      <section id="workspace" className="workspace-section">
        <div className="section-label reveal">02 / INTERACTIVE WORKSPACE SIMULATOR</div>
        <div className="section-heading reveal">
          <h2>A workspace.<br/><span>Not a wall of disconnected files.</span></h2>
          <p>
            Experience how Afterprint organizes fragmented evidence in real-time.
            Switch between the Timeline, Relationship Graph, Conflict Engine, and Grounded Case Q&amp;A.
          </p>
        </div>

        <div className="workspace-preview reveal">
          {/* Sidebar */}
          <div className="preview-sidebar">
            <div className="brand" style={{fontSize:20,marginBottom:20}}>afterprint</div>
            <span>CASE: AP-2026-001</span>
            <button className={previewTab==='timeline'?'selected':''} onClick={()=>setPreviewTab('timeline')}>
              <Clock size={13}/>
              <span>01</span> Synchronized Timeline
            </button>
            <button className={previewTab==='graph'?'selected':''} onClick={()=>setPreviewTab('graph')}>
              <Network size={13}/>
              <span>02</span> Evidence Graph
            </button>
            <button className={previewTab==='conflicts'?'selected':''} onClick={()=>setPreviewTab('conflicts')}>
              <TriangleAlert size={13}/>
              <span>03</span> Conflict Detector
            </button>
            <button className={previewTab==='ask'?'selected':''} onClick={()=>setPreviewTab('ask')}>
              <MessagesSquare size={13}/>
              <span>04</span> Grounded Q&amp;A
            </button>
            <div style={{marginTop:30,padding:'12px',background:'#ffffff15',borderRadius:4,fontSize:9}}>
              <span style={{color:'#ff641c',fontWeight:600}}>LIVE PREVIEW</span><br/>
              Simulating production case UI without mock backend.
            </div>
          </div>

          {/* Main workspace content */}
          <div className="preview-content">
            <div className="preview-top">
              <span>NORTH DEPOT INCIDENT / {previewTab.toUpperCase()}</span>
              <span className="status-tag">ACTIVE INVESTIGATION</span>
            </div>

            {/* TAB 1: Timeline */}
            {previewTab==='timeline'&&(
              <div>
                <h3>Synchronized Chronological Sequence</h3>
                <p>Events extracted from footage, audio dispatch, and statement records with precision tracking.</p>
                <div className="mini-timeline">
                  {[
                    {
                      time:'20:54:12 UTC',
                      title:'Vehicle enters through north entrance gate',
                      source:'CCTV Footage · CAM 04 (00:42)',
                      cat:'VERIFIED_FACT',
                      basis:'Visible clock & device telemetry'
                    },
                    {
                      time:'20:58:30 UTC',
                      title:'Dispatch operator acknowledges arrival of delivery unit',
                      source:'Audio Dispatch · Track 02 (01:18)',
                      cat:'CORROBORATED_CLAIM',
                      basis:'Audio recording + radio log'
                    },
                    {
                      time:'21:06:00 UTC',
                      title:'Witness statement claims vehicle arrived after 21:00',
                      source:'Witness Statement · Page 02, line 14',
                      cat:'CONFLICT',
                      basis:'Witness memory statement'
                    },
                  ].map((item)=>(
                    <div key={item.time}>
                      <time>{item.time.split(' ')[0]}</time>
                      <i/>
                      <article>
                        <b>{item.title}</b>
                        <small>{item.source} · Basis: {item.basis}</small>
                        <span className={`claim-label ${item.cat==='CONFLICT'?'conflict':item.cat==='VERIFIED_FACT'?'':'inference'}`}>
                          {item.cat.replace('_',' ')}
                        </span>
                      </article>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: Graph */}
            {previewTab==='graph'&&(
              <div>
                <h3>Evidence Relationship Graph</h3>
                <p>Entities, locations, and statements mapped with directional citation edges.</p>
                <svg className="mini-graph-svg" viewBox="0 0 700 240">
                  <line x1="120" y1="60" x2="350" y2="120" stroke="#bcc9ad" strokeWidth="2" strokeDasharray="4 4"/>
                  <line x1="580" y1="60" x2="350" y2="120" stroke="#bcc9ad" strokeWidth="2" strokeDasharray="4 4"/>
                  <line x1="200" y1="190" x2="350" y2="120" stroke="#ff641c" strokeWidth="2"/>
                  <line x1="500" y1="190" x2="350" y2="120" stroke="#bcc9ad" strokeWidth="2" strokeDasharray="4 4"/>

                  {/* Central node */}
                  <g transform="translate(350,120)">
                    <rect x="-80" y="-22" width="160" height="44" rx="6" fill="#102638" stroke="#ff641c" strokeWidth="2"/>
                    <text textAnchor="middle" y="4" fill="#f4f6ee" fontSize="11" fontWeight="600">Vehicle: Delivery Van</text>
                  </g>
                  {/* Surrounding nodes */}
                  <g transform="translate(120,60)">
                    <rect x="-65" y="-18" width="130" height="36" rx="4" fill="#ffffff" stroke="#99a98c"/>
                    <text textAnchor="middle" y="4" fill="#2d3d2c" fontSize="10">CAM 04 Footage</text>
                  </g>
                  <g transform="translate(580,60)">
                    <rect x="-65" y="-18" width="130" height="36" rx="4" fill="#ffffff" stroke="#99a98c"/>
                    <text textAnchor="middle" y="4" fill="#2d3d2c" fontSize="10">Radio Dispatch E002</text>
                  </g>
                  <g transform="translate(200,190)">
                    <rect x="-70" y="-18" width="140" height="36" rx="4" fill="#fff5f0" stroke="#ef4444" strokeWidth="1.5"/>
                    <text textAnchor="middle" y="4" fill="#b91c1c" fontSize="10">Witness Statement [Conflict]</text>
                  </g>
                  <g transform="translate(500,190)">
                    <rect x="-65" y="-18" width="130" height="36" rx="4" fill="#ffffff" stroke="#99a98c"/>
                    <text textAnchor="middle" y="4" fill="#2d3d2c" fontSize="10">North Entrance Gate</text>
                  </g>
                </svg>
                <div style={{marginTop:12,fontSize:10,color:'#71836c',display:'flex',gap:16}}>
                  <span>● Solid line: Verified physical link</span>
                  <span style={{color:'#ef4444'}}>● Red line: Flagged contradiction</span>
                  <span>--- Dashed line: Contextual mention</span>
                </div>
              </div>
            )}

            {/* TAB 3: Conflicts */}
            {previewTab==='conflicts'&&(
              <div>
                <h3>Contradiction &amp; Discrepancy Review</h3>
                <p>Afterprint surfaces evidence disagreements without guessing or adjudicating.</p>
                <div className="conflict-card" style={{marginTop:16}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span className="claim-label conflict">TIMESTAMP CONFLICT</span>
                    <span style={{fontSize:9,fontFamily:'monospace',color:'#8c9b88'}}>CONFLICT ID: CF-0012</span>
                  </div>
                  <h3>Vehicle Arrival Timestamp Discrepancy</h3>
                  <p>Gate surveillance camera recording contradicts witness statement timing claims by approximately 12 minutes.</p>
                  <div className="conflict-sides">
                    <div>
                      <small>SOURCE A · PHYSICAL RECORDING</small>
                      <strong style={{display:'block',margin:'6px 0',fontSize:12}}>CAM 04 North Gate CCTV</strong>
                      <p>Visual timestamp records vehicle crossing gate sensor at 20:54:12 UTC. License plate clearly illuminated.</p>
                      <span className="claim-label">VERIFIED FACT</span>
                    </div>
                    <div>
                      <small>SOURCE B · TESTIMONIAL</small>
                      <strong style={{display:'block',margin:'6px 0',fontSize:12}}>Driver Witness Statement</strong>
                      <p>Signed statement asserts driver did not arrive at facility until "shortly after 21:00" following dinner break.</p>
                      <span className="claim-label inference">STATEMENT CLAIM</span>
                    </div>
                  </div>
                  <div style={{fontSize:10,color:'#71836c',background:'#f4f6ee',padding:10,borderRadius:4}}>
                    <strong>Platform Policy:</strong> The AI does not call the witness a liar or discard either source. Both records remain preserved for investigator and judicial evaluation.
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Ask Case */}
            {previewTab==='ask'&&(
              <div>
                <h3>Grounded Case Query Engine</h3>
                <p>Natural language answers synthesized strictly with atomic citations. No hallucinations.</p>
                <div className="chat-message user" style={{margin:'15px 0 10px'}}>
                  <strong>Query:</strong> "At what time did the delivery vehicle arrive at North Depot, and what sources confirm this?"
                </div>
                <div className="chat-message" style={{background:'#ffffff',border:'1px solid #d5dfcb'}}>
                  <span className="claim-label" style={{background:'#22c55e20',color:'#15803d',border:'1px solid #22c55e40'}}>
                    VERIFIED FACT + CORROBORATED CLAIM
                  </span>
                  <p style={{marginTop:8,lineHeight:1.8}}>
                    The vehicle entered the facility at <strong>20:54:12 UTC</strong> as recorded on north gate surveillance footage.
                    This is corroborated by dispatch radio communications at <strong>20:58:30 UTC</strong> acknowledging arrival.
                  </p>
                  <p style={{marginTop:6,fontSize:11,color:'#dc2626'}}>
                    <strong>Note of Contradiction:</strong> Driver statement p. 02 claims arrival after 21:00 UTC, which contradicts physical recording timestamps.
                  </p>
                  <div className="citations" style={{marginTop:12}}>
                    <span className="citation"><ScanLine size={11}/> CAM 04 @ 00:42</span>
                    <span className="citation"><AudioLines size={11}/> Dispatch Track 02 @ 01:18</span>
                    <span className="citation"><FileText size={11}/> Statement p. 02, line 14</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Link href="/login" className="preview-cta">
            Open workspace with Freighter <ArrowUpRight size={18}/>
          </Link>
        </div>
      </section>

      {/* ── Evidence Model (5 Categories) ───────────────────────────────── */}
      <section id="evidence-model" style={{padding:'100px 0'}}>
        <div style={{maxWidth:1000,margin:'0 auto',padding:'0 40px'}}>
          <div className="section-label reveal">03 / THE 5-CATEGORY EVIDENCE MODEL</div>
          <div className="section-heading reveal">
            <h2>Every claim belongs<br/><span>to exactly one category.</span></h2>
            <p>
              The AI never conflates facts with inferences, or sweeps contradictions under the rug.
              Every output is stamped with one of five categories — preserving integrity through every screen and report.
            </p>
          </div>

          <div className="categories-nav reveal" style={{marginTop:40}}>
            {CATEGORIES.map((cat,i)=>(
              <button
                key={cat.key}
                className={`cat-btn ${activeCat===i?'active':''}`}
                style={{'--cat-color':cat.color} as any}
                onClick={()=>setActiveCat(i)}
              >
                <span className="cat-dot" style={{background:cat.color}}/>
                {cat.label}
              </button>
            ))}
          </div>

          <div
            className="cat-detail reveal"
            style={{
              marginTop:24,
              padding:36,
              background:'var(--surface,#ffffff)',
              borderRadius:8,
              border:`1px solid ${CATEGORIES[activeCat].color}44`,
              boxShadow:'0 10px 30px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span
                className="claim-label"
                style={{
                  background:`${CATEGORIES[activeCat].color}18`,
                  color:CATEGORIES[activeCat].color,
                  border:`1px solid ${CATEGORIES[activeCat].color}44`,
                  borderRadius:4,
                  padding:'4px 12px',
                  fontSize:'0.8rem',
                  fontWeight:600,
                  letterSpacing:'0.05em'
                }}
              >
                {CATEGORIES[activeCat].label}
              </span>
              <span style={{fontSize:11,color:'#8c9b88',fontFamily:'monospace'}}>
                {CATEGORIES[activeCat].subtitle}
              </span>
            </div>
            <p style={{marginTop:20,fontSize:'1.1rem',lineHeight:1.8,opacity:0.9,color:'var(--ink)'}}>
              {CATEGORIES[activeCat].desc}
            </p>
          </div>

          <div className="reveal" style={{marginTop:30,padding:'24px',background:'#ffffff',border:'1px solid #dce3d5',borderRadius:8,display:'flex',gap:16,alignItems:'flex-start'}}>
            <HelpCircle size={20} style={{color:'#f59e0b',flexShrink:0,marginTop:2}}/>
            <p style={{fontSize:'0.92rem',opacity:0.8,lineHeight:1.7,margin:0}}>
              <strong>Guaranteed safety invariant:</strong> Afterprint never calculates a guilt score, suspect likelihood rating, or automated lie detection index.
              Exculpatory evidence is retrieved with the exact same threshold as inculpatory evidence.
              Human review is mandatory before any reconstruction is finalized.
            </p>
          </div>
        </div>
      </section>

      {/* ── 12-Step In-Depth Pipeline ───────────────────────────────────── */}
      <section id="how-it-works" style={{padding:'100px 0',background:'var(--surface,#f9faf6)',borderTop:'1px solid #dce3d5',borderBottom:'1px solid #dce3d5'}}>
        <div style={{maxWidth:1200,margin:'0 auto',padding:'0 40px'}}>
          <div className="section-label reveal">04 / THE 12-STEP DEFENSIVE PIPELINE</div>
          <div className="section-heading reveal">
            <h2>From raw byte ingest<br/><span>to cryptographically proven export.</span></h2>
            <p>
              Every transformation is registered as a derived artifact. Originals are immutable.
              Custody transfers are chained. Nothing can be modified after the fact.
            </p>
          </div>
          <div className="steps-grid reveal">
            {STEPS.map((step,i)=>{
              const Icon=step.icon;
              return(
                <div key={step.title} className="step-card">
                  <div className="step-number">{String(i+1).padStart(2,'0')}</div>
                  <div className="step-icon"><Icon size={22} strokeWidth={1.6}/></div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Trust Architecture ──────────────────────────────────────────── */}
      <section id="trust" style={{padding:'100px 0'}}>
        <div style={{maxWidth:1100,margin:'0 auto',padding:'0 40px'}}>
          <div className="section-label reveal">05 / TRUST &amp; SECURITY ARCHITECTURE</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:60,alignItems:'center'}} className="reveal">
            <div>
              <h2 style={{fontSize:'clamp(2rem,4.5vw,3.2rem)',lineHeight:1.15}}>
                Built so you can<br/>verify it yourself.<br/><span>Independently.</span>
              </h2>
              <p style={{marginTop:24,opacity:0.85,lineHeight:1.8}}>
                Every architectural decision assumes that Afterprint itself may be challenged under cross-examination.
                The cryptographic hash chain and decentralized Stellar anchors ensure that no administrator, model,
                or third party can tamper with historical evidence records undetected.
              </p>
              <div style={{marginTop:32}}>
                <Link href="/login" className="button orange">
                  Enter with Freighter wallet <ArrowUpRight size={16}/>
                </Link>
              </div>
            </div>
            <div>
              {[
                {icon:Hash,title:'SHA-256 byte-level seal',body:'Every evidence file is hashed instantly upon ingestion. Any bit alteration or storage corruption is flagged immediately by automated integrity checks.'},
                {icon:GitBranch,title:'Cryptographic custody hash chain',body:'Each custody transfer or inspection is hashed together with the previous event hash. The chain is append-only and tamper-evident.'},
                {icon:Lock,title:'Stellar blockchain anchoring',body:'Evidence version manifests and custody head hashes are anchored into Soroban smart contracts on Stellar, establishing immutable third-party proof.'},
                {icon:Database,title:'Write-protected immutable originals',body:'Raw case evidence is stored in versioned, write-protected object storage. No API endpoint possesses permissions to delete or overwrite originals.'},
                {icon:Users,title:'Case-scoped capability RBAC',body:'Strict capability enforcement gates every action (View, Upload, Transfer Custody, AI Query, Finalize, Attest). Audit logs are append-only.'},
              ].map(({icon:Icon,title,body})=>(
                <div key={title} className="activity-row reveal" style={{marginBottom:20}}>
                  <div style={{background:'rgba(255,100,28,0.12)',borderRadius:8,padding:10,flexShrink:0}}>
                    <Icon size={18} style={{color:'#ff641c'}}/>
                  </div>
                  <div>
                    <strong style={{fontSize:'0.95rem'}}>{title}</strong>
                    <p style={{margin:0,marginTop:4,fontSize:'0.85rem',opacity:0.75,lineHeight:1.6}}>{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Who Uses Afterprint ─────────────────────────────────────────── */}
      <section id="who" style={{padding:'100px 0',background:'var(--surface,#f9faf6)'}}>
        <div style={{maxWidth:1100,margin:'0 auto',padding:'0 40px'}}>
          <div className="section-label reveal">06 / BUILT FOR SERIOUS TEAMS</div>
          <div className="section-heading reveal">
            <h2>Every role, the<br/><span>complete defensible picture.</span></h2>
            <p>From field investigators collecting footage to senior counsel presenting in court.</p>
          </div>
          <div className="case-grid reveal" style={{marginTop:50}}>
            {USERS.map(({role,icon:Icon,cases})=>(
              <div key={role} className="case-card" style={{cursor:'default'}}>
                <div className="case-ref">
                  <span style={{display:'flex',alignItems:'center',gap:6,fontWeight:600}}><Icon size={16} style={{color:'#ff641c'}}/>{role}</span>
                  <span>SPECIALIZED WORKFLOW</span>
                </div>
                <ul style={{listStyle:'none',padding:0,margin:'20px 0 0',display:'flex',flexDirection:'column',gap:12}}>
                  {cases.map(c=>(
                    <li key={c} style={{display:'flex',gap:10,alignItems:'flex-start',fontSize:'0.88rem',opacity:0.85,lineHeight:1.5}}>
                      <Check size={14} style={{color:'#ff641c',flexShrink:0,marginTop:2}}/>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Principles / What Afterprint will NEVER do ──────────────────── */}
      <section className="integrity-section" id="principles">
        <div className="integrity-art reveal">
          <Fingerprint size={240} strokeWidth={0.4}/>
          <div className="integrity-ring"/>
          <span>ORIGINAL → SHA-256 → CHAIN → STELLAR ANCHOR</span>
        </div>
        <div className="reveal">
          <div className="section-label">07 / SAFETY &amp; LEGAL INVARIANTS</div>
          <h2 style={{marginTop:20}}>What Afterprint<br/><span>will never do.</span></h2>
          <p style={{marginBottom:24}}>
            We designed Afterprint to assist human judgment, not replace it.
            These non-negotiable invariants are enforced directly in our code architecture:
          </p>
          <ul style={{listStyle:'none',padding:0,margin:'0',display:'flex',flexDirection:'column',gap:12}}>
            {[
              'Never calculate a guilt or innocence score.',
              'Never perform automatic lie detection or claim someone is lying.',
              'Never invent missing events to smooth over timeline gaps.',
              'Never present a model inference as an authenticated fact.',
              'Never perform biometric identification or facial recognition creep.',
              'Never finalize an incident report without explicit human reviewer sign-off.',
              'Never store raw case evidence bytes on the public Stellar blockchain.',
              'Never downgrade or deprioritize exculpatory evidence.'
            ].map(p=>(
              <li key={p} style={{display:'flex',alignItems:'center',gap:12,fontSize:'0.92rem',opacity:0.9}}>
                <span style={{width:20,height:20,borderRadius:'50%',border:'1.5px solid #ef4444',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <span style={{color:'#ef4444',fontSize:13,lineHeight:1,fontWeight:700}}>×</span>
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Closing CTA ─────────────────────────────────────────────────── */}
      <section className="closing">
        <div className="section-label">08 / OPEN YOUR WORKSPACE</div>
        <h2>Truth leaves<br/><span>a trace.</span><ArrowUpRight/></h2>
        <p style={{maxWidth:540,margin:'0 auto 34px',opacity:0.8,lineHeight:1.8}}>
          Authenticate securely with your Freighter Stellar wallet.
          No email address, no passwords, no trackable user accounts stored in proprietary databases.
        </p>
        <Link href="/login" className="button orange">
          Connect Freighter wallet <ArrowUpRight size={18}/>
        </Link>
        <p style={{marginTop:24,fontSize:'0.82rem',opacity:0.55}}>
          Freighter is a free, open-source Stellar browser extension. <a href="https://freighter.app" target="_blank" rel="noopener noreferrer" style={{color:'inherit',textDecoration:'underline'}}>Get it at freighter.app</a>
        </p>
      </section>

      <footer>
        <Link href="/" className="brand">
          <img src="/afterprint-logo.png" alt=""/>afterprint
        </Link>
        <p>Evidence intelligence. Human judgment.</p>
        <span>© {new Date().getFullYear()} Afterprint. Authoritative build.</span>
        <a href="https://cjay-1.gitbook.io/afterprint-docs/" target="_blank" rel="noopener noreferrer">Documentation <ChevronRight size={12}/></a>
        <a href="#principles">Safety invariants <ChevronRight size={12}/></a>
      </footer>
    </main>
  );
}
