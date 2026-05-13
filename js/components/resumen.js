/**
 * Componente Resumen - Vista de resumen que renderiza desde sessionStorage
 * Adaptado a la nueva plantilla exacta de data/resumen_fp.json
 */

/**
 * Clase ResumenComponent que maneja la vista de resumen, cargando datos desde sessionStorage y renderizando la vista completa. Incluye métodos para sincronizar con el store global, manejar eventos de edición inline, candados, popups, y más.
 */
class ResumenComponent {
    /**
     * Constructor de la clase ResumenComponent
     * - Inicializa propiedades del componente
     * - Asigna el StorageManager de sessionStorage para manejar el estado vivo
     * - Llama al método init() para cargar datos, vincular eventos y renderizar la vista
     * Incluye logs detallados para depuración en cada paso del proceso de inicialización, lo que puede ayudar a identificar problemas con la carga de datos, vinculación de eventos o renderizado. También maneja errores críticos durante la inicialización para evitar que el componente quede en un estado inconsistente.
     */
    constructor() {
        console.log('Iniciando constructor de ResumenComponent...');
        this.data = null;
        this.isSecundaria = false;
        this.currentEditingElement = null;
        this.storageManager = window.sessionStorageManager;
        console.log('StorageManager asignado:', !!this.storageManager);
        this.init();
    }

    /**
     * Inicializa el componente
     * - Carga datos desde plantilla JSON adaptada a nueva estructura
     * - Inicializa estado vivo en sessionStorage usando StorageManager
     * - Vincula eventos para edición, candados, popups, etc.
     * - Renderiza la vista completa desde sessionStorage
     * Incluye manejo de errores para cada paso y logs detallados para depuración
     */
    async init() {
        console.log('Iniciando init() del ResumenComponent...');
        try {
            await this.loadData();
            console.log('loadData() completado, datos cargados:', !!this.data);
            this.bindEvents();
            console.log('bindEvents() completado');
            this.render();
            console.log('render() completado');
        } catch (error) {
            console.error('Error en init():', error);
        }
    }

    /**
     * Carga plantilla JSON e inicializa estado vivo en sessionStorage
     * - Determina tipo de educación para cargar plantilla correcta
     * - Carga datos desde archivo JSON adaptado a nueva estructura
     * - Inicializa estado vivo en sessionStorage usando StorageManager con la plantilla cargada
     * Incluye manejo de errores para la carga de datos y logs detallados para depuración en caso de problemas con la carga o inicialización del estado.
     */
    async loadData() {
        try {
            // Determinar tipo de educación
            const eduLevelText = document.getElementById('eduLevelText');
            this.isSecundaria = eduLevelText && eduLevelText.textContent.includes('Secundaria');

            // Guardar tipo educativo actual para reseteos
            sessionStorage.setItem('current_education_type', this.isSecundaria ? 'secundaria' : 'fp');

            const fileName = this.isSecundaria ? 'resumen_secundaria.json' : 'resumen_fp.json';
            const response = await fetch(`data/${fileName}`);
            if (!response.ok) {
                throw new Error(`Failed to load ${fileName}: ${response.status}`);
            }
            const templateData = await response.json();

            // Inicializar estado vivo en sessionStorage desde plantilla
            this.data = await this.storageManager.initializeFromTemplate(templateData);

            console.log('Estado inicializado desde nueva plantilla en sessionStorage:', this.data);
        } catch (error) {
            console.error('Error loading resumen data:', error);
            this.data = this.getDefaultData();
        }
    }

    /**
     * Sincroniza datos del store global con sessionStorage
     * - Escucha cambios en el store global (ej. selecciones en modales) y actualiza sessionStorage usando StorageManager
     * - Después de actualizar sessionStorage, recarga datos desde sessionStorage para asegurar que la vista se renderice con los datos más recientes
     * Incluye manejo de errores para la sincronización y logs detallados para depuración en caso de problemas con la actualización de datos o renderizado después de cambios en el store global.
     */
    syncWithStore() {
        if (window.store && window.store.getState) {
            const storeState = window.store.getState();
            const modalSelections = storeState.modalSelections || {};

            // Sincronizar selecciones globales con sessionStorage usando los nuevos métodos
            Object.keys(modalSelections).forEach(key => {
                if (modalSelections[key]) {
                    this.storageManager.updateMenuSelection(key, modalSelections[key]);
                }
            });

            // Recargar datos desde sessionStorage actualizado
            this.data = this.storageManager.getState();
        }
    }

    /**
     * Retorna datos por defecto en caso de error
     * - Proporciona una estructura de datos mínima para evitar errores críticos en el renderizado si la carga de datos falla
     * Incluye logs para indicar que se están usando datos por defecto debido a un error en la carga de datos, lo que puede ayudar a identificar problemas con los archivos JSON o la inicialización del estado.
     */
    getDefaultData() {
        return {
            numero: { valor: 1, editable: true },
            trimestre: { valor: "1º Trimestre", opciones: ["1º Trimestre", "2º Trimestre", "3º Trimestre"], editable: true },
            titulo: { valor: "", editable: true, candado: false },
            objetivos: { valor: [], editable: true, candado: false },
            descripcion: { valor: "", editable: true, candado: false }
        };
    }

    /**
     * Vincula eventos del componente
     * - Utiliza delegación de eventos para manejar interacciones en elementos dinámicos (ej. edición inline, candados, popups, botones de añadir/eliminar en listas, etc.)
     * - Escucha cambios en dropdowns para actualizar datos y re-renderizar
     * - Escucha cambios en el store global para sincronizar datos y re-renderizar
     * - Incluye manejo de errores para la vinculación de eventos y logs detallados para depuración en caso de problemas con la interacción del usuario o actualización de datos después de eventos.
     */
    bindEvents() {
        // Delegación de eventos para el contenedor
        const container = document.getElementById('resumen-content');
        if (!container) return;

        // Eventos para elementos dinámicos usando delegación
        container.addEventListener('click', (e) => {
            // Edición inline
            if (e.target.classList.contains('editable-element') || e.target.closest('.editable-element')) {
                const element = e.target.classList.contains('editable-element') ? e.target : e.target.closest('.editable-element');
                this.handleEditableClick(element);
            }

            // Candados
            if (e.target.classList.contains('lock-icon') || e.target.closest('.lock-icon')) {
                const lockIcon = e.target.classList.contains('lock-icon') ? e.target : e.target.closest('.lock-icon');
                this.handleLockToggle(lockIcon);
            }

            // Celdas clickeables para popups
            if (e.target.classList.contains('clickable-cell') || e.target.closest('.clickable-cell')) {
                const cell = e.target.classList.contains('clickable-cell') ? e.target : e.target.closest('.clickable-cell');
                this.handleClickableCell(cell);
            }

            // Botones de añadir/eliminar en listas
            if (e.target.classList.contains('add-item-btn')) {
                this.handleAddListItem(e.target);
            }

            // Eliminar item de lista
            if (e.target.classList.contains('remove-item')) {
                this.handleRemoveListItem(e.target);
            }

            // Botón nueva actividad
            if (e.target.classList.contains('add-activity-btn')) {
                this.handleAddActivity();
            }

            // Botón Convertir a PDF
            //if (e.target.classList.contains('pdf-export-btn')) {
            //    this.handlePDFExport();
            //}
            // Botón Convertir a PDF
            const pdfBtn = e.target.closest('.pdf-export-btn');
            if (pdfBtn) {
                this.handlePDFExport();
                return;
            }

            // Botón Exportar Word
            const wordBtn = e.target.closest('.word-export-btn');
            if (wordBtn) {
                this.handleWordExport();
                return;
            }

            // Botón Borrar Todo
            if (e.target.classList.contains('force-reset-btn')) {
                this.handleForceReset();
            }

            // Botón IA
            if (e.target.classList.contains('ai-btn')) {
                this.handleAIButton(e.target);
            }

            // Botón eliminar actividad
            if (e.target.classList.contains('remove-activity-btn')) {
                this.handleRemoveActivity(e.target);
            }

            // Botones de reordenación
            if (e.target.classList.contains('move-up-btn')) {
                this.handleMoveActivityUp(e.target);
            }

            if (e.target.classList.contains('move-down-btn')) {
                this.handleMoveActivityDown(e.target);
            }
        });

        // Eventos para dropdowns
        container.addEventListener('change', (e) => {
            if (e.target.classList.contains('dropdown-element')) {
                this.handleDropdownChange(e.target);
            }
        });

        // Listener para cambios de tipo educativo
        const eduSelector = document.getElementById('eduLevelButton');
        if (eduSelector) {
            new MutationObserver(() => {
                this.handleEducationChange();
            }).observe(eduSelector, { childList: true, subtree: true });
        }

        // Listener para cambios en el switch SdA/UD
        const modeToggle = document.getElementById('modeToggle');
        if (modeToggle) {
            new MutationObserver(() => {
                this.handleModeToggleChange();
            }).observe(modeToggle, { attributes: true, attributeFilter: ['class'] });
        }

        // Listener para cambios en el store global
        if (window.store && window.store.subscribe) {
            window.store.subscribe((state) => {
                if (state.modalSelections) {
                    this.syncWithStore();
                    this.render();
                }
            });
        }

        // Listeners para cambios de módulo/asignatura que requieren reset
        document.addEventListener('moduleChange', () => {
            this.handleModuleChange();
        });

        // Listener para cambios de asignatura que requieren reset
        document.addEventListener('subjectChange', () => {
            this.handleSubjectChange();
        });

        //este listener de la clase ResumenComponent
        document.addEventListener('sessionStateUpdated', (e) => {
            console.log('🔄 Cambio detectado en sessionStorage, actualizando vista resumen...', e.detail.path);
            //this.render(); // Re-renderiza todo el componente con los nuevos datos
            setTimeout(() => {
                this.render();
            }, 10);
        });
    }

    /**
     * Renderiza la vista completa desde sessionStorage
     * - Obtiene datos frescos de sessionStorage usando StorageManager para asegurar que siempre se renderice con los datos más recientes
     * - Genera el HTML completo de la vista usando los métodos de renderizado para cada sección
     * - Inserta el HTML generado en el contenedor de la vista
     * Incluye manejo de errores para el proceso de renderizado y logs detallados para depuración en caso de problemas con la generación del HTML o inserción en el DOM.
     */
    render() {
        console.log('=== RENDER ===');
        const container = document.getElementById('resumen-content');
        console.log('Container encontrado para render:', !!container);

        if (!container) {
            console.error('Container not found en render()');
            return;
        }

        // Siempre obtener datos frescos de sessionStorage
        this.data = this.storageManager.getState();
        console.log('Datos obtenidos de sessionStorage:', !!this.data);

        if (!this.data) {
            console.error('No data in sessionStorage');
            return;
        }

        console.log('Generando HTML...');
        const html = this.generateHTML();
        console.log('HTML generado, longitud:', html.length);

        container.innerHTML = html;
        console.log('✅ Vista renderizada desde sessionStorage');
    }

