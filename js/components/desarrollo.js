/* ============================================
   DESARROLLO COMPONENT
   Manages: Sesiones and Actividades
   ============================================ */

   /**
    * Componente encargado de gestionar el desarrollo de las sesiones, incluyendo la creación y ajuste de actividades, 
    * así como la interacción con la IA para generar contenido y sugerencias.
    * Permite a los usuarios configurar cada sesión, definir objetivos, y crear actividades específicas, 
    * con la posibilidad de recibir indicaciones y ajustes automáticos por parte de la IA. Además, ofrece 
    * una interfaz intuitiva para visualizar el estado de cada sesión y sus actividades asociadas.
    */
class DesarrolloComponent {
    /**
     * Constructor del componente de desarrollo.
     * @param {*} store 
     */
    constructor(store) {
        this.store = store;
        this.container = document.getElementById('sesiones-container');
        this.init();
    }
    
    /**
     * Inicializa el componente, suscribiéndose a los cambios en el estado de la aplicación y renderizando la interfaz.
     */
    init() {
        this.subscribeToStore();
        this.render();
    }

    /**
     * Se suscribe a los cambios en el estado de la aplicación para actualizar la interfaz cuando se selecciona la pestaña de desarrollo.
     */
    subscribeToStore() {
        this.store.subscribe((state) => {
            if (state.currentTab === 'desarrollo') {
                this.render();
            }
        });
    }
    
