/* ============================================
   MODAL COMPONENT - UNIFIED
   Manages: Fullscreen modal dialogs for DC, Eval, Resources
   Includes: XML data loading (previously in popup.js)
   ============================================ */
/**
 * ModalComponent es responsable de gestionar los diálogos modales en la aplicación, incluyendo la carga de datos XML, 
 * la construcción dinámica del contenido basado en el tipo de modal (Diseño Curricular, Evaluación, Recursos, etc.) 
 * y el manejo de la interacción del usuario dentro del modal.
 */
class ModalComponent {
    /**
     * Crea una nueva instancia de ModalComponent.
     * @param {*} store - La tienda de estado de la aplicación.
     */
    constructor(store) {
        this.store = store;
        this.currentType = null;
        this.currentKey = null;

        // XML Data Cache - carga única
        this.xmlData = {};
        this.xmlLoaded = false;
        this.xmlLoadPromise = null;

        this.elements = {
            overlay: document.getElementById('modalOverlay'),
            fullscreen: document.getElementById('modalFullscreen'),
            title: document.getElementById('modalTitle'),
            body: document.getElementById('modalBody'),
            closeButton: document.getElementById('modalClose'),
            cancelButton: document.getElementById('modalCancel'),
            saveButton: document.getElementById('modalSave')
        };

        // Selections storage
        this.selections = {};

        // Resumen mode support
        this.resumenMode = null;

        this.init();
    }

    // ============================================
    // INICIALIZACIÓN
    // ============================================

