import React, { useEffect, useState } from 'react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar, Check, X, Search, Sparkles, Clock, 
  CheckCircle, AlertCircle, PlusCircle, User, Info, ShieldCheck
} from 'lucide-react';

interface VacationRequest {
  id: string;
  workerId: string;
  workerName: string;
  workerRut: string;
  startDate: string;
  endDate: string;
  days: number;
  comments: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  type?: 'complete' | 'days';
}

const VacationControl: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // New request form state (For Employees)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [comments, setComments] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [requestType, setRequestType] = useState<'complete' | 'days'>('days');

  // Helper to add business days (excluding weekends)
  const addBusinessDays = (startStr: string, days: number) => {
    if (!startStr || days <= 0) return '';
    
    // We parse local date safely to avoid timezone shifting
    const parts = startStr.split('-');
    const current = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    
    let targetDays = days - 1; // start date itself is day 1
    
    while (targetDays > 0) {
      current.setDate(current.getDate() + 1);
      const day = current.getDay();
      if (day !== 0 && day !== 6) { // Not weekend
        targetDays--;
      }
    }
    
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Default values for balances
  const [balance, setBalance] = useState({
    available: 15,
    taken: 10,
    pending: 0
  });

  useEffect(() => {
    if (requestType === 'complete' && startDate && balance.available > 0) {
      setEndDate(addBusinessDays(startDate, balance.available));
    } else if (requestType === 'complete' && !startDate) {
      setEndDate('');
    }
  }, [requestType, startDate, balance.available]);

  const fetchVacationRequests = async () => {
    try {
      setLoading(true);
      const savedRequests = localStorage.getItem('nubcore_vacation_requests');
      let currentRequests: VacationRequest[] = [];
      
      if (savedRequests) {
        currentRequests = JSON.parse(savedRequests);
      } else {
        // Initial mock requests
        currentRequests = [
          {
            id: "v_1",
            workerId: "u1111111-1111-1111-1111-111111111112", // Juan Perez
            workerName: "Juan Pérez",
            workerRut: "18.456.789-0",
            startDate: "2026-06-01",
            endDate: "2026-06-08",
            days: 6,
            comments: "Vacaciones de invierno acumuladas.",
            status: 'pending',
            createdAt: new Date().toISOString(),
            type: 'days'
          },
          {
            id: "v_2",
            workerId: "u2222222-2222-2222-2222-222222222222", // Diego Mendoza
            workerName: "Diego Mendoza",
            workerRut: "19.987.654-1",
            startDate: "2026-03-01",
            endDate: "2026-03-15",
            days: 10,
            comments: "Feriado anual legal.",
            status: 'approved',
            createdAt: "2026-02-10T10:00:00Z",
            type: 'complete'
          }
        ];
        localStorage.setItem('nubcore_vacation_requests', JSON.stringify(currentRequests));
      }
      setRequests(currentRequests);
      
      // Calculate personal balances based on requests
      if (user) {
        let personalTaken = 10;
        let personalPending = 0;
        
        currentRequests
          .filter(r => r.workerId === user.id)
          .forEach((r) => {
            if (r.status === 'approved') personalTaken += r.days;
            if (r.status === 'pending') personalPending += r.days;
          });

        setBalance({
          available: Math.max(15 - (personalTaken - 10) - personalPending, 0),
          taken: personalTaken,
          pending: personalPending
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVacationRequests();
  }, [user?.id]);

  // Calculate business days between dates (simple approximation)
  const calculateDays = (startStr: string, endStr: string) => {
    if (!startStr || !endStr) return 0;
    const start = new Date(startStr);
    const end = new Date(endStr);
    
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
    
    // Simple business days filter (subtracted weekends)
    let workDays = 0;
    const current = new Date(start);
    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) { // not Sunday or Saturday
        workDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    return workDays;
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      alert("Por favor elige fecha de inicio y fin.");
      return;
    }

    if (requestType === 'complete' && balance.available <= 0) {
      alert("No tienes días hábiles disponibles para vacaciones completas.");
      return;
    }

    const calculated = calculateDays(startDate, endDate);
    if (calculated <= 0) {
      alert("Las fechas ingresadas no son válidas o corresponden a días de descanso.");
      return;
    }

    if (requestType === 'complete') {
      if (calculated !== balance.available) {
        alert(`Para vacaciones completas debes solicitar todos tus días disponibles (${balance.available} días).`);
        return;
      }
    } else {
      if (calculated > balance.available) {
        alert("No tienes suficientes días hábiles disponibles.");
        return;
      }
    }

    const prefixedComments = requestType === 'complete' 
      ? `[Vacaciones Completas] ${comments}`.trim() 
      : comments;

    const newRequest: VacationRequest = {
      id: `req_${Math.random().toString(36).substr(2, 9)}`,
      workerId: user?.id || 'unknown',
      workerName: `${user?.first_name} ${user?.last_name}`,
      workerRut: user?.tenant?.tax_id || '12.345.678-K', // fallback
      startDate,
      endDate,
      days: calculated,
      comments: prefixedComments,
      status: 'pending',
      createdAt: new Date().toISOString(),
      type: requestType
    };

    const updated = [newRequest, ...requests];
    setRequests(updated);
    localStorage.setItem('nubcore_vacation_requests', JSON.stringify(updated));

    setStartDate('');
    setEndDate('');
    setComments('');
    setFormSubmitted(true);
    
    fetchVacationRequests();

    setTimeout(() => {
      setFormSubmitted(false);
    }, 3000);
  };

  const handleResolveRequest = (id: string, status: 'approved' | 'rejected') => {
    const updated = requests.map((req) => {
      if (req.id === id) {
        return { ...req, status };
      }
      return req;
    });

    setRequests(updated);
    localStorage.setItem('nubcore_vacation_requests', JSON.stringify(updated));
    fetchVacationRequests();
  };

  const getFilteredRequests = () => {
    let list = requests;

    // Filter by role: Workers only see their own
    if (user?.role === 'employee') {
      list = list.filter(r => r.workerId === user.id);
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => 
        r.workerName.toLowerCase().includes(q) || 
        r.comments.toLowerCase().includes(q)
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
            {user?.role === 'employee' ? 'Mi Control de Vacaciones' : 'Control de Vacaciones y Feriados'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            {user?.role === 'employee'
              ? 'Revisa tus saldos de feriado legal acumulado y solicita tus vacaciones anuales.'
              : 'Gestión y aprobación de solicitudes de feriado legal de la plantilla.'}
          </p>
        </div>
      </div>

      {/* KPI Cards (Available, Taken, Pending) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="bento-card p-5 flex flex-col justify-between">
          <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            {user?.role === 'employee' ? 'Mis Días Disponibles' : 'Días Pendientes de Aprobación'}
          </span>
          <h3 className="text-3xl font-black mt-2 font-sans text-brand-605 dark:text-brand-400">
            {user?.role === 'employee' ? balance.available : requests.filter(r => r.status === 'pending').reduce((acc, cur) => acc + cur.days, 0)} días
          </h3>
          <p className="text-[10px] text-slate-400 mt-4">
            {user?.role === 'employee' ? 'Feriado legal anual acumulado actual' : 'Total acumulado en solicitudes en cola'}
          </p>
        </div>

        <div className="bento-card p-5 flex flex-col justify-between">
          <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            {user?.role === 'employee' ? 'Días Consumidos' : 'Colaboradores de Vacaciones Hoy'}
          </span>
          <h3 className="text-3xl font-black mt-2 font-sans text-emerald-600 dark:text-emerald-450">
            {user?.role === 'employee' ? balance.taken : 0} días
          </h3>
          <p className="text-[10px] text-slate-400 mt-4">
            {user?.role === 'employee' ? 'Días de feriado legal efectivamente gozados' : 'Colaboradores ausentes en este momento'}
          </p>
        </div>

        <div className="bento-card p-5 flex flex-col justify-between">
          <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            {user?.role === 'employee' ? 'En Trámite de Aprobación' : 'Total Solicitudes en el Mes'}
          </span>
          <h3 className="text-3xl font-black mt-2 font-sans text-amber-600 dark:text-amber-400">
            {user?.role === 'employee' ? balance.pending : requests.length} días
          </h3>
          <p className="text-[10px] text-slate-400 mt-4">
            {user?.role === 'employee' ? 'Días sujetos a autorización de la jefatura' : 'Volumen total registrado históricamente'}
          </p>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Forms or summaries depending on role */}
        <div className="lg:col-span-1 space-y-6">
          
          {user?.role === 'employee' ? (
            // ============ EMPLOYEE SUBMIT FORM ============
            <div className="bento-card p-5.5 space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                <PlusCircle className="w-4.5 h-4.5" />
                Nueva Solicitud de Feriado
              </h3>
              
              {formSubmitted && (
                <div className="p-3.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-bold flex items-center gap-2 animate-pulse">
                  <CheckCircle className="w-4.5 h-4.5" />
                  <span>Solicitud ingresada correctamente a RRHH.</span>
                </div>
              )}

              <form onSubmit={handleRequestSubmit} className="space-y-4 text-xs font-semibold">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Modalidad de Solicitud</label>
                  <div className="grid grid-cols-2 gap-2 p-0.5 bg-slate-100 dark:bg-[#070b15] rounded-xl border border-slate-200/60 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setRequestType('days')}
                      className={`py-2 px-3 rounded-lg text-center transition-all cursor-pointer text-[10px] font-bold ${
                        requestType === 'days'
                          ? 'bg-white dark:bg-slate-900 text-brand-650 dark:text-brand-400 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      Días Señalados
                    </button>
                    <button
                      type="button"
                      onClick={() => setRequestType('complete')}
                      className={`py-2 px-3 rounded-lg text-center transition-all cursor-pointer text-[10px] font-bold ${
                        requestType === 'complete'
                          ? 'bg-white dark:bg-slate-900 text-brand-650 dark:text-brand-400 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      Vacaciones Completas
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide">Fecha de Inicio</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-950/40 dark:border-slate-850 rounded-xl focus:border-brand-500 focus:outline-none"
                  />
                </div>

                {requestType === 'complete' ? (
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wide">Fecha de Fin (Calculada automáticamente)</label>
                    <input
                      type="date"
                      disabled
                      value={endDate}
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200/50 dark:bg-[#070b15] dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-450 cursor-not-allowed font-bold"
                    />
                    {startDate && balance.available > 0 && (
                      <p className="text-[9px] text-brand-600 dark:text-brand-450 font-bold mt-1.5 flex items-center gap-1 leading-normal">
                        <Sparkles className="w-3 h-3 text-brand-500 animate-pulse shrink-0" />
                        Calculado sumando tus {balance.available} días hábiles continuos disponibles.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wide">Fecha de Fin (Inclusive)</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-950/40 dark:border-slate-850 rounded-xl focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                )}

                {startDate && endDate && (
                  <div className="p-3 bg-brand-50/20 border border-brand-100/30 rounded-xl text-[11px] text-brand-700 dark:text-brand-400 flex items-center gap-2">
                    <Info className="w-4 h-4 text-brand-500 shrink-0" />
                    <span>Días solicitados: <b>{calculateDays(startDate, endDate)} días hábiles</b> (excluye fines de semana).</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide">Comentarios / Justificación</label>
                  <textarea
                    rows={3}
                    placeholder="Detalles de la solicitud..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-950/40 dark:border-slate-850 rounded-xl focus:border-brand-500 focus:outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer"
                >
                  Enviar Solicitud de Vacaciones
                </button>
              </form>
            </div>
          ) : (
            // ============ ADMIN REGULATIONS PANEL ============
            <div className="bento-card p-5.5 space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-450 flex items-center gap-1.5">
                <Info className="w-4.5 h-4.5 text-brand-500" />
                Normativa Feriado Legal Chile
              </h3>
              
              <div className="space-y-3.5 text-xs text-slate-550 dark:text-slate-400 leading-relaxed font-medium">
                <p>
                  1. <b>Feriado Básico:</b> Todo trabajador con más de un año de servicio tiene derecho a 15 días hábiles de vacaciones remuneradas.
                </p>
                <p>
                  2. <b>Hábiles:</b> Los días de vacaciones se cuentan de lunes a viernes. Los sábados, domingos y feriados no computan.
                </p>
                <p>
                  3. <b>Continuidad:</b> El trabajador debe solicitar al menos 10 días seguidos. El resto puede fraccionarse de común acuerdo.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-850/40 text-center">
                <span className="text-[9px] font-bold text-emerald-650 bg-emerald-500/5 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Cumplimiento del Código del Trabajo
                </span>
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Requests List */}
        <div className="lg:col-span-2 bento-card p-6.5 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5 text-brand-600" />
              Historial de Solicitudes
            </h3>

            <div className="relative w-full sm:w-52">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8.5 pr-3.5 py-1.5 bg-white border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800 rounded-xl text-xs focus:border-brand-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Queue Feed */}
          <div className="space-y-3.5">
            {getFilteredRequests().length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No hay solicitudes de vacaciones registradas.
              </div>
            ) : (
              getFilteredRequests().map((req) => (
                <div 
                  key={req.id}
                  className="p-4 bg-white/60 dark:bg-[#0c111f]/45 border border-white/60 dark:border-slate-850/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-350 dark:hover:border-slate-800 transition-all text-xs font-semibold"
                >
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6.5 h-6.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-905 dark:text-white leading-none">{req.workerName}</p>
                          {req.type === 'complete' || req.comments.startsWith('[Vacaciones Completas]') ? (
                            <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded text-[9px] font-bold">
                              Completa
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded text-[9px] font-bold">
                              Días Señalados
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] text-slate-400 mt-1">Solicitado el {new Date(req.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 dark:text-slate-400 space-y-1 font-medium pl-9">
                      <p>
                        Período: <span className="font-bold text-slate-700 dark:text-slate-300">{new Date(req.startDate).toLocaleDateString()} al {new Date(req.endDate).toLocaleDateString()}</span>
                      </p>
                      <p>
                        Días Hábiles: <span className="font-bold text-brand-600 dark:text-brand-400">{req.days} días</span>
                      </p>
                      {req.comments && (
                        <p className="italic text-slate-400">"{req.comments}"</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 w-full sm:w-auto justify-end pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-850/40 shrink-0">
                    {/* Status Badge */}
                    {req.status === 'approved' && (
                      <span className="flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-650 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30 rounded-full text-[10px] font-bold">
                        <Check className="w-3 h-3" />
                        Aprobada
                      </span>
                    )}

                    {req.status === 'rejected' && (
                      <span className="flex items-center gap-1 px-3 py-1 bg-rose-50 text-rose-650 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-900/30 rounded-full text-[10px] font-bold">
                        <X className="w-3 h-3" />
                        Rechazada
                      </span>
                    )}

                    {req.status === 'pending' && (
                      <>
                        {user?.role === 'employee' ? (
                          <span className="flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-650 border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30 rounded-full text-[10px] font-bold animate-pulse">
                            <Clock className="w-3 h-3" />
                            Esperando Aprobación
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleResolveRequest(req.id, 'approved')}
                              className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white rounded-lg transition-colors cursor-pointer"
                              title="Aprobar"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleResolveRequest(req.id, 'rejected')}
                              className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white rounded-lg transition-colors cursor-pointer"
                              title="Rechazar"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default VacationControl;
