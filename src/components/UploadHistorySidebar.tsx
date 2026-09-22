import React,{useEffect,useState} from 'react';
import {ChevronLeft,ChevronRight,History,FileSpreadsheet,MapPin} from 'lucide-react';
import {loadImportHistory} from '../utils/api';

type HistoryRow={id:number;sourceFile:string;mode:string;receivedCount:number;insertedCount:number;updatedCount:number;entityType:string;importedAt:string};

export function UploadHistorySidebar(){
 const [open,setOpen]=useState(false); const [rows,setRows]=useState<HistoryRow[]>([]);
 useEffect(()=>{if(open)loadImportHistory().then(setRows).catch(()=>setRows([]))},[open]);
 return <><button type="button" onClick={()=>setOpen(v=>!v)} className="fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-slate-900 text-white rounded-r-xl px-2 py-4 shadow-lg flex flex-col items-center gap-1" title={open?'Close upload history':'Open upload history'}><History className="w-4 h-4"/><span className="text-[10px] [writing-mode:vertical-rl]">History</span>{open?<ChevronLeft className="w-3 h-3"/>:<ChevronRight className="w-3 h-3"/>}</button>
 <aside className={`fixed left-0 top-0 bottom-0 z-40 w-80 bg-white border-r shadow-2xl transition-transform duration-200 ${open?'translate-x-0':'-translate-x-full'}`}><div className="h-full flex flex-col pt-20"><div className="px-5 pb-4 border-b"><h2 className="font-bold flex items-center gap-2"><History className="w-5 h-5"/>Upload History</h2><p className="text-xs text-slate-500 mt-1">Uploads are listed by date from PostgreSQL.</p></div><div className="flex-1 overflow-auto p-3 space-y-2">{rows.map(r=><div key={r.id} className="border rounded-xl p-3"><div className="flex items-start gap-2">{r.entityType==='areas'?<MapPin className="w-4 h-4 text-blue-600 mt-0.5"/>:<FileSpreadsheet className="w-4 h-4 text-emerald-600 mt-0.5"/>}<div className="min-w-0"><div className="font-semibold text-sm truncate" title={r.sourceFile}>{r.sourceFile}</div><div className="text-[11px] text-slate-500 mt-1">{new Date(r.importedAt).toLocaleString()}</div><div className="text-[11px] mt-2"><b>{r.receivedCount}</b> received · <b>{r.insertedCount}</b> new · <b>{r.updatedCount}</b> updated</div><div className="text-[10px] uppercase tracking-wide text-slate-400 mt-1">{r.entityType} · {r.mode}</div></div></div></div>)}{!rows.length&&<div className="text-center text-sm text-slate-500 py-12">No database upload history yet.</div>}</div></div></aside></>
}