    /**
     * 
     */
    async init() {
        // Cargar XML primero (una única vez)
        await this.loadAllXMLData();

        this.setupEventListeners();

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupTriggerItems();
            });
        } else {
            this.setupTriggerItems();
        }

        console.log('✓ ModalComponent initialized with XML data');
    }

    // ============================================
    // CARGA DE DATOS XML (ÚNICA VEZ)
    // ============================================
    /**
     * Carga todos los archivos XML necesarios para el funcionamiento del modal.
     * Esta función se asegura de que los datos se carguen una sola vez y se almacenen en caché.
     * @returns {Promise<Object>} - Promesa que resuelve con los datos XML cargados.
     */
    async loadAllXMLData() {
        if (this.xmlLoaded) return this.xmlData;
        if (this.xmlLoadPromise) return this.xmlLoadPromise;

        this.xmlLoadPromise = this._doLoadAllXML();
        return this.xmlLoadPromise;
    }

    /**
     * Realiza la carga de todos los archivos XML.
     * @returns {Promise<Object>} - Promesa que resuelve con los datos XML cargados.
     */
    async _doLoadAllXML() {
        const xmlFiles = {
            metodologia: 'data/metodologias.xml',
            softskills: 'data/softskills.xml',
            ods: 'data/ods.xml',
            xxi: 'data/reto_xxi.xml',
            bloom: 'data/bloom.xml',
            inteligencias: 'data/gardner.xml',
            competencias_clave: 'data/competencias_clave.xml',
            objetivos_etapa: 'data/objetivos_etapa.xml',
        };

        console.log('Loading XML data files...');
        // Cargar cada archivo XML y almacenarlo en this.xmlData
        for (const [key, path] of Object.entries(xmlFiles)) {
            try {
                const response = await fetch(path);
                if (!response.ok) {
                    console.warn(`⚠️ Could not load ${path}`);
                    continue;
                }

                const xmlText = await response.text();
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

                const parseError = xmlDoc.querySelector('parsererror');
                if (parseError) {
                    console.error(`❌ XML parsing error for ${key}`);
                    continue;
                }

                this.xmlData[key] = xmlDoc;
                console.log(`✓ Loaded ${key}`);

            } catch (error) {
                console.error(`❌ Error loading ${key}:`, error);
            }
        }
        // Marcar como cargado incluso si algunos archivos fallaron, para evitar reintentos infinitos
        this.xmlLoaded = true;
        console.log('📦 XML loading complete:', Object.keys(this.xmlData));
        return this.xmlData;
    }

    // ============================================
    // SCROLL TO TOP
    // ============================================
    /**
     * Resetea la posición de scroll del modal al abrirlo, asegurando que el usuario vea el contenido desde el inicio.
     */
    resetModalScrollToTop() {
        // 1) El contenedor principal del contenido
        if (this.elements?.body) this.elements.body.scrollTop = 0;

        // 2) Si hay un wrapper con overflow auto dentro del HTML renderizado
        const innerScroll = this.elements?.body?.querySelector?.('[data-scroll-container="true"]');
        if (innerScroll) innerScroll.scrollTop = 0;

        // 3) “Doble tick” para asegurar que después del reflow se quede arriba
        requestAnimationFrame(() => {
            if (this.elements?.body) this.elements.body.scrollTop = 0;
            if (innerScroll) innerScroll.scrollTop = 0;
        });
    }


    // ============================================
    // EVENT LISTENERS
    // ============================================
    /**
     * Configura los event listeners para los botones del modal (cerrar, cancelar, guardar) y para cerrar el modal al hacer clic fuera del contenido o al presionar Escape.
     */
    setupEventListeners() {
        if (this.elements.closeButton) {
            this.elements.closeButton.addEventListener('click', () => this.close());
        }
        if (this.elements.cancelButton) {
            this.elements.cancelButton.addEventListener('click', () => this.close());
        }
        if (this.elements.saveButton) {
            this.elements.saveButton.addEventListener('click', () => this.save());
        }

        if (this.elements.overlay) {
            this.elements.overlay.addEventListener('click', (e) => {
                if (e.target === this.elements.overlay) {
                    this.close();
                }
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen()) {
                this.close();
            }
        });
    }

    /**
     * Configura los event listeners para los elementos que actúan como disparadores de los modales, diferenciando por tipo (Diseño Curricular, 
     * Evaluación, Recursos) y manejando casos específicos para elementos de secundaria que requieren asignatura seleccionada.
     */
    setupTriggerItems() {
        console.log('Setting up modal trigger items...');

        // Diseño Curricular items
        document.querySelectorAll('[data-dc]').forEach(item => {
            item.addEventListener('click', async (e) => {
                e.stopPropagation();
                const key = item.dataset.dc;

                // Verificar si es un elemento de Secundaria y si hay asignatura seleccionada
                const isSecondaryElement = ['descripcion', 'objetivos_etapa', 'competencias_clave', 'competenciasEspecificas', 'saberes'].includes(key);
                const currentEducationLevel = window.contextManager?.currentEducationLevel;
                const currentSubject = window.contextManager?.currentSubject;

                if (isSecondaryElement && currentEducationLevel === 'SEC' && !currentSubject) {
                    // Mostrar mensaje de advertencia similar al de Orientación
                    await this.showWarningModal('Seleccione una asignatura', 'Por favor, seleccione una asignatura antes de acceder a este contenido.');
                    return;
                }

                await this.openModal('dc', key);
            });
        });

        // Evaluación items
        document.querySelectorAll('[data-eval]').forEach(item => {
            item.addEventListener('click', async (e) => {
                e.stopPropagation();
                const key = item.dataset.eval;
                await this.openModal('eval', key);
            });
        });

        // Recursos items
        document.querySelectorAll('[data-resource]').forEach(item => {
            item.addEventListener('click', async (e) => {
                e.stopPropagation();
                const key = item.dataset.resource;
                await this.openModal('resource', key);
            });
        });

        console.log('✓ Trigger items configured');
    }

    // ============================================
    // MODAL OPEN/CLOSE
    // ============================================
    /**
     * Abre un modal específico según el tipo y la clave proporcionados.
     * @param {string} type - El tipo de modal a abrir (dc, eval, resource, bloom, inteligencias).
     * @param {string} key - La clave específica del contenido dentro del tipo de modal.
     * @returns {Promise<void>} - Promesa que se resuelve cuando el modal ha sido abierto y el contenido ha sido renderizado.
     */
    async openModal(type, key) {
    console.log('Opening modal:', type, key);

    // Asegurar que XML está cargado
    await this.loadAllXMLData();

    const state = this.store.getState();
    let data;

    switch (type) {
        case 'bloom':
            data = { title: 'Taxonomía de Bloom' };
            break;

        case 'inteligencias':
            data = { title: 'Inteligencias Múltiples' };
            break;

        case 'dc':
            if (key === 'saberes') {
                data = state.disenoCurricular.saberesBasicos;
            } else {
                data = state.disenoCurricular[key];
            }
            break;

        case 'eval':
            const evalKeyMap = {
                'rubrica': 'rubrica',
                'autoevaluacion': 'autoevaluacion',
                'coevaluacion': 'coevaluacion',
                'lista-valoracion': 'listaValoracion',
                'lista-control': 'listaControl'
            };
            data = state.evaluacion[evalKeyMap[key]];
            break;

        case 'resource':
            data = state.recursos[key];
            break;
    }

    // Para elementos de secundaria, permitir continuar sin data del estado general
    const isSecondaryLevel = state.educationalLevel === 'SEC';
    const secondaryElements = ['descripcion', 'objetivos_etapa', 'competencias_clave', 'competenciasEspecificas', 'saberes'];

    if (!data) {
        if (type === 'dc' && isSecondaryLevel && secondaryElements.includes(key)) {
            console.log('Continuing with secondary element without general state data:', key);
            data = { title: this.getSecondaryElementTitle(key) };
        } else {
            console.error('Data not found for:', type, key);
            alert('Error: No se encontraron datos para este elemento');
            return;
        }
    }

    this.currentType = type;
    this.currentKey = key;
    this.elements.title.textContent = data.title || 'Contenido';

    // Build content based on type
    await this.buildContent(type, key, data);

    this.open();
}

    /**
     * Obtiene el título para elementos de secundaria
     */
    getSecondaryElementTitle(key) {
        const titles = {
            'descripcion': 'Descripción de la Asignatura',
            'objetivos_etapa': 'Objetivos de Etapa',
            'competencias_clave': 'Competencias Clave',
            'competenciasEspecificas': 'Competencias Específicas',
            'saberes': 'Saberes Básicos'
        };
        return titles[key] || 'Contenido Educativo';
    }

    /**
     * Construye el contenido del modal según el tipo y la clave proporcionados.
     * @param {string} type - El tipo de modal (dc, eval, resource, bloom, inteligencias).
     * @param {string} key - La clave específica del contenido dentro del tipo de modal.
     * @param {Object} data - Los datos específicos para construir el contenido del modal.
     */
   async buildContent(type, key, data) {
    if (type === 'dc') {
        await this.buildDCContent(key, data);
    } else if (type === 'eval') {
        await this.buildEvalContent(key, data);
    } else if (type === 'resource') {
        await this.buildResourceContent(key, data);
    } else if (type === 'bloom') {
        this.renderBloom(data);
    } else if (type === 'inteligencias') {
        this.renderInteligencias(data);
    } else {
        this.buildDefaultContent(data);
    }
}
    /**
     * Construye el contenido del modal para elementos de Diseño Curricular (DC).
     * @param {string} key - La clave específica del contenido dentro del tipo DC.
     * @param {Object} data - Los datos específicos para construir el contenido del modal.
     * @returns {Promise<void>}
     */
    async buildDCContent(key, data) {
        // Para elementos de FP, verificar si tenemos datos del módulo/ciclo seleccionado
        const state = this.store.getState();
        const isFP = state.educationalLevel === 'FP';


        if (isFP) {
            // Lista de popups que requieren módulo seleccionado
            const fpPopups = ['orientacion', 'prospectiva', 'race', 'contenidos', 'objetivos', 'cpps'];

            if (fpPopups.includes(key)) {
                // Verificar si hay módulo seleccionado
                if (!window.contextManager?.currentModule) {
                    this.renderFPWarningNoModule(key);
                    return;
                }
            }

            // Usar datos del módulo/ciclo seleccionado si están disponibles
            switch (key) {
                case 'orientacion':
                    if (this.fpModuleData?.orientacion) {
                        this.renderFPOrientacion(this.fpModuleData.orientacion);
                        return;
                    }
                    break;
                case 'prospectiva':
                    if (this.fpCycleData?.prospectiva) {
                        this.renderFPProspectiva(this.fpCycleData.prospectiva, this.fpCycleData.entorno_profesional);
                        return;
                    }
                    break;
                case 'race':
                    if (this.fpModuleData?.race) {
                        this.renderFPRACE(this.fpModuleData.race);
                        return;
                    }
                    break;
                case 'contenidos':
                    if (this.fpModuleData?.contenidos) {
                        this.renderFPContenidos(this.fpModuleData.contenidos);
                        return;
                    }
                    break;
                case 'objetivos':
                    if (this.fpCycleData?.objetivos) {
                        this.renderFPObjetivos(this.fpCycleData.objetivos);
                        return;
                    }
                    break;
                case 'cpps':
                    if (this.fpCycleData?.cpps) {
                        this.renderFPCPPs(this.fpCycleData.cpps);
                        return;
                    }
                    break;
            }
        }

        // Para elementos de Secundaria, usar datos de la asignatura seleccionada
        const isSecondaryLevel = state.educationalLevel === 'SEC';
        if (isSecondaryLevel) {
            switch (key) {
                case 'descripcion':
                    console.log('Trying to show descripcion popup');
                    console.log('secondarySubjectData:', this.secondarySubjectData);
                    console.log('Context manager currentSubject:', window.contextManager?.currentSubject);

                    if (this.secondarySubjectData) {
                        console.log('Rendering descripcion with data');
                        this.renderSecondaryDescripcion(this.secondarySubjectData);
                        return;
                    } else {
                        console.warn('No secondarySubjectData available for descripcion');
                        this.elements.body.innerHTML = this.renderErrorMessage('Descripción', 'No se han cargado los datos de la asignatura seleccionada');
                        return;
                    }
                    break;
                case 'objetivos_etapa':
                    // Los objetivos de etapa vienen del XML cargado
                    if (this.xmlData && this.xmlData.objetivos_etapa) {
                        this.renderObjetivosEtapa(this.xmlData.objetivos_etapa);
                        return;
                    } else {
                        console.warn('No objetivos_etapa XML data available');
                        console.log('Available XML keys:', Object.keys(this.xmlData || {}));
                    }
                    break;
                case 'competenciasClave':
                case 'competencias_clave':
                    if (this.secondarySubjectData?.competencias_clave) {
                        this.renderCompetenciaClave(this.secondarySubjectData.competencias_clave);
                        return;
                    }
                    break;
                case 'competenciasEspecificas':
                    if (this.secondarySubjectData?.competencias_especificas) {
                        this.renderSecondaryCompetenciasEspecificas(this.secondarySubjectData.competencias_especificas);
                        return;
                    }
                    break;
                case 'saberes':
                    if (this.secondarySubjectData?.saberes_basicos) {
                        this.renderSecondarySaberesBasicos(this.secondarySubjectData.saberes_basicos);
                        return;
                    }
                    break;
            }
        }

        // Fallback a renderizadores originales si no hay datos de FP
        switch (key) {
            case 'competencias_clave':
            case 'competenciasClave':
                this.renderCompetenciaClave(data);
                break;
            case 'objetivosEtapa':
                this.renderObjetivosEtapa(data);
                break;
            case 'orientacion':
                this.renderOrientacion(data);
                break;
            case 'prospectiva':
                this.renderProspectiva(data);
                break;
            case 'race':
                this.renderRACE(data);
                break;
            case 'contenidos':
                this.renderContenidos(data);
                break;
            case 'objetivos':
                this.renderObjetivos(data);
                break;
            case 'cpps':
                this.renderCPPs(data);
                break;
            case 'metodologia':
                this.renderMetodologia(data);
                break;
            case 'softskills':
                this.renderSoftSkills(data);
                break;
            case 'ods':
                this.renderODS(data);
                break;
            case 'xxi':
                this.renderXXI(data);
                break;
            case 'bloom':
                this.renderBloom(data);
                break;
            case 'inteligencias':
                this.renderInteligencias(data);
                break;
            case 'dua':
                this.renderDUA(data);
                break;
            case 'diversidad':
                this.renderDiversidad(data);
                break;
            default:
                this.buildDefaultContent(data);
        }
    }

    /**
     * Construye el contenido del modal para elementos de Evaluación.
     * @param {string} key - La clave específica del contenido dentro del tipo Evaluación.
     * @param {Object} data - Los datos específicos para construir el contenido del modal.
     * @returns {Promise<void>}
     */
    async buildEvalContent(key, data) {
        switch (key) {
            case 'rubrica':
                this.buildRubricaEditor(data);
                break;
            case 'autoevaluacion':
            case 'coevaluacion':
            case 'lista-valoracion':
            case 'lista-control':
                this.buildListaValoracion(data, key);
                break;
            default:
                this.buildDefaultContent(data);
        }
    }

    /**
     * Construye el contenido del modal para elementos de Recursos.
     * @param {string} key - La clave específica del contenido dentro del tipo Recursos.
     * @param {Object} data - Los datos específicos para construir el contenido del modal.
     * @returns {Promise<void>}
     */
    async buildResourceContent(key, data) {
        switch (key) {
            case 'apuntes':
                this.buildApuntesPDF(data);
                break;
            case 'presentacion':
                this.buildPresentacionDocente(data);
                break;
            case 'videos':
                this.buildVideosInterface(data);
                break;
            default:
                this.buildDefaultContent(data);
        }
    }

    /**
     * Abre el modal.
     */
    open() {
        if (this.elements.overlay) {
            this.elements.overlay.classList.add('show');
            document.body.style.overflow = 'hidden';

            // Reset scroll position to top when modal opens
            if (this.elements.body) {
                this.elements.body.scrollTop = 0;
            }
        }
    }

    /**
     * Cierra el modal y limpia cualquier estado o contenido específico relacionado con el tipo de modal 
     * que se estaba mostrando, como limpiar el visor de apuntes si se estaba mostrando ese recurso.
     */
    close() {
        if (this.currentType === 'resource' && this.currentKey === 'apuntes' && window.documentsComponent) {
            window.documentsComponent.cleanup();
        }

        if (this.elements.overlay) {
            this.elements.overlay.classList.remove('show');
            document.body.style.overflow = '';
        }
        this.currentType = null;
        this.currentKey = null;
    }

    /**
     * Verifica si el modal está abierto.
     * @returns {boolean} - True si el modal está abierto, false en caso contrario.
     */
    isOpen() {
        return this.elements.overlay && this.elements.overlay.classList.contains('show');
    }

    // ============================================
    // HELPER: Añadir notas adicionales
    // ============================================
    /**
     * Obtiene el HTML para el campo de notas adicionales en el modal.
     * @returns {string} - El HTML del campo de notas adicionales.
     */
    getNotasAdicionalesHTML() {
        return `
            <div class="form-group" style="margin-top: 24px;">
                <label class="form-label">Notas adicionales</label>
                <textarea 
                    class="form-textarea" 
                    id="modalNotes" 
                    style="min-height: 120px;"
                    placeholder="Añade notas, referencias o comentarios adicionales..."
                ></textarea>
            </div>
        `;
    }

    // ============================================
    // HELPER: Setup listeners para checkboxes jerárquicos
    // ============================================
    /**
     * Configura los listeners para los checkboxes jerárquicos en el modal.
     * Los checkboxes de categoría controlan los checkboxes de los ítems,
     * y los checkboxes de los ítems actualizan el estado de la categoría correspondiente.
     */
    setupHierarchicalListeners() {
        // Category checkbox - select/deselect all items
        document.querySelectorAll('.category-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const categoryIndex = e.target.dataset.category;
                const isChecked = e.target.checked;

                document.querySelectorAll(`.item-checkbox[data-category="${categoryIndex}"]`).forEach(itemCheckbox => {
                    itemCheckbox.checked = isChecked;
                });
            });
        });

        // Item checkbox - update category state
        document.querySelectorAll('.item-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const categoryIndex = e.target.dataset.category;
                const categoryCheckbox = document.querySelector(`.category-checkbox[data-category="${categoryIndex}"]`);
                if (!categoryCheckbox) return;

                const allItems = document.querySelectorAll(`.item-checkbox[data-category="${categoryIndex}"]`);
                const checkedItems = Array.from(allItems).filter(cb => cb.checked);

                if (checkedItems.length === 0) {
                    categoryCheckbox.checked = false;
                    categoryCheckbox.indeterminate = false;
                } else if (checkedItems.length === allItems.length) {
                    categoryCheckbox.checked = true;
                    categoryCheckbox.indeterminate = false;
                } else {
                    categoryCheckbox.checked = false;
                    categoryCheckbox.indeterminate = true;
                }
            });
        });
    }

    // ============================================
    // RENDERIZADORES ESPECÍFICOS - DISEÑO CURRICULAR
    // ============================================



    // -- COMPETENCIAS CLAVE ---
    /**
     * Renderiza las competencias clave en el modal.
     * @param {Object} data - Los datos específicos para construir el contenido del modal.
     * @returns {void}
     */
    renderCompetenciaClave(data) {
        const xmlDoc =
            this.xmlData?.competencias_clave;

        if (!xmlDoc) {
            this.elements.body.innerHTML = this.renderErrorMessage(
                'Competencias clave',
                'No se pudieron cargar las competencias clave'
            );
            return;
        }

        const compList = Array.from(xmlDoc.querySelectorAll('competencia'));

        // Estado persistente
        if (!this.selectedCompetencias) this.selectedCompetencias = new Set();           // competencias completas
        if (!this.selectedCompetenciasDesc) this.selectedCompetenciasDesc = new Map();   // compId -> Set(descriptorCodigo)
        if (!this.expandedCompetencias) this.expandedCompetencias = new Set();           // compId expand/collapse

        const styles = `
<style>
    .comp-table-modern{
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
    }
    .comp-table-modern thead th{
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-weight: 600;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 16px 20px;
        text-align: left;
        border-bottom: 2px solid var(--border-color);
        position: sticky;
        top: 0;
        z-index: 10;
    }
    .comp-table-modern tbody td{
        padding: 16px 20px;
        vertical-align: top;
        border-bottom: 1px solid var(--border-color);
        font-size: 14px;
        line-height: 1.6;
        color: var(--text-secondary);
    }

    /* Competencia row */
    .comp-row{
        cursor: pointer;
        transition: all 0.2s ease;
        background: var(--bg-primary);
    }
    .comp-row:nth-child(even){
        background: var(--bg-secondary);
    }
    .comp-row:hover{
        background: color-mix(in srgb, var(--row-accent) 7%, var(--bg-primary));
    }

    .comp-row.selected{
        background: color-mix(in srgb, var(--row-accent) 15%, var(--bg-primary));
        box-shadow: inset 4px 0 0 var(--row-accent);
    }
    .comp-row.selected td{ color: var(--text-primary); }

    .comp-row.partial{
        background: color-mix(in srgb, var(--row-accent) 9%, var(--bg-primary));
        box-shadow: inset 4px 0 0 color-mix(in srgb, var(--row-accent) 65%, #ffffff);
    }
    .comp-row.partial td{ color: var(--text-primary); }

    /* Descriptores wrap */
    .comp-desc-wrap{
        padding: 0;
        border-bottom: 1px solid var(--border-color);
        background: var(--bg-primary);
    }
    .comp-desc-wrap.collapsed{ display:none; }

    .comp-desc{
        padding: 10px 12px 14px 12px;
        background: color-mix(in srgb, var(--row-accent) 4%, var(--bg-primary));
        border-top: 1px dashed var(--border-color);
    }
    .comp-desc-title{
        font-size: 12px;
        color: var(--text-secondary);
        margin: 2px 0 10px 0;
    }

    /* Mini table descriptores */
    .comp-desc-table{
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border-radius: 10px;
        overflow: hidden;
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
    }
    .comp-desc-table thead th{
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-weight: 700;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: .4px;
        padding: 12px 12px;
        border-bottom: 1px solid var(--border-color);
        position: sticky;
        top: 0;
        z-index: 5;
    }
    .comp-desc-table tr{
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .comp-desc-table tr:nth-child(even){
        background: var(--bg-secondary);
    }
    .comp-desc-table tr:hover{
        background: color-mix(in srgb, var(--row-accent) 7%, var(--bg-primary));
    }
    .comp-desc-table td{
        padding: 12px 12px;
        border-bottom: 1px solid var(--border-color);
        font-size: 13px;
        color: var(--text-secondary);
        vertical-align: top;
    }
    .comp-desc-table tr:last-child td{ border-bottom:none; }

    .comp-desc-row.selected{
        background: color-mix(in srgb, var(--row-accent) 15%, var(--bg-primary));
    }
    .comp-desc-row.selected td{ color: var(--text-primary); }

    /* Checkbox */
    .comp-check{
        width: 22px;
        height: 22px;
        border: 2px solid var(--border-color);
        border-radius: 6px;
        display:flex;
        align-items:center;
        justify-content:center;
        transition: all 0.2s ease;
        background: var(--bg-primary);
        margin: 0 auto;
        position: relative;
    }
    .comp-row.selected .comp-check,
    .comp-desc-row.selected .comp-check{
        background: var(--row-accent);
        border-color: var(--row-accent);
    }
    .comp-row.partial .comp-check{
        background: color-mix(in srgb, var(--row-accent) 35%, var(--bg-primary));
        border-color: color-mix(in srgb, var(--row-accent) 65%, var(--border-color));
    }

    .comp-check svg{
        width: 14px;
        height: 14px;
        color: white;
        opacity: 0;
        transform: scale(0.5);
        transition: all 0.2s ease;
    }
    .comp-row.selected .comp-check svg,
    .comp-desc-row.selected .comp-check svg{
        opacity: 1;
        transform: scale(1);
    }

    .comp-check .indeterminate{
        width: 12px;
        height: 3px;
        border-radius: 2px;
        background: white;
        opacity: 0;
        transform: scaleX(0.6);
        transition: all 0.2s ease;
        position: absolute;
    }
    .comp-row.partial .comp-check .indeterminate{
        opacity: 1;
        transform: scaleX(1);
    }

    /* Toolbar */
    .comp-toolbar{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        margin-bottom:12px;
        padding:12px 14px;
        border:1px solid var(--border-color);
        border-radius:12px;
        background: var(--bg-secondary);
    }
    .comp-clear{
        border:1px solid var(--border-color);
        background: var(--bg-primary);
        color: var(--text-primary);
        padding:8px 12px;
        border-radius:10px;
        cursor:pointer;
        transition: all 0.2s ease;
    }
    .comp-clear:hover{ background: var(--bg-tertiary); }

    /* Chip */
    .comp-chip{
        display:flex;
        align-items:center;
        gap:10px;
        font-weight: 700;
        color: var(--text-primary);
    }
    .comp-dot{
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--row-accent);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--row-accent) 18%, transparent);
    }

    /* Toggle */
    .comp-desc-toggle{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
    }
    .comp-toggle-btn{
        width: 34px;
        height: 34px;
        border-radius: 10px;
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
        cursor: pointer;
        display:flex;
        align-items:center;
        justify-content:center;
        transition: all 0.2s ease;
    }
    .comp-toggle-btn:hover{
        background: color-mix(in srgb, var(--row-accent) 10%, var(--bg-primary));
        border-color: color-mix(in srgb, var(--row-accent) 30%, var(--border-color));
    }
    .comp-toggle-btn i{
        width: 18px;
        height: 18px;
        color: var(--text-primary);
        transition: transform 0.2s ease;
    }
    .comp-toggle-btn[aria-expanded="true"] i{
        transform: rotate(180deg);
    }

    @media (max-width: 980px){
        /* Compacta: ocultamos la columna de descripción de competencia, pero NO las dos columnas de descriptores */
        .comp-table-modern thead th:nth-child(3),
        .comp-table-modern td:nth-child(3){
            display:none;
        }
    }
</style>
    `;

        const countSelected = () => {
            let descCount = 0;
            for (const set of this.selectedCompetenciasDesc.values()) descCount += set.size;
            return { comps: this.selectedCompetencias.size, desc: descCount };
        };
        const { comps, desc } = countSelected();

        let html = styles + `
<div class="comp-toolbar">
    <div>
        <strong>Seleccionados:</strong>
        <span id="compSelectionCount">${comps}</span> competencias ·
        <span id="compDescSelectionCount">${desc}</span> descriptores
        <div style="font-size:12px;color:var(--text-secondary);margin-top:6px;">
            Clic en competencia = selecciona todos sus descriptores. Clic en descriptor = selección individual. Botón ▾ = desplegar.
        </div>
    </div>
    <button type="button" id="compClearSelection" class="comp-clear">Limpiar</button>
</div>

<div data-scroll-container="true" style="overflow:auto; border-radius:12px;">
    <table class="comp-table-modern">
        <thead>
            <tr>
                <th style="width:60px; text-align:center;">✓</th>
                <th style="width:30%;">Competencia</th>
                <th style="width:40%;">Descripción</th>
                <th>Descriptores</th>
            </tr>
        </thead>
        <tbody id="compTableBody">
`;

        compList.forEach((c, index) => {
            const id = (c.querySelector('id')?.textContent || `COMP_${index + 1}`).trim();
            const titulo = (c.querySelector('titulo')?.textContent || 'Sin título').trim();
            const descripcion = (c.querySelector('descripcion')?.textContent || '').trim();
            const color = (c.querySelector('color_hex')?.textContent || '#2b6cb0').trim();

            const descs = Array.from(c.querySelectorAll('descriptores > descriptor')).map(d => ({
                codigo: (d.querySelector('codigo')?.textContent || '').trim(),
                educacionBasica: (d.querySelector('educacion_basica')?.textContent || '').trim(),
                bachillerato: (d.querySelector('bachillerato')?.textContent || '').trim()
            })).filter(d => d.codigo);

            const selectedSet = this.selectedCompetenciasDesc.get(id) || new Set();
            const total = descs.length;
            const selected = selectedSet.size;

            const isAll = total > 0 && selected === total;
            const isPartial = selected > 0 && selected < total;
            const rowClass = isAll ? 'selected' : (isPartial ? 'partial' : '');

            const expanded = this.expandedCompetencias.has(id);
            const ariaExpanded = expanded ? 'true' : 'false';

            html += `
<tr class="comp-row ${rowClass}" data-comp="${id}" style="--row-accent:${color}">
    <td style="text-align:center;">
        <div class="comp-check">
            <span class="indeterminate"></span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        </div>
    </td>
    <td>
        <div class="comp-chip">
            <span class="comp-dot"></span>
            ${id}: ${titulo}
        </div>
    </td>
    <td>${descripcion || '-'}</td>
    <td style="white-space:nowrap;">
        <div class="comp-desc-toggle">
            <span><strong>${descs.length}</strong> descriptor(es)</span>
            <button type="button"
                class="comp-toggle-btn"
                data-toggle="comp"
                data-comp="${id}"
                aria-expanded="${ariaExpanded}"
                aria-label="Desplegar descriptores de ${id}">
                <i data-lucide="chevron-down"></i>
            </button>
        </div>
    </td>
</tr>

<tr class="comp-desc-wrap ${expanded ? '' : 'collapsed'}" data-comp-desc-wrap="${id}" style="--row-accent:${color}">
    <td colspan="4">
        <div class="comp-desc">
            <div class="comp-desc-title">Descriptores de ${id} (Educación Básica/Secundaria vs Bachillerato)</div>

            ${descs.length ? `
            <table class="comp-desc-table">
                <thead>
                    <tr>
                        <th style="width:60px; text-align:center;">✓</th>
                        <th style="width:110px;">Código</th>
                        <th>Educación Básica / Secundaria</th>
                        <th>Bachillerato</th>
                    </tr>
                </thead>
                <tbody>
                    ${descs.map(d => {
                const isSel = selectedSet.has(d.codigo) ? 'selected' : '';
                return `
                        <tr class="comp-desc-row ${isSel}" data-comp="${id}" data-desc="${d.codigo}" style="--row-accent:${color}">
                            <td style="width:60px; text-align:center;">
                                <div class="comp-check">
                                    <span class="indeterminate"></span>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                                         stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                </div>
                            </td>
                            <td style="width:110px; color:var(--text-primary); font-weight:800;">
                                ${d.codigo}
                            </td>
                            <td>${d.educacionBasica || '-'}</td>
                            <td>${d.bachillerato || '-'}</td>
                        </tr>
                        `;
            }).join('')}
                </tbody>
            </table>
            ` : `<div style="font-size:13px;color:var(--text-secondary);">No hay descriptores definidos.</div>`}
        </div>
    </td>
</tr>
`;
        });

        html += `
        </tbody>
    </table>
</div>
`;

        html += this.getNotasAdicionalesHTML();
        this.elements.body.innerHTML = html;

        // Evita el “salto al final” al abrir
        if (typeof this.resetModalScrollToTop === 'function') this.resetModalScrollToTop();

        this.setupCompetenciaClaveListeners();
        if (window.lucide) lucide.createIcons();
    }

    setupCompetenciaClaveListeners() {
        const tableBody = document.getElementById('compTableBody');
        const countComp = document.getElementById('compSelectionCount');
        const countDesc = document.getElementById('compDescSelectionCount');
        const clearBtn = document.getElementById('compClearSelection');

        if (!tableBody) return;

        if (!this.expandedCompetencias) this.expandedCompetencias = new Set();
        if (!this.selectedCompetencias) this.selectedCompetencias = new Set();
        if (!this.selectedCompetenciasDesc) this.selectedCompetenciasDesc = new Map();
        
        // Estructuras de datos para mantener el estado de selección y expansión
        const getWrap = (compId) =>
            tableBody.querySelector(`tr[data-comp-desc-wrap="${CSS.escape(compId)}"]`);
        
        //  Usamos data-comp-desc-wrap para el wrap de descriptores, y data-comp para filas de competencia y descriptor, así evitamos confusiones
        const getToggleBtn = (compId) =>
            tableBody.querySelector(`.comp-toggle-btn[data-comp="${CSS.escape(compId)}"]`);
        
        // Función para actualizar la UI de expansión/collapse
        const setExpandedUI = (compId, expanded) => {
            const wrap = getWrap(compId);
            const btn = getToggleBtn(compId);
            if (wrap) wrap.classList.toggle('collapsed', !expanded);
            if (btn) btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        };
        
        // Función para recalcular y actualizar los contadores de selección
        const recomputeCounts = () => {
            let descCount = 0;
            for (const set of this.selectedCompetenciasDesc.values()) descCount += set.size;
            if (countComp) countComp.textContent = this.selectedCompetencias.size;
            if (countDesc) countDesc.textContent = descCount;
        };
        
        // Función para actualizar el estado visual de una fila de competencia según sus descriptores seleccionados
        const setRowState = (compId) => {
            const compRow = tableBody.querySelector(`.comp-row[data-comp="${CSS.escape(compId)}"]`);
            if (!compRow) return;

            const descRows = tableBody.querySelectorAll(`.comp-desc-row[data-comp="${CSS.escape(compId)}"]`);
            const total = descRows.length;

            const set = this.selectedCompetenciasDesc.get(compId) || new Set();
            const selected = set.size;

            compRow.classList.remove('selected', 'partial');

            if (total > 0 && selected === total) {
                compRow.classList.add('selected');
                this.selectedCompetencias.add(compId);
            } else if (selected > 0 && selected < total) {
                compRow.classList.add('partial');
                this.selectedCompetencias.delete(compId);
            } else {
                this.selectedCompetencias.delete(compId);
            }
        };

        // Función para toggle selección de todos los descriptores de una competencia
        const toggleAllDescriptors = (compId) => {
            const descRows = tableBody.querySelectorAll(`.comp-desc-row[data-comp="${CSS.escape(compId)}"]`);

            // UX: si tiene descriptores y está cerrado, se abre
            if (descRows.length > 0 && !this.expandedCompetencias.has(compId)) {
                this.expandedCompetencias.add(compId);
                setExpandedUI(compId, true);
            }

            // Si no hay descriptores, selección simple
            if (descRows.length === 0) {
                const compRow = tableBody.querySelector(`.comp-row[data-comp="${CSS.escape(compId)}"]`);
                if (!compRow) return;

                if (compRow.classList.contains('selected')) {
                    compRow.classList.remove('selected');
                    this.selectedCompetencias.delete(compId);
                } else {
                    compRow.classList.add('selected');
                    this.selectedCompetencias.add(compId);
                }
                recomputeCounts();
                return;
            }

            let set = this.selectedCompetenciasDesc.get(compId);
            if (!set) { set = new Set(); this.selectedCompetenciasDesc.set(compId, set); }

            const allSelected = set.size === descRows.length;

            if (allSelected) {
                set.clear();
                descRows.forEach(r => r.classList.remove('selected'));
                this.selectedCompetenciasDesc.delete(compId);
            } else {
                set.clear();
                descRows.forEach(r => {
                    const code = r.dataset.desc;
                    if (code) set.add(code);
                    r.classList.add('selected');
                });
            }

            setRowState(compId);
            recomputeCounts();
        };

        // Función para toggle selección de un descriptor
        const toggleDescriptor = (compId, descCode, rowEl) => {
            let set = this.selectedCompetenciasDesc.get(compId);
            if (!set) { set = new Set(); this.selectedCompetenciasDesc.set(compId, set); }

            if (set.has(descCode)) {
                set.delete(descCode);
                rowEl.classList.remove('selected');
            } else {
                set.add(descCode);
                rowEl.classList.add('selected');
            }

            if (set.size === 0) this.selectedCompetenciasDesc.delete(compId);

            setRowState(compId);
            recomputeCounts();
        };

        tableBody.addEventListener('click', (e) => {
            // 1) Toggle expand
            const toggleBtn = e.target.closest('.comp-toggle-btn');
            if (toggleBtn) {
                e.stopPropagation();
                const compId = toggleBtn.dataset.comp;
                if (!compId) return;

                const isExpanded = this.expandedCompetencias.has(compId);
                if (isExpanded) this.expandedCompetencias.delete(compId);
                else this.expandedCompetencias.add(compId);

                setExpandedUI(compId, !isExpanded);
                if (window.lucide) lucide.createIcons();
                return;
            }

            // 2) Click descriptor
            const descRow = e.target.closest('.comp-desc-row');
            if (descRow) {
                const compId = descRow.dataset.comp;
                const descCode = descRow.dataset.desc;
                if (!compId || !descCode) return;
                toggleDescriptor(compId, descCode, descRow);
                return;
            }

            // 3) Click competencia
            const compRow = e.target.closest('.comp-row');
            if (compRow) {
                const compId = compRow.dataset.comp;
                if (!compId) return;
                toggleAllDescriptors(compId);
            }
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.selectedCompetencias.clear();
                this.selectedCompetenciasDesc.clear();

                tableBody.querySelectorAll('.comp-row.selected, .comp-row.partial')
                    .forEach(tr => tr.classList.remove('selected', 'partial'));
                tableBody.querySelectorAll('.comp-desc-row.selected')
                    .forEach(tr => tr.classList.remove('selected'));

                recomputeCounts();
            });
        }

        // Rehidratar estados UI
        const compRows = tableBody.querySelectorAll('.comp-row[data-comp]');
        compRows.forEach(r => {
            const compId = r.dataset.comp;
            setRowState(compId);
            setExpandedUI(compId, this.expandedCompetencias.has(compId));
        });

        recomputeCounts();
    }


    //  OBJETIVOS DE ETAPA ---
    /**
     * Render objetivos de etapa (ESO o Bachillerato)
     * @param {Object} opts
     * @param {"ESO"|"BACH"} opts.mode - qué bloque mostrar
     */
    renderObjetivosEtapa(opts = {}) {
        const xmlDoc =
            this.xmlData?.objetivos_etapa ||
            this.xmlData?.objetivosEtapa ||
            this.xmlData?.objetivos;

        if (!xmlDoc) {
            this.elements.body.innerHTML = this.renderErrorMessage(
                'Objetivos de etapa',
                'No se pudieron cargar los objetivos de etapa'
            );
            return;
        }

        // Obtener el nivel educativo actual del store (ESO o BACH)
        const currentSecLevel = this.store.getState().secLevel;
        const mode = (opts?.mode || currentSecLevel || "ESO").toUpperCase();
        const isESO = mode === "ESO";

        const etapaNode = isESO
            ? xmlDoc.querySelector('educacion_secundaria_obligatoria')
            : xmlDoc.querySelector('bachillerato');

        if (!etapaNode) {
            this.elements.body.innerHTML = this.renderErrorMessage(
                'Objetivos de etapa',
                `No se encontró el bloque para ${isESO ? 'ESO' : 'Bachillerato'}`
            );
            return;
        }

        const etapaLabel = (etapaNode.querySelector('etapa')?.textContent || (isESO ? 'ESO' : 'Bachillerato')).trim();

        // Color por etapa (puedes cambiarlo a tu gusto)
        const rowAccent = isESO ? '#2563eb' : '#7c3aed';

        // Estado persistente: selección por etapa
        if (!this.selectedObjetivosEtapa) this.selectedObjetivosEtapa = new Map(); // key(etapa) -> Set(codigo)
        const key = isESO ? 'ESO' : 'BACH';
        if (!this.selectedObjetivosEtapa.has(key)) this.selectedObjetivosEtapa.set(key, new Set());

        const selectedSet = this.selectedObjetivosEtapa.get(key);

        const objetivos = Array.from(etapaNode.querySelectorAll('objetivo')).map(o => ({
            codigo: (o.querySelector('codigo')?.textContent || '').trim(),
            descripcion: (o.querySelector('descripcion')?.textContent || '').trim()
        })).filter(x => x.codigo);

        const styles = `
<style>
    .obj-table-modern{
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
    }
    .obj-table-modern thead th{
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-weight: 600;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 16px 20px;
        text-align: left;
        border-bottom: 2px solid var(--border-color);
        position: sticky;
        top: 0;
        z-index: 10;
    }
    .obj-table-modern tbody td{
        padding: 16px 20px;
        vertical-align: top;
        border-bottom: 1px solid var(--border-color);
        font-size: 14px;
        line-height: 1.6;
        color: var(--text-secondary);
    }

    .obj-row{
        cursor: pointer;
        transition: all 0.2s ease;
        background: var(--bg-primary);
    }
    .obj-row:nth-child(even){
        background: var(--bg-secondary);
    }
    .obj-row:hover{
        background: color-mix(in srgb, var(--row-accent) 7%, var(--bg-primary));
    }

    .obj-row.selected{
        background: color-mix(in srgb, var(--row-accent) 15%, var(--bg-primary));
        box-shadow: inset 4px 0 0 var(--row-accent);
    }
    .obj-row.selected td{ color: var(--text-primary); }

    /* Checkbox */
    .obj-check{
        width: 22px;
        height: 22px;
        border: 2px solid var(--border-color);
        border-radius: 6px;
        display:flex;
        align-items:center;
        justify-content:center;
        transition: all 0.2s ease;
        background: var(--bg-primary);
        margin: 0 auto;
    }
    .obj-row.selected .obj-check{
        background: var(--row-accent);
        border-color: var(--row-accent);
    }
    .obj-check svg{
        width: 14px;
        height: 14px;
        color: white;
        opacity: 0;
        transform: scale(0.5);
        transition: all 0.2s ease;
    }
    .obj-row.selected .obj-check svg{
        opacity: 1;
        transform: scale(1);
    }

    /* Toolbar */
    .obj-toolbar{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        margin-bottom:12px;
        padding:12px 14px;
        border:1px solid var(--border-color);
        border-radius:12px;
        background: var(--bg-secondary);
    }
    .obj-clear{
        border:1px solid var(--border-color);
        background: var(--bg-primary);
        color: var(--text-primary);
        padding:8px 12px;
        border-radius:10px;
        cursor:pointer;
        transition: all 0.2s ease;
    }
    .obj-clear:hover{ background: var(--bg-tertiary); }

    /* Chip */
    .obj-chip{
        display:flex;
        align-items:center;
        gap:10px;
        font-weight: 800;
        color: var(--text-primary);
    }
    .obj-dot{
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--row-accent);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--row-accent) 18%, transparent);
    }

    @media (max-width: 820px){
        .obj-table-modern thead th:nth-child(3),
        .obj-table-modern td:nth-child(3){
            display:none; /* oculta descripción para compactar si quieres */
        }
    }
</style>
    `;

        const selectedCount = selectedSet.size;

        let html = styles + `
<div class="obj-toolbar" style="--row-accent:${rowAccent}">
    <div>
        <div class="obj-chip" style="--row-accent:${rowAccent}">
            <span class="obj-dot"></span>
            Objetivos de etapa · ${etapaLabel}
        </div>
        <div style="margin-top:6px;">
            <strong>Seleccionados:</strong>
            <span id="objSelectionCount">${selectedCount}</span> objetivos
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:6px;">
            Clic en un objetivo para seleccionar/deseleccionar.
        </div>
    </div>
    <button type="button" id="objClearSelection" class="obj-clear">Limpiar</button>
</div>

<div data-scroll-container="true" style="overflow:auto; border-radius:12px;">
    <table class="obj-table-modern" style="--row-accent:${rowAccent}">
        <thead>
            <tr>
                <th style="width:60px; text-align:center;">✓</th>
                <th style="width:120px;">Código</th>
                <th>Descripción</th>
            </tr>
        </thead>
        <tbody id="objTableBody" data-etapa="${key}">
`;

        objetivos.forEach(o => {
            const isSel = selectedSet.has(o.codigo) ? 'selected' : '';
            html += `
<tr class="obj-row ${isSel}" data-codigo="${o.codigo}" style="--row-accent:${rowAccent}">
    <td style="text-align:center;">
        <div class="obj-check">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        </div>
    </td>
    <td style="color:var(--text-primary); font-weight:800;">${o.codigo}</td>
    <td>${o.descripcion || '-'}</td>
</tr>
        `;
        });

        html += `
        </tbody>
    </table>
</div>
`;

        html += this.getNotasAdicionalesHTML();
        this.elements.body.innerHTML = html;

        // Scroll arriba (tu helper global)
        if (typeof this.resetModalScrollToTop === 'function') this.resetModalScrollToTop();

        this.setupObjetivosEtapaListeners({ key });
        if (window.lucide) lucide.createIcons();
    }

    /**
     * Configura listeners para selección de objetivos de etapa
     * @param {*} param0 
     * @returns 
     */
    setupObjetivosEtapaListeners({ key }) {
        const tableBody = document.getElementById('objTableBody');
        const countEl = document.getElementById('objSelectionCount');
        const clearBtn = document.getElementById('objClearSelection');

        if (!tableBody) return;

        if (!this.selectedObjetivosEtapa) this.selectedObjetivosEtapa = new Map();
        if (!this.selectedObjetivosEtapa.has(key)) this.selectedObjetivosEtapa.set(key, new Set());

        const selectedSet = this.selectedObjetivosEtapa.get(key);

        const recompute = () => {
            if (countEl) countEl.textContent = selectedSet.size;
        };

        const toggleRow = (row) => {
            const codigo = row.dataset.codigo;
            if (!codigo) return;

            if (selectedSet.has(codigo)) {
                selectedSet.delete(codigo);
                row.classList.remove('selected');
            } else {
                selectedSet.add(codigo);
                row.classList.add('selected');
            }
            recompute();
        };

        tableBody.addEventListener('click', (e) => {
            const row = e.target.closest('.obj-row');
            if (!row) return;
            toggleRow(row);
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                selectedSet.clear();
                tableBody.querySelectorAll('.obj-row.selected').forEach(r => r.classList.remove('selected'));
                recompute();
            });
        }

        recompute();
    }


    // --- ORIENTACIÓN ---
    /**
     * Renderiza la orientación del módulo profesional
     * @param {*} data 
     */
    renderOrientacion(data) {
        const content = data.content || 'La orientación del módulo profesional se centra en desarrollar competencias técnicas y profesionales alineadas con el perfil del título. Se priorizan metodologías activas que permitan al alumnado aplicar los conocimientos en contextos reales del sector productivo.';

        this.elements.body.innerHTML = `
            <div class="readonly-selectable-container">
                <div class="readonly-content">
                    <div class="readonly-item">
                        <input type="checkbox" id="ro-select" class="readonly-checkbox">
                        <label for="ro-select" class="readonly-label">
                            <div class="readonly-text">${content}</div>
                        </label>
                    </div>
                </div>
            </div>
            ${this.getNotasAdicionalesHTML()}
        `;
    }

    // --- PROSPECTIVA ---
    /**
     * Renderiza la prospectiva del módulo profesional
     * @param {*} data 
     */
    renderProspectiva(data) {
        const content = data.content || 'El análisis prospectivo del sector indica una creciente demanda de profesionales con competencias digitales avanzadas. La transformación digital y la sostenibilidad son ejes transversales que marcarán el futuro del sector, requiriendo profesionales adaptables y en constante actualización.';

        this.elements.body.innerHTML = `
            <div class="readonly-selectable-container">
                <div class="readonly-content">
                    <div class="readonly-item">
                        <input type="checkbox" id="ro-select" class="readonly-checkbox">
                        <label for="ro-select" class="readonly-label">
                            <div class="readonly-text">${content}</div>
                        </label>
                    </div>
                </div>
            </div>
            ${this.getNotasAdicionalesHTML()}
        `;
    }

    // --- RA/CE (Resultados de Aprendizaje / Criterios de Evaluación) ---
    /**
     * Renderiza los resultados de aprendizaje y criterios de evaluación del módulo profesional
     * @param {*} data 
     */
    renderRACE(data) {
        // TODO: Estos datos deberían venir del módulo/ciclo seleccionado
        const raceData = [
            {
                ra: '1. Reconoce las características de lenguajes de marcas analizando e interpretando fragmentos de código.',
                criterios: [
                    'a) Se han identificado y clasificado los lenguajes de marcas relacionados con la Web y sus diferentes versiones.',
                    'b) Se ha analizado la estructura de un documento HTML e identificado las secciones que lo componen.',
                    'c) Se ha reconocido la funcionalidad de las principales etiquetas y atributos del lenguaje HTML.',
                    'd) Se han establecido las semejanzas y diferencias entre los lenguajes HTML y XHTML.',
                    'e) Se ha reconocido la utilidad de XHTML en los sistemas de gestión de información.'
                ]
            },
            {
                ra: '2. Utiliza lenguajes de marcas para la transmisión de información a través de la Web analizando la estructura de los documentos e identificando sus elementos.',
                criterios: [
                    'a) Se han identificado y clasificado los lenguajes de marcas relacionados con la Web.',
                    'b) Se ha analizado la estructura de un documento XML.',
                    'c) Se han utilizado herramientas en la creación de documentos Web.',
                    'd) Se han identificado las ventajas que aportan los espacios de nombres.'
                ]
            }
        ];

        let html = '<div class="hierarchical-container">';
        
        // En este caso, cada RA es una categoría y sus criterios son los ítems. Se renderizan de forma jerárquica con checkboxes.
        raceData.forEach((item, catIndex) => {
            html += `
                <div class="hierarchical-category">
                    <div class="category-header">
                        <input type="checkbox" id="cat-${catIndex}" class="category-checkbox" data-category="${catIndex}">
                        <label for="cat-${catIndex}" class="category-label">${item.ra}</label>
                    </div>
                    <div class="category-items">
            `;

            item.criterios.forEach((criterio, itemIndex) => {
                html += `
                    <div class="hierarchical-item">
                        <input type="checkbox" id="item-${catIndex}-${itemIndex}" class="item-checkbox" 
                               data-category="${catIndex}" data-item="${itemIndex}">
                        <label for="item-${catIndex}-${itemIndex}" class="item-label">${criterio}</label>
                    </div>
                `;
            });

            html += '</div></div>';
        });

        html += '</div>';
        html += this.getNotasAdicionalesHTML();

        this.elements.body.innerHTML = html;
        this.setupHierarchicalListeners();
    }

    // --- CONTENIDOS ---
    /**
     * Renderiza los contenidos del módulo profesional
     * @param {*} data 
     */
    renderContenidos(data) {
        // TODO: Estos datos deberían venir del módulo/ciclo seleccionado
        const contenidosData = [
            {
                unidad: 'UF0373_13. Introducción y primeras aplicaciones',
                items: [
                    'Características de los lenguajes de marcas',
                    'Identificación de ámbitos de aplicación',
                    'Estructura y sintaxis de un documento XML',
                    'Validación de documentos'
                ]
            },
            {
                unidad: 'UF0373_23. Validación y transformación',
                items: [
                    'Definición de esquemas y vocabularios en XML',
                    'Creación de descripciones',
                    'Asociación con documentos XML',
                    'Validación y herramientas',
                    'Conversión y adaptación de documentos XML'
                ]
            }
        ];

        let html = '<div class="hierarchical-container">';

        contenidosData.forEach((unidad, catIndex) => {
            html += `
                <div class="hierarchical-category">
                    <div class="category-header">
                        <input type="checkbox" id="cat-${catIndex}" class="category-checkbox" data-category="${catIndex}">
                        <label for="cat-${catIndex}" class="category-label">${unidad.unidad}</label>
                    </div>
                    <div class="category-items">
            `;

            unidad.items.forEach((item, itemIndex) => {
                html += `
                    <div class="hierarchical-item">
                        <input type="checkbox" id="item-${catIndex}-${itemIndex}" class="item-checkbox" 
                               data-category="${catIndex}" data-item="${itemIndex}">
                        <label for="item-${catIndex}-${itemIndex}" class="item-label">${item}</label>
                    </div>
                `;
            });

            html += '</div></div>';
        });

        html += '</div>';
        html += this.getNotasAdicionalesHTML();

        this.elements.body.innerHTML = html;
        this.setupHierarchicalListeners();
    }

    // --- OBJETIVOS GENERALES ---
    /**
     * Renderiza los objetivos generales del ciclo formativo
     * @param {*} data 
     */
    renderObjetivos(data) {
        // TODO: Estos datos deberían venir del ciclo formativo
        const objetivos = [
            'a) Ajustar la configuración lógica analizando las necesidades y criterios establecidos para configurar y explotar sistemas informáticos.',
            'b) Identificar las necesidades de seguridad verificando el plan preestablecido para aplicar técnicas y procedimientos relacionados con la seguridad en sistemas.',
            'c) Instalar módulos analizando su estructura y funcionalidad para gestionar servidores de aplicaciones.',
            'd) Ajustar parámetros analizando la configuración para gestionar servidores de aplicaciones.',
            'e) Interpretar el diseño lógico de bases de datos, analizando y cumpliendo las especificaciones relativas a su aplicación, para gestionar bases de datos.'
        ];

        let html = '<div class="list-selectable-container">';

        objetivos.forEach((objetivo, index) => {
            html += `
                <div class="list-item">
                    <input type="checkbox" id="list-${index}" class="list-checkbox">
                    <label for="list-${index}" class="list-label">${objetivo}</label>
                </div>
            `;
        });

        html += '</div>';
        html += this.getNotasAdicionalesHTML();

        this.elements.body.innerHTML = html;
    }

    // --- CPPs (Competencias Profesionales, Personales y Sociales) ---
    renderCPPs(data) {
        // TODO: Estos datos deberían venir del ciclo formativo
        const cpps = [
            'a) Configurar y explotar sistemas informáticos, adaptando la configuración lógica del sistema según las necesidades de uso y los criterios establecidos.',
            'b) Aplicar técnicas y procedimientos relacionados con la seguridad en sistemas, servicios y aplicaciones, cumpliendo el plan de seguridad.',
            'c) Gestionar servidores de aplicaciones, adaptando su configuración en cada caso para permitir el despliegue de aplicaciones Web.',
            'd) Gestionar bases de datos, interpretando su diseño lógico y verificando integridad, consistencia, seguridad y accesibilidad de los datos.',
            'e) Desarrollar aplicaciones Web con acceso a bases de datos utilizando lenguajes, objetos de acceso y herramientas de mapeo adecuados a las especificaciones.'
        ];

        let html = '<div class="list-selectable-container">';

        cpps.forEach((cpp, index) => {
            html += `
                <div class="list-item">
                    <input type="checkbox" id="list-${index}" class="list-checkbox">
                    <label for="list-${index}" class="list-label">${cpp}</label>
                </div>
            `;
        });

        html += '</div>';
        html += this.getNotasAdicionalesHTML();

        this.elements.body.innerHTML = html;
    }

    // --- METODOLOGÍA (desde XML) ---
    /**
     * Renderiza las metodologías del módulo profesional
     * @param {*} data 
     * @returns 
     */
    renderMetodologia(data) {
        const xmlDoc = this.xmlData.metodologia;

        if (!xmlDoc) {
            this.elements.body.innerHTML = this.renderErrorMessage('metodología', 'No se pudieron cargar las metodologías');
            return;
        }

        const metodologias = xmlDoc.querySelectorAll('metodologia');

        // Estilos inline para la tabla moderna
        const styles = `
            <style>
                .metodologia-table-modern {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
                    border: 1px solid var(--border-color);
                }
                
                .metodologia-table-modern thead th {
                    background: var(--bg-secondary);
                    color: var(--text-primary);
                    font-weight: 600;
                    font-size: 13px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    padding: 16px 20px;
                    text-align: left;
                    border-bottom: 2px solid var(--border-color);
                    position: sticky;
                    top: 0;
                    z-index: 10;
                }
                
                .metodologia-table-modern thead th:first-child {
                    border-top-left-radius: 12px;
                }
                
                .metodologia-table-modern thead th:last-child {
                    border-top-right-radius: 12px;
                }
                
                .metodologia-table-modern tbody tr {
                    background: var(--bg-primary);
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                
                .metodologia-table-modern tbody tr:nth-child(even) {
                    background: color-mix(in srgb, var(--bg-secondary) 40%, var(--bg-primary));
                }

                .metodologia-table-modern tbody tr:hover {
                    background: color-mix(in srgb, var(--accent-color) 10%, var(--bg-primary));
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }

                .metodologia-table-modern tbody tr.selected {
                    background: color-mix(in srgb, var(--accent-color) 18%, var(--bg-primary));
                    box-shadow: inset 4px 0 0 var(--accent-color), 0 2px 8px rgba(0, 0, 0, 0.12);
                    transform: translateY(-1px);
                }
                
                .metodologia-table-modern tbody tr.selected td {
                    color: var(--text-primary);
                }
                
                .metodologia-table-modern tbody tr.selected .met-titulo {
                    color: var(--accent-color);
                }
                
                .metodologia-table-modern td {
                    padding: 18px 20px;
                    vertical-align: top;
                    border-bottom: 1px solid var(--border-color);
                    font-size: 14px;
                    line-height: 1.6;
                    color: var(--text-secondary);
                }
                
                .metodologia-table-modern tbody tr:last-child td {
                    border-bottom: none;
                }
                
                .metodologia-table-modern tbody tr:last-child td:first-child {
                    border-bottom-left-radius: 12px;
                }
                
                .metodologia-table-modern tbody tr:last-child td:last-child {
                    border-bottom-right-radius: 12px;
                }
                
                .met-titulo {
                    font-weight: 600;
                    color: var(--text-primary);
                    font-size: 15px;
                    min-width: 180px;
                }
                
                .met-descripcion {
                    max-width: 350px;
                }
                
                .met-sugerencias,
                .met-consejos {
                    font-size: 13px;
                    max-width: 250px;
                }
                
                /* Indicador de selección */
                .met-check-indicator {
                    width: 22px;
                    height: 22px;
                    border: 2px solid var(--border-color);
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                    background: var(--bg-primary);
                }
                
                .metodologia-table-modern tbody tr.selected .met-check-indicator {
                    background: var(--accent-color);
                    border-color: var(--accent-color);
                }
                
                .met-check-indicator svg {
                    width: 14px;
                    height: 14px;
                    color: white;
                    opacity: 0;
                    transform: scale(0.5);
                    transition: all 0.2s ease;
                }
                
                .metodologia-table-modern tbody tr.selected .met-check-indicator svg {
                    opacity: 1;
                    transform: scale(1);
                }
                
                /* Contador de seleccionados */
                .metodologia-selection-info {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 16px;
                    background: var(--bg-secondary);
                    border-radius: 8px;
                    margin-bottom: 16px;
                    font-size: 14px;
                }
                
                .metodologia-selection-count {
                    font-weight: 600;
                    color: var(--accent-color);
                }
                
                .metodologia-clear-btn {
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    font-size: 13px;
                    padding: 4px 8px;
                    border-radius: 4px;
                    transition: all 0.2s ease;
                }
                
                .metodologia-clear-btn:hover {
                    background: var(--bg-tertiary);
                    color: var(--text-primary);
                }
                
                /* Responsive: solo 2 columnas en móvil */
                @media (max-width: 768px) {
                    .met-sugerencias,
                    .met-consejos,
                    .metodologia-table-modern thead th:nth-child(4),
                    .metodologia-table-modern thead th:nth-child(5),
                    .metodologia-table-modern td:nth-child(4),
                    .metodologia-table-modern td:nth-child(5) {
                        display: none;
                    }
                    
                    .met-titulo {
                        min-width: 120px;
                        font-size: 14px;
                    }
                    
                    .met-descripcion {
                        max-width: none;
                        font-size: 13px;
                    }
                    
                    .metodologia-table-modern td {
                        padding: 14px 12px;
                    }
                    
                    .metodologia-table-modern thead th {
                        padding: 12px;
                        font-size: 12px;
                    }
                }
                
                @media (max-width: 480px) {
                    .met-titulo {
                        min-width: 100px;
                    }
                    
                    .metodologia-table-modern td {
                        padding: 12px 10px;
                    }
                }
            </style>
        `;

        let html = styles + `
            <div class="metodologia-container">
                <div class="metodologia-selection-info">
                    <span>Seleccionadas: <span class="metodologia-selection-count" id="metSelectionCount">0</span> metodología(s)</span>
                    <button class="metodologia-clear-btn" id="metClearSelection">Limpiar selección</button>
                </div>
                
                <div style="overflow-x: auto; border-radius: 12px;">
                    <table class="metodologia-table-modern">
                        <thead>
                            <tr>
                                <th style="width: 50px; text-align: center;"></th>
                                <th>Metodología</th>
                                <th>Descripción</th>
                                <th class="met-sugerencias">Sugerencias</th>
                                <th class="met-consejos">Consejos</th>
                            </tr>
                        </thead>
                        <tbody id="metodologiaTableBody">
        `;

        // Iterar sobre las metodologías del XML y renderizar filas
        metodologias.forEach((m, index) => {
            const id = m.querySelector('id_metodologia')?.textContent || `met-${index}`;
            const titulo = m.querySelector('metodologia_titulo')?.textContent || 'Sin título';
            const descripcion = m.querySelector('metodologia_descripcion')?.textContent || '';
            const sugerencias = m.querySelector('metodologia_sugerencias_implementacion')?.textContent || '';
            const consejos = m.querySelector('metodologia_consejos')?.textContent || '';

            html += `
                <tr data-id="${id}" data-index="${index}">
                    <td style="text-align: center;">
                        <div class="met-check-indicator">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                    </td>
                    <td class="met-titulo">${titulo}</td>
                    <td class="met-descripcion">${descripcion}</td>
                    <td class="met-sugerencias">${sugerencias}</td>
                    <td class="met-consejos">${consejos}</td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        html += this.getNotasAdicionalesHTML();

        this.elements.body.innerHTML = html;


        // Setup listeners para selección
        this.setupMetodologiaListeners();


        if (window.lucide) lucide.createIcons();
    }

    /**
     * Configura listeners para selección de metodologías
     * @returns 
     */
    setupMetodologiaListeners() {
        const tableBody = document.getElementById('metodologiaTableBody');
        const countEl = document.getElementById('metSelectionCount');
        const clearBtn = document.getElementById('metClearSelection');

        if (!tableBody) return;

        // Inicializar set de seleccionados si no existe
        if (!this.selectedMetodologias) {
            this.selectedMetodologias = new Set();
        }

        // Click en filas para seleccionar/deseleccionar
        tableBody.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            if (!row) return;

            const id = row.dataset.id;

            if (this.selectedMetodologias.has(id)) {
                this.selectedMetodologias.delete(id);
                row.classList.remove('selected');
            } else {
                this.selectedMetodologias.add(id);
                row.classList.add('selected');
            }

            // Actualizar contador
            if (countEl) {
                countEl.textContent = this.selectedMetodologias.size;
            }
        });

        // Botón limpiar selección
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.selectedMetodologias.clear();
                tableBody.querySelectorAll('tr.selected').forEach(row => {
                    row.classList.remove('selected');
                });
                if (countEl) {
                    countEl.textContent = '0';
                }
            });
        }

        // Restaurar selecciones previas si las hay
        this.selectedMetodologias.forEach(id => {
            const row = tableBody.querySelector(`tr[data-id="${id}"]`);
            if (row) {
                row.classList.add('selected');
            }
        });

        if (countEl) {
            countEl.textContent = this.selectedMetodologias.size;
        }
    }

   /**
    * Renderiza las soft skills del módulo profesional
    * @param {*} data 
    * @returns 
    */
    renderSoftSkills(data) {
        const xmlDoc = this.xmlData.softskills; 


        if (!xmlDoc) {
            this.elements.body.innerHTML = this.renderErrorMessage('Soft Skills', 'No se pudieron cargar las Soft Skills');
            return;
        }

        const categorias = Array.from(xmlDoc.querySelectorAll('categoria'));

        // Estado persistente
        if (!this.selectedSoftCats) this.selectedSoftCats = new Set();          // categorías completas (todos ítems)
        if (!this.selectedSoftItems) this.selectedSoftItems = new Map();        // id_categoria -> Set(id_item)
        if (!this.expandedSoftCats) this.expandedSoftCats = new Set();          // categorías desplegadas

        // Paleta opcional para dar “identidad” a cada categoría sin tocar theme
        const catColor = (id) => {
            const palette = [
                '#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#0891b2', '#b91c1c',
                '#0ea5e9', '#84cc16', '#f97316', '#a855f7', '#14b8a6', '#ef4444'
            ];
            const n = parseInt(id, 10);
            if (!Number.isFinite(n)) return 'var(--accent-color)';
            return palette[(n - 1) % palette.length];
        };

        const styles = `
<style>
    .ss-table-modern{
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
    }
    .ss-table-modern thead th{
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-weight: 600;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 16px 20px;
        text-align: left;
        border-bottom: 2px solid var(--border-color);
        position: sticky;
        top: 0;
        z-index: 10;
    }
    .ss-table-modern tbody td{
        padding: 16px 20px;
        vertical-align: top;
        border-bottom: 1px solid var(--border-color);
        font-size: 14px;
        line-height: 1.6;
        color: var(--text-secondary);
    }

    /* Row categoría */
    .ss-row{
        cursor: pointer;
        transition: all 0.2s ease;
        background: var(--bg-primary);
    }
    .ss-row:nth-child(even){
        background: var(--bg-secondary);
    }
    .ss-row:hover{
        background: color-mix(in srgb, var(--row-accent) 7%, var(--bg-primary));
    }

    .ss-row.selected{
        background: color-mix(in srgb, var(--row-accent) 15%, var(--bg-primary));
        box-shadow: inset 4px 0 0 var(--row-accent);
    }
    .ss-row.selected td{ color: var(--text-primary); }

    .ss-row.partial{
        background: color-mix(in srgb, var(--row-accent) 9%, var(--bg-primary));
        box-shadow: inset 4px 0 0 color-mix(in srgb, var(--row-accent) 65%, #ffffff);
    }
    .ss-row.partial td{ color: var(--text-primary); }

    /* Bloque ítems */
    .ss-items-wrap{
        padding: 0;
        border-bottom: 1px solid var(--border-color);
        background: var(--bg-primary);
    }
    .ss-items-wrap.collapsed{ display:none; }

    .ss-items{
        padding: 10px 12px 14px 12px;
        background: color-mix(in srgb, var(--row-accent) 4%, var(--bg-primary));
        border-top: 1px dashed var(--border-color);
    }
    .ss-items-title{
        font-size: 12px;
        color: var(--text-secondary);
        margin: 2px 0 10px 0;
    }

    /* Mini tabla ítems */
    .ss-items-table{
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border-radius: 10px;
        overflow: hidden;
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
    }
    .ss-items-table tr{
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .ss-items-table tr:nth-child(even){ background: var(--bg-secondary); }
    .ss-items-table tr:hover{
        background: color-mix(in srgb, var(--row-accent) 7%, var(--bg-primary));
    }
    .ss-items-table td{
        padding: 12px 12px;
        border-bottom: 1px solid var(--border-color);
        font-size: 13px;
        color: var(--text-secondary);
        vertical-align: top;
    }
    .ss-items-table tr:last-child td{ border-bottom:none; }

    .ss-item-row.selected{
        background: color-mix(in srgb, var(--row-accent) 15%, var(--bg-primary));
    }
    .ss-item-row.selected td{ color: var(--text-primary); }

    /* Checkbox */
    .ss-check{
        width: 22px;
        height: 22px;
        border: 2px solid var(--border-color);
        border-radius: 6px;
        display:flex;
        align-items:center;
        justify-content:center;
        transition: all 0.2s ease;
        background: var(--bg-primary);
        margin: 0 auto;
        position: relative;
    }
    .ss-row.selected .ss-check,
    .ss-item-row.selected .ss-check{
        background: var(--row-accent);
        border-color: var(--row-accent);
    }

    .ss-row.partial .ss-check{
        background: color-mix(in srgb, var(--row-accent) 35%, var(--bg-primary));
        border-color: color-mix(in srgb, var(--row-accent) 65%, var(--border-color));
    }

    .ss-check svg{
        width:14px;height:14px;color:white;
        opacity:0; transform: scale(0.5);
        transition: all 0.2s ease;
    }
    .ss-row.selected .ss-check svg,
    .ss-item-row.selected .ss-check svg{
        opacity:1; transform: scale(1);
    }

    .ss-check .indeterminate{
        width: 12px;
        height: 3px;
        border-radius: 2px;
        background: white;
        opacity: 0;
        transform: scaleX(0.6);
        transition: all 0.2s ease;
        position:absolute;
    }
    .ss-row.partial .ss-check .indeterminate{
        opacity: 1;
        transform: scaleX(1);
    }

    /* Toolbar */
    .ss-toolbar{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        margin-bottom:12px;
        padding:12px 14px;
        border:1px solid var(--border-color);
        border-radius:12px;
        background: var(--bg-secondary);
    }
    .ss-clear{
        border:1px solid var(--border-color);
        background: var(--bg-primary);
        color: var(--text-primary);
        padding:8px 12px;
        border-radius:10px;
        cursor:pointer;
        transition: all 0.2s ease;
    }
    .ss-clear:hover{ background: var(--bg-tertiary); }

    /* Chip */
    .ss-chip{
        display:flex;
        align-items:center;
        gap:10px;
        font-weight: 700;
        color: var(--text-primary);
    }
    .ss-dot{
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--row-accent);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--row-accent) 18%, transparent);
    }

    /* Toggle */
    .ss-toggle{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
    }
    .ss-toggle-btn{
        width: 34px;
        height: 34px;
        border-radius: 10px;
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
        cursor: pointer;
        display:flex;
        align-items:center;
        justify-content:center;
        transition: all 0.2s ease;
        flex: 0 0 auto;
    }
    .ss-toggle-btn:hover{
        background: color-mix(in srgb, var(--row-accent) 10%, var(--bg-primary));
        border-color: color-mix(in srgb, var(--row-accent) 30%, var(--border-color));
    }
    .ss-toggle-btn i{
        width: 18px;
        height: 18px;
        color: var(--text-primary);
        transition: transform 0.2s ease;
    }
    .ss-toggle-btn[aria-expanded="true"] i{ transform: rotate(180deg); }

    @media (max-width: 768px){
        .ss-table-modern thead th:nth-child(3),
        .ss-table-modern td:nth-child(3){
            display:none;
        }
    }
</style>
    `;

        const countSelected = () => {
            let itemsCount = 0;
            for (const set of this.selectedSoftItems.values()) itemsCount += set.size;
            return { cats: this.selectedSoftCats.size, items: itemsCount };
        };

        const { cats: catsCount, items: itemsCount } = countSelected();

        let html = styles + `
<div class="ss-toolbar">
    <div>
        <strong>Seleccionados:</strong>
        <span id="ssCatsCount">${catsCount}</span> categoría(s) ·
        <span id="ssItemsCount">${itemsCount}</span> ítem(s)
        <div style="font-size:12px;color:var(--text-secondary);margin-top:6px;">
            Clic en categoría = selecciona todos sus ítems. Clic en ítem = selección individual. Botón ▾ = desplegar.
        </div>
    </div>
    <button type="button" id="ssClearSelection" class="ss-clear">Limpiar</button>
</div>

<div style="overflow:auto; border-radius:12px;">
    <table class="ss-table-modern">
        <thead>
            <tr>
                <th style="width:60px; text-align:center;">✓</th>
                <th style="width:28%;">Categoría</th>
                <th style="width:42%;">Descripción</th>
                <th>Ítems</th>
            </tr>
        </thead>
        <tbody id="ssTableBody">
    `;

        categorias.forEach((cat) => {
            const catId = (cat.querySelector('id_categoria')?.textContent || '').trim();
            const catNombre = (cat.querySelector('sk_cat_nombre')?.textContent || 'Sin título').trim();
            const catDesc = (cat.querySelector('sk_cat_descripcion')?.textContent || '').trim();

            const itemsNodes = Array.from(cat.querySelectorAll('items > item'));
            const items = itemsNodes.map(n => ({
                id: (n.querySelector('id_softskills_items')?.textContent || '').trim(),
                titulo: (n.querySelector('sk_item_titulo')?.textContent || 'Sin título').trim(),
                desc: (n.querySelector('sk_item_descripcion')?.textContent || '').trim()
            })).filter(it => it.id);

            const color = catColor(catId);

            const selectedSet = this.selectedSoftItems.get(catId) || new Set();
            const total = items.length;
            const selected = selectedSet.size;

            const isAll = total > 0 && selected === total;
            const isPartial = selected > 0 && selected < total;
            const rowClass = isAll ? 'selected' : (isPartial ? 'partial' : '');

            const expanded = this.expandedSoftCats.has(catId);
            const wrapClass = expanded ? '' : 'collapsed';
            const ariaExpanded = expanded ? 'true' : 'false';

            html += `
            <tr class="ss-row ${rowClass}" data-cat="${catId}" style="--row-accent:${color}">
                <td style="text-align:center;">
                    <div class="ss-check">
                        <span class="indeterminate"></span>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                             stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                </td>
                <td>
                    <div class="ss-chip">
                        <span class="ss-dot"></span>
                        ${catId}. ${catNombre}
                    </div>
                </td>
                <td>${catDesc || '-'}</td>
                <td style="white-space:nowrap;">
                    <div class="ss-toggle">
                        <span><strong>${items.length}</strong> ítem(s)</span>
                        <button type="button"
                                class="ss-toggle-btn"
                                data-toggle="ss"
                                data-cat="${catId}"
                                aria-expanded="${ariaExpanded}"
                                aria-label="Desplegar ítems de ${catNombre}">
                            <i data-lucide="chevron-down"></i>
                        </button>
                    </div>
                </td>
            </tr>

            <tr class="ss-items-wrap ${wrapClass}" data-cat-items-wrap="${catId}" style="--row-accent:${color}">
                <td colspan="4">
                    <div class="ss-items">
                        <div class="ss-items-title">Ítems de "${catNombre}" (seleccionables)</div>

                        ${items.length ? `
                            <table class="ss-items-table">
                                <tbody>
                                    ${items.map(it => {
                const isSel = selectedSet.has(it.id) ? 'selected' : '';
                return `
                                            <tr class="ss-item-row ${isSel}" data-cat="${catId}" data-item="${it.id}" style="--row-accent:${color}">
                                                <td style="width:60px; text-align:center;">
                                                    <div class="ss-check">
                                                        <span class="indeterminate"></span>
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                                                             stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                                            <polyline points="20 6 9 17 4 12"></polyline>
                                                        </svg>
                                                    </div>
                                                </td>
                                                <td style="width:240px; color:var(--text-primary); font-weight:700;">
                                                    ${it.titulo}
                                                </td>
                                                <td>${it.desc || '-'}</td>
                                            </tr>
                                        `;
            }).join('')}
                                </tbody>
                            </table>
                        ` : `<div style="font-size:13px;color:var(--text-secondary);">No hay ítems definidos.</div>`}
                    </div>
                </td>
            </tr>
        `;
        });

        html += `
        </tbody>
    </table>
</div>
    `;

        html += this.getNotasAdicionalesHTML();
        this.elements.body.innerHTML = html;


        this.setupSoftSkillsListeners();
        if (window.lucide) lucide.createIcons();
    }

    /**
     * Configura listeners para la selección de soft skills
     * @returns 
     */
    setupSoftSkillsListeners() {
        const tableBody = document.getElementById('ssTableBody');
        const countCats = document.getElementById('ssCatsCount');
        const countItems = document.getElementById('ssItemsCount');
        const clearBtn = document.getElementById('ssClearSelection');

        if (!tableBody) return;

        if (!this.selectedSoftCats) this.selectedSoftCats = new Set();
        if (!this.selectedSoftItems) this.selectedSoftItems = new Map();
        if (!this.expandedSoftCats) this.expandedSoftCats = new Set();

        // Función para recalcular y actualizar los contadores de categorías e ítems seleccionados
        const recomputeCounts = () => {
            let itemsCount = 0;
            for (const set of this.selectedSoftItems.values()) itemsCount += set.size;
            if (countCats) countCats.textContent = this.selectedSoftCats.size;
            if (countItems) countItems.textContent = itemsCount;
        };
        
        // Helpers para acceder a elementos relacionados
        const getWrap = (catId) =>
            tableBody.querySelector(`tr[data-cat-items-wrap="${CSS.escape(catId)}"]`);

        // Nota: el botón de toggle está en la fila de categoría, no en la de ítems, por eso se busca en tableBody y no dentro del wrap
        const getToggleBtn = (catId) =>
            tableBody.querySelector(`.ss-toggle-btn[data-cat="${CSS.escape(catId)}"]`);

        // Función para actualizar el estado visual de expansión/collapse y el atributo aria-expanded
        const setExpandedUI = (catId, expanded) => {
            const wrap = getWrap(catId);
            const btn = getToggleBtn(catId);
            if (wrap) wrap.classList.toggle('collapsed', !expanded);
            if (btn) btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        };

        // Función para actualizar el estado visual de una fila de categoría según la selección de sus ítems
        const setRowState = (catId) => {
            const row = tableBody.querySelector(`.ss-row[data-cat="${CSS.escape(catId)}"]`);
            if (!row) return;

            const itemRows = tableBody.querySelectorAll(`.ss-item-row[data-cat="${CSS.escape(catId)}"]`);
            const total = itemRows.length;

            const set = this.selectedSoftItems.get(catId) || new Set();
            const selected = set.size;

            row.classList.remove('selected', 'partial');

            if (total > 0 && selected === total) {
                row.classList.add('selected');
                this.selectedSoftCats.add(catId);
            } else if (selected > 0 && selected < total) {
                row.classList.add('partial');
                this.selectedSoftCats.delete(catId);
            } else {
                this.selectedSoftCats.delete(catId);
            }
        };
        
        // Función para toggle selección de todos los ítems de una categoría al hacer click en la fila de categoría
        const toggleAllItems = (catId) => {
            const itemRows = tableBody.querySelectorAll(`.ss-item-row[data-cat="${CSS.escape(catId)}"]`);

            // UX: si tiene ítems y está cerrado, se abre al interactuar
            if (itemRows.length > 0 && !this.expandedSoftCats.has(catId)) {
                this.expandedSoftCats.add(catId);
                setExpandedUI(catId, true);
            }

            if (itemRows.length === 0) {
                // Categoría sin ítems: selección simple
                const row = tableBody.querySelector(`.ss-row[data-cat="${CSS.escape(catId)}"]`);
                if (!row) return;

                if (row.classList.contains('selected')) {
                    row.classList.remove('selected');
                    this.selectedSoftCats.delete(catId);
                } else {
                    row.classList.add('selected');
                    this.selectedSoftCats.add(catId);
                }
                recomputeCounts();
                return;
            }

            let set = this.selectedSoftItems.get(catId);
            if (!set) { set = new Set(); this.selectedSoftItems.set(catId, set); }

            const allSelected = set.size === itemRows.length;

            if (allSelected) {
                set.clear();
                itemRows.forEach(r => r.classList.remove('selected'));
                this.selectedSoftItems.delete(catId);
            } else {
                set.clear();
                itemRows.forEach(r => {
                    const itemId = r.dataset.item;
                    if (itemId) set.add(itemId);
                    r.classList.add('selected');
                });
            }

            setRowState(catId);
            recomputeCounts();
        };
        
        // Función para toggle selección individual de un ítem al hacer click en la fila de ítem
        const toggleItem = (catId, itemId, itemRowEl) => {
            let set = this.selectedSoftItems.get(catId);
            if (!set) { set = new Set(); this.selectedSoftItems.set(catId, set); }

            if (set.has(itemId)) {
                set.delete(itemId);
                itemRowEl.classList.remove('selected');
            } else {
                set.add(itemId);
                itemRowEl.classList.add('selected');
            }

            if (set.size === 0) this.selectedSoftItems.delete(catId);

            setRowState(catId);
            recomputeCounts();
        };

        // Delegación de eventos para clicks en el tbody de la tabla
        tableBody.addEventListener('click', (e) => {
            // 1) Toggle desplegar/colapsar
            const toggleBtn = e.target.closest('.ss-toggle-btn');
            if (toggleBtn) {
                e.stopPropagation();
                const catId = toggleBtn.dataset.cat;
                if (!catId) return;

                const isExpanded = this.expandedSoftCats.has(catId);
                if (isExpanded) this.expandedSoftCats.delete(catId);
                else this.expandedSoftCats.add(catId);

                setExpandedUI(catId, !isExpanded);
                return;
            }

            // 2) Click en ítem
            const itemRow = e.target.closest('.ss-item-row');
            if (itemRow) {
                const catId = itemRow.dataset.cat;
                const itemId = itemRow.dataset.item;
                if (!catId || !itemId) return;
                toggleItem(catId, itemId, itemRow);
                return;
            }

            // 3) Click en categoría
            const catRow = e.target.closest('.ss-row');
            if (catRow) {
                const catId = catRow.dataset.cat;
                if (!catId) return;
                toggleAllItems(catId);
            }
        });

        // Botón limpiar selección
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.selectedSoftCats.clear();
                this.selectedSoftItems.clear();

                tableBody.querySelectorAll('.ss-row.selected, .ss-row.partial')
                    .forEach(tr => tr.classList.remove('selected', 'partial'));
                tableBody.querySelectorAll('.ss-item-row.selected')
                    .forEach(tr => tr.classList.remove('selected'));

                recomputeCounts();
            });
        }

        // Inicializar UI
        const catRows = tableBody.querySelectorAll('.ss-row[data-cat]');
        catRows.forEach(r => {
            const catId = r.dataset.cat;
            setRowState(catId);
            setExpandedUI(catId, this.expandedSoftCats.has(catId));
        });

        recomputeCounts();
    }


    // --- ODS (desde XML) ---
    /**
     * Renderiza los ODS desde el XML
     * @param {*} data 
     * @returns 
     */
    renderODS(data) {
        const xmlDoc = this.xmlData.ods;

        if (!xmlDoc) {
            this.elements.body.innerHTML = this.renderErrorMessage('ODS', 'No se pudieron cargar los ODS');
            return;
        }

        const odsList = Array.from(xmlDoc.querySelectorAll('ods'));

        // Estado (persistente entre aperturas del modal)
        if (!this.selectedODS) this.selectedODS = new Set();               // ODS completos (todas metas)
        if (!this.selectedODSMetas) this.selectedODSMetas = new Map();     // odsCodigo -> Set(metaCodigo)
        if (!this.expandedODS) this.expandedODS = new Set();               // ODS desplegados

        const styles = `
<style>
    /* Tabla */
    .ods-table-modern{
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
    }
    .ods-table-modern thead th{
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-weight: 600;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 16px 20px;
        text-align: left;
        border-bottom: 2px solid var(--border-color);
        position: sticky;
        top: 0;
        z-index: 10;
    }
    .ods-table-modern tbody td{
        padding: 16px 20px;
        vertical-align: top;
        border-bottom: 1px solid var(--border-color);
        font-size: 14px;
        line-height: 1.6;
        color: var(--text-secondary);
    }

    /* Fila ODS */
    .ods-row{
        cursor: pointer;
        transition: all 0.2s ease;
        background: var(--bg-primary);
    }
    .ods-row:nth-child(even){
        background: var(--bg-secondary);
    }
    .ods-row:hover{
        background: color-mix(in srgb, var(--row-accent) 7%, var(--bg-primary));
    }

    /* Selección ODS completa */
    .ods-row.selected{
        background: color-mix(in srgb, var(--row-accent) 15%, var(--bg-primary));
        box-shadow: inset 4px 0 0 var(--row-accent);
    }
    .ods-row.selected td{
        color: var(--text-primary);
    }

    /* Selección ODS parcial */
    .ods-row.partial{
        background: color-mix(in srgb, var(--row-accent) 9%, var(--bg-primary));
        box-shadow: inset 4px 0 0 color-mix(in srgb, var(--row-accent) 65%, #ffffff);
    }
    .ods-row.partial td{
        color: var(--text-primary);
    }

    /* Bloque metas */
    .ods-metas-wrap{
        padding: 0;
        border-bottom: 1px solid var(--border-color);
        background: var(--bg-primary);
    }
    .ods-metas-wrap.collapsed{
        display: none;
    }
    .ods-metas{
        padding: 10px 12px 14px 12px;
        background: color-mix(in srgb, var(--row-accent) 4%, var(--bg-primary));
        border-top: 1px dashed var(--border-color);
    }
    .ods-metas-title{
        font-size: 12px;
        color: var(--text-secondary);
        margin: 2px 0 10px 0;
    }

    /* Mini-tabla metas */
    .ods-metas-table{
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border-radius: 10px;
        overflow: hidden;
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
    }
    .ods-metas-table tr{
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .ods-metas-table tr:nth-child(even){
        background: var(--bg-secondary);
    }
    .ods-metas-table tr:hover{
        background: color-mix(in srgb, var(--row-accent) 7%, var(--bg-primary));
    }
    .ods-metas-table td{
        padding: 12px 12px;
        border-bottom: 1px solid var(--border-color);
        font-size: 13px;
        color: var(--text-secondary);
        vertical-align: top;
    }
    .ods-metas-table tr:last-child td{
        border-bottom: none;
    }

    /* Selección meta */
    .ods-meta-row.selected{
        background: color-mix(in srgb, var(--row-accent) 15%, var(--bg-primary));
    }
    .ods-meta-row.selected td{
        color: var(--text-primary);
    }

    /* Checkbox */
    .ods-check{
        width: 22px;
        height: 22px;
        border: 2px solid var(--border-color);
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        background: var(--bg-primary);
        margin: 0 auto;
        position: relative;
    }
    .ods-row.selected .ods-check,
    .ods-meta-row.selected .ods-check{
        background: var(--row-accent);
        border-color: var(--row-accent);
    }

    /* Parcial: relleno suave */
    .ods-row.partial .ods-check{
        background: color-mix(in srgb, var(--row-accent) 35%, var(--bg-primary));
        border-color: color-mix(in srgb, var(--row-accent) 65%, var(--border-color));
    }

    .ods-check svg{
        width: 14px;
        height: 14px;
        color: white;
        opacity: 0;
        transform: scale(0.5);
        transition: all 0.2s ease;
    }
    .ods-row.selected .ods-check svg,
    .ods-meta-row.selected .ods-check svg{
        opacity: 1;
        transform: scale(1);
    }

    /* Parcial: raya */
    .ods-check .indeterminate{
        width: 12px;
        height: 3px;
        border-radius: 2px;
        background: white;
        opacity: 0;
        transform: scaleX(0.6);
        transition: all 0.2s ease;
        position: absolute;
    }
    .ods-row.partial .ods-check .indeterminate{
        opacity: 1;
        transform: scaleX(1);
    }

    /* Toolbar */
    .ods-toolbar{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        margin-bottom:12px;
        padding:12px 14px;
        border:1px solid var(--border-color);
        border-radius:12px;
        background: var(--bg-secondary);
    }
    .ods-clear{
        border:1px solid var(--border-color);
        background: var(--bg-primary);
        color: var(--text-primary);
        padding:8px 12px;
        border-radius:10px;
        cursor:pointer;
        transition: all 0.2s ease;
    }
    .ods-clear:hover{
        background: var(--bg-tertiary);
    }

    /* Etiqueta ODS */
    .ods-chip{
        display:flex;
        align-items:center;
        gap:10px;
        font-weight: 700;
        color: var(--text-primary);
    }
    .ods-dot{
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--row-accent);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--row-accent) 18%, transparent);
    }

    /* Toggle metas */
    .ods-meta-toggle{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
    }
    .ods-toggle-btn{
        width: 34px;
        height: 34px;
        border-radius: 10px;
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
        cursor: pointer;
        display:flex;
        align-items:center;
        justify-content:center;
        transition: all 0.2s ease;
        flex: 0 0 auto;
    }
    .ods-toggle-btn:hover{
        background: color-mix(in srgb, var(--row-accent) 10%, var(--bg-primary));
        border-color: color-mix(in srgb, var(--row-accent) 30%, var(--border-color));
    }
    .ods-toggle-btn i{
        width: 18px;
        height: 18px;
        color: var(--text-primary);
        transition: transform 0.2s ease;
    }
    .ods-toggle-btn[aria-expanded="true"] i{
        transform: rotate(180deg);
    }

    @media (max-width: 768px){
        .ods-table-modern thead th:nth-child(3),
        .ods-table-modern td:nth-child(3){
            display:none; /* Oculta descripción */
        }
    }
</style>
    `;

        const countSelected = () => {
            let metasCount = 0;
            for (const set of this.selectedODSMetas.values()) metasCount += set.size;
            return { ods: this.selectedODS.size, metas: metasCount };
        };

        const { ods: odsCount, metas: metasCount } = countSelected();

        let html = styles + `
<div class="ods-toolbar">
    <div>
        <strong>Seleccionados:</strong>
        <span id="odsSelectionCount">${odsCount}</span> ODS ·
        <span id="odsMetasSelectionCount">${metasCount}</span> metas
        <div style="font-size:12px;color:var(--text-secondary);margin-top:6px;">
            Clic en ODS = selecciona todas sus metas. Clic en meta = selección individual. Botón ▾ = desplegar.
        </div>
    </div>
    <button type="button" id="odsClearSelection" class="ods-clear">Limpiar</button>
</div>

<div style="overflow:auto; border-radius:12px;">
    <table class="ods-table-modern">
        <thead>
            <tr>
                <th style="width:60px; text-align:center;">✓</th>
                <th style="width:28%;">ODS</th>
                <th style="width:42%;">Descripción</th>
                <th>Metas</th>
            </tr>
        </thead>
        <tbody id="odsTableBody">
    `;

        odsList.forEach((ods, index) => {
            const codigo = (ods.querySelector('ods_codigo')?.textContent || `${index + 1}`).trim();
            const titulo = (ods.querySelector('ods_titulo')?.textContent || 'Sin título').trim();
            const descripcion = (ods.querySelector('ods_descripcion')?.textContent || '').trim();
            const color = (ods.querySelector('ods_color_hex')?.textContent || '#2b6cb0').trim();

            const metas = Array.from(ods.querySelectorAll('meta')).map(m => ({
                codigo: (m.querySelector('meta_codigo')?.textContent || '').trim(),
                descripcion: (m.querySelector('meta_descripcion')?.textContent || '').trim()
            })).filter(m => m.codigo || m.descripcion);

            const metasSelectedSet = this.selectedODSMetas.get(codigo) || new Set();
            const totalMetas = metas.length;
            const selectedMetas = metasSelectedSet.size;

            const isAll = totalMetas > 0 && selectedMetas === totalMetas;
            const isPartial = selectedMetas > 0 && selectedMetas < totalMetas;
            const rowClass = isAll ? 'selected' : (isPartial ? 'partial' : '');

            const expanded = this.expandedODS.has(codigo);
            const wrapClass = expanded ? '' : 'collapsed';
            const ariaExpanded = expanded ? 'true' : 'false';

            html += `
            <tr class="ods-row ${rowClass}" data-ods="${codigo}" style="--row-accent:${color}">
                <td style="text-align:center;">
                    <div class="ods-check">
                        <span class="indeterminate"></span>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                             stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                </td>
                <td>
                    <div class="ods-chip">
                        <span class="ods-dot"></span>
                        ODS ${codigo}: ${titulo}
                    </div>
                </td>
                <td>${descripcion || '-'}</td>
                <td style="white-space:nowrap;">
                    <div class="ods-meta-toggle">
                        <span><strong>${metas.length}</strong> meta(s)</span>
                        <button type="button"
                                class="ods-toggle-btn"
                                data-toggle="ods"
                                data-ods="${codigo}"
                                aria-expanded="${ariaExpanded}"
                                aria-label="Desplegar metas del ODS ${codigo}">
                            <i data-lucide="chevron-down"></i>
                        </button>
                    </div>
                </td>
            </tr>

            <tr class="ods-metas-wrap ${wrapClass}" data-ods-metas-wrap="${codigo}" style="--row-accent:${color}">
                <td colspan="4">
                    <div class="ods-metas">
                        <div class="ods-metas-title">Metas del ODS ${codigo} (seleccionables)</div>

                        ${metas.length ? `
                            <table class="ods-metas-table">
                                <tbody>
                                    ${metas.map(meta => {
                const selected = metasSelectedSet.has(meta.codigo) ? 'selected' : '';
                return `
                                            <tr class="ods-meta-row ${selected}" data-ods="${codigo}" data-meta="${meta.codigo}" style="--row-accent:${color}">
                                                <td style="width:60px; text-align:center;">
                                                    <div class="ods-check">
                                                        <span class="indeterminate"></span>
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                                                             stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                                            <polyline points="20 6 9 17 4 12"></polyline>
                                                        </svg>
                                                    </div>
                                                </td>
                                                <td style="width:140px; color:var(--text-primary); font-weight:700;">
                                                    ${meta.codigo || '-'}
                                                </td>
                                                <td>${meta.descripcion || '-'}</td>
                                            </tr>
                                        `;
            }).join('')}
                                </tbody>
                            </table>
                        ` : `<div style="font-size:13px;color:var(--text-secondary);">No hay metas definidas.</div>`}
                    </div>
                </td>
            </tr>
        `;
        });

        html += `
        </tbody>
    </table>
</div>
    `;

        html += this.getNotasAdicionalesHTML();
        this.elements.body.innerHTML = html;

        this.setupODSListeners();
        if (window.lucide) lucide.createIcons();
    }

    /**
     * Configura listeners para la selección de ODS y sus metas
     * @returns {void}
     */
    setupODSListeners() {
        const tableBody = document.getElementById('odsTableBody');
        const countODS = document.getElementById('odsSelectionCount');
        const countMetas = document.getElementById('odsMetasSelectionCount');
        const clearBtn = document.getElementById('odsClearSelection');

        if (!tableBody) return;

        if (!this.expandedODS) this.expandedODS = new Set();
        if (!this.selectedODS) this.selectedODS = new Set();
        if (!this.selectedODSMetas) this.selectedODSMetas = new Map();

        // Función para recalcular y actualizar los contadores de ODS y metas seleccionados
        const recomputeCounts = () => {
            let metasCount = 0;
            for (const set of this.selectedODSMetas.values()) metasCount += set.size;
            if (countODS) countODS.textContent = this.selectedODS.size;
            if (countMetas) countMetas.textContent = metasCount;
        };

        // Helpers para acceder a elementos relacionados
        const getMetasWrap = (odsCodigo) =>
            tableBody.querySelector(`tr[data-ods-metas-wrap="${CSS.escape(odsCodigo)}"]`);

        // Nota: el botón de toggle está en la fila de ODS, no en la de metas, por eso se busca en tableBody y no dentro del wrap
        const getToggleBtn = (odsCodigo) =>
            tableBody.querySelector(`.ods-toggle-btn[data-ods="${CSS.escape(odsCodigo)}"]`);

        // Función para actualizar el estado visual de expansión/collapse y el atributo aria-expanded
        const setExpandedUI = (odsCodigo, expanded) => {
            const wrap = getMetasWrap(odsCodigo);
            const btn = getToggleBtn(odsCodigo);

            if (wrap) wrap.classList.toggle('collapsed', !expanded);
            if (btn) btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        };

        // Función para actualizar el estado visual de una fila de ODS según la selección de sus metas
        const setRowState = (odsCodigo) => {
            const odsRow = tableBody.querySelector(`.ods-row[data-ods="${CSS.escape(odsCodigo)}"]`);
            if (!odsRow) return;

            const metaRows = tableBody.querySelectorAll(`.ods-meta-row[data-ods="${CSS.escape(odsCodigo)}"]`);
            const total = metaRows.length;

            const set = this.selectedODSMetas.get(odsCodigo) || new Set();
            const selected = set.size;

            odsRow.classList.remove('selected', 'partial');

            if (total > 0 && selected === total) {
                odsRow.classList.add('selected');
                this.selectedODS.add(odsCodigo);
            } else if (selected > 0 && selected < total) {
                odsRow.classList.add('partial');
                this.selectedODS.delete(odsCodigo);
            } else {
                this.selectedODS.delete(odsCodigo);
            }
        };

        // Función para toggle selección de todas las metas de un ODS al hacer click en la fila de ODS
        const toggleAllMetas = (odsCodigo) => { 
            const metaRows = tableBody.querySelectorAll(`.ods-meta-row[data-ods="${CSS.escape(odsCodigo)}"]`);

            // UX: si tiene metas y está cerrado, lo abrimos al interactuar
            if (metaRows.length > 0 && !this.expandedODS.has(odsCodigo)) {
                this.expandedODS.add(odsCodigo);
                setExpandedUI(odsCodigo, true);
            }

            if (metaRows.length === 0) {
                // ODS sin metas: selección simple de la fila
                const odsRow = tableBody.querySelector(`.ods-row[data-ods="${CSS.escape(odsCodigo)}"]`);
                if (!odsRow) return;

                if (odsRow.classList.contains('selected')) {
                    odsRow.classList.remove('selected');
                    this.selectedODS.delete(odsCodigo);
                } else {
                    odsRow.classList.add('selected');
                    this.selectedODS.add(odsCodigo);
                }
                recomputeCounts();
                return;
            }

            let set = this.selectedODSMetas.get(odsCodigo);
            if (!set) { set = new Set(); this.selectedODSMetas.set(odsCodigo, set); }

            const allSelected = set.size === metaRows.length;

            if (allSelected) {
                set.clear();
                metaRows.forEach(r => r.classList.remove('selected'));
                this.selectedODSMetas.delete(odsCodigo);
            } else {
                set.clear();
                metaRows.forEach(r => {
                    const metaCodigo = r.dataset.meta;
                    if (metaCodigo) set.add(metaCodigo);
                    r.classList.add('selected');
                });
            }

            setRowState(odsCodigo);
            recomputeCounts();
        };

        // Función para toggle selección individual de una meta al hacer click en la fila de meta
        const toggleMeta = (odsCodigo, metaCodigo, metaRowEl) => {
            let set = this.selectedODSMetas.get(odsCodigo);
            if (!set) { set = new Set(); this.selectedODSMetas.set(odsCodigo, set); }

            if (set.has(metaCodigo)) {
                set.delete(metaCodigo);
                metaRowEl.classList.remove('selected');
            } else {
                set.add(metaCodigo);
                metaRowEl.classList.add('selected');
            }

            if (set.size === 0) this.selectedODSMetas.delete(odsCodigo);

            setRowState(odsCodigo);
            recomputeCounts();
        };

        // Delegación de eventos para clicks en el tbody de la tabla
        tableBody.addEventListener('click', (e) => {
            // 1) Toggle desplegar/colapsar (no selecciona)
            const toggleBtn = e.target.closest('.ods-toggle-btn');
            if (toggleBtn) {
                e.stopPropagation();
                const odsCodigo = toggleBtn.dataset.ods;
                if (!odsCodigo) return;

                const isExpanded = this.expandedODS.has(odsCodigo);
                if (isExpanded) this.expandedODS.delete(odsCodigo);
                else this.expandedODS.add(odsCodigo);

                setExpandedUI(odsCodigo, !isExpanded);
                return;
            }

            // 2) Click en meta
            const metaRow = e.target.closest('.ods-meta-row');
            if (metaRow) {
                const odsCodigo = metaRow.dataset.ods;
                const metaCodigo = metaRow.dataset.meta;
                if (!odsCodigo || !metaCodigo) return;
                toggleMeta(odsCodigo, metaCodigo, metaRow);
                return;
            }

            // 3) Click en ODS
            const odsRow = e.target.closest('.ods-row');
            if (odsRow) {
                const odsCodigo = odsRow.dataset.ods;
                if (!odsCodigo) return;
                toggleAllMetas(odsCodigo);
            }
        });

        // Botón limpiar selección
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.selectedODS.clear();
                this.selectedODSMetas.clear();

                tableBody.querySelectorAll('.ods-row.selected, .ods-row.partial')
                    .forEach(tr => tr.classList.remove('selected', 'partial'));
                tableBody.querySelectorAll('.ods-meta-row.selected')
                    .forEach(tr => tr.classList.remove('selected'));

                recomputeCounts();
            });
        }

        // Inicializar estado UI
        const odsRows = tableBody.querySelectorAll('.ods-row[data-ods]');
        odsRows.forEach(r => {
            const odsCodigo = r.dataset.ods;
            setRowState(odsCodigo);
            setExpandedUI(odsCodigo, this.expandedODS.has(odsCodigo));
        });

        recomputeCounts();
    }



    // --- RETOS DEL SIGLO XXI (desde XML) ---
    /**
     * Renderiza los retos del siglo XXI desde el XML
     * @param {*} data 
     * @returns {void}
     */
    renderXXI(data) {
        const xmlDoc = this.xmlData.xxi;


        if (!this.expandedODS) this.expandedODS = new Set(); // ODS desplegados


        if (!xmlDoc) {
            this.elements.body.innerHTML = this.renderErrorMessage('Retos XXI', 'No se pudieron cargar los retos del siglo XXI');
            return;
        }

        const retos = Array.from(xmlDoc.querySelectorAll('reto'));

        const styles = `
        <style>
  .xxi-table-modern{
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    border: 1px solid var(--border-color);
    background: var(--bg-primary);
  }

  .xxi-table-modern thead th{
    background: var(--bg-secondary);
    color: var(--text-primary);
    font-weight: 600;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 16px 20px;
    text-align: left;
    border-bottom: 2px solid var(--border-color);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .xxi-table-modern tbody td{
    padding: 18px 20px;
    vertical-align: top;
    border-bottom: 1px solid var(--border-color);
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-secondary);
  }

  .xxi-table-modern tbody tr{
    background: var(--bg-primary);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .xxi-table-modern tbody tr:nth-child(even){
    background: var(--bg-secondary);
  }

  .xxi-table-modern tbody tr:hover{
    background: color-mix(in srgb, var(--accent-color) 8%, var(--bg-primary));
  }

  .xxi-table-modern tbody tr.selected{
    background: color-mix(in srgb, var(--accent-color) 15%, var(--bg-primary));
    box-shadow: inset 4px 0 0 var(--accent-color);
  }

  .xxi-table-modern tbody tr.selected td{
    color: var(--text-primary);
  }

  .xxi-table-modern tbody tr:last-child td{
    border-bottom: none;
  }

  .xx-check{
    width: 22px;
    height: 22px;
    border: 2px solid var(--border-color);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    background: var(--bg-primary);
    margin: 0 auto;
  }

  .xxi-table-modern tbody tr.selected .xx-check{
    background: var(--accent-color);
    border-color: var(--accent-color);
  }

  .xx-check svg{
    width: 14px;
    height: 14px;
    color: white;
    opacity: 0;
    transform: scale(0.5);
    transition: all 0.2s ease;
  }

  .xxi-table-modern tbody tr.selected .xx-check svg{
    opacity: 1;
    transform: scale(1);
  }

  .xxi-toolbar{
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    padding: 12px 14px;
    border: 1px solid var(--border-color);
    border-radius: 12px;
    background: var(--bg-secondary);
  }

  .xxi-clear{
    border: 1px solid var(--border-color);
    background: var(--bg-primary);
    color: var(--text-primary);
    padding: 8px 12px;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .xxi-clear:hover{
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }
</style>

    `;

        let html = styles;

        html += `
        <div class="xxi-toolbar">
            <div>
                <strong>Seleccionados:</strong> <span id="xxiSelectionCount">0</span>
                <div style="font-size:12px;color:var(--text-secondary);margin-top:6px;">
                    Haz clic en una fila para seleccionar/deseleccionar.
                </div>
            </div>
            <button type="button" id="xxiClearSelection" class="xxi-clear">Limpiar</button>
        </div>

        <div style="overflow:auto;">
            <table class="xxi-table-modern">
                <thead>
                    <tr>
                        <th style="width:60px; text-align:center;">✓</th>
                        <th style="width:12%;">ID</th>
                        <th style="width:26%;">Reto</th>
                        <th>Descripción</th>
                    </tr>
                </thead>
                <tbody id="xxiTableBody">
    `;

        retos.forEach((reto, index) => {
            const idReto = reto.querySelector('id_reto')?.textContent?.trim() || `${index + 1}`;
            const titulo = reto.querySelector('reto_titulo')?.textContent?.trim() || 'Sin título';
            const descripcion = reto.querySelector('reto_descripcion')?.textContent?.trim() || '';

            const id = `XXI_${idReto}`;

            html += `
            <tr data-id="${id}">
                <td style="text-align:center;">
                    <div class="xx-check">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                             stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                </td>
                <td><strong>${idReto}</strong></td>
                <td><strong>${titulo}</strong></td>
                <td>${descripcion}</td>
            </tr>
        `;
        });

        html += `
                </tbody>
            </table>
        </div>
    `;

        html += this.getNotasAdicionalesHTML();

        this.elements.body.innerHTML = html;

        this.setupXXIListeners();
    }

    /**
     * Configura listeners para la selección de retos del siglo XXI
     * @returns {void}
     */
    setupXXIListeners() {
        const tableBody = document.getElementById('xxiTableBody');
        const countEl = document.getElementById('xxiSelectionCount');
        const clearBtn = document.getElementById('xxiClearSelection');

        if (!tableBody) return;

        if (!this.selectedXXI) this.selectedXXI = new Set();

        const refresh = () => {
            if (countEl) countEl.textContent = this.selectedXXI.size;
        };

        tableBody.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            if (!row) return;

            const id = row.dataset.id;
            if (!id) return;

            if (this.selectedXXI.has(id)) {
                this.selectedXXI.delete(id);
                row.classList.remove('selected');
            } else {
                this.selectedXXI.add(id);
                row.classList.add('selected');
            }
            refresh();
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.selectedXXI.clear();
                tableBody.querySelectorAll('tr.selected').forEach(tr => tr.classList.remove('selected'));
                refresh();
            });
        }

        this.selectedXXI.forEach(id => {
            const row = tableBody.querySelector(`tr[data-id="${CSS.escape(id)}"]`);
            if (row) row.classList.add('selected');
        });

        refresh();
    }


    // --- TAXONOMÍA DE BLOOM (desde XML) ---
    /**
     * Renderiza la taxonomía de Bloom desde el XML
     * @param {*} data 
     * @returns {void}
     */
    renderBloom(data) {
        const xmlDoc = this.xmlData.bloom;

        if (!xmlDoc) {
            this.elements.body.innerHTML = this.renderErrorMessage('Bloom', 'No se pudo cargar la taxonomía de Bloom');
            return;
        }

        // Extraemos los niveles y los ordenamos por el nodo <orden> para asegurar un orden correcto
        const niveles = Array.from(xmlDoc.querySelectorAll('nivel_bloom')).sort((a, b) => {
            const ordenA = parseInt(a.querySelector('orden')?.textContent || '0');
            const ordenB = parseInt(b.querySelector('orden')?.textContent || '0');
            return ordenA - ordenB;
        });

        const styles = `
        <style>
            .bloom-table-modern{
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0,0,0,0.08);
                border: 1px solid var(--border-color);
            }
            .bloom-table-modern thead th{
                background: var(--bg-secondary);
                color: var(--text-primary);
                font-weight: 600;
                font-size: 13px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                padding: 16px 20px;
                text-align: left;
                border-bottom: 2px solid var(--border-color);
                position: sticky;
                top: 0;
                z-index: 10;
            }
            .bloom-table-modern tbody tr{
                background: var(--bg-primary);
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .bloom-table-modern tbody tr:nth-child(even){
                background: var(--bg-secondary);
            }
            .bloom-table-modern tbody tr:hover{
                background: color-mix(in srgb, var(--accent-color) 8%, var(--bg-primary));
            }
            .bloom-table-modern tbody tr.selected{
                background: color-mix(in srgb, var(--accent-color) 15%, var(--bg-primary));
                box-shadow: inset 4px 0 0 var(--accent-color);
            }
            .bloom-table-modern td{
                padding: 18px 20px;
                vertical-align: top;
                border-bottom: 1px solid var(--border-color);
                font-size: 14px;
                line-height: 1.6;
                color: var(--text-secondary);
            }
            .bloom-table-modern tbody tr.selected td{
                color: var(--text-primary);
            }
            .bloom-table-modern tbody tr:last-child td{ border-bottom:none; }

            .bloom-check-indicator{
                width: 22px;
                height: 22px;
                border: 2px solid var(--border-color);
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                background: var(--bg-primary);
                margin: 0 auto;
            }
            .bloom-table-modern tbody tr.selected .bloom-check-indicator{
                background: var(--accent-color);
                border-color: var(--accent-color);
            }
            .bloom-check-indicator svg{
                width: 14px;
                height: 14px;
                color: white;
                opacity: 0;
                transform: scale(0.5);
                transition: all 0.2s ease;
            }
            .bloom-table-modern tbody tr.selected .bloom-check-indicator svg{
                opacity: 1;
                transform: scale(1);
            }

            .bloom-selection-info{
                display:flex;
                align-items:center;
                justify-content:space-between;
                padding: 12px 16px;
                background: var(--bg-secondary);
                border-radius: 8px;
                margin-bottom: 16px;
                font-size: 14px;
            }
            .bloom-selection-count{
                font-weight:600;
                color: var(--accent-color);
            }
            .bloom-clear-btn{
                background:none;
                border:none;
                color: var(--text-secondary);
                cursor:pointer;
                font-size: 13px;
                padding: 4px 8px;
                border-radius: 4px;
                transition: all 0.2s ease;
            }
            .bloom-clear-btn:hover{
                background: var(--bg-tertiary);
                color: var(--text-primary);
            }

            .bloom-level-name{
                font-weight: 600;
                color: var(--text-primary);
                min-width: 180px;
                font-size: 15px;
            }

            @media (max-width: 768px){
                /* En móvil ocultamos verbos y ejemplos para compactar */
                .bloom-col-verbos,
                .bloom-col-ejemplos,
                .bloom-table-modern thead th:nth-child(4),
                .bloom-table-modern thead th:nth-child(5),
                .bloom-table-modern td:nth-child(4),
                .bloom-table-modern td:nth-child(5){
                    display:none;
                }
                .bloom-table-modern td{ padding: 14px 12px; font-size:13px; }
                .bloom-table-modern thead th{ padding: 12px; font-size:12px; }
                .bloom-level-name{ min-width: 140px; font-size:14px; }
            }
        </style>
    `;

        html += `
<tr class="bloom-row" data-id="${id}">
    <td style="text-align:center;">
        <div class="bloom-check-indicator">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        </div>
    </td>
    <td class="bloom-level-name">${orden}. ${nombre}</td>
    <td>${definicion}</td>
    <td class="bloom-col-verbos">${verbos}</td>
    <td class="bloom-col-ejemplos">${ejemplos}</td>
</tr>
`;

        niveles.forEach((nivel, index) => {
            const orden = (nivel.querySelector('orden')?.textContent || `${index + 1}`).trim();
            const nombre = (nivel.querySelector('nivel')?.textContent || 'Sin nombre').trim();
            const definicion = (nivel.querySelector('definicion')?.textContent || '').trim();
            const verbos = (nivel.querySelector('verbos_clave')?.textContent || '').trim();
            const ejemplos = (nivel.querySelector('ejemplos_actividad')?.textContent || '').trim();

            // ID estable para persistir selección
            const id = `bloom-${orden}-${nombre}`.replace(/\s+/g, '-').toLowerCase();

            html += `
            <tr data-id="${id}">
                <td style="text-align:center;">
                    <div class="bloom-check-indicator">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                </td>
                <td class="bloom-level-name">${orden}. ${nombre}</td>
                <td>${definicion}</td>
                <td class="bloom-col-verbos">${verbos}</td>
                <td class="bloom-col-ejemplos">${ejemplos}</td>
            </tr>
        `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

        html += this.getNotasAdicionalesHTML();
        this.elements.body.innerHTML = html;

        this.setupBloomListeners();
    }

    /**
     * Configura listeners para la selección de niveles de Bloom
     * @returns {void}
     */
    setupBloomListeners() {
        const tableBody = document.getElementById('bloomTableBody');
        const countEl = document.getElementById('bloomSelectionCount');
        const clearBtn = document.getElementById('bloomClearSelection');

        if (!tableBody) return;

        if (!this.selectedBloomLevels) {
            this.selectedBloomLevels = new Set();
        }

        tableBody.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            if (!row) return;

            const id = row.dataset.id;

            if (this.selectedBloomLevels.has(id)) {
                this.selectedBloomLevels.delete(id);
                row.classList.remove('selected');
            } else {
                this.selectedBloomLevels.add(id);
                row.classList.add('selected');
            }

            if (countEl) countEl.textContent = this.selectedBloomLevels.size;
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.selectedBloomLevels.clear();
                tableBody.querySelectorAll('tr.selected').forEach(r => r.classList.remove('selected'));
                if (countEl) countEl.textContent = '0';
            });
        }

        // Restaurar selecciones previas
        this.selectedBloomLevels.forEach(id => {
            const row = tableBody.querySelector(`tr[data-id="${id}"]`);
            if (row) row.classList.add('selected');
        });

        if (countEl) countEl.textContent = this.selectedBloomLevels.size;
    }

    // --- INTELIGENCIAS MÚLTIPLES (desde XML) ---
    /**
     * Renderiza las inteligencias múltiples desde el XML
     * @param {*} data 
     * @returns {void}
     */
    renderInteligencias(data) {
        const xmlDoc = this.xmlData.inteligencias;

        if (!xmlDoc) {
            this.elements.body.innerHTML = this.renderErrorMessage('Inteligencias', 'No se pudieron cargar las inteligencias múltiples');
            return;
        }

        const inteligencias = Array.from(xmlDoc.querySelectorAll('inteligencia'));

        const styles = `
        <style>
            .intel-table-modern{
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0,0,0,0.08);
                border: 1px solid var(--border-color);
            }
            .intel-table-modern thead th{
                background: var(--bg-secondary);
                color: var(--text-primary);
                font-weight: 600;
                font-size: 13px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                padding: 16px 20px;
                text-align: left;
                border-bottom: 2px solid var(--border-color);
                position: sticky;
                top: 0;
                z-index: 10;
            }
            .intel-table-modern tbody tr{
                background: var(--bg-primary);
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .intel-table-modern tbody tr:nth-child(even){
                background: var(--bg-secondary);
            }
            .intel-table-modern tbody tr:hover{
                background: color-mix(in srgb, var(--accent-color) 8%, var(--bg-primary));
            }
            .intel-table-modern tbody tr.selected{
                background: color-mix(in srgb, var(--accent-color) 15%, var(--bg-primary));
                box-shadow: inset 4px 0 0 var(--accent-color);
            }
            .intel-table-modern td{
                padding: 18px 20px;
                vertical-align: top;
                border-bottom: 1px solid var(--border-color);
                font-size: 14px;
                line-height: 1.6;
                color: var(--text-secondary);
            }
            .intel-table-modern tbody tr.selected td{
                color: var(--text-primary);
            }
            .intel-table-modern tbody tr:last-child td{ border-bottom:none; }

            .intel-check-indicator{
                width: 22px;
                height: 22px;
                border: 2px solid var(--border-color);
                border-radius: 6px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                background: var(--bg-primary);
                margin: 0 auto;
            }
            .intel-table-modern tbody tr.selected .intel-check-indicator{
                background: var(--accent-color);
                border-color: var(--accent-color);
            }
            .intel-check-indicator svg{
                width: 14px;
                height: 14px;
                color: white;
                opacity: 0;
                transform: scale(0.5);
                transition: all 0.2s ease;
            }
            .intel-table-modern tbody tr.selected .intel-check-indicator svg{
                opacity: 1;
                transform: scale(1);
            }

            .intel-selection-info{
                display:flex;
                align-items:center;
                justify-content:space-between;
                padding: 12px 16px;
                background: var(--bg-secondary);
                border-radius: 8px;
                margin-bottom: 16px;
                font-size: 14px;
            }
            .intel-selection-count{
                font-weight:600;
                color: var(--accent-color);
            }
            .intel-clear-btn{
                background:none;
                border:none;
                color: var(--text-secondary);
                cursor:pointer;
                font-size: 13px;
                padding: 4px 8px;
                border-radius: 4px;
                transition: all 0.2s ease;
            }
            .intel-clear-btn:hover{
                background: var(--bg-tertiary);
                color: var(--text-primary);
            }

            .intel-type{
                font-weight: 600;
                color: var(--text-primary);
                min-width: 220px;
                font-size: 15px;
                display:flex;
                align-items:center;
                gap: 10px;
            }
            .intel-type i{
                width: 18px;
                height: 18px;
                color: var(--accent-color);
            }

            @media (max-width: 768px){
                /* En móvil ocultamos Perfil y Estrategias para compactar */
                .intel-col-perfil,
                .intel-col-estrategias,
                .intel-table-modern thead th:nth-child(4),
                .intel-table-modern thead th:nth-child(5),
                .intel-table-modern td:nth-child(4),
                .intel-table-modern td:nth-child(5){
                    display:none;
                }
                .intel-table-modern td{ padding: 14px 12px; font-size:13px; }
                .intel-table-modern thead th{ padding: 12px; font-size:12px; }
                .intel-type{ min-width: 170px; font-size:14px; }
            }
        </style>
    `;

        html += `
<tr class="im-row" data-id="${id}">
    <td style="text-align:center;">
        <div class="intel-check-indicator">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        </div>
    </td>
    <td class="intel-type">
        <i data-lucide="${icono}"></i>
        ${tipo}
    </td>
    <td>${definicion}</td>
    <td class="intel-col-perfil">${perfil}</td>
    <td class="intel-col-estrategias">${estrategias}</td>
</tr>
`;

        inteligencias.forEach((intel, index) => {
            const tipo = (intel.querySelector('tipo')?.textContent || 'Sin tipo').trim();
            const definicion = (intel.querySelector('definicion')?.textContent || '').trim();
            const perfil = (intel.querySelector('perfil_alumno')?.textContent || '').trim();
            const estrategias = (intel.querySelector('estrategias_aula')?.textContent || '').trim();
            const icono = (intel.querySelector('icono')?.textContent || 'brain').trim();

            const id = `intel-${tipo}`.replace(/\s+/g, '-').toLowerCase();

            html += `
            <tr data-id="${id}">
                <td style="text-align:center;">
                    <div class="intel-check-indicator">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                </td>
                <td class="intel-type">
                    <i data-lucide="${icono}"></i>
                    ${tipo}
                </td>
                <td>${definicion}</td>
                <td class="intel-col-perfil">${perfil}</td>
                <td class="intel-col-estrategias">${estrategias}</td>
            </tr>
        `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

        html += this.getNotasAdicionalesHTML();
        this.elements.body.innerHTML = html;

        this.setupInteligenciasListeners();
        if (window.lucide) lucide.createIcons();
    }

    /**
     * Configura listeners para la selección de inteligencias múltiples
     * @returns {void}
     */
    setupInteligenciasListeners() {
        const tableBody = document.getElementById('intelTableBody');
        const countEl = document.getElementById('intelSelectionCount');
        const clearBtn = document.getElementById('intelClearSelection');

        if (!tableBody) return;

        if (!this.selectedInteligencias) {
            this.selectedInteligencias = new Set();
        }

        tableBody.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            if (!row) return;

            const id = row.dataset.id;

            if (this.selectedInteligencias.has(id)) {
                this.selectedInteligencias.delete(id);
                row.classList.remove('selected');
            } else {
                this.selectedInteligencias.add(id);
                row.classList.add('selected');
            }

            if (countEl) countEl.textContent = this.selectedInteligencias.size;
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.selectedInteligencias.clear();
                tableBody.querySelectorAll('tr.selected').forEach(r => r.classList.remove('selected'));
                if (countEl) countEl.textContent = '0';
            });
        }

        // Restaurar selecciones previas
        this.selectedInteligencias.forEach(id => {
            const row = tableBody.querySelector(`tr[data-id="${id}"]`);
            if (row) row.classList.add('selected');
        });

        if (countEl) countEl.textContent = this.selectedInteligencias.size;
    }


    // --- DUA (Diseño Universal de Aprendizaje) ---
    /**
     * Renderiza el contenido del Diseño Universal de Aprendizaje (DUA)
     * @param {*} data 
     * @returns {void}
     */
    renderDUA(data) {
        this.elements.body.innerHTML = `
            <div class="ai-buttons-container">
                <button class="btn btn-primary" id="generateDUABtn">
                    <i data-lucide="sparkles"></i>
                    Generar con IA
                </button>
                <button class="btn btn-secondary" id="instructionsDUABtn">
                    <i data-lucide="settings"></i>
                    Indicaciones
                </button>
            </div>
            <div class="form-group">
                <label class="form-label">Principios DUA aplicados</label>
                <textarea 
                    class="form-textarea" 
                    id="modalContent" 
                    style="min-height: 300px;"
                    placeholder="Describe cómo se aplican los principios del Diseño Universal de Aprendizaje:

• Múltiples formas de representación
• Múltiples formas de acción y expresión  
• Múltiples formas de implicación"
                >${data.content || ''}</textarea>
            </div>
            ${this.getNotasAdicionalesHTML()}
        `;

        this.setupAIButtons('dua');
        if (window.lucide) lucide.createIcons();
    }

    // --- ATENCIÓN A LA DIVERSIDAD ---
    /**
     * Renderiza el contenido de atención a la diversidad
     * @param {*} data 
     * @returns {void}
     */
    renderDiversidad(data) {
        this.elements.body.innerHTML = `
            <div class="ai-buttons-container">
                <button class="btn btn-primary" id="generateDiversidadBtn">
                    <i data-lucide="sparkles"></i>
                    Generar con IA
                </button>
                <button class="btn btn-secondary" id="instructionsDiversidadBtn">
                    <i data-lucide="settings"></i>
                    Indicaciones
                </button>
            </div>
            <div class="form-group">
                <label class="form-label">Medidas de atención a la diversidad</label>
                <textarea 
                    class="form-textarea" 
                    id="modalContent" 
                    style="min-height: 300px;"
                    placeholder="Describe las medidas de atención a la diversidad:

• Adaptaciones curriculares
• Medidas de refuerzo
• Medidas de ampliación
• Recursos específicos"
                >${data.content || ''}</textarea>
            </div>
            ${this.getNotasAdicionalesHTML()}
        `;

        this.setupAIButtons('diversidad');
        if (window.lucide) lucide.createIcons();
    }

    /**
     * Configura los botones de IA para un tipo específico
     * @param {string} key 
     * @returns {void}
     */
    setupAIButtons(key) {
        const generateBtn = document.getElementById(`generate${key.charAt(0).toUpperCase() + key.slice(1)}Btn`);
        const instructionsBtn = document.getElementById(`instructions${key.charAt(0).toUpperCase() + key.slice(1)}Btn`);

        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generateWithAI(key));
        }
        if (instructionsBtn) {
            instructionsBtn.addEventListener('click', () => this.showAIInstructions(key));
        }
    }

    /**
     * Genera contenido utilizando IA para un tipo específico
     * @param {string} key 
     * @returns {void}
     */
    generateWithAI(key) {
        const textarea = document.getElementById('modalContent');
        if (!textarea) return;

        const btn = document.querySelector(`#generate${key.charAt(0).toUpperCase() + key.slice(1)}Btn`);
        const originalHTML = btn?.innerHTML;

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="loader"></i> Generando...';
            if (window.lucide) lucide.createIcons();
        }

        // Simular generación con IA
        setTimeout(() => {
            textarea.value = `[Contenido generado por IA para ${key}]\n\nAquí se mostraría el contenido generado automáticamente basado en el contexto de la unidad didáctica y las indicaciones proporcionadas.`;

            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalHTML;
                if (window.lucide) lucide.createIcons();
            }
        }, 1500);
    }

    /**
     * Muestra las indicaciones de IA para un tipo específico
     * @param {string} key 
     * @returns {void}
     */
    showAIInstructions(key) {
        alert(`Configuración de indicaciones para IA - ${key}\n\nEsta funcionalidad permite personalizar las instrucciones que se envían a la IA.`);
    }

    // --- ERROR MESSAGE HELPER ---
    /**
     * Renderiza un mensaje de error
     * @param {string} tipo 
     * @param {string} mensaje 
     * @returns {string}
     */
    renderErrorMessage(tipo, mensaje) {
        return `
            <div class="error-container" style="text-align: center; padding: 40px;">
                <i data-lucide="alert-circle" style="width: 48px; height: 48px; color: var(--error-color); margin-bottom: 16px;"></i>
                <h3 style="margin-bottom: 8px;">Error al cargar ${tipo}</h3>
                <p style="color: var(--text-secondary);">${mensaje}</p>
                <p style="color: var(--text-secondary); font-size: 0.9em; margin-top: 16px;">
                    Verifica que el archivo XML correspondiente esté disponible en la carpeta /data/
                </p>
            </div>
        `;
    }

    // --- DEFAULT CONTENT ---
    /**
     * Renderiza el contenido por defecto
     * @param {*} data 
     * @returns {void}
     */
    buildDefaultContent(data) {
        this.elements.body.innerHTML = `
            <div class="form-group">
                <label class="form-label">Contenido</label>
                <textarea 
                    class="form-textarea" 
                    id="modalContent" 
                    style="min-height: 300px;"
                    placeholder="Escribe el contenido aquí..."
                >${data.content || ''}</textarea>
            </div>
            ${this.getNotasAdicionalesHTML()}
        `;
    }

    // ============================================
    // EVALUACIÓN - RÚBRICA
    // ============================================

    /**
     * Construye el editor de rúbrica
     * @param {*} data 
     * @returns {void}
     */
    buildRubricaEditor(data) {
        let html = '<div class="rubrica-editor-container">';

        html += `
            <div class="rubrica-main-layout" style="display: flex; gap: 20px; margin-bottom: 16px;">
                <div class="rubrica-content" style="flex: 1;">
                    <div id="rubricaItems"></div>
                    ${this.getNotasAdicionalesHTML()}
                </div>

                <div class="rubrica-config" style="min-width: 280px; background: var(--bg-secondary); padding: 16px; border-radius: 8px; height: fit-content;">
                    <div class="ai-buttons-container" style="margin-bottom: 16px;">
                        <button class="btn btn-primary" id="generateRubricaAIBtn" style="width: 100%;">
                            <i data-lucide="sparkles"></i>
                            Completar con IA
                        </button>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Número de ítems</label>
                        <select id="numItems" class="form-select" style="margin-bottom: 16px; width: 100%;">
                            ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<option value="${n}" ${n === 3 ? 'selected' : ''}>${n} ítem${n > 1 ? 's' : ''}</option>`).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Ítems predefinidos</label>
                        <div>
                            <div style="margin-bottom: 8px;">
                                <input type="checkbox" id="redaccion" class="predefined-item">
                                <label for="redaccion" style="margin-left: 8px;">Redacción y ortografía</label>
                            </div>
                            <div>
                                <input type="checkbox" id="trabajo-equipo" class="predefined-item">
                                <label for="trabajo-equipo" style="margin-left: 8px;">Trabajo en equipo</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        html += '</div>';
        this.elements.body.innerHTML = html;
        this.generateRubricaItems(3);
        this.setupRubricaListeners();
    }

    /**
     * Genera los ítems de la rúbrica
     * @param {number} numItems 
     * @returns {void}
     */
    generateRubricaItems(numItems) {
        const container = document.getElementById('rubricaItems');
        if (!container) return;

        const redaccionChecked = document.getElementById('redaccion')?.checked || false;
        const trabajoEquipoChecked = document.getElementById('trabajo-equipo')?.checked || false;

        let html = '';
        let itemCount = 0;

        if (redaccionChecked) {
            html += this.createRubricaItem(itemCount++, 'Redacción y ortografía', true);
        }
        if (trabajoEquipoChecked) {
            html += this.createRubricaItem(itemCount++, 'Trabajo en equipo', true);
        }

        for (let i = itemCount; i < numItems; i++) {
            html += this.createRubricaItem(i, '', false);
        }

        container.innerHTML = html;
        setTimeout(() => this.setupReorderListeners(), 100);
        if (window.lucide) lucide.createIcons();
    }

    /**
     * Crea un ítem de la rúbrica
     * @param {number} index 
     * @param {string} defaultTitle 
     * @param {boolean} isPredefined 
     * @returns {string}
     */
    createRubricaItem(index, defaultTitle = '', isPredefined = false) {
        const readonlyAttr = isPredefined ? 'readonly' : '';
        const titleValue = defaultTitle || `Ítem ${index + 1}`;
        const levels = [
            { score: 10, color: '#4CAF50', placeholder: 'Excelente...', bg: '#f8fff8' },
            { score: 7, color: '#8BC34A', placeholder: 'Bueno...', bg: '#f8fff8' },
            { score: 5, color: '#FFC107', placeholder: 'Satisfactorio...', bg: '#fffef7' },
            { score: 3, color: '#FF9800', placeholder: 'Mejorable...', bg: '#fff9f5' },
            { score: 0, color: '#F44336', placeholder: 'No cumple...', bg: '#fff5f5' }
        ];

        let levelsHtml = levels.map(l => `
            <div class="level-container" style="background: #fff; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                <div style="font-weight: bold; text-align: center; background: ${l.color}; color: white; padding: 8px;">${l.score}</div>
                <textarea class="level-description" placeholder="${l.placeholder}"
                    style="min-height: 80px; border: none; padding: 6px; font-size: 12px; resize: vertical; background: ${l.bg}; width: 100%; box-sizing: border-box;"></textarea>
            </div>
        `).join('');

        return `
            <div class="rubrica-item" style="border: 1px solid var(--border-color); border-radius: 10px; padding: 10px; margin-bottom: 10px; background: var(--bg-primary);">
                <div style="display: flex; gap: 10px; align-items: flex-start; margin-bottom: 10px;">
                    <div style="flex: 2;">
                        <input type="text" class="form-input item-title" value="${titleValue}" ${readonlyAttr}
                               style="width: 100%; padding: 8px 10px;">
                    </div>
                    <div style="width: 80px;">
                        <select class="form-select item-weight" style="width: 100%;">
                            ${[1, 2, 3, 4, 5].map(n => `<option value="${n}" ${n === 2 ? 'selected' : ''}>${n}pt${n > 1 ? 's' : ''}</option>`).join('')}
                        </select>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 2px;">
                        <button class="reorder-btn move-up btn btn-sm" data-index="${index}" title="Mover arriba">
                            <i data-lucide="chevron-up" style="width: 14px; height: 14px;"></i>
                        </button>
                        <button class="reorder-btn move-down btn btn-sm" data-index="${index}" title="Mover abajo">
                            <i data-lucide="chevron-down" style="width: 14px; height: 14px;"></i>
                        </button>
                    </div>
                </div>
                <div class="rubrica-levels" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px;">
                    ${levelsHtml}
                </div>
            </div>
        `;
    }

    /**
     * Configura los listeners para la rúbrica
     * @return {void}
     */
    setupRubricaListeners() {
        document.getElementById('numItems')?.addEventListener('change', (e) => {
            this.generateRubricaItems(parseInt(e.target.value));
        });
        
        // Listener para ítems predefinidos
        document.querySelectorAll('.predefined-item').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.generateRubricaItems(parseInt(document.getElementById('numItems').value));
            });
        });

        // Listener para generación con IA
        document.getElementById('generateRubricaAIBtn')?.addEventListener('click', () => {
            this.generateRubricaWithAI();
        });

        // Listeners para reordenar ítems
        this.setupReorderListeners();
        if (window.lucide) lucide.createIcons();
    }

    /**
     * Configura los listeners para reordenar los ítems de la rúbrica
     * @returns {void}
     */
    setupReorderListeners() {
        document.querySelectorAll('.move-up').forEach(btn => {
            btn.addEventListener('click', (e) => this.moveRubricaItem(parseInt(e.currentTarget.dataset.index), -1));
        });
        document.querySelectorAll('.move-down').forEach(btn => {
            btn.addEventListener('click', (e) => this.moveRubricaItem(parseInt(e.currentTarget.dataset.index), 1));
        });
    }

    /**
     * Mueve un ítem de la rúbrica en la dirección especificada
     * @param {number} index 
     * @param {number} direction 
     * @returns {void}
     */
    moveRubricaItem(index, direction) {
        const container = document.getElementById('rubricaItems');
        const items = Array.from(container.children);
        const newIndex = index + direction;

        if (newIndex < 0 || newIndex >= items.length) return;

        if (direction === -1) {
            container.insertBefore(items[index], items[newIndex]);
        } else {
            container.insertBefore(items[newIndex], items[index]);
        }

        this.updateRubricaIndices();
        this.setupReorderListeners();
        if (window.lucide) lucide.createIcons();
    }

    /**
     * Actualiza los índices de los botones de reordenamiento y los títulos de los ítems si son genéricos
     * @return {void}
     */
    updateRubricaIndices() {
        const container = document.getElementById('rubricaItems');
        Array.from(container.children).forEach((item, idx) => {
            item.querySelector('.move-up')?.setAttribute('data-index', idx);
            item.querySelector('.move-down')?.setAttribute('data-index', idx);
            const titleInput = item.querySelector('.item-title');
            if (titleInput && !titleInput.readOnly && titleInput.value.startsWith('Ítem ')) {
                titleInput.value = `Ítem ${idx + 1}`;
            }
        });
    }

    /**
     * Simula la generación de descripciones de niveles de la rúbrica utilizando IA
     * @returns {void}
     */
    generateRubricaWithAI() {
        const btn = document.getElementById('generateRubricaAIBtn');
        const originalHTML = btn?.innerHTML;

        // Deshabilitar botón y mostrar estado de carga
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="loader"></i> Generando...';
            if (window.lucide) lucide.createIcons();
        }

        // Simular generación con IA
        setTimeout(() => {
            const mockDescriptions = [
                'Demuestra un dominio excepcional del concepto, aplicando conocimientos de manera innovadora.',
                'Muestra un buen entendimiento con aplicación correcta en la mayoría de los casos.',
                'Comprende los conceptos básicos y los aplica de manera satisfactoria.',
                'Demuestra comprensión limitada, requiere ayuda adicional.',
                'No demuestra comprensión del concepto o no presenta evidencia.'
            ];

            // Rellenar las descripciones de los niveles con los textos simulados
            document.querySelectorAll('.level-description').forEach((textarea, index) => {
                if (!textarea.value.trim()) {
                    textarea.value = mockDescriptions[index % 5];
                }
            });

            // Restaurar estado del botón
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalHTML;
                if (window.lucide) lucide.createIcons();
            }
        }, 1500);
    }

    // ============================================
    // EVALUACIÓN - LISTA DE VALORACIÓN
    // ============================================
    /**
     * Construye la lista de valoración según el tipo especificado
     * @param {*} data 
     * @param {*} key 
     * @returns {void}
     */
    buildListaValoracion(data, key) {
        const titleMap = {
            'autoevaluacion': 'Autoevaluación',
            'coevaluacion': 'Coevaluación',
            'lista-valoracion': 'Lista de Valoración',
            'lista-control': 'Lista de Control'
        };

        // Renderizar estructura básica
        this.elements.body.innerHTML = `
            <div class="valoracion-container">
                <div class="ai-buttons-container" style="margin-bottom: 16px;">
                    <button class="btn btn-primary" id="generateValoracionBtn">
                        <i data-lucide="sparkles"></i>
                        Generar con IA
                    </button>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Ítems de ${titleMap[key] || 'Valoración'}</label>
                    <div id="valoracionItems"></div>
                    <button class="btn btn-secondary" id="addValoracionItem" style="margin-top: 12px;">
                        <i data-lucide="plus"></i> Añadir ítem
                    </button>
                </div>
                
                ${this.getNotasAdicionalesHTML()}
            </div>
        `;

        this.initValoracionItems();
        this.setupValoracionListeners();
        if (window.lucide) lucide.createIcons();
    }

    /**
     * Inicializa la lista de valoración con ítems por defecto
     * @return {void}
     */
    initValoracionItems() {
        const container = document.getElementById('valoracionItems');
        container.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            this.addValoracionItem();
        }
    }

    /**
     * Agrega un nuevo ítem a la lista de valoración
     * @return {void}
     */
    addValoracionItem() {
        const container = document.getElementById('valoracionItems');
        const index = container.children.length;

        const item = document.createElement('div');
        item.className = 'valoracion-item';
        item.style.cssText = 'display: flex; gap: 8px; margin-bottom: 8px; align-items: center;';
        item.innerHTML = `
            <input type="text" class="form-input" placeholder="Descripción del ítem ${index + 1}" style="flex: 1;">
            <button class="btn btn-sm btn-danger remove-item" title="Eliminar">
                <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            </button>
        `;

        container.appendChild(item);
        if (window.lucide) lucide.createIcons();
    }

    /**
     * Configura los listeners para la lista de valoración, incluyendo adición, eliminación y generación con IA
     * @return {void}
     */
    setupValoracionListeners() {
        // Listener para agregar ítem
        document.getElementById('addValoracionItem')?.addEventListener('click', () => this.addValoracionItem());

        // Listener para eliminar ítem usando delegación de eventos
        document.getElementById('valoracionItems')?.addEventListener('click', (e) => {
            if (e.target.closest('.remove-item')) {
                e.target.closest('.valoracion-item')?.remove();
            }
        });

        // Listener para generación con IA
        document.getElementById('generateValoracionBtn')?.addEventListener('click', () => {
            // Simular generación con IA
            const items = document.querySelectorAll('#valoracionItems input');
            const mockItems = [
                'El alumno demuestra comprensión de los conceptos fundamentales',
                'Aplica correctamente los procedimientos aprendidos',
                'Muestra autonomía en la resolución de problemas'
            ];
            items.forEach((input, i) => {
                if (!input.value.trim()) {
                    input.value = mockItems[i] || `Criterio ${i + 1}`;
                }
            });
        });
    }

    // ============================================
    // RECURSOS - APUNTES PDF
    // ============================================

    /**
     * Construye el editor de apuntes en PDF
     * @param {*} data 
     * @returns {void}
     */
    buildApuntesPDF(data) {
        if (!window.documentsComponent) {
            this.elements.body.innerHTML = this.renderErrorMessage(
                'Apuntes en PDF',
                'No se ha podido cargar el componente documental.'
            );
            return;
        }

        const rawContent = data?.content || '';
        let initialData = null;

        if (rawContent && typeof rawContent === 'string') {
            try {
                initialData = JSON.parse(rawContent);
            } catch (_) {
                initialData = {
                    markdown: rawContent
                };
            }
        } else if (data && typeof data === 'object') {
            initialData = data;
        }

        window.documentsComponent.renderApuntesEditor({
            modal: this,
            container: this.elements.body,
            resourceKey: this.currentKey,
            data: initialData || {}
        });

        if (window.lucide) lucide.createIcons();
    }


    // ============================================
    // RECURSOS - PRESENTACIÓN DOCENTE
    // ============================================
    /**
     * Construye la presentación del docente
     * @param {*} data 
     * @returns {void}
     */
    buildPresentacionDocente(data) {
        this.elements.body.innerHTML = `
            <div class="presentacion-container">
                <div style="display: flex; gap: 20px;">
                    <div style="flex: 1;">
                        <div class="form-group">
                            <label class="form-label">Contenido de la presentación</label>
                            <textarea class="form-textarea" id="presentacionContent" style="min-height: 400px;"
                                placeholder="Describe los temas y estructura de la presentación...">${data.content || ''}</textarea>
                        </div>
                        
                        <div id="presentacionPreview" style="display: none; margin-top: 16px; padding: 16px; background: var(--bg-secondary); border-radius: 8px;">
                            <h4 style="margin-bottom: 12px;">Vista previa</h4>
                            <div id="previewContent"></div>
                        </div>
                        
                        ${this.getNotasAdicionalesHTML()}
                    </div>
                    
                    <div style="min-width: 280px; background: var(--bg-secondary); padding: 16px; border-radius: 8px; height: fit-content;">
                        <div class="ai-buttons-container" style="margin-bottom: 16px;">
                            <button class="btn btn-primary" id="generatePresentacionBtn" style="width: 100%;">
                                <i data-lucide="presentation"></i>
                                Generar con IA
                            </button>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Número de slides</label>
                            <select class="form-select" id="numSlides" style="width: 100%;">
                                ${[5, 8, 10, 12, 15, 20].map(n => `<option value="${n}" ${n === 10 ? 'selected' : ''}>${n} slides</option>`).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Estilo</label>
                            <select class="form-select" id="presentacionStyle" style="width: 100%;">
                                <option value="academic">Académico</option>
                                <option value="modern">Moderno</option>
                                <option value="minimal">Minimalista</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.setupPresentacionListeners();
        if (window.lucide) lucide.createIcons();
    }
    /**
     * Configura los listeners para la presentación del docente, incluyendo la generación de una vista previa con IA
     * @return {void}
     */
    setupPresentacionListeners() {
        // Listener para generación con IA
        document.getElementById('generatePresentacionBtn')?.addEventListener('click', () => {
            const btn = document.getElementById('generatePresentacionBtn');
            const numSlides = document.getElementById('numSlides').value;

            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="loader"></i> Generando...';
            if (window.lucide) lucide.createIcons();

            setTimeout(() => {
                const preview = document.getElementById('presentacionPreview');
                const content = document.getElementById('previewContent');

                preview.style.display = 'block';
                content.innerHTML = `
                    <p>Presentación de ${numSlides} slides generada:</p>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px; margin-top: 12px;">
                        ${Array.from({ length: parseInt(numSlides) }, (_, i) => `
                            <div style="background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: 4px; padding: 8px; text-align: center; font-size: 12px;">
                                Slide ${i + 1}
                            </div>
                        `).join('')}
                    </div>
                `;

                btn.disabled = false;
                btn.innerHTML = '<i data-lucide="presentation"></i> Generar con IA';
                if (window.lucide) lucide.createIcons();
            }, 2000);
        });
    }

    // ============================================
    // RECURSOS - VÍDEOS
    // ============================================

    /**
     * Construye la interfaz de vídeos, incluyendo búsqueda y selección
     * @param {*} data 
     * @returns {void}
     */ 
    buildVideosInterface(data) {
        this.selectedVideos = new Set();

        this.elements.body.innerHTML = `
            <div class="videos-container">
                <div style="display: flex; gap: 20px;">
                    <div style="flex: 1;">
                        <div class="form-group">
                            <label class="form-label">Buscar vídeos</label>
                            <div style="display: flex; gap: 8px;">
                                <input type="text" class="form-input" id="videoSearch" placeholder="Buscar en YouTube..." style="flex: 1;">
                                <button class="btn btn-primary" id="searchVideosBtn">
                                    <i data-lucide="search"></i>
                                    Buscar
                                </button>
                            </div>
                        </div>
                        
                        <div id="videoResults" style="margin-top: 16px;">
                            <p style="color: var(--text-secondary); text-align: center; padding: 40px;">
                                Introduce un término de búsqueda para encontrar vídeos
                            </p>
                        </div>
                        
                        ${this.getNotasAdicionalesHTML()}
                    </div>
                    
                    <div style="min-width: 280px; background: var(--bg-secondary); padding: 16px; border-radius: 8px; height: fit-content;">
                        <h4 style="margin-bottom: 12px;">Vídeos seleccionados</h4>
                        <div id="selectedVideosList">
                            <p style="color: var(--text-secondary); font-size: 14px;">
                                No hay vídeos seleccionados
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.setupVideosListeners();
        if (window.lucide) lucide.createIcons();
    }

    /**
     * Configura los listeners para la interfaz de vídeos, incluyendo la búsqueda simulada y la selección de resultados
     * @returns {void}
     */
    setupVideosListeners() {
        document.getElementById('searchVideosBtn')?.addEventListener('click', () => {
            const query = document.getElementById('videoSearch').value.trim();
            if (!query) return;

            const results = document.getElementById('videoResults');
            results.innerHTML = '<p style="text-align: center; padding: 20px;">Buscando...</p>';

            // Simular búsqueda
            setTimeout(() => {
                const mockVideos = [
                    { id: '1', title: `Tutorial: ${query}`, duration: '10:25' },
                    { id: '2', title: `Introducción a ${query}`, duration: '15:30' },
                    { id: '3', title: `${query} - Guía completa`, duration: '22:15' }
                ];

                results.innerHTML = mockVideos.map(v => `
                    <div class="video-item" data-video-id="${v.id}" style="display: flex; gap: 12px; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 8px; cursor: pointer;">
                        <div style="width: 120px; height: 68px; background: var(--bg-tertiary); border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                            <i data-lucide="play" style="width: 24px; height: 24px;"></i>
                        </div>
                        <div style="flex: 1;">
                            <div style="font-weight: 500;">${v.title}</div>
                            <div style="font-size: 12px; color: var(--text-secondary);">${v.duration}</div>
                        </div>
                        <button class="btn btn-sm select-video-btn">Seleccionar</button>
                    </div>
                `).join('');

                if (window.lucide) lucide.createIcons();

                // Añadir listeners a los botones de selección
                results.querySelectorAll('.select-video-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const videoItem = e.target.closest('.video-item');
                        const videoId = videoItem.dataset.videoId;
                        this.toggleVideoSelection(videoId, videoItem.querySelector('div > div').textContent);
                    });
                });
            }, 1000);
        });
    }

    /**
     * Alterna la selección de un vídeo en la lista de vídeos seleccionados
     * @param {string} videoId - ID del vídeo
     * @param {string} title - Título del vídeo
     * @returns {void}
     */
    toggleVideoSelection(videoId, title) {
        if (this.selectedVideos.has(videoId)) {
            this.selectedVideos.delete(videoId);
        } else {
            this.selectedVideos.add(videoId);
        }
        this.updateSelectedVideosList();
    }

    /**
     * Actualiza la lista de vídeos seleccionados en la interfaz del modal
     * @return {void}
     */
    updateSelectedVideosList() {
        const list = document.getElementById('selectedVideosList');
        if (this.selectedVideos.size === 0) {
            list.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px;">No hay vídeos seleccionados</p>';
        } else {
            list.innerHTML = Array.from(this.selectedVideos).map(id => `
                <div style="padding: 8px; background: var(--bg-primary); border-radius: 4px; margin-bottom: 4px; font-size: 14px;">
                    Vídeo ${id}
                </div>
            `).join('');
        }
    }

    // ============================================
    // SAVE
    // ============================================
    /**
     * Guarda los cambios realizados en el modal
     * @returns {void}
     */
    save() {
        if (this.currentType === 'resource' && this.currentKey === 'apuntes' && window.documentsComponent) {
            const handled = window.documentsComponent.handleModalSave(this);
            if (handled) {
                this.showSaveSuccess();
                setTimeout(() => this.close(), 350);
                return;
            }
        }

        let content;
        const selection = this.getSelection(); // Extrae los datos complejos del DOM actual

        //// 1. Manejo del modo edición directa desde el Resumen
        //if (this.resumenMode && this.resumenMode.callback) {
        //    this.updateSessionStorageSelection(this.currentKey, selection, this.resumenMode);
        //    this.updateStoreSelection(this.currentKey, selection);
        //    this.resumenMode.callback(selection);
        //    this.resumenMode = null;
        //    this.close();
        //    return;
        //}

        // 1. Manejo del modo edición desde el Resumen (por fila)
        if (this.resumenMode && this.resumenMode.rowIndex !== undefined) {
            this.updateSessionStorageSelection(this.currentKey, selection, this.resumenMode);

            // Si además viene callback, lo respetamos
            if (this.resumenMode.callback) {
                this.resumenMode.callback(selection);
            }

            this.resumenMode = null;
            this.showSaveSuccess();
            setTimeout(() => this.close(), 300);
            return;
        }

        // 2. Guardado estándar desde el Sidebar
        const contentTextarea = document.getElementById('modalContent');
        if (contentTextarea) {
            content = contentTextarea.value;
        } else {
            content = JSON.stringify(selection);
        }

        // --- SINCRONIZACIÓN CON SESSION STORAGE ---
        if (window.sessionStorageManager) {
            this.updateSessionStorageSelection(this.currentKey, selection);
        }

        // 3. Persistencia en Store Global (AppStore)
        let statePath = this.getStatePath();
        if (statePath) {
            this.store.updateNestedState(statePath, content);
        }

        this.showSaveSuccess();
        setTimeout(() => this.close(), 500);
    }

    // Método auxiliar para limpiar el switch de save()
    /**
     * Obtiene la ruta del estado en el store global según el tipo y la clave actual
     * @returns {string|null} Ruta del estado o null si no aplica
     */
    getStatePath() {
        const evalKeyMap = {
            'rubrica': 'rubrica', 'autoevaluacion': 'autoevaluacion',
            'coevaluacion': 'coevaluacion', 'lista-valoracion': 'listaValoracion',
            'lista-control': 'listaControl'
        };
        if (this.currentType === 'dc') return `disenoCurricular.${this.currentKey}.content`;
        if (this.currentType === 'eval') return `evaluacion.${evalKeyMap[this.currentKey] || this.currentKey}.content`;
        if (this.currentType === 'resource') return `recursos.${this.currentKey}.content`;
        return null;
    }

    /**
     * Extrae la selección actual del modal, adaptándose a la estructura específica de cada tipo de contenido
     * @returns {any} Objeto con la selección actual, listo para ser guardado o procesado según el tipo de contenido
     */
    getSelection() {
        // Extracción para ODS (Esquema complejo)
        if (this.currentKey === 'ods') {
            const result = [];
            const odsRows = document.querySelectorAll('.ods-row');

            odsRows.forEach(row => {
                const odsCodigo = row.dataset.ods || '';
                const odsTituloCell = row.querySelector('td:nth-child(2)')?.textContent.trim() || '';
                const odsDescripcion = row.querySelector('td:nth-child(3)')?.textContent.trim() || '';
                const odsSeleccionado = row.classList.contains('selected') || row.classList.contains('partial');

                const metaRows = document.querySelectorAll(`.ods-meta-row.selected[data-ods="${odsCodigo}"]`);

                const metas = Array.from(metaRows).map(metaRow => ({
                    meta_id: metaRow.dataset.meta || '',
                    meta_descripcion: metaRow.querySelector('td:nth-child(3)')?.textContent.trim() || ''
                }));

                // Si está seleccionado el padre o hay metas seleccionadas, se guarda
                if (odsSeleccionado || metas.length > 0) {
                    result.push({
                        ods_numer: odsCodigo,
                        ods_descripcion: odsDescripcion || odsTituloCell,
                        metas,
                        desde_menu: 'ODS'
                    });
                }
            });

            return result;
        }


        // Extracción para Competencias Clave (Esquema descriptores condicionales)
        if (this.currentKey === 'competenciasClave' || this.currentKey === 'competencias_clave') {
            const result = [];
            const compDoc = this.xmlData?.competencias_clave;

            if (!compDoc) return result;

            const compIds = new Set([
                ...(this.selectedCompetencias ? Array.from(this.selectedCompetencias) : []),
                ...(this.selectedCompetenciasDesc ? Array.from(this.selectedCompetenciasDesc.keys()) : [])
            ]);

            compIds.forEach(compId => {
                const node = Array.from(compDoc.querySelectorAll('competencia'))
                    .find(n => (n.querySelector('id')?.textContent || '').trim() === compId);

                if (!node) return;

                const descSet = this.selectedCompetenciasDesc?.get(compId) || new Set();

                const descriptores = Array.from(node.querySelectorAll('descriptor'))
                    .filter(d => descSet.has((d.querySelector('codigo')?.textContent || '').trim()))
                    .map(d => ({
                        ccd_id: (d.querySelector('codigo')?.textContent || '').trim(),
                        ccd_descripcion_eso: (d.querySelector('educacion_basica')?.textContent || '').trim(),
                        ccd_descripcion_bachillerato: (d.querySelector('bachillerato')?.textContent || '').trim()
                    }));

                result.push({
                    cc_id: (node.querySelector('id')?.textContent || '').trim(),
                    cc_descripcion: (node.querySelector('titulo')?.textContent || '').trim(),
                    cc_descriptores: descriptores,
                    candado: false
                });
            });

            return result;
        }

        // Extracción para CPPs (ccps_id = Orden)
        if (this.currentKey === 'cpps') {
            return Array.from(document.querySelectorAll('.obj-row.selected')).map(row => ({
                ccps_id: row.dataset.orden,
                cpps_descripcion: row.querySelector('td:last-child').textContent.trim()
            }));
        }

        // Extracción para Retos y ObGs (Esquema simple)
        if (this.currentKey === 'xxi' || this.currentKey === 'objetivos') {
            const idField = this.currentKey === 'xxi' ? 'id' : 'codigo';
            const resultKey = this.currentKey === 'xxi' ? 'reto' : 'obg';

            return Array.from(document.querySelectorAll('.xxi-table-modern tr.selected, .obj-row.selected')).map(row => ({
                [`${resultKey}_id`]: row.dataset[idField],
                [`${resultKey}_titulo`]: row.querySelector('td:nth-child(3)')?.textContent.trim() || '',
                [`${resultKey}_descripcion`]: row.querySelector('td:last-child').textContent.trim()
            }));
        }


        // Extracción para Race
        if (this.currentKey === 'race' || this.currentKey === 'ra_ce') {
            const source = Array.isArray(this.fpModuleData?.race) ? this.fpModuleData.race : [];
            return source
                .filter(ra => {
                    const raId = ra.ra_id || ra.id || '';
                    return raId && (this.selectedRACE?.has(raId) || this.selectedRACECriterios?.has(raId));
                })
                .map(ra => {
                    const raId = ra.ra_id || ra.id || '';
                    const selectedSet = this.selectedRACECriterios?.get(raId) || new Set();
                    const criterios = Array.isArray(ra.criterios) ? ra.criterios : [];
                    const selectedCriteria = criterios
                        .filter(ce => selectedSet.has(ce.letra_criterio || ce.ce_id || ''))
                        .map(ce => ({
                            ce_id: ce.letra_criterio || ce.ce_id || '',
                            ce_descripcion: ce.descripcion_criterio || ce.ce_descripcion || ''
                        }));

                    return {
                        ra_id: raId,
                        ra_descripcion: ra.ra_descripcion || ra.descripcion || '',
                        ra_ce: selectedCriteria
                    };
                });
        }

        // Extracción para Competencias Específicas (Esquema con niveles de desempeño)
        if (this.currentKey === 'competenciasEspecificas') {
            const source = Array.isArray(this.secondarySubjectData?.competencias_especificas) ? this.secondarySubjectData.competencias_especificas : [];
            return source
                .filter(comp => {
                    const compId = comp.id || comp.ra_id || '';
                    return compId && (this.selectedCompetenciasEspec?.has(compId) || this.selectedCompetenciasEspecCriterios?.has(compId));
                })
                .map(comp => {
                    const compId = comp.id || comp.ra_id || '';
                    const selectedSet = this.selectedCompetenciasEspecCriterios?.get(compId) || new Set();
                    const criterios = Array.isArray(comp.criterios_evaluacion) ? comp.criterios_evaluacion : [];
                    const selectedCriteria = criterios
                        .filter(ce => selectedSet.has(`${compId}_${ce.codigo}`))
                        .map(ce => ({
                            ce_id: ce.codigo || '',
                            ce_descripcion: ce.criterio || ''
                        }));

                    return {
                        ra_id: compId,
                        ra_descripcion: comp.titulo || comp.ra_descripcion || '',
                        ra_ce: selectedCriteria
                    };
                });
        }

        // Extracción para Contenido o Saberes
        // En js/components/modal.js -> método getSelection()

        if (this.currentKey === 'contenidos' || this.currentKey === 'saberes') {
            const result = [];

            const bloqueSelector = this.currentKey === 'contenidos'
                ? '.contenidos-row'
                : '.saberes-row';

            const bloqueRows = document.querySelectorAll(bloqueSelector);

            bloqueRows.forEach(row => {
                const bloqueId = row.dataset.bloque;
                const nombreBloque = row.querySelector('td:nth-child(3)').textContent.trim();
                const bloqueSeleccionado = row.classList.contains('selected');

                const puntoSelector = this.currentKey === 'contenidos'
                    ? `.contenidos-punto-row.selected[data-bloque="${bloqueId}"]`
                    : `.saberes-saber-row.selected[data-bloque="${bloqueId}"]`;

                const puntoRows = document.querySelectorAll(puntoSelector);

                const puntos = Array.from(puntoRows).map(pr => ({
                    punto_id: pr.dataset.punto || pr.dataset.saber,
                    punto_descripcion: pr.querySelector('td:last-child').textContent.trim()
                }));

                if (bloqueSeleccionado || puntos.length > 0) {
                    result.push({
                        bloque_id: bloqueId,
                        bloque_descripcion: nombreBloque,
                        bloque_puntos: puntos,
                        desde_menu: this.currentKey === 'contenidos' ? 'Contenidos' : 'Saberes Básicos'
                    });
                }
            });

            return result;
        }

        // Extracción para Softskills (Esquema con grupos, habilidades y ítems)
        if (this.currentKey === 'softskills') {
            const grouped = new Map();

            // 1) Categorías seleccionadas completas
            const selectedCatRows = Array.from(document.querySelectorAll('.ss-row.selected'));

            selectedCatRows.forEach(row => {
                const catId = row.dataset.cat || '';
                const categoryText = row.querySelector('.ss-chip')?.textContent?.trim() || catId;

                if (!grouped.has(catId)) {
                    grouped.set(catId, {
                        grupo_id: catId,
                        grupo_descripcion: categoryText,
                        skill: [
                            {
                                sk_id: catId,
                                sk_descripcion: categoryText,
                                sk_items: [],
                                sk_metodo: {
                                    valor: '',
                                    opciones: [
                                        'Evaluación simple directa',
                                        'lista de valoración',
                                        'lista de control',
                                        'auto-evaluación',
                                        'co-evaluación'
                                    ]
                                },
                                sk_agente: {
                                    valor: '',
                                    opciones: ['Profesor', 'Alumno']
                                }
                            }
                        ]
                    });
                }

                const group = grouped.get(catId);
                const skill = group.skill[0];

                const itemRows = Array.from(document.querySelectorAll(`.ss-item-row[data-cat="${CSS.escape(catId)}"]`));
                itemRows.forEach(itemRow => {
                    const itemId = itemRow.dataset.item || '';
                    const itemCells = itemRow.querySelectorAll('td');
                    const itemTitulo = itemCells[1]?.textContent?.trim() || '';
                    const itemDescripcion = itemCells[2]?.textContent?.trim() || itemTitulo;

                    if (!skill.sk_items.some(it => it.skitems_id === itemId)) {
                        skill.sk_items.push({
                            skitems_id: itemId,
                            skitems_descripcion: itemDescripcion || itemTitulo
                        });
                    }
                });
            });

            // 2) Ítems seleccionados individualmente
            const selectedRows = Array.from(document.querySelectorAll('.ss-item-row.selected'));

            selectedRows.forEach(row => {
                const catId = row.dataset.cat || '';
                const itemId = row.dataset.item || '';

                const categoryRow = document.querySelector(`.ss-row[data-cat="${CSS.escape(catId)}"]`);
                const categoryText = categoryRow?.querySelector('.ss-chip')?.textContent?.trim() || catId;

                const itemCells = row.querySelectorAll('td');
                const itemTitulo = itemCells[1]?.textContent?.trim() || '';
                const itemDescripcion = itemCells[2]?.textContent?.trim() || itemTitulo;

                if (!grouped.has(catId)) {
                    grouped.set(catId, {
                        grupo_id: catId,
                        grupo_descripcion: categoryText,
                        skill: [
                            {
                                sk_id: catId,
                                sk_descripcion: categoryText,
                                sk_items: [],
                                sk_metodo: {
                                    valor: '',
                                    opciones: [
                                        'Evaluación simple directa',
                                        'lista de valoración',
                                        'lista de control',
                                        'auto-evaluación',
                                        'co-evaluación'
                                    ]
                                },
                                sk_agente: {
                                    valor: '',
                                    opciones: ['Profesor', 'Alumno']
                                }
                            }
                        ]
                    });
                }

                const group = grouped.get(catId);
                const skill = group.skill[0];

                if (!skill.sk_items.some(it => it.skitems_id === itemId)) {
                    skill.sk_items.push({
                        skitems_id: itemId,
                        skitems_descripcion: itemDescripcion || itemTitulo
                    });
                }
            });

            return Array.from(grouped.values());
        }

        // Extracción para Metodología (Esquema simple de filas seleccionadas)
        if (this.currentKey === 'metodologia') {
            return Array.from(document.querySelectorAll('#metodologiaTableBody tr.selected')).map(row => ({
                metodologia_id: row.dataset.id || '',
                metodologia_titulo: row.querySelector('td:nth-child(2)')?.textContent.trim() || '',
                metodologia_descripcion: row.querySelector('td:nth-child(3)')?.textContent.trim() || '',
                metodologia_sugerencia: row.querySelector('td:nth-child(4)')?.textContent.trim() || ''
            }));
        }

        // Extracción para Diversidad y DUA (Esquema de texto libre)
        if (this.currentKey === 'diversidad' || this.currentKey === 'atencion_diversidad') {
            const textarea =
                document.getElementById('modalContent') ||
                this.elements.body.querySelector('textarea');

            const content = textarea?.value?.trim() || '';

            return {
                ad_contenido: content
            };
        }

        // Para DUA, aunque el esquema es similar a Diversidad, lo diferenciamos para mantener claridad en el almacenamiento y posible tratamiento posterior
        if (this.currentKey === 'dua') {
            const textarea =
                document.getElementById('modalContent') ||
                this.elements.body.querySelector('textarea');

            const content = textarea?.value?.trim() || '';

            return {
                dua_contenido: content
            };
        }

        // Extracción para Bloom e Inteligencias Múltiples (Esquema con niveles y descriptores)
        if (this.currentKey === 'bloom') {
            return Array.from(document.querySelectorAll('#bloomTableBody tr.selected')).map(row => {
                const nivelCompleto = row.querySelector('td:nth-child(2)')?.textContent.trim() || '';
                const bloom_nivel = nivelCompleto.replace(/^\d+\.\s*/, '').trim();

                return {
                    bloom_nivel,
                    bloom_definicion: row.querySelector('td:nth-child(3)')?.textContent.trim() || '',
                    bloom_verbos_clave: row.querySelector('td:nth-child(4)')?.textContent.trim() || '',
                    bloom_ejemplos: row.querySelector('td:nth-child(5)')?.textContent.trim() || '',
                    desde_menu: 'Taxonomía de Bloom'
                };
            });
        }

        // Extracción para Inteligencias Múltiples, compartiendo esquema con Bloom pero con campos adaptados a su contexto específico
        if (
            this.currentKey === 'inteligencias' ||
            this.currentKey === 'im' ||
            this.currentKey === 'inteligencias_multiples'
        ) {
            return Array.from(document.querySelectorAll('#intelTableBody tr.selected')).map(row => ({
                im_inteligencia: row.querySelector('td:nth-child(2)')?.textContent.trim() || '',
                im_definicion: row.querySelector('td:nth-child(3)')?.textContent.trim() || '',
                im_perfil_alumno: row.querySelector('td:nth-child(4)')?.textContent.trim() || '',
                im_estrategias_clave: row.querySelector('td:nth-child(5)')?.textContent.trim() || '',
                desde_menu: 'Inteligencias Múltiples'
            }));
        }

        return []; // Fallback para otros tipos
    }




    /**
     * Actualiza sessionStorage con la selección del modal
     * Unifica guardado global y guardado por fila del resumen
     * @param {string} key - Clave del menú/modal actual
     * @param {any} selection - Selección actual a guardar
     * @param {object|null} resumenMode - Información adicional para guardado por fila (opcional)
     */
    updateSessionStorageSelection(key, selection, resumenMode = null) {
        if (!window.sessionStorageManager) {
            console.warn('sessionStorageManager no disponible');
            return;
        }

        // Guardado específico cuando el modal se abrió desde una actividad
        if (
            (key === 'bloom' || key === 'inteligencias' || key === 'im' || key === 'inteligencias_multiples') &&
            this.currentContext &&
            this.currentContext.type === 'actividad' &&
            typeof this.currentContext.index !== 'undefined'
        ) {
            const activityIndex = Number(this.currentContext.index);

            const normalizedKey =
                key === 'bloom'
                    ? 'bloom'
                    : 'inteligencias_multiples';

            if (window.sessionStorageManager?.updateActividadSelection) {
                window.sessionStorageManager.updateActividadSelection(
                    activityIndex,
                    normalizedKey,
                    selection
                );
            }

            return;
        }

        // Mapeo de claves para mantener consistencia en sessionStorage
        const menuTypeMap = {
            'ods': 'ods',
            'xxi': 'retos_xxi',
            'objetivos': 'objetivos_generales',
            'cpps': 'cpps',
            'competenciasClave': 'competencias_clave',
            'competencias_clave': 'competencias_clave',

            'race': 'ra_ce',
            'ra_ce': 'ra_ce',
            'softskills': 'soft_skills',
            'metodologia': 'metodologia',
            'diversidad': 'atencion_diversidad',
            'atencion_diversidad': 'atencion_diversidad',
            'dua': 'dua',
            'bloom': 'bloom',
            'inteligencias': 'inteligencias_multiples',
            'contenidos': 'contenidos',
            'saberes': 'saberes',
            'competenciasEspecificas': 'competencias_especificas'
        };

        const menuType = menuTypeMap[key] || key;

        try {
            // 1) Contexto por fila
            if (resumenMode && resumenMode.rowIndex !== undefined) {
                const section =
                    resumenMode.section ||
                    (resumenMode.field ? resumenMode.field.split('.')[0] : 'elementos_curriculares');

                let fieldType = 'ra_ce';

                if (menuType === 'bloom') {
                    fieldType = 'bloom';
                } else if (menuType === 'inteligencias_multiples') {
                    fieldType = 'inteligencias_multiples';
                } else if (menuType === 'contenidos' || menuType === 'saberes') {
                    fieldType = 'contenidos';
                } else if (menuType === 'ra_ce' || menuType === 'competencias_especificas') {
                    fieldType = 'ra_ce';
                }

                window.sessionStorageManager.updateRowContext(
                    section,
                    resumenMode.rowIndex,
                    fieldType,
                    selection
                );

                console.log(`Selección guardada por fila en sessionStorage: ${section}[${resumenMode.rowIndex}].${fieldType}`, selection);
                return;
            }

            // 2) Contexto global de contextualización
            if (['ods', 'retos_xxi', 'objetivos_generales', 'cpps', 'competencias_clave'].includes(menuType)) {
                window.sessionStorageManager.updateContextualizacionData(menuType, selection);
                console.log(`Selección global guardada en contextualización: ${menuType}`, selection);
                return;
            }

            // 3) Otros menús globales
            window.sessionStorageManager.updateMenuSelection(menuType, selection);
            console.log(`Selección global guardada en sessionStorage: ${menuType}`, selection);

        } catch (error) {
            console.error(`Error guardando selección en sessionStorage para ${menuType}:`, error);
        }
    }
    /**
     * Actualiza la selección en el store global según la clave proporcionada.
     * @param {string} key - Clave del menú/modal actual
     * @param {any} selection - Selección actual a guardar
     */
    updateStoreSelection(key, selection) {
        if (window.store && window.store.setState) {
            const keyMap = {
                'ods': 'ods',
                'xxi': 'xxi',
                'objetivos': 'objetivos',
                'cpps': 'cpps',
                'race': 'race',
                'contenidos': 'contenidos',
                'softskills': 'softskills',
                'metodologia': 'metodologia',
                'bloom': 'bloom',
                'inteligencias': 'inteligencias',
                'diversidad': 'diversidad',
                'dua': 'dua'
            };

            const storeKey = keyMap[key] || key;
            window.store.setState(`modalSelections.${storeKey}`, selection);
            console.log(`Updated store modalSelections.${storeKey}:`, selection);
        }
    }

    /**
     * Muestra una indicación visual de éxito en el botón de guardar, 
     * cambiando temporalmente su texto e ícono para confirmar al usuario que los cambios se han guardado correctamente.
     * El botón vuelve a su estado original después de un breve período, manteniendo una experiencia de usuario fluida y clara.
     */
    showSaveSuccess() {
        const originalText = this.elements.saveButton?.textContent;
        if (this.elements.saveButton) {
            this.elements.saveButton.textContent = '✓ Guardado';
            this.elements.saveButton.style.backgroundColor = 'var(--success-color)';

            setTimeout(() => {
                this.elements.saveButton.textContent = originalText;
                this.elements.saveButton.style.backgroundColor = '';
            }, 500);
        }
    }

    // ============================================
    // FP-SPECIFIC RENDERERS (Formación Profesional)
    // ============================================

    /**
     * 0. Renderiza advertencia cuando no hay módulo seleccionado
     * Diseño específico para FP, con mensaje claro y llamado a la acción para seleccionar 
     * un módulo antes de acceder a ciertos contenidos que dependen de esa selección (orientación
     * metodológica, prospectiva, RA/CE, contenidos, objetivos generales y CPPs)
     * @param {string} popupType - Tipo de contenido para personalizar el mensaje (orientación, prospectiva, RA/CE, contenidos, objetivos generales y CPPs)
     */
    renderFPWarningNoModule(popupType) {
        // Mapeo de tipos de popup a nombres más amigables para el mensaje
        const popupNames = {
            'orientacion': 'Orientación',
            'prospectiva': 'Prospectiva',
            'race': 'RA/CE',
            'contenidos': 'Contenidos',
            'objetivos': 'Objetivos Generales (ObGs)',
            'cpps': 'CPPs'
        };
        
        // Si el tipo no está en el mapa, usamos el mismo valor recibido
        const popupName = popupNames[popupType] || popupType;

        this.elements.body.innerHTML = `
            <div class="modal-content-wrapper">
                <div class="form-section">
                    <div class="warning-message">
                        <div class="warning-icon">
                            <i data-lucide="alert-triangle" size="48"></i>
                        </div>
                        <div class="warning-content">
                            <h3>Módulo no seleccionado</h3>
                            <p>Para ver el contenido de <strong>${popupName}</strong>, primero debe seleccionar un módulo.</p>
                            <p>Vaya al selector de asignaturas en la parte superior y elija un ciclo formativo y su módulo correspondiente.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Re-init Lucide icons
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    /**
     * Muestra un modal de advertencia con título y mensaje personalizados
     * Diseño específico para FP, con ícono de advertencia y estilo visual que resalta la importancia del mensaje, asegurando que el usuario comprenda claramente la advertencia presentada.
     * @param {string} title - Título de la advertencia
     * @param {string} message - Mensaje descriptivo de la advertencia
     * @returns {Promise<void>} - Promesa que se resuelve cuando el modal se ha mostrado completamente
     */
    async showWarningModal(title, message) {
        this.currentType = 'warning';
        this.currentKey = 'warning';

        this.elements.title.textContent = title;

        this.elements.body.innerHTML = `
            <div class="modal-content-wrapper">
                <div class="form-section">
                    <div class="warning-message">
                        <div class="warning-icon">
                            <i data-lucide="alert-triangle" size="48"></i>
                        </div>
                        <div class="warning-content">
                            <h3>${title}</h3>
                            <p>${message}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Re-init Lucide icons
        if (window.lucide) {
            lucide.createIcons();
        }

        this.showModal();
    }

    /**
     * Renderiza la descripción de asignatura para Educación Secundaria
     * Diseño atractivo con información completa de la asignatura
     * Incluye secciones de justificación, contribución al desarrollo, ejes competenciales, orientaciones metodológicas y situaciones de aprendizaje, cada una con su propio estilo visual y elementos interactivos para mejorar la experiencia del usuario al explorar la información de la asignatura.
     * @param {object} subjectData - Datos de la asignatura a renderizar, incluyendo introducción, ejes competenciales, orientaciones metodológicas y situaciones de aprendizaje
     */
    renderSecondaryDescripcion(subjectData) {
        console.log('Rendering Secondary Descripcion with:', subjectData);

        if (!subjectData) {
            this.elements.body.innerHTML = this.renderErrorMessage('Descripción', 'No se pudieron cargar los datos de la asignatura');
            return;
        }

        const introduccion = subjectData.introduccion || {};
        const ejesCompetenciales = introduccion.ejes_competenciales || [];
        const orientaciones = subjectData.orientaciones_metodologicas || {};
        const situaciones = subjectData.situaciones_aprendizaje || [];

        this.elements.body.innerHTML = `
            <div class="modal-content-wrapper">
                <!-- Header atractivo de la asignatura -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 32px; border-radius: 12px; margin-bottom: 24px; text-align: center;">
                    <h1 style="margin: 0 0 8px 0; font-size: 32px; font-weight: 700;">${subjectData.asignatura || 'Asignatura'}</h1>
                    <p style="margin: 0; font-size: 18px; opacity: 0.9;">${subjectData.etapa || ''} - ${subjectData.curso || ''}</p>
                </div>

                <!-- Información básica -->
                <div class="form-section">
                    <h3 style="color: var(--primary-color); border-bottom: 2px solid var(--primary-color); padding-bottom: 8px; margin-bottom: 16px;">
                        <i data-lucide="info" style="width: 20px; height: 20px; margin-right: 8px;"></i>
                        Información General
                    </h3>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
                        <div style="background: var(--bg-secondary); padding: 20px; border-radius: 8px;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                                <input type="checkbox" id="justificacion-check" style="margin: 0; transform: scale(1.2);">
                                <h4 style="margin: 0; color: var(--primary-color); cursor: pointer;" onclick="document.getElementById('justificacion-check').click()">Justificación</h4>
                            </div>
                            <p style="margin: 0; line-height: 1.6;">${introduccion.justificacion || 'No disponible'}</p>
                        </div>

                        <div style="background: var(--bg-secondary); padding: 20px; border-radius: 8px;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                                <input type="checkbox" id="contribucion-check" style="margin: 0; transform: scale(1.2);">
                                <h4 style="margin: 0; color: var(--primary-color); cursor: pointer;" onclick="document.getElementById('contribucion-check').click()">Contribución al Desarrollo</h4>
                            </div>
                            <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
                                ${(introduccion.contribucion_desarrollo || []).map(item => `<li>${item}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- Ejes Competenciales -->
                ${ejesCompetenciales.length > 0 ? `
                <div class="form-section">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                        <input type="checkbox" id="ejes-competenciales-check" style="margin: 0; transform: scale(1.2);">
                        <h3 style="color: var(--primary-color); border-bottom: 2px solid var(--primary-color); padding-bottom: 8px; margin: 0; cursor: pointer;" onclick="document.getElementById('ejes-competenciales-check').click()">
                            <i data-lucide="target" style="width: 20px; height: 20px; margin-right: 8px;"></i>
                            Ejes Competenciales
                        </h3>
                    </div>
                    <div style="display: grid; gap: 16px;">
                        ${ejesCompetenciales.map((eje, index) => `
                            <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px; border-left: 4px solid var(--primary-color);">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                    <input type="checkbox" id="eje-${index}-check" style="margin: 0; transform: scale(1.1);">
                                    <h4 style="margin: 0; color: var(--text-primary); cursor: pointer;" onclick="document.getElementById('eje-${index}-check').click()">${eje.eje}</h4>
                                </div>
                                <p style="margin: 0; color: var(--text-secondary); font-style: italic;">Relacionado con: ${eje.competencia}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <!-- Orientaciones Pedagógicas -->
                ${orientaciones.principios || orientaciones.evaluacion ? `
                <div class="form-section">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                        <input type="checkbox" id="orientaciones-check" style="margin: 0; transform: scale(1.2);">
                        <h3 style="color: var(--primary-color); border-bottom: 2px solid var(--primary-color); padding-bottom: 8px; margin: 0; cursor: pointer;" onclick="document.getElementById('orientaciones-check').click()">
                            <i data-lucide="book-open" style="width: 20px; height: 20px; margin-right: 8px;"></i>
                            Orientaciones Pedagógicas
                        </h3>
                    </div>

                    ${orientaciones.principios ? `
                    <div style="margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                            <input type="checkbox" id="principios-check" style="margin: 0; transform: scale(1.1);">
                            <h4 style="margin: 0; color: var(--primary-color); cursor: pointer;" onclick="document.getElementById('principios-check').click()">Principios Metodológicos</h4>
                        </div>
                        <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
                            ${orientaciones.principios.map(principio => `<li>${principio}</li>`).join('')}
                        </ul>
                    </div>
                    ` : ''}

                    ${orientaciones.evaluacion ? `
                    <div>
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                            <input type="checkbox" id="evaluacion-check" style="margin: 0; transform: scale(1.1);">
                            <h4 style="margin: 0; color: var(--primary-color); cursor: pointer;" onclick="document.getElementById('evaluacion-check').click()">Evaluación</h4>
                        </div>
                        <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px;">
                            ${orientaciones.evaluacion.enfoque ? `<p style="margin: 0 0 12px 0;"><strong>Enfoque:</strong> ${orientaciones.evaluacion.enfoque}</p>` : ''}
                            ${orientaciones.evaluacion.instrumentos ? `
                            <div>
                                <strong>Instrumentos:</strong>
                                <ul style="margin: 8px 0 0 0; padding-left: 20px;">
                                    ${orientaciones.evaluacion.instrumentos.map(instrumento => `<li>${instrumento}</li>`).join('')}
                                </ul>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    ` : ''}
                </div>
                ` : ''}

                <!-- Situaciones de Aprendizaje -->
                ${situaciones.length > 0 ? `
                <div class="form-section">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                        <input type="checkbox" id="situaciones-check" style="margin: 0; transform: scale(1.2);">
                        <h3 style="color: var(--primary-color); border-bottom: 2px solid var(--primary-color); padding-bottom: 8px; margin: 0; cursor: pointer;" onclick="document.getElementById('situaciones-check').click()">
                            <i data-lucide="lightbulb" style="width: 20px; height: 20px; margin-right: 8px;"></i>
                            Situaciones de Aprendizaje
                        </h3>
                    </div>

                    <div style="overflow-x: auto;">
                        <table class="comp-table-modern" style="min-width: 100%;">
                            <thead>
                                <tr>
                                    <th style="width: 40px;"><input type="checkbox" id="situaciones-all-check" style="transform: scale(1.1);" onchange="toggleAllSituaciones(this)"></th>
                                    <th style="width: 60px;">Nº</th>
                                    <th style="width: 200px;">Título</th>
                                    <th style="width: 250px;">Reto</th>
                                    <th>Descripción</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${situaciones.map((situacion, index) => `
                                    <tr>
                                        <td style="text-align: center;"><input type="checkbox" id="situacion-${index}-check" class="situacion-check" style="transform: scale(1.1);"></td>
                                        <td style="text-align: center; font-weight: 600;">${situacion.numero || ''}</td>
                                        <td style="font-weight: 600; color: var(--primary-color);">${situacion.titulo || ''}</td>
                                        <td style="font-style: italic;">${situacion.reto || ''}</td>
                                        <td>${situacion.descripcion || ''}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        // Re-init Lucide icons
        if (window.lucide) {
            lucide.createIcons();
        }

        // Agregar función global para toggle de situaciones de aprendizaje
        window.toggleAllSituaciones = function (checkbox) {
            const situacionChecks = document.querySelectorAll('.situacion-check');
            situacionChecks.forEach(check => {
                check.checked = checkbox.checked;
            });
        };
    }

    /**
     * Renderiza las Competencias Específicas para Educación Secundaria
     * Idéntico al diseño del popup RA/CE
     * Incluye tabla principal con competencias, cada una con su propio bloque de criterios desplegable, y un sistema de selección que permite marcar competencias completas o criterios individuales, mostrando visualmente el estado de cada competencia (seleccionada, parcialmente seleccionada o no seleccionada) para facilitar la interacción del usuario al elegir las competencias específicas relevantes para su contexto educativo.
     * @param {array} competenciasEspecificas - Lista de competencias específicas a renderizar, cada una con su descripción y criterios asociados
     */
    renderSecondaryCompetenciasEspecificas(competenciasEspecificas) {
        console.log('Rendering Secondary Competencias Especificas with:', competenciasEspecificas);

        if (!competenciasEspecificas || !Array.isArray(competenciasEspecificas)) {
            this.elements.body.innerHTML = this.renderErrorMessage('Competencias Específicas', 'No se pudieron cargar las competencias específicas');
            return;
        }

        // Estado (persistente entre aperturas del modal) - Idéntico a RA/CE
        if (!this.selectedCompetenciasEspec) this.selectedCompetenciasEspec = new Set();              // Competencias completas (todos criterios)
        if (!this.selectedCompetenciasEspecCriterios) this.selectedCompetenciasEspecCriterios = new Map(); // comp_id -> Set(codigo_criterio)
        if (!this.expandedCompetenciasEspec) this.expandedCompetenciasEspec = new Set();              // Competencias desplegadas

        const rowAccent = '#ef4444'; // Color rojo idéntico a RA/CE

        const styles = `
<style>
    /* Tabla principal - Idéntica a RA/CE */
    .comp-espec-table-modern{
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
    }
    .comp-espec-table-modern thead th{
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-weight: 600;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 16px 20px;
        text-align: left;
        border-bottom: 2px solid var(--border-color);
        position: sticky;
        top: 0;
        z-index: 10;
    }
    .comp-espec-table-modern tbody td{
        padding: 16px 20px;
        vertical-align: top;
        border-bottom: 1px solid var(--border-color);
        font-size: 14px;
        line-height: 1.6;
        color: var(--text-secondary);
    }
    /* Fila Competencia - Idéntica a RA */
    .comp-espec-row{
        cursor: pointer;
        transition: all 0.2s ease;
        background: var(--bg-primary);
    }
    .comp-espec-row:nth-child(even){
        background: var(--bg-secondary);
    }
    .comp-espec-row:hover{
        background: color-mix(in srgb, var(--row-accent) 7%, var(--bg-primary));
    }
    .comp-espec-row.selected{
        background: color-mix(in srgb, var(--row-accent) 15%, var(--bg-primary));
        box-shadow: inset 4px 0 0 var(--row-accent);
    }
    .comp-espec-row.selected td{
        color: var(--text-primary);
    }
    .comp-espec-row.partial{
        background: color-mix(in srgb, var(--row-accent) 9%, var(--bg-primary));
        box-shadow: inset 4px 0 0 color-mix(in srgb, var(--row-accent) 65%, #ffffff);
    }
    .comp-espec-row.partial td{
        color: var(--text-primary);
    }
    /* Bloque criterios - Idéntico a RA/CE */
    .comp-espec-criterios-wrap{
        padding: 0;
        border-bottom: 1px solid var(--border-color);
        background: var(--bg-primary);
    }
    .comp-espec-criterios-wrap.collapsed{
        display: none;
    }
    .comp-espec-criterios{
        padding: 10px 12px 14px 12px;
        background: color-mix(in srgb, var(--row-accent) 4%, var(--bg-primary));
        border-top: 1px dashed var(--border-color);
    }
    .comp-espec-criterios-title{
        font-size: 12px;
        color: var(--text-secondary);
        margin: 2px 0 10px 0;
    }
    /* Mini-tabla criterios - Idéntica a RA/CE */
    .comp-espec-criterios-table{
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border-radius: 10px;
        overflow: hidden;
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
    }
    .comp-espec-criterios-table tr{
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .comp-espec-criterios-table tr:nth-child(even){
        background: var(--bg-secondary);
    }
    .comp-espec-criterios-table tr:hover{
        background: color-mix(in srgb, var(--row-accent) 7%, var(--bg-primary));
    }
    .comp-espec-criterios-table td{
        padding: 12px 12px;
        border-bottom: 1px solid var(--border-color);
        font-size: 13px;
        color: var(--text-secondary);
        vertical-align: top;
    }
    .comp-espec-criterios-table tr:last-child td{
        border-bottom: none;
    }
    .comp-espec-criterio-row.selected{
        background: color-mix(in srgb, var(--row-accent) 15%, var(--bg-primary));
    }
    .comp-espec-criterio-row.selected td{
        color: var(--text-primary);
    }
    /* Checkbox - Idéntico a RA/CE */
    .comp-espec-check{
        width: 22px;
        height: 22px;
        border: 2px solid var(--border-color);
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        background: var(--bg-primary);
        margin: 0 auto;
        position: relative;
    }
    .comp-espec-row.selected .comp-espec-check,
    .comp-espec-criterio-row.selected .comp-espec-check{
        background: var(--row-accent);
        border-color: var(--row-accent);
    }
    .comp-espec-row.partial .comp-espec-check{
        background: color-mix(in srgb, var(--row-accent) 35%, var(--bg-primary));
        border-color: color-mix(in srgb, var(--row-accent) 65%, var(--border-color));
    }
    .comp-espec-check svg{
        width: 14px;
        height: 14px;
        color: white;
        opacity: 0;
        transform: scale(0.5);
        transition: all 0.2s ease;
    }
    .comp-espec-row.selected .comp-espec-check svg,
    .comp-espec-criterio-row.selected .comp-espec-check svg{
        opacity: 1;
        transform: scale(1);
    }
    .comp-espec-check .indeterminate{
        width: 12px;
        height: 3px;
        border-radius: 2px;
        background: white;
        opacity: 0;
        transform: scaleX(0.6);
        transition: all 0.2s ease;
        position: absolute;
    }
    .comp-espec-row.partial .comp-espec-check .indeterminate{
        opacity: 1;
        transform: scaleX(1);
    }
    /* Toolbar - Idéntico a RA/CE */
    .comp-espec-toolbar{
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
        padding: 12px 14px;
        border: 1px solid var(--border-color);
        border-radius: 12px;
        background: var(--bg-secondary);
    }
    .comp-espec-clear{
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
        color: var(--text-primary);
        padding: 8px 12px;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .comp-espec-clear:hover{
        background: var(--bg-tertiary);
    }
    /* Chip - Idéntico a RA/CE */
    .comp-espec-chip{
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 700;
        color: var(--text-primary);
    }
    .comp-espec-dot{
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--row-accent);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--row-accent) 18%, transparent);
    }
    /* Toggle - Idéntico a RA/CE */
    .comp-espec-criterio-toggle{
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
    }
    .comp-espec-toggle-btn{
        width: 34px;
        height: 34px;
        border-radius: 10px;
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        flex: 0 0 auto;
    }
    .comp-espec-toggle-btn:hover{
        background: color-mix(in srgb, var(--row-accent) 10%, var(--bg-primary));
        border-color: color-mix(in srgb, var(--row-accent) 30%, var(--border-color));
    }
    .comp-espec-toggle-btn i{
        width: 18px;
        height: 18px;
        color: var(--text-primary);
        transition: transform 0.2s ease;
    }
    .comp-espec-toggle-btn[aria-expanded="true"] i{
        transform: rotate(180deg);
    }
</style>
        `;

        // Contar totales
        let totalCriterios = 0;
        competenciasEspecificas.forEach(comp => {
            if (comp.criterios_evaluacion && Array.isArray(comp.criterios_evaluacion)) {
                totalCriterios += comp.criterios_evaluacion.length;
            }
        });

        const countSelected = () => {
            let criteriosCount = 0;
            for (const set of this.selectedCompetenciasEspecCriterios.values()) {
                criteriosCount += set.size;
            }
            return { competencias: this.selectedCompetenciasEspec.size, criterios: criteriosCount };
        };

        const { competencias, criterios } = countSelected();

        let html = styles + `
<div class="comp-espec-toolbar" style="--row-accent:${rowAccent}">
    <div>
        <div class="comp-espec-chip" style="--row-accent:${rowAccent}">
            <span class="comp-espec-dot"></span>
            Competencias Específicas
        </div>
        <div style="margin-top:6px;">
            <strong>Seleccionados:</strong>
            <span id="competenciasEspecSelectionCount">${competencias}</span> competencias ·
            <span id="competenciasEspecCriteriosSelectionCount">${criterios}</span> criterios
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:6px;">
            Clic en competencia = selecciona todos sus criterios. Clic en criterio = selección individual. Botón ▾ = desplegar.
        </div>
    </div>
    <button type="button" id="competenciasEspecClearSelection" class="comp-espec-clear">Limpiar</button>
</div>
<div data-scroll-container="true" style="overflow:auto; border-radius:12px;">
    <table class="comp-espec-table-modern">
        <thead>
            <tr>
                <th style="width:60px; text-align:center;">✓</th>
                <th style="width:30%;">Competencia Específica</th>
                <th style="width:40%;">Descripción</th>
                <th>Criterios</th>
            </tr>
        </thead>
        <tbody>
        `;

        competenciasEspecificas.forEach((competencia, index) => {
            const compId = competencia.id || `comp_${index}`;
            const criterios = competencia.criterios_evaluacion || [];

            const selectedSet = this.selectedCompetenciasEspecCriterios.get(compId) || new Set();
            const total = criterios.length;
            const selected = selectedSet.size;
            const isAll = total > 0 && selected === total;
            const isPartial = selected > 0 && selected < total;
            const rowClass = isAll ? 'selected' : (isPartial ? 'partial' : '');
            const expanded = this.expandedCompetenciasEspec.has(compId);
            const ariaExpanded = expanded ? 'true' : 'false';

            html += `
            <tr class="comp-espec-row ${rowClass}" data-competencia="${compId}" style="--row-accent:${rowAccent}">
                <td style="text-align:center;">
                    <div class="comp-espec-check">
                        <span class="indeterminate"></span>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                             stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                </td>
                <td>
                    <div class="comp-espec-chip">
                        <span class="comp-espec-dot" style="--row-accent:${rowAccent}"></span>
                        ${compId}
                    </div>
                </td>
                <td>${competencia.titulo}</td>
                <td style="white-space:nowrap;">
                    <div class="comp-espec-criterio-toggle">
                        <span><strong>${criterios.length}</strong> criterio(s)</span>
                        ${criterios.length > 0 ? `
                        <button type="button"
                                class="comp-espec-toggle-btn"
                                data-toggle="competencias"
                                data-competencia="${compId}"
                                aria-expanded="${ariaExpanded}"
                                aria-label="Desplegar criterios de ${compId}">
                            <i data-lucide="chevron-down"></i>
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
            `;

            // Fila expandible con criterios (solo si hay criterios)
            if (criterios.length > 0) {
                const wrapClass = expanded ? '' : 'collapsed';
                html += `
                <tr class="comp-espec-criterios-wrap ${wrapClass}" data-competencia="${compId}">
                    <td colspan="4">
                        <div class="comp-espec-criterios">
                            <div class="comp-espec-criterios-title">Criterios de Evaluación de ${compId}</div>
                            <table class="comp-espec-criterios-table">
                            `;

                criterios.forEach(criterio => {
                    const criterioKey = compId + '_' + criterio.codigo;
                    const selectedSet = this.selectedCompetenciasEspecCriterios.get(compId) || new Set();
                    const isSelected = selectedSet.has(criterioKey);
                    const criterioRowClass = isSelected ? 'selected' : '';

                    html += `
                                <tr class="comp-espec-criterio-row ${criterioRowClass}" data-competencia="${compId}" data-criterio="${criterio.codigo}" style="--row-accent:${rowAccent}">
                                    <td style="width:60px; text-align:center;">
                                        <div class="comp-espec-check">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                                                 stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                        </div>
                                    </td>
                                    <td style="width:100px; font-weight:600; color:var(--text-primary);">${criterio.codigo}</td>
                                    <td>${criterio.criterio}</td>
                                </tr>
                                `;
                });

                html += `
                            </table>
                        </div>
                    </td>
                </tr>
                `;
            }
        });

        html += `
        </tbody>
    </table>
</div>`;

        this.elements.body.innerHTML = html;

        // Event listeners idénticos a RA/CE
        this.setupCompetenciasEspecificasEventListeners();

        // Re-init Lucide icons
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    /**
     * Configura los event listeners para el popup de Competencias Específicas
     * Idéntico al comportamiento del popup RA/CE
     * Utiliza event delegation para manejar clicks en filas de competencias, criterios individuales y el botón de limpiar selección, 
     * actualizando el estado de selección y expansión de manera eficiente sin necesidad de agregar múltiples event listeners a cada elemento individual, 
     * lo que mejora el rendimiento y la mantenibilidad del código al interactuar con la tabla de competencias específicas.
     */
    setupCompetenciasEspecificasEventListeners() {
        // Limpiar event listeners anteriores si existen
        if (this.competenciasEspecClickHandler) {
            this.elements.body.removeEventListener('click', this.competenciasEspecClickHandler);
        }

        // Event listener unificado usando event delegation
        this.competenciasEspecClickHandler = (e) => {
            // Toggle de expansión/colapso
            if (e.target.closest('.comp-espec-toggle-btn')) {
                const button = e.target.closest('.comp-espec-toggle-btn');
                const competenciaId = button.getAttribute('data-competencia');

                if (this.expandedCompetenciasEspec.has(competenciaId)) {
                    this.expandedCompetenciasEspec.delete(competenciaId);
                } else {
                    this.expandedCompetenciasEspec.add(competenciaId);
                }

                // Re-render para actualizar estado de expansión
                if (window.modalComponent && window.modalComponent.secondarySubjectData) {
                    this.renderSecondaryCompetenciasEspecificas(window.modalComponent.secondarySubjectData.competencias_especificas);
                }
                return;
            }

            // Filas de competencias principales
            const row = e.target.closest('.comp-espec-row');
            if (row && !e.target.closest('.comp-espec-toggle-btn')) {
                const competenciaId = row.getAttribute('data-competencia');

                if (this.selectedCompetenciasEspec.has(competenciaId)) {
                    // Deseleccionar competencia y todos sus criterios
                    this.selectedCompetenciasEspec.delete(competenciaId);
                    this.selectedCompetenciasEspecCriterios.delete(competenciaId);
                } else {
                    // Seleccionar competencia y todos sus criterios
                    this.selectedCompetenciasEspec.add(competenciaId);

                    // Buscar todos los criterios de esta competencia
                    if (window.modalComponent && window.modalComponent.secondarySubjectData) {
                        const competencia = window.modalComponent.secondarySubjectData.competencias_especificas.find(c => c.id === competenciaId);
                        if (competencia && competencia.criterios_evaluacion) {
                            const criteriosSet = new Set();
                            competencia.criterios_evaluacion.forEach(criterio => {
                                const criterioKey = competenciaId + '_' + criterio.codigo;
                                criteriosSet.add(criterioKey);
                            });
                            this.selectedCompetenciasEspecCriterios.set(competenciaId, criteriosSet);
                        }
                    }
                }

                this.updateCompetenciasEspecificasSelectionUI();
                return;
            }

            // Filas de criterios individuales
            const criterioRow = e.target.closest('.comp-espec-criterio-row');
            if (criterioRow) {
                const competenciaId = criterioRow.getAttribute('data-competencia');
                const criterioCode = criterioRow.getAttribute('data-criterio');
                const criterioKey = competenciaId + '_' + criterioCode;

                let selectedSet = this.selectedCompetenciasEspecCriterios.get(competenciaId) || new Set();

                if (selectedSet.has(criterioKey)) {
                    selectedSet.delete(criterioKey);
                } else {
                    selectedSet.add(criterioKey);
                }

                if (selectedSet.size === 0) {
                    this.selectedCompetenciasEspecCriterios.delete(competenciaId);
                    this.selectedCompetenciasEspec.delete(competenciaId);
                } else {
                    this.selectedCompetenciasEspecCriterios.set(competenciaId, selectedSet);

                    // Verificar si todos los criterios están seleccionados para marcar la competencia como completa
                    if (window.modalComponent && window.modalComponent.secondarySubjectData) {
                        const competencia = window.modalComponent.secondarySubjectData.competencias_especificas.find(c => c.id === competenciaId);
                        if (competencia && competencia.criterios_evaluacion) {
                            const totalCriterios = competencia.criterios_evaluacion.length;
                            if (selectedSet.size === totalCriterios) {
                                this.selectedCompetenciasEspec.add(competenciaId);
                            } else {
                                this.selectedCompetenciasEspec.delete(competenciaId);
                            }
                        }
                    }
                }

                this.updateCompetenciasEspecificasSelectionUI();
                return;
            }

            // Botón de limpiar selección
            if (e.target.id === 'competenciasEspecClearSelection') {
                this.selectedCompetenciasEspec.clear();
                this.selectedCompetenciasEspecCriterios.clear();
                this.updateCompetenciasEspecificasSelectionUI();
                return;
            }
        };

        // Agregar el event listener al modal body
        this.elements.body.addEventListener('click', this.competenciasEspecClickHandler);
    }

    /**
     * Actualiza la UI de selección para Competencias Específicas
     * Idéntico al comportamiento del popup
     */
    updateCompetenciasEspecificasSelectionUI() {
        // Actualizar contadores
        let totalCriterios = 0;
        for (const set of this.selectedCompetenciasEspecCriterios.values()) {
            totalCriterios += set.size;
        }

        const competenciasCountElement = document.getElementById('competenciasEspecSelectionCount');
        if (competenciasCountElement) {
            competenciasCountElement.textContent = this.selectedCompetenciasEspec.size;
        }

        const criteriosCountElement = document.getElementById('competenciasEspecCriteriosSelectionCount');
        if (criteriosCountElement) {
            criteriosCountElement.textContent = totalCriterios;
        }

        // Actualizar estado visual de las filas de competencias
        document.querySelectorAll('.comp-espec-row').forEach(row => {
            const competenciaId = row.getAttribute('data-competencia');
            const selectedSet = this.selectedCompetenciasEspecCriterios.get(competenciaId) || new Set();

            // Contar total de criterios en esta competencia
            let totalCriteriosComp = 0;
            if (window.modalComponent && window.modalComponent.secondarySubjectData) {
                const competencia = window.modalComponent.secondarySubjectData.competencias_especificas.find(c => c.id === competenciaId);
                if (competencia && competencia.criterios_evaluacion) {
                    totalCriteriosComp = competencia.criterios_evaluacion.length;
                }
            }

            const selectedCount = selectedSet.size;
            const isAll = totalCriteriosComp > 0 && selectedCount === totalCriteriosComp;
            const isPartial = selectedCount > 0 && selectedCount < totalCriteriosComp;

            row.classList.remove('selected', 'partial');
            if (isAll) {
                row.classList.add('selected');
            } else if (isPartial) {
                row.classList.add('partial');
            }
        });

        // Actualizar estado visual de las filas de criterios
        document.querySelectorAll('.comp-espec-criterio-row').forEach(row => {
            const competenciaId = row.getAttribute('data-competencia');
            const criterioCode = row.getAttribute('data-criterio');
            const criterioKey = competenciaId + '_' + criterioCode;
            const selectedSet = this.selectedCompetenciasEspecCriterios.get(competenciaId) || new Set();

            if (selectedSet.has(criterioKey)) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
        });
    }

    /**
     * Renderiza los Saberes Básicos para Educación Secundaria
     * Idéntico al diseño del popup de Contenidos
     * Incluye tabla principal con bloques de saberes, cada uno con su propio bloque de saberes desplegable, y un sistema de selección que permite marcar bloques completos o saberes individuales, mostrando visualmente el estado de cada bloque (seleccionado, parcialmente seleccionado o no seleccionado) para facilitar la interacción del usuario al elegir los saberes básicos relevantes para su contexto educativo.
     * @param {object} saberesBasicos - Objeto con bloques de saberes básicos a renderizar, cada bloque con su nombre y lista de saberes asociados      
     */
    renderSecondarySaberesBasicos(saberesBasicos) {
        console.log('Rendering Secondary Saberes Basicos with:', saberesBasicos);

        if (!saberesBasicos) {
            this.elements.body.innerHTML = this.renderErrorMessage('Saberes Básicos', 'No se pudieron cargar los saberes básicos');
            return;
        }

        // Extraer bloques de saberes
        const bloques = [];
        Object.keys(saberesBasicos).forEach(key => {
            if (key.startsWith('bloque_')) {
                const bloque = saberesBasicos[key];
                bloques.push({
                    id: key,
                    nombre: bloque.nombre || key,
                    saberes: bloque.saberes || []
                });
            }
        });

        // Estado (persistente entre aperturas del modal)
        if (!this.selectedSaberesBasicos) this.selectedSaberesBasicos = new Set();              // Bloques completos (todos saberes)
        if (!this.selectedSaberesBasicosPuntos) this.selectedSaberesBasicosPuntos = new Map(); // id_bloque -> Set(id_saber)
        if (!this.expandedSaberesBasicos) this.expandedSaberesBasicos = new Set();              // Bloques desplegados

        const rowAccent = '#06b6d4'; // Color cian idéntico a Contenidos

        const styles = `
<style>
    /* Tabla principal */
    .saberes-table-modern{
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
    }
    .saberes-table-modern thead th{
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-weight: 600;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 16px 20px;
        text-align: left;
        border-bottom: 2px solid var(--border-color);
        position: sticky;
        top: 0;
        z-index: 10;
    }
    .saberes-table-modern tbody td{
        padding: 16px 20px;
        vertical-align: top;
        border-bottom: 1px solid var(--border-color);
        font-size: 14px;
        line-height: 1.6;
        color: var(--text-secondary);
    }
    /* Fila Bloque */
    .saberes-row{
        cursor: pointer;
        transition: all 0.2s ease;
        background: var(--bg-primary);
    }
    .saberes-row:nth-child(even){
        background: var(--bg-secondary);
    }
    .saberes-row:hover{
        background: color-mix(in srgb, var(--row-accent) 7%, var(--bg-primary));
    }
    .saberes-row.selected{
        background: color-mix(in srgb, var(--row-accent) 15%, var(--bg-primary));
        box-shadow: inset 4px 0 0 var(--row-accent);
    }
    .saberes-row.selected td{
        color: var(--text-primary);
    }
    .saberes-row.partial{
        background: color-mix(in srgb, var(--row-accent) 9%, var(--bg-primary));
        box-shadow: inset 4px 0 0 color-mix(in srgb, var(--row-accent) 65%, #ffffff);
    }
    .saberes-row.partial td{
        color: var(--text-primary);
    }
    /* Bloque saberes */
    .saberes-saberes-wrap{
        padding: 0;
        border-bottom: 1px solid var(--border-color);
        background: var(--bg-primary);
    }
    .saberes-saberes-wrap.collapsed{
        display: none;
    }
    .saberes-saberes{
        padding: 10px 12px 14px 12px;
        background: color-mix(in srgb, var(--row-accent) 4%, var(--bg-primary));
        border-top: 1px dashed var(--border-color);
    }
    .saberes-saberes-title{
        font-size: 12px;
        color: var(--text-secondary);
        margin: 2px 0 10px 0;
    }
    /* Mini-tabla saberes */
    .saberes-saberes-table{
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border-radius: 10px;
        overflow: hidden;
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
    }
    .saberes-saberes-table tr{
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .saberes-saberes-table tr:nth-child(even){
        background: var(--bg-secondary);
    }
    .saberes-saberes-table tr:hover{
        background: color-mix(in srgb, var(--row-accent) 7%, var(--bg-primary));
    }
    .saberes-saberes-table td{
        padding: 12px 12px;
        border-bottom: 1px solid var(--border-color);
        font-size: 13px;
        color: var(--text-secondary);
        vertical-align: top;
    }
    .saberes-saberes-table tr:last-child td{
        border-bottom: none;
    }
    .saberes-saber-row.selected{
        background: color-mix(in srgb, var(--row-accent) 15%, var(--bg-primary));
    }
    .saberes-saber-row.selected td{
        color: var(--text-primary);
    }
    /* Checkbox */
    .saberes-check{
        width: 22px;
        height: 22px;
        border: 2px solid var(--border-color);
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        background: var(--bg-primary);
        margin: 0 auto;
        position: relative;
    }
    .saberes-row.selected .saberes-check,
    .saberes-saber-row.selected .saberes-check{
        background: var(--row-accent);
        border-color: var(--row-accent);
    }
    .saberes-row.partial .saberes-check{
        background: color-mix(in srgb, var(--row-accent) 35%, var(--bg-primary));
        border-color: color-mix(in srgb, var(--row-accent) 65%, var(--border-color));
    }
    .saberes-check svg{
        width: 14px;
        height: 14px;
        color: white;
        opacity: 0;
        transform: scale(0.5);
        transition: all 0.2s ease;
    }
    .saberes-row.selected .saberes-check svg,
    .saberes-saber-row.selected .saberes-check svg{
        opacity: 1;
        transform: scale(1);
    }
    .saberes-check .indeterminate{
        width: 12px;
        height: 3px;
        border-radius: 2px;
        background: white;
        opacity: 0;
        transform: scaleX(0.6);
        transition: all 0.2s ease;
        position: absolute;
    }
    .saberes-row.partial .saberes-check .indeterminate{
        opacity: 1;
        transform: scaleX(1);
    }
    /* Toolbar */
    .saberes-toolbar{
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
        padding: 12px 14px;
        border: 1px solid var(--border-color);
        border-radius: 12px;
        background: var(--bg-secondary);
    }
    .saberes-clear{
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
        color: var(--text-primary);
        padding: 8px 12px;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .saberes-clear:hover{
        background: var(--bg-tertiary);
    }
    /* Chip */
    .saberes-chip{
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 700;
        color: var(--text-primary);
    }
    .saberes-dot{
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--row-accent);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--row-accent) 18%, transparent);
    }
    /* Toggle */
    .saberes-saber-toggle{
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
    }
    .saberes-toggle-btn{
        width: 34px;
        height: 34px;
        border-radius: 10px;
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        flex: 0 0 auto;
    }
    .saberes-toggle-btn:hover{
        background: color-mix(in srgb, var(--row-accent) 10%, var(--bg-primary));
        border-color: color-mix(in srgb, var(--row-accent) 30%, var(--border-color));
    }
    .saberes-toggle-btn i{
        width: 18px;
        height: 18px;
        color: var(--text-primary);
        transition: transform 0.2s ease;
    }
    .saberes-toggle-btn[aria-expanded="true"] i{
        transform: rotate(180deg);
    }
</style>
        `;

        // Contar totales
        let totalSaberes = 0;
        bloques.forEach(bloque => {
            if (bloque.saberes && Array.isArray(bloque.saberes)) {
                totalSaberes += bloque.saberes.length;
            }
        });

        const countSelected = () => {
            let saberesCount = 0;
            for (const set of this.selectedSaberesBasicosPuntos.values()) {
                saberesCount += set.size;
            }
            return { bloques: this.selectedSaberesBasicos.size, saberes: saberesCount };
        };

        const { bloques: bloquesSelected, saberes: saberesSelected } = countSelected();

        let html = styles + `
<div class="saberes-toolbar" style="--row-accent:${rowAccent}">
    <div>
        <div class="saberes-chip" style="--row-accent:${rowAccent}">
            <span class="saberes-dot"></span>
            Bloques de Saberes Básicos
        </div>
        <div style="margin-top:6px;">
            <strong>Seleccionados:</strong>
            <span id="saberesBasicosSelectionCount">${bloquesSelected}</span> bloques ·
            <span id="saberesBasicosSaberesSelectionCount">${saberesSelected}</span> saberes
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:6px;">
            Clic en bloque = selecciona todos sus saberes. Clic en saber = selección individual. Botón ▾ = desplegar.
        </div>
    </div>
    <button type="button" id="saberesBasicosClearSelection" class="saberes-clear">Limpiar</button>
</div>
<div data-scroll-container="true" style="overflow:auto; border-radius:12px;">
    <table class="saberes-table-modern">
        <thead>
            <tr>
                <th style="width:60px; text-align:center;">✓</th>
                <th style="width:30%;">Bloque</th>
                <th style="width:40%;">Descripción</th>
                <th>Saberes</th>
            </tr>
        </thead>
        <tbody id="saberesBasicosTableBody">
        `;

        bloques.forEach((bloque, index) => {
            const idBloque = bloque.id;
            const nombreBloque = bloque.nombre;
            const saberes = bloque.saberes || [];

            const selectedSet = this.selectedSaberesBasicosPuntos.get(idBloque) || new Set();
            const total = saberes.length;
            const selected = selectedSet.size;
            const isAll = total > 0 && selected === total;
            const isPartial = selected > 0 && selected < total;
            const rowClass = isAll ? 'selected' : (isPartial ? 'partial' : '');
            const expanded = this.expandedSaberesBasicos.has(idBloque);
            const ariaExpanded = expanded ? 'true' : 'false';

            html += `
            <tr class="saberes-row ${rowClass}" data-bloque="${idBloque}" style="--row-accent:${rowAccent}">
                <td style="text-align:center;">
                    <div class="saberes-check">
                        <span class="indeterminate"></span>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                             stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                </td>
                <td>
                    <div class="saberes-chip">
                        <span class="saberes-dot" style="--row-accent:${rowAccent}"></span>
                        ${idBloque}
                    </div>
                </td>
                <td>${nombreBloque}</td>
                <td style="white-space:nowrap;">
                    <div class="saberes-saber-toggle">
                        <span><strong>${saberes.length}</strong> saber(es)</span>
                        ${saberes.length > 0 ? `
                        <button type="button"
                                class="saberes-toggle-btn"
                                data-toggle="saberes"
                                data-bloque="${idBloque}"
                                aria-expanded="${ariaExpanded}"
                                aria-label="Desplegar saberes del ${idBloque}">
                            <i data-lucide="chevron-down"></i>
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
            `;

            // Fila expandible con saberes (solo si hay saberes)
            if (saberes.length > 0) {
                const wrapClass = expanded ? '' : 'collapsed';
                html += `
                <tr class="saberes-saberes-wrap ${wrapClass}" data-bloque="${idBloque}">
                    <td colspan="4">
                        <div class="saberes-saberes">
                            <div class="saberes-saberes-title">Saberes del ${idBloque}</div>
                            <table class="saberes-saberes-table">
                            `;

                saberes.forEach(saber => {
                    const idSaber = saber.codigo || 'Sin código';
                    const tituloSaber = saber.titulo || 'Sin título';
                    const isSelected = selectedSet.has(idSaber);
                    const saberRowClass = isSelected ? 'selected' : '';

                    html += `
                                <tr class="saberes-saber-row ${saberRowClass}" data-bloque="${idBloque}" data-saber="${idSaber}" style="--row-accent:${rowAccent}">
                                    <td style="width:60px; text-align:center;">
                                        <div class="saberes-check">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                                                 stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                        </div>
                                    </td>
                                    <td style="width:100px; font-weight:600; color:var(--text-primary);">${idSaber}</td>
                                    <td>
                                        <div style="font-weight:600; margin-bottom:4px;">${tituloSaber}</div>
                                        ${saber.contenidos && saber.contenidos.length > 0 ? `
                                            <ul style="margin:0; padding-left:16px; font-size:12px; color:var(--text-secondary);">
                                                ${saber.contenidos.map(contenido => `<li style="margin-bottom:2px;">${contenido}</li>`).join('')}
                                            </ul>
                                        ` : ''}
                                    </td>
                                </tr>
                                `;
                });

                html += `
                            </table>
                        </div>
                    </td>
                </tr>
                `;
            }
        });

        html += `
        </tbody>
    </table>
</div>`;

        this.elements.body.innerHTML = html;

        // Event listeners idénticos a Contenidos
        this.setupSaberesBasicosEventListeners();

        // Re-init Lucide icons
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    /**
     * Configura los event listeners para el popup de Saberes Básicos
     * Idéntico al comportamiento del popup Contenidos
     * Utiliza event delegation para manejar clicks en filas de bloques de saberes, saberes individuales y el botón de limpiar selección,
     * actualizando el estado de selección y expansión de manera eficiente sin necesidad de agregar múltiples event listeners a cada elemento individual,
     * lo que mejora el rendimiento y la mantenibilidad del código al interactuar con la tabla de saberes básicos, permitiendo a los usuarios seleccionar bloques completos de saberes o saberes individuales dentro de cada bloque, y reflejando visualmente el estado de cada bloque (seleccionado, parcialmente seleccionado o no seleccionado) para facilitar la experiencia de selección en el contexto educativo.
     */
    setupSaberesBasicosEventListeners() {
        // Limpiar event listeners anteriores si existen
        if (this.saberesBasicosClickHandler) {
            this.elements.body.removeEventListener('click', this.saberesBasicosClickHandler);
        }

        // Event listener unificado usando event delegation
        this.saberesBasicosClickHandler = (e) => {
            // Toggle de expansión/colapso
            if (e.target.closest('.saberes-toggle-btn')) {
                const button = e.target.closest('.saberes-toggle-btn');
                const bloqueId = button.getAttribute('data-bloque');

                if (this.expandedSaberesBasicos.has(bloqueId)) {
                    this.expandedSaberesBasicos.delete(bloqueId);
                } else {
                    this.expandedSaberesBasicos.add(bloqueId);
                }

                // Re-render para actualizar estado de expansión
                if (window.modalComponent && window.modalComponent.secondarySubjectData) {
                    this.renderSecondarySaberesBasicos(window.modalComponent.secondarySubjectData.saberes_basicos);
                }
                return;
            }

            // Filas de bloques principales
            const row = e.target.closest('.saberes-row');
            if (row && !e.target.closest('.saberes-toggle-btn')) {
                const bloqueId = row.getAttribute('data-bloque');

                if (this.selectedSaberesBasicos.has(bloqueId)) {
                    // Deseleccionar bloque y todos sus saberes
                    this.selectedSaberesBasicos.delete(bloqueId);
                    this.selectedSaberesBasicosPuntos.delete(bloqueId);
                } else {
                    // Seleccionar bloque y todos sus saberes
                    this.selectedSaberesBasicos.add(bloqueId);

                    // Buscar todos los saberes de este bloque
                    if (window.modalComponent && window.modalComponent.secondarySubjectData) {
                        const bloque = Object.entries(window.modalComponent.secondarySubjectData.saberes_basicos)
                            .find(([key, value]) => key === bloqueId)?.[1];

                        if (bloque && bloque.saberes) {
                            const saberesSet = new Set();
                            bloque.saberes.forEach(saber => {
                                saberesSet.add(saber.codigo || 'Sin código');
                            });
                            this.selectedSaberesBasicosPuntos.set(bloqueId, saberesSet);
                        }
                    }
                }

                this.updateSaberesBasicosSelectionUI();
                return;
            }

            // Filas de saberes individuales
            const saberRow = e.target.closest('.saberes-saber-row');
            if (saberRow) {
                const bloqueId = saberRow.getAttribute('data-bloque');
                const saberId = saberRow.getAttribute('data-saber');

                let selectedSet = this.selectedSaberesBasicosPuntos.get(bloqueId) || new Set();

                if (selectedSet.has(saberId)) {
                    selectedSet.delete(saberId);
                } else {
                    selectedSet.add(saberId);
                }

                if (selectedSet.size === 0) {
                    this.selectedSaberesBasicosPuntos.delete(bloqueId);
                    this.selectedSaberesBasicos.delete(bloqueId);
                } else {
                    this.selectedSaberesBasicosPuntos.set(bloqueId, selectedSet);

                    // Verificar si todos los saberes están seleccionados para marcar el bloque como completo
                    if (window.modalComponent && window.modalComponent.secondarySubjectData) {
                        const bloque = Object.entries(window.modalComponent.secondarySubjectData.saberes_basicos)
                            .find(([key, value]) => key === bloqueId)?.[1];

                        if (bloque && bloque.saberes) {
                            const totalSaberes = bloque.saberes.length;
                            if (selectedSet.size === totalSaberes) {
                                this.selectedSaberesBasicos.add(bloqueId);
                            } else {
                                this.selectedSaberesBasicos.delete(bloqueId);
                            }
                        }
                    }
                }

                this.updateSaberesBasicosSelectionUI();
                return;
            }

            // Botón de limpiar selección
            if (e.target.id === 'saberesBasicosClearSelection') {
                this.selectedSaberesBasicos.clear();
                this.selectedSaberesBasicosPuntos.clear();
                this.updateSaberesBasicosSelectionUI();
                return;
            }
        };

        // Agregar el event listener al modal body
        this.elements.body.addEventListener('click', this.saberesBasicosClickHandler);
    }

    /**
     * Actualiza la UI de selección para Saberes Básicos
     * Idéntico al comportamiento del popup de Contenidos
     * Actualiza los contadores de bloques y saberes seleccionados, y el estado visual de las filas de bloques y saberes para reflejar si están completamente seleccionados, parcialmente seleccionados o no seleccionados, proporcionando una experiencia de usuario clara e intuitiva al interactuar con la selección de saberes básicos en el contexto educativo.
     */
    updateSaberesBasicosSelectionUI() {
        // Actualizar contadores
        let totalSaberes = 0;
        for (const set of this.selectedSaberesBasicosPuntos.values()) {
            totalSaberes += set.size;
        }

        // Actualizar contadores en la toolbar
        const bloquesCountElement = document.getElementById('saberesBasicosSelectionCount');
        if (bloquesCountElement) {
            bloquesCountElement.textContent = this.selectedSaberesBasicos.size;
        }
        
        // Actualizar contador de saberes seleccionados
        const saberesCountElement = document.getElementById('saberesBasicosSaberesSelectionCount');
        if (saberesCountElement) {
            saberesCountElement.textContent = totalSaberes;
        }

        // Actualizar estado visual de las filas de bloques
        document.querySelectorAll('.saberes-row').forEach(row => {
            const bloqueId = row.getAttribute('data-bloque');
            const selectedSet = this.selectedSaberesBasicosPuntos.get(bloqueId) || new Set();

            // Contar total de saberes en este bloque
            let totalSaberesBloque = 0;
            if (window.modalComponent && window.modalComponent.secondarySubjectData) {
                const bloque = Object.entries(window.modalComponent.secondarySubjectData.saberes_basicos)
                    .find(([key, value]) => key === bloqueId)?.[1];
                if (bloque && bloque.saberes) {
                    totalSaberesBloque = bloque.saberes.length;
                }
            }

            const selectedCount = selectedSet.size;
            const isAll = totalSaberesBloque > 0 && selectedCount === totalSaberesBloque;
            const isPartial = selectedCount > 0 && selectedCount < totalSaberesBloque;

            row.classList.remove('selected', 'partial');
            if (isAll) {
                row.classList.add('selected');
            } else if (isPartial) {
                row.classList.add('partial');
            }
        });

        // Actualizar estado visual de las filas de saberes
        document.querySelectorAll('.saberes-saber-row').forEach(row => {
            const bloqueId = row.getAttribute('data-bloque');
            const saberId = row.getAttribute('data-saber');
            const selectedSet = this.selectedSaberesBasicosPuntos.get(bloqueId) || new Set();

            if (selectedSet.has(saberId)) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
        });
    }

    /**
     * 1.1. Renderiza Orientación FP - seccion_orientaciones del módulo
     * Estilo como Objetivos de Etapa - texto con check seleccionado por defecto
     * @param {string} seccionOrientaciones - Texto descriptivo de la sección de orientaciones profesionales a renderizar en el modal de FP, mostrando un diseño similar al de los objetivos de etapa con un check seleccionado por defecto para indicar que la orientación está incluida, proporcionando una presentación clara y visualmente atractiva de la información relevante para los usuarios interesados en la formación profesional.
     */
    renderFPOrientacion(seccionOrientaciones) {
        console.log('Rendering FP Orientacion with:', seccionOrientaciones);

        if (!seccionOrientaciones) {
            this.elements.body.innerHTML = this.renderErrorMessage(
                'Orientación',
                'No hay información de orientaciones disponible para este módulo'
            );
            return;
        }

        // Usar el mismo estilo que Objetivos de Etapa
        const rowAccent = '#3b82f6'; // Color azul para FP

        const styles = `
<style>
    .obj-table-modern{
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
    }
    .obj-table-modern thead th{
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-weight: 600;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 16px 20px;
        text-align: left;
        border-bottom: 2px solid var(--border-color);
    }
    .obj-table-modern tbody tr{
        border-bottom: 1px solid var(--border-color);
    }
    .obj-table-modern td{
        padding: 16px 20px;
        color: var(--text-secondary);
        font-size: 14px;
        line-height: 1.5;
    }
    .obj-row{
        transition: all 0.15s ease;
        cursor: pointer;
    }
    .obj-row:hover{
        background: color-mix(in srgb, var(--row-accent) 7%, var(--bg-primary));
    }
    .obj-row.selected{
        background: color-mix(in srgb, var(--row-accent) 15%, var(--bg-primary));
        box-shadow: inset 4px 0 0 var(--row-accent);
    }
    .obj-row.selected td{ color: var(--text-primary); }
    .obj-check{
        width: 22px;
        height: 22px;
        border: 2px solid var(--border-color);
        border-radius: 6px;
        display:flex;
        align-items:center;
        justify-content:center;
        transition: all 0.2s ease;
        background: var(--bg-primary);
        margin: 0 auto;
    }
    .obj-row.selected .obj-check{
        background: var(--row-accent);
        border-color: var(--row-accent);
    }
    .obj-check svg{
        width: 14px;
        height: 14px;
        color: white;
        opacity: 0;
        transform: scale(0.5);
        transition: all 0.2s ease;
    }
    .obj-row.selected .obj-check svg{
        opacity: 1;
        transform: scale(1);
    }
    .obj-chip{
        display:flex;
        align-items:center;
        gap:10px;
        font-weight: 800;
        color: var(--text-primary);
    }
    .obj-dot{
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--row-accent);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--row-accent) 18%, transparent);
    }
</style>
        `;

        let html = styles + `
<div style="--row-accent:${rowAccent}">
    <div style="margin-bottom: 20px;">
        <div class="obj-chip" style="--row-accent:${rowAccent}">
            <span class="obj-dot"></span>
            Orientación Profesional
        </div>
        <div style="margin-top:6px;">
            <strong>Seleccionado:</strong> 1 orientación
        </div>
    </div>

    <table class="obj-table-modern">
        <thead>
            <tr>
                <th style="width:80px;text-align:center;">✓</th>
                <th>Descripción</th>
            </tr>
        </thead>
        <tbody>
            <tr class="obj-row selected" data-codigo="orientacion-01" style="--row-accent:${rowAccent}">
                <td style="text-align:center;">
                    <div class="obj-check">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                             stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                </td>
                <td>${seccionOrientaciones}</td>
            </tr>
        </tbody>
    </table>
</div>
        `;

        this.elements.body.innerHTML = html;

        // Setup click listeners for the table row
        document.querySelectorAll('.obj-row').forEach(row => {
            row.addEventListener('click', () => {
                row.classList.toggle('selected');
            });
        });
    }

    /**
     * 1.2. Renderiza Prospectiva FP - prospectiva y entorno_profesional del ciclo
     * Estilo como Objetivos de Etapa - lista con checks seleccionados por defecto
     * @param {Array} prospectiva - Array de objetos con información de prospectiva a renderizar en el modal de FP, mostrando un diseño similar al de los objetivos de etapa con una lista de elementos cada uno con un check seleccionado por defecto para indicar que la prospectiva está incluida, proporcionando una presentación clara y visualmente atractiva de la información relevante para los usuarios interesados en la formación profesional.
     * @param {Array} entornoProfesional - Array de objetos con información de entorno profesional a renderizar en el modal de FP, complementando la sección de prospectiva con detalles específicos sobre el entorno profesional relacionado, utilizando un estilo coherente con el diseño de objetivos de etapa para mantener una experiencia visual uniforme y atractiva para los usuarios interesados en la formación profesional.
     */
    renderFPProspectiva(prospectiva, entornoProfesional) {
        console.log('Rendering FP Prospectiva with:', { prospectiva, entornoProfesional });

        const rowAccent = '#10b981'; // Color verde para Prospectiva

        // Combinar todos los elementos para la tabla
        let allItems = [];

        // Agregar items de prospectiva
        if (prospectiva && prospectiva.length > 0) {
            prospectiva.forEach(item => {
                allItems.push({
                    id: item.id_prospectiva,
                    type: 'prospectiva',
                    description: item.descripcion_prospectiva
                });
            });
        }

        // Agregar items de entorno profesional
        if (entornoProfesional && entornoProfesional.length > 0) {
            entornoProfesional.forEach(item => {
                allItems.push({
                    id: item.id_entorno_profesional,
                    type: 'entorno',
                    description: `${item.id_entorno_profesional} - ${item.descripcion_entorno_profesional}`
                });
            });
        }

        if (allItems.length === 0) {
            this.elements.body.innerHTML = this.renderErrorMessage(
                'Prospectiva',
                'No hay información de prospectiva o entorno profesional disponible para este ciclo'
            );
            return;
        }

        const styles = `
<style>
    .obj-table-modern{
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
    }
    .obj-table-modern thead th{
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-weight: 600;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 16px 20px;
        text-align: left;
        border-bottom: 2px solid var(--border-color);
    }
    .obj-table-modern tbody tr{
        border-bottom: 1px solid var(--border-color);
    }
    .obj-table-modern td{
        padding: 16px 20px;
        color: var(--text-secondary);
        font-size: 14px;
        line-height: 1.5;
    }
    .obj-row{
        transition: all 0.15s ease;
        cursor: pointer;
    }
    .obj-row:hover{
        background: color-mix(in srgb, var(--row-accent) 7%, var(--bg-primary));
    }
    .obj-row.selected{
        background: color-mix(in srgb, var(--row-accent) 15%, var(--bg-primary));
        box-shadow: inset 4px 0 0 var(--row-accent);
    }
    .obj-row.selected td{ color: var(--text-primary); }
    .obj-check{
        width: 22px;
        height: 22px;
        border: 2px solid var(--border-color);
        border-radius: 6px;
        display:flex;
        align-items:center;
        justify-content:center;
        transition: all 0.2s ease;
        background: var(--bg-primary);
        margin: 0 auto;
    }
    .obj-row.selected .obj-check{
        background: var(--row-accent);
        border-color: var(--row-accent);
    }
    .obj-check svg{
        width: 14px;
        height: 14px;
        color: white;
        opacity: 0;
        transform: scale(0.5);
        transition: all 0.2s ease;
    }
    .obj-row.selected .obj-check svg{
        opacity: 1;
        transform: scale(1);
    }
    .obj-chip{
        display:flex;
        align-items:center;
        gap:10px;
        font-weight: 800;
        color: var(--text-primary);
    }
    .obj-dot{
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--row-accent);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--row-accent) 18%, transparent);
    }
</style>
        `;

        let html = styles + `
<div style="--row-accent:${rowAccent}">
    <div style="margin-bottom: 20px;">
        <div class="obj-chip" style="--row-accent:${rowAccent}">
            <span class="obj-dot"></span>
            Prospectiva y Entorno Profesional
        </div>
        <div style="margin-top:6px;">
            <strong>Seleccionados:</strong> ${allItems.length} elementos
        </div>
    </div>

    <table class="obj-table-modern">
        <thead>
            <tr>
                <th style="width:80px;text-align:center;">✓</th>
                <th style="width:100px;">Tipo</th>
                <th>Descripción</th>
            </tr>
        </thead>
        <tbody>
        `;

        allItems.forEach((item, index) => {
            const typeLabel = item.type === 'prospectiva' ? 'Prospectiva' : 'Entorno Prof.';
            html += `
            <tr class="obj-row selected" data-codigo="${item.type}-${item.id}" style="--row-accent:${rowAccent}">
                <td style="text-align:center;">
                    <div class="obj-check">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                             stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                </td>
                <td style="color:var(--text-primary); font-weight:700;">${typeLabel}</td>
                <td>${item.description}</td>
            </tr>
            `;
        });

        html += `
        </tbody>
    </table>
</div>
        `;

        this.elements.body.innerHTML = html;

        // Setup click listeners for table rows
        document.querySelectorAll('.obj-row').forEach(row => {
            row.addEventListener('click', () => {
                row.classList.toggle('selected');
            });
        });
    }

    /**
     * 1.5. Renderiza ObGs FP - objetivos_generales del ciclo
     * Estilo como Objetivos de Etapa - lista con checks NO seleccionados por defecto
     * @param {Array} objetivosGenerales - Array de objetos con información de objetivos generales a renderizar en el modal de FP, mostrando un diseño similar al de los objetivos de etapa con una lista de elementos cada uno con un check NO seleccionado por defecto para indicar que los objetivos generales no están incluidos inicialmente, proporcionando una presentación clara y visualmente atractiva de la información relevante para los usuarios interesados en la formación profesional, permitiendo a los usuarios seleccionar manualmente los objetivos generales que desean incluir o destacar según sus necesidades e intereses específicos dentro del contexto educativo.
     */
    renderFPObjetivos(objetivosGenerales) {
        console.log('Rendering FP Objetivos with:', objetivosGenerales);

        if (!objetivosGenerales || objetivosGenerales.length === 0) {
            this.elements.body.innerHTML = this.renderErrorMessage(
                'Objetivos Generales',
                'No hay objetivos generales disponibles para este ciclo'
            );
            return;
        }

        const rowAccent = '#d97706'; // Color naranja para ObGs

        const styles = `
<style>
    .obj-table-modern{
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
    }
    .obj-table-modern thead th{
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-weight: 600;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 16px 20px;
        text-align: left;
        border-bottom: 2px solid var(--border-color);
    }
    .obj-table-modern tbody tr{
        border-bottom: 1px solid var(--border-color);
    }
    .obj-table-modern td{
        padding: 16px 20px;
        color: var(--text-secondary);
        font-size: 14px;
        line-height: 1.5;
    }
    .obj-row{
        transition: all 0.15s ease;
        cursor: pointer;
    }
    .obj-row:hover{
        background: color-mix(in srgb, var(--row-accent) 7%, var(--bg-primary));
    }
    .obj-row.selected{
        background: color-mix(in srgb, var(--row-accent) 15%, var(--bg-primary));
        box-shadow: inset 4px 0 0 var(--row-accent);
    }
    .obj-row.selected td{ color: var(--text-primary); }
    .obj-check{
        width: 22px;
        height: 22px;
        border: 2px solid var(--border-color);
        border-radius: 6px;
        display:flex;
        align-items:center;
        justify-content:center;
        transition: all 0.2s ease;
        background: var(--bg-primary);
        margin: 0 auto;
    }
    .obj-row.selected .obj-check{
        background: var(--row-accent);
        border-color: var(--row-accent);
    }
    .obj-check svg{
        width: 14px;
        height: 14px;
        color: white;
        opacity: 0;
        transform: scale(0.5);
        transition: all 0.2s ease;
    }
    .obj-row.selected .obj-check svg{
        opacity: 1;
        transform: scale(1);
    }
    .obj-chip{
        display:flex;
        align-items:center;
        gap:10px;
        font-weight: 800;
        color: var(--text-primary);
    }
    .obj-dot{
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--row-accent);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--row-accent) 18%, transparent);
    }
