import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Adjuntar token de autenticación en cada petición
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('nubcore_token');
  if (token && !token.startsWith('simulated-')) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// ========================================================
// SISTEMA DE SIMULACIÓN Y CAPA DE BASE DE DATOS LOCAL
// ========================================================

const MOCK_DOCS_INITIAL = [
  // Documentos de Constructora Alfa
  {
    id: "d0000000-0000-0000-0000-000000000101",
    tenant_id: "a0000000-0000-0000-0000-000000000001", // Alfa
    title: "Contrato de Trabajo - Juan Perez.pdf",
    file_url: "#",
    file_size: 450123,
    file_type: "pdf",
    category: "contrato",
    ocr_status: "completed",
    extracted_text: "CONTRATO DE TRABAJO INDEFINIDO. Entre CONSTRUCTORA ALFA S.A. RUT 76.123.456-K y don Juan Pérez Silva RUT 18.456.789-0. Supervisor de Obra. Sueldo base $850.000.",
    metadata: {
      rut_empresa: "76.123.456-K",
      rut_empleado: "18.456.789-0",
      nombre_empleado: "Juan Pérez Silva",
      fecha_documento: "01/01/2025",
      monto_total: "850000"
    },
    version: 1,
    is_archived: false,
    created_at: "2026-01-05T12:00:00Z"
  },
  {
    id: "d0000000-0000-0000-0000-000000000102",
    tenant_id: "a0000000-0000-0000-0000-000000000001", // Alfa
    title: "Liquidacion Sueldo Mayo 2026 - Juan Perez.pdf",
    file_url: "#",
    file_size: 154302,
    file_type: "pdf",
    category: "liquidacion",
    ocr_status: "completed",
    extracted_text: "LIQUIDACIÓN DE SUELDO - MES DE MAYO 2026. EMPRESA: CONSTRUCTORA ALFA S.A. RUT EMPRESA: 76.123.456-K. TRABAJADOR: Juan Pérez Silva. RUT: 18.456.789-0. ALCANCE LÍQUIDO A PAGAR: $820.000.",
    metadata: {
      rut_empresa: "76.123.456-K",
      rut_empleado: "18.456.789-0",
      nombre_empleado: "Juan Pérez Silva",
      fecha_documento: "30/05/2026",
      monto_total: "820000"
    },
    version: 1,
    is_archived: false,
    created_at: "2026-05-20T17:30:00Z"
  },
  {
    id: "d0000000-0000-0000-0000-000000000103",
    tenant_id: "a0000000-0000-0000-0000-000000000001", // Alfa
    title: "Entrega Casco y Botas - Juan Perez.jpg",
    file_url: "#",
    file_size: 2049000,
    file_type: "jpg",
    category: "epp",
    ocr_status: "completed",
    extracted_text: "REGISTRO DE ENTREGA DE EQUIPOS DE PROTECCIÓN PERSONAL (EPP). El trabajador Juan Pérez Silva, RUT 18.456.789-0, declara haber recibido 1 Casco de seguridad y Zapatos de seguridad.",
    metadata: {
      rut_empleado: "18.456.789-0",
      nombre_empleado: "Juan Pérez Silva",
      fecha_documento: "15/02/2026"
    },
    version: 1,
    is_archived: false,
    created_at: "2026-02-15T09:15:00Z"
  },

  // Documentos de Tecnología Beta
  {
    id: "d0000000-0000-0000-0000-000000000201",
    tenant_id: "b0000000-0000-0000-0000-000000000002", // Beta
    title: "Contrato Directora Tecnologia - Sofia Valenzuela.pdf",
    file_url: "#",
    file_size: 610500,
    file_type: "pdf",
    category: "contrato",
    ocr_status: "completed",
    extracted_text: "CONTRATO DE TRABAJO. Entre Tecnología Beta Ltda. RUT 78.987.654-3 y doña Sofía Valenzuela, RUT 15.321.654-9. Cargo: Directora de Ingeniería. Sueldo líquido mensual: $3.200.000.",
    metadata: {
      rut_empresa: "78.987.654-3",
      rut_empleado: "15.321.654-9",
      nombre_empleado: "Sofía Valenzuela",
      fecha_documento: "10/10/2024",
      monto_total: "3200000"
    },
    version: 1,
    is_archived: false,
    created_at: "2024-10-10T09:00:00Z"
  },
  {
    id: "d0000000-0000-0000-0000-000000000202",
    tenant_id: "b0000000-0000-0000-0000-000000000002", // Beta
    title: "Factura Licencia AWS Hosting - Mayo.pdf",
    file_url: "#",
    file_size: 98450,
    file_type: "pdf",
    category: "factura",
    ocr_status: "completed",
    extracted_text: "FACTURA ELECTRÓNICA N° 4512. PROVEEDOR: MAQUINARIAS RENT-A-CAR S.A. RUT 96.987.654-3. CLIENTE: Tecnología Beta. NETO: $450.000. TOTAL: $535.500.",
    metadata: {
      rut_empresa: "96.987.654-3",
      fecha_documento: "18/05/2026",
      monto_total: "535500"
    },
    version: 1,
    is_archived: false,
    created_at: "2026-05-18T14:45:00Z"
  }
];

