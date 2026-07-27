import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Trash2,
  RefreshCw,
  Calendar,
  Database,
  Bell,
  Layout,
  Package,
  Filter,
  FileSpreadsheet,
  ArrowRightLeft,
  Activity
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/Button';

import type { ReportFilterState } from '../components/reports/ReportFilterDrawer';
import { ReportFilterDrawer } from '../components/reports/ReportFilterDrawer';
import type { ReportOption } from '../components/reports/ReportCard';
import { ReportCard } from '../components/reports/ReportCard';

interface StoredReport {
  filename: string;
  size: number;
  created_at: string;
  url: string;
}

const initialFilters: ReportFilterState = {
  startDate: '',
  endDate: '',
  material: '',
  worker: '',
  rack: '',
  transactionType: 'all'
};

const targetReports: ReportOption[] = [
  {
    id: 'inventory-report',
    label: 'Inventory Report',
    desc: 'Complete ledger of active raw materials, current stock levels, safety threshold limits, and status.',
    icon: Package,
    colorClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    endpoint: 'inventory'
  },
  {
    id: 'transaction-report',
    label: 'Transaction Audit Report',
    desc: 'Audit trail log of inward intake and outward dispatch transactions filtered by worker and rack.',
    icon: ArrowRightLeft,
    colorClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    endpoint: 'transactions'
  },
  {
    id: 'material-report',
    label: 'Material Movement Report',
    desc: 'Aggregated inward, outward, and transfer movement counts categorized by material SKU.',
    icon: RefreshCw,
    colorClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    endpoint: 'movement'
  },
  {
    id: 'utilization-report',
    label: 'Warehouse Utilization Report',
    desc: 'Physical rack capacity allocations, occupancy percentages, and zone storage loads.',
    icon: Layout,
    colorClass: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    endpoint: 'racks'
  },
  {
    id: 'low-stock-report',
    label: 'Low Stock & Threshold Report',
    desc: 'Detailed log of safety low-stock warnings, critical deficits, and active alert thresholds.',
    icon: Bell,
    colorClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    endpoint: 'alerts'
  }
];

