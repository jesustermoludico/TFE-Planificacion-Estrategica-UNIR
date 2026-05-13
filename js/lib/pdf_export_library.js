(function () {
  'use strict';
/**
 * Clase para exportar el resumen didáctico a PDF mediante una ventana de impresión personalizada.
 * La clase construye un documento HTML con estilos específicos para impresión, basado en el estado actual del resumen almacenado en sessionStorage. Proporciona métodos para exportar directamente a PDF o descargar una vista previa en HTML, así como para vincular la funcionalidad a botones en la interfaz de usuario.
 * El diseño del documento incluye una portada con título, subtítulo y meta información, seguida de secciones detalladas que cubren diferentes aspectos del diseño didáctico, como contextualización, desafío y producto final, elementos curriculares, evaluación, soft skills, metodología, secuenciación didáctica, atención a la diversidad, DUA, orientación, prospectiva y recursos.
 * El código también incluye funciones auxiliares para manejar la generación de contenido HTML de manera segura (escapando caracteres), formatear texto a partir de objetos complejos y aplicar estilos específicos para garantizar una presentación clara y profesional al imprimir o guardar como PDF.
 */
  class SummaryPdfExporter {
    /**
     * Crea una nueva instancia del exportador de PDF.
     * @param {Object} options - Opciones de configuración para el exportador.
     * @param {string} [options.titleFallback='Diseño didáctico'] - Título por defecto del documento.
     * @param {string} [options.appName='Bluegui'] - Nombre de la aplicación.
     * @param {string} [options.documentLang='es'] - Idioma del documento.
     * @param {string} [options.printWindowFeatures='width=1100,height=900,noopener,noreferrer'] - Características de la ventana de impresión.
     * @param {string} [options.modeKey='current_mode'] - Clave para el modo actual en sessionStorage.
     * @param {string} [options.educationTypeKey='current_education_type'] - Clave para el tipo de educación en sessionStorage.
     * @param {string} [options.moduleNameKey='selected_module_name'] - Clave para el nombre del módulo en sessionStorage.
     * @param {string} [options.cssHref='css/pdf_export_styles.css'] - Ruta al archivo CSS para estilos de impresión.
     */
    constructor(options = {}) {
      this.options = {
        titleFallback: 'Diseño didáctico',
        appName: 'Bluegui',
        documentLang: 'es',
        printWindowFeatures: 'width=1100,height=900,noopener,noreferrer',
        modeKey: 'current_mode',
        educationTypeKey: 'current_education_type',
        moduleNameKey: 'selected_module_name',
        cssHref: options.cssHref || 'css/pdf_export_styles.css',
        ...options
      };
    }

    /**
     * Exporta el resumen didáctico a PDF mediante una ventana de impresión personalizada.
     * @param {Object} config - Configuración adicional para la exportación.
     * @returns {Window} Ventana de impresión abierta.
     */
    exportToPdf(config = {}) {
      const state = this.getState();
      if (!state) {
        throw new Error('No hay estado disponible en sessionStorage para exportar.');
      }

      const html = this.buildPrintDocument(state, config);
      const printWindow = window.open('', '_blank', this.options.printWindowFeatures);

      if (!printWindow) {
        throw new Error('El navegador ha bloqueado la ventana de impresión. Permite popups para continuar.');
      }

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      return printWindow;
    }

    /**
     * Descarga una vista previa del resumen didáctico en formato HTML.
     * @param {Object} config - Configuración adicional para la exportación.
     */
    downloadHtmlPreview(config = {}) {
      const state = this.getState();
      if (!state) {
        throw new Error('No hay estado disponible en sessionStorage para exportar.');
      }
      const html = this.buildPrintDocument(state, config);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.slugify(this.getDocumentTitle(state))}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }

    /**
     * Vincula un botón a la acción de exportar el resumen didáctico a PDF.
     * @param {HTMLElement|string} buttonOrSelector - Elemento del botón o selector CSS.
     * @param {Object} config - Configuración adicional para la exportación.
     * @returns {HTMLElement|null} El botón vinculado o null si no se encontró.
     */
    bindButton(buttonOrSelector, config = {}) {
      const btn = typeof buttonOrSelector === 'string'
        ? document.querySelector(buttonOrSelector)
        : buttonOrSelector;

      if (!btn) return null;

      btn.addEventListener('click', () => {
        try {
          this.exportToPdf(config);
        } catch (error) {
          console.error('[SummaryPdfExporter] Error exportando PDF:', error);
          alert(error.message || 'No se ha podido exportar el PDF.');
        }
      });

      return btn;
    }

    /**
     * Obtiene el estado actual del resumen didáctico desde sessionStorage.
     * @returns {Object|null} Estado del resumen didáctico o null si no está disponible.
     */
    getState() {
      if (window.sessionStorageManager && typeof window.sessionStorageManager.getState === 'function') {
        return window.sessionStorageManager.getState();
      }

      try {
        const raw = sessionStorage.getItem('resumen_state');
        return raw ? JSON.parse(raw) : null;
      } catch (error) {
        console.error('[SummaryPdfExporter] No se pudo leer resumen_state:', error);
        return null;
      }
    }

    /**
     * Construye el documento HTML para la impresión o exportación a PDF.
     * @param {Object} state - Estado del resumen didáctico.
     * @param {Object} config - Configuración adicional para la exportación.
     * @returns {string} Documento HTML completo.
     */
    buildPrintDocument(state, config = {}) {
      const title = this.getDocumentTitle(state);
      const subtitle = this.getDocumentSubtitle();
      const filename = this.slugify(title || this.options.titleFallback);
      const body = this.renderDocumentBody(state, config);
      const cssLink = this.options.cssHref
        ? `<link rel="stylesheet" href="${this.escapeHtml(this.options.cssHref)}">`
        : '';

      return `<!DOCTYPE html>
<html lang="${this.escapeHtml(this.options.documentLang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)}</title>
  ${cssLink}
  <style>${this.getEmbeddedCss()}</style>
</head>
<body>
  <div class="pdf-page-shell">
    <header class="pdf-cover-meta no-print-ui">
      <div class="pdf-doc-chip">Exportación PDF</div>
      <div class="pdf-doc-actions">
        <button type="button" class="pdf-action-btn" onclick="window.print()">Guardar / Imprimir PDF</button>
        <button type="button" class="pdf-action-btn secondary" onclick="window.close()">Cerrar</button>
      </div>
    </header>

    <main class="pdf-document resumen-export-root" data-filename="${this.escapeHtml(filename)}">
      <section class="resumen-hero print-avoid-break">
        <div class="hero-topline">${this.escapeHtml(subtitle)}</div>
        <h1>${this.escapeHtml(title)}</h1>
        ${this.renderHeroMeta(state)}
        ${this.renderHeroObjectives(state)}
        ${this.renderHeroDescription(state)}
      </section>
      ${body}
    </main>
  </div>

  <script>
    (function () {
      const title = ${JSON.stringify(title)};
      document.title = title;
      window.addEventListener('load', function () {
        setTimeout(function () {
          try { window.focus(); } catch (e) {}
        }, 150);
      });
    })();
  </script>
</body>
</html>`;
    }

    /**
     * Obtiene el título del documento a partir del estado del resumen didáctico.
     * @param {Object} state - Estado del resumen didáctico.
     * @returns {string} Título del documento.
     */
    getDocumentTitle(state) {
      return this.pickText(state?.titulo?.valor) || this.options.titleFallback;
    }

    /**
     * Obtiene el subtítulo del documento a partir del estado del resumen didáctico.
     * @returns {string} Subtítulo del documento.
     */
    getDocumentSubtitle() {
      const eduType = (sessionStorage.getItem(this.options.educationTypeKey) || '').toUpperCase();
      const mode = (sessionStorage.getItem(this.options.modeKey) || 'ud').toUpperCase();
      const moduleName = sessionStorage.getItem(this.options.moduleNameKey) || '';

      const eduLabel = eduType === 'SEC' ? 'ESO / Bachillerato' : 'Formación Profesional';
      const modeLabel = mode === 'SDA' ? 'Situación de Aprendizaje' : 'Unidad Didáctica';
      return moduleName ? `${modeLabel} - ${moduleName} - ${eduLabel}` : `${modeLabel} - ${eduLabel}`;
    }

    /**
     * Construye el cuerpo del documento a partir del estado del resumen didáctico.
     * @param {Object} state - Estado del resumen didáctico.
     * @returns {string} HTML del cuerpo del documento.
     */
    renderDocumentBody(state) {
      const blocks = [
        this.renderContextualizacion(state),
        this.renderDesafioProducto(state),
        this.renderElementosCurriculares(state),
        this.renderEvaluacion(state),
        this.renderSoftSkills(state),
        this.renderMetodologia(state),
        this.renderSecuenciacion(state),
        this.renderSimpleTextSection('Atención a la Diversidad', this.pickText(state?.atencion_diversidad?.valor || state?.atencion_diversidad)),
        this.renderSimpleTextSection('DUA (Diseño Universal para el Aprendizaje)', this.pickText(state?.dua?.valor || state?.dua)),
        this.renderSimpleTextSection('Orientación', this.pickText(state?.orientacion?.valor || state?.orientacion)),
        this.renderSimpleTextSection('Prospectiva y entorno profesional', this.pickText(state?.prospectiva?.valor || state?.prospectiva)),
        this.renderResourcesSection(state)
      ];

      return blocks.filter(Boolean).join('\n');
    }

    /**
     * Construye la sección de metadatos del héroe a partir del estado del resumen didáctico.
     * @param {Object} state - Estado del resumen didáctico.
     * @returns {string} HTML de la sección de metadatos del héroe.
     */
    renderHeroMeta(state) {
      const trimestre = this.pickText(state?.trimestre?.valor);
      const numero = this.pickText(state?.numero?.valor);
      const items = [
        numero ? `<span class="meta-pill">Diseño ${this.escapeHtml(String(numero))}</span>` : '',
        trimestre ? `<span class="meta-pill">${this.escapeHtml(trimestre)}</span>` : ''
      ].filter(Boolean);

      return items.length ? `<div class="hero-meta">${items.join('')}</div>` : '';
    }

    /**
     * Construye la sección de objetivos del héroe a partir del estado del resumen didáctico.
     * @param {Object} state - Estado del resumen didáctico.
     * @returns {string} HTML de la sección de objetivos del héroe.
     */
    renderHeroObjectives(state) {
      const objetivos = Array.isArray(state?.objetivos?.valor) ? state.objetivos.valor : [];
      if (!objetivos.length) return '';

      return `
        <h3 class="section-subtitle">Objetivos</h3>
        <ul class="pretty-list">
          ${objetivos.map(item => `<li>${this.escapeHtml(this.stringifyItem(item))}</li>`).join('')}
        </ul>`;
    }

    /**
     * Construye la sección de descripción del héroe a partir del estado del resumen didáctico.
     * @param {Object} state - Estado del resumen didáctico.
     * @returns {string} HTML de la sección de descripción del héroe.
     */
    renderHeroDescription(state) {
      const descripcion = this.pickText(state?.descripcion?.valor);
      if (!descripcion) return '';

      return `
        <h3 class="section-subtitle">Descripción</h3>
        <p class="resumen-paragraph">${this.escapeHtml(descripcion)}</p>`;
    }

    /**
     * Construye la sección de contextualización a partir del estado del resumen didáctico.
     * @param {Object} state - Estado del resumen didáctico.
     * @returns {string} HTML de la sección de contextualización.
     */
    renderContextualizacion(state) {
      const ctx = state?.contextualizacion || {};
      const cardsTop = [
        this.infoCard('Justificación', this.pickText(ctx?.justificacion?.valor)),
        this.infoCard('Contexto vida cotidiana', this.pickText(ctx?.contexto_vida?.valor), { visible: !!this.pickText(ctx?.contexto_vida?.valor) }),
        this.infoCard('Centro de interés', this.pickText(ctx?.centro_interes?.valor))
      ].filter(Boolean).join('');

      const ods = this.renderCompactList(ctx?.ods?.valor, ['ods_numer', 'ods_descripcion']);
      const retos = this.renderCompactList(ctx?.retos_xxi?.valor, ['reto_titulo', 'reto_descripcion']);
      const objetivosFp = this.renderCompactList(ctx?.para_fp?.objetivos_generales?.valor, ['obg_id', 'obg_descripcion']);
      const cpps = this.renderCompactList(ctx?.para_fp?.competencias_profesionales?.valor, ['cpps_id', 'cpps_descripcion']);
      const cc = this.renderCompetenciasClave(ctx?.para_eso_bachillerato?.competencias_clave?.cc);

      const grids = [
        cardsTop ? `<div class="grid-3">${cardsTop}</div>` : '',
        (ods || retos) ? `<div class="grid-2">${this.infoCard('ODS', ods, { rawHtml: true })}${this.infoCard('Retos del XXI', retos, { rawHtml: true })}</div>` : '',
        (objetivosFp || cpps) ? `<div class="grid-2">${this.infoCard('Objetivos Generales', objetivosFp, { rawHtml: true })}${this.infoCard('Competencias Profesionales, Personales y Sociales', cpps, { rawHtml: true })}</div>` : '',
        cc ? `<div class="grid-1">${this.infoCard('Competencias clave', cc, { rawHtml: true })}</div>` : ''
      ].filter(Boolean).join('');

      if (!grids) return '';

      return `<section class="resumen-section"><div class="section-header">Contextualización</div>${grids}</section>`;
    }

    /**
     * Construye la sección de desafío y producto final a partir del estado del resumen didáctico.
     * @param {Object} state - Estado del resumen didáctico.
     * @returns {string} HTML de la sección de desafío y producto final.
     */
    renderDesafioProducto(state) {
      const reto = this.pickText(state?.desafio_producto?.reto_desafio?.valor);
      const producto = this.pickText(state?.desafio_producto?.producto_final?.valor);
      if (!reto && !producto) return '';

      return `
        <section class="resumen-section print-avoid-break">
          <div class="section-header">Desafío y producto final</div>
          <div class="grid-2">
            ${this.infoCard('Reto / Desafío', reto)}
            ${this.infoCard('Producto final', producto)}
          </div>
        </section>`;
    }

    /**
     * Construye la sección de elementos curriculares a partir del estado del resumen didáctico.
     * @param {Object} state - Estado del resumen didáctico.
     * @returns {string} HTML de la sección de elementos curriculares.
     */
    renderElementosCurriculares(state) {
      const rows = [];
      const grupos = Array.isArray(state?.elementos_curriculares) ? state.elementos_curriculares : [];

      grupos.forEach(grupo => {
        const ras = Array.isArray(grupo?.ras) ? grupo.ras : [];
        ras.forEach(ra => {
          rows.push([
            `${ra?.ra_id ? this.escapeHtml(ra.ra_id) + '. ' : ''}${this.escapeHtml(this.pickText(ra?.ra_descripcion))}`,
            this.renderCompactList(ra?.ra_ce, ['ce_id', 'ce_descripcion']),
            this.renderBloquesList(ra?.ra_contenidos)
          ]);
        });
      });

      if (!rows.length) return '';

      return this.renderTableSection('Elementos curriculares', ['RA', 'CE', 'Contenidos'], rows, { widths: ['23%', '35%', '42%'] });
    }

    /**
     * Construye la sección de evaluación a partir del estado del resumen didáctico.
     * @param {Object} state - Estado del resumen didáctico.
     * @returns {string} HTML de la sección de evaluación.
     */
    renderEvaluacion(state) {
      const rows = [];
      const grupos = Array.isArray(state?.elementos_curriculares) ? state.elementos_curriculares : [];

      grupos.forEach(grupo => {
        const ras = Array.isArray(grupo?.ras) ? grupo.ras : [];
        ras.forEach(ra => {
          rows.push([
            `${ra?.ra_id ? this.escapeHtml(ra.ra_id) + '. ' : ''}${this.escapeHtml(this.pickText(ra?.ra_descripcion))}`,
            this.renderCompactList(ra?.ra_ce, ['ce_id', 'ce_descripcion']),
            this.escapeHtml(this.pickText(ra?.ra_metodo?.valor)),
            this.escapeHtml(this.pickText(ra?.ra_evaluador?.valor))
          ]);
        });
      });

      if (!rows.length) return '';

      return this.renderTableSection('Evaluación', ['RA', 'CE', 'Método', 'Evaluador'], rows, { widths: ['22%', '40%', '18%', '20%'] });
    }

    /**
     * Construye la sección de habilidades blandas a partir del estado del resumen didáctico.
     * @param {Object} state - Estado del resumen didáctico.
     * @returns {string} HTML de la sección de habilidades blandas.
     */
    renderSoftSkills(state) {
      const rows = [];
      const bloques = Array.isArray(state?.soft_skills) ? state.soft_skills : [];

      bloques.forEach(block => {
        const skills = Array.isArray(block?.skill) ? block.skill : [];
        skills.forEach(skill => {
          rows.push([
            this.escapeHtml(this.pickText(skill?.sk_descripcion)),
            this.escapeHtml(this.pickText(skill?.sk_metodo?.valor)),
            this.escapeHtml(this.pickText(skill?.sk_agente?.valor))
          ]);
        });
      });

      if (!rows.length) return '';
      return this.renderTableSection('Soft Skills', ['Título', 'Método', 'Agente'], rows, { widths: ['54%', '23%', '23%'] });
    }

      /**
       * Construye la sección de metodología a partir del estado del resumen didáctico.
       * @param {Object} state - Estado del resumen didáctico.
       * @returns {string} HTML de la sección de metodología.
       */
    renderMetodologia(state) {
      const rows = [];
      const metodologias = Array.isArray(state?.metodologia?.metodologias_aplicadas)
        ? state.metodologia.metodologias_aplicadas
        : [];

      metodologias.forEach(item => {
        rows.push([
          this.escapeHtml(this.pickText(item?.metodologia_titulo)),
          this.escapeHtml(this.pickText(item?.metodologia_descripcion)),
          this.escapeHtml(this.pickText(item?.metodologia_sugerencia))
        ]);
      });

      if (!rows.length) return '';
      return this.renderTableSection('Metodología', ['Metodologías activas', 'Descripción', 'Sugerencias'], rows, { widths: ['26%', '44%', '30%'] });
    }

    /**
     * Construye la sección de secuenciación didáctica a partir del estado del resumen didáctico.
     * @param {Object} state - Estado del resumen didáctico.
     * @returns {string} HTML de la sección de secuenciación didáctica.
     */
    renderSecuenciacion(state) {
      const rows = [];
      const actividades = Array.isArray(state?.secuenciacion_didactica)
        ? state.secuenciacion_didactica
        : [];

        // Se construye una tabla con las actividades secuenciadas, mostrando número, título, descripción, método de agrupamiento y agente responsable. Cada actividad se formatea para mostrar el título en negrita y la descripción como texto secundario debajo del título.
      actividades.forEach(item => {
        const numero = this.pickText(item?.sd_numero_actividad?.sd_valor);
        const titulo = this.pickText(item?.sd_actividad?.sd_titulo?.valor);
        const descripcion = this.pickText(item?.sd_actividad?.sd_descripcion?.valor);
        const actividadHtml = [titulo ? `<strong>${this.escapeHtml(titulo)}</strong>` : '', descripcion ? `<div class="cell-subtext">${this.escapeHtml(descripcion)}</div>` : '']
          .filter(Boolean).join('');

        rows.push([
          this.escapeHtml(String(numero || '')),
          actividadHtml,
          this.escapeHtml(this.pickText(item?.sd_metodo?.valor)),
          this.escapeHtml(this.pickText(item?.sd_agente?.valor))
        ]);
      });

      if (!rows.length) return '';
      return this.renderTableSection('Secuenciación didáctica', ['#', 'Actividades', 'Agrupamiento / Método', 'Agente'], rows, { widths: ['8%', '54%', '22%', '16%'] });
    }

    /**
     * Construye una sección de texto simple a partir del título y el valor proporcionados.
     * @param {string} title - Título de la sección.
     * @param {string} value - Valor de la sección.
     * @returns {string} HTML de la sección de texto simple.
     */
    renderSimpleTextSection(title, value) {
      if (!value) return '';
      return `<section class="resumen-section print-avoid-break"><div class="section-header">${this.escapeHtml(title)}</div>${this.infoCard('', value)}</section>`;
    }

    /**
     * Construye la sección de recursos a partir del estado del resumen didáctico.
     * @param {Object} state - Estado del resumen didáctico.
     * @returns {string} HTML de la sección de recursos.
     */
    renderResourcesSection(state) {
      const recursos = state?.recursos;
      if (!recursos) return '';

      let content = '';
      if (Array.isArray(recursos?.valor) && recursos.valor.length) {
        content = `<ul class="pretty-list">${recursos.valor.map(item => `<li>${this.escapeHtml(this.stringifyItem(item))}</li>`).join('')}</ul>`;
      } else {
        content = this.escapeHtml(this.pickText(recursos?.valor || recursos));
      }

      if (!content) return '';
      return `<section class="resumen-section print-avoid-break"><div class="section-header">Recursos</div>${this.infoCard('', content, { rawHtml: true })}</section>`;
    }

    /**
     * Construye una sección de tabla a partir del título, encabezados, filas y opciones proporcionadas.
     * @param {string} title - Título de la sección.
     * @param {Array<string>} headers - Encabezados de la tabla.
     * @param {Array<Array<string>>} rows - Filas de la tabla.
     * @param {Object} options - Opciones adicionales para la tabla.
     * @param {Array<string>} options.widths - Anchos de las columnas.
     * @returns {string} HTML de la sección de tabla.
     */
    renderTableSection(title, headers, rows, options = {}) {
      return `
        <section class="resumen-section">
          <div class="section-header">${this.escapeHtml(title)}</div>
          <div class="table-wrap">
            <table class="nice-table">
              ${options.widths ? `<colgroup>${options.widths.map(w => `<col style="width:${w}">`).join('')}</colgroup>` : ''}
              <thead>
                <tr>${headers.map(h => `<th>${this.escapeHtml(h)}</th>`).join('')}</tr>
              </thead>
              <tbody>
                ${rows.map(row => `<tr>${row.map(cell => `<td>${cell || ''}</td>`).join('')}</tr>`).join('')}
              </tbody>
            </table>
          </div>
        </section>`;
    }

    /**
     * Construye una lista compacta a partir de los elementos y campos proporcionados.
     * @param {Array<Object>} items - Elementos a mostrar en la lista.
     * @param {Array<string>} fields - Campos a mostrar de cada elemento.
     * @returns {string} HTML de la lista compacta.
     */
    renderCompactList(items, fields) {
      if (!Array.isArray(items) || !items.length) return '';
      const list = items
        .map(item => this.stringifyByFields(item, fields))
        .filter(Boolean);
      if (!list.length) return '';
      return `<ul class="compact-list">${list.map(text => `<li>${this.escapeHtml(text)}</li>`).join('')}</ul>`;
    }

    /**
     * Construye una lista de bloques a partir de los elementos proporcionados.
     * @param {Array<Object>} items - Bloques a mostrar en la lista.
     * @returns {string} HTML de la lista de bloques.
     */
    renderBloquesList(items) {
      if (!Array.isArray(items) || !items.length) return '';
      const parts = items.map(block => {
        const title = this.stringifyByFields(block, ['bloque_id', 'bloque_descripcion']);
        const puntos = Array.isArray(block?.bloque_puntos) ? block.bloque_puntos : [];
        const puntosHtml = puntos.length
          ? `<ul class="compact-sublist">${puntos.map(p => `<li>${this.escapeHtml(this.stringifyByFields(p, ['punto_id', 'punto_descripcion']))}</li>`).join('')}</ul>`
          : '';
        return `<div class="stacked-block"><div class="stacked-title">${this.escapeHtml(title)}</div>${puntosHtml}</div>`;
      });
      return parts.join('');
    }

    /**
     * Construye una lista de competencias clave a partir de los elementos proporcionados.
     * @param {Array<Object>} items - Competencias clave a mostrar en la lista.
     * @returns {string} HTML de la lista de competencias clave.
     */
    renderCompetenciasClave(items) {
      if (!Array.isArray(items) || !items.length) return '';
      return items.map(item => {
        const title = this.stringifyByFields(item, ['cc_id', 'cc_descripcion']);
        const descriptores = Array.isArray(item?.cc_descriptores) ? item.cc_descriptores : [];
        const list = descriptores.map(d => d?.ccd_descripcion_eso || d?.ccd_descripcion_bachillerato).filter(Boolean);
        return `
          <div class="stacked-block">
            <div class="stacked-title">${this.escapeHtml(title)}</div>
            ${list.length ? `<ul class="compact-sublist">${list.map(text => `<li>${this.escapeHtml(text)}</li>`).join('')}</ul>` : ''}
          </div>`;
      }).join('');
    }

    /**
     * Construye una tarjeta de información a partir del título, contenido y opciones proporcionadas.
     * @param {string} title - Título de la tarjeta.
     * @param {string} content - Contenido de la tarjeta.
     * @param {Object} options - Opciones adicionales para la tarjeta.
     * @param {boolean} options.visible - Indica si la tarjeta debe ser visible.
     * @param {boolean} options.rawHtml - Indica si el contenido debe interpretarse como HTML sin escapar.
     * @returns {string} HTML de la tarjeta de información.
     */
    infoCard(title, content, options = {}) {
      const { visible = true, rawHtml = false } = options;
      if (!visible) return '';
      const safeContent = rawHtml ? (content || '') : this.escapeHtml(content || '');
      if (!title && !safeContent) return '';
      return `
        <div class="info-card print-avoid-break">
          ${title ? `<h4>${this.escapeHtml(title)}</h4>` : ''}
          <div class="info-card-content">${safeContent || '<span class="empty-placeholder">-</span>'}</div>
        </div>`;
    }

    /**
     * Construye una cadena a partir de los campos proporcionados de un elemento.
     * @param {Object} item - Elemento del cual extraer los campos.
     * @param {Array<string>} fields - Campos a extraer del elemento.
     * @returns {string} Cadena construida a partir de los campos proporcionados.
     */
    stringifyByFields(item, fields) {
      if (!item || typeof item !== 'object') return this.pickText(item);
      const values = fields.map(field => this.pickText(item?.[field])).filter(Boolean);
      if (!values.length) return '';
      return values.join(' - ');
    }

    /**
     * Construye una cadena a partir de un elemento, manejando diferentes tipos de datos.
     * @param {*} item - Elemento a convertir en cadena.
     * @returns {string} Cadena construida a partir del elemento.
     */
    stringifyItem(item) {
      if (typeof item === 'string') return item;
      if (item == null) return '';
      if (typeof item !== 'object') return String(item);
      const preferredKeys = Object.keys(item).filter(k => !['candado', 'editable', 'opciones', 'desde_menu'].includes(k));
      const parts = preferredKeys.map(k => {
        const value = item[k];
        if (Array.isArray(value)) {
          return value.map(v => this.stringifyItem(v)).filter(Boolean).join(' · ');
        }
        if (value && typeof value === 'object') {
          return this.stringifyItem(value);
        }
        return this.pickText(value);
      }).filter(Boolean);
      return parts.join(' - ');
    }

    /**
     * Extrae y devuelve el texto de un valor, manejando diferentes tipos de datos.
     * @param {*} value - Valor del cual extraer el texto.
     * @returns {string} Texto extraído del valor.
     */
    pickText(value) {
      if (value == null) return '';
      if (typeof value === 'string') return value.trim();
      if (typeof value === 'number' || typeof value === 'boolean') return String(value);
      return '';
    }

    /**
     * Convierte un texto en un slug adecuado para URLs.
     * @param {string} text - Texto a convertir en slug.
     * @returns {string} Slug generado a partir del texto.
     */
    slugify(text) {
      return (text || this.options.titleFallback)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'resumen-pdf';
    }

    /**
     * Escapa caracteres especiales en un valor para evitar la interpretación como HTML.
     * @param {*} value - Valor a escapar.
     * @returns {string} Valor escapado como HTML.
     */
    escapeHtml(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/\n/g, '<br>');
    }

    /**
     * Devuelve el CSS embebido para el PDF.
     * @returns {string} CSS embebido.
     */
    getEmbeddedCss() {
      return `
:root {
  --pdf-accent: #2f5597;
  --pdf-accent-soft: #eaf0fb;
  --pdf-text: #1f2937;
  --pdf-muted: #5b6575;
  --pdf-border: #cfd6e4;
  --pdf-surface: #ffffff;
  --pdf-surface-alt: #f7f9fc;
  --pdf-section: #eef3fb;
  --pdf-shadow: none;
  --pdf-page-width: 210mm;
  --pdf-content-width: 182mm;
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: Calibri, 'Segoe UI', Arial, sans-serif;
  color: var(--pdf-text);
  background: #eef1f6;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.pdf-page-shell { padding: 22px; }
.pdf-cover-meta {
  max-width: var(--pdf-page-width);
  margin: 0 auto 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.pdf-doc-chip {
  font-size: 12px;
  letter-spacing: .03em;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--pdf-accent);
}
.pdf-doc-actions { display: flex; gap: 10px; }
.pdf-action-btn {
  border: 1px solid #d3d9e6;
  background: white;
  color: #1f2937;
  padding: 10px 14px;
  border-radius: 8px;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}
.pdf-action-btn.secondary { background: #f8fafc; }
.pdf-document {
  width: var(--pdf-page-width);
  max-width: 100%;
  margin: 0 auto;
  background: white;
  padding: 18mm 14mm 16mm;
  box-shadow: 0 16px 40px rgba(15,23,42,.08);
}
.resumen-hero {
  margin-bottom: 18px;
  border-bottom: 1px solid var(--pdf-border);
  padding-bottom: 12px;
}
.hero-topline {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--pdf-accent);
  font-weight: 700;
  margin-bottom: 10px;
}
.resumen-hero h1 {
  margin: 0 0 10px;
  font-size: 23pt;
  line-height: 1.15;
  color: #16325c;
  font-weight: 700;
}
.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.meta-pill {
  display: inline-block;
  padding: 6px 10px;
  border: 1px solid #d7deeb;
  background: #f8fbff;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: #41546f;
}
.section-subtitle {
  margin: 14px 0 8px;
  color: #26406d;
  font-size: 12.5pt;
  font-weight: 700;
}
.resumen-paragraph,
.info-card-content,
.nice-table td,
.compact-list,
.compact-sublist {
  font-size: 10.7pt;
  line-height: 1.45;
}
.pretty-list,
.compact-list,
.compact-sublist {
  margin: 0;
  padding-left: 20px;
}
.pretty-list li,
.compact-list li,
.compact-sublist li { margin-bottom: 4px; }
.resumen-section { margin-top: 18px; }
.section-header {
  display: inline-block;
  width: 100%;
  padding: 8px 12px;
  background: var(--pdf-section);
  border-left: 4px solid var(--pdf-accent);
  color: #173562;
  font-size: 12pt;
  font-weight: 700;
  margin-bottom: 12px;
}
.grid-1, .grid-2, .grid-3 {
  display: grid;
  gap: 12px;
  margin-bottom: 12px;
}
.grid-1 { grid-template-columns: 1fr; }
.grid-2 { grid-template-columns: repeat(2, 1fr); }
.grid-3 { grid-template-columns: repeat(3, 1fr); }
.info-card {
  border: 1px solid var(--pdf-border);
  background: var(--pdf-surface);
  padding: 11px 12px;
  min-height: 100%;
}
.info-card h4 {
  margin: 0 0 8px;
  font-size: 11.1pt;
  color: #233b63;
}
.empty-placeholder { color: #8b95a7; }
.table-wrap { width: 100%; overflow: visible; }
.nice-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  border: 1px solid var(--pdf-border);
}
.nice-table thead th {
  background: #f3f6fb;
  color: #213a63;
  font-size: 10.4pt;
  font-weight: 700;
  text-align: left;
  border: 1px solid var(--pdf-border);
  padding: 8px 9px;
}
.nice-table td {
  vertical-align: top;
  border: 1px solid var(--pdf-border);
  padding: 8px 9px;
  color: var(--pdf-text);
  word-wrap: break-word;
}
.nice-table tr:nth-child(even) td { background: #fbfcfe; }
.cell-subtext {
  margin-top: 6px;
  color: var(--pdf-muted);
  font-size: 9.8pt;
}
.stacked-block + .stacked-block { margin-top: 8px; }
.stacked-title {
  font-weight: 700;
  color: #28466f;
  margin-bottom: 4px;
}
.print-avoid-break { break-inside: avoid; page-break-inside: avoid; }
@page {
  size: A4;
  margin: 12mm;
}
@media print {
  body { background: white; }
  .pdf-page-shell { padding: 0; }
  .pdf-document {
    width: auto;
    box-shadow: none;
    margin: 0;
    padding: 0;
  }
  .no-print-ui { display: none !important; }
  .resumen-section,
  .info-card,
  .table-wrap,
  table,
  tr,
  td,
  th { break-inside: avoid; page-break-inside: avoid; }
}
@media screen and (max-width: 900px) {
  .grid-2, .grid-3 { grid-template-columns: 1fr; }
  .pdf-document { padding: 24px 20px; }
  .pdf-page-shell { padding: 12px; }
  .pdf-cover-meta { flex-direction: column; align-items: stretch; }
}
      `;
    }
  }

  window.SummaryPdfExporter = SummaryPdfExporter;
})();