</style>
        `;

        let html = styles + `
<div style="--row-accent:${rowAccent}">
    <div style="margin-bottom: 20px;">
        <div class="obj-chip" style="--row-accent:${rowAccent}">
            <span class="obj-dot"></span>
            Objetivos Generales (ObGs)
        </div>
        <div style="margin-top:6px;">
            <strong>Seleccionados:</strong> <span id="objSelectionCount">0</span> de ${objetivosGenerales.length} objetivos
        </div>
    </div>

    <table class="obj-table-modern">
        <thead>
            <tr>
                <th style="width:80px;text-align:center;">✓</th>
                <th style="width:100px;">Código</th>
                <th>Descripción</th>
            </tr>
        </thead>
        <tbody>
        `;

        objetivosGenerales.forEach(objetivo => {
            html += `
            <tr class="obj-row" data-codigo="${objetivo.id_objetivos_generales}" style="--row-accent:${rowAccent}">
                <td style="text-align:center;">
                    <div class="obj-check">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                             stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                </td>
                <td style="color:var(--text-primary); font-weight:800;">${objetivo.id_objetivos_generales}</td>
                <td>${objetivo.descripcion_objetivos_generales}</td>
            </tr>
            `;
        });

        html += `
        </tbody>
    </table>
</div>
        `;

        this.elements.body.innerHTML = html;

        // Setup click listeners for table rows
        document.querySelectorAll('.obj-row').forEach(row => {
            row.addEventListener('click', () => {
                row.classList.toggle('selected');

                // Update selection count
                const selectedCount = document.querySelectorAll('.obj-row.selected').length;
                const countElement = document.getElementById('objSelectionCount');
                if (countElement) {
                    countElement.textContent = selectedCount;
                }
            });
        });
    }

    /**
     * 1.6. Renderiza CPPs FP - cpps del ciclo
     * Estilo como Objetivos de Etapa - lista con checks NO seleccionados por defecto
     * @param {Array} cpps - Array de objetos con información de competencias profesionales, personales y sociales a renderizar en el modal de FP, mostrando un diseño similar al de los objetivos de etapa con una lista de elementos cada uno con un check NO seleccionado por defecto para indicar que las CPPs no están incluidas inicialmente, proporcionando una presentación clara y visualmente atractiva de la información relevante para los usuarios interesados en la formación profesional, permitiendo a los usuarios seleccionar manualmente las competencias profesionales, personales y sociales que desean incluir o destacar según sus necesidades e intereses específicos dentro del contexto educativo.     
     */
    renderFPCPPs(cpps) {
        console.log('Rendering FP CPPs with:', cpps);

        if (!cpps || cpps.length === 0) {
            this.elements.body.innerHTML = this.renderErrorMessage(
                'CPPs',
                'No hay competencias profesionales, personales y sociales disponibles para este ciclo'
            );
            return;
        }

        const rowAccent = '#8b5cf6'; // Color morado para CPPs

        const styles = `
