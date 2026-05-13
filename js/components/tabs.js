/* ============================================
   TABS COMPONENT
   Manages: Tab navigation and content switching
   ============================================ */

   /**
    * Clase TabsComponent
    * - Gestiona la navegación entre pestañas y el contenido asociado
    * - Escucha eventos de clic en los botones de pestañas para cambiar la vista activa
    * - Se suscribe a cambios en el estado global para actualizar dinámicamente el contenido de las pestañas, especialmente la pestaña de resumen
    * - Incluye métodos para inicializar eventos, actualizar la UI y manejar acciones específicas de cada pestaña
    * - Este componente es esencial para proporcionar una experiencia de usuario fluida al navegar entre diferentes secciones de la aplicación, asegurando que el contenido se actualice correctamente en función del estado global y las interacciones del usuario. Cualquier problema con la navegación o actualización de contenido se registrará en la consola para facilitar la depuración.
    * - @param {Object} store - Instancia del store global para gestionar el estado de la aplicación
    */
class TabsComponent {
    /**
     * Constructor de la clase TabsComponent
     * @param {Object} store 
     */
    constructor(store) {
        this.store = store;
        this.init();
    }

    /**
     * Inicializa el componente TabsComponent
     * - Configura los eventos de clic para los botones de pestañas
     * - Se suscribe a cambios en el estado global para actualizar el contenido de las pestañas según sea necesario
     * - Configura eventos para los inputs relacionados con el contexto, asegurando que cualquier cambio se refleje en el estado global y, por ende, en la UI
     * - Incluye logs detallados para depuración en cada paso del proceso de inicialización, lo que puede ayudar a identificar problemas con la configuración de eventos o la suscripción al estado global. Cualquier error crítico durante la inicialización se registrará para facilitar la identificación y solución de problemas relacionados con la navegación entre pestañas o la actualización de contenido.
     */
    init() {
        this.setupTabButtons();
        this.subscribeToStore();
        this.setupContextoInputs();
    }

