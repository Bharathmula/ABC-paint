import React, { useState, useMemo } from 'react';
import { FilterCategory, Order } from '../types';
import { X, Search, Plus, Check, CheckSquare, Square, MapPin, Building2, Calendar, UserCheck, Package, RotateCcw } from 'lucide-react';

interface CategoryFilterModalProps {
  category: FilterCategory | null;
  orders: Order[];
  selectedValues: string[];
  customValues: string[];
  onToggleValue: (val: string) => void;
  onSelectAll: (vals: string[]) => void;
  onClearCategory: () => void;
  onAddCustomValue: (val: string) => void;
  onClose: () => void;
}

export const CategoryFilterModal: React.FC<CategoryFilterModalProps> = ({
  category,
  orders,
  selectedValues,
  customValues,
  onToggleValue,
  onSelectAll,
  onClearCategory,
  onAddCustomValue,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [newInputVal, setNewInputVal] = useState('');

  if (!category) return null;

  const categoryMeta = useMemo(() => {
    switch (category) {
      case 'areaClass':
        return {
          title: 'Area Type Filter', subtitle: 'Filter orders by Local or Transport area', icon: MapPin,
          placeholderAdd: 'Local or Transport', itemLabel: 'Area Type',
        };
      case 'area':
        return {
          title: 'Area Wise Filter',
          subtitle: 'Select one or more areas to filter orders, or add custom areas',
          icon: MapPin,
          placeholderAdd: 'e.g. Pune Central, Hyderabad Industrial...',
          itemLabel: 'Area',
        };
      case 'party':
        return {
          title: 'Party Wise Filter',
          subtitle: 'Filter by party or company name, or add a custom party name',
          icon: Building2,
          placeholderAdd: 'e.g. Asian Paints Dealer, Apex Builders...',
          itemLabel: 'Party / Company',
        };
      case 'deadline':
        return {
          title: 'Deadline Date Wise Filter',
          subtitle: 'Filter by order due dates or preset deadlines',
          icon: Calendar,
          placeholderAdd: 'e.g. YYYY-MM-DD or specific date...',
          itemLabel: 'Deadline Date',
        };
      case 'salesPerson':
        return {
          title: 'Sales Person Wise Filter',
          subtitle: 'Filter orders handled by specific sales representatives',
          icon: UserCheck,
          placeholderAdd: 'e.g. Rajesh Kumar, Priya Sharma...',
          itemLabel: 'Sales Person',
        };
      case 'item':
        return {
          title: 'Item Wise Filter',
          subtitle: 'Filter orders containing specific paint products or items',
          icon: Package,
          placeholderAdd: 'e.g. Zinc Primer 10L, Gloss White 20L...',
          itemLabel: 'Product / Item',
        };
    }
  }, [category]);

  // Extract all unique values present in data
  const dataOptions = useMemo(() => {
    const counts = new Map<string, number>();

    orders.forEach((o) => {
      if (category === 'areaClass') {
        counts.set('Local', 0); counts.set('Transport', 0);
      } else if (category === 'area') {
        const val = o.area || 'General';
        counts.set(val, (counts.get(val) || 0) + 1);
      } else if (category === 'party') {
        const val = o.companyName || 'Unknown Party';
        counts.set(val, (counts.get(val) || 0) + 1);
      } else if (category === 'salesPerson') {
        const val = o.salesPerson || 'Unassigned';
        counts.set(val, (counts.get(val) || 0) + 1);
      } else if (category === 'deadline') {
        const val = o.dueDate;
        counts.set(val, (counts.get(val) || 0) + 1);
      } else if (category === 'item') {
        o.items.forEach((it) => {
          const val = it.name.trim();
          counts.set(val, (counts.get(val) || 0) + 1);
        });
      }
    });

    // Add any custom items that might not be in current orders yet
    customValues.forEach((cv) => {
      if (!counts.has(cv)) {
        counts.set(cv, 0);
      }
    });

    return Array.from(counts.entries()).map(([name, count]) => ({
      name,
      count,
      isCustom: customValues.includes(name),
    }));
  }, [category, orders, customValues]);

  // Filtered by search
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return dataOptions;
    const q = searchTerm.toLowerCase().trim();
    return dataOptions.filter((opt) => opt.name.toLowerCase().includes(q));
  }, [dataOptions, searchTerm]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newInputVal.trim();
    if (!trimmed) return;
    onAddCustomValue(trimmed);
    setNewInputVal('');
  };

  const IconComponent = categoryMeta.icon;

  return (
    <div
      id="category-filter-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="category-filter-modal-container"
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <h3 id="category-modal-title" className="text-lg font-bold text-slate-900">
                {categoryMeta.title}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{categoryMeta.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add New Value Section */}
        <div className="p-4 bg-blue-50/40 border-b border-blue-100">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            + Add New {categoryMeta.itemLabel}
          </label>
          <form onSubmit={handleAddSubmit} className="flex gap-2">
            <input
              id="add-custom-category-input"
              type="text"
              value={newInputVal}
              onChange={(e) => setNewInputVal(e.target.value)}
              placeholder={categoryMeta.placeholderAdd}
              className="flex-1 px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400"
            />
            <button
              id="add-custom-category-btn"
              type="submit"
              disabled={!newInputVal.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Add & Select
            </button>
          </form>
        </div>

        {/* Search and Quick action bar */}
        <div className="p-4 pb-2 border-b border-slate-100 flex flex-col gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${categoryMeta.itemLabel.toLowerCase()}s...`}
              className="w-full pl-9 pr-3.5 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
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

          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="font-medium">
              Selected:{' '}
              <span className="text-blue-600 font-bold font-mono">
                {selectedValues.length}
              </span>{' '}
              of {dataOptions.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectAll(dataOptions.map((o) => o.name))}
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

        {/* Options list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1 max-h-72">
          {filteredOptions.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              No matching {categoryMeta.itemLabel.toLowerCase()} found. Use the input above to add a new one!
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = selectedValues.includes(opt.name);
              return (
                <label
                  key={opt.name}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors text-sm ${
                    isSelected
                      ? 'bg-blue-50/80 text-blue-900 font-medium'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate pr-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleValue(opt.name)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 rounded-sm cursor-pointer"
                    />
                    <span className="truncate">{opt.name}</span>
                    {opt.isCustom && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Added
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-xs font-mono px-2 py-0.5 rounded-md ${
                      isSelected
                        ? 'bg-blue-200/60 text-blue-800 font-semibold'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {opt.count} {opt.count === 1 ? 'order' : 'orders'}
                  </span>
                </label>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={onClearCategory}
            className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-medium px-2 py-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
          >
            Apply Filters ({selectedValues.length})
          </button>
        </div>
      </div>
    </div>
  );
};