const getLocalStorageDB = () => {
  const docs = localStorage.getItem('nubcore_sim_documents');
  if (!docs) {
    localStorage.setItem('nubcore_sim_documents', JSON.stringify(MOCK_DOCS_INITIAL));
    return MOCK_DOCS_INITIAL;
  }
  return JSON.parse(docs);
};

const saveLocalStorageDB = (data: any) => {
  localStorage.setItem('nubcore_sim_documents', JSON.stringify(data));
};

const getLocalStorageLogs = () => {
  const logs = localStorage.getItem('nubcore_sim_logs');
  if (!logs) {
    const initialLogs = [
      { id: "1", action: "LOGIN", resource_type: "USER", resource_id: "system", ip_address: "192.168.1.5", user_agent: "Chrome / Windows", created_at: new Date().toISOString() }
    ];
    localStorage.setItem('nubcore_sim_logs', JSON.stringify(initialLogs));
    return initialLogs;
  }
  return JSON.parse(logs);
};

const addLocalStorageLog = (action: string, resType: string, resId: string) => {
  const logs = getLocalStorageLogs();
  const newLog = {
    id: Math.random().toString(),
    user_detail: JSON.parse(localStorage.getItem('nubcore_user') || '{}'),
    action,
    resource_type: resType,
    resource_id: resId,
    ip_address: "192.168.1.25",
    user_agent: navigator.userAgent,
    created_at: new Date().toISOString()
  };
  localStorage.setItem('nubcore_sim_logs', JSON.stringify([newLog, ...logs]));
};

// ========================================================
// SERVICIO DUAL DE API (CLIENTE API NUBCORE)
// ========================================================