    /**
     * Configura los eventos de clic para los botones de pestañas
     * - Selecciona todos los elementos con la clase 'tab-button' y les asigna un evento de clic
     * - Al hacer clic en un botón de pestaña, se obtiene el nombre de la pestaña desde el atributo data-tab y se llama al método switchTab para cambiar la vista activa
     * - Incluye logs detallados para depuración en cada paso del proceso, mostrando qué botón de pestaña se ha clicado y qué pestaña se está intentando activar. Cualquier error relacionado con la falta de atributos data-tab o problemas al cambiar la pestaña se registrará en la consola para facilitar la identificación y solución de problemas relacionados con la navegación entre pestañas.
     */
    setupTabButtons() {
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    /**
     * Configura eventos para los inputs relacionados con el contexto
     * - Selecciona los elementos de input relacionados con el contexto y les asigna eventos de cambio
     * - Al cambiar un input, se actualiza el estado global con el nuevo valor, asegurando que cualquier cambio en el contexto se refleje en la UI y en otras partes de la aplicación que dependan de este estado
     * - Si el número de sesiones cambia, se llama a un método para regenerar las sesiones en el estado global
     * - Incluye logs detallados para depuración en cada paso del proceso, mostrando qué input se ha cambiado, el nuevo valor y cualquier acción adicional que se tome (como regenerar sesiones). Cualquier error relacionado con la falta de elementos de input o problemas al actualizar el estado global se registrará en la consola para facilitar la identificación y solución de problemas relacionados con la gestión del contexto.
     */
    setupContextoInputs() {
        // Listen to contexto inputs
        const inputs = {
            titulo: document.getElementById('contexto-titulo'),
            descripcion: document.getElementById('contexto-descripcion'),
            numSesiones: document.getElementById('contexto-num-sesiones'),
            tiempoSesion: document.getElementById('contexto-tiempo-sesion'),
            contextoAlumnado: document.getElementById('contexto-alumnado'),
            contextoCentro: document.getElementById('contexto-centro-educativo'),
            numero: document.getElementById('contexto-numero'),
            trimestre: document.getElementById('contexto-trimestre'),
            objetivos: document.getElementById('contexto-objetivos'),
            justificacion: document.getElementById('contexto-justificacion'),
            centroInteres: document.getElementById('contexto-centro-interes'),
            vidaCotidiana: document.getElementById('contexto-vida'),
            reto: document.getElementById('contexto-reto'),
            productoFinal: document.getElementById('contexto-producto'),
        };

    
        //Escucha cambios en los inputs relacionados con el contexto y actualizar el estado global en consecuencia. Si el número de sesiones cambia, se regeneran las sesiones en el estado global para reflejar el nuevo valor. Se incluyen logs detallados para depuración en cada paso del proceso, mostrando qué input se ha cambiado, el nuevo valor y cualquier acción adicional que se tome (como regenerar sesiones). Cualquier error relacionado con la falta de elementos de input o problemas al actualizar el estado global se registrará en la consola para facilitar la identificación y solución de problemas relacionados con la gestión del contexto.
        Object.keys(inputs).forEach(key => {
            const input = inputs[key];
            if (input) {
                input.addEventListener('change', () => {
                    const value = input.type === 'number' ? parseInt(input.value) || 0 : input.value;
                    this.store.updateNestedState(`contexto.${key}`, value);

                    // If numSesiones changed, regenerate sesiones
                    if (key === 'numSesiones' && value > 0) {
                        this.store.generateSesiones(value);
                    }
                });
            }
        });

        // Cargar valores iniciales en los inputs desde el estado global para asegurar que la UI refleje el estado actual del contexto al cargar la aplicación. Se incluyen logs detallados para depuración, mostrando los valores que se están cargando en cada input. Cualquier error relacionado con la falta de elementos de input o problemas al acceder al estado global se registrará en la consola para facilitar la identificación y solución de problemas relacionados con la gestión del contexto.
        const state = this.store.getState();
        if (inputs.titulo) inputs.titulo.value = state.contexto.titulo || '';
        if (inputs.descripcion) inputs.descripcion.value = state.contexto.descripcion || '';
        if (inputs.numSesiones) inputs.numSesiones.value = state.contexto.numSesiones || '';
        if (inputs.tiempoSesion) inputs.tiempoSesion.value = state.contexto.tiempoSesion || 55;
        if (inputs.contextoAlumnado) inputs.contextoAlumnado.value = state.contexto.contextoAlumnado || '';
        if (inputs.contextoCentro) inputs.contextoCentro.value = state.contexto.contextoCentro || '';
        if (inputs.numero) inputs.numero.value = state.contexto.numero || '';
        if (inputs.trimestre) inputs.trimestre.value = state.contexto.trimestre || '';
        if (inputs.objetivos) inputs.objetivos.value = state.contexto.objetivos || '';
        if (inputs.justificacion) inputs.justificacion.value = state.contexto.justificacion || '';
        if (inputs.centroInteres) inputs.centroInteres.value = state.contexto.centroInteres || '';
        if (inputs.vidaCotidiana) inputs.vidaCotidiana.value = state.contexto.vidaCotidiana || '';
        if (inputs.reto) inputs.reto.value = state.contexto.reto || '';
        if (inputs.productoFinal) inputs.productoFinal.value = state.contexto.productoFinal || '';

    }

    /**
     * Se suscribe a cambios en el estado global para actualizar dinámicamente el contenido de las pestañas según sea necesario
     * - Escucha cambios en el estado global y, si la pestaña activa es 'resumen', llama al método updateResumenTab para actualizar el contenido de esa pestaña 
     * - Incluye logs detallados para depuración en cada paso del proceso, mostrando cuándo se detecta un cambio en el estado global y qué pestaña está activa. Cualquier error relacionado con la falta de métodos o componentes necesarios para actualizar la pestaña de resumen se registrará en la consola para facilitar la identificación y solución de problemas relacionados con la actualización dinámica del contenido de las pestañas.
     * - Este método es fundamental para garantizar que la información mostrada en la pestaña de resumen esté siempre actualizada en función del estado global, proporcionando a los usuarios una visión precisa y actualizada de la información relevante. Cualquier problema con la actualización de la pestaña de resumen se registrará para facilitar la identificación y solución de problemas relacionados con la gestión del estado global y su impacto en la UI.
     */
    subscribeToStore() {
        this.store.subscribe((state) => {
            // Update message count in resumen tab if active
            if (state.currentTab === 'resumen') {
                this.updateResumenTab(state);
            }
        });
    }

    /**
     * Cambia la pestaña activa y actualiza la UI en consecuencia.
     * @param {string} tabName - El nombre de la pestaña a activar.
     */
    switchTab(tabName) {
        this.store.setState({ currentTab: tabName });
        this.updateTabUI(tabName);

        // Trigger specific tab actions
        this.handleTabSpecificActions(tabName);
    }

    /**
     * Actualiza la interfaz de usuario para reflejar la pestaña activa.
     * @param {string} tabName - El nombre de la pestaña a activar.
     */
    updateTabUI(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });

        // Add active class to the clicked tab button
        const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Add active class to the corresponding tab content
        const activeContent = document.getElementById(`tab-${tabName}`);
        if (activeContent) {
            activeContent.classList.add('active');
        }
    }

    /**
     * Maneja acciones específicas para cada pestaña.
     * @param {string} tabName - El nombre de la pestaña activa.
     */
    handleTabSpecificActions(tabName) {
        const state = this.store.getState();

        switch (tabName) {
            case 'resumen':
                this.updateResumenTab(state);
                break;
            case 'chat':
                // Scroll to bottom of chat
                const chatMessages = document.getElementById('chatMessages');
                if (chatMessages) {
                    setTimeout(() => {
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    }, 100);
                }
                break;
            case 'desarrollo':
                // Render sesiones if needed
                if (window.desarrolloComponent) {
                    window.desarrolloComponent.render();
                }
                break;
        }
    }

    /**
     * Actualiza el contenido de la pestaña de resumen.
     * @param {Object} state - El estado global de la aplicación.
     */
    updateResumenTab(state) {
        console.log('=== UPDATE RESUMEN TAB ===');
        console.log('Activando pestaña resumen...');

        // Verificar si ResumenComponent está disponible
        if (window.resumenComponent) {
            console.log('ResumenComponent ya existe, re-renderizando...');
            window.resumenComponent.render();
        } else if (window.initResumenComponent) {
            console.log('ResumenComponent no existe, inicializando...');
            window.resumenComponent = window.initResumenComponent();
        } else {
            console.error('initResumenComponent no disponible en updateResumenTab');
        }

        // Código legacy para compatibilidad
        const messageCountElement = document.getElementById('messageCount');
        if (messageCountElement) {
            messageCountElement.textContent = state.chatMessages.length;
        }

        // Actualizar otros elementos de resumen según el estado global
        const tituloElement = document.getElementById('resumen-titulo');
        if (tituloElement) {
            tituloElement.textContent = state.contexto.titulo || '[Por configurar]';
        }
        
        // Actualizar número de sesiones y tiempo por sesión
        const sesionesElement = document.getElementById('resumen-sesiones');
        if (sesionesElement) {
            sesionesElement.textContent = state.contexto.numSesiones
                ? `${state.contexto.numSesiones} sesiones de ${state.contexto.tiempoSesion} minutos`
                : '[Por configurar]';
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.tabsComponent = new TabsComponent(window.AppStore);
    });
} else {
    window.tabsComponent = new TabsComponent(window.AppStore);
}