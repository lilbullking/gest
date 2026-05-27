import React, { useEffect, useState, useRef } from 'react';
import { documentAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Coins, Search, Upload, FileText, Trash2, Eye, 
  Sparkles, CheckCircle, Clock, Check, Signature, X, ShieldCheck
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

const Payslips: React.FC = () => {
  const { user } = useAuth();
  const [payslips, setPayslips] = useState<DocumentInfo[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState('all');
  
  // Signature status simulation (stored in localStorage)
  const [signatureStatuses, setSignatureStatuses] = useState<Record<string, 'signed' | 'pending'>>({});
  
  // Interactive signing modal state
  const [signingDoc, setSigningDoc] = useState<DocumentInfo | null>(null);
  const [pinCode, setPinCode] = useState('');
  const [signatureDrawn, setSignatureDrawn] = useState(false);
  const [signingSuccess, setSigningSuccess] = useState(false);

  // Upload simulation states
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'ocr' | 'ai' | 'completed'>('idle');
  const [uploadPercent, setUploadPercent] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPayslips = async () => {
    try {
      setLoading(true);
      const res = await documentAPI.list({ category: 'liquidacion' });
      setPayslips(res.data);
      
      const savedSignatures = localStorage.getItem('nubcore_payslip_signature_statuses');
      if (savedSignatures) {
        setSignatureStatuses(JSON.parse(savedSignatures));
      } else {
        // Initial setup: some are signed, some are pending
        const initialMap: Record<string, 'signed' | 'pending'> = {
          "d0000000-0000-0000-0000-000000000102": 'pending'
        };
        localStorage.setItem('nubcore_payslip_signature_statuses', JSON.stringify(initialMap));
        setSignatureStatuses(initialMap);
      }
    } catch (error) {
      console.error("Error loading payslips", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, []);

  const handleUploadClick = () => {
    if (uploadState !== 'idle') return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadPayslipFile(file);
    }
  };

  const uploadPayslipFile = async (file: File) => {
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
      
      const newDocId = response.data.id;
      const updatedStatuses = { ...signatureStatuses, [newDocId]: 'pending' as const };
      setSignatureStatuses(updatedStatuses);
      localStorage.setItem('nubcore_payslip_signature_statuses', JSON.stringify(updatedStatuses));
      
      const res = await documentAPI.list({ category: 'liquidacion' });
      setPayslips(res.data);
    } catch (error) {
      console.error("Error uploading payslip", error);
    }

    await new Promise((resolve) => setTimeout(resolve, 600));
    setUploadState('idle');
  };

  const handleSignRequest = (doc: DocumentInfo) => {
    setSigningDoc(doc);
    setPinCode('');
    setSignatureDrawn(false);
    setSigningSuccess(false);
  };

  const submitSignature = async () => {
    if (!pinCode || !signatureDrawn) {
      alert("Por favor, dibuja tu firma y coloca tu código PIN de seguridad.");
      return;
    }
    
    // Simulate digital signing processing
    setSigningSuccess(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    if (signingDoc) {
      const updated = { ...signatureStatuses, [signingDoc.id]: 'signed' as const };
      setSignatureStatuses(updated);
      localStorage.setItem('nubcore_payslip_signature_statuses', JSON.stringify(updated));
    }
    
    setSigningDoc(null);
    fetchPayslips();
  };

  const handleDeletePayslip = async (id: string) => {
    if (window.confirm("¿Seguro que deseas archivar esta liquidación?")) {
      try {
        await documentAPI.delete(id);
        fetchPayslips();
      } catch (error) {
        console.error("Error deleting payslip", error);
      }
    }
  };

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

  const getFilteredPayslips = () => {
    let list = payslips;

    if (monthFilter !== 'all') {
      list = list.filter((pay) => {
        const docDate = pay.metadata?.fecha_documento || '';
        return docDate.includes(monthFilter);
      });
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((pay) => 
        pay.title.toLowerCase().includes(q) || 
        (pay.extracted_text && pay.extracted_text.toLowerCase().includes(q)) ||
        (pay.metadata?.nombre_empleado && pay.metadata.nombre_empleado.toLowerCase().includes(q))
      );
    }

    return list;
  };

  // Get statistics
  const getStats = () => {
    const total = payslips.length;
    let signed = 0;
    let pending = 0;
    
    payslips.forEach((pay) => {
      const isSigned = signatureStatuses[pay.id] === 'signed';
      if (isSigned) signed++;
      else pending++;
    });

    const percent = total > 0 ? Math.round((signed / total) * 100) : 0;
    return { total, signed, pending, percent };
  };

  const stats = getStats();

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800 dark:text-slate-200">
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {user?.role === 'employee' ? 'Mis Liquidaciones de Sueldo' : 'Gestor de Liquidaciones'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            {user?.role === 'employee' 
              ? 'Revisa tus liquidaciones, descárgalas y firma digitalmente con validez legal.'
              : 'Publicación de liquidaciones mensuales y seguimiento de firmas electrónicas.'}
          </p>
        </div>

        {['admin', 'hr'].includes(user?.role || '') && (
          <div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept=".pdf"
            />
            <button
              onClick={handleUploadClick}
              disabled={uploadState !== 'idle'}
              className="flex items-center gap-2 px-4.5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Cargar Liquidaciones PDF
            </button>
          </div>
        )}
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
                {uploadState === 'uploading' && `Procesando archivo... (${uploadPercent}%)`}
                {uploadState === 'ocr' && 'Extrayendo montos y RUT (OCR)...'}
                {uploadState === 'ai' && 'Vinculando liquidación al RUT del trabajador correspondiente...'}
                {uploadState === 'completed' && '¡Liquidación cargada con éxito!'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">El Ledger inmutable ISO 27001 está listo para recibir la firma.</p>
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

      {/* Stats Summary Bento Block */}
      {user?.role !== 'employee' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bento-card p-5 flex flex-col justify-between md:col-span-1">
            <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">Liquidaciones</span>
            <h3 className="text-3xl font-black mt-2 text-slate-900 dark:text-white font-sans">{stats.total}</h3>
            <span className="text-[10px] text-slate-400 mt-4 block">Total en el mes actual</span>
          </div>

          <div className="bento-card p-5 flex flex-col justify-between md:col-span-1">
            <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">Firmadas</span>
            <h3 className="text-3xl font-black mt-2 text-emerald-600 dark:text-emerald-450 font-sans">{stats.signed}</h3>
            <span className="text-[10px] text-slate-400 mt-4 block">Con firma electrónica activa</span>
          </div>

          <div className="bento-card p-5 flex flex-col justify-between md:col-span-1">
            <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">Pendientes</span>
            <h3 className="text-3xl font-black mt-2 text-amber-605 dark:text-amber-400 font-sans">{stats.pending}</h3>
            <span className="text-[10px] text-slate-400 mt-4 block">Esperando firma de colaborador</span>
          </div>

          <div className="bento-card p-5 flex flex-col justify-between md:col-span-1">
            <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">Tasa de Firma</span>
            <div className="flex items-center gap-3 mt-2">
              <h3 className="text-3xl font-black text-brand-600 dark:text-brand-400 font-sans">{stats.percent}%</h3>
              <div className="w-16 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shrink-0">
                <div className="h-full bg-brand-600" style={{ width: `${stats.percent}%` }}></div>
              </div>
            </div>
            <span className="text-[10px] text-slate-400 mt-4 block">Progreso de firma total</span>
          </div>
        </div>
      )}

      {/* Main Table / Feed Card */}
      <div className="bento-card p-6">
        
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            {[
              { id: 'all', label: 'Todos los Meses' },
              { id: '05/2026', label: 'Mayo 2026' },
              { id: '04/2026', label: 'Abril 2026' }
            ].map((mon) => (
              <button
                key={mon.id}
                onClick={() => setMonthFilter(mon.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  monthFilter === mon.id
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {mon.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por Colaborador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8.5 pr-3.5 py-1.5 bg-white border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800 rounded-xl text-xs focus:border-brand-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Payslips List */}
        <div className="space-y-3">
          {getFilteredPayslips().length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No hay liquidaciones en este rango.
            </div>
          ) : (
            getFilteredPayslips().map((pay) => {
              const isSigned = signatureStatuses[pay.id] === 'signed';
              return (
                <div 
                  key={pay.id}
                  className="p-4 bg-white/60 dark:bg-[#0c111f]/40 border border-white/60 dark:border-slate-850/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-350 dark:hover:border-slate-800 transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="p-3 bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 rounded-xl border border-brand-100/35 dark:border-brand-900/20 shrink-0">
                      <Coins className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <h4 className="font-bold text-xs text-slate-850 dark:text-white truncate">
                        {pay.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-slate-400 dark:text-slate-500">
                        {user?.role !== 'employee' && (
                          <span>Trabajador: <b className="text-slate-700 dark:text-slate-300 font-bold">{pay.metadata?.nombre_empleado || 'No Asignado'}</b></span>
                        )}
                        {user?.role !== 'employee' && <span>•</span>}
                        <span>Líquido: <b className="text-brand-600 dark:text-brand-400 font-extrabold">{formatCLP(pay.metadata?.monto_total || 820000)}</b></span>
                        <span>•</span>
                        <span>{formatBytes(pay.file_size)}</span>
                        <span>•</span>
                        <span>Mes: {pay.metadata?.fecha_documento ? pay.metadata.fecha_documento.split('/').slice(1).join('/') : '05/2026'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 w-full sm:w-auto justify-end pt-3.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-850/40 shrink-0">
                    {/* Signature Status Badge / Button */}
                    {isSigned ? (
                      <span className="flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-650 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30 rounded-full text-[10px] font-bold">
                        <Check className="w-3 h-3" />
                        Firmado Digitalmente
                      </span>
                    ) : user?.role === 'employee' ? (
                      <button
                        onClick={() => handleSignRequest(pay)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-full text-[10px] font-bold shadow-sm transition-all cursor-pointer"
                      >
                        <Signature className="w-3.5 h-3.5" />
                        Firma Pendiente
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-650 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30 rounded-full text-[10px] font-bold">
                        <Clock className="w-3 h-3 animate-pulse" />
                        Firma Pendiente
                      </span>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <a
                        href={pay.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl transition-all cursor-pointer"
                        title="Ver Liquidación"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                      {['admin', 'hr'].includes(user?.role || '') && (
                        <button
                          onClick={() => handleDeletePayslip(pay.id)}
                          className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-500 hover:text-rose-600 rounded-xl transition-all cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* ================= INTERACTIVE SIGNATURE MODAL ================= */}
      {signingDoc && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 w-full max-w-lg overflow-hidden shadow-2xl relative animate-fadeIn text-slate-800 dark:text-slate-200">
            
            {/* Modal Header */}
            <div className="p-5.5 border-b border-slate-150/40 dark:border-slate-800/40 flex items-center justify-between">
              <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
                <Signature className="w-5 h-5" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider">Firma Digital del Colaborador</h3>
              </div>
              <button 
                onClick={() => setSigningDoc(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {signingSuccess ? (
                <div className="py-8 text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-450 border border-emerald-200/50 rounded-full flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-8 h-8 animate-bounce" />
                  </div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-base">Firma Registrada Exitosamente</h4>
                  <p className="text-xs text-slate-450 dark:text-slate-400 max-w-xs mx-auto">
                    La firma digital y el hash del ledger inmutable ISO 27001 se han estampado en la liquidación.
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-4.5 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-150/40 dark:border-slate-850/30 text-xs">
                    <span className="text-[9px] uppercase tracking-widest text-slate-450 font-bold">Documento a firmar</span>
                    <p className="font-bold text-slate-850 dark:text-white mt-1">{signingDoc.title}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-3 border-t border-slate-200/40 dark:border-slate-800/40 pt-2.5">
                      <span>Monto Líquido: <b>{formatCLP(signingDoc.metadata?.monto_total || 820000)}</b></span>
                      <span>Mes: <b>Mayo 2026</b></span>
                    </div>
                  </div>

                  {/* Draw Signature Canvas Simulation */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Dibuja tu Firma Aquí</span>
                    <div 
                      onClick={() => setSignatureDrawn(true)}
                      className={`h-36 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100/30 transition-all cursor-pointer ${
                        signatureDrawn ? 'border-brand-500 bg-brand-50/5' : 'border-slate-200 dark:border-slate-850'
                      }`}
                    >
                      {signatureDrawn ? (
                        <div className="space-y-1 text-center">
                          <Signature className="w-10 h-10 text-brand-600 dark:text-brand-400 mx-auto" />
                          <p className="text-[10px] text-brand-600 dark:text-brand-400 font-bold">Firma Estampada [Verificada]</p>
                          <p className="text-[9px] text-slate-400">Click para volver a dibujar</p>
                        </div>
                      ) : (
                        <div className="space-y-1 text-center text-slate-400">
                          <Signature className="w-8 h-8 mx-auto stroke-1 text-slate-350" />
                          <p className="text-[10px]">Haz click para simular trazo de firma</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PIN Code Code verification */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Código PIN de Seguridad</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="w-full text-center tracking-widest text-lg font-mono py-2 bg-slate-50 border border-slate-200 dark:bg-slate-950/40 dark:border-slate-850 rounded-xl focus:border-brand-500 focus:outline-none transition-colors"
                    />
                    <p className="text-[9px] text-slate-450 dark:text-slate-500 text-center font-semibold">
                      Usa el PIN de simulación (e.g. 1234) para estampar la firma legal.
                    </p>
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={submitSignature}
                    className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Signature className="w-4 h-4" />
                    Estampar Firma Electrónica
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Payslips;
