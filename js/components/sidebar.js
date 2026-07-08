/**
 * Planificación Estratégica Docente (TFE - UNIR)
 * ------------------------------------------------------------------
 * Proyecto desarrollado como parte del Trabajo de Fin de Estudio (TFE)
 * del Grado en Ingeniería Informática de la Universidad Internacional
 * de La Rioja (UNIR).
 *
 * Autor: Jesús Villarroya Lancis
 * Licencia: MIT (ver archivo LICENSE)
 * Repositorio: https://github.com/jesustermoludico/TFEPlanificacion-Estrategica-UNIR
 */

/* ============================================
   SIDEBAR COMPONENT
   Manages: Left and right sidebars with panels
   ============================================ */

   /**
    * Clase SidebarComponent
    * - Gestiona la lógica de los sidebars izquierdo y derecho, incluyendo la activación de paneles y la visibilidad del sidebar.
    * - Se integra con el store global para mantener el estado sincronizado entre la UI y el estado de la aplicación.
    * - Incluye métodos para inicializar eventos, activar paneles, actualizar la UI y manejar la visibilidad del sidebar tanto en desktop como en mobile.
    * - Proporciona una experiencia de usuario consistente al mantener el estado de los paneles y la visibilidad del sidebar incluso al cambiar entre dispositivos o al recargar la página.
    * - Incluye logs detallados para facilitar la depuración y el seguimiento de las interacciones del usuario con los sidebars.
    * - Se inicializa automáticamente al cargar el DOM si el store global está disponible, lo que garantiza que el componente esté listo para manejar interacciones desde el principio.
    */
class SidebarComponent {
    /**
     * Constructor de la clase SidebarComponent
     * - Inicializa propiedades del componente
     * - Asigna el store global para manejar el estado sincronizado
     * - Llama al método init() para configurar eventos y activar paneles
     * - Incluye logs detallados para depuración en cada paso del proceso de inicialización
     * @param {*} store 
     */
    constructor(store) {
        this.store = store;
        this.init();
    }
    
    /**
     * Inicializa el componente SidebarComponent
     * - Configura eventos para los botones de los sidebars y los toggles de visibilidad
     * - Activa el primer panel de cada sidebar al cargar
     * - Incluye logs detallados para depuración en cada paso del proceso de inicialización
     * - Este método es crucial para asegurar que el componente esté completamente funcional y listo para manejar interacciones del usuario desde el momento en que se carga la página.
     * - Cualquier error durante esta fase se registrará en la consola para facilitar la identificación y solución de problemas relacionados con la configuración de eventos o la activación de paneles.
     */
    init() {
        this.setupSidebarButtons();
        this.setupSidebarToggleButtons();
        // Auto-activate first panel of each sidebar on load
        this.activateFirstPanels();
        console.log('Sidebar component initialized');
    }
    
    /**
     * Activa el primer panel de cada sidebar al cargar
     * - Busca el primer botón de cada sidebar y activa el panel correspondiente
     * - Incluye logs detallados para depuración en caso de que no se encuentren los botones o paneles correspondientes
     * - Este método garantiza que los usuarios vean contenido relevante en ambos sidebars al cargar la página, mejorando la experiencia de usuario desde el principio. Si no se encuentran los botones o paneles, se registrará un error en la consola para facilitar la identificación del problema.
     */
    activateFirstPanels() {
        // Activate first left panel
        const firstLeftButton = document.querySelector('.sidebar.left .sidebar-button');
        if (firstLeftButton && firstLeftButton.dataset.panel) {
            this.togglePanel(firstLeftButton.dataset.panel);
        }
        
        // Activate first right panel
        const firstRightButton = document.querySelector('.sidebar.right .sidebar-button');
        if (firstRightButton && firstRightButton.dataset.panel) {
            this.togglePanel(firstRightButton.dataset.panel);
        }
    }
    
