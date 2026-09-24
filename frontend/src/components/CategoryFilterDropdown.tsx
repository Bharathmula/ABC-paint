import React, { useState, useMemo } from 'react';
import { FilterCategory, Order } from '../types';
import { isOrderToday, isOrderUnfinished } from '../utils/orderStatus';
import {
  ArrowLeft,
  X,
  Search,
  Plus,
  Check,
  MapPin,
  Building2,
  Calendar,
  UserCheck,
  Package,
  RotateCcw,
  ChevronRight,
  Eye,
  Clock,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  FileText
} from 'lucide-react';

interface CategoryFilterDropdownProps {
  category: FilterCategory;
  orders: Order[];
  selectedValues: string[];
  customValues: string[];
  onToggleValue: (val: string) => void;
  onSelectAll: (vals: string[]) => void;
  onClearCategory: () => void;
  onAddCustomValue: (val: string) => void;
  onClose: () => void;
  onSelectCompany?: (companyName: string) => void;
}

export const CategoryFilterDropdown: React.FC<CategoryFilterDropdownProps> = ({
  category,
  orders,
  selectedValues,
  customValues,
  onToggleValue,
  onSelectAll,
  onClearCategory,
  onAddCustomValue,
  onClose,
  onSelectCompany,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [newInputVal, setNewInputVal] = useState('');
  // When an area/party/item is clicked to open details
  const [activeDetailItem, setActiveDetailItem] = useState<string | null>(null);

  const meta = useMemo(() => {
    switch (category) {
      case 'areaClass':
        return { title:'Area Type Filter', dropdownLabel:'Area Types', singularLabel:'Area Type', icon:MapPin, placeholderAdd:'Local or Transport', colorClass:'blue', headerBg:'bg-blue-600' };
      case 'area':
        return {
          title: 'Area Wise Filter',
          dropdownLabel: 'Areas',
          singularLabel: 'Area',
          icon: MapPin,
          placeholderAdd: 'e.g. Pune Central, Hyderabad Industrial...',
          colorClass: 'blue',
          headerBg: 'bg-blue-600',
        };
      case 'party':
        return {
          title: 'Party Wise Filter',
          dropdownLabel: 'Parties',
          singularLabel: 'Party / Company',
          icon: Building2,
          placeholderAdd: 'e.g. Asian Paints Dealer, Apex Builders...',
          colorClass: 'purple',
          headerBg: 'bg-purple-600',
        };
      case 'deadline':
        return {
          title: 'Deadline Date Wise Filter',
          dropdownLabel: 'Deadlines',
          singularLabel: 'Deadline Date',
          icon: Calendar,
          placeholderAdd: 'e.g. YYYY-MM-DD or 2026-09-30...',
          colorClass: 'amber',
          headerBg: 'bg-amber-600',
        };
      case 'salesPerson':
        return {
          title: 'Sales Person Wise Filter',
          dropdownLabel: 'Sales Persons',
          singularLabel: 'Sales Person',
          icon: UserCheck,
          placeholderAdd: 'e.g. Rajesh Kumar, Priya Sharma...',
          colorClass: 'teal',
          headerBg: 'bg-teal-600',
        };
      case 'item':
        return {
          title: 'Item Wise Filter',
          dropdownLabel: 'Items & Products',
          singularLabel: 'Product / Item',
          icon: Package,
          placeholderAdd: 'e.g. Zinc Primer 10L, Gloss White 20L...',
          colorClass: 'rose',
          headerBg: 'bg-rose-600',
        };
    }
  }, [category]);

  // Aggregate data for each unique option in this category
  const aggregatedOptions = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        orderCount: number;
        totalValue: number;
        orderQty: number;
        issueQty: number;
        pendingQty: number;
        todayCount: number;
        unfinishedCount: number;
        ordersList: Order[];
      }
    >();

    const getOrInit = (key: string) => {
      let existing = map.get(key);
      if (!existing) {
        existing = {
          name: key,
          orderCount: 0,
          totalValue: 0,
          orderQty: 0,
          issueQty: 0,
          pendingQty: 0,
          todayCount: 0,
          unfinishedCount: 0,
          ordersList: [],
        };
        map.set(key, existing);
      }
      return existing;
    };

    orders.forEach((order) => {
      const isToday = isOrderToday(order.date);
      const isUnfinished = isOrderUnfinished(order);

      if (category === 'areaClass') {
        ['Local','Transport'].forEach(key=>{const entry=getOrInit(key);orders.forEach(order=>{entry.ordersList.push(order)})});
      } else if (category === 'area') {
        const key = order.area || 'General';
        const entry = getOrInit(key);
        entry.orderCount += 1;
        entry.totalValue += order.value;
        entry.orderQty += order.orderQuantity;
        entry.issueQty += order.issue;
        entry.pendingQty += order.pending;
        if (isToday) entry.todayCount += 1;
        if (isUnfinished) entry.unfinishedCount += 1;
        entry.ordersList.push(order);
      } else if (category === 'party') {
        const key = order.companyName || 'Unknown Party';
        const entry = getOrInit(key);
        entry.orderCount += 1;
        entry.totalValue += order.value;
        entry.orderQty += order.orderQuantity;
        entry.issueQty += order.issue;
        entry.pendingQty += order.pending;
        if (isToday) entry.todayCount += 1;
        if (isUnfinished) entry.unfinishedCount += 1;
        entry.ordersList.push(order);
      } else if (category === 'deadline') {
        const key = order.dueDate || 'No Due Date';
        const entry = getOrInit(key);
        entry.orderCount += 1;
        entry.totalValue += order.value;
        entry.orderQty += order.orderQuantity;
        entry.issueQty += order.issue;
        entry.pendingQty += order.pending;
        if (isToday) entry.todayCount += 1;
        if (isUnfinished) entry.unfinishedCount += 1;
        entry.ordersList.push(order);
      } else if (category === 'salesPerson') {
        const key = order.salesPerson || 'Unassigned';
        const entry = getOrInit(key);
        entry.orderCount += 1;
        entry.totalValue += order.value;
        entry.orderQty += order.orderQuantity;
        entry.issueQty += order.issue;
        entry.pendingQty += order.pending;
        if (isToday) entry.todayCount += 1;
        if (isUnfinished) entry.unfinishedCount += 1;
        entry.ordersList.push(order);
      } else if (category === 'item') {
        order.items.forEach((it) => {
          const key = it.name.trim();
          const entry = getOrInit(key);
          entry.orderCount += 1;
          entry.totalValue += it.value;
          entry.orderQty += it.quantity;
          entry.issueQty += it.issue;
          entry.pendingQty += it.pending;
          if (isToday) entry.todayCount += 1;
          if (it.pending > 0) entry.unfinishedCount += 1;
          if (!entry.ordersList.some((o) => o.id === order.id)) {
            entry.ordersList.push(order);
          }
        });
      }
    });

    // Make sure custom added items are present
    customValues.forEach((cv) => {
      if (!map.has(cv)) {
        map.set(cv, {
          name: cv,
          orderCount: 0,
          totalValue: 0,
          orderQty: 0,
          issueQty: 0,
          pendingQty: 0,
          todayCount: 0,
          unfinishedCount: 0,
          ordersList: [],
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      // Sort with orders first, then alphabetically
      if (b.orderCount !== a.orderCount) {
        return b.orderCount - a.orderCount;
      }
      return a.name.localeCompare(b.name);
    });
  }, [category, orders, customValues]);

  // Filtered by search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return aggregatedOptions;
    const q = searchTerm.toLowerCase().trim();
    return aggregatedOptions.filter((opt) => opt.name.toLowerCase().includes(q));
  }, [aggregatedOptions, searchTerm]);

  // If viewing details for a respective item
  const selectedDetailData = useMemo(() => {
    if (!activeDetailItem) return null;
    return aggregatedOptions.find((opt) => opt.name === activeDetailItem) || null;
  }, [activeDetailItem, aggregatedOptions]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newInputVal.trim();
    if (!trimmed) return;
    onAddCustomValue(trimmed);
    setNewInputVal('');
  };

  const IconComponent = meta.icon;

  return (
    <div
      id="category-filter-dropdown-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="category-filter-dropdown-container"
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* VIEW 1: DRILLDOWN DETAILS FOR RESPECTIVE AREA / PARTY / ITEM */}
        {activeDetailItem && selectedDetailData ? (
          <div className="flex flex-col h-full max-h-[90vh]">
            {/* Detail View Header with prominent Back Button */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  id="detail-back-button"
                  onClick={() => setActiveDetailItem(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-blue-700 bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-300 rounded-xl transition-colors shadow-2xs group"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-blue-600 transition-transform group-hover:-translate-x-0.5" />
                  <span>Back to {meta.dropdownLabel} List</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
                  title="Close and return to dashboard"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Respective Detail Banner */}
            <div className="p-5 bg-gradient-to-r from-slate-900 to-blue-950 text-white border-b border-blue-900/50">
              <div className="flex items-center gap-2 text-xs text-blue-300 font-semibold uppercase tracking-wider mb-1">
                <IconComponent className="w-4 h-4 text-blue-400" />
                <span>Respective {meta.singularLabel} Details</span>
              </div>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {selectedDetailData.name}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedValues.includes(selectedDetailData.name)) {
                        onToggleValue(selectedDetailData.name);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 ${
                      selectedValues.includes(selectedDetailData.name)
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    {selectedValues.includes(selectedDetailData.name) ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Selected as Active Filter
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" /> Select this {meta.singularLabel}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Respective Area / Item KPI Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-slate-50 border-b border-slate-200 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-slate-500 font-semibold">Total Orders</div>
                <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                  {selectedDetailData.orderCount}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">In this {meta.singularLabel.toLowerCase()}</div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-blue-700 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-600" /> Today's Orders
                </div>
                <div className="text-lg font-bold font-mono text-blue-900 mt-0.5">
                  {selectedDetailData.todayCount}
                </div>
                <div className="text-[10px] text-blue-500 mt-0.5">
                  {selectedDetailData.todayCount > 0 ? 'Orders booked today' : 'None today'}
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 shadow-2xs">
                <div className="text-amber-800 font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-600" /> Unfinished Orders
                </div>
                <div className="text-lg font-bold font-mono text-amber-900 mt-0.5">
                  {selectedDetailData.unfinishedCount}
                </div>
                <div className="text-[10px] text-amber-700 mt-0.5">
                  Pending: <strong>{selectedDetailData.pendingQty}</strong> units
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-slate-500 font-semibold">Total Order Value</div>
                <div className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                  ₹{selectedDetailData.totalValue.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Issued: {selectedDetailData.issueQty} / {selectedDetailData.orderQty}
                </div>
              </div>
            </div>

            {/* List of Orders for this respective Area / Party / Item */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>Orders for {selectedDetailData.name} ({selectedDetailData.ordersList.length})</span>
                </h4>
                <span className="text-[11px] text-slate-500">
                  Showing all matching vouchers
                </span>
              </div>

              {selectedDetailData.ordersList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No orders currently recorded for this {meta.singularLabel.toLowerCase()}.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedDetailData.ordersList.map((ord) => {
                    const isToday = isOrderToday(ord.date);
                    const isUnfinished = isOrderUnfinished(ord);

                    return (
                      <div
                        key={ord.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isToday
                            ? 'bg-indigo-50/40 border-indigo-200 shadow-xs'
                            : isUnfinished
                            ? 'bg-amber-50/30 border-amber-200 shadow-xs'
                            : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {ord.voucherNumber}
                            </span>
                            <span className="font-semibold text-xs text-slate-900">
                              {ord.companyName}
                            </span>
                            {onSelectCompany && (
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onSelectCompany(ord.companyName);
                                }}
                                className="text-blue-600 hover:text-blue-800 text-[11px] font-medium underline flex items-center gap-0.5"
                                title="View company items"
                              >
                                <Eye className="w-3 h-3" /> View Company
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isToday && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                <Sparkles className="w-2.5 h-2.5 text-indigo-600" /> TODAY'S ORDER
                              </span>
                            )}
                            {isUnfinished ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <Clock className="w-2.5 h-2.5 text-amber-600" /> UNFINISHED ({ord.pending} PENDING)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> FINISHED
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Order details grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
                          <div>
                            <span className="text-slate-400 text-[11px]">Date: </span>
                            <span className="font-mono text-slate-700 font-medium">{ord.date}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[11px]">Due Date: </span>
                            <span className="font-mono text-slate-700 font-medium">{ord.dueDate}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[11px]">Ordered / Issued: </span>
                            <span className="font-mono font-bold text-slate-900">
                              {ord.orderQuantity} / {ord.issue}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 text-[11px]">Value: </span>
                            <span className="font-mono font-bold text-slate-900">
                              ₹{ord.value.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Items in this order */}
                        <div className="mt-2 pt-2 border-t border-dashed border-slate-100 flex flex-wrap gap-1.5 items-center">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase">Items:</span>
                          {ord.items.map((it, i) => (
                            <span
                              key={i}
                              className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200/60 font-medium"
                            >
                              {it.name} (Qty: {it.quantity})
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Detail View Footer with Back Button */}
            <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                id="footer-detail-back-button"
                onClick={() => setActiveDetailItem(null)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors shadow-xs"
              >
                <ArrowLeft className="w-4 h-4 text-slate-500" />
                <span>Back to {meta.dropdownLabel} List</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
              >
                Apply & View Dashboard
              </button>
            </div>
          </div>
        ) : (
          /* VIEW 2: DROPDOWN LIST OF ALL AREAS / PARTIES / ITEMS WITH BACK BUTTON */
          <div className="flex flex-col h-full max-h-[90vh]">
            {/* Top Bar with Prominent Back Button */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  id="dropdown-back-btn"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-blue-700 bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-300 rounded-xl transition-colors shadow-2xs group"
                  title="Return to dashboard"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-blue-600 transition-transform group-hover:-translate-x-0.5" />
                  <span>Back</span>
                </button>

                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl text-white shadow-xs ${meta.headerBg}`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 id="dropdown-category-title" className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                      <span>{meta.title}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700 font-mono">
                        {aggregatedOptions.length} {meta.dropdownLabel}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 hidden sm:block">
                      Select {meta.dropdownLabel.toLowerCase()} to filter, or click any {meta.singularLabel.toLowerCase()} to view details
                    </p>
                  </div>
                </div>
              </div>

              <button
                id="dropdown-close-btn"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
                title="Close filter"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Add Custom Item Section */}
            <div className="p-3.5 bg-blue-50/50 border-b border-blue-100">
              <form onSubmit={handleAddSubmit} className="flex gap-2">
                <input
                  id="add-custom-input-field"
                  type="text"
                  value={newInputVal}
                  onChange={(e) => setNewInputVal(e.target.value)}
                  placeholder={`+ Add new ${meta.singularLabel.toLowerCase()} (${meta.placeholderAdd})`}
                  className="flex-1 px-3.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400 shadow-2xs"
                />
                <button
                  id="add-custom-submit-btn"
                  type="submit"
                  disabled={!newInputVal.trim()}
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shadow-xs shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add & Select
                </button>
              </form>
            </div>

            {/* Search and Action Bar */}
            <div className="p-3.5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="search-dropdown-input"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={`Search ${meta.dropdownLabel.toLowerCase()}...`}
                  className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-600">
                <div>
                  Selected:{' '}
                  <strong className="text-blue-600 font-mono">
                    {selectedValues.length}
                  </strong>{' '}
                  of {aggregatedOptions.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectAll(aggregatedOptions.map((o) => o.name))}
                    className="text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                  >
                    Select All
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={onClearCategory}
                    className="text-rose-600 hover:text-rose-800 font-semibold hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* The Dropdown List of All Different Names (e.g. 10 Areas) */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-2 max-h-96">
              {filteredOptions.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  No matching {meta.dropdownLabel.toLowerCase()} found. Use the add box above to create one.
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = selectedValues.includes(opt.name);

                  return (
                    <div
                      key={opt.name}
                      className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                        isSelected
                          ? 'bg-blue-50/70 border-blue-300 shadow-2xs'
                          : 'bg-white hover:bg-slate-50/80 border-slate-200'
                      }`}
                    >
                      {/* Left: Checkbox & Name */}
                      <div className="flex items-center gap-3 truncate pr-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleValue(opt.name)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0"
                          id={`check-${meta.singularLabel}-${opt.name}`}
                        />

                        <div className="truncate">
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {opt.name}
                            </span>
                            {customValues.includes(opt.name) && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-indigo-100 text-indigo-800 border border-indigo-200 font-medium">
                                Custom
                              </span>
                            )}
                          </div>

                          {/* Quick details summary tags */}
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                            <span className="font-mono font-medium text-slate-700">
                              {opt.orderCount} {opt.orderCount === 1 ? 'order' : 'orders'}
                            </span>
                            <span>•</span>
                            <span className="font-mono text-slate-900 font-semibold">
                              ₹{opt.totalValue.toLocaleString()}
                            </span>
                            {opt.unfinishedCount > 0 && (
                              <>
                                <span>•</span>
                                <span className="font-mono font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                  ⏳ {opt.pendingQty} pending
                                </span>
                              </>
                            )}
                            {opt.todayCount > 0 && (
                              <>
                                <span>•</span>
                                <span className="font-mono font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                  📅 {opt.todayCount} today
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Open Respective Details Button & Back action */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          id={`btn-open-details-${opt.name.replace(/\s+/g, '-').toLowerCase()}`}
                          onClick={() => setActiveDetailItem(opt.name)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors group"
                          title={`Open full details for ${opt.name}`}
                        >
                          <span>Open Details</span>
                          <ChevronRight className="w-3.5 h-3.5 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Dropdown Footer with Back Button */}
            <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                id="dropdown-footer-back-btn"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors shadow-xs"
              >
                <ArrowLeft className="w-4 h-4 text-slate-500" />
                <span>Back to Dashboard</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClearCategory}
                  className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-medium px-2.5 py-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
                <button
                  type="button"
                  id="dropdown-apply-btn"
                  onClick={onClose}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
                >
                  Apply Filter ({selectedValues.length})
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
