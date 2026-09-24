import React,{useEffect} from 'react';
import {Truck} from 'lucide-react';

export function DispatchPlanner(){
 useEffect(()=>{localStorage.removeItem('abc_dispatch_plans')},[]);
 return <div className="bg-white rounded-2xl border p-10 text-center"><div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center"><Truck className="w-7 h-7 text-slate-500"/></div><h2 className="font-bold text-lg mt-4">Dispatch</h2><p className="text-sm text-slate-500 mt-2">Dispatch data has been cleared. New dispatch planning can begin after areas and orders are prepared.</p></div>
}
