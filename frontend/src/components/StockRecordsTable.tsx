import React, { useState, useMemo } from 'react';
import { StockRecord, Order } from '../types';
import { getUpdatedStockRecord, calculateStockOverviewMetrics } from '../utils/stockData';
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit2,
  X,
  Layers,
  Sparkles,
  DollarSign
} from 'lucide-react';

interface StockRecordsTableProps {
  stockRecords: StockRecord[];
  orders: Order[];
  onUpdateStock: (updatedRecords: StockRecord[]) => void;
  onNavigateToReorder?: () => void;
}

type StockSortField =
  | 'name'
  | 'category'
  | 'availableStock'
  | 'stockQuantity'
  | 'minimumLimit'
  | 'maximumLimit'
  | 'unavailableStock'
  | 'shortageQuantity'
  | 'status';

export const StockRecordsTable: React.FC<StockRecordsTableProps> = ({
  stockRecords,
  orders,
  onUpdateStock,
  onNavigateToReorder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'belowMin' | 'shortage' | 'optimal' | 'overstock'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<StockSortField>('shortageQuantity');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Edit stock modal state
  const [editingItem, setEditingItem] = useState<StockRecord | null>(null);
  const [newAvailable, setNewAvailable] = useState<number>(0);
  const [newUnavailable, setNewUnavailable] = useState<number>(0);
  const [newMinLimit, setNewMinLimit] = useState<number>(0);
  const [newMaxLimit, setNewMaxLimit] = useState<number>(0);

  // Synchronize stock records with live customer orders
  const computedStockList = useMemo(() => {
    return stockRecords.map((item) => getUpdatedStockRecord(item, orders));
  }, [stockRecords, orders]);

  // Overall stock metrics
  const overviewMetrics = useMemo(() => {
    return calculateStockOverviewMetrics(stockRecords, orders);
  }, [stockRecords, orders]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(stockRecords.map((s) => s.category));
    return Array.from(set).sort();
  }, [stockRecords]);

  // Filtered stock items
  const filteredStock = useMemo(() => {
    return computedStockList.filter((item) => {
      const matchesSearch =
        searchQuery === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;

      let matchesStatus = true;
      if (statusFilter === 'belowMin') {
        matchesStatus = item.availableStock < item.minimumLimit;
      } else if (statusFilter === 'shortage') {
        matchesStatus = item.shortageQuantity > 0;
      } else if (statusFilter === 'optimal') {
        matchesStatus = item.availableStock >= item.minimumLimit && item.availableStock <= item.maximumLimit;
      } else if (statusFilter === 'overstock') {
        matchesStatus = item.availableStock > item.maximumLimit;
      }

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [computedStockList, searchQuery, categoryFilter, statusFilter]);

  // Sorted stock items
  const sortedStock = useMemo(() => {
    return [...filteredStock].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return 0;
    });
  }, [filteredStock, sortField, sortAsc]);

  const handleSort = (field: StockSortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'name' || field === 'category');
    }
  };

  const renderSortIcon = (field: StockSortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-80" />;
    }
    return sortAsc ? (
      <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
    );
  };

  const openEditModal = (item: StockRecord) => {
    setEditingItem(item);
    setNewAvailable(item.availableStock);
    setNewUnavailable(item.unavailableStock);
    setNewMinLimit(item.minimumLimit);
    setNewMaxLimit(item.maximumLimit);
  };

  const handleSaveStockEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const updated = stockRecords.map((rec) => {
      if (rec.id === editingItem.id) {
        return {
          ...rec,
          availableStock: Math.max(0, Number(newAvailable)),
          unavailableStock: Math.max(0, Number(newUnavailable)),
          minimumLimit: Math.max(1, Number(newMinLimit)),
          maximumLimit: Math.max(Number(newMinLimit), Number(newMaxLimit)),
        };
      }
      return rec;
    });

    onUpdateStock(updated);
    setEditingItem(null);
  };

  return (
    <div id="stock-records-section" className="space-y-4">
      {/* Top Stock Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Metric 1: Total SKUs */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total SKUs</span>
            <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-black font-mono text-slate-900">
            {overviewMetrics.totalItems}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400">Tracked inventory items</div>
        </div>

        {/* Metric 2: Below Minimum Limit (YELLOW ALERT) */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'belowMin' ? 'all' : 'belowMin')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            overviewMetrics.itemsBelowMinimum > 0
              ? 'bg-amber-50/50 border-amber-200 hover:bg-amber-100/60'
              : 'bg-white border-slate-200'
          }`}
          title="Click to filter items below minimum limit"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-900 uppercase tracking-wider flex items-center gap-1">
              <span>Below Min Limit</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-100 text-amber-800 font-medium border border-amber-200">
                Low Stock
              </span>
            </span>
            <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-bold font-mono text-amber-950 flex items-center gap-2">
            <span>{overviewMetrics.itemsBelowMinimum}</span>
            <span className="text-xs font-normal text-amber-800 font-sans">items critical</span>
          </div>
          <div className="mt-0.5 text-[11px] text-amber-800/80">
            Available stock &lt; minimum limit
          </div>
        </div>

        {/* Metric 3: Total Available Stock */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Available Stock</span>
            <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-bold font-mono text-slate-900">
            {overviewMetrics.totalAvailableStockUnits.toLocaleString()}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400">Ready for immediate dispatch</div>
        </div>

        {/* Metric 4: Unavailable Stock (Reserved/Damaged) */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Unavailable Stock</span>
            <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-bold font-mono text-slate-800">
            {overviewMetrics.totalUnavailableUnits.toLocaleString()}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400">Reserved for pending orders</div>
        </div>

        {/* Metric 5: Stock Shortage Units */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Shortage</span>
            <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-bold font-mono text-slate-800">
            {overviewMetrics.totalShortageUnits.toLocaleString()}
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            {onNavigateToReorder ? (
              <button
                type="button"
                onClick={onNavigateToReorder}
                className="hover:underline text-slate-700 font-medium inline-flex items-center gap-1"
              >
                <span>View Reorder Decisions &rarr;</span>
              </button>
            ) : (
              'Deficit to meet safety'
            )}
          </div>
        </div>
      </div>

      {/* Main Stock Table Card */}
      <div id="stock-records-table-card" className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Control Bar: Search, Category, Status Filters */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-slate-900 text-white rounded-xl shadow-xs">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <h2 id="stock-records-heading" className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Stock Records & Inventory Control</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-slate-200 text-slate-800">
                    {filteredStock.length} SKUs
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live on-hand availability, safety thresholds, and warehouse shortage calculations
                </p>
              </div>
            </div>

            {/* Quick action button to Reorder Decisions */}
            {onNavigateToReorder && (
              <button
                type="button"
                id="btn-goto-reorder-decisions"
                onClick={onNavigateToReorder}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl transition-colors shadow-2xs shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>Open Reorder & Shortage Decisions</span>
              </button>
            )}
          </div>

          {/* Filter and Search Controls */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 pt-1">
            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all shrink-0 ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                All Stock ({stockRecords.length})
              </button>

              {/* Yellow Alert Filter Button */}
              <button
                type="button"
                id="btn-filter-below-min-yellow"
                onClick={() => setStatusFilter('belowMin')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 ${
                  statusFilter === 'belowMin'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
                    : 'bg-white text-amber-800 border border-amber-200/80 hover:bg-amber-50/70'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                <span>Below Min Limit ({overviewMetrics.itemsBelowMinimum})</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('shortage')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 ${
                  statusFilter === 'shortage'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
                }`}
              >
                Shortage Deficit ({overviewMetrics.itemsInShortage})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('optimal')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 ${
                  statusFilter === 'optimal'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Optimal Stock
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('overstock')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 ${
                  statusFilter === 'overstock'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Overstock
              </button>
            </div>

            {/* Search and Category Filter Dropdown */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Category Select */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Search Bar */}
              <div className="relative min-w-[200px] flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search item, SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* The Exact Table with all requested fields */}
        <div className="overflow-x-auto">
          <table id="stock-records-table" className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                {/* 1. Item Name & SKU */}
                <th
                  onClick={() => handleSort('name')}
                  className="py-3 px-3.5 cursor-pointer select-none group hover:bg-slate-200/60 transition-colors min-w-[240px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Item Name & SKU</span>
                    {renderSortIcon('name')}
                  </div>
                </th>

                {/* 2. Category */}
                <th
                  onClick={() => handleSort('category')}
                  className="py-3 px-3 cursor-pointer select-none group hover:bg-slate-200/60 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Category</span>
                    {renderSortIcon('category')}
                  </div>
                </th>

                {/* 3. Available Stock */}
                <th
                  onClick={() => handleSort('availableStock')}
                  className="py-3 px-3 text-right cursor-pointer select-none group hover:bg-slate-200/60 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Available Stock</span>
                    {renderSortIcon('availableStock')}
                  </div>
                </th>

                {/* 4. Stock Quantity (Total) */}
                <th
                  onClick={() => handleSort('stockQuantity')}
                  className="py-3 px-3 text-right cursor-pointer select-none group hover:bg-slate-200/60 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Stock Quantity</span>
                    {renderSortIcon('stockQuantity')}
                  </div>
                </th>

                {/* 5. Minimum Limit */}
                <th
                  onClick={() => handleSort('minimumLimit')}
                  className="py-3 px-3 text-right cursor-pointer select-none group hover:bg-slate-200/60 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Min Limit</span>
                    {renderSortIcon('minimumLimit')}
                  </div>
                </th>

                {/* 6. Maximum Limit */}
                <th
                  onClick={() => handleSort('maximumLimit')}
                  className="py-3 px-3 text-right cursor-pointer select-none group hover:bg-slate-200/60 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Max Limit</span>
                    {renderSortIcon('maximumLimit')}
                  </div>
                </th>

                {/* 7. Unavailable Stock */}
                <th
                  onClick={() => handleSort('unavailableStock')}
                  className="py-3 px-3 text-right cursor-pointer select-none group hover:bg-slate-200/60 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Unavailable Stock</span>
                    {renderSortIcon('unavailableStock')}
                  </div>
                </th>

                {/* 8. Shortage of Stock */}
                <th
                  onClick={() => handleSort('shortageQuantity')}
                  className="py-3 px-3 text-right cursor-pointer select-none group hover:bg-slate-200/60 transition-colors text-rose-800"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Shortage of Stock</span>
                    {renderSortIcon('shortageQuantity')}
                  </div>
                </th>

                {/* 9. Status of Stock */}
                <th
                  onClick={() => handleSort('status')}
                  className="py-3 px-3 cursor-pointer select-none group hover:bg-slate-200/60 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Status of Stock</span>
                    {renderSortIcon('status')}
                  </div>
                </th>

                {/* 10. Action (Edit) */}
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200/70 font-sans">
              {sortedStock.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No stock records found matching filter criteria.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                        setCategoryFilter('all');
                      }}
                      className="mt-2 px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                    >
                      Reset Filters
                    </button>
                  </td>
                </tr>
              ) : (
                sortedStock.map((item) => {
                  const isBelowMin = item.availableStock < item.minimumLimit;
                  const isCritical = item.availableStock === 0;

                  // CRITICAL USER DIRECTIVE:
                  // "show yellow color display if available stock is less than the minimum quantity ."
                  let rowClasses = 'hover:bg-slate-50/70 transition-colors border-l-2 border-l-transparent';
                  if (isBelowMin) {
                    // Distinct, decent yellow/amber color display
                    rowClasses = 'bg-amber-50/50 hover:bg-amber-100/60 border-l-2 border-l-amber-500 text-slate-900 transition-colors';
                  }

                  return (
                    <tr key={item.id} id={`stock-row-${item.id}`} className={rowClasses}>
                      {/* 1. Item Name & SKU */}
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                          <span className="bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                            {item.sku}
                          </span>
                          <span>•</span>
                          <span>Unit: {item.unit}</span>
                          <span>•</span>
                          <span>Cost: ₹{item.unitCost}</span>
                        </div>
                      </td>

                      {/* 2. Category */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {item.category}
                        </span>
                      </td>

                      {/* 3. Available Stock - WITH YELLOW HIGHLIGHT IF BELOW MINIMUM */}
                      <td className="py-3 px-3 text-right font-mono font-semibold">
                        {isBelowMin ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-semibold border border-amber-300 text-xs">
                            <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                            <span>{item.availableStock.toLocaleString()} {item.unit}</span>
                          </span>
                        ) : (
                          <span className="text-slate-900 font-semibold">
                            {item.availableStock.toLocaleString()} {item.unit}
                          </span>
                        )}
                      </td>

                      {/* 4. Stock Quantity (Total = Available + Unavailable) */}
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">
                        {item.stockQuantity.toLocaleString()} {item.unit}
                      </td>

                      {/* 5. Minimum Limit */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {item.minimumLimit.toLocaleString()} {item.unit}
                      </td>

                      {/* 6. Maximum Limit */}
                      <td className="py-3 px-3 text-right font-mono text-slate-500">
                        {item.maximumLimit.toLocaleString()} {item.unit}
                      </td>

                      {/* 7. Unavailable Stock */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {item.unavailableStock > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 font-medium text-slate-700 border border-slate-200">
                            {item.unavailableStock.toLocaleString()} {item.unit}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>

                      {/* 8. Shortage of Stock */}
                      <td className="py-3 px-3 text-right font-mono font-medium">
                        {item.shortageQuantity > 0 ? (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-xs">
                            -{item.shortageQuantity.toLocaleString()} {item.unit}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>

                      {/* 9. Status of Stock - YELLOW COLOR DISPLAY IF BELOW MINIMUM */}
                      <td className="py-3 px-3">
                        {isCritical ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertCircle className="w-3 h-3" /> Out of Stock
                          </span>
                        ) : isBelowMin ? (
                          // Decent yellow color display status
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-100 text-amber-900 border border-amber-300">
                            <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                            <span>Low Stock (&lt; Min)</span>
                          </span>
                        ) : item.status === 'Overstock' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            Overstock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            <CheckCircle2 className="w-3 h-3 text-slate-500" /> Optimal
                          </span>
                        )}
                      </td>

                      {/* 10. Action */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-blue-700 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg transition-colors shadow-2xs"
                          title="Edit stock levels or min/max limit"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Adjust</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Stock Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-600 text-white rounded-lg">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Adjust Stock & Safety Limits</h3>
                  <p className="text-xs text-slate-500 truncate max-w-[280px]">{editingItem.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStockEdit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Available Stock ({editingItem.unit})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newAvailable}
                    onChange={(e) => setNewAvailable(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                  <span className="text-[10px] text-slate-500">Ready for dispatch</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Unavailable Stock ({editingItem.unit})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newUnavailable}
                    onChange={(e) => setNewUnavailable(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                  <span className="text-[10px] text-slate-500">Reserved/inspection</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-yellow-900 mb-1">
                    Minimum Limit (Safety)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newMinLimit}
                    onChange={(e) => setNewMinLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-yellow-50 border border-yellow-300 rounded-xl focus:ring-2 focus:ring-yellow-500 font-mono"
                    required
                  />
                  <span className="text-[10px] text-yellow-800">Triggers Yellow Alert</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Maximum Limit (Capacity)
                  </label>
                  <input
                    type="number"
                    min={newMinLimit}
                    value={newMaxLimit}
                    onChange={(e) => setNewMaxLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                  <span className="text-[10px] text-slate-500">Warehouse cap</span>
                </div>
              </div>

              {/* Live Preview Previewing Status */}
              <div className={`p-3 rounded-xl border text-xs ${
                newAvailable < newMinLimit
                  ? 'bg-yellow-100/80 border-yellow-400 text-yellow-900'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-900'
              }`}>
                <div className="font-bold flex items-center gap-1.5">
                  {newAvailable < newMinLimit ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-yellow-800" />
                      <span>Yellow Alert Triggered: Available Stock ({newAvailable}) &lt; Minimum Limit ({newMinLimit})</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Stock Status: Optimal &amp; Above Minimum Safety Threshold</span>
                    </>
                  )}
                </div>
                <div className="mt-1 text-[11px] font-mono">
                  Total Stock Quantity = {Number(newAvailable) + Number(newUnavailable)} {editingItem.unit}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
                >
                  Save Stock Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