<style>
    .obj-table-modern{
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
    }
    .obj-table-modern thead th{
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-weight: 600;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 16px 20px;
        text-align: left;
        border-bottom: 2px solid var(--border-color);
    }
    .obj-table-modern tbody tr{
        border-bottom: 1px solid var(--border-color);
    }
    .obj-table-modern td{
        padding: 16px 20px;
        color: var(--text-secondary);
        font-size: 14px;
        line-height: 1.5;
    }
    .obj-row{
        transition: all 0.15s ease;
        cursor: pointer;
    }
    .obj-row:nth-child(even){
        background: var(--bg-secondary);
    }
    .obj-row:hover{
        background: color-mix(in srgb, var(--row-accent) 7%, var(--bg-primary));
    }
    .obj-row.selected{
        background: color-mix(in srgb, var(--row-accent) 15%, var(--bg-primary));
        box-shadow: inset 4px 0 0 var(--row-accent);
    }
    .obj-row.selected td{ color: var(--text-primary); }
    /* Checkbox */
    .obj-check{
        width: 22px;
        height: 22px;
        border: 2px solid var(--border-color);
        border-radius: 6px;
        display:flex;
        align-items:center;
        justify-content:center;
        transition: all 0.2s ease;
        background: var(--bg-primary);
        margin: 0 auto;
    }
    .obj-row.selected .obj-check{
        background: var(--row-accent);
        border-color: var(--row-accent);
    }
    .obj-check svg{
        width: 14px;
        height: 14px;
        color: white;
        opacity: 0;
        transform: scale(0.5);
        transition: all 0.2s ease;
    }
    .obj-row.selected .obj-check svg{
        opacity: 1;
        transform: scale(1);
    }
    /* Toolbar */
    .obj-toolbar{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        margin-bottom:12px;
        padding:12px 14px;
        border:1px solid var(--border-color);
        border-radius:12px;
        background: var(--bg-secondary);
    }
    .obj-clear{
        border:1px solid var(--border-color);
        background: var(--bg-primary);
        color: var(--text-primary);
        padding:8px 12px;
        border-radius:10px;
        cursor:pointer;
        transition: all 0.2s ease;
    }
    .obj-clear:hover{ background: var(--bg-tertiary); }
    /* Chip */
    .obj-chip{
        display:flex;
        align-items:center;
        gap:10px;
        font-weight: 800;
        color: var(--text-primary);
    }
    .obj-dot{
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--row-accent);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--row-accent) 18%, transparent);
    }
    @media (max-width: 820px){
        .obj-table-modern thead th:nth-child(3),
        .obj-table-modern td:nth-child(3){
            display:none;
        }
    }
