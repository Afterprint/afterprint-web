import Workspace from '@/components/workspace';
export default async function Page({params}:{params:Promise<{path?:string[]}>}){const {path=[]}=await params;return <Workspace caseId={path[0]} section={path[1]||'overview'} evidenceId={path[2]}/>}