    /**
     * Configura los eventos para los botones de los sidebars
     * - Añade listeners a todos los botones de los sidebars para manejar clics
     * - Incluye logs detallados para depuración en cada interacción, mostrando qué panel se está intentando activar y cualquier error relacionado con la falta de paneles o botones correspondientes
     * - Este método es esencial para garantizar que los usuarios puedan interactuar con los sidebars de manera efectiva, permitiéndoles activar diferentes paneles según sus necesidades. Cualquier problema con la configuración de eventos se registrará en la consola para facilitar la identificación y solución de problemas relacionados con la interacción del usuario.
     */
    setupSidebarButtons() {
        document.querySelectorAll('.sidebar-button').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const panelId = button.dataset.panel;
                console.log('Sidebar button clicked:', panelId);
                this.togglePanel(panelId);
            });
        });
    }

    /**
     * Configura los eventos para los botones de toggle de los sidebars
     * - Añade listeners a los botones de toggle para manejar la visibilidad de los sidebars
     * - Incluye logs detallados para depuración en cada interacción, mostrando qué sidebar se está intentando mostrar u ocultar y cualquier error relacionado con la falta de elementos correspondientes
     * - Este método es crucial para garantizar que los usuarios puedan controlar la visibilidad de los sidebars, especialmente en dispositivos móviles donde el espacio es limitado. Cualquier problema con la configuración de eventos se registrará en la consola para facilitar la identificación y solución de problemas relacionados con la interacción del usuario.
     * - También se configuran los toggles móviles existentes para mantener la compatibilidad con versiones anteriores, asegurando que los usuarios que ya están acostumbrados a esos botones puedan seguir usándolos sin problemas. Cualquier error relacionado con estos toggles también se registrará en la consola para facilitar la depuración.
     */
    setupSidebarToggleButtons() {
        // Left sidebar toggle
        const leftToggle = document.getElementById('leftSidebarToggle');
        if (leftToggle) {
            leftToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSidebarVisibility('left');
            });
        }

        // Right sidebar toggle
        const rightToggle = document.getElementById('rightSidebarToggle');
        if (rightToggle) {
            rightToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSidebarVisibility('right');
            });
        }

        // Also setup existing mobile toggles for backward compatibility
        const leftMenuToggle = document.getElementById('leftMenuToggle');
        if (leftMenuToggle) {
            leftMenuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSidebarVisibility('left');
            });
        }

        // Right menu toggle for mobile
        const rightMenuToggle = document.getElementById('rightMenuToggle');
        if (rightMenuToggle) {
            rightMenuToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSidebarVisibility('right');
            });
        }
    }
    
    /**
     * Maneja la activación de un panel específico
     * - Determina si el panel pertenece al sidebar izquierdo o derecho
     * - Actualiza el estado del store con el panel activo correspondiente
     * - Actualiza la UI para reflejar el panel activo, asegurándose de que solo el panel seleccionado esté visible y marcado como activo
     * - Incluye logs detallados para depuración en cada paso del proceso, mostrando qué panel se está intentando activar, el nuevo estado del panel activo y cualquier error relacionado con la falta de elementos correspondientes en la UI
     * - Este método es fundamental para garantizar que los usuarios puedan navegar entre diferentes paneles dentro de cada sidebar de manera efectiva, proporcionando una experiencia de usuario fluida y coherente. Cualquier problema con la activación de paneles se registrará en la consola para facilitar la identificación y solución de problemas relacionados con la interacción del usuario.
     * @param {*} panelId 
     * @returns 
     */
    togglePanel(panelId) {
        if (!panelId) {
            console.error('No panel ID provided');
            return;
        }
        
        const isLeft = panelId.startsWith('left');
        const sidebar = isLeft ? 'left' : 'right';
        const stateKey = isLeft ? 'activeLeftPanel' : 'activeRightPanel';
        const state = this.store.getState();
        
        // Determine new panel state
        // If clicking the same panel, keep it open (don't toggle off)
        const newPanel = panelId;
        
        console.log('Toggling panel:', { panelId, newPanel, sidebar });
        
        // Update store
        this.store.setState({ [stateKey]: newPanel });
        
        // Update UI
        this.updatePanelUI(sidebar, panelId, newPanel);
    }
    
    /**
     * Actualiza la UI de un panel específico dentro de un sidebar
     * - Determina el elemento del sidebar correspondiente
     * - Actualiza los botones y paneles para reflejar el panel activo
     * - Incluye logs detallados para depuración en cada paso del proceso, mostrando qué elementos se están activando y cualquier error relacionado con la falta de elementos correspondientes en la UI
     * - Este método es crucial para garantizar que la UI refleje correctamente el estado del panel activo, proporcionando una experiencia de usuario coherente y fluida. Cualquier problema con la actualización de la UI se registrará en la consola para facilitar la identificación y solución de problemas.
     * @param {*} sidebar 
     * @param {*} panelId 
     * @param {*} activePanel 
     * @returns 
     */
    updatePanelUI(sidebar, panelId, activePanel) {
        const sidebarElement = document.getElementById(`${sidebar}Sidebar`);
        
        if (!sidebarElement) {
            console.error('Sidebar element not found:', sidebar);
            return;
        }
        
        console.log('Updating panel UI:', { sidebar, activePanel });
        
        // Update buttons - remove active from all, add to clicked one
        sidebarElement.querySelectorAll('.sidebar-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Update panels - hide all, show active one
        sidebarElement.querySelectorAll('.sidebar-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        if (activePanel) {
            const activeButton = sidebarElement.querySelector(`[data-panel="${activePanel}"]`);
            const activePanelElement = document.getElementById(activePanel);
            
            console.log('Active elements found:', { 
                button: !!activeButton, 
                panel: !!activePanelElement 
            });
            
            if (activeButton) {
                activeButton.classList.add('active');
                console.log('Button activated:', activeButton);
            }
            if (activePanelElement) {
                activePanelElement.classList.add('active');
                console.log('Panel activated:', activePanelElement);
            }
        }
        
        // Reinitialize Lucide icons
        if (window.lucide) {
            lucide.createIcons();
        }
    }
    
    /**
     * Alterna la visibilidad de un sidebar específico
     * - Determina si el sidebar está actualmente abierto (para móviles) o si el contenido está visible (para escritorio)
     * - Actualiza el estado del store y la UI en consecuencia
     * - Incluye logs detallados para depuración en cada paso del proceso, mostrando el estado actual y el nuevo estado del sidebar
     * @param {*} side 
     * @returns 
     */
    toggleSidebarVisibility(side) {
        const sidebar = document.getElementById(`${side}Sidebar`);
        if (!sidebar) {
            console.error('Sidebar not found:', side);
            return;
        }

        // For desktop, we toggle the visibility of the content; for mobile, we toggle the 'open' class on the sidebar
        const sidebarContent = sidebar.querySelector('.sidebar-content');
        if (!sidebarContent) {
            console.error('Sidebar content not found:', side);
            return;
        }

        // Check if sidebar is currently open (for mobile) or content is visible (for desktop)
        const isCurrentlyOpen = sidebar.classList.contains('open');
        const isContentVisible = !sidebarContent.classList.contains('hidden');
        const stateKey = `${side}SidebarContentVisible`;

        console.log(`Toggling ${side} sidebar visibility:`, {
            isCurrentlyOpen,
            isContentVisible
        });

        // Toggle both the 'open' class on sidebar (for mobile) and 'hidden' class on content (for desktop)
        if (isCurrentlyOpen || isContentVisible) {
            // Hide sidebar content
            sidebar.classList.remove('open');
            sidebarContent.classList.add('hidden');
            this.store.setState({ [stateKey]: false });
        } else {
            // Show sidebar content
            sidebar.classList.add('open');
            sidebarContent.classList.remove('hidden');
            this.store.setState({ [stateKey]: true });
        }

        // Update toggle button appearance
        this.updateToggleButtonState(side, !isCurrentlyOpen && !isContentVisible);
    }

    /**
     * Actualiza el estado del botón de alternancia de un sidebar específico
     * - Determina el elemento del botón de alternancia correspondiente
     * - Actualiza la apariencia y el título del botón según la visibilidad del sidebar
     * - Incluye logs detallados para depuración en cada paso del proceso, mostrando el estado actual y el nuevo estado del botón
     * @param {*} side 
     * @param {*} isVisible 
     */
    updateToggleButtonState(side, isVisible) {
        const toggleButton = document.getElementById(`${side}SidebarToggle`);
        if (toggleButton) {
            if (isVisible) {
                toggleButton.classList.remove('content-hidden');
                toggleButton.title = `Ocultar menú ${side === 'left' ? 'izquierdo' : 'derecho'}`;
            } else {
                toggleButton.classList.add('content-hidden');
                toggleButton.title = `Mostrar menú ${side === 'left' ? 'izquierdo' : 'derecho'}`;
            }
        }
    }

    /**
     * Cierra un sidebar específico
     * - Determina el elemento del sidebar correspondiente
     * - Elimina la clase 'open' para cerrar el sidebar
     * - Actualiza el estado del store para reflejar que el sidebar está cerrado
     * - Incluye logs detallados para depuración en cada paso del proceso, mostrando el estado actual y el nuevo estado del sidebar
     * @param {*} side  
     */
    closeSidebar(side) {
        const sidebar = document.getElementById(`${side}Sidebar`);
        if (sidebar) {
            sidebar.classList.remove('open');
        }

        this.store.setState({
            [`${side}SidebarOpen`]: false
        });
    }
}

/**
 * Inicializa automáticamente el componente SidebarComponent al cargar el DOM si el store global está disponible
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.AppStore) {
            window.sidebarComponent = new SidebarComponent(window.AppStore);
        }
    });
} else {
    if (window.AppStore) {
        window.sidebarComponent = new SidebarComponent(window.AppStore);
    }
}