</style>
        `;

        let html = styles + `
<div class="obj-toolbar" style="--row-accent:${rowAccent}">
    <div>
        <div class="obj-chip" style="--row-accent:${rowAccent}">
            <span class="obj-dot"></span>
            Competencias Profesionales, Personales y Sociales (CPPs)
        </div>
        <div style="margin-top:6px;">
            <strong>Seleccionados:</strong> <span id="objSelectionCount">0</span> de ${cpps.length} competencias
        </div>
    </div>
</div>
<div data-scroll-container="true" style="overflow:auto; border-radius:12px;">
    <table class="obj-table-modern">
        <thead>
            <tr>
                <th style="width:80px;text-align:center;">✓</th>
                <th style="width:100px;">Orden</th>
                <th>Título</th>
            </tr>
        </thead>
        <tbody>
        `;

        cpps.forEach(cpp => {
            html += `
            <tr class="obj-row" data-orden="${cpp.orden}" style="--row-accent:${rowAccent}">
                <td style="text-align:center;">
                    <div class="obj-check">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                             stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                </td>
                <td style="color:var(--text-primary); font-weight:800;">${cpp.orden}</td>
                <td>${cpp.titulo}</td>
            </tr>
            `;
        });

        html += `
        </tbody>
    </table>
</div>
        `;

        this.elements.body.innerHTML = html;

        // Setup click listeners for table rows
        document.querySelectorAll('.obj-row').forEach(row => {
            row.addEventListener('click', () => {
                row.classList.toggle('selected');
                // Update selection count
                const selectedCount = document.querySelectorAll('.obj-row.selected').length;
                const countElement = document.getElementById('objSelectionCount');
                if (countElement) {
                    countElement.textContent = selectedCount;
                }
            });
        });
    }

    /**
     * Setup event listeners for FP checkboxes
     */
    setupFPCheckboxListeners() {
        // Add event listeners for checkbox items
        document.querySelectorAll('.checkbox-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const checkboxItem = e.target.closest('.checkbox-item');
                if (checkboxItem) {
                    if (e.target.checked) {
                        checkboxItem.classList.add('selected');
                    } else {
                        checkboxItem.classList.remove('selected');
                    }
                }
            });
        });

        // Add click listeners for checkbox items (clicking the item toggles checkbox)
        document.querySelectorAll('.checkbox-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't trigger if clicking directly on the checkbox or label
                if (e.target.type === 'checkbox' || e.target.tagName === 'LABEL') {
                    return;
                }

                const checkbox = item.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                }
            });
        });
    }

    /**
     * Renderiza los resultados de aprendizaje en el modal de FP.
     * @param {Array} resultadosAprendizaje - Array de objetos con información de resultados de aprendizaje a renderizar en el modal de FP, mostrando un diseño similar al de los objetivos de etapa con una lista de elementos cada uno con un check NO seleccionado por defecto para indicar que los resultados de aprendizaje no están incluidos inicialmente, proporcionando una presentación clara y visualmente atractiva de la información relevante para los usuarios interesados en la formación profesional, permitiendo a los usuarios seleccionar manualmente los resultados de aprendizaje que desean incluir o destacar según sus necesidades e intereses específicos dentro del contexto educativo.
     * @returns 
     */
    renderFPRACE(resultadosAprendizaje) {
        console.log('Rendering FP RA/CE with:', resultadosAprendizaje);

        if (!resultadosAprendizaje || resultadosAprendizaje.length === 0) {
            this.elements.body.innerHTML = this.renderErrorMessage(
                'RA/CE',
                'No hay resultados de aprendizaje disponibles para este módulo'
            );
            return;
        }

        // Estado (persistente entre aperturas del modal)
        if (!this.selectedRACE) this.selectedRACE = new Set();              // RA completos (todos criterios)
        if (!this.selectedRACECriterios) this.selectedRACECriterios = new Map(); // ra_id -> Set(letra_criterio)
        if (!this.expandedRACE) this.expandedRACE = new Set();              // RA desplegados

        const rowAccent = '#ef4444'; // Color rojo para RA/CE

        const styles = `
