import React, { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar, Check, X, Search, Sparkles, Clock, 
  CheckCircle, AlertCircle, PlusCircle, User, Info, ShieldCheck, Edit2,
  Trash2, AlertTriangle, Printer, Upload, FileSignature
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
  deletionRequested?: boolean;
  selectedDates?: string[];
}

const formatDateString = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    // YYYY-MM-DD -> DD/MM/YYYY
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const getCleanCommentAndDates = (req: VacationRequest) => {
  let cleanComment = req.comments || '';
  let dates: string[] = req.selectedDates || [];

  // Strip leading and trailing double quotes if present in raw string
  cleanComment = cleanComment.trim();
  if (cleanComment.startsWith('"') && cleanComment.endsWith('"')) {
    cleanComment = cleanComment.slice(1, -1).trim();
  }

  // Parse legacy requests: "[Días Seleccionados: 27/05/2026, 28/05/2026] Comentarios..."
  // Match either "Días Seleccionados" or "Días Señalados" (case-insensitive)
  const prefixRegex = /^\[Días\s+(Seleccionados|Señalados):\s*([^\]]+)\]\s*(.*)$/i;
  const match = cleanComment.match(prefixRegex);
  
  if (match) {
    if (dates.length === 0) {
      const dateStrings = match[2].split(',').map(s => s.trim());
      dates = dateStrings.map(s => {
        const parts = s.split('/');
        if (parts.length === 3) {
          // DD/MM/YYYY -> YYYY-MM-DD (with padStart for safety)
          const dd = parts[0].padStart(2, '0');
          const mm = parts[1].padStart(2, '0');
          const yyyy = parts[2];
          return `${yyyy}-${mm}-${dd}`;
        }
        return s;
      });
    }
    cleanComment = match[3].trim();
  }

  // Also strip complete vacation prefix if present
  if (cleanComment.startsWith('[Vacaciones Completas]')) {
    cleanComment = cleanComment.replace(/^\[Vacaciones Completas\]\s*/i, '').trim();
  }

  // Double check if there are still outer quotes on the cleaned comment
  if (cleanComment.startsWith('"') && cleanComment.endsWith('"')) {
    cleanComment = cleanComment.slice(1, -1).trim();
  }

  return { cleanComment, dates };
};

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

  // Custom inline calendar states
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date(2026, 4, 1)); // Mayo 2026

  // Reset calendar selections when switching modalities
  useEffect(() => {
    setStartDate('');
    setEndDate('');
    setSelectedDays([]);
  }, [requestType]);

  // Synchronize selectedDays list with startDate and endDate for 'days' modality
  useEffect(() => {
    if (requestType === 'days') {
      if (selectedDays.length > 0) {
        setStartDate(selectedDays[0]);
        setEndDate(selectedDays[selectedDays.length - 1]);
      } else {
        setStartDate('');
        setEndDate('');
      }
    }
  }, [selectedDays, requestType]);

  // Editing state (For HR / Admin)
  const [editingRequest, setEditingRequest] = useState<VacationRequest | null>(null);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editComments, setEditComments] = useState('');
  const [editType, setEditType] = useState<'complete' | 'days'>('days');
  const [editStatus, setEditStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [editSelectedDays, setEditSelectedDays] = useState<string[]>([]);
  const [editCalendarDate, setEditCalendarDate] = useState(new Date(2026, 4, 1));
  const [tempCompleteStartDate, setTempCompleteStartDate] = useState('');
  const [tempDaysSelectedDays, setTempDaysSelectedDays] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);
  const [showRegulationsModal, setShowRegulationsModal] = useState(false);
  const [uploadingVoucherId, setUploadingVoucherId] = useState<string | null>(null);
  const [uploadingPercent, setUploadingPercent] = useState(0);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'warning' | 'error' = 'warning') => {
    setToast({ message, type });
  };
  // Synchronize editSelectedDays list with editStartDate and editEndDate for 'days' modality
  useEffect(() => {
    if (editingRequest && editType === 'days') {
      if (editSelectedDays.length > 0) {
        setEditStartDate(editSelectedDays[0]);
        setEditEndDate(editSelectedDays[editSelectedDays.length - 1]);
      } else {
        setEditStartDate('');
        setEditEndDate('');
      }
    }
  }, [editSelectedDays, editType, editingRequest?.id]);

  // Deleting confirmation state (For HR / Admin)
  const [deletingRequest, setDeletingRequest] = useState<VacationRequest | null>(null);

  // Resetting signature confirmation state (For HR / Admin)
  const [resettingRequest, setResettingRequest] = useState<{ req: VacationRequest; annexId: string } | null>(null);

  // Calendar month navigation handlers
  const handlePrevMonth = () => {
    setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const getDayStr = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getCalendarDays = () => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const offset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const days = [];
    for (let i = 0; i < offset; i++) {
      days.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const handleDayClick = (date: Date) => {
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (isWeekend) {
      showToast("Las vacaciones solo se pueden solicitar en días hábiles (lunes a viernes).", "warning");
      return;
    }

    const dayStr = getDayStr(date);

    if (requestType === 'complete') {
      setStartDate(dayStr);
    } else {
      if (selectedDays.includes(dayStr)) {
        setSelectedDays(prev => prev.filter(x => x !== dayStr));
      } else {
        if (selectedDays.length >= balance.available) {
          showToast(`Has alcanzado el límite de tus días hábiles disponibles (${balance.available} días).`, "warning");
          return;
        }
        setSelectedDays(prev => [...prev, dayStr].sort());
      }
    }
  };

  const getTodayStr = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
  const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  const renderCalendar = () => {
    const days = getCalendarDays();
    const monthName = MONTHS[currentCalendarDate.getMonth()];
    const year = currentCalendarDate.getFullYear();
    const todayStr = getTodayStr();

    return (
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 p-3 rounded-2xl space-y-3.5 my-2">
        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 hover:bg-slate-250 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer text-[10px] font-bold"
          >
            &larr; Ant
          </button>
          <span className="font-extrabold uppercase tracking-wider text-slate-805 dark:text-white text-[10px]">
            {monthName} {year}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 hover:bg-slate-250 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer text-[10px] font-bold"
          >
            Sig &rarr;
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-slate-400 dark:text-slate-555">
          {WEEKDAYS.map(w => <span key={w}>{w}</span>)}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((d, idx) => {
            if (!d) return <div key={`empty-${idx}`} />;

            const dayStr = getDayStr(d);
            const dayNum = d.getDate();
            const dayOfWeek = d.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            let isSelected = false;
            let isInRange = false;

            if (requestType === 'days') {
              isSelected = selectedDays.includes(dayStr);
            } else if (requestType === 'complete') {
              isSelected = dayStr === startDate || dayStr === endDate;
              isInRange = !!(startDate && endDate && dayStr >= startDate && dayStr <= endDate);
            }

            const isToday = dayStr === todayStr;
            const dateStatus = getDateStatus(dayStr);
            const isBooked = dateStatus !== null;

            return (
              <button
                key={dayStr}
                type="button"
                onClick={() => handleDayClick(d)}
                disabled={isWeekend || isBooked}
                className={`py-1.5 text-center text-[10px] rounded-lg transition-all font-semibold relative flex flex-col items-center justify-center ${
                  isWeekend
                    ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed font-normal'
                    : isBooked
                      ? dateStatus === 'approved'
                        ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 cursor-not-allowed font-bold'
                        : 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 cursor-not-allowed font-bold'
                      : isSelected
                        ? 'bg-brand-600 text-white font-extrabold shadow-sm'
                        : isInRange
                          ? 'bg-brand-500/15 text-brand-650 dark:text-brand-400 font-extrabold border border-brand-200/20'
                          : 'text-slate-705 hover:bg-slate-100 dark:text-slate-355 dark:hover:bg-slate-800'
                } ${isToday ? 'border border-slate-350 dark:border-slate-600 bg-slate-150/40 dark:bg-slate-800/20' : ''}`}
              >
                <span>{dayNum}</span>
                {isToday && (
                  <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-brand-600 dark:bg-brand-400'} animate-pulse`} />
                )}
                {isBooked && (
                  <span className={`absolute top-0.5 right-1 w-1.5 h-1.5 rounded-full ${dateStatus === 'approved' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Color Legend */}
        <div className="flex items-center justify-center gap-3 pt-2.5 border-t border-slate-200/30 dark:border-slate-800/40 text-[9px] font-bold text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-600" />
            <span>Elegido</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Aprobado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Pendiente</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full border border-slate-350 dark:border-slate-600 bg-transparent" />
            <span>Hoy</span>
          </div>
        </div>
      </div>
    );
  };

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

  const getBusinessDaysArray = (startStr: string, endStr: string) => {
    if (!startStr || !endStr) return [];
    const start = new Date(startStr);
    const end = new Date(endStr);
    const dates: string[] = [];
    const current = new Date(start);
    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) { // not Sunday or Saturday
        dates.push(getDayStr(current));
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const getDateStatus = (dayStr: string, excludeRequestId?: string) => {
    if (!user) return null;
    
    // Find active requests for this worker (or the worker of the editingRequest) that are not rejected
    const targetWorkerId = editingRequest ? editingRequest.workerId : user.id;
    const workerRequests = requests.filter(r => r.workerId === targetWorkerId && r.status !== 'rejected' && r.id !== excludeRequestId);
    
    for (const req of workerRequests) {
      if (req.type === 'days') {
        if (req.selectedDates && req.selectedDates.includes(dayStr)) {
          return req.status;
        }
        // Fallback for legacy requests that don't have selectedDates but list them in comments
        const parsed = getCleanCommentAndDates(req);
        if (parsed.dates.includes(dayStr)) {
          return req.status;
        }
      } else {
        // Complete vacation range (excluding weekends)
        if (dayStr >= req.startDate && dayStr <= req.endDate) {
          const parts = dayStr.split('-');
          const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          const dayOfWeek = d.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            return req.status;
          }
        }
      }
    }
    return null;
  };

  const getCalendarDaysForEdit = () => {
    const year = editCalendarDate.getFullYear();
    const month = editCalendarDate.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const offset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const days = [];
    for (let i = 0; i < offset; i++) {
      days.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const handleEditDayClick = (date: Date) => {
    if (!editingRequest) return;
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (isWeekend) {
      showToast("Las vacaciones solo se pueden solicitar en días hábiles (lunes a viernes).", "warning");
      return;
    }

    const dayStr = getDayStr(date);
    const workerBal = getWorkerBalance(editingRequest.workerId, editingRequest.id);

    if (editType === 'complete') {
      setEditStartDate(dayStr);
    } else {
      if (editSelectedDays.includes(dayStr)) {
        setEditSelectedDays(prev => prev.filter(x => x !== dayStr));
      } else {
        if (editSelectedDays.length >= workerBal.available) {
          showToast(`Has alcanzado el límite de días hábiles disponibles de este colaborador (${workerBal.available} días).`, "warning");
          return;
        }
        setEditSelectedDays(prev => [...prev, dayStr].sort());
      }
    }
  };

  const renderEditCalendar = () => {
    if (!editingRequest) return null;
    const days = getCalendarDaysForEdit();
    const monthName = MONTHS[editCalendarDate.getMonth()];
    const year = editCalendarDate.getFullYear();
    const todayStr = getTodayStr();

    return (
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 p-3 rounded-2xl space-y-3.5 my-2">
        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => setEditCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            className="p-1 hover:bg-slate-250 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer text-[10px] font-bold"
          >
            &larr; Ant
          </button>
          <span className="font-extrabold uppercase tracking-wider text-slate-805 dark:text-white text-[10px]">
            {monthName} {year}
          </span>
          <button
            type="button"
            onClick={() => setEditCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            className="p-1 hover:bg-slate-250 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer text-[10px] font-bold"
          >
            Sig &rarr;
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-slate-400 dark:text-slate-555">
          {WEEKDAYS.map(w => <span key={w}>{w}</span>)}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((d, idx) => {
            if (!d) return <div key={`empty-${idx}`} />;

            const dayStr = getDayStr(d);
            const dayNum = d.getDate();
            const dayOfWeek = d.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            let isSelected = false;
            let isInRange = false;

            if (editType === 'days') {
              isSelected = editSelectedDays.includes(dayStr);
            } else if (editType === 'complete') {
              isSelected = dayStr === editStartDate || dayStr === editEndDate;
              isInRange = !!(editStartDate && editEndDate && dayStr >= editStartDate && dayStr <= editEndDate);
            }

            const isToday = dayStr === todayStr;
            const dateStatus = getDateStatus(dayStr, editingRequest.id);
            const isBooked = dateStatus !== null;

            return (
              <button
                key={dayStr}
                type="button"
                onClick={() => handleEditDayClick(d)}
                disabled={isWeekend || isBooked}
                className={`py-1.5 text-center text-[10px] rounded-lg transition-all font-semibold relative flex flex-col items-center justify-center ${
                  isWeekend
                    ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed font-normal'
                    : isBooked
                      ? dateStatus === 'approved'
                        ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 cursor-not-allowed font-bold'
                        : 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 cursor-not-allowed font-bold'
                      : isSelected
                        ? 'bg-brand-600 text-white font-extrabold shadow-sm'
                        : isInRange
                          ? 'bg-brand-500/15 text-brand-650 dark:text-brand-400 font-extrabold border border-brand-200/20'
                          : 'text-slate-705 hover:bg-slate-100 dark:text-slate-355 dark:hover:bg-slate-800'
                } ${isToday ? 'border border-slate-350 dark:border-slate-600 bg-slate-150/40 dark:bg-slate-800/20' : ''}`}
              >
                <span>{dayNum}</span>
                {isToday && (
                  <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-brand-600 dark:bg-brand-400'} animate-pulse`} />
                )}
                {isBooked && (
                  <span className={`absolute top-0.5 right-1 w-1.5 h-1.5 rounded-full ${dateStatus === 'approved' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Color Legend */}
        <div className="flex items-center justify-center gap-3 pt-2.5 border-t border-slate-200/30 dark:border-slate-800/40 text-[9px] font-bold text-slate-400 dark:text-slate-555">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-600" />
            <span>Elegido</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Aprobado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Pendiente</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full border border-slate-350 dark:border-slate-600 bg-transparent" />
            <span>Hoy</span>
          </div>
        </div>
      </div>
    );
  };

  // Helper to dynamically calculate worker balance
  const getWorkerBalance = (workerId: string, excludeRequestId?: string) => {
    let taken = 10;
    let pending = 0;
    
    requests
      .filter(r => r.workerId === workerId && r.id !== excludeRequestId)
      .forEach((r) => {
        if (r.status === 'approved') taken += r.days;
        if (r.status === 'pending') pending += r.days;
      });

    return {
      available: Math.max(15 - (taken - 10) - pending, 0),
      taken,
      pending
    };
  };

  // Dynamic balance calculated in real-time from the request list
  const balance = React.useMemo(() => {
    if (!user) return { available: 15, taken: 10, pending: 0 };
    return getWorkerBalance(user.id);
  }, [requests, user?.id]);

  // Dynamic count of collaborators currently on vacation today
  const activeVacationsTodayCount = React.useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const activeWorkers = new Set();
    requests.forEach(r => {
      if (r.status === 'approved' && r.startDate <= todayStr && r.endDate >= todayStr) {
        activeWorkers.add(r.workerId);
      }
    });
    return activeWorkers.size;
  }, [requests]);

  useEffect(() => {
    if (requestType === 'complete' && startDate && balance.available > 0) {
      setEndDate(addBusinessDays(startDate, balance.available));
    } else if (requestType === 'complete' && !startDate) {
      setEndDate('');
    }
  }, [requestType, startDate, balance.available]);

  useEffect(() => {
    if (editingRequest) {
      const workerBal = getWorkerBalance(editingRequest.workerId, editingRequest.id);
      if (editType === 'complete' && editStartDate && workerBal.available > 0) {
        setEditEndDate(addBusinessDays(editStartDate, workerBal.available));
      } else if (editType === 'complete' && !editStartDate) {
        setEditEndDate('');
      }
    }
  }, [editType, editStartDate, editingRequest?.id]);

  const fetchVacationRequests = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
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
            type: 'days',
            selectedDates: ["2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04", "2026-06-05", "2026-06-08"]
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
            type: 'complete',
            selectedDates: ["2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05", "2026-03-06", "2026-03-09", "2026-03-10", "2026-03-11", "2026-03-12", "2026-03-13"]
          }
        ];
        localStorage.setItem('nubcore_vacation_requests', JSON.stringify(currentRequests));
      }
      setRequests(currentRequests);
    } catch (e) {
      console.error(e);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchVacationRequests(true);
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
      showToast("Por favor elige fecha de inicio y fin.", "warning");
      return;
    }

    if (requestType === 'complete' && balance.available <= 0) {
      showToast("No tienes días hábiles disponibles para vacaciones completas.", "error");
      return;
    }

    const calculated = requestType === 'days' && selectedDays.length > 0
      ? selectedDays.length
      : calculateDays(startDate, endDate);

    if (calculated <= 0) {
      showToast("Las fechas ingresadas no son válidas o corresponden a días de descanso.", "error");
      return;
    }

    if (requestType === 'complete') {
      if (calculated !== balance.available) {
        showToast(`Para vacaciones completas debes solicitar todos tus días disponibles (${balance.available} días).`, "warning");
        return;
      }
    } else {
      if (calculated > balance.available) {
        showToast(`No tienes suficientes días hábiles disponibles. Intentas solicitar ${calculated} días pero solo dispones de ${balance.available} días.`, "error");
        return;
      }
    }

    const overlap = checkOverlap(user?.id || 'unknown', startDate, endDate);
    if (overlap) {
      showToast(`Las fechas solicitadas se solapan con otra solicitud (el día ${formatDateString(overlap.overlappedDay)} ya está reservado en una solicitud ${overlap.request.status === 'approved' ? 'aprobada' : 'pendiente'}).`, "error");
      return;
    }

    const cleanComments = comments.trim();

    const newRequest: VacationRequest = {
      id: `req_${Math.random().toString(36).substr(2, 9)}`,
      workerId: user?.id || 'unknown',
      workerName: `${user?.first_name} ${user?.last_name}`,
      workerRut: user?.tenant?.tax_id || '12.345.678-K', // fallback
      startDate,
      endDate,
      days: calculated,
      comments: cleanComments,
      status: 'pending',
      createdAt: new Date().toISOString(),
      type: requestType,
      selectedDates: requestType === 'days' ? [...selectedDays] : getBusinessDaysArray(startDate, endDate)
    };

    const updated = [newRequest, ...requests];
    setRequests(updated);
    localStorage.setItem('nubcore_vacation_requests', JSON.stringify(updated));

    setStartDate('');
    setEndDate('');
    setComments('');
    showToast("Solicitud de vacaciones ingresada correctamente", "success");
    setFormSubmitted(true);
    
    fetchVacationRequests();

    setTimeout(() => {
      setFormSubmitted(false);
    }, 3000);
  };

  const handleResolveRequest = (id: string, status: 'approved' | 'rejected') => {
    const updated = requests.map((req) => {
      if (req.id === id) {
        const updatedReq = { ...req, status };
        if (status === 'approved') {
          generateVacationAnnex(updatedReq);
        }
        return updatedReq;
      }
      return req;
    });

    setRequests(updated);
    localStorage.setItem('nubcore_vacation_requests', JSON.stringify(updated));
    showToast(`Solicitud ${status === 'approved' ? 'aprobada' : 'rechazada'} con éxito`, "success");
    fetchVacationRequests();
  };

  const openEditModal = (req: VacationRequest) => {
    setEditingRequest(req);
    setEditStartDate(req.startDate);
    setEditEndDate(req.endDate);
    
    const { cleanComment, dates } = getCleanCommentAndDates(req);
    setEditComments(cleanComment);
    
    const type = req.type || (req.comments.startsWith('[Vacaciones Completas]') ? 'complete' : 'days');
    setEditType(type);
    setEditStatus(req.status);

    // Initialize selected days in edit state
    if (type === 'days') {
      setEditSelectedDays(dates);
      setTempDaysSelectedDays(dates);
      setTempCompleteStartDate('');
    } else {
      setEditSelectedDays(getBusinessDaysArray(req.startDate, req.endDate));
      setTempDaysSelectedDays([]);
      setTempCompleteStartDate(req.startDate);
    }

    // Set edit calendar month to start date's month
    if (req.startDate) {
      const parts = req.startDate.split('-');
      if (parts.length === 3) {
        setEditCalendarDate(new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1));
      }
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRequest) return;
    if (!editStartDate || !editEndDate) {
      showToast("Por favor elige fecha de inicio y fin.", "warning");
      return;
    }

    const workerBal = getWorkerBalance(editingRequest.workerId, editingRequest.id);
    const calculated = editType === 'days' && editSelectedDays.length > 0
      ? editSelectedDays.length
      : calculateDays(editStartDate, editEndDate);

    if (calculated <= 0) {
      showToast("Las fechas ingresadas no son válidas o corresponden a días de descanso.", "error");
      return;
    }

    const overlap = checkOverlap(editingRequest.workerId, editStartDate, editEndDate, editingRequest.id);
    if (overlap) {
      showToast(`Las fechas se solapan con otra solicitud del colaborador (el día ${formatDateString(overlap.overlappedDay)} ya está reservado en una solicitud ${overlap.request.status === 'approved' ? 'aprobada' : 'pendiente'}).`, "error");
      return;
    }

    if (editType === 'complete') {
      if (calculated !== workerBal.available) {
        showToast(`Para vacaciones completas debes solicitar todos los días disponibles (${workerBal.available} días).`, "warning");
        return;
      }
    } else {
      if (calculated > workerBal.available) {
        showToast(`No hay suficientes días hábiles disponibles. Intentas solicitar ${calculated} días pero el colaborador solo dispone de ${workerBal.available} días.`, "error");
        return;
      }
    }

    const cleanComments = editComments.trim();
    const updatedSelectedDates = editType === 'days'
      ? [...editSelectedDays]
      : getBusinessDaysArray(editStartDate, editEndDate);

    const updated = requests.map((req) => {
      if (req.id === editingRequest.id) {
        const updatedReq = {
          ...req,
          startDate: editStartDate,
          endDate: editEndDate,
          days: calculated,
          comments: cleanComments,
          status: editStatus,
          type: editType,
          selectedDates: updatedSelectedDates
        };
        if (editStatus === 'approved') {
          generateVacationAnnex(updatedReq);
        }
        return updatedReq;
      }
      return req;
    });

    setRequests(updated);
    localStorage.setItem('nubcore_vacation_requests', JSON.stringify(updated));
    setEditingRequest(null);
    showToast("Cambios guardados con éxito", "success");
    fetchVacationRequests();
  };

  const confirmDeleteOrRequest = () => {
    if (!deletingRequest) return;
    
    if (user?.role === 'admin') {
      const updated = requests.filter(req => req.id !== deletingRequest.id);
      setRequests(updated);
      localStorage.setItem('nubcore_vacation_requests', JSON.stringify(updated));
      showToast("Solicitud eliminada con éxito", "success");
    } else {
      const updated = requests.map(req => {
        if (req.id === deletingRequest.id) {
          return { ...req, deletionRequested: true };
        }
        return req;
      });
      setRequests(updated);
      localStorage.setItem('nubcore_vacation_requests', JSON.stringify(updated));
      showToast("Solicitud de eliminación enviada con éxito", "success");
    }
    
    setDeletingRequest(null);
    fetchVacationRequests();
  };

  const checkOverlap = (workerId: string, startStr: string, endStr: string, excludeRequestId?: string) => {
    if (!startStr || !endStr) return null;
    const newRangeDays = getBusinessDaysArray(startStr, endStr);
    
    // Find all other active requests
    const activeRequests = requests.filter(
      r => r.workerId === workerId && r.status !== 'rejected' && r.id !== excludeRequestId
    );
    
    for (const req of activeRequests) {
      const existingDays = req.type === 'days' 
        ? (req.selectedDates || getCleanCommentAndDates(req).dates)
        : getBusinessDaysArray(req.startDate, req.endDate);
        
      for (const day of newRangeDays) {
        if (existingDays.includes(day)) {
          return { overlappedDay: day, request: req };
        }
      }
    }
    return null;
  };

  const generateVacationAnnex = (req: VacationRequest) => {
    try {
      const currentSimDocs = localStorage.getItem('nubcore_sim_documents');
      let docs: any[] = [];
      if (currentSimDocs) {
        docs = JSON.parse(currentSimDocs);
      }
      
      // Check if there is already an annex for this request
      const exists = docs.some(d => d.metadata?.vacation_request_id === req.id);
      if (exists) return;

      const newDocId = `doc_vac_${Math.random().toString(36).substr(2, 9)}`;
      const dateStr = new Date().toLocaleDateString('es-CL');
      
      const newDoc = {
        id: newDocId,
        title: `Comprobante de Vacaciones - ${req.workerName}`,
        file_url: `#`,
        file_size: 148200,
        file_type: 'application/pdf',
        category: 'anexo',
        ocr_status: 'completed',
        metadata: {
          vacation_request_id: req.id,
          rut_empresa: user?.tenant?.tax_id || '76.123.456-K',
          rut_empleado: req.workerRut,
          nombre_empleado: req.workerName,
          tipo_anexo: 'Anexo de Vacaciones',
          fecha_documento: dateStr,
          is_auto_generated: true,
          is_physically_signed: false
        },
        version: 1,
        created_at: new Date().toISOString()
      };

      docs.push(newDoc);
      localStorage.setItem('nubcore_sim_documents', JSON.stringify(docs));

      // Set signature status as pending
      const savedSignatures = localStorage.getItem('nubcore_annex_signature_statuses');
      const signatures = savedSignatures ? JSON.parse(savedSignatures) : {};
      signatures[newDocId] = 'pending';
      localStorage.setItem('nubcore_annex_signature_statuses', JSON.stringify(signatures));
    } catch (e) {
      console.error("Error generating auto annex", e);
    }
  };

  const getRequestAnnex = (requestId: string) => {
    try {
      const currentSimDocs = localStorage.getItem('nubcore_sim_documents');
      if (!currentSimDocs) return null;
      const docs = JSON.parse(currentSimDocs);
      const doc = docs.find((d: any) => d.metadata?.vacation_request_id === requestId);
      if (!doc) return null;

      const savedSignatures = localStorage.getItem('nubcore_annex_signature_statuses');
      const signatures = savedSignatures ? JSON.parse(savedSignatures) : {};
      return {
        ...doc,
        signatureStatus: signatures[doc.id] || 'pending'
      };
    } catch (e) {
      return null;
    }
  };

  const handlePrintVoucher = (req: VacationRequest) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const margin = 20;
      let y = 25;

      // Header Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("COMPROBANTE DE FERIADO LEGAL", 105, y, { align: "center" });

      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text("(Artículo 67 y siguientes del Código del Trabajo - Chile)", 105, y, { align: "center" });

      y += 15;

      // Empresa Box
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(margin, y, 170, 26, "FD");

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("DATOS DE LA EMPRESA:", margin + 5, y + 7);

      doc.setFont("helvetica", "normal");
      doc.text(`Razón Social: ${user?.tenant?.name || 'Constructora Alfa S.A.'}`, margin + 5, y + 14);
      doc.text(`RUT Empresa: ${user?.tenant?.tax_id || '76.123.456-K'}`, margin + 5, y + 21);
      doc.text(`Fecha Emisión: ${new Date().toLocaleDateString('es-CL')}`, margin + 115, y + 7);

      y += 34;

      // Trabajador Box
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, 170, 22, "FD");

      doc.setFont("helvetica", "bold");
      doc.text("DATOS DEL TRABAJADOR:", margin + 5, y + 7);

      doc.setFont("helvetica", "normal");
      doc.text(`Nombre Completo: ${req.workerName}`, margin + 5, y + 14);
      doc.text(`RUT Trabajador: ${req.workerRut}`, margin + 5, y + 20);

      y += 30;

      // Detalle de Vacaciones Box
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, 170, 48, "FD");

      doc.setFont("helvetica", "bold");
      doc.text("DETALLE DEL PERÍODO DE VACACIONES:", margin + 5, y + 7);

      doc.setFont("helvetica", "normal");
      doc.text(`Fecha de Inicio: ${formatDateString(req.startDate)}`, margin + 5, y + 15);
      doc.text(`Fecha de Fin: ${formatDateString(req.endDate)}`, margin + 5, y + 22);
      doc.text(`Total de Días Hábiles Solicitados: ${req.days} días`, margin + 5, y + 29);

      const datesText = req.type === 'days' 
        ? `Días específicos señalados:\n${(req.selectedDates || []).map(d => formatDateString(d)).join(', ')}`
        : `Tipo de Solicitud: Vacaciones Completas (Rango continuo de días).`;
      
      const splitDates = doc.splitTextToSize(datesText, 160);
      doc.text(splitDates, margin + 5, y + 36);

      y += 62;

      // Legal disclaimer
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      const disclaimer = "El trabajador abajo firmante declara gozar de su feriado legal en los términos aquí descritos de común acuerdo con el empleador, de conformidad con lo establecido en la legislación laboral chilena vigente.";
      const splitDisclaimer = doc.splitTextToSize(disclaimer, 170);
      doc.text(splitDisclaimer, margin, y);

      y += 30;

      // Signatures lines
      doc.setDrawColor(148, 163, 184); // slate-400
      doc.line(margin + 10, y, margin + 70, y);
      doc.line(margin + 100, y, margin + 160, y);

      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text("Firma Trabajador", margin + 40, y + 5, { align: "center" });
      doc.text("Firma Empleador (RRHH)", margin + 130, y + 5, { align: "center" });

      doc.save(`Comprobante_Vacaciones_${req.workerName.replace(/\s+/g, '_')}.pdf`);
      showToast("Comprobante generado y descargado en formato PDF.", "success");
    } catch (err) {
      console.error(err);
      showToast("Error al generar el PDF del comprobante.", "error");
    }
  };

  const handleUploadPhysicalSignature = (req: VacationRequest, file: File) => {
    const annex = getRequestAnnex(req.id);
    if (!annex) {
      generateVacationAnnex(req);
    }
    
    setUploadingVoucherId(req.id);
    setUploadingPercent(0);

    const interval = setInterval(() => {
      setUploadingPercent((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 25;
      });
    }, 150);

    setTimeout(() => {
      clearInterval(interval);
      try {
        const currentSimDocs = localStorage.getItem('nubcore_sim_documents');
        if (currentSimDocs) {
          const docs = JSON.parse(currentSimDocs);
          const updatedDocs = docs.map((d: any) => {
            if (d.metadata?.vacation_request_id === req.id) {
              return {
                ...d,
                title: `Comprobante de Vacaciones [Firmado Físicamente] - ${req.workerName}`,
                file_url: URL.createObjectURL(file),
                file_name: file.name,
                file_size: file.size,
                file_type: file.type,
                metadata: {
                  ...d.metadata,
                  is_physically_signed: true,
                  uploaded_file_name: file.name
                }
              };
            }
            return d;
          });
          localStorage.setItem('nubcore_sim_documents', JSON.stringify(updatedDocs));
        }

        const savedSignatures = localStorage.getItem('nubcore_annex_signature_statuses');
        const signatures = savedSignatures ? JSON.parse(savedSignatures) : {};
        const docs = currentSimDocs ? JSON.parse(currentSimDocs) : [];
        const doc = docs.find((d: any) => d.metadata?.vacation_request_id === req.id);
        if (doc) {
          signatures[doc.id] = 'signed';
          localStorage.setItem('nubcore_annex_signature_statuses', JSON.stringify(signatures));
        }

        showToast(`Comprobante "${file.name}" cargado y registrado con éxito`, "success");
        fetchVacationRequests();
      } catch (err) {
        console.error(err);
      }
      setUploadingVoucherId(null);
    }, 800);
  };

  const handleResetAnnexSignature = (req: VacationRequest, annexId: string) => {
    setResettingRequest({ req, annexId });
  };

  const confirmResetAnnexSignature = () => {
    if (!resettingRequest) return;
    const { req, annexId } = resettingRequest;

    try {
      // 1. Update the document title and metadata in nubcore_sim_documents
      const currentSimDocs = localStorage.getItem('nubcore_sim_documents');
      if (currentSimDocs) {
        const docs = JSON.parse(currentSimDocs);
        const updatedDocs = docs.map((d: any) => {
          if (d.id === annexId) {
            return {
              ...d,
              title: `Comprobante de Vacaciones - ${req.workerName}`,
              metadata: {
                ...d.metadata,
                is_physically_signed: false
              }
            };
          }
          return d;
        });
        localStorage.setItem('nubcore_sim_documents', JSON.stringify(updatedDocs));
      }

      // 2. Set signature status back to pending in nubcore_annex_signature_statuses
      const savedSignatures = localStorage.getItem('nubcore_annex_signature_statuses');
      const signatures = savedSignatures ? JSON.parse(savedSignatures) : {};
      signatures[annexId] = 'pending';
      localStorage.setItem('nubcore_annex_signature_statuses', JSON.stringify(signatures));

      showToast("Firma de comprobante anulada. Estado devuelto a Firma Pendiente.", "success");
      setResettingRequest(null);
      fetchVacationRequests(); // trigger re-render
    } catch (e) {
      console.error(e);
      setResettingRequest(null);
    }
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
        {user?.role !== 'employee' && (
          <button
            onClick={() => setShowRegulationsModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-250 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 border border-slate-200/50 dark:border-slate-800/80 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Info className="w-4.5 h-4.5 text-brand-500" />
            <span>Ver Normativa</span>
          </button>
        )}
      </div>

      {/* KPI Cards (Available, Taken, Pending) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Días Disponibles / Días Pendientes */}
        <div className="bento-card p-6 flex flex-col justify-between relative overflow-hidden group hover:border-brand-500/30 transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
          <div className="flex items-start justify-between">
            <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">
              {user?.role === 'employee' ? 'Mis Días Disponibles' : 'Días Pendientes de Aprobación'}
            </span>
            <div className="p-2 bg-brand-500/10 dark:bg-brand-400/10 text-brand-600 dark:text-brand-450 rounded-xl group-hover:scale-110 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black font-sans text-brand-650 dark:text-brand-400 tracking-tight">
              {user?.role === 'employee' 
                ? `${balance.available} días` 
                : `${requests.filter(r => r.status === 'pending').reduce((acc, cur) => acc + cur.days, 0)} días`}
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
              {user?.role === 'employee' ? 'Feriado legal anual acumulado actual' : 'Total acumulado en solicitudes en cola'}
            </p>
            {user?.role === 'employee' && (
              <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/40 text-[9px] text-slate-450 dark:text-slate-500 flex justify-between font-mono font-bold">
                <span className="text-brand-600 dark:text-brand-400">Cuota: +15</span>
                <span className="text-emerald-600 dark:text-emerald-400">Tomados: -{balance.taken - 10}</span>
                <span className="text-amber-500 dark:text-amber-400">Trámite: -{balance.pending}</span>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Días Consumidos / Colaboradores de Vacaciones */}
        <div className="bento-card p-6 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
          <div className="flex items-start justify-between">
            <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">
              {user?.role === 'employee' ? 'Días Consumidos' : 'Colaboradores de Vacaciones Hoy'}
            </span>
            <div className="p-2 bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 rounded-xl group-hover:scale-110 transition-transform">
              <User className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black font-sans text-emerald-600 dark:text-emerald-450 tracking-tight">
              {user?.role === 'employee' ? `${balance.taken} días` : `${activeVacationsTodayCount} colaboradores`}
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
              {user?.role === 'employee' ? 'Días de feriado legal efectivamente gozados' : 'Colaboradores ausentes en este momento'}
            </p>
          </div>
        </div>

        {/* Card 3: En Trámite / Total Solicitudes */}
        <div className="bento-card p-6 flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/30 transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
          <div className="flex items-start justify-between">
            <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">
              {user?.role === 'employee' ? 'En Trámite de Aprobación' : 'Total Solicitudes en el Mes'}
            </span>
            <div className="p-2 bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 rounded-xl group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black font-sans text-amber-600 dark:text-amber-450 tracking-tight">
              {user?.role === 'employee' ? `${balance.pending} días` : `${requests.length} solicitudes`}
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
              {user?.role === 'employee' ? 'Días sujetos a autorización de la jefatura' : 'Volumen total registrado históricamente'}
            </p>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Forms or summaries depending on role (Only for Employee) */}
        {user?.role === 'employee' && (
          <div className="lg:col-span-1 space-y-6">
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

                {/* Custom Inline Calendar */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Selecciona fechas en el Calendario</label>
                  {renderCalendar()}
                </div>

                {/* Recap and Manual inputs (read-only/synced, styled for dark mode readability) */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Fecha de Inicio</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-xl focus:border-brand-500 focus:outline-none text-slate-850 dark:text-slate-100 font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Fecha de Fin</label>
                    <input
                      type="date"
                      required
                      disabled={requestType === 'complete'}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-xl focus:border-brand-500 focus:outline-none text-slate-850 dark:text-slate-100 font-semibold ${
                        requestType === 'complete'
                          ? 'bg-slate-100 dark:bg-slate-950/60 border-slate-250 dark:border-slate-850 text-slate-450 dark:text-slate-500 cursor-not-allowed font-bold'
                          : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800'
                      }`}
                    />
                  </div>
                </div>

                {requestType === 'complete' && startDate && balance.available > 0 && (
                  <p className="text-[9px] text-brand-605 dark:text-brand-450 font-bold mt-1.5 flex items-center gap-1 leading-normal pl-1">
                    <Sparkles className="w-3 h-3 text-brand-500 animate-pulse shrink-0" />
                    Calculado sumando tus {balance.available} días hábiles continuos disponibles.
                  </p>
                )}

                {requestType === 'days' && selectedDays.length > 0 && (
                  <div className="p-3 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl space-y-2">
                    <p className="font-bold uppercase tracking-wider text-[8px] text-slate-400 dark:text-slate-555">Días seleccionados ({selectedDays.length}):</p>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {selectedDays.map(d => (
                        <span 
                          key={d} 
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-500/10 hover:bg-brand-500/20 dark:bg-brand-400/10 dark:hover:bg-brand-400/20 text-brand-650 dark:text-brand-400 border border-brand-500/20 dark:border-brand-400/25 rounded-md text-[9px] font-mono transition-colors"
                        >
                          {d.split('-').reverse().join('/')}
                          <button
                            type="button"
                            onClick={() => setSelectedDays(prev => prev.filter(x => x !== d))}
                            className="hover:text-rose-500 dark:hover:text-rose-455 transition-colors cursor-pointer"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {startDate && endDate && (
                  <div className="p-3 bg-brand-50/20 border border-brand-100/30 rounded-xl text-[11px] text-brand-700 dark:text-brand-400 flex items-center gap-2">
                    <Info className="w-4 h-4 text-brand-500 shrink-0" />
                    <span>Días solicitados: <b>{requestType === 'days' && selectedDays.length > 0 ? selectedDays.length : calculateDays(startDate, endDate)} días hábiles</b> (excluye fines de semana).</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Comentarios / Justificación</label>
                  <textarea
                    rows={2}
                    placeholder="Detalles de la solicitud..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-xl focus:border-brand-500 focus:outline-none resize-none text-slate-850 dark:text-slate-100"
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
          </div>
        )}

        {/* Right Side: Requests List */}
        <div className={`${user?.role === 'employee' ? 'lg:col-span-2' : 'lg:col-span-3'} bento-card p-6.5 space-y-4`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5 text-brand-600" />
              Historial de Solicitudes
            </h3>

            <div className="relative w-full sm:w-52">
              <Search className="w-4 h-4 text-slate-450 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9.5 pr-3.5 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:border-brand-500 focus:outline-none transition-colors text-slate-800 dark:text-slate-100 font-semibold"
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
              getFilteredRequests().map((req) => {
                const { cleanComment, dates: reqDates } = getCleanCommentAndDates(req);
                const isComplete = req.type === 'complete' || req.comments.startsWith('[Vacaciones Completas]');
                
                // Retrieve associated annex if approved
                let annex = null;
                if (req.status === 'approved') {
                  annex = getRequestAnnex(req.id);
                  if (!annex) {
                    generateVacationAnnex(req);
                    annex = getRequestAnnex(req.id);
                  }
                }

                return (
                  <div 
                    key={req.id}
                    className="p-5 bg-white/70 dark:bg-slate-900/35 border border-slate-150 dark:border-slate-800/65 rounded-[20px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-brand-500/30 dark:hover:border-brand-500/20 hover:bg-white dark:hover:bg-[#0c111f]/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.02)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all duration-300 text-xs font-semibold"
                  >
                    <div className="space-y-2.5 min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-brand-500/10 text-brand-600 dark:bg-brand-400/10 dark:text-brand-400 rounded-xl flex items-center justify-center font-bold shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-slate-905 dark:text-white leading-none text-[13px]">{req.workerName}</p>
                            {isComplete ? (
                              <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/15 rounded-lg text-[9px] font-bold">
                                Completa
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/15 rounded-lg text-[9px] font-bold">
                                Días Señalados
                              </span>
                            )}
                            {req.deletionRequested && (
                              <span className="px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-455 border border-rose-500/15 rounded-lg text-[9px] font-bold flex items-center gap-1 animate-pulse">
                                <AlertTriangle className="w-2.5 h-2.5 animate-bounce" />
                                Eliminación Solicitada
                              </span>
                            )}
                          </div>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Solicitado el {new Date(req.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-500 dark:text-slate-400 space-y-1.5 font-medium pl-12">
                        <p>
                          Período: <span className="font-bold text-slate-700 dark:text-slate-350">{formatDateString(req.startDate)} al {formatDateString(req.endDate)}</span>
                        </p>
                        <p>
                          Días Hábiles: <span className="font-bold text-brand-600 dark:text-brand-400">{req.days} días</span>
                        </p>
                        
                        {!isComplete && reqDates.length > 0 && (
                          <div className="mt-1.5">
                            <details className="group">
                              <summary className="text-[9px] text-slate-400 dark:text-slate-500 hover:text-brand-500 dark:hover:text-brand-400 cursor-pointer list-none flex items-center gap-1 select-none font-bold">
                                <span className="transition-transform group-open:rotate-90 inline-block font-mono text-[8px]">&gt;</span>
                                <span>Ver {reqDates.length} días señalados</span>
                              </summary>
                              <div className="flex flex-wrap gap-1 mt-1.5 pl-2 max-w-md">
                                {reqDates.map(d => (
                                  <span key={d} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 rounded text-[9px] font-mono text-slate-600 dark:text-slate-400">
                                    {d.split('-').reverse().join('/')}
                                  </span>
                                ))}
                              </div>
</details>
                          </div>
                        )}

                        {cleanComment && (
                          <p className="italic text-slate-400 dark:text-slate-500 mt-1.5">"{cleanComment}"</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5 w-full sm:w-auto justify-end pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-850/40 shrink-0 select-none">
                      {/* Status Badge */}
                      {req.status === 'approved' && (
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          <span className="flex items-center gap-1 px-3 py-1 bg-emerald-500/10 text-emerald-650 border border-emerald-500/20 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30 rounded-xl text-[10px] font-bold shrink-0">
                            <Check className="w-3 h-3" />
                            Aprobada
                          </span>
                          
                          {annex && (
                            <>
                              {annex.signatureStatus === 'signed' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-[9px] text-slate-500 dark:text-slate-400 font-bold shrink-0">
                                  <FileSignature className="w-3.5 h-3.5 text-slate-450" />
                                  <span title={annex.metadata?.is_physically_signed ? `Firmado físicamente: ${annex.metadata?.uploaded_file_name || 'comprobante.pdf'}` : "Firmado digitalmente con PIN"}>
                                    {annex.file_url && annex.file_url !== '#' ? (
                                      <a
                                        href={annex.file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:underline text-brand-600 dark:text-brand-400 flex items-center gap-0.5 cursor-pointer"
                                      >
                                        Doc: Firmado {annex.metadata?.is_physically_signed ? 'Físico' : 'Digital'}
                                      </a>
                                    ) : (
                                      <span>
                                        Doc: Firmado {annex.metadata?.is_physically_signed ? 'Físico' : 'Digital'}
                                      </span>
                                    )}
                                  </span>
                                  {user?.role !== 'employee' && (
                                    <button
                                      type="button"
                                      onClick={() => handleResetAnnexSignature(req, annex.id)}
                                      className="hover:text-rose-500 dark:hover:text-rose-455 transition-all duration-200 cursor-pointer ml-1.5 pl-1.5 border-l border-slate-200 dark:border-slate-750 flex items-center justify-center hover:scale-110 active:scale-90"
                                      title="Anular firma y volver a Firma Pendiente"
                                    >
                                      <X className="w-3 h-3" strokeWidth={2.5} />
                                    </button>
                                  )}
                                </span>
                              ) : user?.role === 'employee' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 dark:border-amber-400/25 rounded-xl text-[9px] font-bold animate-pulse shrink-0">
                                  <Clock className="w-3 h-3" />
                                  Firma Pendiente (Mis Anexos)
                                </span>
                              ) : (
                                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950/30 p-1 rounded-xl border border-slate-150 dark:border-slate-850/80 shrink-0">
                                  <span className="text-[9px] text-amber-500 dark:text-amber-400 font-bold px-1 flex items-center gap-1">
                                    <Clock className="w-3 h-3 animate-pulse" />
                                    Firma Pendiente
                                  </span>
                                  
                                  <button
                                    type="button"
                                    onClick={() => handlePrintVoucher(req)}
                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-brand-500 dark:text-slate-450 dark:hover:text-brand-400 rounded-lg transition-colors cursor-pointer"
                                    title="Imprimir comprobante para firma física"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                  
                                  {uploadingVoucherId === req.id ? (
                                    <span className="text-[8px] text-slate-400 animate-pulse font-mono pl-1">
                                      {uploadingPercent}%
                                    </span>
                                  ) : (
                                    <>
                                      <input
                                        type="file"
                                        id={`file-upload-${req.id}`}
                                        className="hidden"
                                        accept="application/pdf,image/*"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            handleUploadPhysicalSignature(req, file);
                                          }
                                          e.target.value = '';
                                        }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => document.getElementById(`file-upload-${req.id}`)?.click()}
                                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-emerald-500 dark:text-slate-450 dark:hover:text-emerald-400 rounded-lg transition-colors cursor-pointer"
                                        title="Cargar comprobante escaneado (Firma Física)"
                                      >
                                        <Upload className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                          
                          {user?.role !== 'employee' && (
                            <div className="flex items-center gap-1.5 ml-1">
                              <button
                                onClick={() => openEditModal(req)}
                                className="p-1.5 bg-slate-100 hover:bg-brand-500 dark:bg-slate-800/80 dark:hover:bg-brand-600 text-slate-500 hover:text-white dark:text-slate-450 dark:hover:text-white rounded-lg transition-all cursor-pointer hover:scale-105"
                                title="Editar Solicitud"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {user?.role === 'admin' ? (
                                <button
                                  onClick={() => setDeletingRequest(req)}
                                  className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white dark:bg-rose-500/20 dark:hover:bg-rose-600 dark:text-rose-455 dark:hover:text-white border border-rose-500/20 dark:border-rose-500/30 rounded-lg transition-all cursor-pointer hover:scale-105"
                                  title="Eliminar permanentemente"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                !req.deletionRequested && (
                                  <button
                                    onClick={() => setDeletingRequest(req)}
                                    className="p-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-600 hover:text-white dark:bg-amber-500/20 dark:hover:bg-amber-600 dark:text-amber-455 dark:border-amber-500/20 dark:border-amber-500/30 rounded-lg transition-all cursor-pointer hover:scale-105"
                                    title="Solicitar eliminación al administrador"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {req.status === 'rejected' && (
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 px-3 py-1 bg-rose-500/10 text-rose-650 border border-rose-500/20 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-900/30 rounded-xl text-[10px] font-bold">
                            <X className="w-3 h-3" />
                            Rechazada
                          </span>
                          {user?.role !== 'employee' && (
                            <div className="flex items-center gap-1.5 ml-1">
                              <button
                                onClick={() => openEditModal(req)}
                                className="p-1.5 bg-slate-100 hover:bg-brand-500 dark:bg-slate-800/80 dark:hover:bg-brand-600 text-slate-500 hover:text-white dark:text-slate-455 dark:hover:text-white rounded-lg transition-all cursor-pointer hover:scale-105"
                                title="Editar Solicitud"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {user?.role === 'admin' ? (
                                <button
                                  onClick={() => setDeletingRequest(req)}
                                  className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white dark:bg-rose-500/20 dark:hover:bg-rose-600 dark:text-rose-455 dark:hover:text-white border border-rose-500/20 dark:border-rose-500/30 rounded-lg transition-all cursor-pointer hover:scale-105"
                                  title="Eliminar permanentemente"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                !req.deletionRequested && (
                                  <button
                                    onClick={() => setDeletingRequest(req)}
                                    className="p-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-600 hover:text-white dark:bg-amber-500/20 dark:hover:bg-amber-600 dark:text-amber-455 dark:border-amber-500/20 dark:border-amber-500/30 rounded-lg transition-all cursor-pointer hover:scale-105"
                                    title="Solicitar eliminación al administrador"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {req.status === 'pending' && (
                        <>
                          {user?.role === 'employee' ? (
                            <span className="flex items-center gap-1 px-3 py-1 bg-amber-500/10 text-amber-655 border border-amber-500/20 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30 rounded-xl text-[10px] font-bold animate-pulse">
                              <Clock className="w-3 h-3" />
                              Esperando Aprobación
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openEditModal(req)}
                                className="p-1.5 bg-slate-100 hover:bg-brand-500 dark:bg-slate-800/80 dark:hover:bg-brand-600 text-slate-500 hover:text-white dark:text-slate-450 dark:hover:text-white rounded-lg transition-all cursor-pointer hover:scale-105"
                                title="Editar Solicitud"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleResolveRequest(req.id, 'approved')}
                                className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white dark:bg-emerald-500/20 dark:hover:bg-emerald-600 dark:text-emerald-450 dark:hover:text-white border border-emerald-500/20 dark:border-emerald-500/30 rounded-lg transition-all cursor-pointer hover:scale-105"
                                title="Aprobar"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleResolveRequest(req.id, 'rejected')}
                                className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white dark:bg-rose-500/20 dark:hover:bg-rose-600 dark:text-rose-455 dark:hover:text-white border border-rose-500/20 dark:border-rose-500/30 rounded-lg transition-all cursor-pointer hover:scale-105"
                                title="Rechazar"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              {user?.role === 'admin' ? (
                                <button
                                  onClick={() => setDeletingRequest(req)}
                                  className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-605 hover:text-white dark:bg-rose-500/20 dark:hover:bg-rose-600 dark:text-rose-450 dark:hover:text-white border border-rose-500/20 dark:border-rose-500/30 rounded-lg transition-all cursor-pointer hover:scale-105"
                                  title="Eliminar permanentemente"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                !req.deletionRequested && (
                                  <button
                                    onClick={() => setDeletingRequest(req)}
                                    className="p-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-605 hover:text-white dark:bg-amber-500/20 dark:hover:bg-amber-600 dark:text-amber-400 dark:hover:text-white border border-amber-500/20 dark:border-amber-500/30 rounded-lg transition-all cursor-pointer hover:scale-105"
                                    title="Solicitar eliminación al administrador"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Edit Request Modal */}
      {editingRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditingRequest(null)} />
          <div className="flex min-h-full items-center justify-center p-4 md:p-8 relative z-10 pointer-events-none">
            <div className="bento-card max-w-md w-full p-6 space-y-4 dark:bg-[#0c111f]/95 relative text-xs font-semibold text-slate-800 dark:text-slate-200 pointer-events-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-850/40">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Edit2 className="w-4 h-4 text-brand-500" />
                Editar Solicitud - {editingRequest.workerName}
              </h3>
              <button 
                onClick={() => setEditingRequest(null)}
                className="text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Modalidad de Solicitud</label>
                <div className="grid grid-cols-2 gap-2 p-0.5 bg-slate-100 dark:bg-[#070b15] rounded-xl border border-slate-200/60 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      if (editType !== 'days') {
                        setTempCompleteStartDate(editStartDate);
                        setEditType('days');
                        setEditSelectedDays(tempDaysSelectedDays);
                      }
                    }}
                    className={`py-2 px-3 rounded-lg text-center transition-all cursor-pointer text-[10px] font-bold ${
                      editType === 'days'
                        ? 'bg-white dark:bg-slate-900 text-brand-650 dark:text-brand-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    Días Señalados
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (editType !== 'complete') {
                        setTempDaysSelectedDays(editSelectedDays);
                        setEditType('complete');
                        setEditStartDate(tempCompleteStartDate);
                        setEditSelectedDays([]);
                      }
                    }}
                    className={`py-2 px-3 rounded-lg text-center transition-all cursor-pointer text-[10px] font-bold ${
                      editType === 'complete'
                        ? 'bg-white dark:bg-slate-900 text-brand-650 dark:text-brand-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    Vacaciones Completas
                  </button>
                </div>
              </div>

              {/* Edit Calendar */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Selecciona fechas en el Calendario</label>
                {renderEditCalendar()}
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Fecha de Inicio</label>
                  <input
                    type="date"
                    required
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-xl focus:border-brand-500 focus:outline-none text-slate-850 dark:text-slate-100 font-semibold"
                  />
                </div>

                {editType === 'complete' ? (
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Fecha de Fin</label>
                    <input
                      type="date"
                      disabled
                      value={editEndDate}
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-200/50 dark:bg-[#070b15] dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-450 cursor-not-allowed font-bold"
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Fecha de Fin</label>
                    <input
                      type="date"
                      required
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-xl focus:border-brand-500 focus:outline-none text-slate-850 dark:text-slate-100 font-semibold"
                    />
                  </div>
                )}
              </div>

              {editType === 'complete' && editStartDate && getWorkerBalance(editingRequest.workerId, editingRequest.id).available > 0 && (
                <p className="text-[9px] text-brand-600 dark:text-brand-455 font-bold mt-1 flex items-center gap-1 leading-normal pl-1">
                  <Sparkles className="w-3 h-3 text-brand-500 animate-pulse shrink-0" />
                  Calculado sumando {getWorkerBalance(editingRequest.workerId, editingRequest.id).available} días hábiles disponibles.
                </p>
              )}

              {editType === 'days' && editSelectedDays.length > 0 && (
                <div className="p-3 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl space-y-2">
                  <p className="font-bold uppercase tracking-wider text-[8px] text-slate-400 dark:text-slate-555">Días seleccionados ({editSelectedDays.length}):</p>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {editSelectedDays.map(d => (
                      <span 
                        key={d} 
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-500/10 hover:bg-brand-500/20 dark:bg-brand-400/10 dark:hover:bg-brand-400/20 text-brand-650 dark:text-brand-400 border border-brand-500/20 dark:border-brand-400/25 rounded-md text-[9px] font-mono transition-colors"
                      >
                        {d.split('-').reverse().join('/')}
                        <button
                          type="button"
                          onClick={() => setEditSelectedDays(prev => prev.filter(x => x !== d))}
                          className="hover:text-rose-500 dark:hover:text-rose-455 transition-colors cursor-pointer"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {editStartDate && editEndDate && (
                <div className="p-3 bg-brand-50/20 border border-brand-100/30 rounded-xl text-[11px] text-brand-700 dark:text-brand-400 flex items-center gap-2">
                  <Info className="w-4 h-4 text-brand-500 shrink-0" />
                  <span>
                    Días a descontar: <b>{editType === 'days' && editSelectedDays.length > 0 ? editSelectedDays.length : calculateDays(editStartDate, editEndDate)} días hábiles</b> (Disponibles: {getWorkerBalance(editingRequest.workerId, editingRequest.id).available} días).
                  </span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Estado de la Solicitud</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-xl focus:border-brand-500 focus:outline-none text-slate-850 dark:text-slate-100"
                >
                  <option value="pending">Pendiente de Aprobación</option>
                  <option value="approved">Aprobada</option>
                  <option value="rejected">Rechazada</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Comentarios / Justificación</label>
                <textarea
                  rows={2}
                  placeholder="Detalles de la solicitud..."
                  value={editComments}
                  onChange={(e) => setEditComments(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-xl focus:border-brand-500 focus:outline-none resize-none text-slate-850 dark:text-slate-100"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRequest(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete / Request Deletion Confirmation Modal */}
      {deletingRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeletingRequest(null)} />
          <div className="flex min-h-full items-center justify-center p-4 md:p-8 relative z-10 pointer-events-none">
            <div className="bento-card max-w-sm w-full p-6 space-y-4 dark:bg-[#0c111f]/95 relative text-xs font-semibold text-slate-800 dark:text-slate-200 pointer-events-auto">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100 dark:border-slate-850/40">
              <div className={`p-2 rounded-lg ${user?.role === 'admin' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                <Trash2 className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {user?.role === 'admin' ? 'Eliminar Solicitud' : 'Solicitar Eliminación'}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Confirmación de acción de vacaciones</p>
              </div>
              <button 
                onClick={() => setDeletingRequest(null)}
                className="text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 cursor-pointer ml-auto"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-slate-600 dark:text-slate-355 font-medium leading-relaxed">
              {user?.role === 'admin' ? (
                <span>
                  ¿Estás seguro de que deseas eliminar permanentemente la solicitud de vacaciones de <b>{deletingRequest.workerName}</b> del <b>{formatDateString(deletingRequest.startDate)}</b> al <b>{formatDateString(deletingRequest.endDate)}</b>? Esta acción no se puede deshacer y reconfigurará los días hábiles disponibles inmediatamente.
                </span>
              ) : (
                <span>
                  ¿Deseas enviar una solicitud al administrador de la empresa para eliminar la solicitud de vacaciones de <b>{deletingRequest.workerName}</b> del <b>{formatDateString(deletingRequest.startDate)}</b> al <b>{formatDateString(deletingRequest.endDate)}</b>?
                </span>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRequest(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-355 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteOrRequest}
                className={`flex-1 py-2 text-white rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer ${
                  user?.role === 'admin' 
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/10' 
                    : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/10'
                }`}
              >
                {user?.role === 'admin' ? 'Eliminar Definitivamente' : 'Enviar Solicitud'}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Signature Confirmation Modal */}
      {resettingRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setResettingRequest(null)} />
          <div className="flex min-h-full items-center justify-center p-4 md:p-8 relative z-10 pointer-events-none">
            <div className="bento-card max-w-sm w-full p-6 space-y-4 dark:bg-[#0c111f]/95 relative text-xs font-semibold text-slate-800 dark:text-slate-200 pointer-events-auto">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-100 dark:border-slate-850/40">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <ShieldCheck className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Anular Firma Comprobante
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Control de Auditoría y Documentación</p>
                </div>
                <button 
                  onClick={() => setResettingRequest(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 cursor-pointer ml-auto"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-slate-655 dark:text-slate-350 font-medium leading-relaxed">
                ¿Seguro que deseas <b>anular la firma</b> del comprobante de vacaciones de <b>{resettingRequest.req.workerName}</b>?
                <div className="mt-2 text-[10px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-150 dark:border-slate-800/80">
                  El documento pasará a estado <b>"Firma Pendiente"</b>, lo que permitirá generar un nuevo comprobante o subir un escaneo corregido.
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResettingRequest(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-355 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmResetAnnexSignature}
                  className="flex-1 py-2 text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/10 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Confirmar Anulación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Regulations Modal */}
      {showRegulationsModal && user?.role !== 'employee' && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowRegulationsModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4 md:p-8 relative z-10 pointer-events-none">
            <div className="bento-card max-w-md w-full p-6 space-y-5 dark:bg-[#0c111f]/95 relative text-xs font-semibold text-slate-800 dark:text-slate-200 pointer-events-auto shadow-2xl transition-all">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-850/40">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Info className="w-4.5 h-4.5 text-brand-500" />
                  Normativa Feriado Legal Chile
                </h3>
                <button 
                  onClick={() => setShowRegulationsModal(false)}
                  className="text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-medium">
                <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl space-y-1">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                    1. Feriado Básico
                  </h4>
                  <p className="pl-3">
                    Todo trabajador con más de un año de servicio tiene derecho a 15 días hábiles de vacaciones remuneradas.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl space-y-1">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                    2. Días Hábiles
                  </h4>
                  <p className="pl-3">
                    Los días de vacaciones se cuentan de lunes a viernes. Los sábados, domingos y feriados no computan.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl space-y-1">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                    3. Continuidad
                  </h4>
                  <p className="pl-3">
                    El trabajador debe solicitar al menos 10 días seguidos. El resto puede fraccionarse de común acuerdo.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-850/40 flex items-center justify-between gap-4">
                <span className="text-[9px] font-bold text-emerald-655 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Código del Trabajo
                </span>
                <button
                  type="button"
                  onClick={() => setShowRegulationsModal(false)}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-[10px] font-bold transition-all cursor-pointer shadow-md"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-[100] animate-in slide-in-from-bottom duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold max-w-sm ${
            toast.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 dark:bg-rose-950/20'
              : toast.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/20'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 dark:bg-amber-950/20'
          }`}>
            {toast.type === 'error' && <AlertTriangle className="w-5 h-5 shrink-0 text-rose-500 dark:text-rose-455" />}
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500 dark:text-emerald-400" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 dark:text-amber-400" />}
            <span className="flex-1 text-slate-800 dark:text-slate-100">{toast.message}</span>
            <button type="button" onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default VacationControl;
