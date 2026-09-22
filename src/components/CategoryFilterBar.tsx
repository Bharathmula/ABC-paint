import React, { useState } from 'react';
import { FilterCategory, ActiveFilters, Order } from '../types';
import { CategoryFilterDropdown } from './CategoryFilterDropdown';
import {
  MapPin,
  Building2,
  Calendar,
  UserCheck,
  Package,
  Filter,
  X,
  RotateCcw,
  Search,
  ChevronDown
} from 'lucide-react';

interface CategoryFilterBarProps {
  activeFilters: ActiveFilters;
  orders: Order[];
  onToggleValue: (category: FilterCategory, val: string) => void;
  onSelectAllCategory: (category: FilterCategory, vals: string[]) => void;
  onClearCategory: (category: FilterCategory) => void;
  onAddCustomValue: (category: FilterCategory, val: string) => void;
  onRemoveFilter: (category: FilterCategory, value: string) => void;
  onResetAllFilters: () => void;
  onSearchChange: (query: string) => void;
  onSelectCompany?: (companyName: string) => void;
}

export const CategoryFilterBar: React.FC<CategoryFilterBarProps> = ({
  activeFilters,
  orders,
  onToggleValue,
  onSelectAllCategory,
  onClearCategory,
  onAddCustomValue,
  onRemoveFilter,
  onResetAllFilters,
  onSearchChange,
  onSelectCompany,
}) => {
  const [openCategory, setOpenCategory] = useState<FilterCategory | null>(null);

  const totalActiveCount =
    activeFilters.areas.length +
    activeFilters.areaClasses.length +
    activeFilters.parties.length +
    activeFilters.deadlineRanges.length +
    activeFilters.salesPersons.length +
    activeFilters.items.length;

  // Get active values and custom values for open dropdown
  const currentSelectedValues = React.useMemo(() => {
    if (!openCategory) return [];
    if (openCategory === 'area') return activeFilters.areas;
    if (openCategory === 'areaClass') return activeFilters.areaClasses;
    if (openCategory === 'party') return activeFilters.parties;
    if (openCategory === 'deadline') return activeFilters.deadlineRanges;
    if (openCategory === 'salesPerson') return activeFilters.salesPersons;
    return activeFilters.items;
  }, [openCategory, activeFilters]);

  const currentCustomValues = React.useMemo(() => {
    if (!openCategory) return [];
    if (openCategory === 'area') return activeFilters.customAreas;
    if (openCategory === 'party') return activeFilters.customParties;
    if (openCategory === 'deadline') return activeFilters.customDeadlines;
    if (openCategory === 'salesPerson') return activeFilters.customSalesPersons;
    return activeFilters.customItems;
  }, [openCategory, activeFilters]);

  return (
    <div id="category-filters-container" className="space-y-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
      {/* Category Buttons & Search Row */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Buttons for Area, Party, Deadline Date, Sales Person, Item with Dropdown Indicator */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider pr-1 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-600" />
            Filters:
          </div>

          {/* 1. Area Wise Button - Opens Dropdown with All 10 Areas & Respective Details */}
          <button
            id="btn-area-wise-filter"
            type="button"
            onClick={() => setOpenCategory(openCategory === 'area' ? null : 'area')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all shrink-0 cursor-pointer ${
              openCategory === 'area'
                ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                : activeFilters.areas.length > 0
                ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-2xs'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
            title="Open dropdown to select areas and view details"
          >
            <MapPin className={`w-3.5 h-3.5 ${openCategory === 'area' ? 'text-white' : activeFilters.areas.length > 0 ? 'text-blue-600' : 'text-slate-500'}`} />
            <span>Area Wise</span>
            {activeFilters.areas.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${openCategory === 'area' ? 'bg-white text-blue-700' : 'bg-blue-600 text-white'}`}>
                {activeFilters.areas.length}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openCategory === 'area' ? 'rotate-180 text-white' : 'text-slate-400'}`} />
          </button>

          {(['Local','Transport'] as const).map(areaType=><button key={areaType} type="button" onClick={()=>onToggleValue('areaClass',areaType)} className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border shrink-0 ${activeFilters.areaClasses.includes(areaType)?'bg-blue-600 border-blue-600 text-white':'bg-blue-50 border-blue-200 text-blue-800'}`}><MapPin className="w-3.5 h-3.5"/>{areaType} Areas</button>)}

          {/* 2. Party Wise Button - Opens Dropdown with Parties & Details */}
          <button
            id="btn-party-wise-filter"
            type="button"
            onClick={() => setOpenCategory(openCategory === 'party' ? null : 'party')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all shrink-0 cursor-pointer ${
              openCategory === 'party'
                ? 'bg-purple-600 border-purple-600 text-white shadow-xs'
                : activeFilters.parties.length > 0
                ? 'bg-purple-50 border-purple-300 text-purple-900 shadow-2xs'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
            title="Open dropdown to select parties and view details"
          >
            <Building2 className={`w-3.5 h-3.5 ${openCategory === 'party' ? 'text-white' : activeFilters.parties.length > 0 ? 'text-purple-600' : 'text-slate-500'}`} />
            <span>Party Wise</span>
            {activeFilters.parties.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${openCategory === 'party' ? 'bg-white text-purple-700' : 'bg-purple-600 text-white'}`}>
                {activeFilters.parties.length}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openCategory === 'party' ? 'rotate-180 text-white' : 'text-slate-400'}`} />
          </button>

          {/* 3. Deadline Date Wise Button */}
          <button
            id="btn-deadline-wise-filter"
            type="button"
            onClick={() => setOpenCategory(openCategory === 'deadline' ? null : 'deadline')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all shrink-0 cursor-pointer ${
              openCategory === 'deadline'
                ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                : activeFilters.deadlineRanges.length > 0
                ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
            title="Open dropdown to select deadline dates and view details"
          >
            <Calendar className={`w-3.5 h-3.5 ${openCategory === 'deadline' ? 'text-white' : activeFilters.deadlineRanges.length > 0 ? 'text-amber-600' : 'text-slate-500'}`} />
            <span>Deadline Date Wise</span>
            {activeFilters.deadlineRanges.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${openCategory === 'deadline' ? 'bg-white text-amber-700' : 'bg-amber-600 text-white'}`}>
                {activeFilters.deadlineRanges.length}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openCategory === 'deadline' ? 'rotate-180 text-white' : 'text-slate-400'}`} />
          </button>

          {/* 4. Sales Person Wise Button */}
          <button
            id="btn-sales-person-wise-filter"
            type="button"
            onClick={() => setOpenCategory(openCategory === 'salesPerson' ? null : 'salesPerson')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all shrink-0 cursor-pointer ${
              openCategory === 'salesPerson'
                ? 'bg-teal-600 border-teal-600 text-white shadow-xs'
                : activeFilters.salesPersons.length > 0
                ? 'bg-teal-50 border-teal-300 text-teal-900 shadow-2xs'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
            title="Open dropdown to select sales persons and view details"
          >
            <UserCheck className={`w-3.5 h-3.5 ${openCategory === 'salesPerson' ? 'text-white' : activeFilters.salesPersons.length > 0 ? 'text-teal-600' : 'text-slate-500'}`} />
            <span>Sales Person Wise</span>
            {activeFilters.salesPersons.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${openCategory === 'salesPerson' ? 'bg-white text-teal-700' : 'bg-teal-600 text-white'}`}>
                {activeFilters.salesPersons.length}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openCategory === 'salesPerson' ? 'rotate-180 text-white' : 'text-slate-400'}`} />
          </button>

          {/* 5. Item Wise Button */}
          <button
            id="btn-item-wise-filter"
            type="button"
            onClick={() => setOpenCategory(openCategory === 'item' ? null : 'item')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all shrink-0 cursor-pointer ${
              openCategory === 'item'
                ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                : activeFilters.items.length > 0
                ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-2xs'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
            title="Open dropdown to select items and view details"
          >
            <Package className={`w-3.5 h-3.5 ${openCategory === 'item' ? 'text-white' : activeFilters.items.length > 0 ? 'text-rose-600' : 'text-slate-500'}`} />
            <span>Item Wise</span>
            {activeFilters.items.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${openCategory === 'item' ? 'bg-white text-rose-700' : 'bg-rose-600 text-white'}`}>
                {activeFilters.items.length}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openCategory === 'item' ? 'rotate-180 text-white' : 'text-slate-400'}`} />
          </button>
        </div>

        {/* Global search input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="search-orders-input"
            type="text"
            value={activeFilters.searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search company, voucher #, PO..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400"
          />
          {activeFilters.searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Chips / Badges */}
      {totalActiveCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Criteria:</span>

          {activeFilters.areaClasses.map((a) => (
            <span key={`area-class-${a}`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-900 border border-blue-200 rounded-lg text-[11px] font-semibold">
              {a} Areas<button onClick={() => onRemoveFilter('areaClass', a)}><X className="w-3 h-3" /></button>
            </span>
          ))}
          {activeFilters.areas.map((a) => (
            <span
              key={`area-${a}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-blue-50 text-blue-900 border border-blue-200 shadow-2xs"
            >
              <MapPin className="w-3 h-3 text-blue-600" />
              <span>Area: <strong>{a}</strong></span>
              <button
                type="button"
                onClick={() => onRemoveFilter('area', a)}
                className="text-blue-500 hover:text-blue-900 ml-0.5"
                title="Remove area filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {activeFilters.parties.map((p) => (
            <span
              key={`party-${p}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-purple-50 text-purple-900 border border-purple-200 shadow-2xs"
            >
              <Building2 className="w-3 h-3 text-purple-600" />
              <span>Party: <strong>{p}</strong></span>
              <button
                type="button"
                onClick={() => onRemoveFilter('party', p)}
                className="text-purple-500 hover:text-purple-900 ml-0.5"
                title="Remove party filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {activeFilters.deadlineRanges.map((d) => (
            <span
              key={`deadline-${d}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs"
            >
              <Calendar className="w-3 h-3 text-amber-600" />
              <span>Due: <strong>{d}</strong></span>
              <button
                type="button"
                onClick={() => onRemoveFilter('deadline', d)}
                className="text-amber-500 hover:text-amber-900 ml-0.5"
                title="Remove deadline filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {activeFilters.salesPersons.map((s) => (
            <span
              key={`sales-${s}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-teal-50 text-teal-900 border border-teal-200 shadow-2xs"
            >
              <UserCheck className="w-3 h-3 text-teal-600" />
              <span>Sales: <strong>{s}</strong></span>
              <button
                type="button"
                onClick={() => onRemoveFilter('salesPerson', s)}
                className="text-teal-500 hover:text-teal-900 ml-0.5"
                title="Remove sales person filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {activeFilters.items.map((i) => (
            <span
              key={`item-${i}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-rose-50 text-rose-900 border border-rose-200 shadow-2xs"
            >
              <Package className="w-3 h-3 text-rose-600" />
              <span>Item: <strong>{i}</strong></span>
              <button
                type="button"
                onClick={() => onRemoveFilter('item', i)}
                className="text-rose-500 hover:text-rose-900 ml-0.5"
                title="Remove item filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          <button
            type="button"
            onClick={onResetAllFilters}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors ml-auto"
          >
            <RotateCcw className="w-3 h-3" />
            Reset All ({totalActiveCount})
          </button>
        </div>
      )}

      {/* The Category Filter Dropdown View (Area, Party, Deadline, SalesPerson, Item) */}
      {openCategory && (
        <CategoryFilterDropdown
          category={openCategory}
          orders={orders}
          selectedValues={currentSelectedValues}
          customValues={currentCustomValues}
          onToggleValue={(val) => onToggleValue(openCategory, val)}
          onSelectAll={(vals) => onSelectAllCategory(openCategory, vals)}
          onClearCategory={() => onClearCategory(openCategory)}
          onAddCustomValue={(val) => onAddCustomValue(openCategory, val)}
          onClose={() => setOpenCategory(null)}
          onSelectCompany={onSelectCompany}
        />
      )}
    </div>
  );
};