const Reports = () => {
  const [reportsHistory, setReportsHistory] = useState<StoredReport[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<any>(null);

  // Multi-criteria filter states
  const [filters, setFilters] = useState<ReportFilterState>(initialFilters);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  useEffect(() => {
    fetchHistory();
    fetchStats();
  }, []);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.getReports();
      if (res && res.status === 'success') {
        setReportsHistory(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load reports history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.getWarehouseStats();
      if (res && res.status === 'success') {
        setStats(res.data || res);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleAction = async (
    endpoint: string,
    action: 'preview' | 'download',
    reportId: string,
    format: 'pdf' | 'csv' | 'excel' = 'pdf'
  ) => {
    setActionLoading(true);
    const toastId = toast.loading(
      `${action === 'preview' ? 'Compiling preview' : 'Compiling download'} ${format.toUpperCase()} report...`
    );

    try {
      const queryParams: any = {
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        material: filters.material || undefined,
        worker: filters.worker || undefined,
        rack: filters.rack || undefined,
        transactionType: filters.transactionType !== 'all' ? filters.transactionType : undefined,
        format
      };

      const blob = await api.getReportPdf(endpoint, action, queryParams);

      if (blob.type === 'application/json') {
        const text = await blob.text();
        try {
          const parsed = JSON.parse(text);
          throw new Error(parsed.message || parsed.error || 'Failed to generate report');
        } catch (jsonErr) {
          throw new Error('Failed to parse report error.');
        }
      }

      let mimeType = 'application/pdf';
      let ext = 'pdf';
      if (format === 'csv') {
        mimeType = 'text/csv';
        ext = 'csv';
      } else if (format === 'excel') {
        mimeType = 'application/vnd.ms-excel';
        ext = 'xls';
      }

      const fileBlob = new Blob([blob], { type: mimeType });
      const blobUrl = URL.createObjectURL(fileBlob);

      if (action === 'preview' && format === 'pdf') {
        window.open(blobUrl, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${endpoint}_report_${Date.now()}.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      toast.success(`${format.toUpperCase()} report compiled successfully!`, { id: toastId });
      fetchHistory();
    } catch (err: any) {
      console.error('Report compilation failed:', err);
      toast.error(err?.message || `Failed to compile ${format.toUpperCase()} report`, { id: toastId });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteReport = async (filename: string) => {
    if (!window.confirm(`Are you sure you want to delete '${filename}' from server disk?`)) return;

    const toastId = toast.loading('Deleting report file...');
    try {
      const res = await api.deleteReport(filename);
      if (res && res.status === 'success') {
        toast.success('Report deleted successfully.', { id: toastId });
        fetchHistory();
      }
    } catch (err: any) {
      toast.error('Failed to delete report: ' + err.message, { id: toastId });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="text-cyan-500" />
            Management Report Center
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Generate on-demand analytical reports for Inventory, Transactions, Movements, Utilization, and Low Stock
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => setShowFilterDrawer(!showFilterDrawer)}
            className={`border text-xs font-semibold ${
              showFilterDrawer
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <Filter size={14} className="mr-2 text-cyan-500" />
            Filter Criteria
          </Button>

          <Button
            variant="ghost"
            onClick={() => {
              fetchHistory();
              fetchStats();
            }}
            className="bg-white border border-slate-200 text-xs font-semibold"
          >
            <RefreshCw size={14} className="mr-2 text-cyan-500" />
            Sync Logs
          </Button>
        </div>
      </div>

      {/* Filter Drawer */}
      <ReportFilterDrawer
        filters={filters}
        onFilterChange={setFilters}
        onClearFilters={() => setFilters(initialFilters)}
        isOpen={showFilterDrawer}
        onToggle={() => setShowFilterDrawer(!showFilterDrawer)}
      />

      {/* Telemetry Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 backdrop-blur-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Stored Archives</span>
          <h3 className="mt-1 text-2xl font-bold font-mono text-white">{reportsHistory.length}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Archived PDF/Excel Sheets</p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 backdrop-blur-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Stock Weight</span>
          <h3 className="mt-1 text-2xl font-bold font-mono text-cyan-400">
            {stats?.totalInventory !== undefined ? stats.totalInventory.toLocaleString() : 0} KG
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">Net Warehouse Inventory</p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 backdrop-blur-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rack Utilization</span>
          <h3 className="mt-1 text-2xl font-bold font-mono text-violet-400">
            {stats?.utilizationPercentage !== undefined ? stats.utilizationPercentage.toFixed(1) : 0}%
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">Average Physical Capacity</p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 backdrop-blur-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Alerts</span>
          <h3 className="mt-1 text-2xl font-bold font-mono text-rose-400">
            {stats?.criticalAlertsCount || 0}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">Safety Threshold Warnings</p>
        </div>
      </div>

      {/* 5 Target Report Templates Grid */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="text-cyan-400 h-5 w-5" />
            WMS Executive Report Templates
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Select a report template below to export filtered datasets in PDF or Microsoft Excel format
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {targetReports.map((option) => (
            <ReportCard
              key={option.id}
              option={option}
              onAction={handleAction}
              loading={actionLoading}
            />
          ))}
        </div>
      </div>

      {/* Stored Archives Table */}
      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 backdrop-blur-md transition-all shadow-xl space-y-4">
        <div>
          <h3 className="text-base font-bold text-white">Stored Report Archives</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Browse and download previously generated reports stored on server disk
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-3">Report File Name</th>
                <th className="py-3 px-3">Size</th>
                <th className="py-3 px-3">Created Date</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loadingHistory ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">Loading archives...</td>
                </tr>
              ) : reportsHistory.length > 0 ? (
                reportsHistory.map((report, idx) => {
                  const isExcel = report.filename.toLowerCase().endsWith('.xls');
                  const isCSV = report.filename.toLowerCase().endsWith('.csv');

                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          {isExcel || isCSV ? (
                            <FileSpreadsheet className="h-4 w-4 text-emerald-400 shrink-0" />
                          ) : (
                            <FileText className="h-4 w-4 text-rose-400 shrink-0" />
                          )}
                          <span className="font-mono font-bold text-slate-200">{report.filename}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 font-mono text-slate-400">
                        {formatSize(report.size)}
                      </td>

                      <td className="py-3.5 px-3 font-mono text-slate-400">
                        {formatDate(report.created_at)}
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`http://localhost:5000/reports/${report.filename}`}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs font-semibold text-cyan-400 hover:bg-slate-800 transition-all"
                          >
                            <Download className="h-3 w-3" /> Download
                          </a>
                          <button
                            onClick={() => handleDeleteReport(report.filename)}
                            className="rounded-lg border border-slate-800 bg-slate-950 p-1 text-slate-500 hover:text-rose-400 transition-all cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    No stored reports archived on server disk yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
