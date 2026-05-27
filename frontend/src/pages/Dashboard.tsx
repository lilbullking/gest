import React, { useEffect, useState } from 'react';
import { dashboardAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, Database, Users, Calendar, 
  Eye, Trash2, PlusCircle, CheckCircle, Sparkles, 
  ArrowRight, Clock, ArrowUpRight
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface KPIInfo {
  total_documents: number;
  total_size_bytes: number;
  pending_ocr: number;
  active_users: number;
}

interface ActivityLog {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  ip_address: string;
  created_at: string;
  user_detail?: {
    email: string;
    first_name: string;
    last_name: string;
  };
}

interface DashboardProps {
  setActiveTab?: (tab: 'dashboard' | 'documents' | 'admin') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ setActiveTab }) => {
  const { theme, user } = useAuth();
  
  const [kpis, setKpis] = useState<KPIInfo>({ total_documents: 0, total_size_bytes: 0, pending_ocr: 0, active_users: 0 });
  const [uploadsTrend, setUploadsTrend] = useState<any[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados del onboarding wizard
  const isDocumentosCargados = kpis.total_documents > 0;
  const isPersonalCreado = kpis.active_users > 1;
  const completedSteps = 1 + (isDocumentosCargados ? 1 : 0) + (isPersonalCreado ? 1 : 0);
  const onboardingPercentage = Math.round((completedSteps / 3) * 100);

  const fetchDashboardData = async () => {
    try {
      const response = await dashboardAPI.getKPIs();
      const { kpis: kpiData, monthly_uploads, recent_activity } = response.data;
      setKpis(kpiData);
      setUploadsTrend(monthly_uploads);
      setActivities(recent_activity);
    } catch (error) {
      console.error("Error al obtener datos del dashboard", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFriendlyActionText = (log: ActivityLog) => {
    const author = log.user_detail ? `${log.user_detail.first_name} ${log.user_detail.last_name}` : 'Sistema';
    
    switch (log.action) {
      case 'CREATE':
        return {
          title: `${author} subió un nuevo documento`,
          desc: `La IA clasificó el archivo y extrajo los metadatos de auditoría con éxito.`,
          icon: <PlusCircle className="w-4 h-4 text-emerald-600" />,
          bgColor: 'bg-emerald-50 dark:bg-emerald-950/20'
        };
      case 'READ':
        return {
          title: `${author} consultó un documento`,
          desc: `Visualización del documento en la ficha de control.`,
          icon: <Eye className="w-4 h-4 text-sky-600" />,
          bgColor: 'bg-sky-50 dark:bg-sky-950/20'
        };
      case 'DELETE':
        return {
          title: `${author} archivó un documento`,
          desc: `El documento fue retirado de la bandeja activa, manteniendo el log ISO 27001.`,
          icon: <Trash2 className="w-4 h-4 text-rose-600" />,
          bgColor: 'bg-rose-50 dark:bg-rose-950/20'
        };
      case 'UPLOAD_NEW_VERSION':
        return {
          title: `${author} actualizó una nueva versión`,
          desc: `Se incrementó la versión del documento tras adjuntar el nuevo archivo.`,
          icon: <ArrowUpRight className="w-4 h-4 text-brand-600" />,
          bgColor: 'bg-brand-50 dark:bg-brand-950/20'
        };
      default:
        return {
          title: `Acción registrada por ${author}`,
          desc: `Módulo: ${log.resource_type}. Operación inmutable en el ledger.`,
          icon: <CheckCircle className="w-4 h-4 text-slate-600" />,
          bgColor: 'bg-slate-50 dark:bg-slate-900/40'
        };
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
    <div className="space-y-8 animate-fadeIn font-sans selection:bg-brand-500 selection:text-white">
      
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            {user?.role === 'employee' ? 'Mi Portal Laboral' : 'Consola de Control'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">
            {user?.role === 'employee' 
              ? 'Visualiza tus liquidaciones de sueldo, contratos laborales vigentes y estado de firmas.'
              : 'Audita las métricas clave y la actividad en tiempo real del tenant.'}
          </p>
        </div>

        {/* Dynamic Greeting */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200/50 dark:bg-slate-900/40 dark:border-slate-800 rounded-xl text-xs shadow-[0_2px_10px_rgba(0,0,0,0.01)] text-slate-700 dark:text-slate-350 font-medium">
          <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          <span>¡Hola, {user?.first_name}!</span>
        </div>
      </div>

      {/* ONBOARDING WIZARD (Only visible for Admin/HR) */}
      {user?.role !== 'employee' && (
        <div className="bento-card p-6.5 border border-brand-100/40 dark:border-brand-900/30 bg-gradient-to-tr from-white to-brand-50/10 dark:from-slate-900/40 dark:to-brand-950/10 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 rounded-full bg-brand-500/5 blur-[80px] pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-extrabold bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-400 px-3 py-1 rounded-full uppercase tracking-wider">
                  Asistente de Onboarding
                </span>
                <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 font-mono">
                  {onboardingPercentage}% Completado
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Puesta en marcha de tu organización</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed font-medium">
                Completa estos sencillos pasos para tener tu PyME 100% digitalizada y cumplir con la legislación laboral vigente de manera automatizada.
              </p>
              
              {/* Progress bar */}
              <div className="w-48 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2.5">
                <div 
                  className="h-full bg-brand-600 transition-all duration-500 rounded-full" 
                  style={{ width: `${onboardingPercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Steps Visual List */}
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto shrink-0">
              {/* Step 1 */}
              <div className="flex items-center gap-2.5 px-4 py-3 bg-white dark:bg-slate-950/50 border border-slate-200/50 dark:border-slate-800 rounded-xl shadow-sm text-xs font-semibold">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <div className="text-left leading-tight">
                  <p className="text-slate-800 dark:text-slate-200">1. Empresa</p>
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 font-normal">Configurada</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className={`flex items-center gap-2.5 px-4 py-3 bg-white dark:bg-slate-950/50 border rounded-xl shadow-sm text-xs font-semibold ${isDocumentosCargados ? 'border-slate-200/50 dark:border-slate-800' : 'border-brand-200 dark:border-brand-900/50 animate-pulse'}`}>
                {isDocumentosCargados ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                ) : (
                  <span className="w-5 h-5 rounded-full border-2 border-brand-500 flex items-center justify-center text-[10px] text-brand-600 font-extrabold shrink-0">2</span>
                )}
                <div className="text-left leading-tight">
                  <p className="text-slate-800 dark:text-slate-200">2. Documentos</p>
                  <p className={`text-[10px] font-normal ${isDocumentosCargados ? 'text-slate-450 dark:text-slate-500' : 'text-brand-600'}`}>
                    {isDocumentosCargados ? 'Completado' : 'Subir contratos/EPPs'}
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-center gap-2.5 px-4 py-3 bg-white dark:bg-slate-950/50 border border-slate-200/50 dark:border-slate-800 rounded-xl shadow-sm text-xs font-semibold">
                {isPersonalCreado ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                ) : (
                  <span className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-500 shrink-0">3</span>
                )}
                <div className="text-left leading-tight">
                  <p className="text-slate-800 dark:text-slate-200">3. Colaboradores</p>
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 font-normal">
                    {isPersonalCreado ? 'Completado' : 'Alta de personal'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bento Grid: KPIs (4 columnas) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1 */}
        <div className="bento-card p-6 shadow-sm relative group">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                {user?.role === 'employee' ? 'Mis Documentos' : 'Documentos Activos'}
              </span>
              <h3 className="text-3xl font-black mt-2 text-slate-850 dark:text-white font-sans">{kpis.total_documents}</h3>
            </div>
            <div className="p-3 bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400 rounded-2xl border border-brand-100/40 dark:border-brand-900/30">
              <FileText className="w-5.5 h-5.5" />
            </div>
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-5 flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {user?.role === 'employee' ? 'Firmados y validados legalmente' : 'Aislados en el Tenant actual'}
          </div>
        </div>

        {/* Card 2 */}
        <div className="bento-card p-6 shadow-sm relative group">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                {user?.role === 'employee' ? 'Peso de mis Archivos' : 'Almacenamiento Seguro'}
              </span>
              <h3 className="text-3xl font-black mt-2 text-slate-850 dark:text-white font-sans">{formatBytes(kpis.total_size_bytes)}</h3>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400 rounded-2xl border border-indigo-100/40 dark:border-indigo-900/30">
              <Database className="w-5.5 h-5.5" />
            </div>
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-5 font-medium">
            {user?.role === 'employee' ? 'Espacio utilizado en tu cuenta' : 'Espacio utilizado en la nube'}
          </div>
        </div>

        {/* Card 3 */}
        <div className="bento-card p-6 shadow-sm relative group">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                {user?.role === 'employee' ? 'Trámites Pendientes' : 'Documentos en Proceso'}
              </span>
              <h3 className="text-3xl font-black mt-2 text-slate-850 dark:text-white font-sans">{user?.role === 'employee' ? 0 : kpis.pending_ocr}</h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 rounded-2xl border border-amber-100/40 dark:border-amber-900/30 relative">
              <Sparkles className="w-5.5 h-5.5" />
              {user?.role !== 'employee' && kpis.pending_ocr > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 dark:bg-amber-400 rounded-full animate-ping"></span>
              )}
            </div>
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-5 flex items-center gap-1.5 font-medium">
            {user?.role === 'employee' ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Todo al día
              </span>
            ) : kpis.pending_ocr > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-bold">IA digitalizando documentos...</span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-550 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Todos los documentos listos
              </span>
            )}
          </div>
        </div>

        {/* Card 4 */}
        <div className="bento-card p-6 shadow-sm relative group">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                {user?.role === 'employee' ? 'Mi Perfil' : 'Miembros Activos'}
              </span>
              <h3 className="text-3xl font-black mt-2 text-slate-850 dark:text-white font-sans">
                {user?.role === 'employee' ? '1' : kpis.active_users}
              </h3>
            </div>
            <div className="p-3 bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400 rounded-2xl border border-violet-100/40 dark:border-violet-900/30">
              <Users className="w-5.5 h-5.5" />
            </div>
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-5 font-medium">
            {user?.role === 'employee' ? `Usuario: ${user.first_name} (Rol Trabajador)` : 'RBAC: Segregación por Roles'}
          </div>
        </div>

      </div>

      {/* QUICK ACTIONS ROW (SaaS Experience) */}
      <div className="bento-card p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          Acciones Rápidas
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <button 
            onClick={() => setActiveTab && setActiveTab('documents')}
            className="flex items-center justify-between p-4 bg-white/60 dark:bg-[#0c111f]/40 border border-white/60 dark:border-slate-850/40 rounded-2xl transition-all hover:border-brand-500/20 text-left group hover-scale cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-emerald-50 text-emerald-650 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-xl border border-emerald-100/30 dark:border-emerald-900/10 group-hover:scale-105 transition-transform">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {user?.role === 'employee' ? 'Cargar Licencia Médica' : 'Cargar Documento'}
                </p>
                <p className="text-[10px] text-slate-450 dark:text-slate-500">Ingesta y clasificación por IA</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-1 transition-all" />
          </button>

          <button 
            onClick={() => setActiveTab && setActiveTab(user?.role === 'employee' ? 'documents' : 'admin')}
            className="flex items-center justify-between p-4 bg-white/60 dark:bg-[#0c111f]/40 border border-white/60 dark:border-slate-850/40 rounded-2xl transition-all hover:border-brand-500/20 text-left group hover-scale cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 rounded-xl border border-brand-100/30 dark:border-brand-900/10 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {user?.role === 'employee' ? 'Firmar Documentación' : 'Añadir Colaborador'}
                </p>
                <p className="text-[10px] text-slate-450 dark:text-slate-500 font-medium">
                  {user?.role === 'employee' ? 'Vincular firmas digitales' : 'Provisionar nuevo acceso'}
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-1 transition-all" />
          </button>

          <button 
            onClick={() => setActiveTab && setActiveTab(user?.role === 'employee' ? 'documents' : 'admin')}
            className="flex items-center justify-between p-4 bg-white/60 dark:bg-[#0c111f]/40 border border-white/60 dark:border-slate-850/40 rounded-2xl transition-all hover:border-brand-500/20 text-left group hover-scale cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 rounded-xl border border-indigo-100/30 dark:border-indigo-900/10 group-hover:scale-105 transition-transform">
                <Database className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {user?.role === 'employee' ? 'Mis Liquidaciones' : 'Logs de Auditoría'}
                </p>
                <p className="text-[10px] text-slate-450 dark:text-slate-500 font-medium">
                  {user?.role === 'employee' ? 'Ver mis haberes del mes' : 'ISO 27001 Compliance'}
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-1 transition-all" />
          </button>

        </div>
      </div>

      {/* Bento Row: Charts & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Trend */}
        <div className="lg:col-span-2 bento-card p-6.5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
            <Calendar className="w-4.5 h-4.5 text-brand-600" />
            Flujo Mensual de Carga Documental
          </h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={uploadsTrend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0', borderRadius: 12, color: theme === 'dark' ? '#f8fafc' : '#0f172a', fontSize: 11 }} />
                <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" name="Archivos" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Timeline of activity (human-friendly) */}
        <div className="bento-card p-6.5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-indigo-500" />
              Actividad Reciente
            </h3>
            
            {activities.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-slate-400 text-xs">
                Sin actividad registrada.
              </div>
            ) : (
              <div className="space-y-4 relative pl-3.5 before:absolute before:left-1 before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
                {activities.map((act) => {
                  const details = getFriendlyActionText(act);
                  return (
                    <div key={act.id} className="relative group text-xs">
                      {/* Timeline dot */}
                      <span className="absolute -left-[19px] top-1.5 w-2 h-2 rounded-full bg-slate-300 group-hover:bg-brand-500 ring-4 ring-white dark:ring-slate-900 transition-colors"></span>
                      
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800 dark:text-slate-200 leading-none">{details.title}</span>
                        </div>
                        <p className="text-[10px] text-slate-450 dark:text-slate-500 leading-relaxed font-medium">
                          {details.desc}
                        </p>
                        <span className="text-[9px] text-slate-400 dark:text-slate-650 font-mono block">
                          {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <button 
            onClick={() => setActiveTab && setActiveTab(user?.role === 'employee' ? 'documents' : 'admin')}
            className="w-full text-center text-[10px] font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 py-2 border-t border-slate-100 dark:border-slate-800/40 uppercase tracking-widest mt-4 block"
          >
            Ver Historial Completo
          </button>
        </div>

      </div>
      
    </div>
  );
};

export default Dashboard;