    /**
     * Renderiza la interfaz del componente de desarrollo, mostrando las sesiones y sus actividades.
     * @returns {void}
     */
    render() {
        const state = this.store.getState();
        const sesiones = state.sesiones;
        
        if (!this.container) return;
        
        if (sesiones.length === 0) {
            this.container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📚</div>
                    <div class="empty-state-text">No hay sesiones configuradas</div>
                    <div class="empty-state-hint">Ve a la pestaña "Contexto" y configura el número de sesiones para comenzar.</div>
                </div>
            `;
            return;
        }
        
        this.container.innerHTML = sesiones.map(sesion => this.renderSesion(sesion)).join('');
        
        // Setup event listeners
        this.setupSesionListeners();
    }
    
    /**
     * Renderiza una sesión específica, mostrando su información y actividades.
     * @param {*} sesion Objeto que representa la sesión a renderizar
     * @returns {string} HTML de la sesión
     */
    renderSesion(sesion) {
        const isExpanded = false; // Could be stored in state
        const statusText = {
            pending: 'Pendiente',
            adjusted: 'Ajustado',
            saved: 'Guardado'
        };
        
        return `
            <div class="sesion-card" data-sesion-id="${sesion.id}">
                <div class="sesion-header">
                    <div class="sesion-header-left">
                        <h3 class="sesion-title">Sesión ${sesion.numero}</h3>
                        <span class="actividad-type ${sesion.status}">${statusText[sesion.status]}</span>
                    </div>
                    <i data-lucide="chevron-down" class="sesion-chevron"></i>
                </div>
                
                <div class="sesion-content">
                    <div class="sesion-metadata">
                        <div class="form-group">
                            <label class="form-label">Título de la sesión</label>
                            <input type="text" class="form-input sesion-titulo" value="${sesion.titulo || ''}" placeholder="Ej: Introducción a variables">
                             <button type="button" class="ai-mini-btn" data-ai-action="instructions"
                                        data-target="sesion.titulo" title="Indicaciones para la IA"
                                        aria-label="Indicaciones para la IA">
                                        <i data-lucide="message-square" size="14"></i>
                                    </button>

                                    <button type="button" class="ai-mini-btn primary" data-ai-action="rewrite"
                                        data-target="sesion.titulo" title="Reescribir con IA"
                                        aria-label="Reescribir con IA">
                                        <i data-lucide="sparkles" size="14"></i>
                                    </button>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Objetivos de la sesión</label>
                        <textarea class="form-textarea sesion-objetivos" placeholder="Define los objetivos específicos de esta sesión...">${sesion.objetivos || ''}</textarea>
                                    <button type="button" class="ai-mini-btn" data-ai-action="instructions"
                                        data-target="sesion.objetivos" title="Indicaciones para la IA"
                                        aria-label="Indicaciones para la IA">
                                        <i data-lucide="message-square" size="14"></i>
                                    </button>

                                    <button type="button" class="ai-mini-btn primary" data-ai-action="rewrite"
                                        data-target="sesion.objetivos" title="Reescribir con IA"
                                        aria-label="Reescribir con IA">
                                        <i data-lucide="sparkles" size="14"></i>
                                    </button>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Descripción de la sesión</label>
                        <textarea class="form-textarea sesion-descripcion" placeholder="Describe el desarrollo de la sesión...">${sesion.descripcion || ''}</textarea>
                                    <button type="button" class="ai-mini-btn" data-ai-action="instructions"
                                        data-target="sesion.descripcion" title="Indicaciones para la IA"
                                        aria-label="Indicaciones para la IA">
                                        <i data-lucide="message-square" size="14"></i>
                                    </button>

                                    <button type="button" class="ai-mini-btn primary" data-ai-action="rewrite"
                                        data-target="sesion.descripcion" title="Reescribir con IA"
                                        aria-label="Reescribir con IA">
                                        <i data-lucide="sparkles" size="14"></i>
                                    </button>
                    </div>
                    
                    <div class="config-section">
                        <div class="config-section-title">Configuración de Actividades</div>
                        <div class="form-group">
                            <label class="form-label">Número de actividades</label>
                            <input type="number" class="form-input sesion-num-actividades" value="${sesion.numActividades || 0}" min="0" max="10">
                        </div>
                        
                        <div class="config-actions">
                            <button class="btn btn-secondary indicaciones-btn">
                                <i data-lucide="message-square" size="16"></i>
                                Indicaciones
                            </button>
                            <button class="btn btn-primary crear-actividades-btn">
                                <i data-lucide="plus-circle" size="16"></i>
                                Crear Actividades
                            </button>
                        </div>
                    </div>
                    
                    <div class="actividades-container">
                        ${this.renderActividades(sesion.actividades)}
                    </div>
                    
                    <div class="sesion-actions">
                        ${sesion.status === 'pending' ? `
                            <button class="btn btn-adjust ajustar-btn">
                                <i data-lucide="wand-2" size="16"></i>
                                Ajustar Sesión
                            </button>
                        ` : ''}
                        ${sesion.status === 'adjusted' ? `
                            <button class="btn btn-primary guardar-btn">
                                <i data-lucide="save" size="16"></i>
                                Guardar Sesión
                            </button>
                        ` : ''}
                        ${sesion.status === 'saved' ? `
                            <button class="btn btn-secondary" disabled>
                                <i data-lucide="check" size="16"></i>
                                Sesión Guardada
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Renderiza las actividades de una sesión específica.
     * @param {*} actividades Array de objetos que representan las actividades.
     * @returns {string} HTML de las actividades.
     */
    renderActividades(actividades) {
        if (!actividades || actividades.length === 0) {
            return '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No hay actividades creadas aún.</p>';
        }
        
        return actividades.map(actividad => `
            <div class="actividad-card" data-actividad-id="${actividad.id}">
                <div class="actividad-header">
                    <h4>${actividad.titulo || 'Actividad sin título'}</h4>
                    <span class="actividad-type ${actividad.tipo}">${actividad.tipo === 'grupal' ? 'Grupal' : 'Individual'}</span>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Título</label>
                    <input type="text" class="form-input actividad-titulo" value="${actividad.titulo || ''}" placeholder="Título de la actividad">
                                    <button type="button" class="ai-mini-btn" data-ai-action="instructions"
                                        data-target="actividad.titulo" title="Indicaciones para la IA"
                                        aria-label="Indicaciones para la IA">
                                        <i data-lucide="message-square" size="14"></i>
                                    </button>

                                    <button type="button" class="ai-mini-btn primary" data-ai-action="rewrite"
                                        data-target="actividad.titulo" title="Reescribir con IA"
                                        aria-label="Reescribir con IA">
                                        <i data-lucide="sparkles" size="14"></i>
                                    </button>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Objetivos</label>
                    <textarea class="form-textarea actividad-objetivos" placeholder="Objetivos específicos de la actividad">${actividad.objetivos || ''}</textarea>
                                    <button type="button" class="ai-mini-btn" data-ai-action="instructions"
                                        data-target="actividad.objetivos" title="Indicaciones para la IA"
                                        aria-label="Indicaciones para la IA">
                                        <i data-lucide="message-square" size="14"></i>
                                    </button>

                                    <button type="button" class="ai-mini-btn primary" data-ai-action="rewrite"
                                        data-target="actividad.objetivos" title="Reescribir con IA"
                                        aria-label="Reescribir con IA">
                                        <i data-lucide="sparkles" size="14"></i>
                                    </button>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Descripción</label>
                    <textarea class="form-textarea actividad-descripcion" placeholder="Descripción detallada de la actividad">${actividad.descripcion || ''}</textarea>
                                <button type="button" class="ai-mini-btn" data-ai-action="instructions"
                                    data-target="actividad.descripcion" title="Indicaciones para la IA"
                                    aria-label="Indicaciones para la IA">
                                    <i data-lucide="message-square" size="14"></i>
                                </button>
                                <button type="button" class="ai-mini-btn primary" data-ai-action="rewrite"
                                    data-target="actividad.descripcion" title="Reescribir con IA"
                                    aria-label="Reescribir con IA">
                                    <i data-lucide="sparkles" size="14"></i>
                                </button>
                </div>
                
                <div class="evaluacion-methods">
                    <label class="form-label">Métodos de evaluación</label>
                    ${this.renderMetodosEvaluacion(actividad)}
                </div>
            </div>
        `).join('');
    }
    
    /**
     * Renderiza los métodos de evaluación para una actividad específica.
     * @param {*} actividad Objeto que representa la actividad.
     * @returns {string} HTML de los métodos de evaluación.
     */
    renderMetodosEvaluacion(actividad) {
        const metodos = [
            { id: 'rubrica', label: 'Rúbrica de evaluación' },
            { id: 'lista-control', label: 'Lista de control' },
            { id: 'lista-valoracion', label: 'Lista de valoración' },
            { id: 'autoevaluacion', label: 'Autoevaluación' },
            { id: 'coevaluacion', label: 'Coevaluación' }
        ];
        
        return metodos.map(metodo => {
            const checked = actividad.metodosEvaluacion?.includes(metodo.id) ? 'checked' : '';
            return `
                <div class="method-checkbox">
                    <input type="checkbox" id="${actividad.id}-${metodo.id}" ${checked} data-metodo="${metodo.id}">
                    <label for="${actividad.id}-${metodo.id}">${metodo.label}</label>
                </div>
            `;
        }).join('');
    }
    
    /**
     * Configura los listeners para las interacciones de las sesiones.
     */
    setupSesionListeners() {
        // Toggle sesion expansion
        document.querySelectorAll('.sesion-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const card = e.currentTarget.closest('.sesion-card');
                card.classList.toggle('expanded');
                lucide.createIcons();
            });
        });
        
        // Indicaciones button
        document.querySelectorAll('.indicaciones-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const sesionId = e.target.closest('.sesion-card').dataset.sesionId;
                this.openIndicacionesModal(sesionId);
            });
        });
        
        // Crear actividades button
        document.querySelectorAll('.crear-actividades-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const sesionId = e.target.closest('.sesion-card').dataset.sesionId;
                this.crearActividades(sesionId);
            });
        });
        
        // Ajustar button
        document.querySelectorAll('.ajustar-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const sesionId = e.target.closest('.sesion-card').dataset.sesionId;
                this.ajustarSesion(sesionId);
            });
        });
        
        // Guardar button
        document.querySelectorAll('.guardar-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const sesionId = e.target.closest('.sesion-card').dataset.sesionId;
                this.guardarSesion(sesionId);
            });
        });
        
        // Input changes
        this.setupInputListeners();
        
        // Reinitialize Lucide icons
        lucide.createIcons();
    }
    
    /**
     * Configura los listeners para los cambios en los inputs de las sesiones y actividades, actualizando el estado de la aplicación en consecuencia.
     */
    setupInputListeners() {
        // Sesion inputs
        document.querySelectorAll('.sesion-titulo, .sesion-objetivos, .sesion-descripcion, .sesion-num-actividades').forEach(input => {
            input.addEventListener('change', (e) => {
                const sesionCard = e.target.closest('.sesion-card');
                const sesionId = sesionCard.dataset.sesionId;
                const field = e.target.classList.contains('sesion-titulo') ? 'titulo' :
                             e.target.classList.contains('sesion-objetivos') ? 'objetivos' :
                             e.target.classList.contains('sesion-descripcion') ? 'descripcion' : 'numActividades';
                
                const value = field === 'numActividades' ? parseInt(e.target.value) || 0 : e.target.value;
                this.store.updateSesion(sesionId, { [field]: value });
            });
        });
        
        // Actividad inputs
        document.querySelectorAll('.actividad-titulo, .actividad-objetivos, .actividad-descripcion').forEach(input => {
            input.addEventListener('change', (e) => {
                const actividadCard = e.target.closest('.actividad-card');
                const sesionCard = e.target.closest('.sesion-card');
                const actividadId = actividadCard.dataset.actividadId;
                const sesionId = sesionCard.dataset.sesionId;
                
                const field = e.target.classList.contains('actividad-titulo') ? 'titulo' :
                             e.target.classList.contains('actividad-objetivos') ? 'objetivos' : 'descripcion';
                
                this.store.updateActividad(sesionId, actividadId, { [field]: e.target.value });
            });
        });
        
        // Evaluation methods checkboxes
        document.querySelectorAll('.method-checkbox input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const actividadCard = e.target.closest('.actividad-card');
                const sesionCard = e.target.closest('.sesion-card');
                const actividadId = actividadCard.dataset.actividadId;
                const sesionId = sesionCard.dataset.sesionId;
                const metodo = e.target.dataset.metodo;
                
                const state = this.store.getState();
                const sesion = state.sesiones.find(s => s.id === sesionId);
                const actividad = sesion?.actividades.find(a => a.id === actividadId);
                
                if (actividad) {
                    const metodos = actividad.metodosEvaluacion || [];
                    if (e.target.checked) {
                        if (!metodos.includes(metodo)) {
                            metodos.push(metodo);
                        }
                    } else {
                        const index = metodos.indexOf(metodo);
                        if (index > -1) {
                            metodos.splice(index, 1);
                        }
                    }
                    this.store.updateActividad(sesionId, actividadId, { metodosEvaluacion: metodos });
                }
            });
        });
    }
    
    /**
     * Abre un modal para que el usuario pueda ingresar indicaciones específicas para la IA, relacionadas con la creación de actividades para una sesión determinada.
     * @param {*} sesionId ID de la sesión para la cual se abrirá el modal.
     */
    openIndicacionesModal(sesionId) {
        const state = this.store.getState();
        const sesion = state.sesiones.find(s => s.id === sesionId);
        
        const modalBody = `
            <div class="form-group">
                <label class="form-label">Indicaciones para crear actividades</label>
                <textarea class="form-textarea" id="indicaciones-textarea" style="min-height: 200px;" placeholder="Describe las indicaciones que quieres dar a la IA para crear las actividades de esta sesión...">${sesion?.indicaciones || ''}</textarea>
            </div>
        `;
        
        if (window.modalComponent) {
            window.modalComponent.elements.title.textContent = `Indicaciones - Sesión ${sesion.numero}`;
            window.modalComponent.elements.body.innerHTML = modalBody;
            window.modalComponent.elements.saveButton.onclick = () => {
                const indicaciones = document.getElementById('indicaciones-textarea').value;
                this.store.updateSesion(sesionId, { indicaciones });
                window.modalComponent.close();
            };
            window.modalComponent.open();
        }
    }
    
    /**
     * Crea actividades para una sesión específica utilizando indicaciones proporcionadas por el usuario.
     * @param {*} sesionId ID de la sesión para la cual se crearán las actividades.
     * @returns {void}
     */
    crearActividades(sesionId) {
        const state = this.store.getState();
        const sesion = state.sesiones.find(s => s.id === sesionId);
        
        if (!sesion || sesion.numActividades === 0) {
            alert('Por favor, configura el número de actividades primero.');
            return;
        }
        
        // Simulate AI creating activities
        const tipos = ['grupal', 'individual'];
        const actividades = [];
        
        for (let i = 0; i < sesion.numActividades; i++) {
            actividades.push({
                tipo: tipos[Math.floor(Math.random() * tipos.length)],
                titulo: `Actividad ${i + 1}: Práctica generada`,
                objetivos: `Objetivos de la actividad ${i + 1} generados por IA`,
                descripcion: `Descripción detallada de la actividad ${i + 1} generada por IA basándose en: ${sesion.indicaciones || 'Sin indicaciones específicas'}`,
                metodosEvaluacion: []
            });
        }
        
        // Update sesion with activities
        this.store.updateSesion(sesionId, { actividades });
        
        alert(`Se han creado ${sesion.numActividades} actividades.`);
    }

    /**
     * Ajusta los metadatos de una sesión específica utilizando IA.
     * @param {*} sesionId ID de la sesión que se ajustará.
     */
    ajustarSesion(sesionId) {
        // Simulate AI adjusting session metadata
        const ajustes = {
            titulo: `Sesión ajustada: Conceptos fundamentales`,
            objetivos: `Objetivos ajustados por IA para esta sesión`,
            descripcion: `Descripción ajustada automáticamente por IA`,
            status: 'adjusted'
        };
        
        this.store.updateSesion(sesionId, ajustes);
        alert('Sesión ajustada correctamente. Revisa los campos y haz clic en Guardar.');
    }
    
    /**
     * Guarda los cambios realizados en una sesión específica.
     * @param {*} sesionId ID de la sesión que se guardará.
     */
    guardarSesion(sesionId) {
        this.store.updateSesion(sesionId, { status: 'saved' });
        alert('Sesión guardada correctamente.');
    }
}

/**
 * Inicializa el componente de desarrollo una vez que el DOM esté completamente cargado, 
 * asegurando que el elemento contenedor esté disponible para la renderización del componente.
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.desarrolloComponent = new DesarrolloComponent(window.AppStore);
    });
} else {
    window.desarrolloComponent = new DesarrolloComponent(window.AppStore);
}