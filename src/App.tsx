import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Order, FilterCategory, ActiveFilters, StockRecord } from './types';
import { exportOrdersToExcel, deduplicateAndMergeOrders, downloadOrdersImportTemplate } from './utils/excelParser';
import {
  calculateStockOverviewMetrics,
  calculateUrgentDeliveries,
  syncStockWithOrders,
} from './utils/stockData';
import { DashboardNavbar } from './components/DashboardNavbar';
import { CategoryFilterBar } from './components/CategoryFilterBar';
import { OrdersTable } from './components/OrdersTable';
import { StockRecordsTable } from './components/StockRecordsTable';
import { ReorderDecisionsWorkspace } from './components/ReorderDecisionsWorkspace';
import { DeadlineDashboard } from './components/DeadlineDashboard';
import { CompanyDetailModal } from './components/CompanyDetailModal';
import { ExcelLoaderModal } from './components/ExcelLoaderModal';
import { ClearDataConfirmModal, ClearTarget, RestoreEntry } from './components/ClearDataConfirmModal';
import { AreasDashboard } from './components/AreasDashboard';
import { DispatchPlanner } from './components/DispatchPlanner';
import { DailyReport } from './components/DailyReport';
import { UploadHistorySidebar } from './components/UploadHistorySidebar';
import { OrderEditModal } from './components/OrderEditModal';
import { applyOrderLifecycle } from './utils/orderStatus';
import { syncOrderAreas, resolveAreaCode, loadAreas } from './utils/areaStore';
import { loadDbOrders, importDbOrders, clearDbOrders, loadDbStock, saveDbStock } from './utils/api';
import {
  UploadCloud,
  CheckCircle2,
  Package,
  Flame,
  Clock,
  ClipboardList,
  Database,
  Download,
  RotateCcw,
  Trash2
} from 'lucide-react';

const STORAGE_KEY_ORDERS = 'orders_dashboard_dataset_v1';
const STORAGE_KEY_SOURCE = 'orders_dashboard_source_name_v1';
const STORAGE_KEY_STOCK = 'orders_dashboard_stock_records_v1';
const STORAGE_KEY_CLEARED = 'orders_dashboard_cleared_v1';
const STORAGE_KEY_TRASH = 'orders_dashboard_restore_bin_v2';
const STORAGE_KEY_SHARED_MIGRATION = 'orders_dashboard_shared_migration_v1';

// A previous generic XLS parser created placeholder rows instead of reading MARG reports.
// Remove only that unmistakable artificial dataset; never remove real uploaded orders.
function isLegacySyntheticDataset(value:unknown):boolean{
  return Array.isArray(value)&&value.length>0&&value.every((o:any)=>
    /^Company \d+$/.test(String(o?.companyName||''))&&
    /^VCH-\d+$/.test(String(o?.voucherNumber||''))&&
    Number(o?.orderQuantity||0)===0&&Number(o?.value||0)===0&&
    Array.isArray(o?.items)&&o.items.length===1&&o.items[0]?.name==='Standard Order Batch'
  );
}

export type DashboardViewTab = 'stock' | 'reorder' | 'deadline' | 'orders' | 'areas' | 'dispatch' | 'report';