    /**
     * Genera el HTML completo de la vista
     * - Utiliza los métodos de renderizado para cada sección (cabecera, contextualización, desafío/producto, elementos curriculares, etc.) para construir el HTML completo
     * - Incluye manejo de errores para cada sección crítica y logs detallados para depuración en caso de problemas con la generación del HTML de secciones específicas o la construcción del HTML completo.
     * - Si ocurre un error crítico durante la generación del HTML, devuelve un mensaje de error amigable en lugar de la vista, con detalles para ayudar a identificar el problema.
     */
    generateHTML() {
        try {
            console.log('Iniciando generateHTML...');

            // Validar que tenemos datos válidos
            if (!this.data || Object.keys(this.data).length === 0) {
                throw new Error('No hay datos para renderizar');
            }

            const toolbar = this.renderToolbar();
            const cabecera = this.renderCabecera();

            // Validar que las secciones críticas se renderizaron
            if (!toolbar || !cabecera) {
                throw new Error('Error renderizando secciones básicas');
            }

            const html = `
                <div class="resumen-container">
                    ${toolbar}
                    ${cabecera}
                    ${this.renderContextualizacion() || '<div class="error">Error en contextualización</div>'}
                    ${this.renderDesafioProducto() || '<div class="error">Error en desafío/producto</div>'}
                    ${this.renderElementosCurriculares() || '<div class="error">Error en elementos curriculares</div>'}
                    ${this.renderSoftSkills() || '<div class="error">Error en soft skills</div>'}
                    ${this.renderMetodologia() || '<div class="error">Error en metodología</div>'}
                    ${this.renderSecuenciacionDidactica() || '<div class="error">Error en secuenciación</div>'}
                    ${this.renderAtencionDiversidad() || '<div class="error">Error en atención diversidad</div>'}
                    ${this.renderDUA() || '<div class="error">Error en DUA</div>'}
                </div>
            `;

            console.log('HTML completo generado correctamente');
            return html;
        } catch (error) {
            console.error('Error crítico en generateHTML:', error);
            return `
                <div class="error-container">
                    <h2>Error al generar la vista</h2>
                    <p>Detalle: ${error.message}</p>
                    <p>Por favor, revisa los datos en sessionStorage o reinicia el estado.</p>
                    <button onclick="window.resumenComponent?.handleForceReset()" class="btn btn-warning">
                        Reiniciar Estado
                    </button>
                </div>
            `;
        }
    }

    /**
     * Renderiza la barra de herramientas superior
     * - Incluye botones para exportar a PDF, exportar a Word, y borrar todo (reset forzado)
     * - Aplica estilos modernos y consistentes con la nueva plantilla, utilizando gradientes, sombras, y transiciones para mejorar la experiencia de usuario
     * - Incluye manejo de errores para la generación del HTML de la barra de herramientas y logs detallados para depuración en caso de problemas con la generación o estilos de los botones.
     * - Si ocurre un error crítico durante la generación de la barra de herramientas, devuelve un mensaje de error amigable en lugar de los botones, con detalles para ayudar a identificar el problema.
     */
    renderToolbar() {
        return `
            <style>
                .resumen-toolbar-top {
                    padding: 16px 24px;
                    background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
                    border-bottom: 1px solid var(--border-color);
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    margin-bottom: 20px;
                }
                .pdf-export-btn {
                    background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 2px 4px rgba(231, 76, 60, 0.2);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .pdf-export-btn:hover {
                    background: linear-gradient(135deg, #c0392b 0%, #a93226 100%);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 8px rgba(231, 76, 60, 0.3);
                }
                .pdf-export-btn:active {
                    transform: translateY(0);
                    box-shadow: 0 2px 4px rgba(231, 76, 60, 0.2);
                }
                .force-reset-btn {
                    background: linear-gradient(135deg, #e67e22 0%, #d35400 100%);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 2px 4px rgba(230, 126, 34, 0.2);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-right: 12px;
                }
                .force-reset-btn:hover {
                    background: linear-gradient(135deg, #d35400 0%, #ba4a00 100%);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 8px rgba(230, 126, 34, 0.3);
                }
                .force-reset-btn:active {
                    transform: translateY(0);
                    box-shadow: 0 2px 4px rgba(230, 126, 34, 0.2);
                }
                .ai-btn {
                    background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
                    color: white;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    margin-left: 8px;
                }
                .ai-btn:hover {
                    background: linear-gradient(135deg, #8e44ad 0%, #7d3c98 100%);
                    transform: translateY(-1px);
                }
                .ai-btn:active {
                    transform: translateY(0);
                }
                .activity-controls {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    min-width: 80px;
                }
                .remove-activity-btn, .move-up-btn, .move-down-btn {
                    padding: 4px 8px;
                    border: none;
                    border-radius: 4px;
                    font-size: 11px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .remove-activity-btn {
                    background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                    color: white;
                }
                .move-up-btn, .move-down-btn {
                    background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                    color: white;
                }
                .remove-activity-btn:hover {
                    background: linear-gradient(135deg, #c0392b 0%, #a93226 100%);
                }
                .move-up-btn:hover, .move-down-btn:hover {
                    background: linear-gradient(135deg, #2980b9 0%, #2471a3 100%);
                }
                .compact-select {
                    width: 120px;
                    padding: 4px 6px;
                    font-size: 12px;
                }
                .selected-items-container {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    width: 100%;
                }
                .selected-items {
                    flex: 1;
                }
                /* Estilos para elementos complejos */
                .ods-item {
                    margin-bottom: 8px;
                    padding: 8px;
                    border: 1px solid #e0e0e0;
                    border-radius: 4px;
                    background-color: #f9f9f9;
                }
                .ods-header {
                    margin-bottom: 4px;
                }
                .ods-metas {
                    font-size: 0.9em;
                    color: #666;
                }
                .meta-item {
                    display: block;
                    margin: 2px 0;
                }
                .reto-item {
                    margin-bottom: 8px;
                    padding: 8px;
                    border: 1px solid #e0e0e0;
                    border-radius: 4px;
                    background-color: #f9f9f9;
                }
                .reto-id, .reto-titulo, .reto-descripcion {
                    display: block;
                    margin: 2px 0;
                }
                .reto-titulo {
                    font-weight: bold;
                }
                .cc-item {
                    margin-bottom: 8px;
                    padding: 8px;
                    border: 1px solid #e0e0e0;
                    border-radius: 4px;
                    background-color: #f9f9f9;
                }
                .cc-header {
                    margin-bottom: 4px;
                }
                .cc-descriptores {
                    font-size: 0.9em;
                    color: #666;
                }
                .ccd-item {
                    display: block;
                    margin: 2px 0;
                }
                .word-export-btn {
                    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    margin-right: 12px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
                    transition: all 0.2s ease;
                }

                .word-export-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4);
                }

                .word-export-btn:active {
                    transform: translateY(0);
                }
            </style>
            <div class="resumen-toolbar-top">
                <button class="force-reset-btn" type="button">
                    🗑️ Borrar Todo
                </button>
                <button id="exportWordBtn" class="word-export-btn" type="button">
                    📝 Exportar Word
                </button>
                <button id="exportPdfBtn" class="pdf-export-btn" type="button">
                    📄 Convertir a PDF
                </button>
            </div>
        `;
    }

