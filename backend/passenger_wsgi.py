import os
import sys

# Agregar la ruta del backend al PATH del sistema
sys.path.insert(0, os.path.dirname(__file__))

# Configurar variables de entorno para Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "nubcore_project.settings")

# Inicializar pymysql para compatibilidad con mysqlclient
try:
    import pymysql
    pymysql.install_as_MySQLdb()
except ImportError:
    pass

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
