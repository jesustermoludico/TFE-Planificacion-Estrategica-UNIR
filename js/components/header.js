/* ============================================
   HEADER COMPONENT
   Manages: AI selector, theme toggle, mode switch, 
            educational level selector, user profile
   ============================================ */

/**
 * Clase que representa el componente de encabezado de la aplicación, responsable de gestionar la interfaz 
 * y las interacciones relacionadas con el tema, el modo de trabajo (UD/SdA), la selección de modelo de IA, 
 * el nivel educativo, la comunidad autónoma, la asignatura/ciclo/módulo, y el perfil de usuario. 
 * 
 * Este componente se comunica con el estado global de la aplicación para reflejar los cambios en la UI 
 * y actualizar el contexto según las selecciones del usuario.
 * 
 * Funcionalidades principales:
 * - Toggle de tema claro/oscuro
 * - Switch entre Unidad Didáctica y Situación de Aprendizaje
 * - Selector de modelo de IA (ChatGPT, Claude, Gemini)
 * - Selector de nivel educativo (FP, Secundaria) con subniveles (grado, curso)
 * - Selector de comunidad autónoma
 * - Selector de asignatura/ciclo/módulo
 * - Menú de perfil de usuario con opciones para ver perfil, configuración y cerrar sesión
 * - Gestión de sidebars en vista móvil
 * 
 * El componente se inicializa al cargar el DOM y se suscribe a los cambios en el estado global para actualizar la UI en consecuencia.
 * Además, maneja la comunicación con el context manager para mantener el contexto actualizado según las selecciones del usuario.
 */
class HeaderComponent {
    /**
     * Constructor del componente de encabezado. Recibe el store global de la aplicación para gestionar el estado y las actualizaciones de la UI.
     * @param {*} store - Store global de la aplicación.
     */
    constructor(store) {
        this.store = store;
        this.elements = {
            themeToggle: document.getElementById('themeToggle'),
            themeIcon: document.getElementById('themeIcon'),
            modeToggle: document.getElementById('modeToggle'),
            aiSelectorButton: document.getElementById('aiSelectorButton'),
            aiSelectorText: document.getElementById('aiSelectorText'),
            aiDropdown: document.getElementById('aiDropdown'),
            leftMenuToggle: document.getElementById('leftMenuToggle'),
            rightMenuToggle: document.getElementById('rightMenuToggle'),
            userProfileButton: document.getElementById('userProfileButton'),
            userDropdown: document.getElementById('userDropdown'),
            
            // Nuevos elementos para nivel educativo
            eduLevelSelector: document.getElementById('eduLevelSelector'),
            eduLevelText: document.getElementById('eduLevelText'),
            eduLevelDropdown: document.getElementById('eduLevelDropdown'),
            eduLevelIndicator: document.getElementById('eduLevelIndicator'),

            // Nuevos elementos para comunidad autónoma
            communitySelector: document.getElementById('communitySelector'),
            communityText: document.getElementById('communityText'),
            communityDropdown: document.getElementById('communityDropdown'),

            // Nuevos elementos para asignatura/ciclo/módulo
            subjectSelector: document.getElementById('subjectSelector'),
            subjectText: document.getElementById('subjectText'),
            subjectDropdown: document.getElementById('subjectDropdown')
        };

        this.init();
    }

    /**
     * Inicializa el componente configurando los event listeners, aplicando el estado inicial 
     * y suscribiéndose a los cambios en el store para actualizar la UI en consecuencia.
     */
    init() {
        this.setupEventListeners();
        this.applyInitialState();
        this.subscribeToStore();
    }
    
    /**
     * Se suscribe a los cambios en el store global de la aplicación para actualizar la interfaz de usuario
     */
    subscribeToStore() {
        this.store.subscribe((state) => {
            this.updateEducationalLevelUI(state.educationalLevel);
            this.updateModeToggleVisibility(state.educationalLevel);
        });
    }

    /**
     * Configura los event listeners para los diferentes elementos interactivos del encabezado,
     * incluyendo el toggle de tema, el switch de modo, los selectores de IA, nivel educativo, 
     * comunidad autónoma, asignatura/ciclo/módulo, y el menú de perfil de usuario.
     */
    setupEventListeners() {
        // Theme toggle
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());

