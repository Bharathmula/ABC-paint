import React, { useMemo, useState } from 'react';
import { CheckCircle2, Clock, Layers, Package, Pencil, RotateCcw, Sparkles } from 'lucide-react';
import { Order } from '../types';
import { calculateOrderMetrics, isOrderToday, isOrderUnfinished, isOverdueAfterThreeDays } from '../utils/orderStatus';

interface Props {
  orders: Order[];
  onSelectCompany: (companyName: string) => void;
  onClearFilters?: () => void;
  onCompleteOrder?: (order: Order, skNumber: string) => void;
  onRecordDispatch?: (order: Order, skNumber: string) => void;
  onUndoComplete?: (order: Order) => void;
  onEditOrder?: (order: Order) => void;
}
type View = 'all'|'today'|'rtg'|'overdue'|'unfinished'|'finished';

const appearance = (o:Order) => !isOrderUnfinished(o)
  ? {label:'FINISHED',head:'bg-emerald-600',body:'bg-emerald-50',border:'border-emerald-400'}
  : o.rtg
  ? {label:'RTG',head:'bg-cyan-700',body:'bg-cyan-50',border:'border-cyan-500'}
  : {label:'UNFINISHED',head:'bg-amber-500',body:'bg-amber-50',border:'border-amber-400'};

