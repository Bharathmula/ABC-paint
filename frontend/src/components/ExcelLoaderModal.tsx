import React, { useState, useRef } from 'react';
import { Order } from '../types';
import {
  parseExcelFile,
  downloadOrdersImportTemplate,
  getOrderDeduplicationKey,
  ParseExcelResult,
} from '../utils/excelParser';
import {
  X,
  ArrowLeft,
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Layers,
  RefreshCw,
  Info,
  Database,
} from 'lucide-react';

interface ExcelLoaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrdersLoaded: (
    orders: Order[],
    sourceName: string,
    mode: 'merge' | 'replace',
    dedupInfo: { internalRemoved: number; existingDuplicates: number }
  ) => void;
  currentOrders: Order[];
  currentOrderCount: number;
}

export const ExcelLoaderModal: React.FC<ExcelLoaderModalProps> = ({
  isOpen,
  onClose,
  onOrdersLoaded,
  currentOrders,
  currentOrderCount,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<(ParseExcelResult & { fileName: string }) | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>(currentOrderCount > 0 ? 'merge' : 'replace');
  const [showDuplicateDetails, setShowDuplicateDetails] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileProcess = async (file: File) => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const buffer = await file.arrayBuffer();
      const result = parseExcelFile(buffer);

      if (result.error || result.orders.length === 0) {
        setErrorMessage(result.error || 'No valid order rows found in the uploaded file. Please verify columns.');
        setIsLoading(false);
        return;
      }

      setParsedResult({
        ...result,
        fileName: file.name,
      });
      // Default to merge if user already has orders
      setImportMode(currentOrderCount > 0 ? 'merge' : 'replace');
      setIsLoading(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while reading the Excel file.');
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  // Calculate duplicate overlaps with current dataset
  let existingDuplicatesCount = 0;
  let netNewOrdersCount = 0;
  const existingVouchersMatched: string[] = [];

  if (parsedResult) {
    const existingKeys = new Set(currentOrders.map(getOrderDeduplicationKey));
    parsedResult.orders.forEach((newOrder) => {
      const key = getOrderDeduplicationKey(newOrder);
      if (existingKeys.has(key)) {
        existingDuplicatesCount++;
        existingVouchersMatched.push(newOrder.voucherNumber || newOrder.partyOrderNumber || newOrder.companyName);
      } else {
        netNewOrdersCount++;
      }
    });
  }

  const finalProjectedCount = parsedResult
    ? importMode === 'merge'
      ? currentOrderCount + netNewOrdersCount
      : parsedResult.orders.length
    : currentOrderCount;

  const totalDupsFiltered = parsedResult
    ? parsedResult.internalDuplicatesCount + (importMode === 'merge' ? existingDuplicatesCount : 0)
    : 0;

  const handleConfirmImport = () => {
    if (parsedResult) {
      onOrdersLoaded(parsedResult.orders, parsedResult.fileName, importMode, {
        internalRemoved: parsedResult.internalDuplicatesCount,
        existingDuplicates: existingDuplicatesCount,
      });
      onClose();
    }
  };



  return (
    <div
      id="excel-loader-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="excel-loader-modal-container"
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="excel-loader-back-btn"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors shadow-2xs group shrink-0"
              title="Return to dashboard"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-slate-800 transition-transform group-hover:-translate-x-0.5" />
              <span>Back</span>
            </button>
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 id="excel-loader-title" className="text-base sm:text-lg font-semibold text-slate-900">
                Load Excel Sheet into Dashboard
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload order sheets (.xlsx, .xls, .csv) with automatic duplicate detection and data merge
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Quick Action banner */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-slate-500 shrink-0" />
              <span>Need the standard Orders import format?</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                id="btn-download-template"
                onClick={downloadOrdersImportTemplate}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium rounded-lg transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                Orders Import Template
              </button>

            </div>
          </div>

          {/* Upload Drop Zone */}
          {!parsedResult ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                dragActive
                  ? 'border-slate-800 bg-slate-100 scale-[0.99]'
                  : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="p-3.5 bg-white rounded-full shadow-2xs border border-slate-200 mb-3 text-slate-600">
                <UploadCloud className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-slate-800">
                {isLoading ? 'Reading and deduplicating Excel sheet...' : 'Click to browse or drag & drop Excel sheet here'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports Microsoft Excel (.xlsx, .xls) and CSV with automatic duplicate removal
              </p>
            </div>
          ) : (
            /* Analysis & Confirmation View */
            <div className="space-y-4">
              {/* File details strip */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-slate-600" />
                  <span className="font-semibold text-sm text-slate-900">{parsedResult.fileName}</span>
                </div>
                <button
                  onClick={() => setParsedResult(null)}
                  className="text-xs text-rose-600 hover:underline font-medium"
                >
                  Choose another file
                </button>
              </div>

              {/* Data Destination & Mode Selector Card */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  <Database className="w-4 h-4 text-slate-600" />
                  <span>Choose Where Data Goes:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: Merge / Append */}
                  <label
                    className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                      importMode === 'merge'
                        ? 'bg-slate-50 border-slate-900 ring-1 ring-slate-900'
                        : 'bg-white border-slate-200 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="importMode"
                          value="merge"
                          checked={importMode === 'merge'}
                          onChange={() => setImportMode('merge')}
                          className="text-slate-900 focus:ring-slate-900"
                        />
                        <span className="font-semibold text-xs text-slate-900 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-slate-700" />
                          Merge with Existing Data
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Keeps your current <strong>{currentOrderCount}</strong> orders safe in local storage. Appends new non-duplicate orders, and updates existing voucher numbers without double-counting.
                    </p>
                  </label>

                  {/* Option 2: Replace */}
                  <label
                    className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                      importMode === 'replace'
                        ? 'bg-slate-50 border-slate-900 ring-1 ring-slate-900'
                        : 'bg-white border-slate-200 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <input
                        type="radio"
                        name="importMode"
                        value="replace"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="text-slate-900 focus:ring-slate-900"
                      />
                      <span className="font-semibold text-xs text-slate-900 flex items-center gap-1">
                        <RefreshCw className="w-3.5 h-3.5 text-slate-700" />
                        Replace Entire Dataset
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Clears existing records and replaces the dashboard exclusively with the <strong>{parsedResult.orders.length}</strong> unique orders from this Excel sheet.
                    </p>
                  </label>
                </div>
              </div>

              {/* Deduplication & Impact Audit Breakdown */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span>Deduplication &amp; Integrity Audit</span>
                  </div>
                  <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg">
                    {totalDupsFiltered > 0 ? `${totalDupsFiltered} Duplicates Resolved` : 'No Duplicates Found'}
                  </span>
                </div>

                {/* Metrics 4-grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">File Rows</div>
                    <div className="text-base font-bold font-mono text-slate-900 mt-0.5">{parsedResult.totalRows}</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Sheet Dups Removed</div>
                    <div className="text-base font-bold font-mono text-amber-700 mt-0.5">
                      {parsedResult.internalDuplicatesCount}
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      {importMode === 'merge' ? 'Matched Existing' : 'Unique New'}
                    </div>
                    <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                      {importMode === 'merge' ? existingDuplicatesCount : parsedResult.orders.length}
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Final Total Orders</div>
                    <div className="text-base font-bold font-mono text-emerald-700 mt-0.5">{finalProjectedCount}</div>
                  </div>
                </div>

                {/* Explanation note */}
                <div className="text-[11px] text-slate-600 flex items-start gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                  <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    {importMode === 'merge' ? (
                      <span>
                        <strong>Merge behavior:</strong> Your previous <strong>{currentOrderCount}</strong> orders will remain in browser local storage. <strong>{netNewOrdersCount}</strong> new orders will be added. <strong>{existingDuplicatesCount}</strong> records matching existing Voucher # / PO # will be updated without inflating quantities or financial amounts.
                      </span>
                    ) : (
                      <span>
                        <strong>Replace behavior:</strong> The previous dataset will be substituted by this sheet. <strong>{parsedResult.orders.length}</strong> unique orders will become the active dashboard dataset.
                      </span>
                    )}
                  </div>
                </div>

                {/* Expandable duplicate details */}
                {(parsedResult.duplicateVouchers.length > 0 || existingVouchersMatched.length > 0) && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowDuplicateDetails(!showDuplicateDetails)}
                      className="text-[11px] text-slate-700 hover:text-slate-900 font-medium underline"
                    >
                      {showDuplicateDetails ? 'Hide duplicate details' : 'View detected duplicate identifiers'}
                    </button>
                    {showDuplicateDetails && (
                      <div className="mt-2 p-2.5 bg-white rounded-xl border border-slate-200 text-[11px] space-y-1.5">
                        {parsedResult.duplicateVouchers.length > 0 && (
                          <div>
                            <span className="font-semibold text-slate-700">Internal sheet duplicates: </span>
                            <span className="text-slate-600">{parsedResult.duplicateVouchers.join(', ')}</span>
                          </div>
                        )}
                        {existingVouchersMatched.length > 0 && importMode === 'merge' && (
                          <div>
                            <span className="font-semibold text-slate-700">Matched existing dashboard vouchers: </span>
                            <span className="text-slate-600">{existingVouchersMatched.slice(0, 10).join(', ')}{existingVouchersMatched.length > 10 ? ` + ${existingVouchersMatched.length - 10} more` : ''}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sample preview table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Preview of Rows in this Sheet (First 3):</span>
                  <span className="text-slate-500 font-mono font-normal">
                    Total Value: ₹{parsedResult.orders.reduce((sum, o) => sum + o.value, 0).toLocaleString()}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                      <tr>
                        <th className="p-2">Company Name</th>
                        <th className="p-2">Voucher #</th>
                        <th className="p-2">Date</th>
                        <th className="p-2 text-right">Order Qty</th>
                        <th className="p-2 text-right">Issue</th>
                        <th className="p-2 text-right">Pending</th>
                        <th className="p-2 text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedResult.orders.slice(0, 3).map((o, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-medium text-slate-900 truncate max-w-[140px]">{o.companyName}</td>
                          <td className="p-2 font-mono text-slate-700">{o.voucherNumber}</td>
                          <td className="p-2">{o.date}</td>
                          <td className="p-2 text-right font-mono">{o.orderQuantity}</td>
                          <td className="p-2 text-right font-mono text-slate-700">{o.issue}</td>
                          <td className="p-2 text-right font-mono text-amber-800">{o.pending}</td>
                          <td className="p-2 text-right font-mono font-semibold">₹{o.value.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong>Error importing file: </strong>
                {errorMessage}
              </div>
            </div>
          )}

          {/* Recognized Columns Guide */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 mb-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
              Auto-Recognized Columns:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-1 gap-x-2 text-[11px] text-slate-600">
              <div>• <strong>Company Name</strong> (or Party)</div>
              <div>• <strong>Voucher Number</strong> (or Vocher)</div>
              <div>• <strong>Date</strong> (Order Date)</div>
              <div>• <strong>Order Quantity</strong> (or Qty)</div>
              <div>• <strong>Issue</strong> (Dispatched)</div>
              <div>• <strong>Pending</strong> (Balance)</div>
              <div>• <strong>Rate</strong> (Unit Price)</div>
              <div>• <strong>Value</strong> (Amount)</div>
              <div>• <strong>Due Date</strong> (Deadline)</div>
              <div>• <strong>Party Order Number</strong> (PO #)</div>
              <div>• <strong>Area</strong> (Region / Location)</div>
              <div>• <strong>Sales Person</strong> (Executive)</div>
              <div>• <strong>Items</strong> (Products &amp; Qty)</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50 flex-wrap gap-2">
          <button
            type="button"
            id="excel-loader-footer-back-btn"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>Cancel</span>
          </button>

          <div className="flex items-center gap-3">
            {parsedResult ? (
              <button
                type="button"
                id="btn-apply-excel-data"
                onClick={handleConfirmImport}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-2xs transition-colors"
              >
                <span>
                  {importMode === 'merge'
                    ? `Merge & Load ${parsedResult.orders.length} Orders (${finalProjectedCount} Total)`
                    : `Replace All with ${parsedResult.orders.length} Orders`}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
              </button>
            ) : (
              <div className="text-xs text-slate-500">
                Active dataset: <strong className="text-slate-800 font-mono">{currentOrderCount}</strong> orders
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