    /**
     * Renderiza la cabecera (información general) adaptada a nueva plantilla
     * - Muestra número, trimestre, título, objetivos y descripción
     * - Aplica estilos modernos y consistentes con la nueva plantilla, utilizando gradientes, sombras, y transiciones para mejorar la experiencia de usuario
     * - Incluye manejo de errores para la generación del HTML de la cabecera y logs detallados para depuración en caso de problemas con la generación o estilos de los elementos.
     * - Si ocurre un error crítico durante la generación de la cabecera, devuelve un mensaje de error amigable en lugar de la sección, con detalles para ayudar a identificar el problema.
     */
    renderCabecera() {
        if (!this.data.numero || !this.data.trimestre || !this.data.titulo) return '';

        return `
            <div class="section-card">
                <div class="resumen-toolbar">
                    <div class="resumen-title">
                        <h2 class="tab-title">Vista Previa -
                            <span class="mode-label">${this.isSdAActive() ? 'SdA' : 'UD'}</span>
                            <span class="editable-element inline-edit number-edit"
                                  data-field="numero.valor"
                                  data-locked="false">${this.data.numero.valor}</span>
                        </h2>
                    </div>
                    <div class="resumen-right">
                        <select class="dropdown-element" data-field="trimestre.valor">
                            ${this.data.trimestre.opciones.map(option =>
            `<option value="${option}" ${option === this.data.trimestre.valor ? 'selected' : ''}>${option}</option>`
        ).join('')}
                        </select>
                    </div>
                </div>

                <div class="resumen-hero">
                    <div class="title-container">
                        <h1 class="editable-element inline-edit title-edit"
                            data-field="titulo.valor"
                            data-locked="${this.data.titulo.candado}">${this.data.titulo.valor}</h1>
                        <div class="controls-inline">
                            ${this.renderLockIcon(this.data.titulo, 'titulo')}
                            ${this.renderAIButton('titulo')}
                        </div>
                    </div>

                    <h3 class="section-subtitle">Objetivos</h3>
                    <div class="objectives-container">
                        <ol class="pretty-list editable-list" data-field="objetivos" data-locked="${this.data.objetivos.candado}">
                            ${this.renderEditableList(this.data.objetivos.valor, 'objetivos')}
                        </ol>
                        <div class="controls-inline">
                            ${this.renderLockIcon(this.data.objetivos, 'objetivos')}
                            ${this.renderAIButton('objetivos')}
                        </div>
                    </div>

                    <h3 class="section-subtitle">Descripción</h3>
                    <div class="description-container">
                        <div class="editable-element inline-edit text-area"
                             data-field="descripcion.valor"
                             data-locked="${this.data.descripcion.candado}">${this.data.descripcion.valor}</div>
                        <div class="controls-inline">
                            ${this.renderLockIcon(this.data.descripcion, 'descripcion')}
                            ${this.renderAIButton('descripcion')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Obtiene el nivel educativo actual del usuario.
     * @returns {string} Nivel educativo ('FP', 'ESO' o 'Bachillerato')
     */
    getActualEducationLevel() {
        const eduLevelText = document.getElementById('eduLevelText')?.textContent || '';

        if (eduLevelText.includes('FP') || eduLevelText.includes('Medio') || eduLevelText.includes('Superior')) {
            return 'FP';
        }
        if (eduLevelText.includes('ESO')) {
            return 'ESO';
        }
        if (eduLevelText.includes('Bachillerato')) {
            return 'Bachillerato';
        }
        // Si no detecta nada, fallback al tipo guardado en sesión
        const sessionType = sessionStorage.getItem('current_education_type');
        return sessionType === 'secundaria' ? 'ESO' : 'FP';
    }

    /**
     * Renderiza la sección de CONTEXTUALIZACIÓN adaptada a nueva plantilla
     * @returns {string} HTML de la sección de contextualización
     */
    renderContextualizacion() {
        if (!this.data.contextualizacion) return '';
        const ctx = this.data.contextualizacion;
        //const isSecundaria = this.isSecundaria;
        const currentLevel = this.getActualEducationLevel(); // Interrogación dinámica
        const isSecundaria = (currentLevel === 'ESO' || currentLevel === 'BACH');

        return `
    <div class="section-card">
        <h3>Contextualización</h3>
        
        <div class="form-group with-controls">
            <label>Justificación:</label>
            <div class="input-controls">
                <div class="editable-element inline-edit text-area" data-field="contextualizacion.justificacion.valor">${ctx.justificacion.valor}</div>
                ${this.renderLockIcon(ctx.justificacion, 'contextualizacion.justificacion')}
            </div>
        </div>

        ${this.isSdAActive() ? `
        <div class="form-group with-controls">
            <label>Contexto de vida:</label>
            <div class="input-controls">
                <div class="editable-element inline-edit text-area" data-field="contextualizacion.contexto_vida.valor">${ctx.contexto_vida.valor}</div>
                ${this.renderLockIcon(ctx.contexto_vida, 'contextualizacion.contexto_vida')}
            </div>
        </div>` : ''}

        <div class="form-group with-controls">
            <label>Centro de Interés:</label>
            <div class="input-controls">
                <div class="editable-element inline-edit text-area" data-field="contextualizacion.centro_interes.valor">${ctx.centro_interes.valor}</div>
                ${this.renderLockIcon(ctx.centro_interes, 'contextualizacion.centro_interes')}
            </div>
        </div>

        <div class="form-group">
            <label>ODS:</label>
            <div class="selected-items clickable-cell" data-source="ODS" data-field="contextualizacion.ods.valor">
                ${this.renderReactiveComplexItems('ods')}
            </div>
        </div>

        <div class="form-group">
            <label>Retos del Siglo XXI:</label>
            <div class="selected-items clickable-cell" data-source="Retos Siglo XXI" data-field="contextualizacion.retos_xxi.valor">
                ${this.renderReactiveComplexItems('retos_xxi')}
            </div>
        </div>

        ${isSecundaria ? `
            <div class="form-group">
                <label>Competencias Clave:</label>
                <div class="selected-items-container">
                    <div class="selected-items clickable-cell" data-source="Competencias Clave" data-field="contextualizacion.para_eso_bachillerato.competencias_clave.cc">
                        ${this.renderReactiveComplexItems('competencias_clave')}
                    </div>
                    ${this.renderLockIcon(ctx.para_eso_bachillerato?.competencias_clave || { candado: false }, 'contextualizacion.para_eso_bachillerato.competencias_clave')}
                </div>
            </div>
        ` : `
            <div class="form-group">
                <label>Objetivos Generales:</label>
                <div class="selected-items-container">
                    <div class="selected-items clickable-cell" data-source="Objetivos Generales (ObGs)" data-field="contextualizacion.para_fp.objetivos_generales.valor">
                        ${this.renderReactiveComplexItems('objetivos_generales')}
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label>Competencias Profesionales, Personales y Sociales:</label>
                <div class="selected-items-container">
                    <div class="selected-items clickable-cell" data-source="CPPs" data-field="contextualizacion.para_fp.competencias_profesionales.valor">
                        ${this.renderReactiveComplexItems('competencias_profesionales')}
                    </div>
                </div>
            </div>
        `}
    </div>`;

    }

    /**
     * Renderiza elementos usando datos reactivos de sessionStorage
     * @param {string} elementType - Tipo de elemento a renderizar
     * @returns {string} HTML de los elementos renderizados
     */
    renderReactiveComplexItems(elementType) {
        if (!this.storageManager) {
            return 'Error: StorageManager no disponible';
        }

        const contextData = this.storageManager.getContextualizacionData();
        const elementData = contextData[elementType] || [];

        if (elementData.length === 0) {
            return this.storageManager.getEmptyMessage(elementType);
        }

        return this.renderElementsByType(elementData, elementType);
    }

    /**
     * Renderiza elementos por tipo específico
     * @param {Array} items - Lista de elementos a renderizar
     * @param {string} elementType - Tipo de elemento
     * @returns {string} HTML de los elementos renderizados
     */
    renderElementsByType(items, elementType) {
        if (!Array.isArray(items) || items.length === 0) return 'Sin selecciones...';

        return items.map(item => {
            switch (elementType) {
                case 'ods':
                    return this.renderODSItem(item);
                case 'retos_xxi':
                    return this.renderRetosItem(item);
                case 'objetivos_generales':
                    return this.renderObjetivosItem(item);
                case 'competencias_profesionales':
                    return this.renderCPPsItem(item);
                case 'competencias_clave':
                    return this.renderCompetenciasClaveItem(item);
                default:
                    return `<span class="selected-tag">${JSON.stringify(item)}</span>`;
            }
        }).join('');
    }

    /**
     * Renderiza un item ODS
     * @param {Object} item - Objeto ODS a renderizar
     * @returns {string} HTML del item ODS
     */
    renderODSItem(item) {
        let html = `<div class="ods-item">
            <div class="ods-header"><strong>ODS ${item.ods_numer}: ${item.ods_descripcion}</strong></div>`;

        if (item.metas && item.metas.length > 0) {
            const metasHtml = item.metas.map(meta =>
                `<span class="meta-item">${meta.meta_id}: ${meta.meta_descripcion}</span>`
            ).join('');
            html += `<div class="ods-metas">${metasHtml}</div>`;
        }

        html += `</div>`;
        return html;
    }

    /**
     * Renderiza un item Retos XXI
     * @param {Object} item - Objeto Reto a renderizar
     * @returns {string} HTML del item Reto
     */
    renderRetosItem(item) {
        return `<div class="reto-item">
            <span class="reto-id">${item.reto_id}</span>
            <span class="reto-titulo">${item.reto_titulo}</span>
            <span class="reto-descripcion">${item.reto_descripcion}</span>
        </div>`;
    }

    /**
     * Renderiza un item Objetivos Generales
     * @param {Object} item - Objeto Objetivo General a renderizar
     * @returns {string} HTML del item Objetivo General
     */
    renderObjetivosItem(item) {
        return `<span class="selected-tag"><strong>${item.obg_id}:</strong> ${item.obg_descripcion}</span>`;
    }

    /**
     * Renderiza un item CPPs
     * @param {Object} item - Objeto CPP a renderizar
     * @returns {string} HTML del item CPP
     */
    renderCPPsItem(item) {
        return `<span class="selected-tag"><strong>${item.ccps_id}:</strong> ${item.cpps_descripcion}</span>`;
    }

    /**
     * Renderiza un item Competencias Clave
     * @param {Object} item - Objeto Competencia Clave a renderizar
     * @returns {string} HTML del item Competencia Clave
     */
    renderCompetenciasClaveItem(item) {
        const eduLevelText = document.getElementById('eduLevelText')?.textContent || '';
        const isBachillerato = eduLevelText.includes('Bachillerato');

        let html = `<div class="cc-item" style="margin-bottom: 12px;">
        <div class="cc-header"><strong>${item.cc_id}: ${item.cc_descripcion}</strong></div>`;

        if (item.cc_descriptores && item.cc_descriptores.length > 0) {
            const descriptoresHtml = item.cc_descriptores.map(desc => {
                // Seleccionamos la propiedad correcta del JSON según la etapa detectada
                const descripcionEtapa = isBachillerato ? desc.ccd_descripcion_bachillerato : desc.ccd_descripcion_eso;

                return `<div class="ccd-item" style="display:block; margin-left:15px; font-size:0.9em; color:var(--text-secondary);">
                • <strong>${desc.ccd_id}</strong>: ${descripcionEtapa}
            </div>`;
            }).join('');
            html += `<div class="cc-descriptores">${descriptoresHtml}</div>`;
        }

        html += `</div>`;
        return html;
    }

    /**
     * Renderiza elementos seleccionados complejos (nueva estructura)
     * @param {Array} items - Lista de elementos a renderizar
     * @returns {string} HTML de los elementos renderizados
     */
    renderSelectedComplexItems(items) {
        if (!Array.isArray(items)) return 'Sin selecciones...';
        if (items.length === 0) return 'Sin selecciones...';

        return items.map(item => {
            if (typeof item === 'object') {
                // Para ODS: mostrar número y descripción con negrita, y metas debajo
                if (item.ods_numer && item.ods_descripcion) {
                    let html = `<div class="ods-item">
                        <div class="ods-header"><strong>ODS ${item.ods_numer}: ${item.ods_descripcion}</strong></div>`;

                    if (item.metas && item.metas.length > 0) {
                        const metasHtml = item.metas.map(meta =>
                            `<span class="meta-item">${meta.meta_id}: ${meta.meta_descripcion}</span>`
                        ).join('');
                        html += `<div class="ods-metas">${metasHtml}</div>`;
                    }

                    html += `</div>`;
                    return html;
                }
                // Para Retos: mostrar como lista de "reto_id", "reto_titulo" y "reto_descripcion"
                else if (item.reto_id && item.reto_titulo) {
                    return `<div class="reto-item">
                        <span class="reto-id">${item.reto_id}</span>
                        <span class="reto-titulo">${item.reto_titulo}</span>
                        <span class="reto-descripcion">${item.reto_descripcion}</span>
                    </div>`;
                }
                // Para Objetivos Generales
                else if (item.obg_id && item.obg_descripcion) {
                    return `<span class="selected-tag"><strong>${item.obg_id}:</strong> ${item.obg_descripcion}</span>`;
                }
                // Para CPPs
                else if (item.ccps_id && item.cpps_descripcion) {
                    return `<span class="selected-tag"><strong>${item.ccps_id}:</strong> ${item.cpps_descripcion}</span>`;
                }
                // Para Competencias Clave con descriptores adaptativos
                else if (item.cc_id && item.cc_descripcion) {
                    let html = `<div class="cc-item">
                        <div class="cc-header"><strong>${item.cc_id}: ${item.cc_descripcion}</strong></div>`;

                    if (item.cc_descriptores && item.cc_descriptores.length > 0) {
                        const isESO = !this.isSecundaria || (this.isSecundaria && this.getEducationType() === 'eso');
                        const descriptoresHtml = item.cc_descriptores.map(desc => {
                            const descripcion = isESO ? desc.ccd_descripcion_eso : desc.ccd_descripcion_bachillerato;
                            return `<span class="ccd-item">${desc.ccd_id}: ${descripcion}</span>`;
                        }).join('');
                        html += `<div class="cc-descriptores">${descriptoresHtml}</div>`;
                    }

                    html += `</div>`;
                    return html;
                }
                else {
                    const text = item.ods_descripcion || item.reto_titulo || item.obg_descripcion || item.cpps_descripcion || item.cc_descripcion || JSON.stringify(item);
                    return `<span class="selected-tag">${text}</span>`;
                }
            } else {
                return `<span class="selected-tag">${item}</span>`;
            }
        }).join('');
    }

    /**
     * Renderiza la sección de desafío y producto final
     * @returns {string} HTML de la sección de desafío y producto final
     */
    renderDesafioProducto() {
        if (!this.data.desafio_producto) return '';

        const dp = this.data.desafio_producto;

        return `
            <div class="section-card">
                <h3>Desafío y Producto Final</h3>

                <div class="form-group with-controls">
                    <label>Reto/Desafío:</label>
                    <div class="input-controls">
                        <div class="editable-element inline-edit text-area"
                             data-field="desafio_producto.reto_desafio.valor"
                             data-locked="${dp.reto_desafio.candado}">${dp.reto_desafio.valor}</div>
                        ${this.renderLockIcon(dp.reto_desafio, 'desafio_producto.reto_desafio')}
                        ${this.renderAIButton('desafio_producto.reto_desafio')}
                    </div>
                </div>

                <div class="form-group with-controls">
                    <label>Producto Final:</label>
                    <div class="input-controls">
                        <div class="editable-element inline-edit text-area"
                             data-field="desafio_producto.producto_final.valor"
                             data-locked="${dp.producto_final.candado}">${dp.producto_final.valor}</div>
                        ${this.renderLockIcon(dp.producto_final, 'desafio_producto.producto_final')}
                        ${this.renderAIButton('desafio_producto.producto_final')}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Renderiza la sección de elementos curriculares
     * @returns {string} HTML de la sección de elementos curriculares
     */
    renderElementosCurriculares() {
        if (!this.data.elementos_curriculares || !this.data.elementos_curriculares.length) return '';



        const currentLevel = this.getActualEducationLevel();
        const isSecundaria = (currentLevel === 'ESO' || currentLevel === 'Bachillerato');

        // Ajuste de etiquetas dinámicas
        const raLabel = isSecundaria ? 'CEsp.' : 'RA';
        const contenidosLabel = isSecundaria ? 'Saberes básicos' : 'Contenidos';
        const contenidosSource = isSecundaria ? 'Saberes básicos' : 'Contenidos';

        return `
            <div class="section-card">
                <h3>Elementos Curriculares</h3>
                <div class="table-responsive">
                    <table class="elements-table">
                        <thead>
                            <tr>
                                <th style="width: 30%">${raLabel}</th>
                                <th style="width: 30%">CE</th>
                                <th style="width: 15%">${contenidosLabel}</th>
                                <th style="width: 10%">Método</th>
                                <th style="width: 10%">Evaluador</th>
                                <th style="width: 5%">Controles</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.data.elementos_curriculares.map((elem, index) => `
                                <tr data-index="${index}">
                                    <td class="clickable-cell" data-source="RA/CE" data-field="elementos_curriculares.${index}.ras" data-type="ra" data-row-index="${index}">
                                        ${this.renderRAsForTable(elem.ras)}
                                    </td>
                                    <td class="clickable-cell" data-source="RA/CE" data-field="elementos_curriculares.${index}.ras" data-type="ce" data-row-index="${index}">
                                        ${this.renderCEsForTable(elem.ras)}
                                    </td>
                                    <td class="clickable-cell" data-source="${contenidosSource}" data-field="elementos_curriculares.${index}.ras" data-type="contenidos" data-row-index="${index}">
                                        ${this.renderContenidosForTable(elem.ras)}
                                    </td>
                                    <td>
                                        ${this.renderMetodoForTable(elem.ras, index)}
                                    </td>
                                    <td>
                                        ${this.renderEvaluadorForTable(elem.ras, index)}
                                    </td>
                                    <td class="controls-cell">
                                        ${this.renderLockIcon({ candado: elem.ras?.[0]?.candado || false }, `elementos_curriculares.${index}`)}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    /**
     * Renderiza los RAs para la tabla
     * @param {Array} ras - Lista de RAs a renderizar
     * @returns {string} HTML de los RAs
     */
    renderRAsForTable(ras) {
        if (!Array.isArray(ras) || ras.length === 0) return 'Seleccionar RA...';
        return ras.map(ra => ra.ra_descripcion || ra.ra_id).join(', ');
    }

    /**
     * Renderiza los CEs para la tabla
     * @param {Array} ras - Lista de RAs a partir de los cuales se obtienen los CEs
     * @returns {string} HTML de los CEs
     */
    renderCEsForTable(ras) {
        if (!Array.isArray(ras) || ras.length === 0) return 'Seleccionar CE...';
        const allCEs = [];
        ras.forEach(ra => {
            if (ra.ra_ce && Array.isArray(ra.ra_ce)) {
                ra.ra_ce.forEach(ce => allCEs.push(ce.ce_descripcion || ce.ce_id));
            }
        });
        return allCEs.length > 0 ? allCEs.join(', ') : 'Sin CE seleccionados';
    }

    /**
     * Renderiza los métodos para la tabla
     * @param {Array} ras - Lista de RAs a partir de los cuales se obtienen los métodos
     * @param {number} index - Índice del RA en la lista
     * @returns {string} HTML de los métodos
     */
    renderMetodoForTable(ras, index) {
        if (!Array.isArray(ras) || ras.length === 0) return '';
        const ra = ras[0];
        if (!ra || !ra.ra_metodo) return '';

        return `<select class="dropdown-element compact-select" data-field="elementos_curriculares.${index}.ras.0.ra_metodo.valor" ${ra.candado ? 'disabled' : ''}>
            <option value="">Método...</option>
            ${ra.ra_metodo.opciones.map(option =>
            `<option value="${option}" ${option === ra.ra_metodo.valor ? 'selected' : ''}>${option}</option>`
        ).join('')}
        </select>`;
    }

    /**
     * Renderiza los evaluadores para la tabla  
     * @param {*} ras 
     * @param {*} index 
     * @returns 
     */
    renderEvaluadorForTable(ras, index) {
        if (!Array.isArray(ras) || ras.length === 0) return '';
        const ra = ras[0];
        if (!ra || !ra.ra_evaluador) return '';

        return `<select class="dropdown-element compact-select" data-field="elementos_curriculares.${index}.ras.0.ra_evaluador.valor" ${ra.candado ? 'disabled' : ''}>
            <option value="">Evaluador...</option>
            ${ra.ra_evaluador.opciones.map(option =>
            `<option value="${option}" ${option === ra.ra_evaluador.valor ? 'selected' : ''}>${option}</option>`
        ).join('')}
        </select>`;
    }

    /**
     * Renderiza la sección de soft skills
     * @returns {string} HTML de la sección de soft skills
     */
    renderSoftSkills() {
        const groups = Array.isArray(this.data?.soft_skills)
            ? this.data.soft_skills.filter(group =>
                group &&
                Array.isArray(group.skill) &&
                group.skill.some(sk =>
                    sk && (
                        sk.sk_id ||
                        sk.sk_descripcion ||
                        (Array.isArray(sk.sk_items) && sk.sk_items.length > 0)
                    )
                )
            )
            : [];

        if (!this.data.soft_skills) return '';

        return `
        <div class="section-card">
            <h3>Soft Skills</h3>
            <div class="table-responsive">
                <table class="elements-table">
                    <thead>
                        <tr>
                            <th>Categoría</th>
                            <th>Elemento</th>
                            <th>Método</th>
                            <th>Agente</th>
                            <th>Controles</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${groups.length > 0 ? groups.map((skillGroup, groupIndex) => {
            const skills = Array.isArray(skillGroup.skill) ? skillGroup.skill : [];
            return skills.map((skill, skillIndex) => `
                                <tr data-index="${groupIndex}.${skillIndex}">
                                    <td class="clickable-cell" data-source="Soft Skills" data-field="soft_skills.${groupIndex}.skill.${skillIndex}" data-type="categoria">
                                        ${skill.sk_id || ''}${skill.sk_descripcion ? `: ${skill.sk_descripcion}` : ''}
                                    </td>
                                    <td class="clickable-cell" data-source="Soft Skills" data-field="soft_skills.${groupIndex}.skill.${skillIndex}.sk_items" data-type="elemento">
                                        ${this.renderSkillItems(skill.sk_items || [])}
                                    </td>
                                    <td>
                                        <select class="dropdown-element compact-select" data-field="soft_skills.${groupIndex}.skill.${skillIndex}.sk_metodo.valor">
                                            <option value="">Método...</option>
                                            ${(skill.sk_metodo?.opciones || []).map(option =>
                `<option value="${option}" ${option === skill.sk_metodo?.valor ? 'selected' : ''}>${option}</option>`
            ).join('')}
                                        </select>
                                    </td>
                                    <td>
                                        <select class="dropdown-element compact-select" data-field="soft_skills.${groupIndex}.skill.${skillIndex}.sk_agente.valor">
                                            <option value="">Agente...</option>
                                            ${(skill.sk_agente?.opciones || []).map(option =>
                `<option value="${option}" ${option === skill.sk_agente?.valor ? 'selected' : ''}>${option}</option>`
            ).join('')}
                                        </select>
                                    </td>
                                    <td class="controls-cell">
                                        ${this.renderLockIcon(skillGroup, `soft_skills.${groupIndex}`)}
                                    </td>
                                </tr>
                            `).join('');
        }).join('') : `
                            <tr>
                                <td class="clickable-cell" data-source="Soft Skills" data-field="soft_skills.0.skill.0" data-type="categoria">
                                    Seleccionar categoría...
                                </td>
                                <td class="clickable-cell" data-source="Soft Skills" data-field="soft_skills.0.skill.0.sk_items" data-type="elemento">
                                    Sin elementos seleccionados
                                </td>
                                <td></td>
                                <td></td>
                                <td class="controls-cell">
                                    ${this.renderLockIcon({ candado: false }, 'soft_skills.0')}
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    }

    /**
     * Renderiza los elementos de una habilidad
     * @param {Array} items - Lista de elementos de la habilidad
     * @returns {string} HTML de los elementos de la habilidad
     */
    renderSkillItems(items) {
        if (!Array.isArray(items) || items.length === 0) return 'Sin elementos seleccionados';
        return items.map(item => `${item.skitems_id}: ${item.skitems_descripcion}`).join(', ');
    }

    /**
     * Renderiza las categorías de soft skills
     * @param {Array} skills - Lista de habilidades
     * @returns {string} HTML de las categorías de soft skills
     */
    renderSoftSkillCategories(skills) {
        if (!Array.isArray(skills) || skills.length === 0) return 'Seleccionar categoría...';
        return skills.map(skill => skill.sk_descripcion || skill.sk_id).join(', ');
    }

    /**
     * Renderiza los elementos de soft skills
     * @param {Array} skills - Lista de habilidades
     * @returns {string} HTML de los elementos de soft skills
     */
    renderSoftSkillElements(skills) {
        if (!Array.isArray(skills) || skills.length === 0) return 'Seleccionar elemento...';
        const allElements = [];
        skills.forEach(skill => {
            if (skill.sk_items && Array.isArray(skill.sk_items)) {
                skill.sk_items.forEach(item => allElements.push(item.skitems_descripcion || item.skitems_id));
            }
        });
        return allElements.length > 0 ? allElements.join(', ') : 'Sin elementos seleccionados';
    }

    /**
     * Renderiza la sección de metodología
     * @returns {string} HTML de la sección de metodología
     */
    renderMetodologia() {
        const items = Array.isArray(this.data?.metodologia?.metodologias_aplicadas)
            ? this.data.metodologia.metodologias_aplicadas.filter(m =>
                m && (m.metodologia_titulo || m.metodologia_descripcion || m.metodologia_sugerencia)
            )
            : [];

        if (!this.data.metodologia) return '';

        return `
        <div class="section-card">
            <h3>Metodología</h3>
            <div class="table-responsive">
                <table class="elements-table">
                    <thead>
                        <tr>
                            <th>Título</th>
                            <th>Descripción</th>
                            <th>Sugerencia</th>
                            <th>Controles</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.length > 0 ? items.map((met, index) => `
                            <tr data-index="${index}">
                                <td class="clickable-cell" data-source="Metodología" data-field="metodologia.metodologias_aplicadas.${index}">
                                    ${met.metodologia_titulo || 'Seleccionar metodología...'}
                                </td>
                                <td>${met.metodologia_descripcion || 'Sin descripción'}</td>
                                <td>${met.metodologia_sugerencia || 'Sin sugerencia'}</td>
                                <td class="controls-cell">
                                    ${this.renderLockIcon(met, `metodologia.metodologias_aplicadas.${index}`)}
                                </td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td class="clickable-cell" data-source="Metodología" data-field="metodologia.metodologias_aplicadas.0">
                                    Seleccionar metodología...
                                </td>
                                <td>Sin descripción</td>
                                <td>Sin sugerencia</td>
                                <td class="controls-cell">
                                    ${this.renderLockIcon(this.data.metodologia, 'metodologia')}
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    }

    /**
     * Renderiza la sección de secuenciación didáctica
     * @returns {string} HTML de la sección de secuenciación didáctica
     */
    renderSecuenciacionDidactica() {
        if (!this.data.secuenciacion_didactica || !this.data.secuenciacion_didactica.length) return '';

        return `
            <div class="section-card">
                <h3>Secuenciación Didáctica</h3>
                <div class="table-responsive">
                    <table class="elements-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Actividad</th>
                                <th>Método</th>
                                <th>Agente</th>
                                <th>Bloom</th>
                                <th>IM</th>
                                <th>Candado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.data.secuenciacion_didactica.map((seq, index) => `
                                <tr data-index="${index}" data-locked="${seq.candado}">
                                    <td class="editable-element number-edit"
                                        data-field="secuenciacion_didactica.${index}.sd_numero_actividad.sd_valor"
                                        data-locked="${seq.candado}">${seq.sd_numero_actividad.sd_valor}</td>
                                    <td class="activity-container" data-locked="${seq.candado}">
                                        <div class="editable-element activity-title"
                                             data-field="secuenciacion_didactica.${index}.sd_actividad.sd_titulo.valor"
                                             data-locked="${seq.candado}">${seq.sd_actividad.sd_titulo.valor || 'Título de la actividad'}</div>
                                        <div class="editable-element activity-description text-area"
                                             data-field="secuenciacion_didactica.${index}.sd_actividad.sd_descripcion.valor"
                                             data-locked="${seq.candado}">${seq.sd_actividad.sd_descripcion.valor || 'Descripción de la actividad'}</div>
                                        ${this.renderAIButton(`secuenciacion_didactica.${index}`)}
                                    </td>
                                    <td>
                                        <select class="dropdown-element" data-field="secuenciacion_didactica.${index}.sd_metodo.valor" ${seq.candado ? 'disabled' : ''}>
                                            <option value="">Seleccionar método...</option>
                                            ${seq.sd_metodo.opciones.map(option =>
            `<option value="${option}" ${option === seq.sd_metodo.valor ? 'selected' : ''}>${option}</option>`
        ).join('')}
                                        </select>
                                    </td>
                                    <td>
                                        <select class="dropdown-element" data-field="secuenciacion_didactica.${index}.sd_agente.valor" ${seq.candado ? 'disabled' : ''}>
                                            <option value="">Seleccionar agente...</option>
                                            ${seq.sd_agente.opciones.map(option =>
            `<option value="${option}" ${option === seq.sd_agente.valor ? 'selected' : ''}>${option}</option>`
        ).join('')}
                                        </select>
                                    </td>
                                    <td class="clickable-cell"
                                        data-source="Taxonomía de Bloom"
                                        data-field="secuenciacion_didactica.${index}.bloom"
                                        data-row-index="${index}">
                                        ${this.renderBloomForTable(seq.bloom)}
                                    </td>
                                    <td class="clickable-cell"
                                        data-source="Inteligencias Múltiples"
                                        data-field="secuenciacion_didactica.${index}.inteligencias_multiples"
                                        data-row-index="${index}">
                                        ${this.renderIMForTable(seq.inteligencias_multiples)}
                                    </td>
                                    <td class="controls-cell">
                                        ${this.renderLockIcon({ candado: seq.candado }, `secuenciacion_didactica.${index}`)}
                                    </td>
                                    <td class="actions-cell">
                                        <button class="remove-activity-btn" data-index="${index}" title="Eliminar actividad">🗑️</button>
                                        <button class="move-up-btn" data-index="${index}" title="Mover arriba">⬆️</button>
                                        <button class="move-down-btn" data-index="${index}" title="Mover abajo">⬇️</button>
                                    </td>
                                </tr>
                            `).join('')}
                            <tr>
                                <td colspan="8" class="add-activity-row">
                                    <button class="add-activity-btn" type="button">+ Nueva actividad</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    /**
     * Renderiza los niveles de Bloom para la tabla
     * @param {Array} bloom - Lista de niveles de Bloom
     * @returns {string} HTML de los niveles de Bloom
     */
    renderBloomForTable(bloom) {
        const items = Array.isArray(bloom)
            ? bloom.filter(b => b && (b.bloom_nivel || b.bloom_definicion || b.bloom_verbos_clave || b.bloom_ejemplos))
            : [];

        if (items.length === 0) return 'Seleccionar nivel...';
        return items.map(b => `${b.bloom_nivel} (${b.bloom_definicion})`).join(', ');
    }

    /**
     * Renderiza las inteligencias múltiples para la tabla
     * @param {Array} im - Lista de inteligencias múltiples
     * @returns {string} HTML de las inteligencias múltiples
     */
    renderIMForTable(im) {
        const items = Array.isArray(im)
            ? im.filter(i => i && (i.im_inteligencia || i.im_definicion || i.im_perfil_alumno || i.im_estrategias_clave))
            : [];

        if (items.length === 0) return 'Seleccionar IM...';
        return items.map(i => i.im_inteligencia).join(', ');
    }

    /**
     * Renderiza la sección de atención a la diversidad
     * @returns {string} HTML de la sección de atención a la diversidad
     */
    renderAtencionDiversidad() {
        if (!this.data.atencion_diversidad) return '';

        return `
            <div class="section-card">
                <h3>Atención a la Diversidad</h3>
                <div class="selected-items-container">
                    <div class="content-area clickable-cell"
                         data-source="Atención a la Diversidad"
                         data-field="atencion_diversidad.ad_contenido">
                        ${this.data.atencion_diversidad.ad_contenido || 'Contenido de atención a la diversidad...'}
                    </div>
                    ${this.renderLockIcon(this.data.atencion_diversidad, 'atencion_diversidad')}
                </div>
            </div>
        `;
    }

    /**
    * Renderiza la sección de DUA (Diseño Universal para el Aprendizaje)
    * @return {string} HTML de la sección de DUA
     */
    renderDUA() {
        if (!this.data.dua) return '';

        return `
            <div class="section-card">
                <h3>DUA (Diseño Universal para el Aprendizaje)</h3>
                <div class="selected-items-container">
                    <div class="content-area clickable-cell"
                         data-source="DUA"
                         data-field="dua.dua_contenido">
                        ${this.data.dua.dua_contenido || 'Contenido DUA...'}
                    </div>
                    ${this.renderLockIcon(this.data.dua, 'dua')}
                </div>
            </div>
        `;
    }

    /**
     * Renderiza un icono de candado
     * @param {*} item - Elemento que contiene la información del candado
     * @param {string} fieldPath - Ruta del campo asociado al candado
     * @returns {string} HTML del icono de candado
     */
    renderLockIcon(item, fieldPath = null) {
        const isLocked = item.candado || false;
        const iconClass = isLocked ? 'lock-red' : 'lock-green';
        const iconSymbol = isLocked ? '🔒' : '🔓';

        return `<button class="lock-icon ${iconClass}"
                        data-locked="${isLocked}"
                        data-field-path="${fieldPath || ''}"
                        title="${isLocked ? 'Elemento bloqueado' : 'Elemento editable'}">${iconSymbol}</button>`;
    }

    /**
     * Renderiza una lista editable con botones de añadir y eliminar
     * @param {Array} items - Lista de elementos a renderizar
     * @param {string} fieldName - Nombre del campo asociado a la lista
     * @returns {string} HTML de la lista editable
     */
    renderEditableList(items, fieldName) {
        if (!Array.isArray(items)) return '';

        const listItems = items.map((item, index) => `
            <li class="editable-list-item" data-index="${index}">
                <span class="item-text">${item}</span>
                <button class="remove-item" data-field="${fieldName}" data-index="${index}" title="Eliminar">🗑️</button>
            </li>
        `).join('');

        return `
            ${listItems}
            <li class="add-item">
                <button class="add-item-btn" data-field="${fieldName}" title="Añadir objetivo">+ Añadir</button>
            </li>
        `;
    }

    /**
     * Renderiza elementos seleccionados simples
     * @param {Array} items - Lista de elementos seleccionados
     * @returns {string} HTML de los elementos seleccionados
     */
    renderSelectedItems(items) {
        if (!Array.isArray(items)) return items || 'Sin selecciones...';
        if (items.length === 0) return 'Sin selecciones...';

        return items.map(item => `<span class="selected-tag">${item}</span>`).join('');
    }

    /**
     * Maneja click en elemento editable
     * @param {*} element - Elemento que se ha hecho clic
     * @returns {void}
     */
    handleEditableClick(element) {
        if (this.isElementLocked(element)) {
            console.log('Elemento bloqueado, no se puede editar');
            return;
        }

        if (element.classList.contains('editing')) return;

        this.makeElementEditable(element);
    }

    /**
     * Hace un elemento editable
     * @param {*} element - Elemento que se va a hacer editable
     * @returns {void}
     */
    makeElementEditable(element) {
        const originalValue = element.textContent.trim();
        const field = element.dataset.field;

        element.classList.add('editing');

        if (element.classList.contains('text-area')) {
            this.createTextAreaEditor(element, originalValue, field);
        } else {
            this.createInlineEditor(element, originalValue, field);
        }
    }

    /**
     * Crea un editor inline
     * @param {*} element - Elemento que se va a editar
     * @param {string} originalValue - Valor original del elemento
     * @param {string} field - Nombre del campo asociado al elemento
     * @returns {void}
     */
    createInlineEditor(element, originalValue, field) {
        const input = document.createElement('input');
        input.type = element.classList.contains('number-edit') ? 'number' : 'text';
        input.value = originalValue;
        input.className = 'inline-editor';

        element.innerHTML = '';
        element.appendChild(input);
        input.focus();
        input.select();

        const saveEdit = () => {
            const newValue = input.value.trim();
            const finalValue = input.type === 'number' ? parseInt(newValue) || 0 : newValue;
            element.textContent = finalValue;
            element.classList.remove('editing');
            this.updateFieldValue(field, finalValue);
        };

        const cancelEdit = () => {
            element.textContent = originalValue;
            element.classList.remove('editing');
        };

        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });
    }

    /**
     * Crea un editor de área de texto
     * @param {*} element - Elemento que se va a editar
     * @param {string} originalValue - Valor original del elemento
     * @param {string} field - Nombre del campo asociado al elemento
     * @returns {void}
     */
    createTextAreaEditor(element, originalValue, field) {
        const textarea = document.createElement('textarea');
        textarea.value = originalValue;
        textarea.className = 'text-area-editor';
        textarea.rows = 3;

        element.innerHTML = '';
        element.appendChild(textarea);
        textarea.focus();
        textarea.select();

        const saveEdit = () => {
            const newValue = textarea.value.trim();
            element.textContent = newValue;
            element.classList.remove('editing');
            this.updateFieldValue(field, newValue);
        };

        const cancelEdit = () => {
            element.textContent = originalValue;
            element.classList.remove('editing');
        };

        textarea.addEventListener('blur', saveEdit);
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });
    }

    /**
     * Maneja toggle de candado
     * @param {*} lockIcon - Icono de candado que se ha hecho clic
     * @returns {void}
     */
    handleLockToggle(lockIcon) {
        const fieldPath = lockIcon.dataset.fieldPath;
        if (!fieldPath) {
            console.warn('No se encontró fieldPath para el candado');
            return;
        }

        // Usar sessionStorageManager para toggle
        const newState = this.storageManager.toggleLock(fieldPath);

        // Actualizar visualmente
        lockIcon.dataset.locked = newState;
        lockIcon.className = `lock-icon ${newState ? 'lock-red' : 'lock-green'}`;
        lockIcon.textContent = newState ? '🔒' : '🔓';
        lockIcon.title = newState ? 'Elemento bloqueado' : 'Elemento editable';

        console.log(`Candado ${newState ? 'bloqueado' : 'desbloqueado'} para: ${fieldPath}`);

        // Para RA/CE, sincronizar candados entre elementos curriculares y evaluación
        if (fieldPath.includes('elementos_curriculares') && fieldPath.includes('candado')) {
            const rowIndex = fieldPath.split('.')[1];
            const evalLockPath = `evaluacion.${rowIndex}.candado`;
            this.storageManager.updateField(evalLockPath, newState, false);
        }
    }

    /**
     * Maneja click en celda clickeable (para abrir popups)
     */
    // En js/components/resumen.js


    /**
     * Mapea una fuente a un tipo de menú
     * @param {string} source - Fuente a mapear
     * @returns {string|null} - Tipo de menú correspondiente o null si no se encuentra
     */
    mapSourceToMenuType(source) {
        const mapping = {
            'ODS': 'ods',
            'Retos Siglo XXI': 'xxi',
            'Objetivos Generales': 'objetivos',
            'Objetivos Generales (ObGs)': 'objetivos',
            'CPPs': 'cpps',
            'Competencias Clave': 'competenciasClave',
            'RA/CE': 'ra_ce',
            'Competencias Específicas': 'competenciasEspecificas',
            'CEsp.': 'competenciasEspecificas',
            'Contenidos': 'contenidos',
            'Saberes básicos': 'saberes',
            'Saberes Básicos': 'saberes',
            'Soft Skills': 'softskills',
            'Metodología': 'metodologia',
            'Atención a la Diversidad': 'atencion_diversidad',
            'DUA': 'dua',
            'Taxonomía de Bloom': 'bloom',
            'Inteligencias Múltiples': 'inteligencias'
        };
        return mapping[source] || null;
    }

    /**
     * Maneja cambio en dropdown
     * @param {*} dropdown - Elemento dropdown que ha cambiado
     * @returns {void}
     */
    handleDropdownChange(dropdown) {
        const field = dropdown.dataset.field;
        const value = dropdown.value;
        this.updateFieldValue(field, value);
    }

    /**
     * Maneja añadir objetivo a la lista bajo el título
     * @param {*} button - Botón que se ha hecho clic para añadir un objetivo
     * @returns {void}
     */
    handleAddListItem(button) {
        const field = button.dataset.field;
        const newItem = prompt('Nuevo objetivo:');

        if (newItem && newItem.trim()) {
            if (field === 'objetivos') {
                // Usar el método específico de sessionStorageManager
                const success = this.storageManager.addObjective(newItem.trim());
                if (success) {
                    this.render(); // Re-renderizar para mostrar el nuevo objetivo
                }
            } else {
                // Para otros campos
                const fieldPath = field + '.valor';
                const currentItems = this.getFieldValue(fieldPath) || [];
                currentItems.push(newItem.trim());
                this.updateFieldValue(fieldPath, currentItems);
                this.render();
            }
        }
    }

    /**
     * Maneja eliminar objetivo de la lista
     * @param {*} button - Botón que se ha hecho clic para eliminar un objetivo
     * @returns {void}
     */
    handleRemoveListItem(button) {
        const field = button.dataset.field;
        const index = parseInt(button.dataset.index);

        if (confirm('¿Eliminar este objetivo?')) {
            if (field === 'objetivos') {
                // Usar el método específico de sessionStorageManager
                const success = this.storageManager.removeObjective(index);
                if (success) {
                    this.render(); // Re-renderizar para mostrar los cambios
                }
            } else {
                // Para otros campos
                const fieldPath = field + '.valor';
                const currentItems = this.getFieldValue(fieldPath) || [];
                currentItems.splice(index, 1);
                this.updateFieldValue(fieldPath, currentItems);
                this.render();
            }
        }
    }

    /**
     * Maneja cambios en tipo de educación
     * @returns {Promise<void>}
     */
    async handleEducationChange() {
        const eduLevelText = document.getElementById('eduLevelText');
        const wasSecundaria = this.isSecundaria;
        this.isSecundaria = eduLevelText && eduLevelText.textContent.includes('Secundaria');

        if (wasSecundaria !== this.isSecundaria) {
            console.log(`Cambio de tipo educativo: ${this.isSecundaria ? 'Secundaria' : 'FP'}`);
            // Reset completo del estado por cambio de contexto
            this.storageManager.resetForContextChange(
                this.isSecundaria ? 'secundaria' : 'fp'
            );
            await this.loadData();
            this.render();
        }
    }

    /**
     * Maneja cambios en módulo
     * @returns {void}
     */
    handleModuleChange() {
        console.log('Cambio de módulo detectado');
        this.storageManager.resetForContextChange(
            sessionStorage.getItem('current_education_type') || 'fp',
            'nuevo_modulo'
        );
        this.loadData();
    }

    /**
     * Maneja cambios en asignatura
     * @returns {void}
     */
    handleSubjectChange() {
        console.log('Cambio de asignatura detectado');
        this.storageManager.resetForContextChange(
            sessionStorage.getItem('current_education_type') || 'fp',
            null,
            'nueva_asignatura'
        );
        this.loadData();
    }

    /**
     * Maneja cambios en el switch SdA/UD
     * @returns {void}
     */
    handleModeToggleChange() {
        console.log(`Switch SdA/UD cambió: ${this.isSdAActive() ? 'SdA' : 'UD'}`);

        this.render();

        // Actualizar visibilidad del contexto de vida
        const contextoVidaElement = document.querySelector('.sda-only');
        if (contextoVidaElement) {
            contextoVidaElement.style.display = this.isSdAActive() ? 'block' : 'none';
        }

        // Actualizar label del modo en el título
        const modeLabels = document.querySelectorAll('.mode-label');
        modeLabels.forEach(label => {
            label.textContent = this.isSdAActive() ? 'SdA' : 'UD';
        });
    }

    /**
     * Abre popup para selección desde menú derecho
     */


    /**
     * Maneja selección desde modal con contexto de fila o global
     * @param {*} selectedData - Datos seleccionados desde el modal
     * @param {*} field - Campo asociado a la selección
     * @param {*} type - Tipo de selección
     * @param {*} rowIndex - Índice de la fila asociada (si aplica)
     * @returns {void}
     */
    handleModalSelection(selectedData, field, type, rowIndex) {
        console.log('Selección desde modal:', selectedData, 'para campo:', field, 'tipo:', type, 'fila:', rowIndex);

        // Re-renderizar la vista
        this.render();
    }

    /**
     * Mapea campo a tipo de menú
     * @param {string} field - Campo a mapear
     * @returns {string|null} - Tipo de menú correspondiente o null si no hay coincidencia
     */
    mapFieldToMenuType(field) {
        if (field.includes('ods')) return 'ods';
        if (field.includes('retos_xxi')) return 'retos_xxi';
        if (field.includes('objetivos_generales')) return 'objetivos_generales';
        if (field.includes('competencias_profesionales')) return 'cpps';
        if (field.includes('competencias_clave')) return 'competencias_clave';
        if (field.includes('metodologia')) return 'metodologia';
        if (field.includes('atencion_diversidad')) return 'atencion_diversidad';
        if (field.includes('dua')) return 'dua';
        if (field.includes('soft_skills')) return 'soft_skills';
        return null;
    }

    /**
     * Maneja añadir nueva actividad
     * @returns {void}
     */
    handleAddActivity() {
        const success = this.storageManager.addNewActivity();
        if (success) {
            this.render();
            console.log('Nueva actividad añadida');
        }
    }

    /**
     * Maneja eliminar actividad
     * @param {*} button - Botón que desencadena la acción
     * @returns {void}
     */
    handleRemoveActivity(button) {
        const index = parseInt(button.dataset.index);
        if (isNaN(index)) {
            console.warn('Índice de actividad no válido');
            return;
        }

        // Confirmar eliminación
        if (confirm('¿Estás seguro de que quieres eliminar esta actividad?')) {
            const success = this.storageManager.removeActivity(index);
            if (success) {
                this.render();
                console.log(`Actividad ${index + 1} eliminada`);
            }
        }
    }

    /**
     * Maneja mover actividad hacia arriba
     * @param {*} button - Botón que desencadena la acción
     * @returns {void}
     */
    handleMoveActivityUp(button) {
        const index = parseInt(button.dataset.index);
        if (isNaN(index) || index <= 0) {
            console.warn('No se puede mover la primera actividad hacia arriba');
            return;
        }

        const success = this.storageManager.reorderActivity(index, index - 1);
        if (success) {
            this.render();
            console.log(`Actividad ${index + 1} movida hacia arriba`);
        }
    }

    /**
     * Maneja mover actividad hacia abajo
     * @param {*} button - Botón que desencadena la acción
     * @returns {void}
     */
    handleMoveActivityDown(button) {
        const index = parseInt(button.dataset.index);
        const activities = this.data.secuenciacion_didactica || [];

        if (isNaN(index) || index >= activities.length - 1) {
            console.warn('No se puede mover la última actividad hacia abajo');
            return;
        }

        const success = this.storageManager.reorderActivity(index, index + 1);
        if (success) {
            this.render();
            console.log(`Actividad ${index + 1} movida hacia abajo`);
        }
    }

    /**
     * Actualiza el valor de un campo en sessionStorage
     * @param {string} fieldPath - Ruta del campo a actualizar
     * @param {*} value - Nuevo valor del campo
     * @returns {void}
     */
    updateFieldValue(fieldPath, value) {
        if (!fieldPath) return;

        console.log(`Actualizando campo en sessionStorage: ${fieldPath} = `, value);

        // Usar sessionStorage como única fuente de verdad
        const success = this.storageManager.updateField(fieldPath, value);

        if (success) {
            // Actualizar referencia local
            this.data = this.storageManager.getState();
            this.render();
        } else {
            console.warn(`No se pudo actualizar campo: ${fieldPath}`);
        }
    }

    /**
     * Obtiene el valor de un campo desde sessionStorage
     * @param {string} fieldPath - Ruta del campo a obtener
     * @returns {*} - Valor del campo o null si no existe
     */
    getFieldValue(fieldPath) {
        if (!fieldPath) return null;
        return this.storageManager.getField(fieldPath);
    }

    /**
     * Verifica si un elemento está bloqueado
     * @param {HTMLElement} element - Elemento a verificar
     * @returns {boolean} - True si el elemento está bloqueado, false en caso contrario
     */
    isElementLocked(element) {
        return element.dataset.locked === 'true' || element.dataset.locked === true;
    }

    /**
     * Obtiene el tipo de educación (ESO o Bachillerato)
     * @returns {string} - 'eso' o 'bachillerato'
     */
    getEducationType() {
        const eduLevelText = document.getElementById('eduLevelText');
        if (eduLevelText && eduLevelText.textContent.includes('Bachillerato')) {
            return 'bachillerato';
        }
        return 'eso'; // Default a ESO si no se especifica
    }

    /**
     * Verifica si está activo el modo SdA
     * @returns {boolean} - True si el modo SdA está activo, false en caso contrario
     */
    isSdAActive() {
        // Buscar el toggle switch del header
        const modeToggle = document.getElementById('modeToggle');
        if (modeToggle) {
            // El switch está en SdA cuando tiene la clase 'active'
            return modeToggle.classList.contains('active');
        }

        // Fallback: buscar otros posibles selectores
        const sdaSwitch = document.querySelector('input[type="checkbox"][id*="sda"], .sda-toggle, .toggle-switch.active');
        return sdaSwitch && (sdaSwitch.checked || sdaSwitch.classList.contains('active'));
    }

    /**
     * Exporta el estado actual para uso de IA
     * @returns {object} - Estado actual para uso de IA
     */
    exportStateForAI() {
        return this.storageManager.exportStateForAI();
    }

    /**
     * Aplica cambios desde IA respetando candados
     * @param {object} proposedChanges - Cambios propuestos por la IA
     * @returns {object} - Resultado de la aplicación de cambios
     */
    applyAIChanges(proposedChanges) {
        const result = this.storageManager.applyPartialUpdate(proposedChanges);
        if (result.success && result.appliedChanges.length > 0) {
            this.render(); // Re-renderizar solo si hubo cambios
        }
        return result;
    }

    /**
     * Maneja click en botón Convertir a PDF
     * @returns {void}
     */
    handlePDFExport() {
        try {
            const html = this.buildExportableResumenHtml();

            if (!html) {
                alert('No hay contenido en la Vista Previa para exportar.');
                return;
            }

            const printWindow = window.open('', '_blank');

            if (!printWindow) {
                console.warn('La ventana de impresión fue bloqueada. Exportando a Word como alternativa.');
                this.handleWordExport();
                return;
            }

            const title = this.getResumenDocumentTitle();
            const styles = this.getResumenPrintStyles();

            printWindow.document.open();
            printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>${title}</title>
                <style>${styles}</style>
            </head>
            <body>
                <div class="resumen-print-root">
                    ${html}
                </div>
            </body>
            </html>
        `);
            printWindow.document.close();

            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
            }, 250);

        } catch (error) {
            console.error('Error al exportar PDF desde Resumen:', error);
            alert('Ha ocurrido un error al generar el PDF. Se intentará exportar a Word.');
            this.handleWordExport();
        }
    }


    /**
     * Maneja click en botón Exportar a Word
     * @returns {void}
     */
    handleWordExport() {
        try {
            const html = this.buildExportableResumenHtml();

            if (!html) {
                alert('No hay contenido en la Vista Previa para exportar.');
                return;
            }

            const title = this.getResumenDocumentTitle();
            const styles = this.getResumenPrintStyles();

            const wordHtml = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>${title}</title>
                <style>${styles}</style>
            </head>
            <body>
                <div class="resumen-print-root">
                    ${html}
                </div>
            </body>
            </html>
        `;

            const blob = new Blob(['\ufeff', wordHtml], {
                type: 'application/msword'
            });

            const safeName = title
                .toLowerCase()
                .replace(/[^a-z0-9áéíóúñü\s-]/gi, '')
                .replace(/\s+/g, '-');

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${safeName || 'resumen'}.doc`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error al exportar Word desde Resumen:', error);
            alert('Ha ocurrido un error al exportar a Word.');
        }
    }

    /**
     * Obtiene el título del documento de resumen
     * @returns {string} - Título del documento
     */
    getResumenDocumentTitle() {
        const titulo =
            this?.data?.titulo?.valor ||
            document.querySelector('#resumen-content h1')?.textContent ||
            'resumen';

        return String(titulo).trim() || 'resumen';
    }

    /**
     * Obtiene los estilos para la impresión del resumen
     * @returns {string} - Estilos CSS para la impresión
     */
    getResumenPrintStyles() {
        return `
        html, body {
            margin: 0;
            padding: 0;
            background: white;
            color: #111827;
            font-family: Calibri, Arial, sans-serif;
        }

        body {
            padding: 24px;
        }

        .resumen-print-root {
            max-width: 1100px;
            margin: 0 auto;
        }

        .section-card,
        .resumen-section,
        .info-card,
        .table-wrap {
            break-inside: avoid;
            page-break-inside: avoid;
        }

        h1 {
            font-size: 24pt;
            margin: 0 0 18px 0;
            line-height: 1.2;
        }

        h2 {
            font-size: 18pt;
            margin: 18px 0 10px 0;
        }

        h3, .section-header {
            font-size: 14pt;
            margin: 16px 0 10px 0;
            font-weight: 700;
        }

        h4 {
            font-size: 12pt;
            margin: 12px 0 8px 0;
        }

        p, li, td, th, span, div {
            font-size: 11pt;
            line-height: 1.5;
        }

        ul, ol {
            padding-left: 20px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0 20px 0;
        }

        th, td {
            border: 1px solid #d1d5db;
            padding: 8px 10px;
            vertical-align: top;
            text-align: left;
        }

        th {
            background: #f3f4f6;
            font-weight: 700;
        }

        .grid-2, .grid-3 {
            display: block;
        }

        .info-card, .section-card {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 14px;
            background: white;
        }

        .resumen-toolbar,
        .resumen-toolbar-top,
        .resumen-right,
        .ai-btn,
        .lock-icon,
        button {
            display: none !important;
        }

        .export-select-text,
        .export-input-text,
        .export-textarea-text {
            display: inline-block;
            white-space: pre-wrap;
        }

        @page {
            size: A4;
            margin: 18mm 14mm;
        }
    `;
    }

    /**
     * Construye el HTML exportable del resumen
     * @returns {string} - HTML del resumen listo para exportar
     */
    buildExportableResumenHtml() {
        const source = document.getElementById('resumen-content');
        if (!source) return '';

        const clone = source.cloneNode(true);

        // Quitar controles de interfaz
        clone.querySelectorAll(
            '.resumen-toolbar-top, .force-reset-btn, .pdf-export-btn, .word-export-btn,' +
            '.ai-btn, .lock-icon, .add-item-btn, .remove-item, .remove-activity-btn,' +
            '.move-up-btn, .move-down-btn'
        ).forEach(el => el.remove());

        // Convertir selects a texto
        clone.querySelectorAll('select').forEach(select => {
            const span = document.createElement('span');
            span.className = 'export-select-text';
            span.textContent = select.options[select.selectedIndex]?.textContent || select.value || '';
            select.replaceWith(span);
        });

        // Convertir inputs a texto
        clone.querySelectorAll('input').forEach(input => {
            const span = document.createElement('span');
            span.className = 'export-input-text';
            span.textContent = input.value || input.getAttribute('value') || '';
            input.replaceWith(span);
        });

        // Convertir textarea a bloque de texto
        clone.querySelectorAll('textarea').forEach(textarea => {
            const div = document.createElement('div');
            div.className = 'export-textarea-text';
            div.textContent = textarea.value || textarea.textContent || '';
            textarea.replaceWith(div);
        });

        // Limpiar clases/atributos de edición inline
        clone.querySelectorAll('.editable-element').forEach(el => {
            el.removeAttribute('contenteditable');
            el.classList.remove('editable-element');
        });

        // Limpiar botones vacíos o restos de acciones
        clone.querySelectorAll('button').forEach(btn => btn.remove());

        return clone.innerHTML.trim();
    }
    /**
     * Refresca la vista del resumen
     * @returns {void}
     */
    refresh() {
        this.render();
    }

    /**
     * Renderiza botón IA
     * @param {string} fieldPath - Ruta del campo para la IA
     * @returns {string} - HTML del botón IA
     */
    renderAIButton(fieldPath) {
        return `<button class="ai-btn" data-field="${fieldPath}" title="Generar con IA">🤖 IA</button>`;
    }

    /**
     * Maneja click en botón IA
     * @param {HTMLElement} button - Botón IA clickeado
     * @returns {void}
     */
    handleAIButton(button) {
        const field = button.dataset.field;
        console.log(`Solicitud de IA para campo: ${field}`);
        // Placeholder para funcionalidad IA futura
        alert(`Funcionalidad de IA para ${field} - próximamente disponible`);
    }

    /**
     * Maneja click en botón Force Reset
     * @returns {void}
     */
    handleForceReset() {
        if (confirm('¿Estás seguro de que quieres borrar TODOS los datos? Esta acción no se puede deshacer.')) {
            const success = this.storageManager.forceReset();
            if (success) {
                // Recargar datos y re-renderizar
                this.data = this.storageManager.getState();
                this.render();
                alert('Estado reseteado completamente');
            } else {
                // Intentar recargar desde archivo
                this.loadData().then(() => {
                    this.render();
                    alert('Estado reseteado desde plantilla');
                });
            }
        }
    }

    /**
     * Renderiza icono de candado
     * @param {Object} element - Elemento que contiene información del candado
     * @param {string} fieldPath - Ruta del campo para el candado
     * @returns {string} - HTML del icono de candado
     */
    renderLockIcon(element, fieldPath) {
        const isLocked = element?.candado || this.storageManager.isFieldLocked(fieldPath);
        const lockClass = isLocked ? 'locked' : 'unlocked';
        const lockIcon = isLocked ? '🔒' : '🔓';

        return `<i class="lock-icon ${lockClass}" data-field="${fieldPath}" title="${isLocked ? 'Desbloquear' : 'Bloquear'}">${lockIcon}</i>`;
    }

    /**
     * Maneja toggle de candado
     * @param {HTMLElement} lockIcon - Icono de candado clickeado
     * @returns {void}
     */
    handleLockToggle(lockIcon) {
        const field = lockIcon.dataset.field;
        if (!field) return;

        const newLockState = this.storageManager.toggleLock(field);

        // Actualizar datos locales
        this.data = this.storageManager.getState();

        // Re-renderizar para mostrar cambio visual
        this.render();

        console.log(`Candado ${newLockState ? 'cerrado' : 'abierto'} para: ${field}`);
    }

    /**
     * Renderiza botón de candado simple
     * @param {string} fieldPath - Ruta del campo para el candado
     * @returns {string} - HTML del botón de candado
     */
    renderLockButton(fieldPath) {
        const isLocked = this.storageManager.isFieldLocked(fieldPath);
        const lockClass = isLocked ? 'locked' : 'unlocked';
        const lockIcon = isLocked ? '🔒' : '🔓';

        return `<button class="lock-icon ${lockClass}" data-field="${fieldPath}" title="${isLocked ? 'Desbloquear' : 'Bloquear'}">${lockIcon}</button>`;
    }

    /**
     * Maneja click en celdas clickeables para abrir popups
     * @param {HTMLElement} cell - Celda clickeable
     * @returns {void}
     */
    handleClickableCell(cell) {
        let source = cell.dataset.source;
        const field = cell.dataset.field;
        const rowIndex = cell.dataset.rowIndex;

        console.log(`Abriendo popup para: ${source}, campo: ${field}, fila: ${rowIndex}`);

        // Validar existencia de source y field
        if (!field) {
            console.warn('Celda sin data-field');
            return;
        }
        // Verificar bloqueo antes de abrir popup
        if (cell.dataset.locked === 'true' || this.storageManager.isFieldLocked(field)) {
            console.warn(`Campo bloqueado, no se puede abrir popup: ${field}`);
            return;
        }

        // Ajustar source para Contenidos según nivel educativo
        if (source === 'Contenidos') {
            const currentLevel = this.getActualEducationLevel?.();
            if (currentLevel === 'ESO' || currentLevel === 'Bachillerato') {
                source = 'Saberes Básicos';
            }
        }
        
        // Mapear source a menuType
        const menuType = this.mapSourceToMenuType(source);
        if (!menuType) {
            console.warn(`No se pudo mapear source a menuType: ${source}`);
            return;
        }

        // Extraer contexto de fila si es aplicable
        const context = this.extractRowContext(cell);

        this.openModalForField(menuType, {
            field,
            type: cell.dataset.type || null,
            rowIndex: context?.rowIndex ?? rowIndex ?? null
        });
    }

    /**
     * Abre un modal para un campo específico
     * @param {string} menuType - Tipo de menú a abrir
     * @param {Object} context - Contexto del campo
     * @returns {void}
     */
    openModalForField(menuType, context = null) {
        if (!window.modalComponent) {
            console.warn('modalComponent no disponible');
            return;
        }

        const dcKeyMap = {
            ods: 'ods',
            xxi: 'xxi',
            objetivos: 'objetivos',
            cpps: 'cpps',
            competenciasClave: 'competenciasClave',
            ra_ce: 'race',
            competenciasEspecificas: 'competenciasEspecificas',
            contenidos: 'contenidos',
            saberes: 'saberes',
            softskills: 'softskills',
            metodologia: 'metodologia',
            atencion_diversidad: 'diversidad',
            dua: 'dua',
            bloom: 'bloom',
            inteligencias: 'inteligencias'
        };

        const dcKey = dcKeyMap[menuType];
        if (!dcKey) {
            console.warn('No se pudo resolver dcKey para menuType:', menuType);
            return;
        }

        const rowIndex =
            context?.rowIndex !== null && context?.rowIndex !== undefined
                ? Number(context.rowIndex)
                : undefined;

        const section =
            context?.field?.startsWith('secuenciacion_didactica')
                ? 'secuenciacion_didactica'
                : context?.field?.startsWith('elementos_curriculares')
                    ? 'elementos_curriculares'
                    : null;

        window.modalComponent.setResumenMode({
            field: context?.field || '',
            type: context?.type || null,
            rowIndex,
            section,
            callback: (selectedData) => {
                this.handleModalSelection(
                    selectedData,
                    context?.field || '',
                    context?.type || null,
                    rowIndex
                );
            }
        });

        if (menuType === 'bloom') {
            window.modalComponent.openModal('bloom', 'bloom');
            return;
        }

        if (menuType === 'inteligencias') {
            window.modalComponent.openModal('inteligencias', 'inteligencias');
            return;
        }

        window.modalComponent.openModal('dc', dcKey);
    }

    /**
     * Abre un popup para selección de datos
     * @param {string} source - Fuente de datos
     * @param {string} field - Campo asociado
     * @param {string} type - Tipo de dato
     * @param {number} rowIndex - Índice de fila
     * @returns {void}
     */
    openPopupForSelection(source, field, type, rowIndex) {
        if (!window.modalComponent) {
            console.warn('modalComponent no disponible');
            return;
        }
        
        // Ajustar source para Contenidos según nivel educativo
        const menuType = this.mapSourceToMenuType(source);
        if (!menuType) {
            console.warn(`No se pudo mapear source a menuType: ${source}`);
            return;
        }

        // Mapear menuType a dcKey
        const dcKeyMap = {
            ods: 'ods',
            xxi: 'xxi',
            objetivos: 'objetivos',
            cpps: 'cpps',
            competenciasClave: 'competenciasClave',
            ra_ce: 'race',
            competenciasEspecificas: 'competenciasEspecificas',
            contenidos: 'contenidos',
            saberes: 'saberes',
            softskills: 'softskills',
            metodologia: 'metodologia',
            atencion_diversidad: 'diversidad',
            dua: 'dua',
            bloom: 'bloom',
            inteligencias: 'inteligencias'
        };

        const dcKey = dcKeyMap[menuType];
        if (!dcKey) {
            console.warn(`No se pudo resolver dcKey para menuType: ${menuType}`);
            return;
        }

        const section =
            field && field.startsWith('secuenciacion_didactica')
                ? 'secuenciacion_didactica'
                : field && field.startsWith('elementos_curriculares')
                    ? 'elementos_curriculares'
                    : null;

        window.modalComponent.setResumenMode({
            field,
            type,
            rowIndex: rowIndex !== null && rowIndex !== undefined ? Number(rowIndex) : undefined,
            section,
            callback: (selectedData) => {
                this.handleModalSelection(
                    selectedData,
                    field,
                    type,
                    rowIndex !== null && rowIndex !== undefined ? Number(rowIndex) : undefined
                );
            }
        });

        window.modalComponent.openModal('dc', dcKey);
    }

    /**
     * Extrae contexto de fila si la celda pertenece a una tabla
     * @param {HTMLElement} cell - Celda de la tabla
     * @returns {Object|null} Contexto de la fila o null si no aplica
     */
    extractRowContext(cell) {
        const row = cell.closest('tr');
        if (!row) return null;

        const rowIndex = Array.from(row.parentNode.children).indexOf(row);
        const sectionTable = cell.closest('.elements-table, .activities-table');

        if (sectionTable) {
            return {
                rowIndex: rowIndex,
                section: sectionTable.classList.contains('elements-table') ? 'elementos_curriculares' : 'secuenciacion_didactica'
            };
        }

        return null;
    }

    /**
     * Abre modal para campo específico
     */



    /**
     * Maneja añadir elemento a la lista
     * @param {HTMLElement} button - Botón que dispara la acción
     */
    handleAddListItem(button) {
        const field = button.dataset.field;
        const newItem = prompt('Nuevo objetivo:');

        if (newItem && newItem.trim()) {
            if (field === 'objetivos') {
                // Usar el método específico de sessionStorageManager
                const success = this.storageManager.addObjective(newItem.trim());
                if (success) {
                    this.data = this.storageManager.getState(); // Actualizar referencia local
                    this.render(); // Re-renderizar para mostrar el nuevo objetivo
                }
            } else {
                // Para otros campos de lista
                const fieldPath = field + '.valor';
                const currentItems = this.getFieldValue(fieldPath) || [];
                currentItems.push(newItem.trim());
                this.updateFieldValue(fieldPath, currentItems);
                this.render();
            }
        }
    }

    /**
     * Maneja eliminar elemento de la lista
     * @param {HTMLElement} button - Botón que dispara la acción
     */
    handleRemoveListItem(button) {
        const field = button.dataset.field;
        const index = parseInt(button.dataset.index);

        if (confirm('¿Eliminar este objetivo?')) {
            if (field === 'objetivos') {
                // Usar el método específico de sessionStorageManager
                const success = this.storageManager.removeObjective(index);
                if (success) {
                    this.data = this.storageManager.getState(); // Actualizar referencia local
                    this.render(); // Re-renderizar para mostrar los cambios
                }
            } else {
                // Para otros campos de lista
                const fieldPath = field + '.valor';
                const currentItems = this.getFieldValue(fieldPath) || [];
                if (index >= 0 && index < currentItems.length) {
                    currentItems.splice(index, 1);
                    this.updateFieldValue(fieldPath, currentItems);
                    this.render();
                }
            }
        }
    }

    /**
     * Renderiza los RA para la tabla
     * @param {Array} ras - Array de RA
     * @returns {string} HTML con los RA
     */
    renderRAsForTable(ras) {
        if (!Array.isArray(ras) || ras.length === 0) return 'Seleccionar RA...';
        return ras.map(ra => `<strong>${ra.ra_id}:</strong> ${ra.ra_descripcion}`).join('<br>');
    }

    /**
     * Renderiza los CE para la tabla
     * @param {Array} ras - Array de RA
     * @returns {string} HTML con los CE
     */
    renderCEsForTable(ras) {
        if (!Array.isArray(ras) || ras.length === 0) return 'Seleccionar CE...';
        const allCes = [];
        ras.forEach(ra => {
            if (ra.ra_ce && Array.isArray(ra.ra_ce)) {
                ra.ra_ce.forEach(ce => allCes.push(`<strong>${ce.ce_id}:</strong> ${ce.ce_descripcion}`));
            }
        });
        return allCes.length > 0 ? allCes.join('<br>') : 'Sin CE seleccionados';
    }

    /**
     * Renderiza los contenidos para la tabla
     * @param {Array} ras - Array de RA
     * @returns {string} HTML con los contenidos
     */
    renderContenidosForTable(ras) {
        if (!Array.isArray(ras) || ras.length === 0) return 'Seleccionar contenidos...';
        const allContenidos = [];
        ras.forEach(ra => {
            if (ra.ra_contenidos && Array.isArray(ra.ra_contenidos)) {
                ra.ra_contenidos.forEach(bloque => {
                    allContenidos.push(`<strong>${bloque.bloque_id}:</strong> ${bloque.bloque_descripcion}`);
                    if (bloque.bloque_puntos && Array.isArray(bloque.bloque_puntos)) {
                        bloque.bloque_puntos.forEach(punto => {
                            allContenidos.push(`&nbsp;&nbsp;• ${punto.punto_descripcion}`);
                        });
                    }
                });
            }
        });
        return allContenidos.length > 0 ? allContenidos.join('<br>') : 'Sin contenidos seleccionados';
    }


    /**
     * Método público para obtener los datos actuales
     */
    getData() {
        return this.data;
    }
}

