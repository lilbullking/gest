import React, { useEffect, useState, useRef } from 'react';
import { documentAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Users, Search, Upload, ArrowLeft, User, FileText, 
  Trash2, Eye, PlusCircle, Sparkles, Filter, ChevronRight, Check
} from 'lucide-react';

interface Worker {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  rut?: string;
  department?: string;
}

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

const WorkerDocuments: React.FC = () => {
  const { user } = useAuth();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [workerDocs, setWorkerDocs] = useState<DocumentInfo[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  
  // Upload simulation states
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'ocr' | 'ai' | 'completed'>('idle');
  const [uploadPercent, setUploadPercent] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fallback defaults for workers
  const getMockRut = (email: string) => {
    if (email.includes('juan')) return '18.456.789-0';
    if (email.includes('sofia')) return '15.321.654-9';
    if (email.includes('carlos')) return '14.111.222-3';
    if (email.includes('maria')) return '16.789.123-K';
    if (email.includes('patricia')) return '17.456.123-4';
    if (email.includes('diego')) return '19.987.654-1';
    return `12.${Math.floor(Math.random()*900+100)}.${Math.floor(Math.random()*900+100)}-${Math.floor(Math.random()*9)}`;
  };

  const getMockDept = (email: string) => {
    if (email.includes('juan')) return 'Operaciones / Obra';
    if (email.includes('sofia') || email.includes('diego')) return 'Tecnología / TI';
    if (email.includes('maria') || email.includes('patricia')) return 'Recursos Humanos';
    return 'Administración';
  };

  const fetchWorkersAndDocs = async () => {
    try {
      setLoading(true);
      const res = await authAPI.listUsers();
      const enrichedWorkers = res.data.map((w: any) => ({
        ...w,
        rut: w.rut || getMockRut(w.email),
        department: w.department || getMockDept(w.email)
      }));
      setWorkers(enrichedWorkers);

      // Fetch all documents to filter or show counts
      const docRes = await documentAPI.list();
      setWorkerDocs(docRes.data);
    } catch (error) {
      console.error("Error loading worker documents data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkersAndDocs();
  }, []);

  const handleWorkerSelect = (worker: Worker) => {
    setSelectedWorker(worker);
    setActiveCategory('all');
  };

  const handleUploadClick = () => {
    if (uploadState !== 'idle') return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedWorker) {
      await uploadDocumentForWorker(file, selectedWorker);
    }
  };

  const uploadDocumentForWorker = async (file: File, worker: Worker) => {
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
    
    // In our backend API simulation, metadata is parsed from file name or is enriched.
    // Let's pass the worker details so that the simulation logic can store it correctly.
    try {
      const response = await documentAPI.create(formData);
      
      // Update local storage representation to tie it to this worker explicitly
      const currentSimDocs = localStorage.getItem('nubcore_sim_documents');
      if (currentSimDocs) {
        const parsedDocs = JSON.parse(currentSimDocs);
        // Find the newly uploaded doc (first one usually, or by title)
        const updatedDocs = parsedDocs.map((d: any) => {
          if (d.title === file.name || d.id === response.data.id) {
            return {
              ...d,
              metadata: {
                ...d.metadata,
                nombre_empleado: `${worker.first_name} ${worker.last_name}`,
                rut_empleado: worker.rut,
                departamento: worker.department
              }
            };
          }
          return d;
        });
        localStorage.setItem('nubcore_sim_documents', JSON.stringify(updatedDocs));
      }

      // Refresh documents
      const docRes = await documentAPI.list();
      setWorkerDocs(docRes.data);
    } catch (error) {
      console.error("Error uploading document for worker", error);
    }

    await new Promise((resolve) => setTimeout(resolve, 600));
    setUploadState('idle');
  };

  const handleDeleteDoc = async (id: string) => {
    if (window.confirm("¿Seguro que deseas archivar este documento laboral? Se mantendrá en auditoría.")) {
      try {
        await documentAPI.delete(id);
        const docRes = await documentAPI.list();
        setWorkerDocs(docRes.data);
      } catch (error) {
        console.error("Error deleting worker document", error);
      }
    }
  };

  // Get active documents of selected worker
  const getSelectedWorkerDocs = () => {
    if (!selectedWorker) return [];
    
    let docs = workerDocs.filter((d) => {
      const rutMeta = (d.metadata?.rut_empleado || '').toLowerCase();
      const nameMeta = (d.metadata?.nombre_empleado || '').toLowerCase();
      const workerName = `${selectedWorker.first_name} ${selectedWorker.last_name}`.toLowerCase();
      const workerRut = (selectedWorker.rut || '').toLowerCase();
      
      return rutMeta.includes(workerRut) || nameMeta.includes(workerName) || 
             d.title.toLowerCase().includes(selectedWorker.first_name.toLowerCase()) ||
             d.title.toLowerCase().includes(selectedWorker.last_name.toLowerCase());
    });

    if (activeCategory !== 'all') {
      docs = docs.filter(d => d.category === activeCategory);
    }

    if (search) {
      const q = search.toLowerCase();
      docs = docs.filter(d => d.title.toLowerCase().includes(q) || (d.extracted_text && d.extracted_text.toLowerCase().includes(q)));
    }

    return docs;
  };

  const getWorkerDocCount = (worker: Worker) => {
    return workerDocs.filter((d) => {
      const rutMeta = (d.metadata?.rut_empleado || '').toLowerCase();
      const nameMeta = (d.metadata?.nombre_empleado || '').toLowerCase();
      const workerName = `${worker.first_name} ${worker.last_name}`.toLowerCase();
      const workerRut = (worker.rut || '').toLowerCase();
      return rutMeta.includes(workerRut) || nameMeta.includes(workerName) ||
             d.title.toLowerCase().includes(worker.first_name.toLowerCase()) ||
             d.title.toLowerCase().includes(worker.last_name.toLowerCase());
    }).length;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'contrato': return 'Contrato Laboral';
      case 'anexo': return 'Anexo de Contrato';
      case 'liquidacion': return 'Liquidación';
      case 'licencia_medica': return 'Licencia Médica';
      case 'epp': return 'Entrega EPP';
      default: return 'Otro';
    }
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
        <div className="flex items-center gap-3">
          {selectedWorker && (
            <button 
              onClick={() => setSelectedWorker(null)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 text-slate-500" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {selectedWorker ? `${selectedWorker.first_name} ${selectedWorker.last_name}` : 'Gestor Documental de Trabajadores'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
              {selectedWorker 
                ? `Ficha laboral, contratos y carpetas personales del colaborador.` 
                : 'Administra y audita los expedientes laborales y contratos del personal.'}
            </p>
          </div>
        </div>

        {selectedWorker && (
          <div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            />
            <button
              onClick={handleUploadClick}
              disabled={uploadState !== 'idle'}
              className="flex items-center gap-2 px-4.5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Cargar Documento Laboral
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
                {uploadState === 'uploading' && `Subiendo archivo... (${uploadPercent}%)`}
                {uploadState === 'ocr' && 'Extrayendo texto digital del PDF (OCR)...'}
                {uploadState === 'ai' && 'Analizando con IA y clasificando en el expediente...'}
                {uploadState === 'completed' && '¡Documento archivado con éxito!'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">El Ledger inmutable ISO 27001 está registrando la transacción.</p>
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

      {!selectedWorker ? (
        // ================= WORKERS CARD DIRECTORY =================
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar trabajador..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/70 border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800 rounded-xl text-xs focus:border-brand-500 focus:outline-none transition-colors"
              />
            </div>
            
            <div className="flex items-center gap-2 text-xs font-medium text-slate-450">
              <Users className="w-4.5 h-4.5 text-slate-400" />
              <span>{workers.length} Colaboradores Registrados</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workers
              .filter(w => `${w.first_name} ${w.last_name} ${w.email}`.toLowerCase().includes(search.toLowerCase()))
              .map((worker) => {
                const count = getWorkerDocCount(worker);
                return (
                  <div 
                    key={worker.id}
                    onClick={() => handleWorkerSelect(worker)}
                    className="bento-card p-5 flex flex-col justify-between hover:border-brand-500/20 hover:shadow-md transition-all group cursor-pointer hover-scale"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 bg-brand-500/10 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400 rounded-xl border border-brand-500/20 flex items-center justify-center font-bold text-sm">
                          {worker.first_name[0]}{worker.last_name[0]}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight group-hover:text-brand-600 dark:group-hover:text-brand-450 transition-colors">
                            {worker.first_name} {worker.last_name}
                          </h3>
                          <p className="text-[10px] text-slate-400 mt-1 font-mono uppercase tracking-wider">{worker.rut}</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-650 rounded-full">
                        {worker.role === 'admin' ? 'Administrador' : worker.role === 'hr' ? 'RRHH' : 'Trabajador'}
                      </span>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/40 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-slate-400">Departamento</p>
                        <p className="font-semibold text-slate-700 dark:text-slate-350">{worker.department}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400">Documentos</p>
                        <p className="font-extrabold text-brand-600 dark:text-brand-400">{count} archivos</p>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ) : (
        // ================= SELECTED WORKER PERSONAL FILE EXPEDIENT =================
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Left Panel: Worker Profile Info */}
          <div className="bento-card p-5 space-y-5 lg:col-span-1">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto bg-brand-600/10 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400 rounded-2xl border border-brand-500/20 flex items-center justify-center font-extrabold text-xl">
                {selectedWorker.first_name[0]}{selectedWorker.last_name[0]}
              </div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                {selectedWorker.first_name} {selectedWorker.last_name}
              </h3>
              <p className="text-[10px] px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-550 dark:text-slate-400 rounded-full inline-block font-mono uppercase font-bold">
                {selectedWorker.rut}
              </p>
            </div>

            <div className="border-t border-slate-150/40 dark:border-slate-800/40 pt-4 space-y-3.5 text-xs font-medium">
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase text-slate-400 tracking-wider">Correo Electrónico</span>
                <p className="text-slate-800 dark:text-slate-200 truncate">{selectedWorker.email}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase text-slate-400 tracking-wider">Departamento / Área</span>
                <p className="text-slate-800 dark:text-slate-200">{selectedWorker.department}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase text-slate-400 tracking-wider">Rol de Sistema</span>
                <p className="text-slate-800 dark:text-slate-200 uppercase tracking-widest text-[10px] font-bold text-indigo-500">
                  {selectedWorker.role === 'admin' ? 'Dueño / Admin' : selectedWorker.role === 'hr' ? 'Gestor RRHH' : 'Trabajador'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedWorker(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/60 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Volver al Directorio
            </button>
          </div>

          {/* Right Panel: Workers Files List */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* Filter Categories Row */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'contrato', label: 'Contratos' },
                  { id: 'anexo', label: 'Anexos' },
                  { id: 'liquidacion', label: 'Liquidaciones' },
                  { id: 'licencia_medica', label: 'Licencias Médicas' },
                  { id: 'epp', label: 'EPPs' }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeCategory === cat.id
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-900/60 text-slate-500 hover:text-slate-850 dark:hover:text-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-56 shrink-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrar archivos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8.5 pr-3.5 py-1.5 bg-white border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800 rounded-xl text-xs focus:border-brand-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Documents List */}
            <div className="space-y-3">
              {getSelectedWorkerDocs().length === 0 ? (
                <div className="bento-card p-12 text-center text-slate-400 text-xs">
                  No se encontraron documentos en esta carpeta.
                </div>
              ) : (
                getSelectedWorkerDocs().map((doc) => (
                  <div 
                    key={doc.id}
                    className="bento-card p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-350 dark:hover:border-slate-800 hover:shadow-[0_2px_10px_rgba(0,0,0,0.01)] transition-all"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="p-3 bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 rounded-xl border border-brand-100/35 dark:border-brand-900/20">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <h4 className="font-bold text-xs text-slate-850 dark:text-white truncate" title={doc.title}>
                          {doc.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-slate-450 dark:text-slate-500">
                          <span className="font-bold uppercase text-[9px] bg-brand-500/10 text-brand-600 px-2 py-0.5 rounded-full">
                            {getCategoryLabel(doc.category)}
                          </span>
                          <span>•</span>
                          <span>{formatBytes(doc.file_size)}</span>
                          <span>•</span>
                          <span>Versión {doc.version}</span>
                          <span>•</span>
                          <span>Subido el {new Date(doc.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-850/40 shrink-0">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl transition-all cursor-pointer"
                        title="Ver Documento"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-500 hover:text-rose-600 rounded-xl transition-all cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default WorkerDocuments;
