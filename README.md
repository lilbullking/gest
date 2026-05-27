# Nubcore: Plataforma Inteligente de Gestión Documental Empresarial (Multi-tenant)

Nubcore es una plataforma SaaS moderna y segura diseñada para PyMEs. Permite centralizar, digitalizar y clasificar de forma inteligente la documentación laboral (contratos, liquidaciones de sueldo, certificados médicos, EPP) mediante un motor portátil de OCR e Inteligencia Artificial basada en heurísticas léxicas.

Este proyecto ha sido estructurado y optimizado con un enfoque pragmático para funcionar tanto en entornos de desarrollo local dockerizados como en entornos de **Hosting Compartido (DirectAdmin / cPanel)** a través de Passenger WSGI y bases de datos MySQL.

---

## 📌 CONTENIDO DEL PROYECTO
1. [Arquitectura del Sistema](#1-arquitectura-del-sistema)
2. [Modelo de Base de Datos (MySQL)](#2-modelo-de-base-de-datos-mysql)
3. [Guía de Instalación y Ejecución Local](#3-guía-de-instalación-y-ejecución-local)
4. [Estructura del Proyecto](#4-estructura-del-proyecto)
5. [Documentación de la API (Endpoints)](#5-documentación-de-la-api-endpoints)
6. [Manual de Despliegue en DirectAdmin (Hosting Compartido)](#6-manual-de-despliegue-en-directadmin-hosting-compartido)
7. [Manual de Usuario Corto](#7-manual-de-usuario-corto)

---

## 1. ARQUITECTURA DEL SISTEMA

La arquitectura de Nubcore está completamente desacoplada para garantizar que el Frontend pueda compilarse de manera estática (SPA) e interactuar de forma segura con la API del Backend.

### Componentes de la Arquitectura:
- **Frontend SPA (React + Vite + TypeScript + Tailwind CSS):** Se compila a HTML, CSS y JS puro. Se despliega en el directorio raíz `public_html` del hosting y se ejecuta de forma nativa en el navegador del cliente sin requerir un demonio Node.js activo en producción.
- **Backend API (Django REST Framework):** Corre en el servidor a través de Passenger WSGI. Administra la lógica de negocio, control de roles (RBAC), registro de logs de auditoría e ingesta de documentos.
- **Motor de Ingesta Documental Portátil (OCR & IA Heurística):**
  - **Lector Nativo de PDF:** Extrae texto directo de PDFs digitales utilizando `pdfplumber` de forma rápida y sin binarios del sistema.
  - **Filtro OCR & Simulador:** En caso de imágenes o PDFs escaneados, si el binario de Tesseract no está instalado en el hosting, utiliza un sistema de simulación por coincidencia léxica de nombres de archivos para emular la extracción e indexación de metadatos (RUTs, nombres, montos, fechas).
- **Aislamiento Multi-tenant:** Reforzado mediante `TenantMiddleware` y `TenantManager` en Django, asegurando que las consultas SQL de base de datos se filtren forzosamente a través del `tenant_id` del usuario en sesión.

---

## 2. MODELO DE BASE DE DATOS (MYSQL)

El modelo utiliza UUIDs a nivel de base de datos y llaves foráneas para mantener la consistencia relacional e índices en las columnas de mayor consulta para asegurar rendimiento y escalabilidad.

```sql
-- Tabla de Empresas / Tenants
CREATE TABLE tenants (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tax_id VARCHAR(50) UNIQUE NOT NULL, -- Ej. RUT en Chile
    domain VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de Usuarios
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) NOT NULL DEFAULT 'employee', -- admin, hr, employee, auditor
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de Documentos
CREATE TABLE documents (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36),
    uploaded_by VARCHAR(36),
    title VARCHAR(255) NOT NULL,
    file VARCHAR(512) NOT NULL,
    file_size INT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    category VARCHAR(100) DEFAULT 'unclassified',
    ocr_status VARCHAR(50) DEFAULT 'pending',
    extracted_text LONGTEXT,
    metadata JSON NULL,
    version INT DEFAULT 1,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de Versiones
CREATE TABLE document_versions (
    id VARCHAR(36) PRIMARY KEY,
    document_id VARCHAR(36),
    version INT NOT NULL,
    file VARCHAR(512) NOT NULL,
    file_size INT NOT NULL,
    changed_by VARCHAR(36),
    change_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Logs de Auditoría Inmutables
CREATE TABLE audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36),
    user_id VARCHAR(36),
    action VARCHAR(100) NOT NULL, -- CREATE, READ, UPDATE, DELETE, DOWNLOAD
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(36) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 3. GUÍA DE INSTALACIÓN Y EJECUCIÓN LOCAL

### Opción A: Con Docker Compose (Recomendado para desarrollo MySQL local)
Para levantar la base de datos MySQL, el backend y el frontend en contenedores automáticamente:

1. Asegúrate de tener Docker y Docker Compose instalados.
2. Ejecuta en la raíz del proyecto:
   ```bash
   docker-compose up --build
   ```
3. El frontend estará disponible en `http://localhost:5173` y el backend en `http://localhost:8000`.

### Opción B: Ejecución Manual Local (Sin Docker)

#### Paso 1: Configurar Backend (Django)
1. Entra a la carpeta backend:
   ```bash
   cd backend
   ```
2. Crea e instala dependencias en un entorno virtual (venv):
   ```bash
   python -m venv venv
   # En Windows:
   venv\Scripts\activate
   # En Linux/macOS:
   source venv/bin/activate
   
   pip install -r requirements.txt
   ```
3. Aplica las migraciones locales (usará SQLite por defecto si no detecta variables de entorno de MySQL):
   ```bash
   python manage.py migrate
   ```
4. Inicia el servidor de Django:
   ```bash
   python manage.py runserver
   ```

#### Paso 2: Configurar Frontend (React/Vite)
1. Abre una nueva terminal e ingresa a la carpeta frontend:
   ```bash
   cd frontend
   ```
2. Instala dependencias y corre el servidor de desarrollo de Vite:
   ```bash
   npm install
   npm run dev
   ```
3. Abre en tu navegador `http://localhost:5173`.

---

## 4. ESTRUCTURA DEL PROYECTO

El código sigue las mejores prácticas de **Clean Architecture** estructurado de la siguiente manera:

```
Gest/
│
├── .github/workflows/        # Flujo de CI/CD para GitHub Actions
│   └── deploy.yml
│
├── backend/                  # Proyecto Django REST Framework
│   ├── manage.py
│   ├── passenger_wsgi.py     # Archivo crítico para DirectAdmin / cPanel
│   ├── requirements.txt      # Dependencias pure-Python
│   ├── nubcore_project/      # Configuración de Django (settings, urls)
│   └── apps/                 # Módulos de la aplicación
│       ├── authentication/   # Registro, login, middleware multi-tenant
│       ├── documents/        # CRUD, almacenamiento, historial y auditoría
│       ├── core_processing/  # Motor OCR (pdfplumber) e IA heurística
│       └── dashboard/        # KPIs y analíticas
│
├── frontend/                 # Proyecto React + Vite + TypeScript (para public_html)
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js    # Habilitación de Dark Mode
│   └── src/
│       ├── components/       # Elementos interactivos reutilizables
│       ├── context/          # Estado de Auth y Consola de Simulación
│       ├── services/         # Adaptador API (Axios y simulador localStorage)
│       └── pages/            # Vistas (Dashboard, Gestor, Admin, Login)
│
└── docker-compose.yml        # Orquestación de desarrollo local
```

---

## 5. DOCUMENTACIÓN DE LA API (ENDPOINTS)

Todos los endpoints (excepto Login y Register) requieren la cabecera `Authorization: Bearer <JWT_TOKEN>`.

### Autenticación y Usuarios (`/api/auth/`)
- `POST /register/` (Público): Registra un nuevo Tenant y su primer usuario Administrador.
- `POST /login/` (Público): Retorna el JWT con el rol y el Tenant ID.
- `GET /profile/`: Obtiene la información del usuario autenticado.
- `GET /users/`: Lista los usuarios dentro del mismo Tenant.
- `POST /users/` (Solo Admin): Crea un nuevo usuario en la empresa.

### Gestión Documental (`/api/documents/`)
- `GET /`: Lista los documentos activos en el Tenant. Soporta filtros `?q=buscar` (búsqueda en título o contenido OCR) y `?category=contrato`.
- `POST /`: Sube un archivo e inicia el hilo de OCR en segundo plano.
- `GET /<uuid:id>/`: Muestra los metadatos y el texto OCR del documento.
- `PUT/PATCH /<uuid:id>/`: Edita título o campos del documento.
- `DELETE /<uuid:id>/`: Archiva de forma lógica un documento.
- `POST /<uuid:id>/new-version/`: Sube un nuevo archivo que reemplaza la versión actual.
- `GET /<uuid:id>/versions/`: Retorna el historial de versiones del documento.
- `GET /audit-logs/` (Admin/HR/Auditor): Lista el log inmutable de accesos del Tenant.

### KPIs y Métricas (`/api/dashboard/`)
- `GET /`: Retorna el conteo total de archivos, tamaño de almacenamiento consumido, cantidad de procesos OCR en curso, distribución por categorías y logs recientes.

---

## 6. MANUAL DE DESPLIEGUE EN DIRECTADMIN (HOSTING COMPARTIDO)

### Paso 1: Configurar el Frontend (React SPA)
1. Dentro de la carpeta `/frontend` del proyecto local, compila los archivos estáticos:
   ```bash
   npm run build
   ```
2. Esto generará la carpeta `frontend/dist/`.
3. Sube el contenido completo de `dist/` a la carpeta `public_html/` de tu dominio usando el Gestor de Archivos de DirectAdmin o tu cliente FTP (ej. FileZilla). Esto servirá la interfaz web de inmediato de manera muy veloz.

### Paso 2: Crear la Aplicación Python para el Backend
1. Entra a DirectAdmin y haz clic en **Setup Python App** (o selector de aplicaciones Python).
2. Haz clic en **Create Application**:
   - **Python Version:** Elige 3.9 o superior (3.10 recomendado).
   - **Application root:** Escribe el nombre del directorio fuera de public_html donde guardarás el backend (ej. `nubcore_api`).
   - **Application URL:** Configura el subdominio o subcarpeta donde vivirá la API (ej. `api.tudominio.com` o `tudominio.com/api`).
   - **Application startup file:** Deja en blanco o escribe `passenger_wsgi.py`.
   - **Application entry point:** Escribe `application`.
3. Haz clic en **Create**.

### Paso 3: Subir los Archivos del Backend e Instalar Dependencias
1. Sube el contenido de la carpeta `/backend` local al directorio configurado como root del backend en el servidor (ej. `/home/usuario/nubcore_api`).
2. Asegúrate de incluir el archivo `passenger_wsgi.py` de la raíz del backend.
3. Vuelve a **Setup Python App** en DirectAdmin, haz clic en **Edit Application**:
   - En la sección **Configuration files**, escribe `requirements.txt` y haz clic en **Add**.
   - Haz clic en **Run Pip Install** y selecciona `requirements.txt`. El hosting instalará de forma virtual todas las librerías necesarias.

### Paso 4: Crear la Base de Datos MySQL
1. En DirectAdmin, ve a **MySQL Management** y crea una base de datos y usuario.
2. Anota los datos de conexión.
3. En la sección **Environment Variables** de la aplicación Python en DirectAdmin, añade las siguientes variables:
   - `DB_NAME`: Nombre de tu base de datos creada.
   - `DB_USER`: Usuario de la base de datos.
   - `DB_PASSWORD`: Contraseña asignada.
   - `DB_HOST`: `127.0.0.1` o `localhost`.
   - `DB_PORT`: `3306`.
   - `DJANGO_DEBUG`: `False`.
   - `DJANGO_SECRET_KEY`: Una cadena de caracteres segura y secreta.
4. Haz clic en **Save** y luego en **Restart** para recargar la aplicación Python.
5. Ejecuta las migraciones escribiendo en la terminal SSH del hosting o el comando del panel:
   ```bash
   python manage.py migrate
   ```

---

## 7. MANUAL DE USUARIO CORTO

1. **Ingreso y Selección de Empresa:** Al acceder al portal, puedes registrar tu empresa o utilizar la **Consola de Evaluación Rápida** haciendo un clic sobre el perfil de simulación (ej. "Carlos González - Admin de Constructora Alfa"). Esto cargará un JWT simulado para visualizar datos reales de muestra en la interfaz.
2. **Subir Documento:**
   - En el menú lateral, selecciona **Gestor Documental**.
   - Arrastra un archivo PDF o imagen a la zona punteada.
   - Si arrastras un archivo con la palabra "liquidacion" o "contrato" en el nombre, el sistema detectará el archivo y lo clasificará de inmediato, extrayendo metadatos como RUTs, nombres y montos para visualizarlos de forma estructurada.
3. **Búsqueda Avanzada:** Escribe cualquier palabra contenida dentro del archivo (por ejemplo, "Santiago" o "haberes") en la barra de búsqueda superior. El buscador filtrará de forma instantánea todos los documentos que contengan esa coincidencia de texto leída por el OCR.
4. **Ver Historial de Cambios:** Haz clic sobre un documento de la tabla para abrir el panel lateral de detalles. Si posees privilegios de administrador o RRHH, podrás cargar una nueva versión del archivo indicando la justificación del cambio, lo que incrementará el número de versión (v1 -> v2) manteniendo a salvo el historial anterior para auditorías.
5. **Panel de Auditoría:** En el menú lateral, selecciona **Administración**. Allí verás los logs inmutables con las direcciones IP, navegadores utilizados y las acciones realizadas por cada miembro de tu empresa.