<style>
    /* Tabla principal */
    .race-table-modern{
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
    }
    .race-table-modern thead th{
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-weight: 600;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 16px 20px;
        text-align: left;
        border-bottom: 2px solid var(--border-color);
        position: sticky;
        top: 0;
        z-index: 10;
    }
    .race-table-modern tbody td{
        padding: 16px 20px;
        vertical-align: top;
        border-bottom: 1px solid var(--border-color);
        font-size: 14px;
        line-height: 1.6;
        color: var(--text-secondary);
    }
    /* Fila RA */
    .race-row{
        cursor: pointer;
        transition: all 0.2s ease;
        background: var(--bg-primary);
    }
    .race-row:nth-child(even){
        background: var(--bg-secondary);
    }
    .race-row:hover{
        background: color-mix(in srgb, var(--row-accent) 7%, var(--bg-primary));
    }
    .race-row.selected{
        background: color-mix(in srgb, var(--row-accent) 15%, var(--bg-primary));
        box-shadow: inset 4px 0 0 var(--row-accent);
    }
    .race-row.selected td{
        color: var(--text-primary);
    }
    .race-row.partial{
        background: color-mix(in srgb, var(--row-accent) 9%, var(--bg-primary));
        box-shadow: inset 4px 0 0 color-mix(in srgb, var(--row-accent) 65%, #ffffff);
    }
    .race-row.partial td{
        color: var(--text-primary);
    }
    /* Bloque criterios */
    .race-criterios-wrap{
        padding: 0;
        border-bottom: 1px solid var(--border-color);
        background: var(--bg-primary);
    }
    .race-criterios-wrap.collapsed{
        display: none;
    }
    .race-criterios{
        padding: 10px 12px 14px 12px;
        background: color-mix(in srgb, var(--row-accent) 4%, var(--bg-primary));
        border-top: 1px dashed var(--border-color);
    }
    .race-criterios-title{
        font-size: 12px;
        color: var(--text-secondary);
        margin: 2px 0 10px 0;
    }
    /* Mini-tabla criterios */
    .race-criterios-table{
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border-radius: 10px;
        overflow: hidden;
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
    }
    .race-criterios-table tr{
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .race-criterios-table tr:nth-child(even){
        background: var(--bg-secondary);
    }
    .race-criterios-table tr:hover{
        background: color-mix(in srgb, var(--row-accent) 7%, var(--bg-primary));
    }
    .race-criterios-table td{
        padding: 12px 12px;
        border-bottom: 1px solid var(--border-color);
        font-size: 13px;
        color: var(--text-secondary);
        vertical-align: top;
    }
    .race-criterios-table tr:last-child td{
        border-bottom: none;
    }
    .race-criterio-row.selected{
        background: color-mix(in srgb, var(--row-accent) 15%, var(--bg-primary));
    }
    .race-criterio-row.selected td{
        color: var(--text-primary);
    }
    /* Checkbox */
    .race-check{
        width: 22px;
        height: 22px;
        border: 2px solid var(--border-color);
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        background: var(--bg-primary);
        margin: 0 auto;
        position: relative;
    }
    .race-row.selected .race-check,
    .race-criterio-row.selected .race-check{
        background: var(--row-accent);
        border-color: var(--row-accent);
    }
    .race-row.partial .race-check{
        background: color-mix(in srgb, var(--row-accent) 35%, var(--bg-primary));
        border-color: color-mix(in srgb, var(--row-accent) 65%, var(--border-color));
    }
    .race-check svg{
        width: 14px;
        height: 14px;
        color: white;
        opacity: 0;
        transform: scale(0.5);
        transition: all 0.2s ease;
    }
    .race-row.selected .race-check svg,
    .race-criterio-row.selected .race-check svg{
        opacity: 1;
        transform: scale(1);
    }
    .race-check .indeterminate{
        width: 12px;
        height: 3px;
        border-radius: 2px;
        background: white;
        opacity: 0;
        transform: scaleX(0.6);
        transition: all 0.2s ease;
        position: absolute;
    }
    .race-row.partial .race-check .indeterminate{
        opacity: 1;
        transform: scaleX(1);
    }
    /* Toolbar */
    .race-toolbar{
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
        padding: 12px 14px;
        border: 1px solid var(--border-color);
        border-radius: 12px;
        background: var(--bg-secondary);
    }
    .race-clear{
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
        color: var(--text-primary);
        padding: 8px 12px;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .race-clear:hover{
        background: var(--bg-tertiary);
    }
    /* Chip */
    .race-chip{
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 700;
        color: var(--text-primary);
    }
    .race-dot{
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--row-accent);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--row-accent) 18%, transparent);
    }
    /* Toggle */
    .race-criterio-toggle{
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
    }
    .race-toggle-btn{
        width: 34px;
        height: 34px;
        border-radius: 10px;
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        flex: 0 0 auto;
    }
    .race-toggle-btn:hover{
        background: color-mix(in srgb, var(--row-accent) 10%, var(--bg-primary));
        border-color: color-mix(in srgb, var(--row-accent) 30%, var(--border-color));
    }
    .race-toggle-btn i{
        width: 18px;
        height: 18px;
        color: var(--text-primary);
        transition: transform 0.2s ease;
    }
    .race-toggle-btn[aria-expanded="true"] i{
        transform: rotate(180deg);
    }