/**
 * Inicializa el componente ResumenComponent
 * @returns {ResumenComponent|null} Instancia del componente o null si no se pudo inicializar
 */
function initResumenComponent() {
    console.log('=== INICIALIZACIÓN RESUMEN ===');

    // Verificar que estamos en la pestaña de resumen
    const resumenContent = document.getElementById('resumen-content');
    console.log('Container resumen-content encontrado:', !!resumenContent);

    if (resumenContent) {
        console.log('Container resumen-content innerHTML actual:', resumenContent.innerHTML);

        // Asegurar que sessionStorageManager esté disponible
        console.log('sessionStorageManager disponible:', !!window.sessionStorageManager);

        if (!window.sessionStorageManager) {
            console.error('sessionStorageManager no está disponible');
            return null;
        }

        console.log('Creando nueva instancia de ResumenComponent...');
        try {
            const component = new ResumenComponent();
            console.log('✅ Componente Resumen inicializado correctamente');
            return component;
        } catch (error) {
            console.error('❌ Error al inicializar ResumenComponent:', error);
            return null;
        }
    } else {
        console.error('❌ Container resumen-content no encontrado en DOM');
        console.log('Elementos con ID disponibles:', [...document.querySelectorAll('[id]')].map(el => el.id));
        return null;
    }
}

/**
 * Inicializa automáticamente el componente ResumenComponent al cargar si la pestaña de resumen está activa
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('=== DIAGNÓSTICO RESUMEN DOM LOADED ===');

    // Verificar si la pestaña de resumen está activa
    const resumenTab = document.getElementById('tab-resumen');
    const isResumenActive = resumenTab && resumenTab.classList.contains('active');

    console.log('Pestaña resumen activa al cargar:', isResumenActive);

    if (isResumenActive) {
        console.log('Pestaña resumen activa, inicializando componente...');
        window.resumenComponent = initResumenComponent();
    } else {
        console.log('Pestaña resumen no activa, componente se inicializará cuando sea necesario');
    }
});

// Exponer función de inicialización globalmente
window.initResumenComponent = initResumenComponent;

// Exponer para uso externo
window.ResumenComponent = ResumenComponent;