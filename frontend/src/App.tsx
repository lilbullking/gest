import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import Admin from './pages/Admin';
import WorkerDocuments from './pages/WorkerDocuments';
import Invoices from './pages/Invoices';
import Payslips from './pages/Payslips';
import Payroll from './pages/Payroll';
import RemunerationBook from './pages/RemunerationBook';
import ContractAnnexes from './pages/ContractAnnexes';
import VacationControl from './pages/VacationControl';
import { 
  LayoutDashboard, FileText, Settings, LogOut, Sun, Moon, 
  Shield, Sparkles, Building2, User, ChevronLeft, ChevronRight,
  Users, Receipt, Coins, Calculator, BookOpen, FileSignature, Calendar
} from 'lucide-react';

const App: React.FC = () => {
  const { 
    isAuthenticated, logout, user, isSimulationMode, enableSimulation, theme, toggleTheme 
  } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'documents' | 'admin' |
    'worker-documents' | 'invoices' | 'payslips' | 'payroll' | 'remuneration-book' | 'contract-annexes' | 'vacation-control'
  >('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const getInitials = () => {
    if (!user) return 'NC';
    return `${user.first_name[0] || ''}${user.last_name[0] || ''}`.toUpperCase();
  };

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard setActiveTab={setActiveTab} />;
      case 'documents': return <Documents />;
      case 'admin': return <Admin />;
      case 'worker-documents': return <WorkerDocuments />;
      case 'invoices': return <Invoices />;
      case 'payslips': return <Payslips />;
      case 'payroll': return <Payroll />;
      case 'remuneration-book': return <RemunerationBook />;
      case 'contract-annexes': return <ContractAnnexes />;
      case 'vacation-control': return <VacationControl />;
      default: return <Dashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className={`min-h-screen flex mesh-gradient-bg ${theme === 'dark' ? 'text-slate-200' : 'text-slate-850'} font-sans antialiased transition-colors duration-300 relative overflow-hidden`}>
      
      {/* Background Grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f030_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f030_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1f293704_1px,transparent_1px),linear-gradient(to_bottom,#1f293704_1px,transparent_1px)] bg-[size:42px_42px] pointer-events-none z-0"></div>

      {/* Mobile Sidebar Backdrop overlay */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300 animate-fadeIn"
        />
      )}

      {/* SIDEBAR CONSOLE (Floating Frosted Island) */}
      <aside 
        className={`fixed md:relative left-4 md:left-auto top-4 bottom-4 md:top-auto md:bottom-auto md:my-4 md:ml-4 md:mr-0 h-[calc(100vh-32px)] rounded-[28px] bg-white/70 border border-white/60 dark:bg-[#0c111f]/60 dark:border-slate-850/50 flex flex-col transition-all duration-300 z-40 md:z-20 shrink-0 shadow-[0_8px_30px_rgba(0,0,0,0.015)] backdrop-blur-md ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-80 md:translate-x-0'
        }`}
      >
        
        {/* Sidebar Header */}
        <div className="p-5 flex items-center justify-between border-b border-slate-150/40 dark:border-slate-800/40">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-brand-600 text-white rounded-xl shadow-md shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            {!sidebarCollapsed && (
              <span className="font-extrabold tracking-widest text-sm text-slate-800 dark:text-white font-sans">
                NUBCORE
              </span>
            )}
          </div>
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 bg-white/90 border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hidden md:block cursor-pointer hover-scale"
          >
            {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 py-4 px-3 space-y-4 overflow-y-auto custom-scrollbar">
          
          {/* General Section */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <span className="text-[9px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase px-3.5 mb-1.5 block">
                General
              </span>
            )}
            <button
              onClick={() => handleTabChange('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                activeTab === 'dashboard'
                  ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 border border-brand-100/40 dark:border-brand-900/30 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-900/10'
              }`}
            >
              <LayoutDashboard className="w-4.5 h-4.5 shrink-0" />
              {!sidebarCollapsed && <span>Dashboard</span>}
            </button>

            <button
              onClick={() => handleTabChange('documents')}
              className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                activeTab === 'documents'
                  ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 border border-brand-100/40 dark:border-brand-900/30 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-900/10'
              }`}
            >
              <FileText className="w-4.5 h-4.5 shrink-0" />
              {!sidebarCollapsed && <span>Gestor Documental</span>}
            </button>
          </div>

          {/* Recursos Humanos Section */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <span className="text-[9px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase px-3.5 mb-1.5 block">
                {user?.role === 'employee' ? 'Mis Documentos' : 'Recursos Humanos'}
              </span>
            )}

            {/* Worker Documents: Admin/HR only */}
            {['admin', 'hr'].includes(user?.role || '') && (
              <button
                onClick={() => handleTabChange('worker-documents')}
                className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  activeTab === 'worker-documents'
                    ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 border border-brand-100/40 dark:border-brand-900/30 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-900/10'
                }`}
              >
                <Users className="w-4.5 h-4.5 shrink-0" />
                {!sidebarCollapsed && <span>Gestor de Trabajadores</span>}
              </button>
            )}

            {/* Vacation Control: All roles (displays differently) */}
            <button
              onClick={() => handleTabChange('vacation-control')}
              className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                activeTab === 'vacation-control'
                  ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 border border-brand-100/40 dark:border-brand-900/30 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-900/10'
              }`}
            >
              <Calendar className="w-4.5 h-4.5 shrink-0" />
              {!sidebarCollapsed && <span>{user?.role === 'employee' ? 'Mis Vacaciones' : 'Control Vacaciones'}</span>}
            </button>

            {/* Contract Annexes: All roles */}
            <button
              onClick={() => handleTabChange('contract-annexes')}
              className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                activeTab === 'contract-annexes'
                  ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 border border-brand-100/40 dark:border-brand-900/30 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-900/10'
              }`}
            >
              <FileSignature className="w-4.5 h-4.5 shrink-0" />
              {!sidebarCollapsed && <span>{user?.role === 'employee' ? 'Contratos y Anexos' : 'Anexos Contrato/Vac.'}</span>}
            </button>
          </div>

          {/* Administración y Finanzas / Liquidaciones Section */}
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <span className="text-[9px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase px-3.5 mb-1.5 block">
                {user?.role === 'employee' ? 'Liquidaciones' : 'Administración y Finanzas'}
              </span>
            )}

            {/* Payroll (Planilla): Admin/HR only */}
            {['admin', 'hr'].includes(user?.role || '') && (
              <button
                onClick={() => handleTabChange('payroll')}
                className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  activeTab === 'payroll'
                    ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 border border-brand-100/40 dark:border-brand-900/30 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-900/10'
                }`}
              >
                <Calculator className="w-4.5 h-4.5 shrink-0" />
                {!sidebarCollapsed && <span>Planilla Liquidaciones</span>}
              </button>
            )}

            {/* Remuneration Book: Admin/HR only */}
            {['admin', 'hr'].includes(user?.role || '') && (
              <button
                onClick={() => handleTabChange('remuneration-book')}
                className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  activeTab === 'remuneration-book'
                    ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 border border-brand-100/40 dark:border-brand-900/30 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-900/10'
                }`}
              >
                <BookOpen className="w-4.5 h-4.5 shrink-0" />
                {!sidebarCollapsed && <span>Libro Remuneraciones</span>}
              </button>
            )}

            {/* Payslips (Liquidaciones): All roles */}
            <button
              onClick={() => handleTabChange('payslips')}
              className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                activeTab === 'payslips'
                  ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 border border-brand-100/40 dark:border-brand-900/30 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-900/10'
              }`}
            >
              <Coins className="w-4.5 h-4.5 shrink-0" />
              {!sidebarCollapsed && <span>{user?.role === 'employee' ? 'Mis Liquidaciones' : 'Gestor Liquidaciones'}</span>}
            </button>

            {/* Invoices (Facturas): Admin/HR only */}
            {['admin', 'hr'].includes(user?.role || '') && (
              <button
                onClick={() => handleTabChange('invoices')}
                className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  activeTab === 'invoices'
                    ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 border border-brand-100/40 dark:border-brand-900/30 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-900/10'
                }`}
              >
                <Receipt className="w-4.5 h-4.5 shrink-0" />
                {!sidebarCollapsed && <span>Facturas y Boletas</span>}
              </button>
            )}

            {/* Admin Settings: Admin/HR/Auditor only */}
            {['admin', 'hr', 'auditor'].includes(user?.role || '') && (
              <button
                onClick={() => handleTabChange('admin')}
                className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  activeTab === 'admin'
                    ? 'bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 border border-brand-100/40 dark:border-brand-900/30 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-900/10'
                }`}
              >
                <Settings className="w-4.5 h-4.5 shrink-0" />
                {!sidebarCollapsed && <span>Administración</span>}
              </button>
            )}
          </div>
        </nav>

        {/* Sidebar Footer User Widget */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-900/40 space-y-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center font-bold text-white text-xs shadow-sm shrink-0 border border-white/10">
              {getInitials()}
            </div>
            {!sidebarCollapsed && (
              <div className="text-left truncate">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">{user?.first_name} {user?.last_name}</p>
                <p className="text-[9px] text-slate-400 font-mono truncate leading-none mt-1">{user?.email}</p>
              </div>
            )}
          </div>
          
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50/50 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-950/10 transition-all duration-150"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>

      </aside>

      {/* WORKSPACE CONTENT LAYOUT */}
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden relative z-10">
        
        {/* FLOATING SIMULATION SYSTEM CONSOLE BAR */}
        {isSimulationMode && (
          <div className="w-full bg-slate-100/90 border-b border-slate-200/60 dark:bg-[#0e1422]/90 dark:border-slate-800/80 p-2.5 px-6 flex flex-col lg:flex-row items-center justify-between text-xs text-slate-700 dark:text-slate-300 shadow-sm gap-2.5 z-30 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-brand-600 dark:text-brand-400 animate-pulse shrink-0" />
              <span className="font-extrabold uppercase tracking-widest text-[9px] bg-brand-500/10 border border-brand-500/20 px-2.5 py-0.5 rounded-full text-brand-700 dark:text-brand-300">DEMO CONSOLE</span>
              <span>Aislamiento Activo para: <b className="text-slate-900 dark:text-slate-100">{user?.tenant?.name}</b></span>
              <span className="hidden xl:inline text-[10px] text-slate-500 dark:text-slate-400 border-l border-slate-300 dark:border-slate-800 pl-3 font-medium">
                {user?.role === 'admin' && "👑 Rol Dueño: Acceso completo (Admin, Logs ISO 27001, Métricas de personal, Ingesta)"}
                {user?.role === 'hr' && "💼 Rol RRHH: Acceso a Cargar y Categorizar archivos, Ver Logs, sin baja de administradores"}
                {user?.role === 'employee' && "👤 Rol Trabajador: Vista restringida. Solo ve sus liquidaciones, contratos y EPP personales"}
              </span>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-slate-500 dark:text-slate-400 font-bold text-[9px] uppercase tracking-widest">Cambiar Tenant:</span>
              
              {/* Alfa Toggles */}
              <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#050811] p-0.5 shadow-sm">
                <button
                  onClick={() => enableSimulation('alfa', 'admin')}
                  className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-colors ${
                    user?.tenant?.id === 'a0000000-0000-0000-0000-000000000001' && user.role === 'admin'
                      ? 'bg-brand-600 text-white shadow-sm' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800 dark:hover:bg-slate-900/60 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  Alfa (Admin)
                </button>
                <button
                  onClick={() => enableSimulation('alfa', 'employee')}
                  className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-colors ${
                    user?.tenant?.id === 'a0000000-0000-0000-0000-000000000001' && user.role === 'employee'
                      ? 'bg-brand-600 text-white shadow-sm' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800 dark:hover:bg-slate-900/60 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  Alfa (Empleado)
                </button>
              </div>

              {/* Beta Toggles */}
              <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#050811] p-0.5 shadow-sm">
                <button
                  onClick={() => enableSimulation('beta', 'admin')}
                  className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-colors ${
                    user?.tenant?.id === 'b0000000-0000-0000-0000-000000000002' && user.role === 'admin'
                      ? 'bg-brand-600 text-white shadow-sm' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800 dark:hover:bg-slate-900/60 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  Beta (Admin)
                </button>
                <button
                  onClick={() => enableSimulation('beta', 'employee')}
                  className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-colors ${
                    user?.tenant?.id === 'b0000000-0000-0000-0000-000000000002' && user.role === 'employee'
                      ? 'bg-brand-600 text-white shadow-sm' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800 dark:hover:bg-slate-900/60 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  Beta (Empleado)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HEADER (Floating Frosted Panel) */}
        <header className="p-4 mx-6 mt-4 flex items-center justify-between rounded-2xl border border-white/60 bg-white/60 dark:bg-[#0c111f]/45 dark:border-slate-850/40 relative z-10 transition-colors backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
          <div className="flex items-center gap-3">
            {/* Hamburger Menu Button (Mobile Only) */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 bg-white/90 border border-slate-200 hover:bg-slate-100/50 text-slate-500 hover:text-slate-800 dark:bg-[#0c111f] dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-xl transition-all cursor-pointer md:hidden hover-scale"
              title="Abrir Menú"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-brand-500" />
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Empresa activa: <span className="text-slate-800 dark:text-white ml-1 font-semibold">{user?.tenant?.name || 'Ninguno'}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Active User Indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 border border-slate-200/50 text-slate-700 dark:bg-[#0c111f] dark:border-slate-800 dark:text-slate-350 rounded-xl text-[10px] shadow-sm font-semibold">
              <User className="w-3.5 h-3.5 text-brand-500" />
              <span className="font-mono uppercase tracking-widest leading-none">
                Rol: <span className="text-brand-600 dark:text-indigo-400 font-bold">{user?.role}</span>
              </span>
            </div>

            {/* Dark Mode toggle button */}
            <button
              onClick={toggleTheme}
              className="p-2 bg-white/90 border border-slate-200 hover:bg-slate-100/50 text-slate-500 hover:text-slate-800 dark:bg-[#0c111f] dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-100 rounded-xl transition-all cursor-pointer hover-scale"
              title="Cambiar Tema"
            >
              {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
            </button>
          </div>
        </header>

        {/* WORKSPACE VIEW CONTAINER */}
        <div className="flex-1 p-6 md:p-8 pb-24 md:pb-8 max-w-7xl w-full mx-auto relative z-10">
          {renderContent()}
        </div>

      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/85 dark:bg-[#0c111f]/90 border-t border-slate-200/50 dark:border-slate-850/50 backdrop-blur-md z-30 flex justify-around items-center py-2 px-4 md:hidden shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
        
        {/* Dashboard Button */}
        <button
          onClick={() => handleTabChange('dashboard')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'dashboard'
              ? 'text-brand-650 dark:text-brand-400 font-bold'
              : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[9px] uppercase tracking-wider font-semibold">Dashboard</span>
        </button>

        {/* Gestor Documental Button */}
        <button
          onClick={() => handleTabChange('documents')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'documents'
              ? 'text-brand-650 dark:text-brand-400 font-bold'
              : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[9px] uppercase tracking-wider font-semibold">Documentos</span>
        </button>

        {/* Vacation / Calendar Button */}
        <button
          onClick={() => handleTabChange('vacation-control')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'vacation-control'
              ? 'text-brand-650 dark:text-brand-400 font-bold'
              : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[9px] uppercase tracking-wider font-semibold">{user?.role === 'employee' ? 'Vacaciones' : 'Control'}</span>
        </button>

        {/* Payslips Button */}
        <button
          onClick={() => handleTabChange('payslips')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            activeTab === 'payslips'
              ? 'text-brand-650 dark:text-brand-400 font-bold'
              : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'
          }`}
        >
          <Coins className="w-5 h-5" />
          <span className="text-[9px] uppercase tracking-wider font-semibold">Liquidaciones</span>
        </button>

        {/* Administration Button (Admin/HR only) */}
        {['admin', 'hr', 'auditor'].includes(user?.role || '') && (
          <button
            onClick={() => handleTabChange('admin')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
              activeTab === 'admin'
                ? 'text-brand-650 dark:text-brand-400 font-bold'
                : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[9px] uppercase tracking-wider font-semibold">Panel</span>
          </button>
        )}
      </nav>
    </div>
  );
};

export default App;