export default function App() {
  const sharedStockReady = useRef(false);
  // Active Tab View - defaults to Stock Records
  const [activeTab, setActiveTab] = useState<DashboardViewTab>('orders');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Orders are cached locally, but PostgreSQL is the primary persistent store when configured
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const isCleared = localStorage.getItem(STORAGE_KEY_CLEARED) === 'true';
      if (isCleared) return [];
      const saved = localStorage.getItem(STORAGE_KEY_ORDERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if(isLegacySyntheticDataset(parsed)){
          localStorage.removeItem(STORAGE_KEY_ORDERS);
          localStorage.removeItem(STORAGE_KEY_SOURCE);
          return [];
        }
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return [];
  });
  const initialBrowserOrders = useRef<Order[]>(orders);
  const sharedMigrationPending = useRef(localStorage.getItem(STORAGE_KEY_SHARED_MIGRATION) !== 'true');

  // Stock records remain locally cached until a stock-master database import is added
  const [stockRecords, setStockRecords] = useState<StockRecord[]>(() => {
    try {
      const isCleared = localStorage.getItem(STORAGE_KEY_CLEARED) === 'true';
      if (isCleared) return [];
      const saved = localStorage.getItem(STORAGE_KEY_STOCK);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return [];
  });

  const [sourceName, setSourceName] = useState<string>(() => {
    try {
      const isCleared = localStorage.getItem(STORAGE_KEY_CLEARED) === 'true';
      if (isCleared) return 'No Data Loaded (Storage Cleared)';
      return localStorage.getItem(STORAGE_KEY_SOURCE) || 'No Data Loaded (Storage Cleared)';
    } catch {
      return 'No Data Loaded (Storage Cleared)';
    }
  });

  // Active filters for Orders view
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    areas: [],
    areaClasses: [],
    parties: [],
    deadlineRanges: [],
    salesPersons: [],
    items: [],
    customAreas: [],
    customParties: [],
    customSalesPersons: [],
    customItems: [],
    customDeadlines: [],
    searchQuery: '',
  });

  // Notification / Toast
  const [toastMessage, setToastMessage] = useState<string | null>(
    null
  );

  // Modals
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [selectedCompanyModal, setSelectedCompanyModal] = useState<string | null>(null);

  // PostgreSQL is the shared company dataset. Refresh it regularly so uploads and edits
  // made on one computer appear on the other open dashboards.
  useEffect(() => {
    let active=true;
    const refreshSharedOrders=()=>loadDbOrders().then(async(dbOrders) => {
      if(!active)return;
      if (isLegacySyntheticDataset(dbOrders)) {
        clearDbOrders().catch(()=>{});
        setOrders([]);setSourceName('No Data Loaded');return;
      }
      if (Array.isArray(dbOrders)) {
        let sharedOrders = dbOrders;
        const browserOrders = initialBrowserOrders.current;
        if (sharedMigrationPending.current && browserOrders.length > 0 && !isLegacySyntheticDataset(browserOrders)) {
          sharedMigrationPending.current = false;
          try {
            const migrated = await importDbOrders(browserOrders, 'Existing browser data migration', 'merge');
            sharedOrders = migrated.orders;
            localStorage.setItem(STORAGE_KEY_SHARED_MIGRATION, 'true');
          } catch {
            sharedMigrationPending.current = true;
          }
        }
        const lifecycleOrders = sharedOrders.map((o) => applyOrderLifecycle({ ...o, area: resolveAreaCode(o.companyName, o.area) }));
        setOrders(lifecycleOrders);
        setStockRecords((prev) => syncStockWithOrders(prev, lifecycleOrders));
        setSourceName('PostgreSQL Database');
      }
    }).catch(() => {
      // Database not configured/reachable: preserve local cache.
    });
    const refreshSharedStock=()=>loadDbStock().then((records)=>{if(!active)return;if(Array.isArray(records)){sharedStockReady.current=true;setStockRecords(records)}}).catch(()=>{});
    refreshSharedOrders();refreshSharedStock();
    const timer=window.setInterval(refreshSharedOrders,10000);
    const stockTimer=window.setInterval(refreshSharedStock,10000);
    return()=>{active=false;window.clearInterval(timer);window.clearInterval(stockTimer)};
  }, []);

  useEffect(()=>{
    if(!sharedStockReady.current)return;
    const timer=window.setTimeout(()=>{saveDbStock(stockRecords).catch(()=>{})},500);
    return()=>window.clearTimeout(timer);
  },[stockRecords]);

  // Persist orders and stock to local storage
  useEffect(() => {
    try {
      if (orders.length === 0 && stockRecords.length === 0) {
        localStorage.removeItem(STORAGE_KEY_ORDERS);
        localStorage.removeItem(STORAGE_KEY_STOCK);
        localStorage.removeItem(STORAGE_KEY_SOURCE);
        localStorage.setItem(STORAGE_KEY_CLEARED, 'true');
      } else {
        localStorage.removeItem(STORAGE_KEY_CLEARED);
        localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
        localStorage.setItem(STORAGE_KEY_SOURCE, sourceName);
        localStorage.setItem(STORAGE_KEY_STOCK, JSON.stringify(stockRecords));
      }
    } catch {
      // ignore
    }
  }, [orders, sourceName, stockRecords]);

  // Toast auto-dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Load new orders from Excel with merge or replace and deduplication
  const handleOrdersLoaded = async (
    newOrders: Order[],
    source: string,
    mode: 'merge' | 'replace' = 'merge',
    dedupInfo?: { internalRemoved: number; existingDuplicates: number }
  ) => {
    // Keep the originating Excel filename on every imported order so a single file can be cleared/restored later.
    newOrders = newOrders.map((o) => ({ ...o, sourceFile: source, area: resolveAreaCode(o.companyName, o.area) }));
    let finalOrders: Order[] = [];
    let updatedSourceName = source;

    if (mode === 'replace') {
      finalOrders = newOrders;
      updatedSourceName = source;
    } else {
      const mergeCalc = deduplicateAndMergeOrders(newOrders, orders, 'merge');
      finalOrders = mergeCalc.mergedOrders;

      if (sourceName.includes(source)) {
        updatedSourceName = sourceName;
      } else if (sourceName.includes('Dataset') || sourceName.includes('ABC Paints')) {
        updatedSourceName = `${source} (Active Dataset)`;
      } else {
        updatedSourceName = `${sourceName} + ${source}`;
      }
    }

    try {
      // Store each worksheet as its own history entry while keeping one shared dataset.
      // The first worksheet honors Replace; following worksheets merge into that result.
      const groups = new Map<string, Order[]>();
      newOrders.forEach(order => {
        const sheet = (order.sourceSheet || 'Sheet 1').trim();
        groups.set(sheet, [...(groups.get(sheet) || []), order]);
      });
      let dbResult:any = null;
      let groupIndex = 0;
      let inserted = 0;
      let updated = 0;
      for (const [sheetName, sheetOrders] of groups) {
        const historyName = `${source} — ${sheetName}`;
        sheetOrders.forEach(order => { order.sourceFile = historyName; });
        dbResult = await importDbOrders(sheetOrders, historyName, groupIndex === 0 ? mode : 'merge');
        inserted += dbResult.inserted || 0;
        updated += dbResult.updated || 0;
        groupIndex++;
      }
      finalOrders = dbResult?.orders || finalOrders;
      updatedSourceName = `${source} → PostgreSQL`;
      setToastMessage(`PostgreSQL saved: ${inserted} new, ${updated} updated, ${finalOrders.length} total orders from ${groups.size} sheet(s).`);
    } catch {
      setToastMessage('PostgreSQL is not configured yet. Data is kept in this browser until DATABASE_URL is added.');
    }
    finalOrders = finalOrders.map(applyOrderLifecycle);
    syncOrderAreas(finalOrders);
    setOrders(finalOrders);
    setStockRecords((prevStock) => syncStockWithOrders(prevStock, finalOrders));
    setSourceName(updatedSourceName);

    // Reset filters
    setActiveFilters({
      areas: [],
      areaClasses: [],
      parties: [],
      deadlineRanges: [],
      salesPersons: [],
      items: [],
      customAreas: [],
      customParties: [],
      customSalesPersons: [],
      customItems: [],
      customDeadlines: [],
      searchQuery: '',
    });

    const totalDups = (dedupInfo?.internalRemoved || 0) + (dedupInfo?.existingDuplicates || 0);
    if (totalDups > 0) {
      setToastMessage(
        mode === 'merge'
          ? `Merged ${newOrders.length} orders into dashboard (${finalOrders.length} total). Filtered out ${totalDups} duplicate records!`
          : `Loaded ${finalOrders.length} unique orders. Filtered out ${totalDups} duplicate records!`
      );
    } else {
      setToastMessage(
        mode === 'merge'
          ? `Merged ${newOrders.length} orders into dashboard (${finalOrders.length} total orders active).`
          : `Successfully loaded ${finalOrders.length} orders from "${source}"!`
      );
    }
  };

  // Multi-entry Recycle Bin. Each clear action creates an independent restore point.
  const readTrash = (): any[] => {
    try { const v = JSON.parse(localStorage.getItem(STORAGE_KEY_TRASH) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
  };
  const writeTrash = (entries:any[]) => { localStorage.setItem(STORAGE_KEY_TRASH, JSON.stringify(entries)); setTrashVersion(v=>v+1); };
  const [trashVersion, setTrashVersion] = useState(0);
  const recycleEntries: RestoreEntry[] = useMemo(() => readTrash().map((e:any)=>({ id:e.id, label:e.label, target:e.target, deletedAt:e.deletedAt })), [trashVersion, isClearConfirmOpen]);
  const sourceFiles = useMemo(() => Array.from(new Set(orders.map(o => o.sourceFile).filter((v): v is string => !!v && v.trim() !== ''))).sort(), [orders]);

  const pushTrash = (snapshot:any) => {
    const entries = readTrash();
    entries.push({ id:`trash-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, deletedAt:new Date().toISOString(), ...snapshot });
    writeTrash(entries);
  };

  const handleClearSelectedData = async (target: ClearTarget) => {
    const snapshot:any = { target, label: target === 'all' ? 'All Application Data' : target === 'orders' ? `Orders (${orders.length})` : target === 'stock' ? `Stock Records (${stockRecords.length})` : 'Dispatch Plans', sourceName };
    if (target === 'orders' || target === 'all') snapshot.orders = orders;
    if (target === 'stock' || target === 'all') snapshot.stockRecords = stockRecords;
    if (target === 'dispatch' || target === 'all') snapshot.dispatchPlans = localStorage.getItem('abc_dispatch_plans') || '[]';
    pushTrash(snapshot);
    if (target === 'orders' || target === 'all') { try { await clearDbOrders(); } catch {} setOrders([]); localStorage.removeItem(STORAGE_KEY_ORDERS); }
    if (target === 'stock' || target === 'all') { try { await saveDbStock([]); } catch {} setStockRecords([]); localStorage.removeItem(STORAGE_KEY_STOCK); }
    if (target === 'dispatch' || target === 'all') localStorage.removeItem('abc_dispatch_plans');
    if (target === 'all') { setSourceName('No Data Loaded'); localStorage.removeItem(STORAGE_KEY_SOURCE); }
    setToastMessage(`${snapshot.label} moved to Recycle Bin.`);
  };

  const handleClearSourceFile = async (file:string) => {
    const removed = orders.filter(o => o.sourceFile === file);
    if (!removed.length) return;
    pushTrash({ target:'source', label:`Excel file: ${file} (${removed.length} orders)`, sourceFile:file, orders:removed, sourceName });
    const remaining = orders.filter(o => o.sourceFile !== file).map(applyOrderLifecycle);
    setOrders(remaining);
    setStockRecords(prev => syncStockWithOrders(prev, remaining));
    // Rebuild PostgreSQL from the remaining active orders when available.
    try { await importDbOrders(remaining, 'Dataset after source-file clear', 'replace'); } catch {}
    setToastMessage(`${file}: ${removed.length} order(s) moved to Recycle Bin.`);
  };

  const handleRestoreDeletedData = async (id:string) => {
    const entries = readTrash(); const snap = entries.find((e:any)=>e.id===id); if(!snap) return;
    if (snap.target === 'orders' || snap.target === 'all') { const restored=(snap.orders||[]).map(applyOrderLifecycle); setOrders(restored); try { await importDbOrders(restored, 'Restored orders', 'replace'); } catch {} }
    if (snap.target === 'source') { const merge=deduplicateAndMergeOrders(snap.orders||[], orders, 'merge'); const restored=merge.mergedOrders.map(applyOrderLifecycle); setOrders(restored); try { await importDbOrders(snap.orders||[], `Restored ${snap.sourceFile||'Excel file'}`, 'merge'); } catch {} }
    if (snap.target === 'stock' || snap.target === 'all') setStockRecords(snap.stockRecords || []);
    if (snap.target === 'dispatch' || snap.target === 'all') localStorage.setItem('abc_dispatch_plans', snap.dispatchPlans || '[]');
    if (snap.sourceName) setSourceName(snap.sourceName);
    writeTrash(entries.filter((e:any)=>e.id!==id));
    setToastMessage(`${snap.label} restored successfully.`);
  };

  const handleDeleteTrashPermanently = (id:string) => {
    const entries=readTrash(); const item=entries.find((e:any)=>e.id===id);
    writeTrash(entries.filter((e:any)=>e.id!==id));
    setToastMessage(`${item?.label || 'Deleted item'} permanently removed from Recycle Bin.`);
  };

  // Stock update handler
  const handleUpdateStock = (updatedRecords: StockRecord[]) => {
    setStockRecords(updatedRecords);
    setToastMessage('Stock records updated successfully.');
  };

  // Live overview metrics for stock & deadlines to power badges
  const stockMetrics = useMemo(() => {
    return calculateStockOverviewMetrics(stockRecords, orders);
  }, [stockRecords, orders]);

  const urgentDeliveryStats = useMemo(() => {
    const list = calculateUrgentDeliveries(orders, stockRecords);
    const criticalCount = list.filter((i) => i.urgency === 'Overdue' || i.urgency === 'Due Today').length;
    return {
      totalUrgent: list.length,
      criticalCount,
    };
  }, [orders, stockRecords]);

  // Filter handlers for Orders Table
  const handleToggleValue = (category: FilterCategory, val: string) => {
    setActiveFilters((prev) => {
      let key: keyof ActiveFilters;
      if (category === 'area') key = 'areas';
      else if (category === 'areaClass') key = 'areaClasses';
      else if (category === 'party') key = 'parties';
      else if (category === 'deadline') key = 'deadlineRanges';
      else if (category === 'salesPerson') key = 'salesPersons';
      else key = 'items';

      const currentList = prev[key] as string[];
      const exists = currentList.includes(val);
      const updatedList = exists
        ? currentList.filter((item) => item !== val)
        : [...currentList, val];

      return {
        ...prev,
        [key]: updatedList,
      };
    });
  };

  const handleSelectAllCategory = (category: FilterCategory, allVals: string[]) => {
    setActiveFilters((prev) => {
      let key: keyof ActiveFilters;
      if (category === 'area') key = 'areas';
      else if (category === 'areaClass') key = 'areaClasses';
      else if (category === 'party') key = 'parties';
      else if (category === 'deadline') key = 'deadlineRanges';
      else if (category === 'salesPerson') key = 'salesPersons';
      else key = 'items';

      return {
        ...prev,
        [key]: allVals,
      };
    });
  };

  const handleClearCategory = (category: FilterCategory) => {
    setActiveFilters((prev) => {
      let key: keyof ActiveFilters;
      if (category === 'area') key = 'areas';
      else if (category === 'areaClass') key = 'areaClasses';
      else if (category === 'party') key = 'parties';
      else if (category === 'deadline') key = 'deadlineRanges';
      else if (category === 'salesPerson') key = 'salesPersons';
      else key = 'items';

      return {
        ...prev,
        [key]: [],
      };
    });
  };

  const handleAddCustomValue = (category: FilterCategory, val: string) => {
    if (!val.trim()) return;
    const cleanVal = val.trim();

    setActiveFilters((prev) => {
      let customKey: keyof ActiveFilters;
      let activeKey: keyof ActiveFilters;

      if (category === 'area') {
        customKey = 'customAreas';
        activeKey = 'areas';
      } else if (category === 'areaClass') {
        customKey = 'customAreas';
        activeKey = 'areaClasses';
      } else if (category === 'party') {
        customKey = 'customParties';
        activeKey = 'parties';
      } else if (category === 'deadline') {
        customKey = 'customDeadlines';
        activeKey = 'deadlineRanges';
      } else if (category === 'salesPerson') {
        customKey = 'customSalesPersons';
        activeKey = 'salesPersons';
      } else {
        customKey = 'customItems';
        activeKey = 'items';
      }

      const existingCustom = prev[customKey] as string[];
      const existingActive = prev[activeKey] as string[];

      return {
        ...prev,
        [customKey]: existingCustom.includes(cleanVal) ? existingCustom : [...existingCustom, cleanVal],
        [activeKey]: existingActive.includes(cleanVal) ? existingActive : [...existingActive, cleanVal],
      };
    });

    setToastMessage(`Added "${cleanVal}" to ${category} filters`);
  };

  const handleRemoveFilter = (category: FilterCategory, val: string) => {
    handleToggleValue(category, val);
  };

  const handleResetAllFilters = () => {
    setActiveFilters((prev) => ({
      ...prev,
      areas: [],
      areaClasses: [],
      parties: [],
      deadlineRanges: [],
      salesPersons: [],
      items: [],
      searchQuery: '',
    }));
    setToastMessage('All category filters cleared.');
  };

  // Filtered orders computation
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Area filter
      if (activeFilters.areas.length > 0 && !activeFilters.areas.includes(order.area)) {
        return false;
      }
      if (activeFilters.areaClasses.length > 0) {
        const match=loadAreas().find(a=>a.companyName.trim().toUpperCase()===order.companyName.trim().toUpperCase()||a.areaCode===order.area);
        if(!match||!match.classification||!activeFilters.areaClasses.includes(match.classification)) return false;
      }

      // 2. Party filter
      if (activeFilters.parties.length > 0 && !activeFilters.parties.includes(order.companyName)) {
        return false;
      }

      // 3. Deadline filter
      if (activeFilters.deadlineRanges.length > 0) {
        const orderDue = new Date(order.dueDate);
        const today = new Date('2026-09-18');

        const matchesAnyDeadlineFilter = activeFilters.deadlineRanges.some((range) => {
          if (range === 'overdue') {
            return order.status === 'Overdue' || orderDue < today;
          }
          if (range === 'next-7-days') {
            const diffDays = (orderDue.getTime() - today.getTime()) / (1000 * 3600 * 24);
            return diffDays >= 0 && diffDays <= 7;
          }
          if (range === 'next-15-days') {
            const diffDays = (orderDue.getTime() - today.getTime()) / (1000 * 3600 * 24);
            return diffDays >= 0 && diffDays <= 15;
          }
          if (range === 'this-month') {
            return orderDue.getMonth() === today.getMonth() && orderDue.getFullYear() === today.getFullYear();
          }
          return order.dueDate === range;
        });

        if (!matchesAnyDeadlineFilter) return false;
      }

      // 4. Sales person filter
      if (activeFilters.salesPersons.length > 0 && !activeFilters.salesPersons.includes(order.salesPerson)) {
        return false;
      }

      // 5. Item filter
      if (activeFilters.items.length > 0) {
        const hasMatchingItem = order.items.some((it) =>
          activeFilters.items.includes(it.name.trim())
        );
        if (!hasMatchingItem) return false;
      }

      // 6. Search query
      if (activeFilters.searchQuery.trim() !== '') {
        const q = activeFilters.searchQuery.toLowerCase().trim();
        const matchesQuery =
          order.companyName.toLowerCase().includes(q) ||
          order.voucherNumber.toLowerCase().includes(q) ||
          (order.skNumber || '').toLowerCase().includes(q) ||
          order.partyOrderNumber.toLowerCase().includes(q) ||
          order.area.toLowerCase().includes(q) ||
          order.salesPerson.toLowerCase().includes(q) ||
          order.items.some((it) => it.name.toLowerCase().includes(q));

        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [orders, activeFilters]);

  // Export current filtered orders to Excel
  const handleRecordDispatch = async (order: Order, skNumber: string) => {
    const updated = applyOrderLifecycle({ ...order, skNumber, rtg:true, completionUndo: { issue: order.issue, pending: order.pending, status: order.status, items: order.items.map(i=>({...i})), skNumber: order.skNumber, rtg:order.rtg } });
    const nextOrders = orders.map((o) => o.id === order.id ? updated : o).map(applyOrderLifecycle);
    setOrders(nextOrders);
    setStockRecords((prev) => syncStockWithOrders(prev, nextOrders));
    try { await importDbOrders([updated], 'Dashboard partial dispatch', 'merge'); } catch { /* browser cache remains */ }
    setToastMessage(`${order.voucherNumber || order.id} moved to RTG.`);
  };

  const handleCompleteOrder = async (order: Order, skNumber: string) => {
    const completed: Order = applyOrderLifecycle({
      ...order,
      skNumber,
      issue: order.orderQuantity,
      pending: 0,
      rtg: false,
      status: 'Completed',
      items: order.items.map((item) => ({ ...item, issue: item.quantity, pending: 0 })),
      completionUndo: { issue: order.issue, pending: order.pending, status: order.status, items: order.items.map(i=>({...i})), skNumber: order.skNumber, rtg:order.rtg },
    });
    const nextOrders = orders.map((o) => o.id === order.id ? completed : o).map(applyOrderLifecycle);
    setOrders(nextOrders);
    setStockRecords((prev) => syncStockWithOrders(prev, nextOrders));
    try {
      const dbResult = await importDbOrders([completed], 'Dashboard completion', 'merge');
      if (dbResult?.orders?.length) setOrders(dbResult.orders.map(applyOrderLifecycle));
      setToastMessage(`${order.voucherNumber || order.id} completed and moved to Finished Orders.`);
    } catch {
      setToastMessage(`${order.voucherNumber || order.id} completed and moved to Finished Orders (browser cache; PostgreSQL unavailable).`);
    }
  };

  const handleUndoComplete = async (order: Order) => {
    const snap = order.completionUndo;
    if (!snap) { setToastMessage('This finished order has no dashboard completion snapshot to undo.'); return; }
    const restored = applyOrderLifecycle({ ...order, skNumber: snap.skNumber, issue: snap.issue, pending: snap.pending, status: snap.status, rtg:snap.rtg, items: snap.items.map(i=>({...i})), completionUndo: undefined });
    const nextOrders = orders.map(o => o.id === order.id ? restored : o).map(applyOrderLifecycle);
    setOrders(nextOrders);
    setStockRecords(prev => syncStockWithOrders(prev, nextOrders));
    try { await importDbOrders([restored], 'Undo finished order', 'merge'); } catch {}
    setToastMessage(`${order.voucherNumber || order.id}: completion undone and order returned to active orders.`);
  };

  const handleSaveEditedOrder = async (edited: Order) => {
    const updated = applyOrderLifecycle({ ...edited, pending: Math.max(0, edited.orderQuantity - edited.issue) });
    const nextOrders = orders.map(o => o.id === updated.id ? updated : o).map(applyOrderLifecycle);
    setOrders(nextOrders);
    setEditingOrder(null);
    try {
      const dbResult = await importDbOrders([updated], 'Manual order edit', 'merge');
      if (dbResult?.orders?.length) setOrders(dbResult.orders.map(applyOrderLifecycle));
      setToastMessage(`${updated.voucherNumber || updated.skNumber || updated.companyName} details saved permanently.`);
    } catch {
      setToastMessage('Order updated in this browser, but PostgreSQL could not be reached.');
    }
  };

  const handleExportExcel = () => {
    exportOrdersToExcel(filteredOrders, `ABC_Paints_Orders_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setToastMessage(`Exported ${filteredOrders.length} orders to Excel!`);
  };

  return (
    <div id="orders-dashboard-root" className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      <UploadHistorySidebar />
      {/* Top Navbar */}
      <DashboardNavbar
        onOpenExcelLoader={() => setIsExcelModalOpen(true)}
        onExportExcel={handleExportExcel}
        onClearAllData={() => setIsClearConfirmOpen(true)}
        currentSource={sourceName}
        orderCount={orders.length}
      />

      {/* Main Dashboard Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-slate-100 rounded-xl shadow-lg border border-slate-700 text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-200">
            <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Empty Storage / Data Cleared Notice Banner */}
        {orders.length === 0 && stockRecords.length === 0 && (
          <div id="storage-cleared-banner" className="bg-white rounded-2xl p-6 text-slate-900 border border-slate-200 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl border border-slate-200 shrink-0">
                  <Database className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                      Storage Cleared
                    </span>
                    <h2 className="font-semibold text-base text-slate-900">
                      All Stored Data Has Been Removed
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                    No active Orders or Stock dataset is loaded. Upload your business Excel file or download the Orders import template.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button
                  type="button"
                  id="empty-load-excel-btn"
                  onClick={() => setIsExcelModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors"
                >
                  <UploadCloud className="w-4 h-4 text-sky-400" />
                  <span>Load Excel Sheet</span>
                </button>
                <button
                  type="button"
                  id="empty-download-template-btn"
                  onClick={downloadOrdersImportTemplate}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 shadow-2xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Orders Import Template</span>
                </button>

              </div>
            </div>
          </div>
        )}

        {/* Excel Load Prompt Banner (When data exists) */}
        {orders.length > 0 && (
          <div className="bg-white rounded-2xl p-4 sm:p-5 text-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs border border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                  Excel Integration Active
                </span>
                <h3 className="font-semibold text-sm sm:text-base text-slate-900">
                  Stock Records, Reorders &amp; Deadline Control
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                Track on-hand availability against minimum &amp; maximum limits, execute shortage discussions with Excel export, and prioritize urgent deliveries by deadline.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                id="banner-load-excel-btn"
                onClick={() => setIsExcelModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-xl transition-colors shadow-2xs"
              >
                <UploadCloud className="w-4 h-4 text-sky-400" />
                Load Another Excel File
              </button>
            </div>
          </div>
        )}

        {/* PRIMARY VIEW NAVIGATION TABS */}
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              ['orders', 'Orders & Packing'],
              ['stock', 'Stock Records'],
              ['deadline', 'Urgent Deadline'],
              ['reorder', 'Shortage & Reorder Decisions'],
              ['areas', 'Areas'],
              ['dispatch', 'Dispatch'],
              ['report', 'Report'],
            ].map(([tab, label]) => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab as DashboardViewTab)} className={`flex-1 min-w-[150px] px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-50'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* TAB 1 CONTENT: Stock Records & Inventory Control */}
        {activeTab === 'areas' && <AreasDashboard orders={orders} />}
        {activeTab === 'dispatch' && <DispatchPlanner />}
        {activeTab === 'report' && <DailyReport orders={orders} stockRecords={stockRecords} />}

        {activeTab === 'stock' && (
          <StockRecordsTable
            stockRecords={stockRecords}
            orders={orders}
            onUpdateStock={handleUpdateStock}
            onNavigateToReorder={() => setActiveTab('reorder')}
          />
        )}

        {/* TAB 2 CONTENT: Shortage and Reorder Decisions with Excel Export */}
        {activeTab === 'reorder' && (
          <ReorderDecisionsWorkspace
            stockRecords={stockRecords}
            orders={orders}
            onUpdateStock={handleUpdateStock}
            onNavigateToStock={() => setActiveTab('stock')}
          />
        )}

        {/* TAB 3 CONTENT: Urgent Deadline Dashboard */}
        {activeTab === 'deadline' && (
          <DeadlineDashboard
            orders={orders}
            stockRecords={stockRecords}
            onSelectCompany={(company) => setSelectedCompanyModal(company)}
            onNavigateToStock={() => setActiveTab('stock')}
            onNavigateToReorder={() => setActiveTab('reorder')}
          />
        )}

        {/* TAB 4 CONTENT: Orders List & Category Filter Bar */}
        {activeTab === 'orders' && (
          <div className="space-y-5">
            {/* Interactive Category Filter Bar with Dropdowns, Details, and Back buttons */}
            <CategoryFilterBar
              activeFilters={activeFilters}
              orders={orders}
              onToggleValue={handleToggleValue}
              onSelectAllCategory={handleSelectAllCategory}
              onClearCategory={handleClearCategory}
              onAddCustomValue={handleAddCustomValue}
              onRemoveFilter={handleRemoveFilter}
              onResetAllFilters={handleResetAllFilters}
              onSearchChange={(q) => setActiveFilters((prev) => ({ ...prev, searchQuery: q }))}
              onSelectCompany={(company) => setSelectedCompanyModal(company)}
            />

            {/* Orders Table with exact requested columns & clickable Company Name */}
            <OrdersTable
              orders={filteredOrders}
              onSelectCompany={(company) => setSelectedCompanyModal(company)}
              onClearFilters={handleResetAllFilters}
              onCompleteOrder={handleCompleteOrder}
              onRecordDispatch={handleRecordDispatch}
              onUndoComplete={handleUndoComplete}
              onEditOrder={setEditingOrder}
            />
          </div>
        )}
      </main>

      {/* Modal 1: Excel Loader Dialog */}
      <ExcelLoaderModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onOrdersLoaded={handleOrdersLoaded}
        currentOrders={orders}
        currentOrderCount={orders.length}
      />

      {/* Modal 2: Company Detail Modal (Displays items and quantities ordered by that particular company) */}
      <CompanyDetailModal
        companyName={selectedCompanyModal}
        orders={orders}
        onClose={() => setSelectedCompanyModal(null)}
      />

      <OrderEditModal order={editingOrder} onClose={() => setEditingOrder(null)} onSave={handleSaveEditedOrder} />

      {/* Modal 3: Clear Data Confirmation Modal */}
      <ClearDataConfirmModal
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirmClear={handleClearSelectedData}
        onClearSource={handleClearSourceFile}
        onRestore={handleRestoreDeletedData}
        onDeletePermanently={handleDeleteTrashPermanently}
        sourceFiles={sourceFiles}
        restoreEntries={recycleEntries}
        orderCount={orders.length}
        stockCount={stockRecords.length}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/70 py-4 px-6 text-center text-xs text-slate-500 mt-auto">
        ABC Paints • Orders &amp; Inventory Dashboard • Stock Records, Reorder Decisions &amp; Deadline Management
      </footer>
    </div>
  );
}
