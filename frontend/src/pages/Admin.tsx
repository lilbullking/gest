import React, { useEffect, useState } from 'react';
import { authAPI, auditAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Shield, UserPlus } from 'lucide-react';

interface UserItem {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface AuditItem {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  user_detail?: {
    email: string;
    first_name: string;
    last_name: string;
  };
}

const Admin: React.FC = () => {
  const { user } = useAuth();
  
  const [users, setUsers] = useState<UserItem[]>([]);
  const [logs, setLogs] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('employee');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const usersRes = await authAPI.listUsers();
      setUsers(usersRes.data);
      
      if (['admin', 'hr', 'auditor'].includes(user?.role || '')) {
        const logsRes = await auditAPI.listLogs();
        setLogs(logsRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    try {
      await authAPI.createUser({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        role
      });
      setFormSuccess("Usuario provisionado con éxito.");
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setRole('employee');
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.error || "Error al registrar. Verifica que tienes privilegios de Administrador o RRHH.");
    }
  };

  const getRoleLabel = (r: string) => {
    switch (r) {
      case 'admin': return 'Administrador';
      case 'hr': return 'Encargado RRHH';
      case 'employee': return 'Trabajador';
      case 'auditor': return 'Auditor Externo';
      default: return r;
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
      
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-sans">Consola de Administración</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">Gestiona accesos del personal de tu empresa e inspecciona logs de seguridad laboral.</p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Provisionar Usuario (Columna 1) */}
        <div className="bento-card p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-brand-500 dark:text-brand-400" />
            Provisionar Usuario
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed font-medium">
            Asigna nuevas credenciales de acceso vinculadas al tenant actual.
          </p>

          {formError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">{formError}</div>}
          {formSuccess && <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl">{formSuccess}</div>}

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-450 uppercase tracking-wider mb-1.5">Nombre</label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Juan"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white dark:bg-slate-900/40 dark:border-slate-800 focus:outline-none rounded-xl py-2.5 px-3.5 text-xs text-slate-800 dark:text-slate-100 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all duration-150"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-450 uppercase tracking-wider mb-1.5">Apellido</label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Pérez"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white dark:bg-slate-900/40 dark:border-slate-800 focus:outline-none rounded-xl py-2.5 px-3.5 text-xs text-slate-800 dark:text-slate-100 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all duration-150"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-450 uppercase tracking-wider mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="juan@empresa.com"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white dark:bg-slate-900/40 dark:border-slate-800 focus:outline-none rounded-xl py-2.5 px-3.5 text-xs text-slate-800 dark:text-slate-100 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all duration-150"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-450 uppercase tracking-wider mb-1.5">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white dark:bg-slate-900/40 dark:border-slate-800 focus:outline-none rounded-xl py-2.5 px-3.5 text-xs text-slate-800 dark:text-slate-100 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all duration-150"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-450 uppercase tracking-wider mb-1.5">Rol Corporativo</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white dark:bg-slate-900/40 dark:border-slate-800 focus:outline-none rounded-xl py-2.5 px-3.5 text-xs text-slate-700 dark:text-slate-200 focus:border-brand-500 transition-all duration-150"
              >
                <option value="employee">Trabajador (Solo Ver)</option>
                <option value="hr">Encargado de RRHH (Control de Archivos)</option>
                <option value="admin">Administrador (Control total)</option>
                <option value="auditor">Auditor Externo (Visualizador Logs)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={!['admin', 'hr'].includes(user?.role || '')}
              className="w-full bg-brand-600 hover:bg-brand-700 py-3 rounded-xl text-xs font-bold hover-scale shadow-md disabled:opacity-50 disabled:pointer-events-none mt-2 text-white"
            >
              {['admin', 'hr'].includes(user?.role || '') ? 'Crear Usuario' : 'Acceso Denegado (Solo Admin/RRHH)'}
            </button>
          </form>
        </div>

        {/* Tabla de Usuarios Activos (Columnas 2 y 3) */}
        <div className="lg:col-span-2 bento-card p-6 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            Usuarios del Tenant ({user?.tenant?.name})
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed font-medium">
            Visualiza el personal autorizado para gestionar archivos dentro de la empresa.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/20">
                  <th className="py-3.5 px-5">Miembro</th>
                  <th className="py-3.5 px-5">Rol Asignado</th>
                  <th className="py-3.5 px-5">Correo Electrónico</th>
                  <th className="py-3.5 px-5 text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 dark:border-slate-800/40 hover:bg-slate-100/50 dark:hover:bg-slate-900/10 transition-colors">
                    <td className="py-3.5 px-5 font-semibold text-slate-800 dark:text-slate-200">
                      {u.first_name || 'N/A'} {u.last_name || 'N/A'}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="inline-block px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/60 text-[9px] font-bold text-indigo-600 dark:text-indigo-300 font-mono uppercase tracking-wide">
                        {getRoleLabel(u.role)}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-500 dark:text-slate-400 font-mono">{u.email}</td>
                    <td className="py-3.5 px-5 text-center">
                      <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-md shadow-emerald-500/10" title="Activo"></span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Consola de Auditoría */}
      {['admin', 'hr', 'auditor'].includes(user?.role || '') && (
        <div className="bento-card p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Shield className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              Historial de Auditoría Verificado
            </h3>
            <span className="text-[9px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400 px-3 py-1 rounded-full uppercase tracking-widest font-mono border border-brand-100/30">
              ISO 27001 COMPLIANT
            </span>
          </div>

          <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed max-w-xl font-medium">
            Historial de eventos de transacciones inmutables para el Ministerio de Trabajo y auditorías laborales corporativas.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 max-h-[300px] overflow-y-auto">
            <table className="w-full text-left text-[11px] text-slate-600 dark:text-slate-300">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/20">
                  <th className="py-3.5 px-5">Operación</th>
                  <th className="py-3.5 px-5">Usuario Autor</th>
                  <th className="py-3.5 px-5">ID del Recurso</th>
                  <th className="py-3.5 px-5">Dispositivo / Agente</th>
                  <th className="py-3.5 px-5 text-right">Fecha Registrada</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100 dark:border-slate-800/30 hover:bg-slate-100/50 dark:hover:bg-slate-900/10 transition-colors">
                    <td className="py-3 px-5">
                      <span className="inline-block px-2.5 py-0.5 font-bold border border-slate-200 dark:border-slate-800 rounded bg-slate-50 dark:bg-[#090d16] text-slate-700 dark:text-slate-200">
                        {l.action}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-slate-800 dark:text-slate-200">
                      {l.user_detail ? `${l.user_detail.first_name} ${l.user_detail.last_name}` : 'Sistema'}
                    </td>
                    <td className="py-3 px-5 font-mono text-slate-400 dark:text-slate-500 text-[9px]">{l.resource_id}</td>
                    <td className="py-3 px-5 text-slate-400 dark:text-slate-500 truncate max-w-[200px]" title={l.user_agent}>
                      {l.user_agent}
                    </td>
                    <td className="py-3 px-5 text-right text-slate-500 dark:text-slate-400 font-mono">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default Admin;