export const OrdersTable:React.FC<Props> = ({orders,onSelectCompany,onClearFilters,onCompleteOrder,onRecordDispatch,onUndoComplete,onEditOrder}) => {
  const [view,setView]=useState<View>('all');
  const [open,setOpen]=useState<string|null>(null);
  const [sk,setSk]=useState<Record<string,string>>({});
  const metrics=useMemo(()=>calculateOrderMetrics(orders),[orders]);
  const shown=useMemo(()=>orders.filter(o=>{
    if(view==='today')return isOrderToday(o.date);
    if(view==='rtg')return !!o.rtg&&isOrderUnfinished(o);
    if(view==='overdue')return isOverdueAfterThreeDays(o);
    if(view==='unfinished')return isOrderUnfinished(o)&&!o.rtg;
    if(view==='finished')return !isOrderUnfinished(o);
    return true;
  }).sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(a.voucherNumber).localeCompare(String(b.voucherNumber))),[orders,view]);
  const counts={
    rtg:orders.filter(o=>o.rtg&&isOrderUnfinished(o)).length,
    overdue:orders.filter(isOverdueAfterThreeDays).length,
    unfinished:orders.filter(o=>isOrderUnfinished(o)&&!o.rtg).length
  };
  const tabs:Array<[View,string,number,React.ReactNode,string]>=[
    ['all','All Orders',orders.length,<Layers className="w-3.5 h-3.5"/>,'bg-slate-900'],
    ['today',"Today's Orders",metrics.todayCount,<Sparkles className="w-3.5 h-3.5"/>,'bg-indigo-600'],
    ['rtg','RTG',counts.rtg,<Package className="w-3.5 h-3.5"/>,'bg-cyan-700'],
    ['overdue','Overdue',counts.overdue,<Clock className="w-3.5 h-3.5"/>,'bg-rose-600'],
    ['unfinished','Unfinished',counts.unfinished,<Clock className="w-3.5 h-3.5"/>,'bg-amber-500'],
    ['finished','Finished',metrics.finishedCount,<CheckCircle2 className="w-3.5 h-3.5"/>,'bg-emerald-600'],
  ];

  return <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <header className="p-4 border-b border-slate-200 bg-slate-50 space-y-3">
      <div className="flex flex-wrap justify-between gap-2 items-center">
        <div className="flex gap-2 items-center"><h2 className="font-bold text-lg">Orders &amp; Packing</h2><b className="text-xs bg-slate-200 rounded-full px-2.5 py-1">{shown.length}</b></div>
        <span className="text-xs text-slate-500">Click an order tile to open its complete details.</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">{tabs.map(([key,label,count,icon,color])=><button key={key} onClick={()=>{setView(key);setOpen(null)}} className={`shrink-0 inline-flex gap-2 items-center rounded-lg border border-transparent px-3 py-2 text-xs font-bold text-white transition ${color} ${view===key?'opacity-100 shadow-md ring-2 ring-offset-1 ring-slate-400':'opacity-70 hover:opacity-90'}`}>{icon}{label}<span className="rounded bg-black/20 px-1.5">{count}</span></button>)}</div>
    </header>

    <div className="p-3 sm:p-4 bg-slate-100 min-h-[300px]">
      {!shown.length?<div className="py-16 text-center text-sm text-slate-500">No orders in this section.{onClearFilters&&<button onClick={onClearFilters} className="block mx-auto mt-2 text-blue-600 font-bold">Reset filters</button>}</div>:
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-1.5 items-start">
        {shown.map(o=>{
          const a=appearance(o), expanded=open===o.id, unfinished=isOrderUnfinished(o);
          const entered=(sk[o.id]??o.skNumber??'').trim();
          const displayNumber=o.skNumber||o.voucherNumber||'NO NUMBER';
          return <article key={o.id} className={`relative border ${a.border} ${a.body} shadow-sm overflow-hidden ${expanded?'col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-6 xl:col-span-8 2xl:col-span-10':''}`}>
            <button onClick={()=>setOpen(expanded?null:o.id)} className="w-full text-left">
              <div className={`${a.head} text-white px-2 py-1 flex justify-between items-center gap-1`}>
                <b className="font-mono text-[11px] truncate">{displayNumber}</b>
                <span className="text-[8px] font-extrabold">{a.label}</span>
              </div>
              <div className="px-2 py-1.5">
                <div className="text-[10px] font-bold text-slate-800 truncate" title={o.companyName}>{o.companyName}</div>
                <div className="mt-1 grid grid-cols-2 gap-1 font-mono text-[9px] text-slate-700">
                  <span>QTY <b>{o.orderQuantity}</b></span><span className="text-right">₹<b>{o.value.toLocaleString()}</b></span>
                  <span>OB <b>{o.voucherNumber||'—'}</b></span><span className="text-right">SK <b>{o.skNumber||'—'}</b></span>
                </div>
              </div>
            </button>

            {expanded&&<div className="bg-white border-t border-slate-300 p-3">
              <div className="flex flex-wrap justify-between gap-2 mb-3">
                <div><h3 className="font-bold text-base text-slate-900">{o.companyName}</h3><p className="text-xs text-slate-500">{o.date} · {o.area||'No area'} · {o.salesPerson||'No salesperson'}</p></div>
                <div className="flex gap-2 text-xs font-mono"><span className="rounded bg-slate-100 px-2 py-1">OB: <b>{o.voucherNumber||'Not provided'}</b></span><span className="rounded bg-blue-50 px-2 py-1">SK: <b>{o.skNumber||'Not added'}</b></span></div>
              </div>
              <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="bg-slate-100 text-slate-600"><th className="text-left p-2">ORDER LIST / PRODUCT</th><th className="text-right p-2">QUANTITY</th><th className="text-right p-2">ISSUED</th><th className="text-right p-2">PENDING</th><th className="text-right p-2">RATE</th><th className="text-right p-2">VALUE</th></tr></thead>
                <tbody>{o.items.length?o.items.map(i=><tr key={i.id} className="border-b border-slate-100"><td className="p-2 font-semibold">{i.name}</td><td className="p-2 text-right font-mono">{i.quantity}</td><td className="p-2 text-right font-mono text-emerald-700">{i.issue}</td><td className="p-2 text-right font-mono text-amber-700">{i.pending}</td><td className="p-2 text-right font-mono">₹{i.rate.toLocaleString()}</td><td className="p-2 text-right font-mono font-bold">₹{i.value.toLocaleString()}</td></tr>):<tr><td colSpan={6} className="p-4 text-center text-slate-500">No item details available</td></tr>}</tbody>
                <tfoot><tr className="font-bold bg-slate-50"><td className="p-2">TOTAL</td><td className="p-2 text-right">{o.orderQuantity}</td><td className="p-2 text-right">{o.issue}</td><td className="p-2 text-right">{o.pending}</td><td></td><td className="p-2 text-right">₹{o.value.toLocaleString()}</td></tr></tfoot>
              </table></div>
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <button onClick={()=>onEditOrder?.(o)} className="inline-flex items-center gap-1 border rounded px-2.5 py-1.5 text-xs font-bold"><Pencil className="w-3 h-3"/>Edit</button>
                <button onClick={()=>onSelectCompany(o.companyName)} className="border rounded px-2.5 py-1.5 text-xs font-bold text-blue-700">Company history</button>
                {unfinished&&!o.rtg&&<><input value={sk[o.id]??o.skNumber??''} onChange={e=>setSk(v=>({...v,[o.id]:e.target.value}))} placeholder="SK Number *" className="border rounded px-2 py-1.5 text-xs"/><button disabled={!entered} onClick={()=>onRecordDispatch?.(o,entered)} className="bg-cyan-700 text-white rounded px-3 py-1.5 text-xs font-bold disabled:opacity-40">Move to RTG</button></>}
                {unfinished&&o.rtg&&<button onClick={()=>onCompleteOrder?.(o,entered)} className="bg-emerald-600 text-white rounded px-3 py-1.5 text-xs font-bold">Complete</button>}
                {o.completionUndo&&<button onClick={()=>onUndoComplete?.(o)} className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-300 rounded px-3 py-1.5 text-xs font-bold"><RotateCcw className="w-3 h-3"/>Undo</button>}
              </div>
            </div>}
          </article>
        })}
      </div>}
    </div>
    <footer className="px-4 py-2.5 border-t bg-slate-50 flex flex-wrap gap-4 text-xs font-bold"><span>{shown.length} orders</span><span>Qty {shown.reduce((s,o)=>s+o.orderQuantity,0).toLocaleString()}</span><span>Pending {shown.reduce((s,o)=>s+o.pending,0).toLocaleString()}</span><span>₹{shown.reduce((s,o)=>s+o.value,0).toLocaleString()}</span></footer>
  </section>;
};
