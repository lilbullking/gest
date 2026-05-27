FROM python:3.10-slim

# Instalar dependencias esenciales del sistema operativo
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    pkg-config \
    default-libmysqlclient-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar e instalar requerimientos primero para aprovechar la caché de capas Docker
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código del proyecto Django
COPY . /app/

# Exponer el puerto del servidor de desarrollo de Django
EXPOSE 8000

# Comando por defecto para iniciar la aplicación
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
