const fs = require('fs');
const path = require('path');

function escapeXml(unsafe) {
  if (unsafe === undefined || unsafe === null) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function makeParagraph(text, options = {}) {
  const {
    style = 'Normal',
    align = 'left',
    bold = false,
    italic = false,
    color = '2C3E50',
    size = 22,
    spaceBefore = 0,
    spaceAfter = 120,
    lineSpacing = 276,
    bullet = false,
    pageBreakBefore = false
  } = options;

  let pPr = `<w:pPr>`;
  if (style) pPr += `<w:pStyle w:val="${style}"/>`;
  if (pageBreakBefore) pPr += `<w:pageBreakBefore/>`;
  if (align && align !== 'left') pPr += `<w:jc w:val="${align}"/>`;
  pPr += `<w:spacing w:before="${spaceBefore}" w:after="${spaceAfter}" w:line="${lineSpacing}" w:lineRule="auto"/>`;
  if (bullet) {
    pPr += `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>`;
  }
  pPr += `</w:pPr>`;

  let runsXml = '';
  const parts = String(text).split(/(\*\*.*?\*\*|\*.*?\*)/g);
  parts.forEach(part => {
    if (!part) return;
    let partBold = bold;
    let partItalic = italic;
    let cleanText = part;

    if (part.startsWith('**') && part.endsWith('**')) {
      partBold = true;
      cleanText = part.slice(2, -2);
    } else if (part.startsWith('*') && part.endsWith('*')) {
      partItalic = true;
      cleanText = part.slice(1, -1);
    }

    let rPr = `<w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>`;
    if (partBold) rPr += `<w:b/><w:bCs/>`;
    if (partItalic) rPr += `<w:i/><w:iCs/>`;
    if (color) rPr += `<w:color w:val="${color}"/>`;
    rPr += `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`;
    rPr += `</w:rPr>`;

    runsXml += `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(cleanText)}</w:t></w:r>`;
  });

  return `<w:p>${pPr}${runsXml}</w:p>`;
}

function makeHeading1(title) {
  return makeParagraph(title, {
    style: 'Ttulo1',
    bold: true,
    size: 28,
    color: '13294B',
    spaceBefore: 320,
    spaceAfter: 140
  });
}

function makeHeading2(title) {
  return makeParagraph(title, {
    style: 'Ttulo2',
    bold: true,
    size: 24,
    color: '1E3A8A',
    spaceBefore: 240,
    spaceAfter: 100
  });
}

function makeHeading3(title) {
  return makeParagraph(title, {
    style: 'Ttulo3',
    bold: true,
    size: 22,
    color: '2563EB',
    spaceBefore: 180,
    spaceAfter: 80
  });
}

function makeCallout(text, label = 'NOTA OPERATIVA') {
  return `
  <w:tbl>
    <w:tblPr>
      <w:tblW w:w="9360" w:type="dxa"/>
      <w:tblBorders>
        <w:top w:val="none"/>
        <w:left w:val="single" w:sz="24" w:space="0" w:color="13294B"/>
        <w:bottom w:val="none"/>
        <w:right w:val="none"/>
        <w:insideH w:val="none"/>
        <w:insideV w:val="none"/>
      </w:tblBorders>
      <w:tblCellMar>
        <w:top w:w="120" w:type="dxa"/>
        <w:left w:w="180" w:type="dxa"/>
        <w:bottom w:w="120" w:type="dxa"/>
        <w:right w:w="180" w:type="dxa"/>
      </w:tblCellMar>
    </w:tblPr>
    <w:tr>
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="9360" w:type="dxa"/>
          <w:shd w:val="clear" w:color="auto" w:fill="F0F4F8"/>
        </w:tcPr>
        ${makeParagraph(`**${label}:** ${text}`, { size: 21, color: '13294B', spaceBefore: 60, spaceAfter: 60 })}
      </w:tc>
    </w:tr>
  </w:tbl>
  `;
}

function makeTable(headers, rows, colWidths = []) {
  const totalWidth = 9360;
  const numCols = headers.length;
  const widths = colWidths.length === numCols ? colWidths : Array(numCols).fill(Math.floor(totalWidth / numCols));

  let tblGridXml = '<w:tblGrid>' + widths.map(w => `<w:gridCol w:w="${w}"/>`).join('') + '</w:tblGrid>';

  let headerRowXml = '<w:tr><w:trPr><w:tblHeader/></w:trPr>';
  headers.forEach((h, idx) => {
    headerRowXml += `
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="${widths[idx]}" w:type="dxa"/>
          <w:shd w:val="clear" w:color="auto" w:fill="13294B"/>
          <w:tcMar>
            <w:top w:w="120" w:type="dxa"/>
            <w:left w:w="140" w:type="dxa"/>
            <w:bottom w:w="120" w:type="dxa"/>
            <w:right w:w="140" w:type="dxa"/>
          </w:tcMar>
        </w:tcPr>
        ${makeParagraph(h, { bold: true, color: 'FFFFFF', size: 19, align: 'center', spaceBefore: 40, spaceAfter: 40 })}
      </w:tc>
    `;
  });
  headerRowXml += '</w:tr>';

  let rowsXml = '';
  rows.forEach((row, rIdx) => {
    const bgFill = rIdx % 2 === 1 ? 'F4F6F8' : 'FFFFFF';
    rowsXml += '<w:tr>';
    row.forEach((cell, cIdx) => {
      const isCenter = cIdx === 0 || headers[cIdx].includes('ID') || headers[cIdx].includes('Código') || headers[cIdx].includes('Tipo') || headers[cIdx].includes('Prioridad') || headers[cIdx].includes('Fase') || headers[cIdx].includes('Semana');
      const isRight = cell.startsWith('$') || (!isNaN(cell.replace(/[$.,% -]/g, '')) && cell.length < 15 && !cell.includes('/'));
      const align = isCenter ? 'center' : (isRight ? 'right' : 'left');

      rowsXml += `
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="${widths[cIdx]}" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="${bgFill}"/>
            <w:tcMar>
              <w:top w:w="90" w:type="dxa"/>
              <w:left w:w="110" w:type="dxa"/>
              <w:bottom w:w="90" w:type="dxa"/>
              <w:right w:w="110" w:type="dxa"/>
            </w:tcMar>
          </w:tcPr>
          ${makeParagraph(cell, { size: 18, align, spaceBefore: 25, spaceAfter: 25 })}
        </w:tc>
      `;
    });
    rowsXml += '</w:tr>';
  });

  return `
  <w:tbl>
    <w:tblPr>
      <w:tblW w:w="9360" w:type="dxa"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="DDE4EA"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="DDE4EA"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="DDE4EA"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="DDE4EA"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E8EDF2"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E8EDF2"/>
      </w:tblBorders>
    </w:tblPr>
    ${tblGridXml}
    ${headerRowXml}
    ${rowsXml}
  </w:tbl>
  `;
}

function generateBodyXml() {
  let body = '';

  // ----------------------------------------------------
  // PORTADA INSTITUCIONAL
  // ----------------------------------------------------
  body += makeParagraph('', { spaceBefore: 1200 });
  body += makeParagraph('Politécnico Grancolombiano', { bold: true, size: 28, color: '13294B', align: 'center', spaceAfter: 160 });
  body += makeParagraph('Institución Universitaria', { size: 24, color: '4B6B94', align: 'center', spaceAfter: 1200 });
  body += makeParagraph('Plan de gestión del alcance, el tiempo y los costos para el desarrollo de la aplicación web y PWA de gestión financiera personal y de pareja (Gastotrack)', { bold: true, size: 30, color: '13294B', align: 'center', spaceAfter: 400 });
  body += makeParagraph('Entrega 1: Formulación, Alcance, Cronograma y Gestión de Costos', { bold: true, size: 24, color: '1E3A8A', align: 'center', spaceAfter: 1400 });
  
  body += makeParagraph('Santiago & Equipo de Desarrollo Gastotrack', { bold: true, size: 24, color: '2C3E50', align: 'center', spaceAfter: 160 });
  body += makeParagraph('Facultad de Ingeniería, Diseño e Innovación — Programa de Ingeniería de Sistemas', { size: 22, color: '4B6B94', align: 'center', spaceAfter: 1200 });
  
  body += makeParagraph('Formulación y Evaluación de Proyectos de Software', { size: 22, color: '2C3E50', align: 'center', spaceAfter: 140 });
  body += makeParagraph('Docente Evaluador del Proyecto', { size: 22, color: '4B6B94', align: 'center', spaceAfter: 600 });
  body += makeParagraph('Septiembre – Octubre de 2026\nColombia', { size: 22, color: '2C3E50', align: 'center', spaceAfter: 0 });

  // Section break for cover page
  body += `
    <w:p>
      <w:pPr>
        <w:sectPr w:rsidR="003B51D5">
          <w:pgSz w:w="12240" w:h="15840"/>
          <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
          <w:cols w:space="720"/>
          <w:docGrid w:linePitch="360"/>
        </w:sectPr>
      </w:pPr>
    </w:p>
  `;

  // ----------------------------------------------------
  // RESUMEN EJECUTIVO
  // ----------------------------------------------------
  body += makeHeading1('Resumen Ejecutivo');
  body += makeParagraph('El presente documento técnico y de formulación contiene la primera entrega formal del plan de dirección del proyecto para el desarrollo de **Gastotrack**, una aplicación web progresiva (PWA) de gestión financiera personal y control presupuestal colaborativo en pareja. El proyecto ha sido estructurado siguiendo rigurosamente las buenas prácticas y lineamientos internacionales del *Project Management Institute* (PMI) a través de la guía del **PMBOK**, integrando un enfoque ágil basado en **Scrum** para el desarrollo iterativo e incremental del software.');
  
  body += makeParagraph('Gastotrack responde a la necesidad de centralizar, automatizar y agilizar el registro diario de transacciones monetarias, la supervisión de obligaciones fijas mensuales, el control de compras a cuotas, la carga de comprobantes fotográficos de pago y la construcción de metas de ahorro conjuntas con visualización en tiempo real. La arquitectura tecnológica seleccionada se fundamenta en **Next.js 16 (React 19)** bajo el modelo App Router en el frontend y **Supabase (PostgreSQL)** en el backend, incorporando políticas de seguridad a nivel de fila (*Row Level Security* - RLS) y almacenamiento en *Supabase Storage*.');

  body += makeParagraph('El documento desarrolla de forma exhaustiva los diez componentes obligatorios exigidos: el **Plan de Gestión del Alcance**, la **Estructura de Desglose del Trabajo (EDT)** compuesta por 7 fases y 22 paquetes de trabajo, el **Diccionario de la EDT** con sus fichas técnicas, el **Documento de Requerimientos del Producto** (14 Requerimientos Funcionales, 8 Requerimientos No Funcionales y Matriz de Trazabilidad MTR vinculada al código fuente), el **Plan de Gestión del Tiempo** con estimaciones PERT y CPM, el **Listado Detallado de Actividades**, el **Diagrama de Gantt** automatizado, el **Cronograma del Proyecto** con horizonte temporal del **8 de septiembre al 20 de octubre de 2026** (31 días hábiles / 43 días calendario), el **Plan de Gestión de Costos** con una estimación ascendente de **$48.515.500 COP** (incluyendo el 10% de contingencia) y el **Flujo Neto de Efectivo** proyectado mensual y acumulado. Finalmente, se incluye un instructivo detallado para la interpretación del informe y la operación de la hoja de cálculo complementaria.');

  body += makeParagraph('**Palabras clave:** Gestión de proyectos, PMBOK, EDT, diccionario EDT, requerimientos de software, cronograma Gantt, ruta crítica, gestión de costos, flujo de caja, finanzas personales, presupuesto en pareja, Next.js 16, Supabase, Row Level Security, PWA.', { italic: true, size: 20, color: '4B6B94', spaceBefore: 120, spaceAfter: 200 });

  // ----------------------------------------------------
  // TABLA DE CONTENIDO
  // ----------------------------------------------------
  body += makeHeading1('Tabla de Contenido');
  const tocItems = [
    'Resumen Ejecutivo',
    'Introducción y Planteamiento del Problema',
    'Objetivos del Proyecto (General y Específicos)',
    '1. Plan de la Gestión del Alcance',
    '2. Estructura de Desglose del Trabajo (EDT / WBS)',
    '3. Diccionario de la EDT (22 Paquetes de Trabajo)',
    '4. Documento de Requerimientos del Producto (RF, RNF y Matriz MTR)',
    '5. Plan de la Gestión del Tiempo',
    '6. Listado Detallado de Actividades',
    '7. Diagrama de Gantt del Proyecto y Ruta Crítica',
    '8. Cronograma del Proyecto (08/09/2026 – 20/10/2026)',
    '9. Plan de la Gestión de Costos y Presupuesto Consolidado',
    '10. Flujo Neto de Efectivo Proyectado',
    '11. Instructivo de Lectura y Uso de la Hoja de Cálculo Excel'
  ];
  tocItems.forEach((item, idx) => {
    body += makeParagraph(`${idx + 1}. ${item}`, { spaceBefore: 20, spaceAfter: 40 });
  });

  // ----------------------------------------------------
  // INTRODUCCIÓN
  // ----------------------------------------------------
  body += makeHeading1('Introducción y Planteamiento del Problema');
  body += makeParagraph('El control financiero y la administración del presupuesto en el hogar representan uno de los retos cotidianos más significativos para personas y parejas. En la economía moderna, los gastos no se originan en una sola fuente física ni se concentran en una única fecha: se distribuyen a través de múltiples canales como cuentas de ahorro bancarias, billeteras digitales de uso masivo (Nequi, Daviplata), efectivo y tarjetas de crédito con consumos diferidos a diferentes números de cuotas.');

  body += makeParagraph('Cuando dos personas conviven y deciden compartir sus obligaciones económicas o fijar metas de ahorro comunes, la ausencia de una herramienta centralizada y accesible genera desorden, fricciones y falta de visibilidad. En la práctica habitual se presentan tres escenarios ineficientes:');
  body += makeParagraph('1. **Anotaciones dispersas en libretas o chats de mensajería (WhatsApp)**: Los comprobantes de pago quedan perdidos en galerías de fotos, los saldos deben calcularse manualmente con alto margen de error y no existe trazabilidad histórica estructurada.', { bullet: true });
  body += makeParagraph('2. **Hojas de cálculo tradicionales**: Si bien permiten formular balances, resultan lentas, poco amigables e incómodas de operar desde el teléfono móvil al momento de efectuar un pago en la calle o en un establecimiento comercial.', { bullet: true });
  body += makeParagraph('3. **Aplicaciones comerciales existentes**: En su gran mayoría están diseñadas exclusivamente para uso individual, imponen suscripciones mensuales en moneda extranjera y no contemplan la dinámica de un presupuesto colaborativo de pareja con roles identificados y aportes compartidos.', { bullet: true });

  body += makeParagraph('Para resolver esta problemática nace **Gastotrack**, una aplicación web progresiva (PWA) de alto rendimiento desarrollada con **Next.js 16 (React 19)** y **Supabase**, diseñada para ofrecer una experiencia móvil táctil ultra rápida (captura de gastos en menos de 5 segundos mediante un teclado Numpad especializado), gestión mensual de cuentas con fotos de recibos, registro de compras a cuotas, metas de ahorro con aportes individuales y un panel analítico interactivo con Chart.js.');

  // ----------------------------------------------------
  // OBJETIVOS DEL PROYECTO
  // ----------------------------------------------------
  body += makeHeading1('Objetivos del Proyecto');
  body += makeHeading2('Objetivo General');
  body += makeParagraph('**Desarrollar e implementar** la aplicación web progresiva (PWA) de gestión financiera personal y colaborativa en pareja denominada **Gastotrack**, que permita registrar movimientos monetarios de forma ágil, gestionar cuentas mensuales pendientes y pagadas con carga de comprobantes, coordinar metas de ahorro compartidas y visualizar reportes analíticos de gastos, ejecutando el proyecto en un periodo de 31 días hábiles (43 días calendario) comprendidos entre el **8 de septiembre de 2026** y el **20 de octubre de 2026**, con un presupuesto de **$48.515.500 COP** y bajo estándares de arquitectura limpia, políticas de seguridad RLS y tipado estricto en TypeScript.');

  body += makeHeading2('Objetivos Específicos');
  body += makeParagraph('1. **Levantar y formalizar** los requerimientos funcionales y no funcionales del sistema basados en historias de usuario de finanzas en pareja, priorizándolos bajo el esquema MoSCoW y consolidando la Matriz de Trazabilidad de Requisitos (MTR).', { bullet: true });
  body += makeParagraph('2. **Diseñar** la arquitectura técnica en Next.js 16 App Router, el modelo entidad-relación relacional en PostgreSQL con políticas RLS y los prototipos interactivos móviles en Figma, garantizando una carga inferior a 2 segundos.', { bullet: true });
  body += makeParagraph('3. **Programar e integrar** los módulos centrales de autenticación segura (Supabase Auth), modo pareja con insignias de usuario (Santi y Kate), teclado táctil Numpad, control de cuentas fijas con comprobantes en Supabase Storage, metas de ahorro y gráficas dinámicas con Chart.js.', { bullet: true });
  body += makeParagraph('4. **Implementar y validar** las políticas de seguridad a nivel de base de datos (*Row Level Security*) para garantizar el aislamiento estricto de datos y la privacidad financiera.', { bullet: true });
  body += makeParagraph('5. **Ejecutar** los ciclos de pruebas unitarias, pruebas de seguridad RLS y pruebas de aceptación con usuarios (UAT), asegurando una cobertura superior al 85% en las funciones de cálculo.', { bullet: true });
  body += makeParagraph('6. **Desplegar** la plataforma en ambientes productivos Cloud (Vercel y Supabase Cloud), capacitar a los usuarios finales y realizar la entrega formal del sistema con sus manuales operativos.', { bullet: true });

  // ----------------------------------------------------
  // 1. PLAN DE LA GESTIÓN DEL ALCANCE
  // ----------------------------------------------------
  body += makeHeading1('1. Plan de la Gestión del Alcance');
  body += makeHeading2('1.1 Proceso para Definir el Alcance');
  body += makeParagraph('El alcance de Gastotrack se definió a partir del levantamiento directo de necesidades en el manejo de finanzas individuales y compartidas. Se modelaron historias de usuario detalladas, definiendo para cada funcionalidad sus criterios de aceptación en formato Gherkin (Dado que... Cuando... Entonces...). La priorización se efectuó mediante el método **MoSCoW**, asegurando que todos los requerimientos clasificados como obligatorios (*Must have*) conformen el núcleo operativo de la entrega.');

  body += makeHeading2('1.2 Proceso para Crear la EDT');
  body += makeParagraph('La Estructura de Desglose del Trabajo (EDT) se construyó aplicando la técnica de descomposición jerárquica orientada a entregables tangibles. Se establecieron 7 fases cronológicas y 22 paquetes de trabajo de nivel inferior, garantizando que el 100% del trabajo requerido para cumplir los objetivos esté contenido en la estructura sin sobrecostos ni actividades redundantes (Regla del 100%).');

  body += makeHeading2('1.3 Proceso para Validar el Alcance');
  body += makeParagraph('La validación se realiza de forma continua al cierre de cada módulo funcional mediante sesiones de demostración con los usuarios clave. Se evalúa el cumplimiento de los criterios de aceptación técnicos y de negocio, formalizando la aprobación mediante la firma del acta de recepción correspondiente.');

  body += makeHeading2('1.4 Proceso para Controlar el Alcance');
  body += makeParagraph('Para gestionar cualquier propuesta de ajuste o adición al alcance, se aplica un protocolo formal de Control de Cambios:');
  body += makeParagraph('1. **Registro**: Documentación formal del cambio solicitado y su justificación.', { bullet: true });
  body += makeParagraph('2. **Análisis de Impacto**: Evaluación técnica de la afectación en la fecha de cierre (20/10/2026) y el presupuesto ($48.515.500 COP).', { bullet: true });
  body += makeParagraph('3. **Decisión**: Aprobación o rechazo por el comité de proyecto (Gerente y Arquitecto).', { bullet: true });
  body += makeParagraph('4. **Actualización**: Modificación oficial de la línea base en la EDT, cronograma y presupuesto.', { bullet: true });

  body += makeHeading2('1.5 Enunciado del Alcance del Proyecto');
  body += makeParagraph('**Alcance del Producto:** El sistema Gastotrack comprende la entrega de una aplicación web progresiva (PWA) instalable en teléfonos móviles y ordenadores, que incluye:');
  body += makeParagraph('- Autenticación de usuarios segura con Supabase Auth y persistencia de sesión.', { bullet: true });
  body += makeParagraph('- Módulo colaborativo de pareja con distintivos visuales de usuario (Santi en color azul y Kate en color rosa).', { bullet: true });
  body += makeParagraph('- Teclado numérico táctil (Numpad) optimizado para captura en menos de 5 segundos, con soporte para gastos, ingresos y compras a cuotas diferidas.', { bullet: true });
  body += makeParagraph('- Gestor mensual de cuentas organizadas en pestañas (Pendientes, Pagadas, Ingresos), con marcado de responsable, subida de foto de comprobante a Supabase Storage y función de clonación de cuentas del mes anterior.', { bullet: true });
  body += makeParagraph('- Gestor de metas de ahorro con periodicidades (semanal, quincenal, mensual), cuotas sugeridas, barra de avance y registro de aportes individuales.', { bullet: true });
  body += makeParagraph('- Módulo de categorías y subcategorías preconfigurado con la estructura de gasto colombiana.', { bullet: true });
  body += makeParagraph('- Tablero analítico con gráfico de dona de distribución de gastos y gráfico de líneas de evolución temporal con Chart.js, calculando el saldo real disponible según la fórmula: Saldo = Ingresos Pagados - Gastos Pagados - Aportes a Metas.', { bullet: true });

  body += makeParagraph('**Alcance del Proyecto:** Comprende todas las labores de gestión, diseño de interfaz UX/UI en Figma, arquitectura y modelado en PostgreSQL, programación frontend y backend, pruebas de seguridad RLS, despliegue en Vercel y Supabase Cloud, elaboración de manuales y soporte post-lanzamiento entre el **08/09/2026** y el **20/10/2026**.');

  body += makeParagraph('**Criterios de Aceptación:**');
  body += makeParagraph('- Cumplimiento del 100% de los 14 requerimientos funcionales definidos.', { bullet: true });
  body += makeParagraph('- Tiempo de respuesta de consultas en base de datos menor a 500 ms y carga inicial de la PWA en menos de 2 segundos.', { bullet: true });
  body += makeParagraph('- Aislamiento estricto de datos validado mediante políticas RLS en todas las tablas.', { bullet: true });
  body += makeParagraph('- Compatibilidad total comprobada en navegadores móviles (Chrome Android, Safari iOS) y escritorio.', { bullet: true });

  body += makeParagraph('**Exclusiones Explícitas (Fuera de Alcance):**');
  body += makeParagraph('- Conexión bancaria automatizada directa vía API con entidades financieras reguladas.', { bullet: true });
  body += makeParagraph('- Módulos de inversiones bursátiles complejas o comercio de criptoactivos.', { bullet: true });
  body += makeParagraph('- Facturación electrónica avalada ante entidades tributarias (DIAN).', { bullet: true });
  body += makeParagraph('- Publicación en tiendas nativas Google Play Store o Apple App Store (distribución directa PWA).', { bullet: true });

  body += makeParagraph('**Supuestos y Restricciones:**');
  body += makeParagraph('- **Supuestos:** Disponibilidad continua de los servicios en la nube de Vercel y Supabase; acceso de los usuarios a red de datos móviles.', { bullet: true });
  body += makeParagraph('- **Restricciones:** Fecha improrrogable de entrega final el **20 de octubre de 2026**; presupuesto límite de **$48.515.500 COP**.', { bullet: true });

  // ----------------------------------------------------
  // 2. ESTRUCTURA DE DESGLOSE DEL TRABAJO (EDT)
  // ----------------------------------------------------
  body += makeHeading1('2. Estructura de Desglose del Trabajo (EDT / WBS)');
  body += makeParagraph('La Estructura de Desglose del Trabajo descompone la totalidad del proyecto en 7 fases fundamentales y 22 paquetes de trabajo específicos:');

  const wbsRows = [
    ['1.0', 'GESTIÓN DEL PROYECTO', 'Fase transversal de dirección, seguimiento, control y cierre formal.'],
    ['1.1', 'Inicio del proyecto y formalización', 'Elaboración y firma del Acta de Constitución y definición de roles.'],
    ['1.2', 'Planeación del proyecto y líneas base', 'Formulación de planes de alcance, tiempo, costos y matriz de riesgos.'],
    ['1.3', 'Seguimiento y control continuo', 'Monitoreo semanal del avance, métricas EVM y reuniones de control.'],
    ['1.4', 'Cierre del proyecto y transferencia', 'Consolidación de entregables finales y firma del acta de cierre.'],
    ['2.0', 'ANÁLISIS Y DEFINICIÓN DE REQUERIMIENTOS', 'Fase de levantamiento y especificación técnica de requerimientos.'],
    ['2.1', 'Levantamiento de requerimientos con el cliente', 'Entrevistas directas, casos de uso de finanzas en pareja y priorización.'],
    ['2.2', 'Documento de requerimientos del producto', 'Redacción de especificación SRS (RF, RNF y Matriz MTR).'],
    ['2.3', 'Validación de requerimientos con el cliente', 'Revisión y firma de la línea base de requerimientos.'],
    ['3.0', 'DISEÑO Y ARQUITECTURA DEL SISTEMA', 'Fase de diseño técnico, modelo de datos e interfaces de usuario.'],
    ['3.1', 'Diseño de arquitectura del sistema', 'Definición de stack Next.js 16, App Router, Supabase y modelo Cloud.'],
    ['3.2', 'Diseño de base de datos relacional y políticas RLS', 'Modelado relacional en PostgreSQL, diagrama ER y reglas RLS.'],
    ['3.3', 'Diseño de interfaz de usuario (UX/UI y Numpad)', 'Prototipado interactivo en Figma, diseño de Numpad y flujos móviles.'],
    ['4.0', 'DESARROLLO E IMPLEMENTACIÓN DE MÓDULOS', 'Fase de codificación de frontend, backend y lógica de negocio.'],
    ['4.1', 'Módulo de autenticación, perfiles y modo pareja', 'Autenticación con Supabase Auth e identificación Santi y Kate.'],
    ['4.2', 'Módulo de registro rápido de transacciones (Numpad)', 'Desarrollo de Numpad táctil, selección de categorías y compras a cuotas.'],
    ['4.3', 'Módulo de gestión de cuentas fijas, pagos y recibos', 'Tablero mensual, confirmación de pago, fotos de recibos y clonación.'],
    ['4.4', 'Módulo de metas de ahorro y reportes analíticos', 'Metas con cuotas, aportes individuales y gráficas con Chart.js.'],
    ['5.0', 'ASEGURAMIENTO DE CALIDAD Y PRUEBAS', 'Fase de verificación funcional, seguridad y pruebas de usuario.'],
    ['5.1', 'Pruebas unitarias y de componentes', 'Pruebas de cálculos de saldos, cuotas y componentes React.'],
    ['5.2', 'Pruebas de seguridad RLS y sincronización', 'Auditoría de políticas RLS y almacenamiento en Storage.'],
    ['5.3', 'Pruebas de aceptación con el cliente (UAT)', 'Validación de escenarios reales con usuarios finales en móviles.'],
    ['6.0', 'DESPLIEGUE Y PUESTA EN PRODUCCIÓN', 'Fase de puesta en marcha, infraestructura productiva y entrega.'],
    ['6.1', 'Despliegue en ambiente de producción Cloud', 'Configuración de dominio, SSL, Vercel y Supabase Cloud.'],
    ['6.2', 'Capacitación a usuarios y manuales', 'Elaboración de manual de usuario y sesión de entrenamiento.'],
    ['6.3', 'Soporte post-implementación (garantía)', 'Monitoreo de estabilidad y resolución de incidencias iniciales.'],
    ['7.0', 'CIERRE Y TRANSFERENCIA', 'Fase de cierre formal y documentación final.'],
    ['7.1', 'Entrega final y acta de cierre', 'Aceptación formal del software a satisfacción por el cliente.'],
    ['7.2', 'Lecciones aprendidas', 'Documentación de aprendizajes y archivado de repositorios.']
  ];

  body += makeTable(
    ['Código', 'Paquete de Trabajo / Fase', 'Descripción General'],
    wbsRows,
    [1000, 3800, 4560]
  );

  // ----------------------------------------------------
  // 3. DICCIONARIO DE LA EDT
  // ----------------------------------------------------
  body += makeHeading1('3. Diccionario de la EDT');
  body += makeParagraph('A continuación se presentan las fichas técnicas detalladas de cada uno de los 22 paquetes de trabajo del proyecto, estableciendo sus descripciones, entregables tangibles, criterios de aceptación, responsables, recursos y predecesoras:');

  const dictRows = [
    ['1.1', 'Inicio y formalización', 'Definir objetivos, justificación, alcance y roles del equipo.', 'Acta de Constitución', 'Documento firmado por interesados.', 'Gerente de proyecto', 'Formatos PMBOK', '—'],
    ['1.2', 'Planeación y líneas base', 'Elaborar planes de alcance, cronograma Gantt, costos y riesgos.', 'Plan de Dirección', 'Líneas base aprobadas.', 'Gerente de proyecto', 'MS Excel, repo', '1.1'],
    ['1.3', 'Seguimiento y control', 'Monitorear avance semanal, métricas EVM y riesgos.', 'Informes semanales', 'Reportes SPI/CPI a tiempo.', 'Gerente de proyecto', 'Gestión EVM', '1.2'],
    ['1.4', 'Cierre y transferencia', 'Consolidar documentación final y traspaso de la PWA.', 'Informe de cierre', 'Doc administrativa al 100%.', 'Gerente de proyecto', 'Formatos cierre', '7.2'],
    ['2.1', 'Levantamiento requerimientos', 'Entrevistas de hábitos financieros y casos de uso en pareja.', 'Historias de usuario', 'Criterios Gherkin definidos.', 'Analista requerimientos', 'Guías entrevista', '1.1'],
    ['2.2', 'Documento de requerimientos', 'Redactar especificación formal SRS, RF, RNF y Matriz MTR.', 'Documento SRS y MTR', 'Priorización MoSCoW clara.', 'Analista requerimientos', 'Plantilla IEEE 830', '2.1'],
    ['2.3', 'Validación de requerimientos', 'Revisar y acordar la línea base formal con los usuarios.', 'Acta de aprobación', 'Firma de conformidad.', 'Analista requerimientos', 'Documento SRS', '2.2'],
    ['3.1', 'Diseño de arquitectura', 'Definir arquitectura Next.js 16 App Router y Supabase.', 'Documento SAD', 'Diagrama de componentes.', 'Arquitecto de software', 'Diagramación', '2.3'],
    ['3.2', 'Diseño de base de datos RLS', 'Modelar tablas PostgreSQL y redactar políticas de seguridad RLS.', 'Script DDL y RLS', 'Esquema normalizado 3FN.', 'Arquitecto de software', 'Supabase SQL', '3.1'],
    ['3.3', 'Diseño UX/UI y Numpad', 'Diseñar wireframes móviles, componente Numpad y temas.', 'Prototipos Figma', 'Prototipos interactivos.', 'Diseñador UX/UI', 'Figma Pro', '3.1'],
    ['4.1', 'Módulo Auth y Modo Pareja', 'Programar login Supabase Auth y perfiles de Santi y Kate.', 'Código Auth/Pareja', 'Identificación de usuario.', 'Equipo desarrollo', 'Next.js, Supabase', '3.2, 3.3'],
    ['4.2', 'Módulo Numpad y Registro', 'Construir teclado táctil Numpad, categorías y compras a cuotas.', 'Código NumpadForm', 'Registro en menos de 5 seg.', 'Equipo desarrollo', 'React 19, TS', '4.1'],
    ['4.3', 'Módulo Cuentas y Recibos', 'Tablero mensual de cuentas, marcado de pago y foto recibos.', 'Código Cuentas/Storage', 'Carga de comprobantes.', 'Equipo desarrollo', 'Supabase Storage', '4.2'],
    ['4.4', 'Módulo Metas y Analítica', 'Metas con cuotas, aportes y gráficos con Chart.js.', 'Código Metas/Analytics', 'Dona y líneas dinámicas.', 'Equipo desarrollo', 'Chart.js', '4.3'],
    ['5.1', 'Pruebas unitarias', 'Ejecutar pruebas en cálculos de saldos, cuotas y aportes.', 'Reporte de pruebas', 'Cobertura > 85% sin fallas.', 'Analista QA', 'Jest / Vitest', '4.4'],
    ['5.2', 'Pruebas seguridad RLS', 'Validar aislamiento estricto de datos y acceso a Storage.', 'Reporte de seguridad', 'Cero fugas de información.', 'Analista QA', 'Supabase CLI', '5.1'],
    ['5.3', 'Pruebas aceptación (UAT)', 'Pruebas con usuarios en escenarios reales de uso móvil.', 'Acta UAT firmada', '100% casos superados.', 'Analista QA', 'Móviles reales', '5.2'],
    ['6.1', 'Despliegue Cloud', 'Configurar dominio, SSL, Vercel y base de datos productiva.', 'Sistema en producción', 'PWA accesible vía HTTPS.', 'Especialista DevOps', 'Vercel, Supabase', '5.3'],
    ['6.2', 'Capacitación y manuales', 'Elaborar guía de usuario y realizar entrenamiento a pareja.', 'Manual de usuario', 'Manual entregado.', 'Especialista DevOps', 'Guía digital', '6.1'],
    ['6.3', 'Soporte post-lanzamiento', 'Monitorear estabilidad operativa y corregir detalles menores.', 'Bitácora de soporte', 'Estabilidad comprobada.', 'Especialista DevOps', 'Logs de monitoreo', '6.2'],
    ['7.1', 'Entrega final y acta', 'Consolidar entrega formal y firmar recepción a satisfacción.', 'Acta de entrega final', 'Aceptación total del cliente.', 'Gerente de proyecto', 'Acta formal', '6.3'],
    ['7.2', 'Lecciones aprendidas', 'Documentar aprendizajes y archivar repositorio etiquetado.', 'Doc lecciones aprendidas', 'Tag v1.0.0 en Git.', 'Gerente de proyecto', 'Repo GitHub', '7.1']
  ];

  body += makeTable(
    ['Cód', 'Paquete de Trabajo', 'Descripción', 'Entregable', 'Criterio Aceptación', 'Responsable', 'Recursos', 'Predec.'],
    dictRows,
    [600, 1400, 1900, 1200, 1400, 1200, 1000, 660]
  );

  // ----------------------------------------------------
  // 4. DOCUMENTO DE REQUERIMIENTOS DEL PRODUCTO
  // ----------------------------------------------------
  body += makeHeading1('4. Documento de Requerimientos del Producto');
  body += makeHeading2('4.1 Requerimientos Funcionales (RF)');

  const rfRows = [
    ['RF-01', 'Autenticación y Sesión', 'E: Correo y contraseña.\nP: Verificación en Supabase Auth y token.\nS: Sesión activa y acceso.', 'Must have', 'Persistencia segura de sesión en el navegador móvil y cierre seguro.'],
    ['RF-02', 'Identificación Modo Pareja', 'E: ID de usuario autenticado.\nP: Mapeo de identidad (Santi / Kate).\nS: Nombres y distintivos de color.', 'Must have', 'Cada registro, pago y aporte muestra el nombre y color de quien lo ejecutó.'],
    ['RF-03', 'Teclado Táctil Numpad', 'E: Dígitos ingresados en pantalla táctil.\nP: Formateo instantáneo en COP.\nS: Valor listo para categorizar y guardar.', 'Must have', 'Registro de movimientos en menos de 5 segundos con botón de borrado.'],
    ['RF-04', 'Categorización y Canasta', 'E: Selección de categoría y subcategoría.\nP: Asignación de category_id y parent_id.\nS: Gasto clasificado con icono y color.', 'Must have', 'Precarga de categorías colombianas (Vivienda, Servicios, Alimentación, etc.).'],
    ['RF-05', 'Compras en Cuotas Diferidas', 'E: Activación de cuotas (ej. cuota 1 de 12).\nP: Almacenamiento de installment_current/total.\nS: Transacción con etiqueta [Cuota 1/12].', 'Should have', 'Permite controlar el progreso de amortización en tarjetas de crédito.'],
    ['RF-06', 'Tablero Mensual de Cuentas', 'E: Filtro por mes y pestaña (Pendiente/Pagada/Ingreso).\nP: Consulta y agrupación de movimientos.\nS: Listado clasificado con subtotales.', 'Must have', 'Avisos visuales para obligaciones con fecha de vencimiento superada.'],
    ['RF-07', 'Pago y Comprobante Fotográfico', 'E: Responsable del pago, fecha y archivo de foto.\nP: Carga a Supabase Storage y marcado is_paid=true.\nS: Cuenta pagada con foto ampliable.', 'Must have', 'El comprobante queda guardado en la nube y puede verse en modal emergente.'],
    ['RF-08', 'Reversión de Estado de Pago', 'E: Selección de cuenta pagada y confirmación.\nP: Actualización a is_paid=false, paid_at=null.\nS: Retorno de la cuenta a pendientes.', 'Should have', 'Permite rectificar marcaciones erróneas sin eliminar el registro original.'],
    ['RF-09', 'Clonación de Cuentas Previas', 'E: Clic en botón de clonar mes anterior.\nP: Búsqueda de gastos fijos y duplicación.\nS: Nuevas cuentas creadas en estado pendiente.', 'Should have', 'Automatiza la creación de compromisos recurrentes al inicio del nuevo mes.'],
    ['RF-10', 'Creación de Metas de Ahorro', 'E: Título, monto objetivo, icono, cuota y frecuencia.\nP: Inserción en tabla goals con avance inicial 0%.\nS: Meta visible con barra de progreso.', 'Must have', 'Calcula el número de cuotas requeridas según la periodicidad elegida.'],
    ['RF-11', 'Aportes a Metas de Ahorro', 'E: Selección de meta, monto aportado y aportante.\nP: Registro en goal_contributions y suma a meta.\nS: Avance actualizado y deducción de saldo.', 'Must have', 'El dinero aportado a la meta se descuenta automáticamente del saldo real disponible.'],
    ['RF-12', 'Tablero Analítico y Gráficas', 'E: Movimientos pagados y rango de fechas.\nP: Agrupación y cálculo de porcentajes con Chart.js.\nS: Gráfico de dona y líneas de tendencia.', 'Should have', 'Gráficos interactivos que permiten filtrar al hacer clic en categorías.'],
    ['RF-13', 'Cálculo de Saldo Real', 'E: Ingresos pagados, gastos pagados y aportes.\nP: Saldo = Ingresos - Gastos - Aportes.\nS: Cifra destacada en la pantalla principal.', 'Must have', 'Los gastos pendientes no restan saldo hasta que sean marcados como pagados.'],
    ['RF-14', 'Gestión de Subcategorías', 'E: Nombre de subcategoría e icono emoji.\nP: Guardado bajo la categoría padre correspondiente.\nS: Opción disponible en el teclado Numpad.', 'Could have', 'Permite personalizar el árbol de categorías según las dinámicas del hogar.']
  ];

  body += makeTable(
    ['ID', 'Nombre Requerimiento', 'Descripción (Entrada -> Proceso -> Salida)', 'Prioridad', 'Criterio de Aceptación'],
    rfRows,
    [800, 1800, 3160, 1100, 2500]
  );

  body += makeHeading2('4.2 Requerimientos No Funcionales (RNF)');

  const rnfRows = [
    ['RNF-01', 'Rendimiento', 'Velocidad de Carga y Consulta', 'Consultas a base de datos en menos de 500 ms y carga inicial de la PWA en menos de 2 segundos en redes móviles 4G.'],
    ['RNF-02', 'Seguridad', 'Políticas RLS en Base de Datos', 'Todas las tablas en PostgreSQL deben tener activadas políticas de Row Level Security para aislar datos entre usuarios.'],
    ['RNF-03', 'Seguridad', 'Comunicaciones Seguras HTTPS', 'Transmisión cifrada de datos, contraseñas y fotos de recibos bajo protocolo HTTPS con certificados TLS 1.3.'],
    ['RNF-04', 'Usabilidad', 'Diseño Móvil y Teclado Táctil', 'Interfaz adaptativa con botones táctiles grandes, permitiendo registrar cualquier movimiento con una sola mano.'],
    ['RNF-05', 'Disponibilidad', 'Continuidad Operativa Cloud', 'Disponibilidad mensual superior al 99.9% soportada sobre la infraestructura de Vercel y Supabase Cloud.'],
    ['RNF-06', 'Compatibilidad', 'Formato PWA Multiplataforma', 'Compatibilidad e instalación comprobada en Chrome, Safari, Firefox y Edge tanto en Android, iOS como en PC.'],
    ['RNF-07', 'Calidad de Código', 'Tipado Estricto en TypeScript', 'Código fuente tipado al 100% con TypeScript, componentes reutilizables en React 19 y arquitectura App Router de Next.js 16.'],
    ['RNF-08', 'Almacenamiento', 'Gestión Eficiente en Storage', 'Almacenamiento seguro y optimizado de imágenes de comprobantes de pago en buckets dedicados de Supabase Storage.']
  ];

  body += makeTable(
    ['ID', 'Área', 'Requisito No Funcional', 'Criterio de Aceptación y Estándar'],
    rnfRows,
    [900, 1400, 2500, 4560]
  );

  body += makeHeading2('4.3 Matriz de Trazabilidad de Requisitos (MTR)');

  const mtrRows = [
    ['RF-01', 'Autenticación y Sesión', '4.1', 'app/components/Auth.tsx, lib/supabase.ts', 'Pruebas de login, persistencia y logout', 'Módulo Auth'],
    ['RF-02', 'Identificación Modo Pareja', '4.1', 'lib/couple.ts, app/page.tsx', 'Verificación de insignias de Santi y Kate', 'Módulo Pareja'],
    ['RF-03', 'Teclado Táctil Numpad', '4.2', 'app/components/NumpadForm.tsx', 'Registro cronometrado de transacción (< 5s)', 'Componente Numpad'],
    ['RF-04', 'Categorización y Canasta', '4.4', 'app/categorias/page.tsx, database_update.sql', 'Verificación de categorías sembradas', 'Gestor Categorías'],
    ['RF-05', 'Compras en Cuotas', '4.2', 'app/components/NumpadForm.tsx, app/cuentas/page.tsx', 'Comprobación de etiqueta [Cuota 1/12]', 'Control Cuotas'],
    ['RF-06', 'Cuentas Pendientes/Pagadas', '4.3', 'app/cuentas/page.tsx', 'Pruebas de filtro mensual y vencimientos', 'Vista Cuentas'],
    ['RF-07', 'Pago y Comprobante', '4.3', 'app/components/PayConfirmModal.tsx, Storage', 'Carga de imagen y apertura en modal', 'Modal de Pago'],
    ['RF-08', 'Reversión de Pago', '4.3', 'app/components/UndoConfirmModal.tsx', 'Retorno de estado pagado a pendiente', 'Modal Undo'],
    ['RF-09', 'Clonación Cuentas Previas', '4.3', 'app/cuentas/page.tsx', 'Duplicación masiva de gastos recurrentes', 'Importador Mes'],
    ['RF-10', 'Creación Metas de Ahorro', '4.4', 'app/goals/page.tsx, database_update.sql', 'Inserción de meta y cálculo de cuotas', 'Vista Metas'],
    ['RF-11', 'Aportes a Metas', '4.4', 'app/goals/page.tsx, goal_contributions', 'Registro de aporte y resta en saldo', 'Modal Aporte'],
    ['RF-12', 'Tablero y Gráficas', '4.4', 'app/analytics/page.tsx', 'Renderizado interactivo de dona y líneas', 'Vista Analítica'],
    ['RF-13', 'Cálculo de Saldo Real', '4.4', 'app/page.tsx', 'Validación de ecuación de balance real', 'Dashboard Home'],
    ['RF-14', 'Gestión de Subcategorías', '4.4', 'app/categorias/page.tsx', 'Creación y eliminación en árbol jerárquico', 'Vista Categorías'],
    ['RNF-01..08', 'Rendimiento, RLS, PWA, TS', '3.1..5.2', 'Código completo, RLS SQL, manifest.json', 'Auditoría de seguridad, carga y tipado', 'Sistema Gastotrack']
  ];

  body += makeTable(
    ['ID', 'Resumen Funcional', 'EDT', 'Componente / Archivo Código', 'Método de Verificación', 'Entregable'],
    mtrRows,
    [800, 1800, 600, 2760, 2200, 1200]
  );

  // ----------------------------------------------------
  // 5. PLAN DE LA GESTIÓN DEL TIEMPO
  // ----------------------------------------------------
  body += makeHeading1('5. Plan de la Gestión del Tiempo');
  body += makeHeading2('5.1 Metodología de Programación y Estimación');
  body += makeParagraph('El cronograma de trabajo de Gastotrack comprende un horizonte temporal de **31 días hábiles** (equivalentes a 43 días calendario), iniciando el **8 de septiembre de 2026** y finalizando el **20 de octubre de 2026**. Para garantizar estimaciones precisas y realistas, se aplicaron:');
  body += makeParagraph('- **Estimación por Tres Puntos (PERT)**: Para cada actividad se determinó la duración optimista (O), más probable (M) y pesimista (P), aplicando la fórmula de distribución beta: Duración = (Optimista + 4 * Más Probable + Pesimista) / 6.');
  body += makeParagraph('- **Método de la Ruta Crítica (CPM)**: Identificación de la secuencia más larga de actividades dependientes sin holgura que determina la duración total del proyecto.');

  body += makeHeading2('5.2 Calendario Laboral y Jornada');
  body += makeParagraph('- **Días laborables**: Lunes a viernes en jornada diurna ordinaria.');
  body += makeParagraph('- **Dedicación**: 8 horas diarias por desarrollador equivalente.');
  body += makeParagraph('- **Feriados**: Considerados según el calendario oficial colombiano para septiembre y octubre de 2026.');

  body += makeHeading2('5.3 Control del Cronograma mediante Valor Ganado (EVM)');
  body += makeParagraph('El seguimiento del cronograma se efectúa semanalmente comparando el trabajo completado frente a la línea base planificada:');
  body += makeParagraph('- **Variación del Cronograma (SV)**: SV = EV - PV (Diferencia entre el Valor Ganado y el Valor Planificado).');
  body += makeParagraph('- **Índice de Desempeño del Cronograma (SPI)**: SPI = EV / PV (Eficiencia del tiempo; valores iguales o superiores a 1.0 indican cumplimiento).');

  body += makeHeading2('5.4 Umbrales de Variación y Acciones Correctivas');
  body += makeParagraph('- **Rango Normal (0.95 <= SPI <= 1.05)**: Se continúa con la ejecución estándar según el plan de trabajo.');
  body += makeParagraph('- **Alerta Temprana (0.85 <= SPI < 0.95)**: Redistribución interna de actividades secundarias y enfoque exclusivo en requerimientos Must have.');
  body += makeParagraph('- **Desviación Crítica (SPI < 0.85)**: Asignación de horas adicionales concentradas en tareas de la ruta crítica para recuperar holgura sin afectar la calidad de las pruebas.');

  // ----------------------------------------------------
  // 6. LISTADO DETALLADO DE ACTIVIDADES
  // ----------------------------------------------------
  body += makeHeading1('6. Listado Detallado de Actividades');
  body += makeParagraph('A continuación se detalla la matriz de las 22 actividades del proyecto, perfectamente alineada con la hoja **`Cronograma_Gantt`** del archivo Excel **`Entrega1_Gastotrack_Cronograma_FlujoCaja.xlsx`**:');

  const actRows = [
    ['1.1', 'Inicio del proyecto y formalización', '—', '—', '3', 'Gerente de proyecto', '08/09/2026', '10/09/2026', 'Acta de Constitución'],
    ['1.2', 'Planeación del proyecto y líneas base', '1.1', 'FS', '3', 'Gerente de proyecto', '11/09/2026', '15/09/2026', 'Plan de Dirección'],
    ['1.3', 'Seguimiento y control continuo', '1.2', 'FS', 'Cont.', 'Gerente de proyecto', '16/09/2026', '19/10/2026', 'Informes Semanales'],
    ['1.4', 'Cierre del proyecto y transferencia', '7.2', 'FS', '2', 'Gerente de proyecto', '19/10/2026', '20/10/2026', 'Informe de Cierre'],
    ['2.1', 'Levantamiento de requerimientos con el cliente', '1.1', 'FS', '2', 'Analista de requerimientos', '11/09/2026', '14/09/2026', 'Historias de Usuario'],
    ['2.2', 'Documento de requerimientos del producto', '2.1', 'FS', '3', 'Analista de requerimientos', '15/09/2026', '17/09/2026', 'Documento SRS'],
    ['2.3', 'Validación de requerimientos con el cliente', '2.2', 'FS', '1', 'Analista de requerimientos', '18/09/2026', '18/09/2026', 'Acta de Aprobación'],
    ['3.1', 'Diseño de arquitectura del sistema', '2.3', 'FS', '2', 'Arquitecto de software', '18/09/2026', '21/09/2026', 'Documento SAD'],
    ['3.2', 'Diseño de base de datos relacional y políticas RLS', '3.1', 'FS', '3', 'Arquitecto de software', '21/09/2026', '23/09/2026', 'Script DDL y RLS'],
    ['3.3', 'Diseño de interfaz de usuario (UX/UI y Numpad)', '3.1', 'SS', '4', 'Diseñador UX/UI', '21/09/2026', '24/09/2026', 'Prototipos Figma'],
    ['4.1', 'Módulo de autenticación, perfiles y modo pareja', '3.2', 'FS', '3', 'Equipo de desarrollo', '24/09/2026', '28/09/2026', 'Código Auth y Perfil'],
    ['4.2', 'Módulo de registro rápido de transacciones (Numpad)', '4.1', 'FS', '4', 'Equipo de desarrollo', '28/09/2026', '01/10/2026', 'Código NumpadForm'],
    ['4.3', 'Módulo de gestión de cuentas fijas, pagos y recibos', '4.2', 'FS', '4', 'Equipo de desarrollo', '01/10/2026', '06/10/2026', 'Código Cuentas/Storage'],
    ['4.4', 'Módulo de metas de ahorro y reportes analíticos', '4.3', 'FS', '5', 'Equipo de desarrollo', '06/10/2026', '12/10/2026', 'Código Metas/Chart.js'],
    ['5.1', 'Pruebas unitarias y de componentes', '4.4', 'FS', '3', 'Analista de pruebas (QA)', '12/10/2026', '14/10/2026', 'Reporte Unitarias'],
    ['5.2', 'Pruebas de seguridad RLS y sincronización', '5.1', 'FS', '2', 'Analista de pruebas (QA)', '14/10/2026', '15/10/2026', 'Reporte Seguridad RLS'],
    ['5.3', 'Pruebas de aceptación con el cliente (UAT)', '5.2', 'FS', '2', 'Analista de pruebas (QA)', '15/10/2026', '16/10/2026', 'Acta Aceptación UAT'],
    ['6.1', 'Despliegue en ambiente de producción Cloud', '5.3', 'FS', '1', 'Especialista en despliegue', '16/10/2026', '16/10/2026', 'Despliegue Cloud PWA'],
    ['6.2', 'Capacitación a usuarios y manuales', '6.1', 'FS', '2', 'Especialista en despliegue', '16/10/2026', '19/10/2026', 'Manual de Usuario'],
    ['6.3', 'Soporte post-implementación (garantía)', '6.2', 'FS', '2', 'Especialista en despliegue', '19/10/2026', '20/10/2026', 'Bitácora de Soporte'],
    ['7.1', 'Entrega final y acta de cierre', '6.3', 'FS', '2', 'Gerente de proyecto', '19/10/2026', '20/10/2026', 'Acta de Cierre Firmada'],
    ['7.2', 'Lecciones aprendidas', '7.1', 'FS', '1', 'Gerente de proyecto', '20/10/2026', '20/10/2026', 'Doc Lecciones Aprendidas']
  ];

  body += makeTable(
    ['Cód', 'Actividad', 'Pred.', 'Tipo', 'Días', 'Responsable', 'Inicio', 'Fin', 'Entregable'],
    actRows,
    [600, 2000, 600, 500, 500, 1600, 1000, 1000, 1560]
  );

  // ----------------------------------------------------
  // 7. DIAGRAMA DE GANTT DEL PROYECTO
  // ----------------------------------------------------
  body += makeHeading1('7. Diagrama de Gantt del Proyecto');
  body += makeHeading2('7.1 Ruta Crítica (CPM)');
  body += makeParagraph('La duración total del proyecto es de **43 días calendario** (31 días hábiles), comenzando el martes **08/09/2026** y concluyendo formalmente el martes **20/10/2026**.');
  body += makeParagraph('La **Ruta Crítica** está conformada por la secuencia estricta de actividades principales sin margen de holgura:');
  body += makeParagraph('1.1 (Inicio) -> 1.2 (Planeación) -> 2.1 (Requerimientos) -> 2.2 (SRS) -> 2.3 (Validación) -> 3.1 (Arquitectura) -> 3.2 (Base de Datos RLS) -> 4.1 (Módulo Auth/Pareja) -> 4.2 (Numpad) -> 4.3 (Cuentas/Recibos) -> 4.4 (Metas/Gráficas) -> 5.1 (Unitarias) -> 5.2 (Seguridad RLS) -> 5.3 (UAT) -> 6.1 (Despliegue) -> 6.2 (Capacitación) -> 6.3 (Soporte) -> 7.1 (Entrega) -> 7.2 (Lecciones).', { bold: true, color: '13294B' });

  body += makeParagraph('La actividad de **Diseño UX/UI (3.3)** se ejecuta en paralelo con el diseño de base de datos (**3.2**), contando con una holgura positiva de 1 día que le otorga flexibilidad sin retrasar el inicio de la fase de codificación.');

  body += makeHeading2('7.2 Hitos Principales de Control');
  body += makeParagraph('1. **Inicio formal del proyecto**: 10 de septiembre de 2026 (Firma del Acta de Constitución).', { bullet: true });
  body += makeParagraph('2. **Aprobación de la línea base de requerimientos**: 18 de septiembre de 2026.', { bullet: true });
  body += makeParagraph('3. **Cierre de arquitectura y prototipos UX/UI**: 24 de septiembre de 2026.', { bullet: true });
  body += makeParagraph('4. **Entrega de primer ciclo de software (Auth, Pareja y Numpad)**: 01 de octubre de 2026.', { bullet: true });
  body += makeParagraph('5. **Finalización de desarrollo integral de módulos**: 12 de octubre de 2026.', { bullet: true });
  body += makeParagraph('6. **Aprobación de pruebas UAT y despliegue productivo**: 16 de octubre de 2026.', { bullet: true });
  body += makeParagraph('7. **Cierre formal y entrega final**: 20 de octubre de 2026.', { bullet: true });

  body += makeCallout('El Diagrama de Gantt automatizado se encuentra implementado en la hoja Cronograma_Gantt del libro Excel Entrega1_Gastotrack_Cronograma_FlujoCaja.xlsx, mediante un gráfico nativo de barras apiladas alimentado por fórmulas dinámicas de inicio, desplazamiento y duración.', 'REPRESENTACIÓN GRÁFICA EN EXCEL');

  // ----------------------------------------------------
  // 8. CRONOGRAMA DEL PROYECTO
  // ----------------------------------------------------
  body += makeHeading1('8. Cronograma del Proyecto');
  body += makeParagraph('La distribución cronológica semana a semana del proyecto se resume a continuación:');

  const cronRows = [
    ['Semana 1', '08/09/2026 – 11/09/2026', 'Inicio (1.1), Planeación (1.2), Levantamiento de requerimientos (2.1).', 'Acta de Constitución, Historias de Usuario'],
    ['Semana 2', '14/09/2026 – 18/09/2026', 'Documento SRS (2.2), Aprobación de requisitos (2.3), Arquitectura (3.1).', 'Documento SRS, Arquitectura SAD'],
    ['Semana 3', '21/09/2026 – 25/09/2026', 'Base de datos RLS (3.2), UI/UX Figma (3.3), Módulo Auth y Pareja (4.1).', 'DDL PostgreSQL, Prototipos Figma, Módulo Auth'],
    ['Semana 4', '28/09/2026 – 02/10/2026', 'Módulo Numpad (4.2), Módulo Cuentas y Recibos (4.3).', 'Componente NumpadForm, Vista Cuentas'],
    ['Semana 5', '05/10/2026 – 09/10/2026', 'Módulo Cuentas (4.3), Módulo Metas y Reportes Chart.js (4.4).', 'Módulo Metas, Tablero Analítico'],
    ['Semana 6', '12/10/2026 – 16/10/2026', 'Pruebas Unitarias (5.1), Pruebas RLS (5.2), UAT (5.3), Despliegue Cloud (6.1).', 'Reportes QA, App en Producción'],
    ['Semana 7', '19/10/2026 – 20/10/2026', 'Capacitación (6.2), Soporte inicial (6.3), Cierre formal (7.1, 7.2).', 'Manual de Usuario, Acta de Cierre Final']
  ];

  body += makeTable(
    ['Semana', 'Periodo', 'Actividades en Ejecución', 'Entregable de la Semana'],
    cronRows,
    [1200, 2000, 3600, 2560]
  );

  // ----------------------------------------------------
  // 9. PLAN DE LA GESTIÓN DE COSTOS
  // ----------------------------------------------------
  body += makeHeading1('9. Plan de la Gestión de Costos');
  body += makeHeading2('9.1 Enfoque de Estimación');
  body += makeParagraph('El presupuesto se elaboró aplicando una estimación **ascendente (Bottom-Up)**, sumando los costos de mano de obra por perfil profesional, los costos directos de infraestructura y licencias en la nube, y una reserva de contingencia del 10% para mitigar riesgos técnicos.');

  body += makeHeading2('9.2 Tarifas de Personal y Matriz de Dedicación Mensual');

  const costPersonnelRows = [
    ['Gerente de proyecto', '$7.000.000', '0.60', '$4.200.000', '0.55', '$3.850.000', '$8.050.000'],
    ['Analista de requerimientos', '$4.500.000', '0.50', '$2.250.000', '0.15', '$675.000', '$2.925.000'],
    ['Arquitecto de software', '$5.500.000', '0.50', '$2.750.000', '0.20', '$1.100.000', '$3.850.000'],
    ['Diseñador UX/UI', '$4.800.000', '0.50', '$2.400.000', '0.15', '$720.000', '$3.120.000'],
    ['Equipo de desarrollo (2 dev)', '$10.000.000', '0.60', '$6.000.000', '0.70', '$7.000.000', '$13.000.000'],
    ['Analista de pruebas (QA)', '$4.000.000', '0.15', '$600.000', '0.70', '$2.800.000', '$3.400.000'],
    ['Especialista en despliegue', '$4.800.000', '0.10', '$480.000', '0.60', '$2.880.000', '$3.360.000'],
    ['TOTAL MANO DE OBRA', '—', '—', '$18.680.000', '—', '$19.025.000', '$37.705.000']
  ];

  body += makeTable(
    ['Rol Profesional', 'Tarifa Mensual', 'Ded. Sep', 'Costo Sep-2026', 'Ded. Oct', 'Costo Oct-2026', 'Total Rol (COP)'],
    costPersonnelRows,
    [2100, 1300, 900, 1300, 900, 1300, 1560]
  );

  body += makeHeading2('9.3 Costos Directos No Recurrentes (Infraestructura y Licencias)');

  const directCostRows = [
    ['Licencias de software y diseño', 'Sep-2026', '$2.200.000', 'Figma Pro, GitHub Copilot y licencias de gestión.'],
    ['Infraestructura Cloud de pruebas', 'Sep-2026', '$1.800.000', 'Ambientes de staging en Supabase Pro y Vercel Team.'],
    ['Infraestructura Cloud de producción', 'Oct-2026', '$2.400.000', 'Servidores de producción, dominio .com, SSL y Storage.'],
    ['TOTAL COSTOS DIRECTOS', '—', '$6.400.000', '($4.000.000 en Sep-2026 y $2.400.000 en Oct-2026)']
  ];

  body += makeTable(
    ['Concepto', 'Mes de Imputación', 'Valor (COP)', 'Detalle Técnico'],
    directCostRows,
    [2600, 1500, 1500, 3760]
  );

  body += makeHeading2('9.4 Reserva de Contingencia y Presupuesto Total Consolidado');
  body += makeParagraph('- **Subtotal de Costos Directos (Mano de obra + Infraestructura)**: $37.705.000 + $6.400.000 = **$44.105.000 COP**.');
  body += makeParagraph('- **Reserva de Contingencia (10%)**: **$4.410.500 COP**.');
  body += makeParagraph('- **PRESUPUESTO TOTAL DEL PROYECTO**: **$48.515.500 COP**.', { bold: true, size: 24, color: '13294B' });

  body += makeHeading2('9.5 Control de Costos (EVM)');
  body += makeParagraph('El control financiero se monitorea con los indicadores:');
  body += makeParagraph('- **Variación del Costo (CV)**: CV = EV - AC (Diferencia entre Valor Ganado y Costo Real).');
  body += makeParagraph('- **Índice de Desempeño del Costo (CPI)**: CPI = EV / AC (Eficiencia del gasto presupuestal; valores >= 1.0 demuestran rendimiento óptimo sin sobrecostos).');

  // ----------------------------------------------------
  // 10. FLUJO NETO DE EFECTIVO
  // ----------------------------------------------------
  body += makeHeading1('10. Flujo Neto de Efectivo');
  body += makeHeading2('10.1 Modelo Financiero Mensual Consolidado');

  const cashFlowRows = [
    ['Mano de obra', '$18.680.000', '$19.025.000', '$37.705.000'],
    ['Costos únicos (Licencias / Cloud)', '$4.000.000', '$2.400.000', '$6.400.000'],
    ['Subtotal costos directos', '$22.680.000', '$21.425.000', '$44.105.000'],
    ['Reserva de contingencia (10%)', '$2.268.000', '$2.142.500', '$4.410.500'],
    ['EGRESOS TOTALES DEL PROYECTO', '$24.948.000', '$23.567.500', '$48.515.500']
  ];

  body += makeTable(
    ['Concepto de Egreso', 'Sep-2026 (COP)', 'Oct-2026 (COP)', 'TOTAL PROYECTO (COP)'],
    cashFlowRows,
    [3360, 2000, 2000, 2000]
  );

  body += makeHeading2('10.2 Hitos de Facturación e Ingresos');
  body += makeParagraph('Los ingresos corresponden a 3 desembolsos acordados con el cliente sobre el presupuesto total ($48.515.500 COP):');
  body += makeParagraph('1. **Anticipo al inicio del proyecto (30%)**: **$14.554.650 COP** (Facturado en Sep-2026 contra firma del Acta de Constitución).', { bullet: true });
  body += makeParagraph('2. **Hito intermedio de avance de desarrollo (40%)**: **$19.406.200 COP** (Facturado a inicios de Oct-2026 con los módulos Auth, Pareja y Numpad completados).', { bullet: true });
  body += makeParagraph('3. **Entrega final y cierre (30%)**: **$14.554.650 COP** (Facturado en Oct-2026 contra firma del Acta de Entrega Final).', { bullet: true });

  body += makeParagraph('- **Ingresos en Sep-2026**: $14.554.650 COP.');
  body += makeParagraph('- **Ingresos en Oct-2026**: $19.406.200 + $14.554.650 = **$33.960.850 COP**.');
  body += makeParagraph('- **TOTAL INGRESOS**: **$48.515.500 COP**.');

  body += makeHeading2('10.3 Flujo Neto Mensual y Flujo Acumulado');

  const netCashFlowRows = [
    ['(+) Ingresos por Hitos de Pago', '$14.554.650', '$33.960.850', '$48.515.500'],
    ['(-) Egresos Totales del Proyecto', '$24.948.000', '$23.567.500', '$48.515.500'],
    ['(=) FLUJO NETO MENSUAL', '-$10.393.350', '+$10.393.350', '$0'],
    ['FLUJO NETO ACUMULADO', '-$10.393.350', '$0', '$0']
  ];

  body += makeTable(
    ['Concepto Financiero', 'Sep-2026 (COP)', 'Oct-2026 (COP)', 'TOTAL (COP)'],
    netCashFlowRows,
    [3360, 2000, 2000, 2000]
  );

  body += makeHeading2('10.4 Análisis de Liquidez y Capital de Trabajo');
  body += makeParagraph('- En **septiembre de 2026**, debido a la concentración inicial de costos de infraestructura, licencias y mano de obra de diseño y arquitectura, se genera un flujo neto mensual de -$10.393.350 COP. Esta brecha de liquidez es absorbida mediante el fondo de capital de trabajo de la empresa ejecutora.');
  body += makeParagraph('- En **octubre de 2026**, con el cobro del hito de avance (40%) y la liquidación final (30%), se perciben $33.960.850 COP, recuperando el capital de trabajo y finalizando el proyecto con un balance financiero exacto de **$0 COP**.');

  // ----------------------------------------------------
  // 11. INSTRUCTIVO DE LECTURA Y USO DE LA HOJA DE CÁLCULO
  // ----------------------------------------------------
  body += makeHeading1('11. Instructivo de Lectura y Uso de la Hoja de Cálculo');
  body += makeHeading2('11.1 Guía de Lectura del Informe Formal');
  body += makeParagraph('El documento está estructurado de forma modular y progresiva:');
  body += makeParagraph('- **Secciones 1 a 3**: Delimitan el problema de negocio, el alcance funcional del producto Gastotrack y la descomposición técnica en 22 paquetes de trabajo.', { bullet: true });
  body += makeParagraph('- **Sección 4**: Especifica los 14 requerimientos funcionales, 8 no funcionales y la Matriz de Trazabilidad hacia los archivos reales del código fuente.', { bullet: true });
  body += makeParagraph('- **Secciones 5 a 8**: Presentan la planificación temporal, la lista detallada de actividades, la ruta crítica y el cronograma ejecutado entre el 08/09/2026 y el 20/10/2026.', { bullet: true });
  body += makeParagraph('- **Secciones 9 y 10**: Exponen el presupuesto ascendente ($48.515.500 COP) y la proyección del flujo de caja mensual y acumulado.', { bullet: true });

  body += makeHeading2('11.2 Manual Operativo de la Hoja de Cálculo Excel');
  body += makeParagraph('El archivo complementario **`Entrega1_Gastotrack_Cronograma_FlujoCaja.xlsx`** contiene 3 hojas dinámicas interconectadas:');

  body += makeParagraph('**1. Hoja `Cronograma_Gantt`:**');
  body += makeParagraph('- Celda `C4`: Contiene la fecha de inicio del proyecto (`08/09/2026`).', { bullet: true });
  body += makeParagraph('- Columnas `B` a `H`: Contienen el código, nombre, predecesoras, duración en días hábiles, responsable y fechas de Inicio y Fin de las 22 actividades.', { bullet: true });
  body += makeParagraph('- Columnas `I` y `J`: Calculan automáticamente el desplazamiento (Offset con fórmula `=G{fila}-$C$4`) y la duración (`=H{fila}-G{fila}+1`).', { bullet: true });
  body += makeParagraph('- Columnas `L`, `M`, `N`: Tabla auxiliar vinculada mediante fórmulas en orden inverso que alimenta el gráfico de barras apiladas del Diagrama de Gantt.', { bullet: true });

  body += makeParagraph('**2. Hoja `Costos_Recursos`:**');
  body += makeParagraph('- Celdas `C6:C12`: Tarifas mensuales de referencia para los 7 roles profesionales.', { bullet: true });
  body += makeParagraph('- Celdas `C17:D23`: Matriz de dedicación porcentual para Sep-2026 y Oct-2026.', { bullet: true });
  body += makeParagraph('- Celdas `C28:D34`: Cálculo automático de mano de obra (`=$C$tarifa * dedicacion`). Celdas `C35` y `D35` totalizan la nómina.', { bullet: true });
  body += makeParagraph('- Filas 40 a 42: Detalle de costos directos de software y nube, consolidados en la fila 47 mediante `=SUMIF(...)`.', { bullet: true });

  body += makeParagraph('**3. Hoja `Flujo_Caja`:**');
  body += makeParagraph('- Filas 8 y 9: Vinculan automáticamente los subtotales de mano de obra y costos únicos desde `Costos_Recursos`.', { bullet: true });
  body += makeParagraph('- Fila 11: Aplica la reserva de contingencia del 10% (celda `C4`).', { bullet: true });
  body += makeParagraph('- Celda `C14`: Presupuesto total formulado con `=SUM(C12:G12)`.', { bullet: true });
  body += makeParagraph('- Filas 19 a 21: Porcentajes de facturación de hitos (30%, 40%, 30%).', { bullet: true });
  body += makeParagraph('- Filas 26 a 29: Fórmulas dinámicas para ingresos, egresos, flujo neto mensual y flujo neto acumulado.', { bullet: true });

  // Section properties for the document body
  body += `
    <w:sectPr w:rsidR="003B51D5">
      <w:headerReference w:type="default" r:id="rId10"/>
      <w:footerReference w:type="default" r:id="rId11"/>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
      <w:cols w:space="720"/>
      <w:docGrid w:linePitch="360"/>
    </w:sectPr>
  `;

  return body;
}

// Assemble document.xml
const bodyXml = generateBodyXml();

const fullDocumentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" 
  xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" 
  xmlns:cx1="http://schemas.microsoft.com/office/drawing/2015/chartex" 
  xmlns:cx2="http://schemas.microsoft.com/office/drawing/2015/chartex/key" 
  xmlns:cx3="http://schemas.microsoft.com/office/drawing/2016/5/chartex" 
  xmlns:cx4="http://schemas.microsoft.com/office/drawing/2016/5/chartex/key" 
  xmlns:cx5="http://schemas.microsoft.com/office/drawing/2016/5/chartex/axis" 
  xmlns:cx6="http://schemas.microsoft.com/office/drawing/2016/5/chartex/chartdata" 
  xmlns:cx7="http://schemas.microsoft.com/office/drawing/2016/5/chartex/series" 
  xmlns:cx8="http://schemas.microsoft.com/office/drawing/2016/5/chartex/plotarea" 
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" 
  xmlns:aink="http://schemas.microsoft.com/office/drawing/2016/ink" 
  xmlns:am3d="http://schemas.microsoft.com/office/drawing/2017/model3d" 
  xmlns:o="urn:schemas-microsoft-com:office:office" 
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" 
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" 
  xmlns:v="urn:schemas-microsoft-com:vml" 
  xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" 
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" 
  xmlns:w10="urn:schemas-microsoft-com:office:word" 
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" 
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" 
  xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" 
  xmlns:w16cex="http://schemas.microsoft.com/office/word/2018/wordml/cex" 
  xmlns:w16cid="http://schemas.microsoft.com/office/word/2016/wordml/cid" 
  xmlns:w16="http://schemas.microsoft.com/office/word/2018/wordml" 
  xmlns:w16sdtdh="http://schemas.microsoft.com/office/word/2020/wordml/sdtdatahash" 
  xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex" 
  xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" 
  xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" 
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" 
  xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" 
  mc:Ignorable="w14 w15 w16se w16cid w16 w16cex w16sdtdh wp14">
  <w:body>
    ${bodyXml}
  </w:body>
</w:document>`;

fs.writeFileSync('template_unpacked/word/document.xml', fullDocumentXml, 'utf8');
console.log('Successfully written full Gastotrack document.xml! Length:', fullDocumentXml.length);
