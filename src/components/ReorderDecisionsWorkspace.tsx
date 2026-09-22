import React, { useState, useMemo } from 'react';
import { StockRecord, Order, RestockPriority, ReorderDiscussionStatus } from '../types';
import {
  getUpdatedStockRecord,
  calculateItemPendingFromOrders,
  exportReorderDecisionsToExcel
} from '../utils/stockData';
import {
  Download,
  AlertTriangle,
  Flame,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  Edit3,
  Search,
  Filter,
  Users,
  Building2,
  TrendingDown,
  Info,
  DollarSign,
  ChevronDown
} from 'lucide-react';

interface ReorderDecisionsWorkspaceProps {
  stockRecords: StockRecord[];
  orders: Order[];
  onUpdateStock: (updatedRecords: StockRecord[]) => void;
  onNavigateToStock?: () => void;
}

export const ReorderDecisionsWorkspace: React.FC<ReorderDecisionsWorkspaceProps> = ({
  stockRecords,
  orders,
  onUpdateStock,
  onNavigateToStock,
}) => {
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [discussionFilter, setDiscussionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Editable note state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [currentNoteText, setCurrentNoteText] = useState<string>('');

  // Compute updated stock records with customer order demand
  const computedReorderItems = useMemo(() => {
    return stockRecords
      .map((item) => getUpdatedStockRecord(item, orders))
      .filter((item) => {
        // Items needing restocking discussion:
        // 1. Available stock < minimum limit (Yellow alert)
        // 2. Shortage > 0
        // 3. Marked as Needs Discussion / Approved
        const isBelowMin = item.availableStock < item.minimumLimit;
        const hasShortage = item.shortageQuantity > 0;
        const needsMeeting = item.discussionStatus === 'Needs Discussion';
        return isBelowMin || hasShortage || needsMeeting;
      });
  }, [stockRecords, orders]);

  // Summary figures
  const summary = useMemo(() => {
    let urgentCount = 0;
    let highCount = 0;
    let totalRecommendedUnits = 0;
    let totalEstValue = 0;

    computedReorderItems.forEach((item) => {
      if (item.restockPriority === 'Urgent') urgentCount++;
      if (item.restockPriority === 'High') highCount++;
      const qty = item.recommendedReorderQty || 0;
      totalRecommendedUnits += qty;
      totalEstValue += qty * item.unitCost;
    });

    return {
      totalItems: computedReorderItems.length,
      urgentCount,
      highCount,
      totalRecommendedUnits,
      totalEstValue,
    };
  }, [computedReorderItems]);

  // Filtered list
  const filteredList = useMemo(() => {
    return computedReorderItems.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPriority = priorityFilter === 'all' || item.restockPriority === priorityFilter;
      const matchesDiscussion = discussionFilter === 'all' || item.discussionStatus === discussionFilter;

      return matchesSearch && matchesPriority && matchesDiscussion;
    });
  }, [computedReorderItems, searchQuery, priorityFilter, discussionFilter]);

  // Update item priority
  const handlePriorityChange = (id: string, newPriority: RestockPriority) => {
    const updated = stockRecords.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          restockPriority: newPriority,
        };
      }
      return item;
    });
    onUpdateStock(updated);
  };

  // Update discussion status
  const handleDiscussionStatusChange = (id: string, newStatus: ReorderDiscussionStatus) => {
    const updated = stockRecords.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          discussionStatus: newStatus,
        };
      }
      return item;
    });
    onUpdateStock(updated);
  };

  // Update recommended reorder quantity
  const handleReorderQtyChange = (id: string, newQty: number) => {
    const updated = stockRecords.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          recommendedReorderQty: Math.max(0, newQty),
        };
      }
      return item;
    });
    onUpdateStock(updated);
  };

  // Save notes
  const handleSaveNote = (id: string) => {
    const updated = stockRecords.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          discussionNotes: currentNoteText,
        };
      }
      return item;
    });
    onUpdateStock(updated);
    setEditingNoteId(null);
  };

  return (
    <div id="reorder-decisions-section" className="space-y-4">
      {/* Top Banner & Excel Export Strip - Decent Clean Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 text-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs border border-slate-200">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
              <Flame className="w-3 h-3 text-slate-500" />
              Procurement &amp; Restock Council
            </span>
            <h2 id="reorder-heading" className="text-base sm:text-lg font-semibold text-slate-900">
              Shortage &amp; Reorder Decisions
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Prioritized discussion agenda for restocking materials experiencing safety shortages, customer order deficits, or low available stock.
          </p>
        </div>

        {/* Primary Action: Excel Download */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            id="btn-download-reorder-excel"
            onClick={() => exportReorderDecisionsToExcel(stockRecords, orders)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-medium rounded-xl transition-colors shadow-2xs"
            title="Download formatted Excel sheet for procurement team"
          >
            <Download className="w-4 h-4 text-slate-300" />
            <FileSpreadsheet className="w-4 h-4 text-slate-300" />
            <span>Download Reorder Decisions (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Metric Summary Cards for Reorder Council */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Metric 1: Items Needing Restock */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Restock Agenda</span>
            <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900">
            {summary.totalItems} <span className="text-xs font-normal text-slate-500">Items</span>
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">Require purchasing action</div>
        </div>

        {/* Metric 2: Urgent Priority Count */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">Urgent Priority</span>
            <div className="p-1.5 bg-rose-50 text-rose-700 rounded-lg">
              <Flame className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-rose-700">
            {summary.urgentCount} <span className="text-xs font-normal text-rose-600">Critical</span>
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400">Blocking customer orders</div>
        </div>

        {/* Metric 3: Total Suggested Units */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Restock Volume</span>
            <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900">
            {summary.totalRecommendedUnits.toLocaleString()} <span className="text-xs font-normal text-slate-500">Units</span>
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400">Total recommended reorder</div>
        </div>

        {/* Metric 4: Estimated Procurement Budget */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Est. Budget</span>
            <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
              <span className="text-xs font-bold font-mono">₹</span>
            </div>
          </div>
          <div className="mt-1 text-2xl font-bold font-mono text-slate-900 truncate">
            ₹{summary.totalEstValue >= 100000 ? `${(summary.totalEstValue / 100000).toFixed(2)}L` : summary.totalEstValue.toLocaleString()}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400 font-mono">₹{summary.totalEstValue.toLocaleString()}</div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Filter Reorder Decisions:
              </span>
            </div>

            {/* Excel Download button in bar */}
            <button
              type="button"
              onClick={() => exportReorderDecisionsToExcel(stockRecords, orders)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shadow-2xs self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Reorder Decisions (.xlsx)</span>
            </button>
          </div>

          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
            {/* Priority Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <button
                type="button"
                onClick={() => setPriorityFilter('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 ${
                  priorityFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                All Priorities ({computedReorderItems.length})
              </button>

              <button
                type="button"
                onClick={() => setPriorityFilter('Urgent')}
                className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 ${
                  priorityFilter === 'Urgent'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
                }`}
              >
                <Flame className="w-3 h-3 text-rose-500" />
                <span>Urgent ({summary.urgentCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setPriorityFilter('High')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 ${
                  priorityFilter === 'High'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
                }`}
              >
                High Priority ({summary.highCount})
              </button>

              <button
                type="button"
                onClick={() => setPriorityFilter('Medium')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 ${
                  priorityFilter === 'Medium'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Medium
              </button>
            </div>

            {/* Discussion status select & Search */}
            <div className="flex items-center gap-2">
              <select
                value={discussionFilter}
                onChange={(e) => setDiscussionFilter(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">All Discussion Statuses</option>
                <option value="Needs Discussion">Needs Discussion</option>
                <option value="Approved by Purchase">Approved by Purchase</option>
                <option value="PO Raised">PO Raised</option>
                <option value="Supplier Confirmed">Supplier Confirmed</option>
                <option value="Deferred">Deferred</option>
              </select>

              <div className="relative min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Reorder Table */}
        <div className="overflow-x-auto">
          <table id="reorder-decisions-table" className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-3.5">Priority</th>
                <th className="py-3 px-3.5 min-w-[220px]">Item &amp; Category</th>
                <th className="py-3 px-3 text-right">Available vs Min</th>
                <th className="py-3 px-3 text-right text-rose-800">Shortage Qty</th>
                <th className="py-3 px-3 text-right text-amber-900">Customer Demand</th>
                <th className="py-3 px-3 text-right">Reorder Qty</th>
                <th className="py-3 px-3 text-right">Est. Cost</th>
                <th className="py-3 px-3">Discussion Status</th>
                <th className="py-3 px-3.5 min-w-[260px]">Meeting Notes &amp; Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200/70 font-sans">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No items match the selected reorder criteria.</p>
                    <p className="text-xs text-slate-400 mt-0.5">All stock items are either optimal or already processed.</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const pendingDemand = calculateItemPendingFromOrders(item.name, orders);
                  const isBelowMin = item.availableStock < item.minimumLimit;
                  const estCost = (item.recommendedReorderQty || 0) * item.unitCost;

                  return (
                    <tr
                      key={item.id}
                      id={`reorder-row-${item.id}`}
                      className={`hover:bg-slate-50/90 transition-colors ${
                        isBelowMin ? 'bg-yellow-50/50' : ''
                      }`}
                    >
                      {/* 1. Priority Badge & Dropdown */}
                      <td className="py-3 px-3.5">
                        <select
                          value={item.restockPriority || 'Medium'}
                          onChange={(e) => handlePriorityChange(item.id, e.target.value as RestockPriority)}
                          className={`text-[11px] font-black uppercase rounded-lg px-2 py-1 border cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400 ${
                            item.restockPriority === 'Urgent'
                              ? 'bg-rose-100 text-rose-950 border-rose-300'
                              : item.restockPriority === 'High'
                              ? 'bg-amber-100 text-amber-950 border-amber-300'
                              : item.restockPriority === 'Medium'
                              ? 'bg-yellow-100 text-yellow-950 border-yellow-300'
                              : 'bg-blue-100 text-blue-950 border-blue-200'
                          }`}
                        >
                          <option value="Urgent">🔥 Urgent</option>
                          <option value="High">⚡ High</option>
                          <option value="Medium">⏳ Medium</option>
                          <option value="Low">💤 Low</option>
                        </select>
                      </td>

                      {/* 2. Item & Category */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                          <span className="text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                            {item.sku}
                          </span>
                          <span>•</span>
                          <span>{item.category}</span>
                          {item.supplierName && (
                            <>
                              <span>•</span>
                              <span className="text-slate-600 truncate max-w-[140px]" title={item.supplierName}>
                                {item.supplierName}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* 3. Available vs Min Limit (YELLOW HIGHLIGHT) */}
                      <td className="py-3 px-3 text-right font-mono">
                        {isBelowMin ? (
                          <div className="inline-flex flex-col items-end">
                            <span className="px-2 py-0.5 rounded bg-yellow-200 text-yellow-950 font-black border border-yellow-400 text-[11px]">
                              {item.availableStock} / {item.minimumLimit} {item.unit}
                            </span>
                            <span className="text-[9px] font-bold text-yellow-800 uppercase mt-0.5">
                              &lt; MIN LIMIT
                            </span>
                          </div>
                        ) : (
                          <span className="font-semibold text-slate-700">
                            {item.availableStock} / {item.minimumLimit} {item.unit}
                          </span>
                        )}
                      </td>

                      {/* 4. Shortage Quantity */}
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-300">
                          -{item.shortageQuantity} {item.unit}
                        </span>
                      </td>

                      {/* 5. Customer Pending Demand */}
                      <td className="py-3 px-3 text-right font-mono">
                        {pendingDemand > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-extrabold border border-amber-300">
                            {pendingDemand} {item.unit}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>

                      {/* 6. Reorder Qty (Editable input) */}
                      <td className="py-3 px-3 text-right font-mono">
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={item.recommendedReorderQty ?? 0}
                          onChange={(e) => handleReorderQtyChange(item.id, Number(e.target.value))}
                          className="w-20 px-2 py-1 text-xs text-right font-mono font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
                        />
                      </td>

                      {/* 7. Est Cost */}
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">
                        ₹{estCost.toLocaleString()}
                        <div className="text-[10px] text-slate-400 font-normal">
                          @ ₹{item.unitCost}/{item.unit}
                        </div>
                      </td>

                      {/* 8. Discussion Status */}
                      <td className="py-3 px-3">
                        <select
                          value={item.discussionStatus || 'Needs Discussion'}
                          onChange={(e) => handleDiscussionStatusChange(item.id, e.target.value as ReorderDiscussionStatus)}
                          className={`text-xs font-semibold rounded-lg px-2.5 py-1 border cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400 ${
                            item.discussionStatus === 'Needs Discussion'
                              ? 'bg-amber-100 text-amber-950 border-amber-300 font-bold'
                              : item.discussionStatus === 'Approved by Purchase'
                              ? 'bg-blue-100 text-blue-950 border-blue-300'
                              : item.discussionStatus === 'PO Raised'
                              ? 'bg-emerald-100 text-emerald-950 border-emerald-300 font-bold'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          <option value="Needs Discussion">Needs Discussion</option>
                          <option value="Approved by Purchase">Approved by Purchase</option>
                          <option value="PO Raised">PO Raised</option>
                          <option value="Supplier Confirmed">Supplier Confirmed</option>
                          <option value="Deferred">Deferred</option>
                        </select>
                      </td>

                      {/* 9. Meeting Notes & Actions */}
                      <td className="py-3 px-3.5">
                        {editingNoteId === item.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={currentNoteText}
                              onChange={(e) => setCurrentNoteText(e.target.value)}
                              className="w-full text-xs px-2.5 py-1 border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                              placeholder="Add meeting decision, vendor notes..."
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveNote(item.id)}
                              className="px-2.5 py-1 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingNoteId(null)}
                              className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setEditingNoteId(item.id);
                              setCurrentNoteText(item.discussionNotes || '');
                            }}
                            className="group flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer border border-transparent hover:border-slate-200 transition-colors"
                            title="Click to edit discussion notes"
                          >
                            <span className="text-xs text-slate-700 truncate max-w-[280px]">
                              {item.discussionNotes || (
                                <span className="text-slate-400 italic">Click to add decision note...</span>
                              )}
                            </span>
                            <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-slate-700 shrink-0 opacity-40 group-hover:opacity-100" />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info in workspace */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Restocking priorities and notes are saved in real-time. Export with one click to distribute to suppliers.
            </span>
          </div>

          <button
            type="button"
            onClick={() => exportReorderDecisionsToExcel(stockRecords, orders)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Spreadsheet (.xlsx)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
