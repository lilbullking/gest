import React, { useEffect, useState, useRef } from 'react';
import { documentAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  FileSignature, Search, Upload, FileText, Trash2, Eye, 
  Sparkles, CheckCircle, Clock, X, Signature, ShieldCheck
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

const ContractAnnexes: React.FC = () => {
  const { user } = useAuth();
  const [annexes, setAnnexes] = useState<DocumentInfo[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Signature status (stored in localStorage)
  const [signatureStatuses, setSignatureStatuses] = useState<Record<string, 'signed' | 'pending'>>({});
  
  // Interactive signing modal state
  const [signingDoc, setSigningDoc] = useState<DocumentInfo | null>(null);
  const [pinCode, setPinCode] = useState('');
  const [signatureDrawn, setSignatureDrawn] = useState(false);
  const [signingSuccess, setSigningSuccess] = useState(false);

  // New Annex Creation State (For Admin/HR)
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [targetWorkerId, setTargetWorkerId] = useState('');
  const [annexType, setAnnexType] = useState('Anexo de Contrato');
  
  // Upload simulation states
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'ocr' | 'ai' | 'completed'>('idle');
  const [uploadPercent, setUploadPercent] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAnnexes = async () => {
    try {
      setLoading(true);
      const res = await documentAPI.list({ category: 'anexo' });
      setAnnexes(res.data);
      
      const workersRes = await authAPI.listUsers();
      setWorkers(workersRes.data);

      const savedSignatures = localStorage.getItem('nubcore_annex_signature_statuses');
      if (savedSignatures) {
        setSignatureStatuses(JSON.parse(savedSignatures));
      } else {
        const initialMap: Record<string, 'signed' | 'pending'> = {};
        localStorage.setItem('nubcore_annex_signature_statuses', JSON.stringify(initialMap));
        setSignatureStatuses(initialMap);
      }
    } catch (error) {
      console.error("Error loading annexes", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnexes();
  }, []);

  const handleUploadClick = () => {
    if (!targetWorkerId) {
      alert("Por favor selecciona un colaborador primero.");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadAnnexFile(file);
    }
  };

  const uploadAnnexFile = async (file: File) => {
    setUploadState('uploading');
    setUploadPercent(0);
    setShowUploadModal(false);

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
    formData.append('title', `${annexType} - ${file.name}`);
    
    try {
      const response = await documentAPI.create(formData);
      
      const newDocId = response.data.id;
      const targetWorker = workers.find(w => w.id === targetWorkerId);
      const workerName = targetWorker ? `${targetWorker.first_name} ${targetWorker.last_name}` : 'Colaborador';
      const workerRut = targetWorker ? targetWorker.rut || '18.123.456-7' : '18.123.456-7';

      // Update local storage document entry with matching metadata
      const currentSimDocs = localStorage.getItem('nubcore_sim_documents');
      if (currentSimDocs) {
        const parsedDocs = JSON.parse(currentSimDocs);
        const updatedDocs = parsedDocs.map((d: any) => {
          if (d.id === response.data.id) {
            return {
              ...d,
              category: 'anexo',
              metadata: {
                rut_empresa: user?.tenant?.tax_id,
                rut_empleado: workerRut,
                nombre_empleado: workerName,
                tipo_anexo: annexType,
                fecha_documento: new Date().toLocaleDateString()
              }
            };
          }
          return d;
        });
        localStorage.setItem('nubcore_sim_documents', JSON.stringify(updatedDocs));
      }

      const updatedStatuses = { ...signatureStatuses, [newDocId]: 'pending' as const };
      setSignatureStatuses(updatedStatuses);
      localStorage.setItem('nubcore_annex_signature_statuses', JSON.stringify(updatedStatuses));
      
      fetchAnnexes();
    } catch (error) {
      console.error("Error uploading annex", error);
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
      alert("Por favor dibuja tu firma y coloca tu PIN de seguridad.");
      return;
    }
    
    setSigningSuccess(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    if (signingDoc) {
      const updated = { ...signatureStatuses, [signingDoc.id]: 'signed' as const };
      setSignatureStatuses(updated);
      localStorage.setItem('nubcore_annex_signature_statuses', JSON.stringify(updated));
    }
    
    setSigningDoc(null);
    fetchAnnexes();
  };

  const handleDeleteAnnex = async (id: string) => {
    if (window.confirm("¿Seguro que deseas archivar este anexo?")) {
      try {
        await documentAPI.delete(id);
        fetchAnnexes();
      } catch (error) {
        console.error("Error deleting annex", error);
      }
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFilteredAnnexes = () => {
    let list = annexes;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((ann) => 
        ann.title.toLowerCase().includes(q) || 
        (ann.metadata?.nombre_empleado && ann.metadata.nombre_empleado.toLowerCase().includes(q))
      );
    }

    return list;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800 dark:text-slate-200">
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Anexos de Contrato y Vacaciones
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Gestión y firma de modificaciones contractuales y autorizaciones de feriado legal.
          </p>
        </div>

        {['admin', 'hr'].includes(user?.role || '') && (
          <button
            onClick={() => {
              setTargetWorkerId('');
              setAnnexType('Anexo de Contrato');
              setShowUploadModal(true);
            }}
            className="flex items-center gap-2 px-4.5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Cargar Nuevo Anexo
          </button>
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
                {uploadState === 'uploading' && `Procesando anexo... (${uploadPercent}%)`}
                {uploadState === 'ocr' && 'Escrudiñando cláusulas de contrato (OCR)...'}
                {uploadState === 'ai' && 'IA cruzando datos del anexo con el expediente laboral...'}
                {uploadState === 'completed' && '¡Anexo asignado con éxito!'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Pendiente para la firma del trabajador.</p>
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

      {/* Main Table / Directory Card */}
      <div className="bento-card p-6.5 space-y-4">
        
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FileSignature className="w-4.5 h-4.5 text-brand-600" />
            Carpeta de Acuerdos y Cláusulas
          </h3>

          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por Nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8.5 pr-3.5 py-1.5 bg-white border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800 rounded-xl text-xs focus:border-brand-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Annexes List */}
        <div className="space-y-3">
          {getFilteredAnnexes().length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No hay anexos de contrato o vacaciones vigentes.
            </div>
          ) : (
            getFilteredAnnexes().map((ann) => {
              const isSigned = signatureStatuses[ann.id] === 'signed';
              return (
                <div 
                  key={ann.id}
                  className="p-4 bg-white/60 dark:bg-[#0c111f]/40 border border-white/60 dark:border-slate-850/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-350 dark:hover:border-slate-800 transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="p-3 bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 rounded-xl border border-brand-100/35 dark:border-brand-900/20 shrink-0">
                      <FileSignature className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <h4 className="font-bold text-xs text-slate-850 dark:text-white truncate">
                        {ann.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-slate-400 dark:text-slate-500">
                        {user?.role !== 'employee' && (
                          <span>Trabajador: <b className="text-slate-700 dark:text-slate-300 font-bold">{ann.metadata?.nombre_empleado || 'No Asignado'}</b></span>
                        )}
                        {user?.role !== 'employee' && <span>•</span>}
                        <span>Tipo: <b className="text-brand-650 dark:text-brand-400 font-bold">{ann.metadata?.tipo_anexo || 'Anexo de Contrato'}</b></span>
                        <span>•</span>
                        <span>{formatBytes(ann.file_size)}</span>
                        <span>•</span>
                        <span>Asignado: {ann.metadata?.fecha_documento || new Date(ann.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 w-full sm:w-auto justify-end pt-3.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-850/40 shrink-0">
                    {/* Signature Status */}
                    {isSigned ? (
                      <span className="flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-650 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30 rounded-full text-[10px] font-bold">
                        Firmado
                      </span>
                    ) : user?.role === 'employee' ? (
                      <button
                        onClick={() => handleSignRequest(ann)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-full text-[10px] font-bold shadow-sm transition-all cursor-pointer animate-pulse"
                      >
                        <Signature className="w-3.5 h-3.5" />
                        Firma Requerida
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-650 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30 rounded-full text-[10px] font-bold">
                        Pendiente Firma
                      </span>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <a
                        href={ann.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl transition-all cursor-pointer"
                        title="Ver Documento"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                      {['admin', 'hr'].includes(user?.role || '') && (
                        <button
                          onClick={() => handleDeleteAnnex(ann.id)}
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

      {/* ================= ADMIN UPLOAD MODAL ================= */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 w-full max-w-md overflow-hidden shadow-2xl relative animate-fadeIn text-slate-800 dark:text-slate-200">
            
            <div className="p-5.5 border-b border-slate-150/40 dark:border-slate-800/40 flex items-center justify-between">
              <h3 className="font-extrabold text-sm uppercase tracking-wider">Cargar Acuerdo / Anexo</h3>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Seleccionar Colaborador</label>
                <select
                  value={targetWorkerId}
                  onChange={(e) => setTargetWorkerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-950/40 dark:border-slate-850 rounded-xl text-xs focus:outline-none"
                >
                  <option value="">-- Elige un Colaborador --</option>
                  {workers.map(w => (
                    <option key={w.id} value={w.id}>{w.first_name} {w.last_name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Tipo de Documento</label>
                <select
                  value={annexType}
                  onChange={(e) => setAnnexType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-950/40 dark:border-slate-850 rounded-xl text-xs focus:outline-none"
                >
                  <option>Anexo de Contrato</option>
                  <option>Anexo de Vacaciones</option>
                  <option>Convenio de Teletrabajo</option>
                  <option>Modificación Jornada Laboral</option>
                </select>
              </div>

              <div className="pt-2">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept=".pdf"
                />
                <button
                  onClick={handleUploadClick}
                  className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Adjuntar PDF y Enviar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ================= INTERACTIVE SIGNATURE MODAL ================= */}
      {signingDoc && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 w-full max-w-lg overflow-hidden shadow-2xl relative animate-fadeIn text-slate-800 dark:text-slate-200">
            
            <div className="p-5.5 border-b border-slate-150/40 dark:border-slate-800/40 flex items-center justify-between">
              <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
                <Signature className="w-5 h-5" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider">Firma de Acuerdo Laboral</h3>
              </div>
              <button 
                onClick={() => setSigningDoc(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {signingSuccess ? (
                <div className="py-8 text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-650 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-8 h-8 animate-bounce" />
                  </div>
                  <h4 className="font-extrabold text-slate-900 dark:text-white text-base font-sans">Acuerdo Firmado Correctamente</h4>
                  <p className="text-xs text-slate-450 dark:text-slate-400 max-w-xs mx-auto">
                    El documento se encuentra visado y firmado con firma simple digital respaldada.
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-4.5 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-150/40 dark:border-slate-850/30 text-xs">
                    <span className="text-[9px] uppercase tracking-widest text-slate-450 font-bold">Detalle del Acuerdo</span>
                    <p className="font-bold text-slate-850 dark:text-white mt-1">{signingDoc.title}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-3 border-t border-slate-200/40 dark:border-slate-800/40 pt-2.5">
                      <span>Categoría: <b>{signingDoc.metadata?.tipo_anexo || 'Anexo de Contrato'}</b></span>
                      <span>Fecha: <b>{signingDoc.metadata?.fecha_documento || 'Hoy'}</b></span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Dibuja tu Firma</span>
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
                          <p className="text-[9px] text-slate-400">Haz click para limpiar</p>
                        </div>
                      ) : (
                        <div className="space-y-1 text-center text-slate-400">
                          <Signature className="w-8 h-8 mx-auto stroke-1 text-slate-350" />
                          <p className="text-[10px]">Haz click para simular trazo de firma</p>
                        </div>
                      )}
                    </div>
                  </div>

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
                  </div>

                  <button
                    onClick={submitSignature}
                    className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Signature className="w-4 h-4" />
                    Firmar Acuerdo de Mutuo Acuerdo
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

export default ContractAnnexes;
