'use client';
import Link from 'next/link';
import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {
  ArrowLeft,ArrowUpRight,ArrowRight,LayoutDashboard,Files,Clock,
  Network,TriangleAlert,MessagesSquare,FileCheck2,ShieldCheck,
  Download,Users,Search,Plus,X,Upload,FileText,Video,AudioLines,
  Image as ImageIcon,Check,ChevronRight,Menu,Send,Link2,FolderOpen,
  LockKeyhole,ZoomIn,ZoomOut,RotateCcw
} from 'lucide-react';
import {api} from '@/lib/api';
import type {Case,Evidence,TimelineEvent,Conflict,Claim,Citation,CustodyEvent,Reconstruction,Member,Category} from '@/lib/types';

const nav=[
  ['overview','Overview',LayoutDashboard],
  ['evidence','Evidence inbox',Files],
  ['timeline','Timeline',Clock],
  ['graph','Evidence graph',Network],
  ['conflicts','Conflicts',TriangleAlert],
  ['ask','Ask Case',MessagesSquare],
  ['reconstruction','Reconstruction',FileCheck2],
  ['custody','Chain of custody',ShieldCheck],
  ['reports','Reports & exports',Download],
  ['permissions','Members & access',Users],
] as const;

const labels:Record<Category,string>={
  VERIFIED_FACT:'Verified fact',
  CORROBORATED_CLAIM:'Corroborated claim',
  INFERENCE:'Inference',
  CONFLICT:'Conflict',
  UNKNOWN:'Unknown',
};

function Badge({category}:{category:Category}){
  return(
    <span className={`claim-label ${category==='CONFLICT'?'conflict':category==='INFERENCE'?'inference':category==='UNKNOWN'?'unknown':'verified'}`}>
      {labels[category]}
    </span>
  );
}

function Citations({items,caseId}:{items:Citation[];caseId:string}){
  return(
    <div className="citations">
      {items.map((c,i)=>(
        <Link key={i} className="citation" href={`/cases/${caseId}/evidence/${c.evidenceId}?span=${encodeURIComponent(c.span)}`}>
          <Link2 size={10}/>{c.evidenceId.slice(0,8).toUpperCase()} · {c.span}
        </Link>
      ))}
    </div>
  );
}

function FileIcon({type}:{type:string}){
  const Icon=type==='VIDEO'?Video:type==='AUDIO'?AudioLines:type==='IMAGE'?ImageIcon:FileText;
  return <span className="file-icon"><Icon size={18}/></span>;
}

function Modal({title,close,children}:{title:string;close:()=>void;children:React.ReactNode}){
  return(
    <div className="modal-backdrop" onClick={close}>
      <section className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={e=>e.stopPropagation()}>
        <header>
          <h2>{title}</h2>
          <button className="icon-button" onClick={close} aria-label="Close dialog"><X size={17}/></button>
        </header>
        {children}
      </section>
    </div>
  );
}

function Timeline({events,caseId}:{events:TimelineEvent[];caseId:string}){
  return(
    <div className="timeline-list">
      {events.map(e=>(
        <div className="timeline-entry" key={e.id}>
          <time>{e.time.slice(0,5)}</time>
          <div className="timeline-dot"/>
          <article>
            <Badge category={e.category}/>
            <h3 style={{marginTop:12}}>{e.description}</h3>
            <p>{e.precision} · {e.basis.replaceAll('_',' ')} · UTC</p>
            <Citations items={e.citations} caseId={caseId}/>
          </article>
        </div>
      ))}
      {!events.length&&<div className="empty-state">No extracted timeline events yet. Add and process evidence to build the timeline.</div>}
    </div>
  );
}

function EvidenceViewer({caseId,evidence}:{caseId:string;evidence:Evidence}){
  const q=useQuery({
    queryKey:['evidence-url',caseId,evidence.id],
    queryFn:()=>api<{url:string}>(`/cases/${caseId}/evidence/${evidence.id}/content`),
    staleTime:0,
  });
  if(q.error)return <p role="alert">{q.error.message}</p>;
  if(!q.data)return <p>Loading authorized source…</p>;
  if(evidence.type==='VIDEO')return <video controls src={q.data.url}/>;
  if(evidence.type==='AUDIO')return <audio controls src={q.data.url}/>;
  if(evidence.type==='IMAGE')return <img src={q.data.url} alt={evidence.title}/>;
  return <a className="button outline" href={q.data.url} target="_blank" rel="noopener noreferrer">Open original document <ArrowUpRight size={16}/></a>;
}