        // Mode toggle (UD/SdA)
        if (this.elements.modeToggle) {
            this.elements.modeToggle.addEventListener('click', () => this.toggleMode());
        }

        // AI Selector
        this.elements.aiSelectorButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleAIDropdown();
        });

        // AI Options
        document.querySelectorAll('.ai-option').forEach(option => {
            option.addEventListener('click', () => {
                this.selectAI(option.dataset.ai);
            });
        });
        
        // ============================================
        // Educational Level Selector
        // ============================================
        if (this.elements.eduLevelSelector) {
            this.elements.eduLevelSelector.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleEduLevelDropdown();
            });
        }
        
        // Educational Level Options
        document.querySelectorAll('.edu-level-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const level = option.dataset.level;
                this.selectEducationalLevel(level);
            });
        });
        
        // Sub-level selectors (FP Grade, SEC Level, Course)
        document.querySelectorAll('.edu-sublevel-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const type = option.dataset.type;
                const value = option.dataset.value;
                this.selectSubLevel(type, value);
            });
        });

        // ============================================
        // Community Selector
        // ============================================
        if (this.elements.communitySelector) {
            this.elements.communitySelector.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleCommunityDropdown();
            });
        }

        // Community Options
        document.querySelectorAll('[data-community]').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const community = option.dataset.community;
                this.selectCommunity(community);
            });
        });

        // ============================================
        // Subject/Cycle/Module Selector
        // ============================================
        if (this.elements.subjectSelector) {
            this.elements.subjectSelector.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleSubjectDropdown();
            });
        }

        // User Profile
        this.elements.userProfileButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleUserDropdown();
        });

        // User dropdown actions
        document.querySelectorAll('.user-dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                this.handleUserAction(action);
            });
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (this.elements.aiDropdown && !this.elements.aiDropdown.contains(e.target)) {
                this.closeAIDropdown();
            }
            if (this.elements.userDropdown && !this.elements.userDropdown.contains(e.target)) {
                this.closeUserDropdown();
            }
            if (this.elements.eduLevelDropdown && !this.elements.eduLevelDropdown.contains(e.target)) {
                this.closeEduLevelDropdown();
            }
            if (this.elements.communityDropdown && !this.elements.communityDropdown.contains(e.target)) {
                this.closeCommunityDropdown();
            }
            if (this.elements.subjectDropdown && !this.elements.subjectDropdown.contains(e.target)) {
                this.closeSubjectDropdown();
            }

            // Close mobile sidebars when clicking on backdrop
            const openSidebar = document.querySelector('.sidebar.open');
            if (openSidebar) {
                const sidebarContent = openSidebar.querySelector('.sidebar-content');
                const sidebarButtons = openSidebar.querySelector('.sidebar-buttons');

                // If clicked outside sidebar content and buttons (on backdrop)
                if (!sidebarContent.contains(e.target) && !sidebarButtons.contains(e.target)) {
                    const side = openSidebar.classList.contains('left') ? 'left' : 'right';
                    this.toggleMobileSidebar(side);
                }
            }
        });

        // Mobile menu toggles
        if (this.elements.leftMenuToggle) {
            this.elements.leftMenuToggle.addEventListener('click', () => {
                this.toggleMobileSidebar('left');
            });
        }

        if (this.elements.rightMenuToggle) {
            this.elements.rightMenuToggle.addEventListener('click', () => {
                this.toggleMobileSidebar('right');
            });
        }
    }

    /**
     * Aplica el estado inicial del componente de encabezado basado en el estado global de la aplicación.
     * Esto incluye la configuración del tema, el modo, el modelo de IA, el nivel educativo, la comunidad,
     * y la inicialización del gestor de contexto con los valores actuales.
     */
    applyInitialState() {
        const state = this.store.getState();

        // Aplicar tema
        document.documentElement.setAttribute('data-theme', state.theme);
        this.updateThemeIcon(state.theme);

        // Aplicar modo (UD / SdA)
        document.body.setAttribute('data-mode', state.mode);

        if (this.elements.modeToggle) {
            if (state.mode === 'SdA') {
                this.elements.modeToggle.classList.add('active');
            } else {
                this.elements.modeToggle.classList.remove('active');
            }
        }

        this.updateModeLabels(state.mode);

        // Aplicar modelo de IA
        this.updateAISelector(state.aiModel);
        
        // Aplicar nivel educativo
        this.updateEducationalLevelUI(state.educationalLevel);
        document.body.setAttribute('data-edu-level', state.educationalLevel);

        // Actualizar panel curricular con elementos e indicadores
        this.updateCurricularPanel(state.educationalLevel);

        // Mostrar/ocultar toggle UD/SdA según nivel
        this.updateModeToggleVisibility(state.educationalLevel);

        // Initialize community selector
        this.updateCommunityUI(state.community);

        // Initialize context manager with current state
        // Wait for context manager to be ready
        setTimeout(() => {
            if (window.contextManager) {
                console.log('Initializing context manager from header component');
                window.contextManager.setCommunity(state.community);
                window.contextManager.setEducationLevel(state.educationalLevel);
                if (state.fpGrade) window.contextManager.setFPGrade(state.fpGrade);
                if (state.secLevel) window.contextManager.setSecLevel(state.secLevel);
                if (state.secCourse) window.contextManager.setSecCourse(state.secCourse);
            } else {
                console.warn('Context manager not available during header initialization');
            }
        }, 100);
    }

    /**
     * Alterna entre el tema claro y oscuro de la aplicación, actualizando el estado global, el atributo del documento y el icono del toggle en consecuencia.
     * También se asegura de que el icono refleje el tema actual después del cambio.
     */
    toggleTheme() {
        const state = this.store.getState();
        const newTheme = state.theme === 'light' ? 'dark' : 'light';

        this.store.setState({ theme: newTheme });
        document.documentElement.setAttribute('data-theme', newTheme);
        this.updateThemeIcon(newTheme);
    }

    /**
     * Actualiza el icono del toggle de tema según el tema actual.
     * @param {string} theme - El tema actual ('light' o 'dark').
     */
    updateThemeIcon(theme) {
        const icon = this.elements.themeIcon;
        if (icon) {
            icon.setAttribute('data-lucide', theme === 'light' ? 'moon' : 'sun');
            lucide.createIcons();
        }
    }

    /**
     * Alterna entre los modos de trabajo "Unidad Didáctica" y "Situación de Aprendizaje",
     * actualizando el estado global, el atributo del body para CSS condicional, y las etiquetas en la UI para reflejar el modo seleccionado.
     * 
     */
    toggleMode() {
        const state = this.store.getState();
        const newMode = state.mode === 'UD' ? 'SdA' : 'UD';

        this.store.setState({ mode: newMode });

        // Esto es CLAVE para el CSS condicional
        document.body.setAttribute('data-mode', newMode);

        if (this.elements.modeToggle) {
            if (newMode === 'SdA') {
                this.elements.modeToggle.classList.add('active');
            } else {
                this.elements.modeToggle.classList.remove('active');
            }
        }

        this.updateModeLabels(newMode);
    }
    
    /**
     * Actualiza la visibilidad del toggle de modo según el nivel educativo.
     * @param {string} eduLevel - El nivel educativo actual ('FP' o 'Secundaria').
     */
    updateModeToggleVisibility(eduLevel) {
        // El toggle UD/SdA está disponible tanto en FP como en Secundaria
        // En ambos niveles educativos se pueden usar Unidades Didácticas 
        // y Situaciones de Aprendizaje
        const modeContainer = document.querySelector('.mode-toggle-container');
        if (modeContainer) {
            modeContainer.classList.remove('disabled');
            modeContainer.title = '';
        }
    }

    /**
     * Actualiza las etiquetas de modo según el modo actual.
     * @param {string} mode - El modo actual ('UD' o 'SdA').
     */
    updateModeLabels(mode) {
        document.querySelectorAll('.mode-label').forEach(label => {
            label.textContent = mode;
        });

        document.querySelectorAll('.mode-label-full').forEach(label => {
            label.textContent = mode === 'UD' ? 'Unidad Didáctica' : 'Situación de Aprendizaje';
        });
    }

    /**
     * Alterna la visibilidad del dropdown de selección de modelo de IA, asegurándose de cerrar otros dropdowns para evitar superposiciones.
     * Si el dropdown de IA se muestra, se cierra el de usuario y el de nivel educativo para mantener una interfaz limpia y evitar confusiones al usuario.
     */
    toggleAIDropdown() {
        if (this.elements.aiDropdown) {
            this.elements.aiDropdown.classList.toggle('show');
        }
        this.closeUserDropdown();
        this.closeEduLevelDropdown();
    }

    /**
     * Cierra el dropdown de selección de modelo de IA, eliminando la clase 'show' que controla su visibilidad.
     */
    closeAIDropdown() {
        if (this.elements.aiDropdown) {
            this.elements.aiDropdown.classList.remove('show');
        }
    }

    /**
     * Selecciona un modelo de IA y actualiza el estado y la UI en consecuencia.
     * @param {string} aiModel - El modelo de IA seleccionado ('chatgpt', 'claude', 'gemini').
     */
    selectAI(aiModel) {
        this.store.setState({ aiModel });
        this.updateAISelector(aiModel);
        this.closeAIDropdown();
    }

    /**
     * Actualiza la UI del selector de IA según el modelo seleccionado.
     * @param {string} aiModel - El modelo de IA seleccionado ('chatgpt', 'claude', 'gemini').
     */
    updateAISelector(aiModel) {
        const aiNames = {
            chatgpt: 'ChatGPT 5.2',
            claude: 'Claude Sonnet 4.5',
            gemini: 'Gemini 2.0 Flash'
        };

        if (this.elements.aiSelectorText) {
            this.elements.aiSelectorText.textContent = aiNames[aiModel] || aiNames.chatgpt;
        }

        // Update selected state in dropdown
        document.querySelectorAll('.ai-option').forEach(option => {
            option.classList.toggle('selected', option.dataset.ai === aiModel);
        });
    }
    
    // ============================================
    // Educational Level Methods
    // ============================================
    
    /**
     * Alterna la visibilidad del dropdown de selección de nivel educativo, asegurándose de cerrar otros dropdowns para evitar superposiciones.
     * Si el dropdown de nivel educativo se muestra, se cierra el de IA y el de usuario para mantener una interfaz limpia y evitar confusiones al usuario.
     */
    toggleEduLevelDropdown() {
        if (this.elements.eduLevelDropdown) {
            this.elements.eduLevelDropdown.classList.toggle('show');
        }
        this.closeAIDropdown();
        this.closeUserDropdown();
    }
    
    /**
     * Cierra el dropdown de selección de nivel educativo, eliminando la clase 'show' que controla su visibilidad.
     */
    closeEduLevelDropdown() {
        if (this.elements.eduLevelDropdown) {
            this.elements.eduLevelDropdown.classList.remove('show');
        }
    }

    /**
     * Selecciona un nivel educativo y actualiza el estado y la UI en consecuencia.
     * @param {string} level - El nivel educativo seleccionado ('FP' o 'SEC').
     */
    selectEducationalLevel(level) {
        this.store.setEducationalLevel(level);
        this.updateEducationalLevelUI(level);
        this.closeEduLevelDropdown();

        // Update context manager
        if (window.contextManager) {
            window.contextManager.setEducationLevel(level);
        }

        // Actualizar la UI de la aplicación
        this.updateAppForEducationalLevel(level);
    }
    
    /**
     * Selecciona un subnivel educativo y actualiza el estado y la UI en consecuencia.
     * @param {string} type - El tipo de subnivel ('fpGrade', 'secLevel', 'secCourse').
     * @param {string} value - El valor del subnivel seleccionado.
     */
    selectSubLevel(type, value) {
        console.log('selectSubLevel called:', { type, value });
        switch(type) {
            case 'fpGrade':
                this.store.setFPGrade(value);
                // Update context manager for FP grade
                if (window.contextManager) {
                    console.log('Calling context manager setFPGrade:', value);
                    window.contextManager.setFPGrade(value);
                } else {
                    console.warn('Context manager not available for setFPGrade');
                }
                break;
            case 'secLevel':
                this.store.setSecLevel(value);
                // Actualizar cursos disponibles cuando cambia entre ESO y Bach
                this.updateAvailableCourses(value);
                // Update context manager for secondary level
                if (window.contextManager) {
                    window.contextManager.setSecLevel(value);
                }
                break;
            case 'secCourse':
                this.store.setSecCourse(value);
                // Update context manager for secondary course
                if (window.contextManager) {
                    window.contextManager.setSecCourse(value);
                }
                break;
        }
        this.updateEducationalLevelUI(this.store.getState().educationalLevel);
    }
    
    /**
     * Actualiza la UI del selector de nivel educativo según el nivel seleccionado.
     * @param {string} level - El nivel educativo seleccionado ('FP' o 'SEC').
     */
    updateEducationalLevelUI(level) {
        const state = this.store.getState();
        const terminology = this.store.getTerminology();
        
        // Actualizar texto del selector
        if (this.elements.eduLevelText) {
            if (level === 'FP') {
                this.elements.eduLevelText.textContent = `FP ${terminology.gradeName}`;
            } else {
                this.elements.eduLevelText.textContent = `${state.secLevel} ${state.secCourse}º`;
            }
        }
        
        // Actualizar indicador visual
        if (this.elements.eduLevelIndicator) {
            this.elements.eduLevelIndicator.className = `edu-level-indicator ${level.toLowerCase()}`;
        }
        
        // Actualizar atributo del body para CSS
        document.body.setAttribute('data-edu-level', level);
        
        // Actualizar opciones seleccionadas en dropdown principal
        document.querySelectorAll('.edu-level-option').forEach(option => {
            option.classList.toggle('selected', option.dataset.level === level);
        });
        
        // Mostrar/ocultar submenús
        const fpSubmenu = document.getElementById('fpSubmenu');
        const secSubmenu = document.getElementById('secSubmenu');
        
        if (fpSubmenu) fpSubmenu.style.display = level === 'FP' ? 'block' : 'none';
        if (secSubmenu) secSubmenu.style.display = level === 'SEC' ? 'block' : 'none';
        
        // Actualizar cursos disponibles según ESO o Bachillerato
        this.updateAvailableCourses(state.secLevel);
        
        // Actualizar selección de subniveles - limpiar todas las selecciones primero
        document.querySelectorAll('.edu-sublevel-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        // Marcar las opciones seleccionadas
        document.querySelectorAll('.edu-sublevel-option').forEach(option => {
            const type = option.dataset.type;
            const value = option.dataset.value;
            
            let isSelected = false;
            if (type === 'fpGrade' && level === 'FP') {
                isSelected = state.fpGrade === value;
            }
            if (type === 'secLevel' && level === 'SEC') {
                isSelected = state.secLevel === value;
            }
            if (type === 'secCourse' && level === 'SEC') {
                isSelected = state.secCourse === value;
            }
            
            if (isSelected) {
                option.classList.add('selected');
            }
        });
    }
    
    /**
     * Actualiza los cursos disponibles según el nivel educativo secundario (ESO o Bachillerato).
     * @param {string} secLevel - El nivel educativo secundario ('ESO' o 'BACH').
     */
    updateAvailableCourses(secLevel) {
        const coursesContainer = document.getElementById('secCoursesContainer');
        if (!coursesContainer) return;
        
        const state = this.store.getState();
        const maxCourses = secLevel === 'BACH' ? 2 : 4;
        
        // Generar los botones de curso
        let coursesHTML = '';
        for (let i = 1; i <= maxCourses; i++) {
            const isSelected = state.secCourse === String(i);
            coursesHTML += `<div class="edu-sublevel-option ${isSelected ? 'selected' : ''}" data-type="secCourse" data-value="${i}">${i}º</div>`;
        }
        
        coursesContainer.innerHTML = coursesHTML;
        
        // Reasignar event listeners a los nuevos botones
        coursesContainer.querySelectorAll('.edu-sublevel-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = option.dataset.value;
                this.selectSubLevel('secCourse', value);
            });
        });
        
        // Si el curso actual es mayor que el máximo permitido, ajustar
        if (parseInt(state.secCourse) > maxCourses) {
            this.store.setSecCourse('1');
        }
    }
    
    /**
     * Actualiza la aplicación según el nivel educativo seleccionado.
     * @param {string} level - El nivel educativo seleccionado ('FP' o 'SEC').
     */
    updateAppForEducationalLevel(level) {
        // Actualizar sidebar derecho con elementos curriculares
        this.updateCurricularPanel(level);
        
        // Actualizar terminología en toda la app
        this.updateTerminology();
        
        // Reinicializar iconos
        if (window.lucide) {
            lucide.createIcons();
        }
    }
    
    /**
     * Actualiza el panel curricular según el nivel educativo seleccionado.
     * @param {string} level - El nivel educativo seleccionado ('FP' o 'SEC').
     */
    updateCurricularPanel(level) {
        const elements = this.store.getCurricularElements();
        const panel = document.getElementById('right-panel-1');
        
        if (!panel) return;
        
        // Reconstruir el panel con los elementos correctos
        let html = '<div class="panel-title">Diseño Curricular</div>';
        
        elements.forEach(el => {
            const highlightClass = el.highlight ? 'highlight' : '';
            html += `<div class="panel-item ${highlightClass}" data-dc="${el.key}">${el.label}</div>`;
        });
        
        panel.innerHTML = html;
        
        // Reasignar event listeners
        if (window.modalComponent) {
            window.modalComponent.setupTriggerItems();
        }
    }
    
    /**
     * Actualiza la terminología en toda la aplicación según el estado actual.
     */
    updateTerminology() {
        const terminology = this.store.getTerminology();
        
        // Actualizar etiquetas de modo
        document.querySelectorAll('.mode-label').forEach(label => {
            label.textContent = terminology.unitNameShort;
        });
        
        document.querySelectorAll('.mode-label-full').forEach(label => {
            label.textContent = terminology.unitName;
        });
        
        // Actualizar etiquetas específicas
        document.querySelectorAll('[data-term="subject"]').forEach(el => {
            el.textContent = terminology.subjectName;
        });
        
        document.querySelectorAll('[data-term="learningOutcome"]').forEach(el => {
            el.textContent = terminology.learningOutcome;
        });
        
        document.querySelectorAll('[data-term="contents"]').forEach(el => {
            el.textContent = terminology.contents;
        });
    }

    /**
     * Alterna la visibilidad del dropdown de perfil de usuario, asegurándose de cerrar otros dropdowns para evitar superposiciones.
     */
    toggleUserDropdown() {
        if (this.elements.userDropdown) {
            this.elements.userDropdown.classList.toggle('show');
        }
        this.closeAIDropdown();
        this.closeEduLevelDropdown();
    }

    /**
     * Cierra el dropdown de perfil de usuario, eliminando la clase 'show' que controla su visibilidad.
     */
    closeUserDropdown() {
        if (this.elements.userDropdown) {
            this.elements.userDropdown.classList.remove('show');
        }
    }

    /**
     * Maneja las acciones del usuario desde el dropdown de perfil.
     * @param {string} action - La acción seleccionada ('profile', 'settings', 'logout').
     */
    handleUserAction(action) {
        switch (action) {
            case 'profile':
                console.log('Abrir perfil de usuario');
                alert('Funcionalidad de perfil - Próximamente');
                break;
            case 'settings':
                console.log('Abrir configuración');
                alert('Funcionalidad de configuración - Próximamente');
                break;
            case 'logout':
                if (confirm('¿Estás seguro de que quieres salir?')) {
                    console.log('Cerrar sesión');
                    this.store.clearState();
                    window.location.reload();
                }
                break;
        }
        this.closeUserDropdown();
    }

    /**
     * Alterna la visibilidad de la barra lateral móvil, asegurándose de cerrar la otra barra lateral para evitar superposiciones.
     * @param {string} side - El lado de la barra lateral ('left' o 'right').
     */
    toggleMobileSidebar(side) {
        const sidebar = document.getElementById(`${side}Sidebar`);
        if (!sidebar) return;

        const state = this.store.getState();
        const isCurrentlyOpen = sidebar.classList.contains('open');

        // Close the other sidebar first
        const otherSide = side === 'left' ? 'right' : 'left';
        const otherSidebar = document.getElementById(`${otherSide}Sidebar`);
        if (otherSidebar) {
            otherSidebar.classList.remove('open');
        }

        // If this is the first interaction after a resize that closed sidebars,
        // programmatically force the sidebar to open
        if (state.sidebarClosedByResize && !isCurrentlyOpen) {
            sidebar.classList.add('open');

            // Reset the resize flag since we've handled the first interaction
            this.store.setState({
                [`${side}SidebarOpen`]: true,
                [`${otherSide}SidebarOpen`]: false,
                sidebarClosedByResize: false
            });
        } else {
            // Normal toggle behavior
            if (isCurrentlyOpen) {
                sidebar.classList.remove('open');
            } else {
                sidebar.classList.add('open');
            }

            // Update store to match actual DOM state
            this.store.setState({
                [`${side}SidebarOpen`]: !isCurrentlyOpen,
                [`${otherSide}SidebarOpen`]: false
            });
        }

        // Manage body overflow to prevent white background issues
        const hasOpenSidebar = document.querySelector('.sidebar.open');
        document.body.style.overflow = hasOpenSidebar ? 'hidden' : '';
    }

    // ============================================
    // Community Selector Methods
    // ============================================

    /**
     * Alterna la visibilidad del dropdown de selección de comunidad autónoma, asegurándose de cerrar otros dropdowns para evitar superposiciones.
     */
    toggleCommunityDropdown() {
        if (this.elements.communityDropdown) {
            this.elements.communityDropdown.classList.toggle('show');
        }
        this.closeAIDropdown();
        this.closeUserDropdown();
        this.closeEduLevelDropdown();
        this.closeSubjectDropdown();
    }
    /**
     * Cierra el dropdown de selección de comunidad autónoma, eliminando la clase 'show' que controla su visibilidad.
     */
    closeCommunityDropdown() {
        if (this.elements.communityDropdown) {
            this.elements.communityDropdown.classList.remove('show');
        }
    }

    /**
     * Selecciona una comunidad autónoma y actualiza la interfaz de usuario y el estado de la aplicación.
     * @param {string} community - El identificador de la comunidad seleccionada.
     */
    selectCommunity(community) {
        console.log('selectCommunity called:', community);
        this.store.setCommunity(community);
        this.updateCommunityUI(community);
        this.closeCommunityDropdown();

        // Update context manager
        if (window.contextManager) {
            console.log('Calling context manager setCommunity:', community);
            window.contextManager.setCommunity(community);
        } else {
            console.warn('Context manager not available for setCommunity');
        }
    }

    /**
     * Actualiza la interfaz de usuario para reflejar la comunidad autónoma seleccionada.
     * @param {string} community - El identificador de la comunidad seleccionada.
     */
    updateCommunityUI(community) {
        const communityNames = {
            'aragon': 'Aragón',
            'andalucia': 'Andalucía',
            'asturias': 'Asturias',
            'baleares': 'Baleares',
            'canarias': 'Canarias',
            'cantabria': 'Cantabria',
            'castilla_la_mancha': 'Castilla-La Mancha',
            'castilla_leon': 'Castilla y León',
            'cataluna': 'Cataluña',
            'extremadura': 'Extremadura',
            'galicia': 'Galicia',
            'la_rioja': 'La Rioja',
            'madrid': 'Madrid',
            'murcia': 'Murcia',
            'navarra': 'Navarra',
            'pais_vasco': 'País Vasco',
            'valencia': 'Valencia'
        };

        if (this.elements.communityText) {
            this.elements.communityText.textContent = communityNames[community] || 'Seleccionar...';
        }

        // Update selected state in dropdown
        document.querySelectorAll('[data-community]').forEach(option => {
            option.classList.toggle('selected', option.dataset.community === community);
        });
    }

    // ============================================
    // Subject/Cycle/Module Selector Methods
    // ============================================
    /**
     * Alterna la visibilidad del dropdown de selección de asignatura, asegurándose de cerrar otros dropdowns para evitar superposiciones.
     */
    toggleSubjectDropdown() {
        if (this.elements.subjectDropdown) {
            this.elements.subjectDropdown.classList.toggle('show');
        }
        this.closeAIDropdown();
        this.closeUserDropdown();
        this.closeEduLevelDropdown();
        this.closeCommunityDropdown();
    }

    /**
     * Cierra el dropdown de selección de asignatura, eliminando la clase 'show' que controla su visibilidad.
     */
    closeSubjectDropdown() {
        if (this.elements.subjectDropdown) {
            this.elements.subjectDropdown.classList.remove('show');
        }
    }

    /**
     * Actualiza el selector de asignatura/ciclo/módulo según el nivel educativo y los subniveles seleccionados.
     */
    async updateSubjectSelector() {
        // This method is now handled by context_management.js
        // The context manager will update the subject dropdown automatically
        console.log('updateSubjectSelector called - delegating to context manager');
    }

    // loadCycles method removed - now handled by context_management.js

    /**
     * Carga las asignaturas de educación secundaria según el nivel y curso seleccionados.
     */
    loadSecondarySubjects() {
        // For secondary education, load subjects based on level and course
        const state = this.store.getState();
        const subjects = this.getSecondarySubjects(state.secLevel, state.secCourse);

        let html = '';
        subjects.forEach(subject => {
            html += `
                <div class="edu-level-option" data-type="subject" data-value="${subject.id}">
                    <div class="edu-level-option-content">
                        <div class="edu-level-option-title">${subject.name}</div>
                    </div>
                    <i data-lucide="check" class="edu-level-option-check" size="18"></i>
                </div>
            `;
        });

        if (html === '') {
            html = `
                <div class="edu-level-option" data-type="placeholder">
                    <div class="edu-level-option-content">
                        <div class="edu-level-option-title">Seleccione nivel y curso</div>
                    </div>
                </div>
            `;
        }

        this.elements.subjectDropdown.innerHTML = html;

        // Re-initialize Lucide icons
        if (window.lucide) {
            lucide.createIcons();
        }

        // Add event listeners to new options
        this.addSubjectEventListeners();
    }

    /**
     * Obtiene las asignaturas de educación secundaria según el nivel y curso seleccionados.
     * @param {string} level - El nivel educativo (ESO, BACH).
     * @param {string} course - El curso dentro del nivel educativo.
     * @returns {Array} - Lista de asignaturas disponibles.
     */ 
    getSecondarySubjects(level, course) {
        // This is a simplified example - in reality you'd load from JSON files
        const subjects = {
            'ESO': {
                '1': [
                    { id: 'lengua', name: 'Lengua Castellana y Literatura' },
                    { id: 'matematicas', name: 'Matemáticas' },
                    { id: 'ingles', name: 'Primera Lengua Extranjera (Inglés)' },
                    { id: 'ciencias', name: 'Ciencias de la Naturaleza' },
                    { id: 'geografia', name: 'Geografía e Historia' }
                ],
                '2': [
                    { id: 'lengua', name: 'Lengua Castellana y Literatura' },
                    { id: 'matematicas', name: 'Matemáticas' },
                    { id: 'ingles', name: 'Primera Lengua Extranjera (Inglés)' },
                    { id: 'fisica', name: 'Física y Química' },
                    { id: 'geografia', name: 'Geografía e Historia' }
                ],
                '3': [
                    { id: 'lengua', name: 'Lengua Castellana y Literatura' },
                    { id: 'matematicas', name: 'Matemáticas' },
                    { id: 'ingles', name: 'Primera Lengua Extranjera (Inglés)' },
                    { id: 'fisica', name: 'Física y Química' },
                    { id: 'biologia', name: 'Biología y Geología' }
                ],
                '4': [
                    { id: 'lengua', name: 'Lengua Castellana y Literatura' },
                    { id: 'matematicas', name: 'Matemáticas' },
                    { id: 'ingles', name: 'Primera Lengua Extranjera (Inglés)' },
                    { id: 'historia', name: 'Historia de España' }
                ]
            },
            'BACH': {
                '1': [
                    { id: 'lengua', name: 'Lengua Castellana y Literatura I' },
                    { id: 'matematicas', name: 'Matemáticas I' },
                    { id: 'ingles', name: 'Primera Lengua Extranjera I' },
                    { id: 'filosofia', name: 'Filosofía' }
                ],
                '2': [
                    { id: 'lengua', name: 'Lengua Castellana y Literatura II' },
                    { id: 'matematicas', name: 'Matemáticas II' },
                    { id: 'ingles', name: 'Primera Lengua Extranjera II' },
                    { id: 'historia', name: 'Historia de España' }
                ]
            }
        };

        return subjects[level]?.[course] || [];
    }

    // addSubjectEventListeners method removed - now handled by context_management.js

    // selectSubject and selectModule methods removed - now handled by context_management.js

    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
}

/**
 * Inicializa el componente de encabezado cuando el DOM está listo.
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.headerComponent = new HeaderComponent(window.AppStore);
    });
} else {
    window.headerComponent = new HeaderComponent(window.AppStore);
}