export const documentAPI = {
  list: async (searchParams?: { q?: string; category?: string }) => {
    const token = localStorage.getItem('nubcore_token');
    const isSim = localStorage.getItem('nubcore_simulation_mode') === 'true';

    if (isSim || !token) {
      // Retornar datos simulados
      const user = JSON.parse(localStorage.getItem('nubcore_user') || '{}');
      const tenantId = user.tenant?.id;
      let db = getLocalStorageDB().filter((d: any) => d.tenant_id === tenantId && !d.is_archived);

      // Segregación por Rol: Trabajadores solo ven sus propios documentos
      if (user.role === 'employee') {
        const nameKey = (user.first_name || '').toLowerCase();
        db = db.filter((d: any) => {
          const docTitle = (d.title || '').toLowerCase();
          const docText = (d.extracted_text || '').toLowerCase();
          const metaName = (d.metadata?.nombre_empleado || '').toLowerCase();
          return docTitle.includes(nameKey) || docText.includes(nameKey) || metaName.includes(nameKey);
        });
      }

      if (searchParams?.category) {
        db = db.filter((d: any) => d.category === searchParams.category);
      }
      if (searchParams?.q) {
        const query = searchParams.q.toLowerCase();
        db = db.filter((d: any) => 
          d.title.toLowerCase().includes(query) || 
          d.extracted_text.toLowerCase().includes(query)
        );
      }
      return { data: db };
    }

    // Petición real al backend Django
    return axiosInstance.get('/documents/', { params: searchParams });
  },

  create: async (formData: FormData) => {
    const token = localStorage.getItem('nubcore_token');
    const isSim = localStorage.getItem('nubcore_simulation_mode') === 'true';

    if (isSim || !token) {
      const user = JSON.parse(localStorage.getItem('nubcore_user') || '{}');
      const tenantId = user.tenant?.id;
      const file = formData.get('file') as File;
      const title = (formData.get('title') as string) || file.name;
      
      const newDocId = `d_${Math.random().toString(36).substr(2, 9)}`;
      
      // Heurística de clasificación simulada para el Frontend
      const nameLower = file.name.toLowerCase();
      let category = 'documentacion_administrativa';
      let text = `Este es un documento corporativo general subido. Nombre: ${file.name}`;
      let metadata: any = { fecha_documento: new Date().toLocaleDateString() };

      if (nameLower.includes("liquidacion") || nameLower.includes("sueldo")) {
        category = "liquidacion";
        text = `LIQUIDACIÓN DE SUELDO - MES DE MAYO 2026.\nEmpresa: ${user.tenant?.name}\nTrabajador: ${user.first_name} ${user.last_name}\nRUT: 18.456.789-0\nAlcance líquido: $820.000`;
        metadata = {
          rut_empresa: user.tenant?.tax_id,
          nombre_empleado: `${user.first_name} ${user.last_name}`,
          fecha_documento: "30/05/2026",
          monto_total: "820000"
        };
      } else if (nameLower.includes("contrato") || nameLower.includes("anexo")) {
        category = "contrato";
        text = `CONTRATO DE TRABAJO INDEFINIDO.\nEn Santiago, entre ${user.tenant?.name} y don ${user.first_name} ${user.last_name}.\nCargo contratado: Profesional Técnico. Sueldo: $1.200.000.`;
        metadata = {
          rut_empresa: user.tenant?.tax_id,
          nombre_empleado: `${user.first_name} ${user.last_name}`,
          fecha_documento: new Date().toLocaleDateString(),
          monto_total: "1200000"
        };
      } else if (nameLower.includes("licencia") || nameLower.includes("certificado")) {
        category = "licencia_medica";
        text = `CERTIFICADO MÉDICO DE REPOSO.\nPaciente: ${user.first_name} ${user.last_name}.\nReposo por 7 días a contar de hoy.`;
        metadata = {
          nombre_empleado: `${user.first_name} ${user.last_name}`,
          fecha_documento: new Date().toLocaleDateString()
        };
      } else if (nameLower.includes("epp") || nameLower.includes("casco")) {
        category = "epp";
        text = `ENTREGA DE EQUIPO DE PROTECCIÓN.\nRecibe: ${user.first_name} ${user.last_name}\nEpps: Casco, Zapatos.`;
        metadata = { nombre_empleado: `${user.first_name} ${user.last_name}` };
      } else if (nameLower.includes("factura") || nameLower.includes("boleta")) {
        category = "factura";
        text = `FACTURA COMERCIAL ELECTRÓNICA.\nProveedor: Servicios Digitales SpA.\nTotal: $120.000.`;
        metadata = { monto_total: "120000" };
      }

      const newDoc = {
        id: newDocId,
        tenant_id: tenantId,
        title,
        file_url: URL.createObjectURL(file), // Generar URL local para previsualizar en el navegador
        file_size: file.size,
        file_type: file.name.split('.').pop() || 'pdf',
        category,
        ocr_status: "completed",
        extracted_text: text,
        metadata,
        version: 1,
        is_archived: false,
        created_at: new Date().toISOString()
      };

      const db = getLocalStorageDB();
      db.unshift(newDoc);
      saveLocalStorageDB(db);
      
      addLocalStorageLog("CREATE", "DOCUMENT", newDocId);

      return { data: newDoc };
    }

    return axiosInstance.post('/documents/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  delete: async (id: string) => {
    const token = localStorage.getItem('nubcore_token');
    const isSim = localStorage.getItem('nubcore_simulation_mode') === 'true';

    if (isSim || !token) {
      const db = getLocalStorageDB();
      const docIndex = db.findIndex((d: any) => d.id === id);
      if (docIndex > -1) {
        db[docIndex].is_archived = true;
        saveLocalStorageDB(db);
        addLocalStorageLog("DELETE", "DOCUMENT", id);
      }
      return { data: { success: true } };
    }

    return axiosInstance.delete(`/documents/${id}/`);
  },

  uploadNewVersion: async (id: string, formData: FormData) => {
    const token = localStorage.getItem('nubcore_token');
    const isSim = localStorage.getItem('nubcore_simulation_mode') === 'true';

    if (isSim || !token) {
      const file = formData.get('file') as File;
      const db = getLocalStorageDB();
      const docIndex = db.findIndex((d: any) => d.id === id);
      
      if (docIndex > -1) {
        db[docIndex].version += 1;
        db[docIndex].file_size = file.size;
        db[docIndex].title = file.name;
        db[docIndex].file_url = URL.createObjectURL(file);
        db[docIndex].ocr_status = "completed";
        saveLocalStorageDB(db);
        addLocalStorageLog("UPLOAD_NEW_VERSION", "DOCUMENT", id);
        return { data: db[docIndex] };
      }
      throw new Error("Documento no encontrado");
    }

    return axiosInstance.post(`/documents/${id}/new-version/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

export const dashboardAPI = {
  getKPIs: async () => {
    const token = localStorage.getItem('nubcore_token');
    const isSim = localStorage.getItem('nubcore_simulation_mode') === 'true';

    if (isSim || !token) {
      const user = JSON.parse(localStorage.getItem('nubcore_user') || '{}');
      const tenantId = user.tenant?.id;
      let db = getLocalStorageDB().filter((d: any) => d.tenant_id === tenantId && !d.is_archived);
      
      // Filtrar por rol 'employee' para ver métricas personales
      if (user.role === 'employee') {
        const nameKey = (user.first_name || '').toLowerCase();
        db = db.filter((d: any) => {
          const docTitle = (d.title || '').toLowerCase();
          const docText = (d.extracted_text || '').toLowerCase();
          const metaName = (d.metadata?.nombre_empleado || '').toLowerCase();
          return docTitle.includes(nameKey) || docText.includes(nameKey) || metaName.includes(nameKey);
        });
      }
      
      const totalDocs = db.length;
      const totalSize = db.reduce((acc: number, cur: any) => acc + cur.file_size, 0);
      const pendingOcr = db.filter((d: any) => d.ocr_status !== 'completed').length;
      
      // Agrupar por categoría
      const categories: any = {};
      db.forEach((d: any) => {
        categories[d.category] = (categories[d.category] || 0) + 1;
      });

      // Logs de auditoría de simulación
      let recentActivity = getLocalStorageLogs()
        .filter((l: any) => !l.user_detail || l.user_detail.tenant?.id === tenantId);
        
      if (user.role === 'employee') {
        recentActivity = recentActivity.filter((l: any) => l.user_detail && l.user_detail.email === user.email);
      }
      recentActivity = recentActivity.slice(0, 5);

      return {
        data: {
          kpis: {
            total_documents: totalDocs,
            total_size_bytes: totalSize,
            pending_ocr: pendingOcr,
            active_users: user.role === 'admin' ? 3 : 1
          },
          categories_distribution: categories,
          monthly_uploads: [
            { month: "Ene 2026", count: 2 },
            { month: "Feb 2026", count: 4 },
            { month: "Mar 2026", count: 3 },
            { month: "Abr 2026", count: 5 },
            { month: "May 2026", count: totalDocs }
          ],
          recent_activity: recentActivity
        }
      };
    }

    return axiosInstance.get('/dashboard/');
  }
};

export const auditAPI = {
  listLogs: async () => {
    const token = localStorage.getItem('nubcore_token');
    const isSim = localStorage.getItem('nubcore_simulation_mode') === 'true';

    if (isSim || !token) {
      const user = JSON.parse(localStorage.getItem('nubcore_user') || '{}');
      const tenantId = user.tenant?.id;
      const logs = getLocalStorageLogs().filter((l: any) => !l.user_detail || l.user_detail.tenant?.id === tenantId);
      return { data: logs };
    }

    return axiosInstance.get('/documents/audit-logs/');
  }
};

const SIMULATED_LOGINS: Record<string, any> = {
  'carlos.admin@alfa.cl': {
    id: "u1111111-1111-1111-1111-111111111111",
    email: "carlos.admin@alfa.cl",
    first_name: "Carlos",
    last_name: "González",
    role: 'admin',
    tenant: {
      id: "a0000000-0000-0000-0000-000000000001",
      name: "Constructora Alfa S.A.",
      tax_id: "76.123.456-K"
    }
  },
  'juan.perez@alfa.cl': {
    id: "u1111111-1111-1111-1111-111111111112",
    email: "juan.perez@alfa.cl",
    first_name: "Juan",
    last_name: "Pérez",
    role: 'employee',
    tenant: {
      id: "a0000000-0000-0000-0000-000000000001",
      name: "Constructora Alfa S.A.",
      tax_id: "76.123.456-K"
    }
  },
  'maria.hr@alfa.cl': {
    id: "u1111111-1111-1111-1111-111111111113",
    email: "maria.hr@alfa.cl",
    first_name: "María",
    last_name: "Rosas",
    role: 'hr',
    tenant: {
      id: "a0000000-0000-0000-0000-000000000001",
      name: "Constructora Alfa S.A.",
      tax_id: "76.123.456-K"
    }
  },
  'sofia.ceo@beta.com': {
    id: "u2222222-2222-2222-2222-222222222221",
    email: "sofia.ceo@beta.com",
    first_name: "Sofía",
    last_name: "Valenzuela",
    role: 'admin',
    tenant: {
      id: "b0000000-0000-0000-0000-000000000002",
      name: "Tecnología Beta Ltda.",
      tax_id: "78.987.654-3"
    }
  },
  'diego.dev@beta.com': {
    id: "u2222222-2222-2222-2222-222222222222",
    email: "diego.dev@beta.com",
    first_name: "Diego",
    last_name: "Mendoza",
    role: 'employee',
    tenant: {
      id: "b0000000-0000-0000-0000-000000000002",
      name: "Tecnología Beta Ltda.",
      tax_id: "78.987.654-3"
    }
  },
  'patricia.hr@beta.com': {
    id: "u2222222-2222-2222-2222-222222222223",
    email: "patricia.hr@beta.com",
    first_name: "Patricia",
    last_name: "Soto",
    role: 'hr',
    tenant: {
      id: "b0000000-0000-0000-0000-000000000002",
      name: "Tecnología Beta Ltda.",
      tax_id: "78.987.654-3"
    }
  }
};

export const authAPI = {
  login: async (credentials: any) => {
    const emailKey = (credentials.email || '').toLowerCase();
    if (SIMULATED_LOGINS[emailKey]) {
      const simulatedUser = SIMULATED_LOGINS[emailKey];
      const simulatedToken = `simulated-jwt-token-key-${simulatedUser.tenant.id}-${simulatedUser.role}`;
      return {
        data: {
          access: simulatedToken,
          user: simulatedUser
        }
      };
    }
    
    // Intenta usar la conexión al backend si no coincide con un email de demo
    try {
      return await axiosInstance.post('/auth/login/', credentials);
    } catch (err) {
      console.warn("Backend offline, login fallback failed.");
      throw err;
    }
  },
  register: async (registerData: any) => {
    return axiosInstance.post('/auth/register/', registerData);
  },
  getProfile: async () => {
    return axiosInstance.get('/auth/profile/');
  },
  listUsers: async () => {
    const token = localStorage.getItem('nubcore_token');
    const isSim = localStorage.getItem('nubcore_simulation_mode') === 'true';

    if (isSim || !token) {
      const user = JSON.parse(localStorage.getItem('nubcore_user') || '{}');
      const tenantId = user.tenant?.id || 'default';
      const companyKey = user.tenant?.name.toLowerCase().replace(/\s/g, '').replace(/\./g, '') || 'company';
      
      const cachedUsersKey = `nubcore_sim_users_${tenantId}`;
      const cachedUsersStr = localStorage.getItem(cachedUsersKey);
      if (cachedUsersStr) {
        return { data: JSON.parse(cachedUsersStr) };
      }
      
      const simulatedUsers = [
        { id: "u-1", email: `admin@${companyKey}.com`, first_name: "Administrador", last_name: "Principal", role: "admin" },
        { id: "u-2", email: `empleado1@${companyKey}.com`, first_name: "Juan", last_name: "Pérez", role: "employee" },
        { id: "u-3", email: `hr@${companyKey}.com`, first_name: "Patricia", last_name: "Soto", role: "hr" }
      ];
      localStorage.setItem(cachedUsersKey, JSON.stringify(simulatedUsers));
      return { data: simulatedUsers };
    }

    return axiosInstance.get('/auth/users/');
  },
  createUser: async (userData: any) => {
    const token = localStorage.getItem('nubcore_token');
    const isSim = localStorage.getItem('nubcore_simulation_mode') === 'true';

    if (isSim || !token) {
      const user = JSON.parse(localStorage.getItem('nubcore_user') || '{}');
      const tenantId = user.tenant?.id || 'default';
      const companyKey = user.tenant?.name.toLowerCase().replace(/\s/g, '').replace(/\./g, '') || 'company';
      
      const newUser = {
        id: `u-${Math.random().toString(36).substr(2, 9)}`,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: userData.role
      };
      
      const cachedUsersKey = `nubcore_sim_users_${tenantId}`;
      const cachedUsersStr = localStorage.getItem(cachedUsersKey);
      let list = cachedUsersStr ? JSON.parse(cachedUsersStr) : [
        { id: "u-1", email: `admin@${companyKey}.com`, first_name: "Administrador", last_name: "Principal", role: "admin" },
        { id: "u-2", email: `empleado1@${companyKey}.com`, first_name: "Juan", last_name: "Pérez", role: "employee" },
        { id: "u-3", email: `hr@${companyKey}.com`, first_name: "Patricia", last_name: "Soto", role: "hr" }
      ];
      
      list.push(newUser);
      localStorage.setItem(cachedUsersKey, JSON.stringify(list));
      
      addLocalStorageLog("CREATE", "USER", newUser.id);
      
      return { data: newUser };
    }

    return axiosInstance.post('/auth/users/', userData);
  }

};
