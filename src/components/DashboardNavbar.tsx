import React from 'react';
import { FileSpreadsheet, UploadCloud, Download, Trash2 } from 'lucide-react';
import { downloadOrdersImportTemplate } from '../utils/excelParser';

interface DashboardNavbarProps {
  onOpenExcelLoader: () => void;
  onExportExcel: () => void;
  onClearAllData: () => void;
  currentSource: string;
  orderCount: number;
}

export const DashboardNavbar: React.FC<DashboardNavbarProps> = ({
  onOpenExcelLoader,
  onExportExcel,
  onClearAllData,
  currentSource,
  orderCount,
}) => {
  return (
    <header id="dashboard-navbar" className="bg-slate-900 text-slate-100 border-b border-slate-800 shadow-xs sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Brand & Context */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-800 text-slate-300 rounded-xl border border-slate-700/80 shadow-2xs">
            <FileSpreadsheet className="w-5 h-5 text-slate-300" />
          </div>
          <div>
            <div id="brand-company-header" className="text-xs sm:text-sm font-bold tracking-wider text-sky-300 uppercase flex items-center gap-1.5 leading-none mb-1">
              <span>ABC PAINTS</span>
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block"></span>
              <span className="text-[10px] text-slate-400 font-medium tracking-normal normal-case">Paint &amp; Industrial Coatings</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 id="app-heading" className="text-base sm:text-lg font-semibold tracking-tight text-white">
                Orders &amp; Inventory Dashboard
              </h1>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                orderCount > 0
                  ? 'bg-slate-800 text-slate-300 border-slate-700'
                  : 'bg-rose-950/40 text-rose-300 border-rose-800/60'
              }`}>
                {orderCount > 0 ? 'Data Loaded' : 'Storage Empty / Cleared'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
              <span>Source: <strong className="text-slate-300 font-medium">{currentSource}</strong></span>
              <span>•</span>
              <span className="font-mono text-slate-300">{orderCount}</span> orders
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Download Template button */}
          <button
            type="button"
            id="navbar-download-template-btn"
            onClick={downloadOrdersImportTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors shadow-2xs"
            title="Download blank Orders import template (.xlsx)"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            Orders Import Template
          </button>

          {/* Export current view button (only when orders exist) */}
          {orderCount > 0 && (
            <button
              type="button"
              id="navbar-export-excel-btn"
              onClick={onExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors shadow-2xs"
              title="Export currently filtered orders to Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              Export Orders Data
            </button>
          )}

          {/* Clear Stored Data button */}
          <button
            type="button"
            id="navbar-clear-data-btn"
            onClick={onClearAllData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-200 bg-slate-800/60 hover:bg-slate-800 rounded-xl border border-rose-900/40 hover:border-rose-700/60 transition-colors shadow-2xs"
            title="Completely remove all stored orders and inventory records"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Clear Stored Data</span>
          </button>

          {/* Load Excel Sheet Primary Button */}
          <button
            type="button"
            id="navbar-load-excel-btn"
            onClick={onOpenExcelLoader}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl shadow-2xs transition-colors border border-slate-600 hover:border-slate-500"
          >
            <UploadCloud className="w-4 h-4 text-sky-400" />
            <span>Load Excel Sheet</span>
          </button>
        </div>
      </div>
    </header>
  );
};

