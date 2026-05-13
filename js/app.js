/* ============================================
   MAIN APPLICATION
   Initialize all components and manage app lifecycle
   ============================================ */

   /**
    * Clase principal de la aplicación Planificador
    * Se encarga de inicializar los componentes, gestionar eventos globales y mantener el estado general de la aplicación.
    */
class App {
    constructor() {
        this.store = window.AppStore;
        this.components = {};
        this.isInitialized = false;
    }
    
    /**
     * Inicializa la aplicación
     * @returns {void}
     */
    init() {
        if (this.isInitialized) {
            console.warn('App already initialized');
            return;
        }
        
        console.log('🚀 Initializing Planificador Docente Pro...');
        
        // esperar a que los componentes estén disponibles antes de inicializar
        this.waitForComponents().then(() => {
            this.initializeComponents();
            this.setupGlobalEventListeners();
            this.applyInitialState();
            this.isInitialized = true;
            
            console.log('✅ App initialized successfully');
            
            // Initialize Lucide icons
            if (window.lucide) {
                lucide.createIcons();
            }
        });
    }
    
    /**
     * Espera a que los componentes globales estén disponibles antes de continuar con la inicialización
     * @returns {Promise<void>} - Devuelve una promesa que se resuelve cuando los componentes están listos o después de un tiempo máximo de espera
     */
    async waitForComponents() {
        const maxWait = 5000; // 5 seconds
        const checkInterval = 50;
        let elapsed = 0;
        
        return new Promise((resolve) => {
            const check = setInterval(() => {
                elapsed += checkInterval;
                
                if (
                    window.headerComponent &&
                    window.sidebarComponent &&
                    window.tabsComponent &&
                    window.chatComponent &&
                    window.modalComponent
                ) {
                    clearInterval(check);
                    resolve();
                } else if (elapsed >= maxWait) {
                    clearInterval(check);
                    console.warn('Some components did not load in time');
                    resolve();
                }
            }, checkInterval);
        });
    }
    
    /**
     * Inicializa las referencias a los componentes globales de la aplicación
     */
    initializeComponents() {
        this.components = {
            header: window.headerComponent,
            sidebar: window.sidebarComponent,
            tabs: window.tabsComponent,
            chat: window.chatComponent,
            modal: window.modalComponent
        };
    }
    
    /**
     * Configura los listeners de eventos globales para la aplicación, como el manejo de redimensionamiento de ventana y cambios de visibilidad.
     * También previene comportamientos por defecto no deseados como el arrastrar y soltar archivos en la ventana.
     * @returns {void}
     */
    setupGlobalEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());
        
        // Handle visibility change
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.handleVisibilityChange();
            }
        });
        
        // Prevent default drag and drop
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());
    }
    
    /**
     * Aplica el estado inicial de la aplicación, como el tema y las etiquetas de modo.
     * @returns {void}
     */
    applyInitialState() {
        const state = this.store.getState();
        
        // Set theme
        document.documentElement.setAttribute('data-theme', state.theme);
        
        // Update mode labels
        document.querySelectorAll('.mode-label').forEach(el => {
            el.textContent = state.mode;
        });
        
        document.querySelectorAll('.mode-label-full').forEach(el => {
            el.textContent = state.mode === 'UD' ? 
                'Unidad Didáctica' : 
                'Situación de Aprendizaje';
        });
    }
    
    /**
     * Maneja el redimensionamiento de la ventana
     * @returns {void}
     */
    handleResize() {
        const width = window.innerWidth;

        // Close mobile sidebars on resize to desktop
        if (width > 1024) {
            document.querySelectorAll('.sidebar').forEach(sidebar => {
                sidebar.classList.remove('open');
            });

            this.store.setState({
                leftSidebarOpen: false,
                rightSidebarOpen: false,
                sidebarClosedByResize: true // Mark that sidebars were closed by resize
            });
        } else if (width <= 1024) {
            // When resizing to mobile, ensure we reset the resize flag
            this.store.setState({
                sidebarClosedByResize: false
            });
        }
    }
    
    /**
     * Maneja los cambios de visibilidad de la ventana (cuando la pestaña se vuelve visible)
     * @returns {void}
     */
    handleVisibilityChange() {
        // Refresh Lucide icons
        if (window.lucide) {
            lucide.createIcons();
        }
    }
    
    /**
     * Obtiene información sobre la aplicación
     * @returns {Object} - Información de la aplicación
     */
    getInfo() {
        return {
            name: 'Planificador Docente Pro',
            version: '1.0.0',
            components: Object.keys(this.components),
            initialized: this.isInitialized
        };
    }
}


/**
 * Utilidades para manejar markdown en la aplicación, incluyendo renderizado a HTML, extracción de texto plano y truncado de texto.
 * Utiliza la biblioteca marked para el renderizado de markdown a HTML.
 */
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-ai-action]");
  if (!btn) return;

  const action = btn.dataset.aiAction;
  const fieldId = btn.dataset.target;
  const field = document.getElementById(fieldId);
  if (!field) return;

  const aiFieldKey = field.dataset.aiField;

  if (action === "instructions") {
    openAiInstructionsModal(aiFieldKey);
  }

  if (action === "rewrite") {
    rewriteFieldWithAI(field, aiFieldKey);
  }
});


/**
 * Inicializa la aplicación una vez que el DOM esté completamente cargado. Crea una instancia de la clase App y llama a su método init para configurar la aplicación.
 * También se asegura de que los triggers de los modales se reconfiguren cada vez que se actualicen los paneles laterales, para garantizar que los modales funcionen correctamente incluso después de cambios en la interfaz.
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.app = new App();
        window.app.init();
    });
} else {
    window.app = new App();
    window.app.init();
}

// Export for debugging
window.App = App;


/**
 * Reinitializa los triggers de los modales cuando los paneles laterales cambian.
 */
if (window.sidebarComponent) {
    const originalUpdatePanelUI = window.sidebarComponent.updatePanelUI;
    window.sidebarComponent.updatePanelUI = function(...args) {
        originalUpdatePanelUI.apply(this, args);
        // Reinitialize modal triggers after panel change
        setTimeout(() => {
            if (window.modalComponent) {
                window.modalComponent.setupTriggerItems();
            }
        }, 100);
    };
}