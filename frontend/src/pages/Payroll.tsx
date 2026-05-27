import React, { useEffect, useState } from 'react';
import { authAPI, documentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Calculator, User, Save, RefreshCw, Sparkles, Check, 
  Settings, Download, Play, TableProperties
} from 'lucide-react';

interface WorkerPayroll {
  id: string;
  name: string;
  rut: string;
  sueldoBase: number;
  horasExtra: number;
  bonos: number;
  gratificacion: number;
  afp: number; // calculated
  salud: number; // calculated
  totalHaberes: number; // calculated
  totalDescuentos: number; // calculated
  sueldoLiquido: number; // calculated
  status: 'draft' | 'generating' | 'generated';
}

const Payroll: React.FC = () => {
  const { user } = useAuth();
  const [payrollList, setPayrollList] = useState<WorkerPayroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState('Mayo 2026');
  const [globalStatus, setGlobalStatus] = useState<'idle' | 'processing' | 'done'>('idle');

  // Load workers and initialize spreadsheet data
  const loadWorkersPayroll = async () => {
    try {
      setLoading(true);
      const res = await authAPI.listUsers();
      
      const savedPayroll = localStorage.getItem(`nubcore_payroll_data_${month}`);
      if (savedPayroll) {
        setPayrollList(JSON.parse(savedPayroll));
      } else {
        const initialPayrollList: WorkerPayroll[] = res.data.map((w: any, index: number) => {
          const base = w.email.includes('admin') ? 1800000 : w.email.includes('hr') ? 1200000 : 850000;
          const rut = w.rut || `15.${index}45.678-${index + 1}`;
          
          return calculatePayrollRow({
            id: w.id,
            name: `${w.first_name} ${w.last_name}`,
            rut,
            sueldoBase: base,
            horasExtra: 0,
            bonos: 0,
            gratificacion: 0,
            afp: 0,
            salud: 0,
            totalHaberes: 0,
            totalDescuentos: 0,
            sueldoLiquido: 0,
            status: 'draft'
          });
        });
        setPayrollList(initialPayrollList);
        localStorage.setItem(`nubcore_payroll_data_${month}`, JSON.stringify(initialPayrollList));
      }
    } catch (error) {
      console.error("Error loading payroll", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkersPayroll();
  }, [month]);

  // Calculate legal rules (Chilean standard approximations)
  const calculatePayrollRow = (row: Partial<WorkerPayroll> & { sueldoBase: number, horasExtra: number, bonos: number }): WorkerPayroll => {
    const sueldoBase = row.sueldoBase;
    const horasExtraQty = row.horasExtra;
    const bonos = row.bonos;
    
    // Valor hora extra aproximado (1.5x)
    const valorHoraBase = sueldoBase / 180; // 180 hrs mensuales jornada ordinaria
    const valorHoraExtra = Math.round(valorHoraBase * 1.5);
    const totalHorasExtra = Math.round(horasExtraQty * valorHoraExtra);
    
    // Gratificación legal (25% del sueldo base, con tope de 4.75 ingresos mínimos. Supongamos tope de $160.000)
    const gratificacion = Math.min(Math.round(sueldoBase * 0.25), 160000);
    
    const totalHaberes = sueldoBase + totalHorasExtra + gratificacion + bonos;
    
    // Descuentos previsionales (AFP ~11.5%, Salud 7%)
    const afp = Math.round(totalHaberes * 0.115);
    const salud = Math.round(totalHaberes * 0.07);
    
    const totalDescuentos = afp + salud;
    const sueldoLiquido = totalHaberes - totalDescuentos;

    return {
      id: row.id || Math.random().toString(),
      name: row.name || 'Trabajador',
      rut: row.rut || '11.111.111-1',
      sueldoBase,
      horasExtra: horasExtraQty,
      bonos,
      gratificacion,
      afp,
      salud,
      totalHaberes,
      totalDescuentos,
      sueldoLiquido,
      status: row.status || 'draft'
    };
  };

  const handleCellChange = (id: string, field: 'sueldoBase' | 'horasExtra' | 'bonos', value: string) => {
    const numeric = parseInt(value.replace(/\D/g, ''), 10) || 0;
    
    const updated = payrollList.map((row) => {
      if (row.id === id) {
        const updatedRow = { ...row, [field]: numeric };
        return calculatePayrollRow(updatedRow);
      }
      return row;
    });

    setPayrollList(updated);
    localStorage.setItem(`nubcore_payroll_data_${month}`, JSON.stringify(updated));
  };

  const handleGenerateSingle = async (id: string) => {
    const listUpdated = payrollList.map(r => r.id === id ? { ...r, status: 'generating' as const } : r);
    setPayrollList(listUpdated);
    
    const row = payrollList.find(r => r.id === id);
    if (!row) return;

    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate writing the calculated PDF to documents
    const simulatedFileName = `Liquidacion_${row.name.replace(/\s+/g, '_')}_Mayo_2026.pdf`;
    
    // Call document creation API
    try {
      const boundaryStr = `Liquidacion de sueldo Mayo 2026. Empleado: ${row.name}. RUT: ${row.rut}. Haberes: ${row.totalHaberes}. Liquido a pagar: ${row.sueldoLiquido}.`;
      
      const fileBlob = new Blob([boundaryStr], { type: 'application/pdf' });
      const file = new File([fileBlob], simulatedFileName);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name);
      
      const res = await documentAPI.create(formData);
      
      // Update local storage document entry with matching metadata
      const currentSimDocs = localStorage.getItem('nubcore_sim_documents');
      if (currentSimDocs) {
        const parsedDocs = JSON.parse(currentSimDocs);
        const updatedDocs = parsedDocs.map((d: any) => {
          if (d.id === res.data.id) {
            return {
              ...d,
              category: 'liquidacion',
              metadata: {
                rut_empresa: user?.tenant?.tax_id,
                rut_empleado: row.rut,
                nombre_empleado: row.name,
                fecha_documento: `31/05/2026`,
                monto_total: row.sueldoLiquido.toString()
              }
            };
          }
          return d;
        });
        localStorage.setItem('nubcore_sim_documents', JSON.stringify(updatedDocs));
      }
    } catch (e) {
      console.error(e);
    }

    const listFinished = payrollList.map(r => r.id === id ? { ...r, status: 'generated' as const } : r);
    setPayrollList(listFinished);
    localStorage.setItem(`nubcore_payroll_data_${month}`, JSON.stringify(listFinished));
  };

  const handleGenerateAll = async () => {
    setGlobalStatus('processing');
    
    for (const row of payrollList) {
      if (row.status !== 'generated') {
        await handleGenerateSingle(row.id);
      }
    }

    setGlobalStatus('done');
    await new Promise(resolve => setTimeout(resolve, 1500));
    setGlobalStatus('idle');
  };

  const formatCLP = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount);
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Planilla de Liquidaciones
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
            Calculadora inteligente de remuneraciones, gratificaciones e imposiciones previsionales.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select 
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-xl text-xs focus:outline-none"
          >
            <option>Mayo 2026</option>
            <option>Abril 2026</option>
          </select>

          <button
            onClick={handleGenerateAll}
            disabled={globalStatus !== 'idle'}
            className="flex items-center gap-2 px-4.5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            {globalStatus === 'processing' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generando Remuneraciones...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Generar Masivo de Liquidaciones
              </>
            )}
          </button>
        </div>
      </div>

      {/* Spreadsheet / Table Bento Card */}
      <div className="bento-card p-6 overflow-hidden">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <TableProperties className="w-4.5 h-4.5 text-brand-600 dark:text-brand-455" />
          Libro de Remuneración de Mayo 2026
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-150/40 dark:border-slate-800/40 text-slate-450 dark:text-slate-550 font-bold uppercase tracking-wider bg-slate-50/20 dark:bg-[#0c111f]/20">
                <th className="py-3 px-4 min-w-[200px]">Colaborador</th>
                <th className="py-3 px-4 min-w-[120px]">Sueldo Base ($)</th>
                <th className="py-3 px-4 min-w-[100px]">Hrs Extra</th>
                <th className="py-3 px-4 min-w-[120px]">Otros Bonos ($)</th>
                <th className="py-3 px-4 min-w-[120px]">Gratificación</th>
                <th className="py-3 px-4 min-w-[110px]">AFP (11.5%)</th>
                <th className="py-3 px-4 min-w-[100px]">Salud (7%)</th>
                <th className="py-3 px-4 min-w-[130px] font-extrabold text-brand-600 dark:text-brand-400">Neto Líquido</th>
                <th className="py-3 px-4 text-center min-w-[150px]">Acciones</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
              {payrollList.map((row) => (
                <tr 
                  key={row.id} 
                  className="hover:bg-slate-50/30 dark:hover:bg-slate-900/10 transition-colors font-medium text-slate-700 dark:text-slate-300"
                >
                  {/* Worker identity */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-brand-500/10 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 rounded-lg flex items-center justify-center font-bold text-xs shrink-0">
                        {row.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white leading-tight">{row.name}</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">{row.rut}</p>
                      </div>
                    </div>
                  </td>

                  {/* Sueldo Base Edit Cell */}
                  <td className="py-4 px-4">
                    <input 
                      type="text" 
                      value={row.sueldoBase} 
                      onChange={(e) => handleCellChange(row.id, 'sueldoBase', e.target.value)}
                      className="w-24 px-2 py-1 bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-lg focus:border-brand-500 focus:outline-none font-semibold text-xs"
                    />
                  </td>

                  {/* Horas Extra Edit Cell */}
                  <td className="py-4 px-4">
                    <input 
                      type="number" 
                      min="0"
                      max="40"
                      value={row.horasExtra || 0} 
                      onChange={(e) => handleCellChange(row.id, 'horasExtra', e.target.value)}
                      className="w-14 px-2 py-1 bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-lg focus:border-brand-500 focus:outline-none font-semibold text-xs"
                    />
                  </td>

                  {/* Bonos Edit Cell */}
                  <td className="py-4 px-4">
                    <input 
                      type="text" 
                      value={row.bonos} 
                      onChange={(e) => handleCellChange(row.id, 'bonos', e.target.value)}
                      className="w-24 px-2 py-1 bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-lg focus:border-brand-500 focus:outline-none font-semibold text-xs"
                    />
                  </td>

                  {/* Gratificacion computed */}
                  <td className="py-4 px-4 font-semibold">{formatCLP(row.gratificacion)}</td>

                  {/* AFP deduction computed */}
                  <td className="py-4 px-4 text-slate-450 dark:text-slate-500">{formatCLP(row.afp)}</td>

                  {/* Salud deduction computed */}
                  <td className="py-4 px-4 text-slate-450 dark:text-slate-500">{formatCLP(row.salud)}</td>

                  {/* Neto Liquido computed */}
                  <td className="py-4 px-4 font-extrabold text-slate-950 dark:text-white">
                    {formatCLP(row.sueldoLiquido)}
                  </td>

                  {/* Single Generate Button */}
                  <td className="py-4 px-4 text-center">
                    {row.status === 'generated' ? (
                      <span className="flex items-center justify-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-450">
                        <Check className="w-3.5 h-3.5" />
                        PDF Generado
                      </span>
                    ) : row.status === 'generating' ? (
                      <span className="flex items-center justify-center gap-1 text-[10px] font-bold text-brand-600 animate-pulse">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Procesando...
                      </span>
                    ) : (
                      <button
                        onClick={() => handleGenerateSingle(row.id)}
                        className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-[10px] font-extrabold transition-all cursor-pointer shadow-sm"
                      >
                        Generar Liquidación
                      </button>
                    )}
                  </td>

                </tr>
              ))}
            </tbody>

          </table>
        </div>
      </div>

    </div>
  );
};

export default Payroll;
