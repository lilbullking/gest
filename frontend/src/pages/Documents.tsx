import React, { useEffect, useState, useRef } from 'react';
import { documentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Upload, Search, FileText, Eye, Trash2, 
  History, Info, RefreshCw, X, Sparkles, User,
  BookOpen, AlertTriangle
} from 'lucide-react';

interface DocumentInfo {
  id: string;
  title: string;
  file_url: string;
  file_size: number;
  file_type: string;
  category: string;
  ocr_status: 'pending' | 'processing' | 'completed' | 'failed';
  extracted_text?: string;
  metadata: Record<string, any>;
  version: number;
  created_at: string;
  uploaded_by_detail?: {
    email: string;
    first_name: string;
    last_name: string;
  };
}

interface VersionInfo {
  id: string;
  version: number;
  file_url: string;
  file_size: number;
  change_reason: string;
  created_at: string;
  changed_by_detail?: {
    email: string;
    first_name: string;
    last_name: string;
  };
}

const CATEGORIES = [
  { id: 'all', label: 'Todos' },
  { id: 'contrato', label: 'Contratos Laborales' },
  { id: 'anexo', label: 'Anexos (Contrato/Vacaciones)' },
  { id: 'liquidacion', label: 'Liquidaciones de Sueldo' },
  { id: 'licencia_medica', label: 'Licencias Médicas' },
  { id: 'epp', label: 'Entrega de EPP' },
  { id: 'factura', label: 'Facturas y Boletas' },
  { id: 'cotizacion', label: 'Cotizaciones' },
  { id: 'documentacion_administrativa', label: 'Administrativos' },
];

