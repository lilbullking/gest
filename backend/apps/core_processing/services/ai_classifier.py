import re

def classify_and_extract(text, filename=""):
    """
    Analiza el texto de un documento (y su nombre de archivo) para clasificarlo
    en una categoría empresarial y extraer metadatos estructurados (RUTs, nombres, montos, fechas).
    """
    text_lower = text.lower()
    filename_lower = filename.lower()
    
    # 1. Clasificación por reglas léxicas e IA básica
    category = 'documentacion_administrativa'
    
    if any(k in text_lower or k in filename_lower for k in ["liquidacion", "sueldo", "remuneracion", "pago de haberes"]):
        category = 'liquidacion'
    elif any(k in text_lower or k in filename_lower for k in ["contrato", "anexo", "indefinido", "faena"]):
        category = 'contrato'
    elif any(k in text_lower or k in filename_lower for k in ["licencia", "certificado medico", "reposo medico", "mutual"]):
        category = 'licencia_medica'
    elif any(k in text_lower or k in filename_lower for k in ["epp", "equipos de proteccion", "casco", "zapatos de seguridad"]):
        category = 'epp'
    elif any(k in text_lower or k in filename_lower for k in ["factura", "invoice", "boleta", "neto", "iva"]):
        category = 'factura'
    elif any(k in text_lower or k in filename_lower for k in ["cotizacion", "presupuesto", "cotizar"]):
        category = 'cotizacion'
        
    # 2. Extracción de Metadatos
    metadata = {}
    
    # Buscar RUTs chilenos o identificadores (formatos: XX.XXX.XXX-X o XXXXXXXX-X)
    rut_patterns = re.findall(r'\b\d{1,2}(?:\.?\d{3}){2}-?[\dkK]\b', text)
    if rut_patterns:
        metadata['ruts_detectados'] = list(set(rut_patterns))
        
        # Diferenciar RUT del Empleado y del Empleador según contexto léxico cercano
        for r in rut_patterns:
            pos = text.find(r)
            # Analizar el contexto (40 caracteres anteriores)
            context = text[max(0, pos-40):pos].lower()
            if any(k in context for k in ["trabajador", "empleado", "don", "rut:", "afiliado"]):
                metadata['rut_empleado'] = r
            elif any(k in context for k in ["empresa", "proveedor", "cliente", "rut empresa", "razon social"]):
                metadata['rut_empresa'] = r
                
        # Asignaciones de respaldo si fallan las heurísticas de contexto
        if 'rut_empleado' not in metadata and len(rut_patterns) > 0:
            metadata['rut_empleado'] = rut_patterns[-1]
        if 'rut_empresa' not in metadata and len(rut_patterns) > 0:
            metadata['rut_empresa'] = rut_patterns[0]

    # Extraer Nombre del Trabajador / Persona
    name_match = re.search(r'(?:trabajador|don|empleado|se\u00f1or(?:ita)?)\s*(?:don)?\s*([A-Za-z\u00c0-\u00ff\s]{3,35})(?:\s*,\s*RUT|\s*RUT|\n)', text, re.IGNORECASE)
    if name_match:
        metadata['nombre_empleado'] = name_match.group(1).strip()
    else:
        # Fallback específico para Liquidación
        name_match_liq = re.search(r'TRABAJADOR:\s*([A-Za-z\u00c0-\u00ff\s]{3,35})', text)
        if name_match_liq:
            metadata['nombre_empleado'] = name_match_liq.group(1).strip()

    # Extraer Fechas (formato numérico o textual)
    dates = re.findall(r'\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b', text)
    text_dates = re.findall(r'\b\d{1,2}\s+de\s+[a-zA-Z\u00c0-\u00ff]+\s+de\s+\d{4}\b', text, re.IGNORECASE)
    all_dates = dates + text_dates
    if all_dates:
        metadata['fecha_documento'] = all_dates[0]
        if len(all_dates) > 1:
            # Normalmente la última fecha detectada suele ser el vencimiento
            metadata['fecha_vencimiento'] = all_dates[-1]

    # Extraer Montos (especialmente para Facturas, Boletas o Liquidaciones)
    amount_match = re.search(r'(?:total|liquido|pagar|neto|total facturado)[\s\:\$]*(\d+(?:\.\d{3})*)', text, re.IGNORECASE)
    if amount_match:
        metadata['monto_total'] = amount_match.group(1).replace('.', '')

    return category, metadata