</style>
        `;

        // Contar totales
        let totalCriterios = 0;
        resultadosAprendizaje.forEach(ra => {
            if (ra.criterios && Array.isArray(ra.criterios)) {
                totalCriterios += ra.criterios.length;
            }
        });

        // Función para contar seleccionados
        const countSelected = () => {
            let criteriosCount = 0;
            for (const set of this.selectedRACECriterios.values()) {
                criteriosCount += set.size;
            }
            return { ras: this.selectedRACE.size, criterios: criteriosCount };
        };

        // Inicializar conteo
        const { ras, criterios } = countSelected();

        let html = styles + `
<div class="race-toolbar" style="--row-accent:${rowAccent}">
    <div>
        <div class="race-chip" style="--row-accent:${rowAccent}">
            <span class="race-dot"></span>
            Resultados de Aprendizaje y Criterios de Evaluación (RA/CE)
        </div>
        <div style="margin-top:6px;">
            <strong>Seleccionados:</strong>
            <span id="raceSelectionCount">${ras}</span> RA ·
            <span id="raceCriteriosSelectionCount">${criterios}</span> criterios
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:6px;">
            Clic en RA = selecciona todos sus criterios. Clic en criterio = selección individual. Botón ▾ = desplegar.
        </div>
    </div>
    <button type="button" id="raceClearSelection" class="race-clear">Limpiar</button>