export default function Workspace({caseId,section,evidenceId}:{caseId?:string;section:string;evidenceId?:string}){
  const qc=useQueryClient();
  const [menu,setMenu]=useState(false);
  const [modal,setModal]=useState('');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState('ALL');
  const [messages,setMessages]=useState<{role:string;text?:string;claims?:Claim[]}[]>([]);
  const [question,setQuestion]=useState('');
  const [reviewed,setReviewed]=useState<string[]>([]);
  const [draft,setDraft]=useState<Reconstruction|null>(null);
  const [zoom,setZoom]=useState(1);
  const prefix=`/cases/${caseId}`;

  const caseQuery=useQuery({queryKey:['case',caseId],queryFn:()=>api<Case>(prefix),enabled:!!caseId});
  const casesQuery=useQuery({queryKey:['cases'],queryFn:()=>api<Case[]>('/cases'),enabled:!caseId});
  const evQuery=useQuery({queryKey:['evidence',caseId],queryFn:()=>api<Evidence[]>(`${prefix}/evidence`),enabled:!!caseId});
  const timelineQuery=useQuery({queryKey:['timeline',caseId],queryFn:()=>api<TimelineEvent[]>(`${prefix}/timeline`),enabled:!!caseId&&['timeline','overview'].includes(section)});
  const conflictsQuery=useQuery({queryKey:['conflicts',caseId],queryFn:()=>api<Conflict[]>(`${prefix}/conflicts`),enabled:!!caseId&&['conflicts','overview'].includes(section)});
  const membersQuery=useQuery({queryKey:['members',caseId],queryFn:()=>api<Member[]>(`${prefix}/members`),enabled:!!caseId&&section==='permissions'});
  const custodyQuery=useQuery({queryKey:['custody',caseId],queryFn:()=>api<CustodyEvent[]>(`${prefix}/custody`),enabled:!!caseId&&section==='custody'});
  const graphQuery=useQuery({queryKey:['graph',caseId],queryFn:()=>api<{nodes:{id:string;label:string;evidenceId?:string}[];edges:{from:string;to:string}[]}>(`${prefix}/graph`),enabled:!!caseId&&section==='graph'});

  const current=caseQuery.data;
  const evidence=evQuery.data||[];
  const events=timelineQuery.data||[];
  const conflictItems=conflictsQuery.data||[];
  const custody=custodyQuery.data||[];
  const selected=evidence.find(e=>e.id===evidenceId);
  const queryError=[caseQuery,evQuery,timelineQuery,conflictsQuery,membersQuery,custodyQuery,graphQuery,casesQuery].find(q=>q.error)?.error;

  async function action(fn:()=>Promise<void>){
    setBusy(true);setError('');setNotice('');
    try{await fn()}catch(e){setError((e as Error).message)}
    finally{setBusy(false)}
  }

  async function ask(q:string){
    if(!q.trim()||busy)return;
    setQuestion('');
    setMessages(m=>[...m,{role:'user',text:q}]);
    await action(async()=>{
      const conversation=await api<{id:string}>(`${prefix}/conversations`,{method:'POST',body:'{}'});
      const result=await api<{claims:Claim[]}>(`${prefix}/conversations/${conversation.id}/messages`,{method:'POST',body:JSON.stringify({message:q})});
      setMessages(m=>[...m,{role:'assistant',claims:result.claims}]);
    });
  }

  return(
    <div className="app-shell">
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside className={`app-sidebar ${menu?'open':''}`}>
        <Link href="/" className="brand">
          <img src="/afterprint-logo.png" alt=""/>afterprint
        </Link>
        <Link className="back-link" href="/cases"><ArrowLeft size={12}/> All cases</Link>
        {caseId&&(
          <div className="case-selector">
            <small>{current?.ref||'CASE WORKSPACE'}</small>
            {current?.title||'Loading case…'}
          </div>
        )}
        <div className="nav-group-label">{caseId?'CASE WORKSPACE':'ORGANIZATION'}</div>
        <nav>
          {caseId
            ?nav.map(([key,label,Icon])=>(
              <Link onClick={()=>setMenu(false)} key={key} className={section===key?'active':''} href={`${prefix}/${key==='overview'?'':key}`}>
                <Icon size={15}/>{label}
              </Link>
            ))
            :<Link href="/cases" className="active"><FolderOpen size={15}/>Case directory</Link>
          }
        </nav>
        <div className="sidebar-bottom">
          <div className="avatar">AP</div>
          <div>
            Afterprint workspace
            <small>Authorized access only</small>
          </div>
          {menu&&<button className="icon-button" aria-label="Close navigation" onClick={()=>setMenu(false)}><X size={15}/></button>}
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="app-main">
        <header className="app-topbar">
          <div className="breadcrumbs">
            <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={()=>setMenu(true)}><Menu size={16}/></button>
            <Link href="/cases">Workspace</Link>
            <ChevronRight size={12}/>
            <span>{caseId?current?.ref||'Case':'All cases'}</span>
            {caseId&&<><ChevronRight size={12}/><span>{nav.find(n=>n[0]===section)?.[1]}</span></>}
          </div>
          <div className="topbar-right">
            <span className="status-tag">PRIVATE WORKSPACE</span>
            <Link href="/login" className="icon-button" aria-label="Account"><LockKeyhole size={14}/></Link>
          </div>
        </header>

        <div className="app-content">
          {(error||queryError)&&<div className="error-box" role="alert">{error||queryError?.message}</div>}
          {notice&&<div className="notice" role="status">{notice}</div>}

          {/* ── Case list ──────────────────────────────────────────── */}
          {!caseId&&(
            <>
              <div className="page-heading">
                <div><h1>Your cases.</h1><p>Every investigation starts with a clearer view.</p></div>
                <button className="button orange" onClick={()=>setModal('case')}><Plus size={14}/>New case</button>
              </div>
              <div className="filter-bar">
                <div className="search-field">
                  <Search size={14}/>
                  <input aria-label="Search cases" placeholder="Search cases…" value={search} onChange={e=>setSearch(e.target.value)}/>
                </div>
                <span className="status-tag">{casesQuery.data?.length||0} CASES</span>
              </div>
              <div className="case-grid" style={{marginTop:22}}>
                {(casesQuery.data||[]).filter(c=>c.title.toLowerCase().includes(search.toLowerCase())).map(c=>(
                  <Link href={`/cases/${c.id}`} key={c.id} className="case-card">
                    <div className="case-ref"><span>{c.ref}</span><ArrowUpRight size={15}/></div>
                    <h2>{c.title}</h2>
                    <p>{c.classification}</p>
                    <footer>
                      <span>{c.status}</span>
                      <span>{new Date(c.openedAt).toLocaleDateString('en-GB')}</span>
                    </footer>
                  </Link>
                ))}
                {!casesQuery.isLoading&&!casesQuery.data?.length&&(
                  <div className="empty-state"><FolderOpen size={28}/>No cases yet. Create your first case to begin.</div>
                )}
              </div>
            </>
          )}

          {/* ── Case sections ─────────────────────────────────────── */}
          {!!caseId&&(
            <>
              <div className="page-heading">
                <div>
                  <h1>{section==='overview'?current?.title||'Case overview':selected?selected.title:nav.find(n=>n[0]===section)?.[1]||'Page not found'}</h1>
                  <p>{
                    section==='overview'?`${current?.ref||''} · ${current?.classification||''} · Every detail in context.`:
                    section==='evidence'?'Preserve originals. Inspect every source.':
                    section==='timeline'?'Original time claims stay visible. All times shown in UTC.':
                    section==='conflicts'?'A disagreement is a question to investigate, not a conclusion about intent.':
                    section==='ask'?'Source-linked answers. Visible uncertainty.':
                    section==='custody'?'An append-only record of how evidence moves.':
                    section==='reconstruction'?'Review every claim before finalizing a report.':
                    'A complete, traceable case workspace.'
                  }</p>
                </div>
                <div className="toolbar">
                  {['overview','evidence'].includes(section)&&!selected&&(
                    <button className="button orange" onClick={()=>setModal('upload')}><Upload size={14}/>Add evidence</button>
                  )}
                  {section==='reports'&&(
                    <button className="button orange" disabled={busy} onClick={()=>action(async()=>{
                      const r=await api<{id:string}>(`${prefix}/exports`,{method:'POST',body:'{}'});
                      setNotice(`Export ${r.id} queued. Retrieve it once processing completes.`);
                    })}><Download size={14}/>Create export</button>
                  )}
                  {section==='permissions'&&(
                    <button className="button orange" onClick={()=>setModal('member')}><Plus size={14}/>Add member</button>
                  )}
                </div>
              </div>

              {/* Overview */}
              {section==='overview'&&(
                <>
                  <div className="stat-grid">
                    {[
                      [String(evidence.length),'Evidence items','Originals and their derivatives',Files],
                      [String(events.length),'Timeline events','Precision preserved',Clock],
                      [String(conflictItems.filter(c=>c.status==='OPEN').length),'Open conflicts','Awaiting review',TriangleAlert],
                      ['—','Confirmed anchors','See individual integrity records',ShieldCheck],
                    ].map(([value,label,sub,Icon])=>{
                      const I=Icon as typeof Files;
                      return(
                        <div className="stat-card" key={String(label)}>
                          <span>{String(label)}<I size={14}/></span>
                          <strong>{String(value)}</strong>
                          <small>{String(sub)}</small>
                        </div>
                      );
                    })}
                  </div>
                  <div className="content-grid">
                    <section className="panel">
                      <div className="panel-title">
                        <h2>The emerging sequence</h2>
                        <Link href={`${prefix}/timeline`}>Full timeline ↗</Link>
                      </div>
                      <Timeline events={events} caseId={caseId}/>
                    </section>
                    <div>
                      <section className="panel">
                        <div className="panel-title"><h2>Needs a closer look</h2><TriangleAlert size={15}/></div>
                        {conflictItems.length
                          ?conflictItems.map(c=>(
                            <div key={c.id}>
                              <Badge category="CONFLICT"/>
                              <h3>{c.description}</h3>
                              <p>Compare both sources and record the reasoning behind your review.</p>
                              <Link href={`${prefix}/conflicts`} className="button outline">Review conflict <ArrowRight size={13}/></Link>
                            </div>
                          ))
                          :<p>No conflicts have been recorded.</p>
                        }
                      </section>
                      <section className="panel" style={{marginTop:20}}>
                        <h2>Evidence received</h2>
                        {evidence.slice(0,4).map(e=>(
                          <Link href={`${prefix}/evidence/${e.id}`} className="activity-row" key={e.id}>
                            <FileText size={14}/>
                            <div>{e.title}<small>{e.ref} · {new Date(e.importedAt).toLocaleTimeString('en-GB',{timeZone:'UTC'})} UTC</small></div>
                          </Link>
                        ))}
                        {!evidence.length&&<p>No evidence yet. Add evidence to begin the investigation.</p>}
                      </section>
                    </div>
                  </div>
                </>
              )}

              {/* Evidence list */}
              {section==='evidence'&&!evidenceId&&(
                <>
                  <div className="filter-bar">
                    <div className="tabs">
                      {['ALL','VIDEO','AUDIO','DOCUMENT','IMAGE'].map(t=>(
                        <button key={t} onClick={()=>setFilter(t)} className={filter===t?'active':''}>{t==='ALL'?'All evidence':t.charAt(0)+t.slice(1).toLowerCase()}</button>
                      ))}
                    </div>
                    <div className="search-field">
                      <Search size={14}/>
                      <input placeholder="Find evidence…" aria-label="Search evidence" value={search} onChange={e=>setSearch(e.target.value)}/>
                    </div>
                  </div>
                  <div className="table-wrap">
                    <table className="evidence-table">
                      <thead><tr><th>Evidence</th><th>Source</th><th>Type</th><th>Status</th><th>Reference</th></tr></thead>
                      <tbody>
                        {evidence.filter(e=>(filter==='ALL'||e.type===filter)&&`${e.title} ${e.ref}`.toLowerCase().includes(search.toLowerCase())).map(e=>(
                          <tr key={e.id}>
                            <td>
                              <Link href={`${prefix}/evidence/${e.id}`}>
                                <FileIcon type={e.type}/>
                                <div>{e.title}<small>Original · v1</small></div>
                              </Link>
                            </td>
                            <td>{e.source}</td>
                            <td>{e.type}</td>
                            <td><span className="claim-label verified">{e.status}</span></td>
                            <td>{e.ref}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {evidence.filter(e=>(filter==='ALL'||e.type===filter)&&`${e.title} ${e.ref}`.toLowerCase().includes(search.toLowerCase())).length===0&&(
                      <div className="empty-state"><Files size={28}/>No matching evidence.</div>
                    )}
                  </div>
                </>
              )}

              {/* Evidence detail */}
              {section==='evidence'&&evidenceId&&(
                selected?(
                  <>
                    <Link href={`${prefix}/evidence`} className="back-link"><ArrowLeft size={12}/>Evidence inbox</Link>
                    <div className="content-grid">
                      <div className="panel">
                        <div className="detail-viewer"><EvidenceViewer caseId={caseId} evidence={selected}/></div>
                        <div className="notice" style={{marginTop:20}}>Viewing a signed, read-only source. Originals cannot be edited.</div>
                      </div>
                      <aside className="panel">
                        <h2>Source & integrity</h2>
                        <dl className="metadata-grid" style={{marginTop:25}}>
                          <dt>Reference</dt><dd>{selected.ref}</dd>
                          <dt>Version</dt><dd>{selected.versionId}</dd>
                          <dt>Source</dt><dd>{selected.source}</dd>
                          <dt>Media type</dt><dd>{selected.mimeType}</dd>
                          <dt>Size</dt><dd>{selected.size} bytes</dd>
                        </dl>
                        <h3>SHA-256</h3>
                        <div className="hash">{selected.sha256||'—'}</div>
                        <button className="button outline" style={{marginTop:20}} disabled={busy} onClick={()=>action(async()=>{
                          const r=await api<{valid:boolean}>(`${prefix}/evidence/${selected.id}/integrity-check`,{method:'POST',body:'{}'});
                          setNotice(r.valid?'Stored bytes match the recorded SHA-256.':'Integrity failure: stored bytes do not match.');
                        })}>
                          <ShieldCheck size={14}/>Verify integrity
                        </button>
                        <Link className="button outline" style={{marginTop:10}} href={`${prefix}/custody`}>View custody <ArrowRight size={14}/></Link>
                      </aside>
                    </div>
                  </>
                ):(
                  <div className="empty-state">Evidence not found or inaccessible.</div>
                )
              )}

              {/* Timeline */}
              {section==='timeline'&&(
                <>
                  <div className="notice">Time precision and source basis describe the record. Device timestamps are not automatically verified real-world times.</div>
                  <Timeline events={events} caseId={caseId}/>
                </>
              )}

              {/* Graph */}
              {section==='graph'&&(
                <div className="graph-view">
                  <span className="graph-note">SOURCE CONNECTIONS / SELECT A SOURCE TO INSPECT</span>
                  <svg viewBox={`${450-450/zoom} ${270-270/zoom} ${900/zoom} ${540/zoom}`} role="img" aria-label="Evidence connection graph">
                    {graphQuery.data?.nodes.map((n,i,a)=>{
                      const x=450+Math.cos(i*2*Math.PI/a.length)*280;
                      const y=270+Math.sin(i*2*Math.PI/a.length)*180;
                      return(
                        <a href={n.evidenceId?`${prefix}/evidence/${n.evidenceId}`:'#'} key={n.id}>
                          <g className="graph-node">
                            <rect x={x-95} y={y-25} width="190" height="50"/>
                            <text x={x} y={y} textAnchor="middle">{n.label.slice(0,27)}</text>
                          </g>
                        </a>
                      );
                    })}
                  </svg>
                  {!graphQuery.data?.nodes.length&&(
                    <div className="notice" style={{position:'absolute',top:70,left:20}}>No extracted graph nodes yet. Process evidence to build the graph.</div>
                  )}
                  <div className="graph-controls">
                    <button aria-label="Zoom in" className="icon-button" onClick={()=>setZoom(z=>Math.min(2,z+.2))}><ZoomIn size={16}/></button>
                    <button aria-label="Zoom out" className="icon-button" onClick={()=>setZoom(z=>Math.max(.6,z-.2))}><ZoomOut size={16}/></button>
                    <button aria-label="Reset zoom" className="icon-button" onClick={()=>setZoom(1)}><RotateCcw size={16}/></button>
                  </div>
                </div>
              )}

              {/* Conflicts */}
              {section==='conflicts'&&(
                <>
                  {conflictItems.map(c=>(
                    <article className="conflict-card" key={c.id}>
                      <div className="panel-title">
                        <Badge category="CONFLICT"/>
                        <span className="status-tag">{c.status}</span>
                      </div>
                      <h3>{c.description}</h3>
                      <p>{c.type.replaceAll('_',' ')} · Preserve both sources while investigating the difference.</p>
                      <div className="conflict-sides">
                        {[c.left,c.right].map((claim,i)=>(
                          <div key={i}>
                            <small>SOURCE {i===0?'A':'B'}</small>
                            <p>{claim.text}</p>
                            <Citations items={claim.citations} caseId={caseId}/>
                          </div>
                        ))}
                      </div>
                      <div className="toolbar">
                        <select aria-label="Conflict status" value={c.status} onChange={e=>action(async()=>{
                          const status=e.target.value;
                          await api(`${prefix}/conflicts/${c.id}`,{method:'PATCH',body:JSON.stringify({status})});
                          await qc.invalidateQueries({queryKey:['conflicts',caseId]});
                        })}>
                          {['OPEN','REVIEWED','RESOLVED','EXPECTED'].map(s=><option key={s}>{s}</option>)}
                        </select>
                        <span style={{fontSize:10,color:'#8a987d'}}>Original conflict remains in the audit history.</span>
                      </div>
                    </article>
                  ))}
                  {!conflictItems.length&&<div className="empty-state"><Check size={24}/>No conflicts recorded yet.</div>}
                </>
              )}

              {/* Ask */}
              {section==='ask'&&(
                <div className="chat-panel">
                  {!messages.length&&(
                    <div className="chat-welcome">
                      <MessagesSquare size={35} strokeWidth={1}/>
                      <h2>Ask the case. Follow the sources.</h2>
                      <p>Answers preserve facts, claims, inferences, conflicts, and unknowns. Every claim cites an exact evidence span.</p>
                      <div className="suggestions">
                        {['Where do the arrival times disagree?','Which sources mention the delivery?','What happened before the incident?'].map(q=>(
                          <button key={q} onClick={()=>ask(q)}>{q}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((m,i)=>(
                    <div className={`chat-message ${m.role}`} key={i}>
                      {m.text}
                      {m.claims?.map(c=>(
                        <div key={c.id}>
                          <Badge category={c.category}/>
                          <div>{c.text}</div>
                          <Citations items={c.citations} caseId={caseId}/>
                        </div>
                      ))}
                    </div>
                  ))}
                  <form className="chat-form" onSubmit={e=>{e.preventDefault();ask(question)}}>
                    <input value={question} onChange={e=>setQuestion(e.target.value)} aria-label="Ask a question" placeholder="Ask a question about this case…" maxLength={4000}/>
                    <button aria-label="Send question" disabled={busy||!question.trim()}><Send size={16}/></button>
                  </form>
                  {busy&&<p className="notice">Retrieving authorized evidence…</p>}
                </div>
              )}

              {/* Reconstruction */}
              {section==='reconstruction'&&(
                <>
                  {!draft?(
                    <div className="panel">
                      <FileCheck2 size={32} strokeWidth={1}/>
                      <h2 style={{marginTop:22}}>Build a source-grounded draft.</h2>
                      <p>Facts, corroboration, conflicts, unknown periods, and hypotheses stay separate. Review is required before finalization.</p>
                      <button className="button orange" disabled={busy} onClick={()=>action(async()=>{
                        const r=await api<Reconstruction>(`${prefix}/reconstructions`,{method:'POST',body:'{}'});
                        setDraft(r);
                      })}>
                        Create draft <ArrowRight size={14}/>
                      </button>
                    </div>
                  ):(
                    <div className="panel">
                      <div className="panel-title">
                        <h2>Reconstruction draft</h2>
                        <span className="status-tag">{draft.status}</span>
                      </div>
                      <div className="notice">Check each claim after reviewing its sources. Unknowns must stay unknown.</div>
                      {draft.claims.map(c=>(
                        <div className="review-claim" key={c.id}>
                          <label>
                            <input type="checkbox" disabled={draft.status==='FINALIZED'} checked={reviewed.includes(c.id)} onChange={e=>setReviewed(r=>e.target.checked?[...r,c.id]:r.filter(id=>id!==c.id))}/>
                            <div>
                              <Badge category={c.category}/>
                              <p>{c.text}</p>
                              <Citations items={c.citations} caseId={caseId}/>
                            </div>
                          </label>
                        </div>
                      ))}
                      <div className="form-actions">
                        <button className="button orange" disabled={busy||reviewed.length!==draft.claims.length||draft.status==='FINALIZED'} onClick={()=>action(async()=>{
                          await api(`${prefix}/reconstructions/${draft.id}/review`,{method:'POST',body:JSON.stringify({reviewedIds:reviewed})});
                          const result=await api<Reconstruction>(`${prefix}/reconstructions/${draft.id}/finalize`,{method:'POST',body:'{}'});
                          setDraft(result);
                        })}>
                          <Check size={14}/>{draft.status==='FINALIZED'?'Review finalized':'Finalize reviewed report'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Custody */}
              {section==='custody'&&(
                <>
                  <div className="notice">Transfers are authorized, idempotent, and appended to a hash chain.</div>
                  <div className="panel" style={{marginTop:20}}>
                    {custody.map(c=>(
                      <div className="activity-row" key={c.id}>
                        <ShieldCheck size={18}/>
                        <div>
                          <b>{c.type.replaceAll('_',' ')}</b> · {c.evidenceId}
                          <small>{c.actor} · {new Date(c.occurredAt).toLocaleString('en-GB',{timeZone:'UTC'})} UTC</small>
                          <p>{c.reason}</p>
                          {c.eventHash&&<div className="hash">{c.eventHash}</div>}
                        </div>
                      </div>
                    ))}
                    {!custody.length&&<p>No custody events available.</p>}
                    <button className="button outline" style={{marginTop:20}} onClick={()=>setModal('transfer')}>
                      Transfer custody <ArrowRight size={14}/>
                    </button>
                  </div>
                </>
              )}

              {/* Reports */}
              {section==='reports'&&(
                <div className="content-grid">
                  <section className="panel">
                    <Download size={30} strokeWidth={1}/>
                    <h2 style={{marginTop:22}}>A record you can verify.</h2>
                    <p>Export manifests include evidence versions, custody history, citations, and any finalized reconstruction.</p>
                    <div className="activity-row"><Check size={14}/><div>SHA-256 manifest verification<small>Independent verification instructions included</small></div></div>
                    <div className="activity-row"><Check size={14}/><div>Original and derived sources distinguished<small>Access controls apply to every exported source</small></div></div>
                    <div className="notice">Export creation is asynchronous. Evidence may be exported only with the required permission.</div>
                  </section>
                  <section className="panel">
                    <h2>Retrieve an export</h2>
                    <p>Use the export reference returned when you created a bundle.</p>
                    <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);action(async()=>{
                      const r=await api<{status:string;url?:string}>(`${prefix}/exports/${encodeURIComponent(String(f.get('id')))}`);
                      if(r.url)window.location.assign(r.url);
                      else setNotice(`Export status: ${r.status}`);
                    })}}>
                      <label className="form-field">Export reference<input name="id" required placeholder="Export ID"/></label>
                      <button className="button outline" disabled={busy}>Retrieve bundle <Download size={14}/></button>
                    </form>
                  </section>
                </div>
              )}

              {/* Permissions */}
              {section==='permissions'&&(
                <section className="panel">
                  <h2>Case members</h2>
                  <p>Permissions apply to this case. Audit and custody history cannot be rewritten.</p>
                  {(membersQuery.data||[]).map(m=>(
                    <div className="member-row" key={m.id}>
                      <div className="avatar">{m.name.slice(0,2).toUpperCase()}</div>
                      <span>{m.name}</span>
                      <select aria-label={`Role for ${m.name}`} defaultValue={m.role} onChange={e=>action(async()=>{
                        await api(`${prefix}/members/${m.id}`,{method:'PATCH',body:JSON.stringify({role:e.target.value})});
                        await qc.invalidateQueries({queryKey:['members',caseId]});
                      })}>
                        {['CASE_ADMIN','INVESTIGATOR','FORENSIC_ANALYST','LEGAL_REVIEWER','EXTERNAL_REVIEWER','READ_ONLY'].map(r=><option key={r}>{r}</option>)}
                      </select>
                    </div>
                  ))}
                </section>
              )}

              {!nav.some(n=>n[0]===section)&&(
                <div className="empty-state">This case page does not exist. <Link href={prefix}>Return to overview.</Link></div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {modal&&(
        <Modal
          title={modal==='case'?'Create a case':modal==='upload'?'Add evidence':modal==='member'?'Add a case member':'Transfer custody'}
          close={()=>setModal('')}
        >
          <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);action(async()=>{
            if(modal==='case'){
              const c=await api<Case>('/cases',{method:'POST',body:JSON.stringify(Object.fromEntries(f))});
              window.location.href=`/cases/${c.id}`;
            }else if(modal==='upload'){
              const file=f.get('file') as File;
              if(!file?.size)throw new Error('Choose a non-empty file.');
              const r=await api<{uploadUrl:string;sessionId:string;headers?:Record<string,string>}>(`${prefix}/evidence/upload-url`,{method:'POST',body:JSON.stringify({title:f.get('title')||file.name,source:f.get('source'),mimeType:file.type||'application/octet-stream',size:file.size})});
              const uploaded=await fetch(r.uploadUrl,{method:'PUT',body:file,headers:r.headers});
              if(!uploaded.ok)throw new Error('Object upload failed. Finalization was not performed.');
              await api(`${prefix}/evidence/finalize`,{method:'POST',body:JSON.stringify({sessionId:r.sessionId})});
              await qc.invalidateQueries({queryKey:['evidence',caseId]});
              setNotice('Original uploaded. Integrity processing has started.');
            }else if(modal==='member'){
              await api(`${prefix}/members`,{method:'POST',body:JSON.stringify(Object.fromEntries(f))});
              await qc.invalidateQueries({queryKey:['members',caseId]});
            }else{
              await api(`${prefix}/evidence/${f.get('evidenceId')}/custody/transfer`,{method:'POST',headers:{'Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({toUserId:f.get('toUserId'),reason:f.get('reason')})});
              await qc.invalidateQueries({queryKey:['custody',caseId]});
            }
            setModal('');
          })}}>
            {modal==='case'&&(
              <>
                <label className="form-field">Case title<input name="title" required maxLength={160}/></label>
                <label className="form-field">Case reference<input name="ref" required maxLength={60}/></label>
                <label className="form-field">Classification
                  <select name="classification"><option>INTERNAL</option><option>CONFIDENTIAL</option><option>RESTRICTED</option></select>
                </label>
              </>
            )}
            {modal==='upload'&&(
              <>
                <div className="drop-zone">
                  <Upload size={25}/>Choose the original evidence file
                  <input type="file" name="file" required/>
                </div>
                <label className="form-field">Evidence title<input name="title" maxLength={200}/></label>
                <label className="form-field">Source description<textarea name="source" required maxLength={2000}/></label>
                <p className="notice">Original bytes are hashed by the server. Transformations create separate derived artifacts.</p>
              </>
            )}
            {modal==='member'&&(
              <>
                <label className="form-field">Stellar public key (G…)<input name="userId" required placeholder="GABC…" maxLength={60}/></label>
                <label className="form-field">Role
                  <select name="role">
                    <option>READ_ONLY</option><option>INVESTIGATOR</option><option>FORENSIC_ANALYST</option>
                    <option>LEGAL_REVIEWER</option><option>EXTERNAL_REVIEWER</option><option>CASE_ADMIN</option>
                  </select>
                </label>
              </>
            )}
            {modal==='transfer'&&(
              <>
                <label className="form-field">Evidence
                  <select name="evidenceId">{evidence.map(e=><option key={e.id} value={e.id}>{e.ref} · {e.title}</option>)}</select>
                </label>
                <label className="form-field">Recipient user ID<input name="toUserId" required placeholder="User UUID"/></label>
                <label className="form-field">Reason<textarea name="reason" required minLength={5}/></label>
              </>
            )}
            {error&&<div className="error-box" role="alert">{error}</div>}
            <div className="form-actions">
              <button type="button" className="button outline" onClick={()=>setModal('')}>Cancel</button>
              <button className="button orange" disabled={busy}>{busy?'Working…':modal==='upload'?'Upload original':'Save'}<ArrowRight size={14}/></button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
