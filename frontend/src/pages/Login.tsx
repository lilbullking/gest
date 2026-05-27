import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { Shield, Building2, User, KeyRound, AlertCircle, Sparkles, ChevronRight, CheckCircle } from 'lucide-react';

const Login: React.FC = () => {
  const { login, enableSimulation } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [activeSimTab, setActiveSimTab] = useState<'alfa' | 'beta'>('alfa');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await authAPI.login({ email, password });
      const { access, user: userData } = response.data;
      login(access, userData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Credenciales inválidas. Verifica tu conexión o utiliza la Consola de Simulación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center mesh-gradient-bg text-slate-800 dark:text-slate-100 relative overflow-hidden font-sans transition-colors duration-300 selection:bg-brand-500 selection:text-white">
      
      {/* 2026 Grid Pattern - Very Clean */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f020_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f020_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1f293704_1px,transparent_1px),linear-gradient(to_bottom,#1f293704_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0"></div>
      
      {/* Shifting radial lights */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full bg-brand-500/5 dark:bg-brand-500/10 blur-[130px] pointer-events-none z-0 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-indigo-500/5 dark:bg-indigo-500/8 blur-[130px] pointer-events-none z-0 animate-pulse"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-white/20 dark:bg-slate-900/10 blur-[150px] pointer-events-none z-0"></div>
 
       <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-12 p-8 z-10 items-center">
         
         {/* LEFT COLUMN: HERO AREA WITH BRAND */}
         <div className="lg:col-span-6 flex flex-col justify-center space-y-8 text-center lg:text-left relative">
           
           {/* Logo */}
           <div className="flex items-center justify-center lg:justify-start gap-3">
             <div className="p-2.5 bg-brand-600 text-white rounded-xl shadow-md">
               <Shield className="w-6.5 h-6.5" />
             </div>
             <span className="text-2xl font-extrabold tracking-wider text-slate-850 dark:text-white font-sans">
               nubcore
             </span>
           </div>
           
           {/* Text */}
           <div className="space-y-4">
             <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.15] text-slate-900 dark:text-white">
               Gestión documental <br />
               <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
                 simple e inteligente
               </span>
             </h1>
             <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed max-w-md mx-auto lg:mx-0 font-medium">
               Simplifica, clasifica y gestiona los contratos y liquidaciones de sueldo de tu PyME en un entorno SaaS multiempresa seguro y ordenado.
             </p>
           </div>
 
           {/* ACTIVE ENGINE CONSOLE (Clean corporate info) */}
           <div className="hidden lg:flex items-center gap-4 p-4.5 bg-white border border-slate-200/50 dark:bg-slate-900/40 dark:border-slate-800 rounded-2xl max-w-sm shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
             <div className="p-2.5 bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 rounded-xl">
               <CheckCircle className="w-5 h-5" />
             </div>
             <div className="text-left">
               <p className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wide">
                 Clasificación Automática IA
               </p>
               <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-normal mt-0.5">
                 Extracción automática de datos estructurados: RUTs, firmas, nombres y montos líquidos.
               </p>
             </div>
           </div>
         </div>
         
         {/* RIGHT COLUMN: LOGIN BOX & SIMULATOR */}
         <div className="lg:col-span-6 flex flex-col space-y-6">
           
           {/* CREDENTIALS LOGIN CONTAINER */}
           <div className="bento-card p-8 rounded-[24px] border border-slate-200/40 dark:border-slate-800/40 shadow-[0_12px_40px_rgba(0,0,0,0.015)] bg-white dark:bg-slate-900/45">
             <h2 className="text-xl font-bold mb-5 text-slate-900 dark:text-slate-100 flex items-center gap-2">
               <KeyRound className="w-5 h-5 text-brand-600 dark:text-brand-400" />
               Ingresar al portal
             </h2>
 
             {error && (
               <div className="mb-5 p-3.5 bg-red-50 border border-red-200/60 dark:bg-red-950/20 dark:border-red-900/40 rounded-xl flex items-start gap-2.5 text-red-700 dark:text-red-300 text-xs shadow-sm animate-fadeIn">
                 <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                 <span>{error}</span>
               </div>
             )}
 
             <form onSubmit={handleSubmit} className="space-y-4">
               <div>
                 <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-1.5">Email Corporativo</label>
                 <div className="relative">
                   <User className="absolute left-4 top-3.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
                   <input
                     type="email"
                     required
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     placeholder="nombre@empresa.com"
                     className="w-full input-premium py-3 pl-11 pr-4 text-xs font-medium"
                   />
                 </div>
               </div>
 
               <div>
                 <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-1.5">Contraseña</label>
                 <div className="relative">
                   <KeyRound className="absolute left-4 top-3.5 w-4.5 h-4.5 text-slate-400 dark:text-slate-500" />
                   <input
                     type="password"
                     required
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     placeholder="••••••••"
                     className="w-full input-premium py-3 pl-11 pr-4 text-xs font-medium"
                   />
                 </div>
               </div>
 
               <button
                 type="submit"
                 disabled={isSubmitting}
                 className="w-full bg-brand-600 hover:bg-brand-700 py-3 rounded-xl font-bold text-xs tracking-wider uppercase transition-all duration-200 shadow-md shadow-brand-500/10 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none mt-4 text-white border border-brand-500/10"
               >
                 {isSubmitting ? 'Iniciando Sesión...' : 'Entrar'}
               </button>
             </form>
           </div>

          {/* TABBED SIMULATOR CARD */}
          <div className="bento-card p-6 rounded-[24px] border border-slate-200/40 dark:border-slate-800/40 shadow-[0_12px_40px_rgba(0,0,0,0.015)] bg-white dark:bg-slate-900/45">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200/40 dark:border-slate-800">
              <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400">
                <Sparkles className="w-4.5 h-4.5 animate-pulse" />
                <span className="font-extrabold text-[10px] tracking-wider uppercase">Acceso Rápido Demo</span>
              </div>
              
              {/* Tabs */}
              <div className="flex bg-slate-50 dark:bg-[#050811] p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <button
                  onClick={() => setActiveSimTab('alfa')}
                  className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                    activeSimTab === 'alfa' 
                      ? 'bg-brand-600 text-white shadow-sm' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Alfa
                </button>
                <button
                  onClick={() => setActiveSimTab('beta')}
                  className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                    activeSimTab === 'beta' 
                      ? 'bg-brand-600 text-white shadow-sm' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Beta
                </button>
              </div>
            </div>

            <p className="text-slate-500 dark:text-slate-400 text-xs mb-5 leading-relaxed font-medium">
              {activeSimTab === 'alfa' 
                ? "Simula a Constructora Alfa S.A. (RUT 76.123.456-K). Documentación operativa, EPPs y contratos laborales." 
                : "Simula a Tecnología Beta Ltda. (RUT 78.987.654-3). Enfoque administrativo, facturas de hosting y contratos IT."
              }
            </p>

            {/* Role cards */}
            <div className="grid grid-cols-3 gap-3">
              
              {/* Admin profile */}
              <button
                onClick={() => enableSimulation(activeSimTab, 'admin')}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 hover:bg-brand-50/40 border border-slate-200 hover:border-brand-500/20 text-slate-700 hover:text-slate-900 dark:bg-[#070b15]/65 dark:border-slate-800 dark:hover:border-brand-500/40 dark:text-slate-300 dark:hover:text-white transition-all hover:scale-102 group relative shadow-sm"
              >
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-1.5 border border-brand-500/5 group-hover:bg-brand-500/20">
                  <KeyRound className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold leading-tight">Administrador</span>
                <span className="text-[8px] text-slate-400 dark:text-slate-500 mt-0.5">Control Total</span>
                <ChevronRight className="w-3 h-3 absolute right-2 top-2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              {/* HR profile */}
              <button
                onClick={() => enableSimulation(activeSimTab, 'hr')}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 hover:bg-brand-50/40 border border-slate-200 hover:border-brand-500/20 text-slate-700 hover:text-slate-900 dark:bg-[#070b15]/65 dark:border-slate-800 dark:hover:border-brand-500/40 dark:text-slate-300 dark:hover:text-white transition-all hover:scale-102 group relative shadow-sm"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-1.5 border border-indigo-500/5 group-hover:bg-indigo-500/20">
                  <User className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold leading-tight">RRHH / Staff</span>
                <span className="text-[8px] text-slate-400 dark:text-slate-500 mt-0.5">Gestión</span>
                <ChevronRight className="w-3 h-3 absolute right-2 top-2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              {/* Employee profile */}
              <button
                onClick={() => enableSimulation(activeSimTab, 'employee')}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 hover:bg-brand-50/40 border border-slate-200 hover:border-brand-500/20 text-slate-700 hover:text-slate-900 dark:bg-[#070b15]/65 dark:border-slate-800 dark:hover:border-brand-500/40 dark:text-slate-300 dark:hover:text-white transition-all hover:scale-102 group relative shadow-sm"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1.5 border border-emerald-500/5 group-hover:bg-emerald-500/20">
                  <Building2 className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold leading-tight">Trabajador</span>
                <span className="text-[8px] text-slate-400 dark:text-slate-500 mt-0.5">Solo Ver</span>
                <ChevronRight className="w-3 h-3 absolute right-2 top-2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default Login;
