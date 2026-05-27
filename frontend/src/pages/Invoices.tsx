import React, { useEffect, useState, useRef } from 'react';
import { documentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Receipt, Search, Upload, FileText, Trash2, Eye, 
  Sparkles, CheckCircle, Clock, AlertCircle, DollarSign, Filter
} from 'lucide-react';

interface DocumentInfo {
  id: string;
  title: string;
  file_url: string;
  file_size: number;
  file_type: string;
  category: string;
  ocr_status: string;
  extracted_text?: string;
  metadata: Record<string, any>;
  version: number;
  created_at: string;
}

const Invoices: React.FC = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<DocumentInfo[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  
  // Custom state for invoice status (stored in localStorage under a dynamic map)
  const [invoiceStatuses, setInvoiceStatuses] = useState<Record<string, 'paid' | 'pending'>>({});

  // Upload simulation states
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'ocr' | 'ai' | 'completed'>('idle');
  const [uploadPercent, setUploadPercent] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await documentAPI.list({ category: 'factura' });
      setInvoices(res.data);
      
      // Load payment statuses from localStorage
      const savedStatuses = localStorage.getItem('nubcore_invoice_payment_statuses');
      if (savedStatuses) {
        setInvoiceStatuses(JSON.parse(savedStatuses));
      } else {
        // Default statuses for initial items
        const initialMap: Record<string, 'paid' | 'pending'> = {
          "d0000000-0000-0000-0000-000000000202": 'paid'
        };
        localStorage.setItem('nubcore_invoice_payment_statuses', JSON.stringify(initialMap));
        setInvoiceStatuses(initialMap);
      }
    } catch (error) {
      console.error("Error loading invoices", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleUploadClick = () => {
    if (uploadState !== 'idle') return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadInvoiceFile(file);
    }
  };

  const uploadInvoiceFile = async (file: File) => {
    setUploadState('uploading');
    setUploadPercent(0);
    
    const interval = setInterval(() => {
      setUploadPercent((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 25;
      });
    }, 150);

    await new Promise((resolve) => setTimeout(resolve, 800));
    setUploadState('ocr');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setUploadState('ai');
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setUploadState('completed');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);
    
    try {
      const response = await documentAPI.create(formData);
      
      // We automatically set new uploads as "pending" payment
      const newDocId = response.data.id;
      const updatedStatuses = { ...invoiceStatuses, [newDocId]: 'pending' as const };
      setInvoiceStatuses(updatedStatuses);
      localStorage.setItem('nubcore_invoice_payment_statuses', JSON.stringify(updatedStatuses));
      
      // Let's also enrich the simulation data of the invoice if needed
      // (The backend API classifies filenames with "factura" or "boleta" automatically)
      
      const res = await documentAPI.list({ category: 'factura' });
      setInvoices(res.data);
    } catch (error) {
      console.error("Error uploading invoice", error);
    }

    await new Promise((resolve) => setTimeout(resolve, 600));
    setUploadState('idle');
  };

  const togglePaymentStatus = (id: string) => {
    const current = invoiceStatuses[id] || 'pending';
    const next: 'paid' | 'pending' = current === 'paid' ? 'pending' : 'paid';
    const updated: Record<string, 'paid' | 'pending'> = { ...invoiceStatuses, [id]: next };
    setInvoiceStatuses(updated);
    localStorage.setItem('nubcore_invoice_payment_statuses', JSON.stringify(updated));
  };

  const handleDeleteInvoice = async (id: string) => {
    if (window.confirm("¿Seguro que deseas archivar esta factura? Se retirará de los reportes.")) {
      try {
        await documentAPI.delete(id);
        const res = await documentAPI.list({ category: 'factura' });
        setInvoices(res.data);
      } catch (error) {
        console.error("Error deleting invoice", error);
      }
    }
  };

  // Format currency
  const formatCLP = (amountStr: string | number) => {
    const amount = typeof amountStr === 'string' ? parseInt(amountStr, 10) : amountStr;
    if (isNaN(amount)) return '$0';
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Compute stats
  const getStats = () => {
    let totalFacturado = 0;
    let pendingCount = 0;
    let paidCount = 0;
    let pendingAmount = 0;

    invoices.forEach((inv) => {
      const amount = parseInt(inv.metadata?.monto_total || '0', 10);
      const isPaid = invoiceStatuses[inv.id] === 'paid';
      
      totalFacturado += amount;
      if (isPaid) {
        paidCount++;
      } else {
        pendingCount++;
        pendingAmount += amount;
      }
    });

    const ivaCredito = Math.round(totalFacturado * 0.19);

    return {
      totalFacturado,
      pendingCount,
      paidCount,
      pendingAmount,
      ivaCredito
    };
  };

  const stats = getStats();

  const getFilteredInvoices = () => {
    let list = invoices;
    
    if (statusFilter !== 'all') {
      list = list.filter((inv) => {
        const isPaid = invoiceStatuses[inv.id] === 'paid';
        return statusFilter === 'paid' ? isPaid : !isPaid;
      });
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((inv) => 
        inv.title.toLowerCase().includes(q) || 
        (inv.extracted_text && inv.extracted_text.toLowerCase().includes(q)) ||
        (inv.metadata?.rut_empresa && inv.metadata.rut_empresa.toLowerCase().includes(q))
      );
    }

    return list;
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800 dark:text-slate-200">
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Gestor de Facturas y Boletas
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Control de egresos, IVA crédito y digitalización inteligente de facturas recibidas.
          </p>
        </div>

        <div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept=".pdf,.jpg,.jpeg,.png"
          />
          <button
            onClick={handleUploadClick}
            disabled={uploadState !== 'idle'}
            className="flex items-center gap-2 px-4.5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Cargar Factura / Boleta
          </button>
        </div>
      </div>

      {/* Upload Progress Alert */}
      {uploadState !== 'idle' && (
        <div className="bento-card p-5 border border-brand-200 dark:border-brand-900/50 bg-brand-50/20 dark:bg-brand-950/10 flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-500 text-white rounded-xl">
              <Sparkles className="w-4.5 h-4.5 animate-spin" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {uploadState === 'uploading' && `Subiendo factura... (${uploadPercent}%)`}
                {uploadState === 'ocr' && 'Leyendo código de barras y montos (OCR)...'}
                {uploadState === 'ai' && 'IA extrayendo RUT, Razón Social e IVA del proveedor...'}
                {uploadState === 'completed' && '¡Factura ingresada con éxito!'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Transacción registrada en el libro tributario digital.</p>
            </div>
          </div>
          <div className="w-24 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden shrink-0">
            <div 
              className="h-full bg-brand-600 transition-all duration-300"
              style={{ width: `${uploadState === 'uploading' ? uploadPercent : uploadState === 'ocr' ? 45 : uploadState === 'ai' ? 80 : 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Total Facturado */}
        <div className="bento-card p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">Neto Facturado</span>
              <h3 className="text-2xl font-black mt-1.5 font-sans">{formatCLP(stats.totalFacturado)}</h3>
            </div>
            <div className="p-2.5 bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 rounded-xl border border-brand-100/40 dark:border-brand-900/30">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-4">Total histórico cargado en este Tenant</p>
        </div>

        {/* Card 2: IVA Crédito */}
        <div className="bento-card p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">IVA Crédito Fiscal (19%)</span>
              <h3 className="text-2xl font-black mt-1.5 font-sans text-emerald-600 dark:text-emerald-400">{formatCLP(stats.ivaCredito)}</h3>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-xl border border-emerald-100/40 dark:border-emerald-900/30">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-4">Monto recuperable/compensable</p>
        </div>

        {/* Card 3: Monto Pendiente */}
        <div className="bento-card p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">Por Pagar</span>
              <h3 className="text-2xl font-black mt-1.5 font-sans text-amber-600 dark:text-amber-400">{formatCLP(stats.pendingAmount)}</h3>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 rounded-xl border border-amber-100/40 dark:border-amber-900/30">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-4">{stats.pendingCount} facturas pendientes de cobro</p>
        </div>

        {/* Card 4: Proveedores */}
        <div className="bento-card p-5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">Total Facturas</span>
              <h3 className="text-2xl font-black mt-1.5 font-sans text-indigo-650 dark:text-indigo-400">{invoices.length}</h3>
            </div>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 rounded-xl border border-indigo-100/40 dark:border-indigo-900/30">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-4">Documentos indexados en total</p>
        </div>

      </div>

      {/* Main Table / Directory Card */}
      <div className="bento-card p-6.5 space-y-4">
        
        {/* Table Toolbar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {[
              { id: 'all', label: 'Todas' },
              { id: 'paid', label: 'Pagadas' },
              { id: 'pending', label: 'Pendientes' }
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setStatusFilter(filter.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === filter.id
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3.5 w-full md:w-auto">
            <div className="relative w-full md:w-56">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por RUT/Nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8.5 pr-3.5 py-1.5 bg-white border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800 rounded-xl text-xs focus:border-brand-500 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Ledger List */}
        <div className="space-y-3">
          {getFilteredInvoices().length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No se encontraron facturas o boletas registradas.
            </div>
          ) : (
            getFilteredInvoices().map((inv) => {
              const isPaid = invoiceStatuses[inv.id] === 'paid';
              return (
                <div 
                  key={inv.id}
                  className="p-4 bg-white/60 dark:bg-[#0c111f]/40 border border-white/60 dark:border-slate-850/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-350 dark:hover:border-slate-800 transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="p-3 bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 rounded-xl border border-brand-100/35 dark:border-brand-900/20 shrink-0">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <h4 className="font-bold text-xs text-slate-850 dark:text-white truncate">
                        {inv.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-slate-400 dark:text-slate-500">
                        <span>RUT Emisor: <b className="font-mono text-slate-600 dark:text-slate-450">{inv.metadata?.rut_empresa || 'S/R'}</b></span>
                        <span>•</span>
                        <span>Monto Total: <b className="text-slate-700 dark:text-slate-300 font-bold">{formatCLP(inv.metadata?.monto_total)}</b></span>
                        <span>•</span>
                        <span>{formatBytes(inv.file_size)}</span>
                        <span>•</span>
                        <span>Fecha: {inv.metadata?.fecha_documento || new Date(inv.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 w-full sm:w-auto justify-end pt-3.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-850/40 shrink-0">
                    {/* Status Toggle Button */}
                    <button
                      onClick={() => togglePaymentStatus(inv.id)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                        isPaid 
                          ? 'bg-emerald-50 text-emerald-650 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
                          : 'bg-amber-50 text-amber-650 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30'
                      }`}
                    >
                      {isPaid ? 'Pagada' : 'Pendiente de Pago'}
                    </button>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1">
                      <a
                        href={inv.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl transition-all cursor-pointer"
                        title="Ver Factura"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleDeleteInvoice(inv.id)}
                        className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-500 hover:text-rose-600 rounded-xl transition-all cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
};

export default Invoices;