</div>
<div data-scroll-container="true" style="overflow:auto; border-radius:12px;">
    <table class="race-table-modern">
        <thead>
            <tr>
                <th style="width:60px; text-align:center;">✓</th>
                <th style="width:30%;">Resultado de Aprendizaje</th>
                <th style="width:40%;">Descripción</th>
                <th>Criterios</th>
            </tr>
        </thead>
        <tbody id="raceTableBody">
        `;

        // Renderizar cada RA con sus criterios
        resultadosAprendizaje.forEach((ra, index) => {
            const raId = ra.ra_id || `RA_${index + 1}`;
            const raDescripcion = ra.ra_descripcion || 'Sin descripción';
            const criterios = ra.criterios || [];

            const selectedSet = this.selectedRACECriterios.get(raId) || new Set();
            const total = criterios.length;
            const selected = selectedSet.size;
            const isAll = total > 0 && selected === total;
            const isPartial = selected > 0 && selected < total;
            const rowClass = isAll ? 'selected' : (isPartial ? 'partial' : '');
            const expanded = this.expandedRACE.has(raId);
            const ariaExpanded = expanded ? 'true' : 'false';

            html += `
            <tr class="race-row ${rowClass}" data-ra="${raId}" style="--row-accent:${rowAccent}">
                <td style="text-align:center;">
                    <div class="race-check">
                        <span class="indeterminate"></span>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                             stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                </td>
                <td>
                    <div class="race-chip">
                        <span class="race-dot" style="--row-accent:${rowAccent}"></span>
                        ${raId}
                    </div>
                </td>
                <td>${raDescripcion}</td>
                <td style="white-space:nowrap;">
                    <div class="race-criterio-toggle">
                        <span><strong>${criterios.length}</strong> criterio(s)</span>
                        <button type="button"
                                class="race-toggle-btn"
                                data-toggle="race"
                                data-ra="${raId}"
                                aria-expanded="${ariaExpanded}"
                                aria-label="Desplegar criterios del ${raId}">
                            <i data-lucide="chevron-down"></i>
                        </button>
                    </div>
                </td>
            </tr>
            `;

            // Fila expandible con criterios
            const wrapClass = expanded ? '' : 'collapsed';
            html += `
            <tr class="race-criterios-wrap ${wrapClass}" data-ra="${raId}">
                <td colspan="4">
                    <div class="race-criterios">
                        <div class="race-criterios-title">Criterios de Evaluación del ${raId}</div>
                        <table class="race-criterios-table">
                        `;

            criterios.forEach(criterio => {
                const letraCriterio = criterio.letra_criterio || 'Sin letra';
                const descripcionCriterio = criterio.descripcion_criterio || 'Sin descripción';
                const isSelected = selectedSet.has(letraCriterio);
                const criterioRowClass = isSelected ? 'selected' : '';

                html += `
                            <tr class="race-criterio-row ${criterioRowClass}" data-ra="${raId}" data-criterio="${letraCriterio}" style="--row-accent:${rowAccent}">
                                <td style="width:60px; text-align:center;">
                                    <div class="race-check">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                                             stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </div>
                                </td>
                                <td style="width:100px; font-weight:600; color:var(--text-primary);">${letraCriterio}</td>
                                <td>${descripcionCriterio}</td>
                            </tr>
                            `;
            });

            html += `
                        </table>
                    </div>
                </td>
            </tr>
            `;
        });

        html += `
        </tbody>
    </table>
</div>
        `;

        this.elements.body.innerHTML = html;

        // Re-init Lucide icons
        if (window.lucide) {
            lucide.createIcons();
        }

        // Setup event listeners
        const tableBody = document.getElementById('raceTableBody');
        const clearBtn = document.getElementById('raceClearSelection');

        if (!tableBody) return;

        // Funciones auxiliares
        const recomputeCounts = () => {
            const { ras, criterios } = countSelected();
            const rasCount = document.getElementById('raceSelectionCount');
            const criteriosCount = document.getElementById('raceCriteriosSelectionCount');
            if (rasCount) rasCount.textContent = ras;
            if (criteriosCount) criteriosCount.textContent = criterios;
        };

        //  Actualiza la UI de expansión/collapse de criterios para un RA dado
        const setExpandedUI = (raId, expanded) => {
            const wrap = tableBody.querySelector(`.race-criterios-wrap[data-ra="${CSS.escape(raId)}"]`);
            const btn = tableBody.querySelector(`.race-toggle-btn[data-ra="${CSS.escape(raId)}"]`);
            if (wrap) wrap.classList.toggle('collapsed', !expanded);
            if (btn) btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        };

        //
        const setRowState = (raId) => {
            const raRow = tableBody.querySelector(`.race-row[data-ra="${CSS.escape(raId)}"]`);
            if (!raRow) return;
            const criterioRows = tableBody.querySelectorAll(`.race-criterio-row[data-ra="${CSS.escape(raId)}"]`);
            const total = criterioRows.length;
            const set = this.selectedRACECriterios.get(raId) || new Set();
            const selected = set.size;
            raRow.classList.remove('selected', 'partial');
            if (total > 0 && selected === total) {
                raRow.classList.add('selected');
                this.selectedRACE.add(raId);
            } else if (selected > 0 && selected < total) {
                raRow.classList.add('partial');
                this.selectedRACE.delete(raId);
            } else {
                this.selectedRACE.delete(raId);
            }
        };

        // Toggle de selección de todos los criterios de un RA al hacer click en la fila del RA
        const toggleAllCriterios = (raId) => {
            const criterioRows = tableBody.querySelectorAll(`.race-criterio-row[data-ra="${CSS.escape(raId)}"]`);
            // UX: si tiene criterios y está cerrado, lo abrimos al interactuar
            if (criterioRows.length > 0 && !this.expandedRACE.has(raId)) {
                this.expandedRACE.add(raId);
                setExpandedUI(raId, true);
            }
            if (criterioRows.length === 0) {
                // RA sin criterios: selección simple de la fila
                const raRow = tableBody.querySelector(`.race-row[data-ra="${CSS.escape(raId)}"]`);
                if (!raRow) return;
                if (raRow.classList.contains('selected')) {
                    raRow.classList.remove('selected');
                    this.selectedRACE.delete(raId);
                } else {
                    raRow.classList.add('selected');
                    this.selectedRACE.add(raId);
                }
                recomputeCounts();
                return;
            }
            let set = this.selectedRACECriterios.get(raId);
            if (!set) { set = new Set(); this.selectedRACECriterios.set(raId, set); }
            const allSelected = set.size === criterioRows.length;
            if (allSelected) {
                set.clear();
                criterioRows.forEach(r => r.classList.remove('selected'));
                this.selectedRACECriterios.delete(raId);
            } else {
                set.clear();
                criterioRows.forEach(r => {
                    const letraCriterio = r.dataset.criterio;
                    if (letraCriterio) set.add(letraCriterio);
                    r.classList.add('selected');
                });
            }
            setRowState(raId);
            recomputeCounts();
        };

        // Toggle de selección individual de criterio al hacer click en la fila del criterio
        const toggleCriterio = (raId, letraCriterio, criterioRow) => {
            let set = this.selectedRACECriterios.get(raId);
            if (!set) { set = new Set(); this.selectedRACECriterios.set(raId, set); }
            if (set.has(letraCriterio)) {
                set.delete(letraCriterio);
                criterioRow.classList.remove('selected');
            } else {
                set.add(letraCriterio);
                criterioRow.classList.add('selected');
            }
            if (set.size === 0) {
                this.selectedRACECriterios.delete(raId);
            }
            setRowState(raId);
            recomputeCounts();
        };

        // Event listeners
        tableBody.addEventListener('click', (e) => {
            e.preventDefault();
            // 1) Click en toggle (desplegable)
            const toggleBtn = e.target.closest('.race-toggle-btn');
            if (toggleBtn) {
                const raId = toggleBtn.dataset.ra;
                if (!raId) return;
                const isExpanded = this.expandedRACE.has(raId);
                if (isExpanded) {
                    this.expandedRACE.delete(raId);
                } else {
                    this.expandedRACE.add(raId);
                }
                setExpandedUI(raId, !isExpanded);
                return;
            }
            // 2) Click en criterio
            const criterioRow = e.target.closest('.race-criterio-row');
            if (criterioRow) {
                const raId = criterioRow.dataset.ra;
                const letraCriterio = criterioRow.dataset.criterio;
                if (!raId || !letraCriterio) return;
                toggleCriterio(raId, letraCriterio, criterioRow);
                return;
            }
            // 3) Click en RA
            const raRow = e.target.closest('.race-row');
            if (raRow) {
                const raId = raRow.dataset.ra;
                if (!raId) return;
                toggleAllCriterios(raId);
            }
        });

        // Botón de limpiar selección
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.selectedRACE.clear();
                this.selectedRACECriterios.clear();
                tableBody.querySelectorAll('.race-row.selected, .race-row.partial')
                    .forEach(tr => tr.classList.remove('selected', 'partial'));
                tableBody.querySelectorAll('.race-criterio-row.selected')
                    .forEach(tr => tr.classList.remove('selected'));
                recomputeCounts();
            });
        }

        // Inicializar estado UI
        const raRows = tableBody.querySelectorAll('.race-row[data-ra]');
        raRows.forEach(r => {
            const raId = r.dataset.ra;
            setRowState(raId);
            setExpandedUI(raId, this.expandedRACE.has(raId));
        });
        recomputeCounts();
    }

    /**
     * Renderiza los bloques de contenidos en el modal de FP.
     * @param {Array} bloquesContenidos - Array de objetos con información de los bloques de contenidos a renderizar en el modal de FP.
     * @returns 
     */
    renderFPContenidos(bloquesContenidos) {
        console.log('Rendering FP Contenidos with:', bloquesContenidos);

        if (!bloquesContenidos || bloquesContenidos.length === 0) {
            this.elements.body.innerHTML = this.renderErrorMessage(
                'Contenidos',
                'No hay bloques de contenidos disponibles para este módulo'
            );
            return;
        }

        // Estado (persistente entre aperturas del modal)
        if (!this.selectedContenidos) this.selectedContenidos = new Set();              // Bloques completos (todos puntos)
        if (!this.selectedContenidosPuntos) this.selectedContenidosPuntos = new Map(); // id_bloque -> Set(id_punto)
        if (!this.expandedContenidos) this.expandedContenidos = new Set();              // Bloques desplegados

        const rowAccent = '#06b6d4'; // Color cian para Contenidos

        const styles = `
<style>
    /* Tabla principal */
    .contenidos-table-modern{
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
    }
    .contenidos-table-modern thead th{
        background: var(--bg-secondary);
        color: var(--text-primary);
        font-weight: 600;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 16px 20px;
        text-align: left;
        border-bottom: 2px solid var(--border-color);
        position: sticky;
        top: 0;
        z-index: 10;
    }
    .contenidos-table-modern tbody td{
        padding: 16px 20px;
        vertical-align: top;
        border-bottom: 1px solid var(--border-color);
        font-size: 14px;
        line-height: 1.6;
        color: var(--text-secondary);
    }
    /* Fila Bloque */
    .contenidos-row{
        cursor: pointer;
        transition: all 0.2s ease;
        background: var(--bg-primary);
    }
    .contenidos-row:nth-child(even){
        background: var(--bg-secondary);
    }
    .contenidos-row:hover{
        background: color-mix(in srgb, var(--row-accent) 7%, var(--bg-primary));
    }
    .contenidos-row.selected{
        background: color-mix(in srgb, var(--row-accent) 15%, var(--bg-primary));
        box-shadow: inset 4px 0 0 var(--row-accent);
    }
    .contenidos-row.selected td{
        color: var(--text-primary);
    }
    .contenidos-row.partial{
        background: color-mix(in srgb, var(--row-accent) 9%, var(--bg-primary));
        box-shadow: inset 4px 0 0 color-mix(in srgb, var(--row-accent) 65%, #ffffff);
    }
    .contenidos-row.partial td{
        color: var(--text-primary);
    }
    /* Bloque puntos */
    .contenidos-puntos-wrap{
        padding: 0;
        border-bottom: 1px solid var(--border-color);
        background: var(--bg-primary);
    }
    .contenidos-puntos-wrap.collapsed{
        display: none;
    }
    .contenidos-puntos{
        padding: 10px 12px 14px 12px;
        background: color-mix(in srgb, var(--row-accent) 4%, var(--bg-primary));
        border-top: 1px dashed var(--border-color);
    }
    .contenidos-puntos-title{
        font-size: 12px;
        color: var(--text-secondary);
        margin: 2px 0 10px 0;
    }
    /* Mini-tabla puntos */
    .contenidos-puntos-table{
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        border-radius: 10px;
        overflow: hidden;
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
    }
    .contenidos-puntos-table tr{
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .contenidos-puntos-table tr:nth-child(even){
        background: var(--bg-secondary);
    }
    .contenidos-puntos-table tr:hover{
        background: color-mix(in srgb, var(--row-accent) 7%, var(--bg-primary));
    }
    .contenidos-puntos-table td{
        padding: 12px 12px;
        border-bottom: 1px solid var(--border-color);
        font-size: 13px;
        color: var(--text-secondary);
        vertical-align: top;
    }
    .contenidos-puntos-table tr:last-child td{
        border-bottom: none;
    }
    .contenidos-punto-row.selected{
        background: color-mix(in srgb, var(--row-accent) 15%, var(--bg-primary));
    }
    .contenidos-punto-row.selected td{
        color: var(--text-primary);
    }
    /* Checkbox */
    .contenidos-check{
        width: 22px;
        height: 22px;
        border: 2px solid var(--border-color);
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        background: var(--bg-primary);
        margin: 0 auto;
        position: relative;
    }
    .contenidos-row.selected .contenidos-check,
    .contenidos-punto-row.selected .contenidos-check{
        background: var(--row-accent);
        border-color: var(--row-accent);
    }
    .contenidos-row.partial .contenidos-check{
        background: color-mix(in srgb, var(--row-accent) 35%, var(--bg-primary));
        border-color: color-mix(in srgb, var(--row-accent) 65%, var(--border-color));
    }
    .contenidos-check svg{
        width: 14px;
        height: 14px;
        color: white;
        opacity: 0;
        transform: scale(0.5);
        transition: all 0.2s ease;
    }
    .contenidos-row.selected .contenidos-check svg,
    .contenidos-punto-row.selected .contenidos-check svg{
        opacity: 1;
        transform: scale(1);
    }
    .contenidos-check .indeterminate{
        width: 12px;
        height: 3px;
        border-radius: 2px;
        background: white;
        opacity: 0;
        transform: scaleX(0.6);
        transition: all 0.2s ease;
        position: absolute;
    }
    .contenidos-row.partial .contenidos-check .indeterminate{
        opacity: 1;
        transform: scaleX(1);
    }
    /* Toolbar */
    .contenidos-toolbar{
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
        padding: 12px 14px;
        border: 1px solid var(--border-color);
        border-radius: 12px;
        background: var(--bg-secondary);
    }
    .contenidos-clear{
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
        color: var(--text-primary);
        padding: 8px 12px;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .contenidos-clear:hover{
        background: var(--bg-tertiary);
    }
    /* Chip */
    .contenidos-chip{
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 700;
        color: var(--text-primary);
    }
    .contenidos-dot{
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--row-accent);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--row-accent) 18%, transparent);
    }
    /* Toggle */
    .contenidos-punto-toggle{
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
    }
    .contenidos-toggle-btn{
        width: 34px;
        height: 34px;
        border-radius: 10px;
        border: 1px solid var(--border-color);
        background: var(--bg-primary);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        flex: 0 0 auto;
    }
    .contenidos-toggle-btn:hover{
        background: color-mix(in srgb, var(--row-accent) 10%, var(--bg-primary));
        border-color: color-mix(in srgb, var(--row-accent) 30%, var(--border-color));
    }
    .contenidos-toggle-btn i{
        width: 18px;
        height: 18px;
        color: var(--text-primary);
        transition: transform 0.2s ease;
    }
    .contenidos-toggle-btn[aria-expanded="true"] i{
        transform: rotate(180deg);
    }
</style>
        `;

        // Contar totales
        let totalPuntos = 0;
        bloquesContenidos.forEach(bloque => {
            if (bloque.puntos_detalle && Array.isArray(bloque.puntos_detalle)) {
                totalPuntos += bloque.puntos_detalle.length;
            }
        });

        // Función para contar seleccionados
        const countSelected = () => {
            let puntosCount = 0;
            for (const set of this.selectedContenidosPuntos.values()) {
                puntosCount += set.size;
            }
            return { bloques: this.selectedContenidos.size, puntos: puntosCount };
        };

        // Inicializar conteo
        const { bloques, puntos } = countSelected();

        let html = styles + `
<div class="contenidos-toolbar" style="--row-accent:${rowAccent}">
    <div>
        <div class="contenidos-chip" style="--row-accent:${rowAccent}">
            <span class="contenidos-dot"></span>
            Bloques de Contenidos Básicos
        </div>
        <div style="margin-top:6px;">
            <strong>Seleccionados:</strong>
            <span id="contenidosSelectionCount">${bloques}</span> bloques ·
            <span id="contenidosPuntosSelectionCount">${puntos}</span> puntos
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:6px;">
            Clic en bloque = selecciona todos sus puntos. Clic en punto = selección individual. Botón ▾ = desplegar.
        </div>
    </div>
    <button type="button" id="contenidosClearSelection" class="contenidos-clear">Limpiar</button>
</div>
<div data-scroll-container="true" style="overflow:auto; border-radius:12px;">
    <table class="contenidos-table-modern">
        <thead>
            <tr>
                <th style="width:60px; text-align:center;">✓</th>
                <th style="width:30%;">Bloque</th>
                <th style="width:40%;">Descripción</th>
                <th>Puntos de Detalle</th>
            </tr>
        </thead>
        <tbody id="contenidosTableBody">
        `;

        bloquesContenidos.forEach((bloque, index) => {
            const idBloque = bloque.id_bloque || `BLOQUE_${index + 1}`;
            const descripcionBloque = bloque.descripcion_bloque || 'Sin descripción';
            const puntos = bloque.puntos_detalle || [];

            const selectedSet = this.selectedContenidosPuntos.get(idBloque) || new Set();
            const total = puntos.length;
            const selected = selectedSet.size;
            const isAll = total > 0 && selected === total;
            const isPartial = selected > 0 && selected < total;
            const rowClass = isAll ? 'selected' : (isPartial ? 'partial' : '');
            const expanded = this.expandedContenidos.has(idBloque);
            const ariaExpanded = expanded ? 'true' : 'false';

            html += `
            <tr class="contenidos-row ${rowClass}" data-bloque="${idBloque}" style="--row-accent:${rowAccent}">
                <td style="text-align:center;">
                    <div class="contenidos-check">
                        <span class="indeterminate"></span>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                             stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                </td>
                <td>
                    <div class="contenidos-chip">
                        <span class="contenidos-dot" style="--row-accent:${rowAccent}"></span>
                        ${idBloque}
                    </div>
                </td>
                <td>${descripcionBloque}</td>
                <td style="white-space:nowrap;">
                    <div class="contenidos-punto-toggle">
                        <span><strong>${puntos.length}</strong> punto(s)</span>
                        <button type="button"
                                class="contenidos-toggle-btn"
                                data-toggle="contenidos"
                                data-bloque="${idBloque}"
                                aria-expanded="${ariaExpanded}"
                                aria-label="Desplegar puntos del ${idBloque}">
                            <i data-lucide="chevron-down"></i>
                        </button>
                    </div>
                </td>
            </tr>
            `;

            // Fila expandible con puntos
            const wrapClass = expanded ? '' : 'collapsed';
            html += `
            <tr class="contenidos-puntos-wrap ${wrapClass}" data-bloque="${idBloque}">
                <td colspan="4">
                    <div class="contenidos-puntos">
                        <div class="contenidos-puntos-title">Puntos de Detalle del ${idBloque}</div>
                        <table class="contenidos-puntos-table">
                        `;

            puntos.forEach(punto => {
                const idPunto = punto.id_punto || 'Sin ID';
                const descripcionPunto = punto.descripcion_punto || 'Sin descripción';
                const isSelected = selectedSet.has(idPunto);
                const puntoRowClass = isSelected ? 'selected' : '';

                html += `
                            <tr class="contenidos-punto-row ${puntoRowClass}" data-bloque="${idBloque}" data-punto="${idPunto}" style="--row-accent:${rowAccent}">
                                <td style="width:60px; text-align:center;">
                                    <div class="contenidos-check">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                                             stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </div>
                                </td>
                                <td style="width:100px; font-weight:600; color:var(--text-primary);">${idPunto}</td>
                                <td>${descripcionPunto}</td>
                            </tr>
                            `;
            });

            html += `
                        </table>
                    </div>
                </td>
            </tr>
            `;
        });

        html += `
        </tbody>
    </table>
</div>
        `;

        this.elements.body.innerHTML = html;

        // Re-init Lucide icons
        if (window.lucide) {
            lucide.createIcons();
        }

        // Setup event listeners
        const tableBody = document.getElementById('contenidosTableBody');
        const clearBtn = document.getElementById('contenidosClearSelection');

        if (!tableBody) return;

        // Funciones auxiliares
        const recomputeCounts = () => {
            const { bloques, puntos } = countSelected();
            const bloquesCount = document.getElementById('contenidosSelectionCount');
            const puntosCount = document.getElementById('contenidosPuntosSelectionCount');
            if (bloquesCount) bloquesCount.textContent = bloques;
            if (puntosCount) puntosCount.textContent = puntos;
        };

        //  Actualiza la UI de expansión/collapse de puntos para un bloque dado
        const setExpandedUI = (idBloque, expanded) => {
            const wrap = tableBody.querySelector(`.contenidos-puntos-wrap[data-bloque="${CSS.escape(idBloque)}"]`);
            const btn = tableBody.querySelector(`.contenidos-toggle-btn[data-bloque="${CSS.escape(idBloque)}"]`);
            if (wrap) wrap.classList.toggle('collapsed', !expanded);
            if (btn) btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        };

        // Actualiza el estado de selección de la fila del bloque según sus puntos seleccionados
        const setRowState = (idBloque) => {
            const bloqueRow = tableBody.querySelector(`.contenidos-row[data-bloque="${CSS.escape(idBloque)}"]`);
            if (!bloqueRow) return;
            const puntoRows = tableBody.querySelectorAll(`.contenidos-punto-row[data-bloque="${CSS.escape(idBloque)}"]`);
            const total = puntoRows.length;
            const set = this.selectedContenidosPuntos.get(idBloque) || new Set();
            const selected = set.size;
            bloqueRow.classList.remove('selected', 'partial');
            if (total > 0 && selected === total) {
                bloqueRow.classList.add('selected');
                this.selectedContenidos.add(idBloque);
            } else if (selected > 0 && selected < total) {
                bloqueRow.classList.add('partial');
                this.selectedContenidos.delete(idBloque);
            } else {
                this.selectedContenidos.delete(idBloque);
            }
        };

        // Toggle de selección de todos los puntos de un bloque al hacer click en la fila del bloque
        const toggleAllPuntos = (idBloque) => {
            const puntoRows = tableBody.querySelectorAll(`.contenidos-punto-row[data-bloque="${CSS.escape(idBloque)}"]`);
            // UX: si tiene puntos y está cerrado, lo abrimos al interactuar
            if (puntoRows.length > 0 && !this.expandedContenidos.has(idBloque)) {
                this.expandedContenidos.add(idBloque);
                setExpandedUI(idBloque, true);
            }
            if (puntoRows.length === 0) {
                // Bloque sin puntos: selección simple de la fila
                const bloqueRow = tableBody.querySelector(`.contenidos-row[data-bloque="${CSS.escape(idBloque)}"]`);
                if (!bloqueRow) return;
                if (bloqueRow.classList.contains('selected')) {
                    bloqueRow.classList.remove('selected');
                    this.selectedContenidos.delete(idBloque);
                } else {
                    bloqueRow.classList.add('selected');
                    this.selectedContenidos.add(idBloque);
                }
                recomputeCounts();
                return;
            }
            let set = this.selectedContenidosPuntos.get(idBloque);
            if (!set) { set = new Set(); this.selectedContenidosPuntos.set(idBloque, set); }
            const allSelected = set.size === puntoRows.length;
            if (allSelected) {
                set.clear();
                puntoRows.forEach(r => r.classList.remove('selected'));
                this.selectedContenidosPuntos.delete(idBloque);
            } else {
                set.clear();
                puntoRows.forEach(r => {
                    const idPunto = r.dataset.punto;
                    if (idPunto) set.add(idPunto);
                    r.classList.add('selected');
                });
            }
            setRowState(idBloque);
            recomputeCounts();
        };

        // Toggle de selección individual de punto al hacer click en la fila del punto
        const togglePunto = (idBloque, idPunto, puntoRow) => {
            let set = this.selectedContenidosPuntos.get(idBloque);
            if (!set) { set = new Set(); this.selectedContenidosPuntos.set(idBloque, set); }
            if (set.has(idPunto)) {
                set.delete(idPunto);
                puntoRow.classList.remove('selected');
            } else {
                set.add(idPunto);
                puntoRow.classList.add('selected');
            }
            if (set.size === 0) {
                this.selectedContenidosPuntos.delete(idBloque);
            }
            setRowState(idBloque);
            recomputeCounts();
        };

        // Event listeners
        tableBody.addEventListener('click', (e) => {
            e.preventDefault();
            // 1) Click en toggle (desplegable)
            const toggleBtn = e.target.closest('.contenidos-toggle-btn');
            if (toggleBtn) {
                const idBloque = toggleBtn.dataset.bloque;
                if (!idBloque) return;
                const isExpanded = this.expandedContenidos.has(idBloque);
                if (isExpanded) {
                    this.expandedContenidos.delete(idBloque);
                } else {
                    this.expandedContenidos.add(idBloque);
                }
                setExpandedUI(idBloque, !isExpanded);
                return;
            }
            // 2) Click en punto
            const puntoRow = e.target.closest('.contenidos-punto-row');
            if (puntoRow) {
                const idBloque = puntoRow.dataset.bloque;
                const idPunto = puntoRow.dataset.punto;
                if (!idBloque || !idPunto) return;
                togglePunto(idBloque, idPunto, puntoRow);
                return;
            }
            // 3) Click en bloque
            const bloqueRow = e.target.closest('.contenidos-row');
            if (bloqueRow) {
                const idBloque = bloqueRow.dataset.bloque;
                if (!idBloque) return;
                toggleAllPuntos(idBloque);
            }
        });

        // Botón de limpiar selección
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.selectedContenidos.clear();
                this.selectedContenidosPuntos.clear();
                tableBody.querySelectorAll('.contenidos-row.selected, .contenidos-row.partial')
                    .forEach(tr => tr.classList.remove('selected', 'partial'));
                tableBody.querySelectorAll('.contenidos-punto-row.selected')
                    .forEach(tr => tr.classList.remove('selected'));
                recomputeCounts();
            });
        }

        // Inicializar estado UI
        const bloqueRows = tableBody.querySelectorAll('.contenidos-row[data-bloque]');
        bloqueRows.forEach(r => {
            const idBloque = r.dataset.bloque;
            setRowState(idBloque);
            setExpandedUI(idBloque, this.expandedContenidos.has(idBloque));
        });
        recomputeCounts();
    }

    /**
     * Establece modo resumen para contexto de fila
     * @param {Object} context - Objeto con información del contexto para establecer el modo resumen (ej. { tipo : 'RA', id: 'RA1' })
     */
    setResumenMode(context) {
        this.resumenMode = context;
        console.log('Modo resumen establecido:', context);
    }
}

// ============================================
// INICIALIZACIÓN
// ============================================
/**
 * Inicializa el componente de modal una vez que el DOM esté listo, y lo asigna a window.modalComponent para su uso global.
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.modalComponent = new ModalComponent(window.AppStore);
    });
} else {
    window.modalComponent = new ModalComponent(window.AppStore);
}

// Export para debugging
window.ModalComponent = ModalComponent;