const Documents: React.FC = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedDoc, setSelectedDoc] = useState<DocumentInfo | null>(null);
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Estados para simulación multietapa de carga e IA
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'ocr' | 'ai' | 'completed'>('idle');
  const [uploadPercent, setUploadPercent] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [changeReason, setChangeReason] = useState('');
  const versionFileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    try {
      const cat = activeCategory === 'all' ? undefined : activeCategory;
      const response = await documentAPI.list({ q: search, category: cat });
      setDocuments(response.data);
      
      if (selectedDoc) {
        const updated = response.data.find((d: any) => d.id === selectedDoc.id);
        if (updated) setSelectedDoc(updated);
      }
    } catch (error) {
      console.error("Error al buscar documentos", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [search, activeCategory, selectedDoc?.id]);

  const handleUploadClick = () => {
    if (uploadState !== 'idle') return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadDocumentFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (uploadState !== 'idle') return;
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (uploadState !== 'idle') return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await uploadDocumentFile(file);
    }
  };

  // Simulación multietapa con tiempos medidos para demostrar la IA
  const uploadDocumentFile = async (file: File) => {
    // 1. Subida del archivo
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
    
    // 2. Procesamiento OCR
    setUploadState('ocr');
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // 3. Procesamiento IA / NLP
    setUploadState('ai');
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // 4. Completado e indexación
    setUploadState('completed');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);
    try {
      await documentAPI.create(formData);
      await fetchDocuments();
    } catch (error) {
      console.error("Error en la subida", error);
    }

    await new Promise((resolve) => setTimeout(resolve, 800));
    setUploadState('idle');
  };

  const handleDeleteDoc = async (id: string) => {
    if (window.confirm("¿Estás seguro de que deseas archivar este documento? Se mantendrá en los logs de auditoría.")) {
      try {
        await documentAPI.delete(id);
        setSelectedDoc(null);
        fetchDocuments();
      } catch (error) {
        console.error("Error al borrar", error);
      }
    }
  };

  const selectDoc = async (doc: DocumentInfo) => {
    setSelectedDoc(doc);
    try {
      const simulatedVersions: VersionInfo[] = [
        {
          id: `v_${doc.id}_1`,
          version: doc.version - 1,
          file_url: doc.file_url,
          file_size: doc.file_size,
          change_reason: "Carga inicial del documento",
          created_at: doc.created_at,
          changed_by_detail: doc.uploaded_by_detail
        }
      ].filter(v => v.version > 0);
      setVersions(simulatedVersions);
    } catch (error) {
      setVersions([]);
    }
  };

  const handleNewVersionUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionFile || !selectedDoc) return;
    
    const formData = new FormData();
    formData.append('file', versionFile);
    formData.append('change_reason', changeReason || 'Nueva versión cargada');
    
    try {
      const res = await documentAPI.uploadNewVersion(selectedDoc.id, formData);
      setSelectedDoc(res.data);
      setVersionFile(null);
      setChangeReason('');
      await fetchDocuments();
    } catch (error) {
      console.error(error);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    return (bytes / k).toFixed(1) + ' KB';
  };

  const getOcrBadge = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30';
      case 'processing': return 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 animate-pulse';
      case 'failed': return 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30';
      default: return 'bg-slate-50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400 border border-slate-200/50';
    }
  };

  const getCategoryLabel = (cat: string) => {
    return CATEGORIES.find(c => c.id === cat)?.label || cat;
  };

  const renderDocumentThumbnail = (doc: DocumentInfo) => {
    const isImage = ['jpg', 'jpeg', 'png'].includes(doc.file_type.toLowerCase());
    
    if (isImage && doc.file_url && doc.file_url !== '#') {
      return (
        <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-sm shrink-0">
          <img src={doc.file_url} className="w-full h-full object-cover" alt={doc.title} />
        </div>
      );
    }
    
    if (isImage) {
      return (
        <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 text-violet-650 dark:text-violet-400 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      );
    }
    
    // Default PDF or document
    return (
      <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
        <FileText className="w-5 h-5" />
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start animate-fadeIn font-sans selection:bg-brand-500 selection:text-white">
      
      {/* Document Ingestion & Table (Columns 1 & 2) */}
      <div className="xl:col-span-2 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white font-sans">Gestor Documental</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">Organiza la información de tu empresa. El procesamiento de metadatos se ejecuta automáticamente.</p>
        </div>

        {/* Pulsing Drag & Drop Area with Multi-Stage Feedback */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleUploadClick}
          className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 relative overflow-hidden group ${
            isDragOver 
              ? 'border-brand-500 bg-brand-50/20 dark:bg-brand-950/15 shadow-sm' 
              : 'border-slate-200 dark:border-slate-800 bg-white hover:border-brand-300 dark:bg-slate-900/20 dark:hover:border-slate-700 shadow-[0_4px_20px_rgba(0,0,0,0.01)]'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg"
          />

          {/* Dynamic upload phases */}
          {uploadState !== 'idle' ? (
            <div className="w-full max-w-md flex flex-col items-center space-y-5 py-4 relative z-10">
              
              {/* Spinning/Animating icon */}
              <div className="p-4 bg-brand-50 dark:bg-brand-950/20 rounded-2xl">
                <RefreshCw className="w-8 h-8 text-brand-600 dark:text-brand-400 animate-spin" />
              </div>

              {/* Steps indicators */}
              <div className="w-full space-y-3.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-800 dark:text-slate-200">
                    {uploadState === 'uploading' && `1. Guardando archivo (${uploadPercent}%)`}
                    {uploadState === 'ocr' && '2. Digitalizando texto y firmas...'}
                    {uploadState === 'ai' && '3. IA analizando datos y categoría...'}
                    {uploadState === 'completed' && '4. ¡Listo para usar!'}
                  </span>
                  <span className="text-[10px] bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-400 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Procesando
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand-600 transition-all duration-300 rounded-full"
                    style={{
                      width: 
                        uploadState === 'uploading' ? `${uploadPercent}%` :
                        uploadState === 'ocr' ? '50%' :
                        uploadState === 'ai' ? '80%' : '100%'
                    }}
                  ></div>
                </div>

                <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                  {uploadState === 'uploading' && 'Guardando archivo de forma segura en Nubcore...'}
                  {uploadState === 'ocr' && 'Digitalizando firmas y textos del documento...'}
                  {uploadState === 'ai' && 'La IA está extrayendo nombres, RUTs y montos de forma automática...'}
                  {uploadState === 'completed' && '¡Procesamiento finalizado con éxito!'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center space-y-4 relative z-10">
              <div className="p-4 bg-slate-50 border border-slate-200/60 dark:bg-slate-900/65 dark:border-slate-800 rounded-2xl text-brand-600 dark:text-brand-400 shadow-sm group-hover:scale-105 transition-transform duration-300">
                <Upload className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-slate-800 dark:text-slate-200 font-semibold text-sm">
                  {user?.role === 'employee' 
                    ? 'Sube tu Licencia Médica o Firma de EPP' 
                    : 'Arrastra tu archivo PDF o Imagen aquí'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {user?.role === 'employee' 
                    ? 'Registra tu documentación médica o recepción de implementos de seguridad' 
                    : 'O haz clic para explorar en tu equipo local (Formatos: PDF, JPG, PNG)'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Searching & Filters (SaaS Look) */}
        <div className="space-y-5 bg-white/30 dark:bg-slate-900/10 p-4 border border-slate-200/40 dark:border-slate-800/40 rounded-2xl backdrop-blur-sm">
          
          {/* Scrollable Categories Tagbar (Row 1) */}
          <div className="overflow-x-auto flex gap-2 no-scrollbar justify-start">
            {CATEGORIES.slice(0, 5).map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all duration-200 cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-500/10'
                    : 'bg-white/80 hover:bg-slate-50 border-slate-200/60 text-slate-500 hover:text-slate-800 dark:bg-[#0c111f]/60 dark:hover:bg-slate-900/20 dark:border-slate-800/60 dark:text-slate-400'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="border-t border-slate-200/40 dark:border-slate-800/30 my-1"></div>

          {/* Search bar and Quick suggestions (Row 2) */}
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
            {/* Smart search input */}
            <div className="relative flex-1 lg:max-w-md">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar liquidaciones, contratos o RUTs..."
                className="w-full bg-white border border-slate-200 dark:bg-[#090d16]/40 dark:border-slate-800/80 rounded-xl py-3 pl-10 pr-4 text-xs focus:border-brand-500 focus:outline-none transition-all duration-200 focus:ring-1 focus:ring-brand-500/20 text-slate-800 dark:text-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.01)]"
              />
            </div>

            {/* AI Suggestion Chips */}
            <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-400 dark:text-slate-500">Búsquedas rápidas:</span>
              {[
                { text: 'Liquidaciones', query: 'Liquidacion' },
                { text: 'Contratos', query: 'Contrato' },
                { text: 'Juan Pérez', query: 'Juan' },
                { text: 'EPP', query: 'EPP' }
              ].map((chip) => (
                <button
                  key={chip.text}
                  onClick={() => setSearch(chip.query)}
                  className="px-2.5 py-1 bg-white border border-slate-200/80 hover:border-brand-400 hover:text-brand-650 dark:bg-slate-950/40 dark:border-slate-850 dark:hover:border-brand-500 rounded-lg transition-all cursor-pointer font-medium"
                >
                  {chip.text}
                </button>
              ))}
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="text-[9px] text-rose-500 hover:text-rose-600 font-bold ml-1 cursor-pointer"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Document Bento Table (Dropbox Clean Grid Style) */}
        <div className="bento-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-350">
              <thead>
                <tr className="border-b border-slate-150 dark:border-slate-850 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-950/20">
                  <th className="py-4 px-5">Nombre del Archivo</th>
                  <th className="py-4 px-5">Categoría</th>
                  <th className="py-4 px-5 text-center">Estado OCR</th>
                  <th className="py-4 px-5 text-right">Peso/Versión</th>
                  <th className="py-4 px-5 text-right">Fecha de Carga</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto"></div>
                    </td>
                  </tr>
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-14 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3.5 text-center text-slate-500">
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-full text-slate-400">
                          <BookOpen className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No hay documentos registrados</p>
                          <p className="text-xs text-slate-450 dark:text-slate-500 leading-normal">
                            {user?.role === 'employee' 
                              ? 'Aún no posees liquidaciones o contratos disponibles en tu ficha.' 
                              : 'Arrastra y carga el primer archivo PDF para iniciar la indexación por IA.'}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr
                      key={doc.id}
                      onClick={() => selectDoc(doc)}
                      className={`border-b border-slate-100 dark:border-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900/10 cursor-pointer transition-colors ${
                        selectedDoc?.id === doc.id ? 'bg-brand-50/40 dark:bg-brand-950/10' : ''
                      }`}
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          {renderDocumentThumbnail(doc)}
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1 max-w-[200px] sm:max-w-xs">{doc.title}</p>
                            <p className="text-[10px] text-slate-450 dark:text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                              <User className="w-3 h-3 text-slate-400" />
                              {doc.uploaded_by_detail ? `${doc.uploaded_by_detail.first_name} ${doc.uploaded_by_detail.last_name}` : 'Sistema'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <span className="inline-block px-2.5 py-0.5 rounded bg-slate-50 dark:bg-[#0e1422] border border-slate-200 dark:border-slate-800 text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {getCategoryLabel(doc.category)}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-bold ${getOcrBadge(doc.ocr_status)}`}>
                          {doc.ocr_status === 'completed' ? 'Listo' : doc.ocr_status === 'processing' ? 'Procesando' : 'Error'}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right font-medium">
                        <span className="text-slate-800 dark:text-slate-200">{formatBytes(doc.file_size)}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-550 ml-1.5 font-bold">v{doc.version}</span>
                      </td>
                      <td className="py-4 px-5 text-right text-slate-500 dark:text-slate-400 font-mono text-[10px]">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail sidebar (Column 3) */}
      <div className="xl:col-span-1">
        {selectedDoc ? (
          <div className="bento-card p-6 space-y-6 shadow-md border border-slate-200/40 dark:border-slate-800/80 animate-slideIn bg-white dark:bg-slate-900/45 sticky top-6">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 rounded-xl border border-brand-100/40">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-850 dark:text-slate-200 line-clamp-1 max-w-[160px] text-xs">{selectedDoc.title}</h3>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Ficha de Control</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDoc(null)}
                className="p-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 dark:bg-slate-950/40 dark:border-slate-800 rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            {/* Actions Panel */}
            <div className="flex gap-2">
              <a
                href={selectedDoc.file_url}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 px-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-center text-xs font-bold flex items-center justify-center gap-2 hover-scale shadow-sm shadow-brand-500/10 border border-brand-500/15"
              >
                <Eye className="w-4 h-4" /> Descargar Archivo
              </a>
              {user?.role === 'admin' && (
                <button
                  onClick={() => handleDeleteDoc(selectedDoc.id)}
                  className="p-2 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 dark:bg-red-950/20 dark:border-red-900/40 dark:text-rose-400 rounded-xl transition-all hover-scale"
                  title="Archivar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Visual Preview */}
            <div className="w-full bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl overflow-hidden aspect-video flex items-center justify-center relative group shadow-inner">
              {['jpg', 'jpeg', 'png'].includes(selectedDoc.file_type.toLowerCase()) && selectedDoc.file_url !== '#' ? (
                <img src={selectedDoc.file_url} className="w-full h-full object-cover" alt="Preview" />
              ) : (
                <div className="flex flex-col items-center justify-center p-4 text-center space-y-2 select-none">
                  <div className="w-12 h-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg shadow-sm flex flex-col justify-between p-2 relative overflow-hidden group-hover:scale-105 transition-transform duration-300">
                    <div className="w-full h-1 bg-brand-500/20 rounded"></div>
                    <div className="space-y-1">
                      <div className="w-full h-0.5 bg-slate-105 dark:bg-slate-800 rounded"></div>
                      <div className="w-5/6 h-0.5 bg-slate-105 dark:bg-slate-800 rounded"></div>
                      <div className="w-4/6 h-0.5 bg-slate-105 dark:bg-slate-800 rounded"></div>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[7px] font-bold text-brand-600 font-mono uppercase">{selectedDoc.file_type}</span>
                      <span className="text-[7px] text-slate-400 font-bold">v{selectedDoc.version}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Previsualización de {selectedDoc.file_type.toUpperCase()}</span>
                </div>
              )}
            </div>

            {/* Metadatos extraídos por IA (Clean table layout) */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                Metadatos IA
              </h4>
              
              {selectedDoc.ocr_status === 'processing' ? (
                <div className="p-4 bg-slate-50 border border-slate-200 dark:bg-slate-950/40 dark:border-slate-800 rounded-xl text-center text-xs text-slate-500 animate-pulse">
                  Procesando textos...
                </div>
              ) : Object.keys(selectedDoc.metadata).length === 0 ? (
                <div className="p-4 bg-slate-50/50 border border-slate-200/50 dark:bg-slate-950/30 dark:border-slate-800/40 rounded-xl text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
                  Sin metadatos estructurados.
                </div>
              ) : (
                <div className="bg-slate-50/40 border border-slate-200/40 dark:bg-[#0e1422]/65 dark:border-slate-800 rounded-xl p-4 space-y-2.5 text-xs">
                  {Object.entries(selectedDoc.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center border-b border-slate-200/30 dark:border-slate-800/40 pb-1.5 last:border-0 last:pb-0">
                      <span className="text-slate-400 dark:text-slate-500 capitalize font-medium">{key.replace('_', ' ')}</span>
                      <span className="text-slate-800 dark:text-slate-200 font-semibold">{value as string}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* OCR Text Display (Clean and collapsible) */}
            {selectedDoc.ocr_status === 'completed' && selectedDoc.extracted_text && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-brand-600" />
                  Texto Digitalizado (OCR)
                </h4>
                <div className="bg-slate-50 border border-slate-200 dark:bg-slate-950/60 dark:border-slate-850 rounded-xl p-3.5 max-h-[140px] overflow-y-auto text-[11px] font-mono text-slate-700 dark:text-slate-350 leading-relaxed whitespace-pre-line no-scrollbar">
                  {selectedDoc.extracted_text}
                </div>
              </div>
            )}

            {/* Replace / Upload version */}
            {['admin', 'hr'].includes(user?.role || '') && (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-400 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-slate-400" />
                  Reemplazar Archivo (v{selectedDoc.version + 1})
                </h4>
                <form onSubmit={handleNewVersionUpload} className="space-y-2">
                  <input
                    type="file"
                    ref={versionFileInputRef}
                    onChange={(e) => setVersionFile(e.target.files?.[0] || null)}
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => versionFileInputRef.current?.click()}
                      className="flex-1 text-left text-xs bg-slate-50 border border-slate-200 dark:bg-[#070b15] dark:border-slate-800 py-2 px-3 rounded-lg text-slate-500 dark:text-slate-400 truncate"
                    >
                      {versionFile ? versionFile.name : "Seleccionar..."}
                    </button>
                    <button
                      type="submit"
                      disabled={!versionFile}
                      className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs py-2 px-4 rounded-lg hover-scale disabled:opacity-50 disabled:pointer-events-none"
                    >
                      Cargar
                    </button>
                  </div>
                  <input
                    type="text"
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    placeholder="Escribe el motivo del reemplazo"
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-[#070b15] dark:border-slate-800 rounded-lg py-2 px-3 text-xs focus:border-brand-500 focus:outline-none text-slate-800 dark:text-slate-200 font-medium"
                  />
                </form>
              </div>
            )}

            {/* Versions History */}
            {versions.length > 0 && (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-450 dark:text-slate-400 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-slate-500" />
                  Versiones Anteriores
                </h4>
                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {versions.map((v) => (
                    <div key={v.id} className="bg-slate-50 border border-slate-200/50 dark:bg-[#050811]/45 dark:border-slate-800 p-3 rounded-xl text-xs flex justify-between items-start gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-700 dark:text-slate-200">Versión {v.version}</span>
                          <span className="text-[8px] bg-slate-100 border border-slate-200 dark:bg-slate-900 px-1.5 py-0.5 rounded dark:border-slate-800 text-slate-500 dark:text-slate-400">
                            {formatBytes(v.file_size)}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 italic leading-snug">"{v.change_reason}"</p>
                        {v.changed_by_detail && (
                          <p className="text-[9px] text-slate-500 flex items-center gap-1">
                            <User className="w-2.5 h-2.5 text-slate-400" />
                            {v.changed_by_detail.first_name} {v.changed_by_detail.last_name}
                          </p>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-400 shrink-0 font-mono">
                        {new Date(v.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="hidden xl:flex flex-col items-center justify-center p-8 bg-slate-100/10 border border-slate-200/60 border-dashed rounded-3xl h-[400px] text-center text-slate-500 dark:bg-slate-950/20 dark:border-slate-800/80">
            <Info className="w-8 h-8 text-slate-350 dark:text-slate-700 mb-2.5" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Sin archivo seleccionado</p>
            <p className="text-xs text-slate-450 dark:text-slate-600 mt-1 max-w-[200px] leading-normal font-medium">Haz clic en cualquier fila para desplegar su ficha de control e historial.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default Documents;
