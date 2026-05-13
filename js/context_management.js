/**
 * Context Management System - Versión Simplificada
 * Solo maneja requisitos 1.1.1 y 1.1.2: ciclos de FP por grado y cambio de comunidad
 */

/**
 * Inicialización del soporte para elementos de secundaria
 * Incluye funciones de utilidad para manejar markdown en la aplicación, incluyendo renderizado a HTML, extracción de texto plano y truncado de texto.
 * Utiliza la biblioteca marked para el renderizado de markdown a HTML.
 * Incluye:
 * - render: Renderiza markdown a HTML utilizando la biblioteca marked.
 * - toPlainText: Extrae texto plano de una cadena markdown eliminando caracteres especiales.
 * - truncate: Trunca el texto markdown a una longitud máxima, devolviendo solo el texto plano.
 * - sanitizeResponse: Limpia una cadena de texto para extraer solo el JSON relevante, eliminando markdown, bloques de código y texto explicativo común.
 * - validateSecondaryDescriptionData: Función de validación para verificar que todos los datos necesarios están disponibles para el popup de descripción de secundaria.
 * - initSecondarySupport: Función de inicialización para configurar el soporte adicional de secundaria, incluyendo la configuración de event handlers específicos para elementos de secundaria.
 * - setupSecondaryEventHandlers: Configura los event handlers específicos para elementos de secundaria, como la actualización de datos en el popup de descripción cuando se selecciona una asignatura de secundaria.
 * @returns {void}
 */
const ASIGNATURAS_SECUNDARIA = {
    "ESO": {
        "1": [
            { nombre: "Música 1", archivo: "musica_1eso.json" },
        ],
        "2": [
            { nombre: "Música 1", archivo: "musica_1eso.json" },
        ],
        "3": [
            { nombre: "Música 3", archivo: "musica_3eso.json" },
        ],
        "4": [
            { nombre: "Música 4", archivo: "musica_4eso.json" },
        ]
    },
    "BACH": {
        "1": [
            { nombre: "Música I Optativa", archivo: "musica_1bach.json" },
        ],
        "2": [
            { nombre: "Música I Optativa", archivo: "musica_1bach.json" },
        ]
    }
};
/**
 * Clase ContextManager - Maneja el contexto de la aplicación, incluyendo comunidad, nivel educativo, grado y ciclo.
 * Proporciona métodos para actualizar el contexto y gestionar la visualización de módulos y asignaturas.
 * Incluye:
 * - setCommunity: Actualiza la comunidad autónoma seleccionada y recarga los ciclos de la nueva comunidad.
 * - setEducationLevel: Actualiza el nivel educativo (FP o SEC) y actualiza el selector de asignaturas.
 * - setFPGrade: Actualiza el grado de FP seleccionado y actualiza el selector de ciclos.
 * - setSecLevel: Actualiza el nivel de Secundaria seleccionado y actualiza el selector de asignaturas.
 * - setSecCourse: Actualiza el curso de Secundaria seleccionado y actualiza el selector de asignaturas.
 * - updateSubjectSelector: Actualiza el selector de ciclos o asignaturas basado en el contexto actual, cargando los datos necesarios y generando el HTML correspondiente.
 * - loadCyclesForGrade: Carga los ciclos disponibles para el grado actual de FP, filtrando por grado y comunidad, y generando el HTML para el selector.
 * - generateModulesMenu: Genera el menú de módulos al hacer hover sobre un ciclo, mostrando solo el titulo_modulo en un menú más ancho.
 * - scanCyclesForGrade: Escanea los ciclos disponibles para un grado específico, filtrando archivos con patrón {nombre}_{grado}.json.
 * - loadSubjectsForSecondary: Carga las asignaturas disponibles para Educación Secundaria, filtrando por nivel y curso, y verificando que existan los archivos correspondientes.
 * - addCycleEventListeners: Agrega event listeners para las opciones de ciclo, incluyendo selección de ciclo y mostrar/ocultar menú de módulos.
 * - addSubjectEventListeners: Agrega event listeners para las opciones de asignaturas de Secundaria, manejando la selección de asignatura.
 * - showModulesMenu: Muestra el menú de módulos al hacer hover sobre un ciclo.
 * - hideModulesMenu: Oculta el menú de módulos.
 * - selectCycle: Maneja la selección de un ciclo de FP, actualizando el contexto y la UI del botón.
 * - selectModule: Maneja la selección de un módulo dentro de un ciclo de FP, actualizando el contexto y la UI del botón.
 * - selectSubject: Maneja la selección de una asignatura de Secundaria, actualizando el contexto y la UI del botón.
 * - hideSelectedModuleDisplay: Oculta la sección de visualización del módulo seleccionado, utilizada para resetear la UI al cambiar de contexto.
 * - handleResize: Maneja los cambios de tamaño de la ventana para ajustar la visualización de los paneles laterales y resetear el estado de cierre por resize.
 * - handleVisibilityChange: Maneja los cambios de visibilidad de la ventana (cuando la pestaña se vuelve visible) para refrescar los iconos de Lucide.
 * - getInfo: Obtiene información sobre la aplicación, incluyendo nombre, versión, componentes y estado de inicialización.
 * - Métodos para manejar el contexto de la aplicación, incluyendo comunidad, nivel educativo, grado y ciclo, y para actualizar la UI en consecuencia.
 * - Métodos para cargar y mostrar los ciclos de FP basados en el grado seleccionado, y para cargar y mostrar las asignaturas de Secundaria basadas en el nivel y curso seleccionados.
 * - Métodos para manejar eventos relacionados con la selección de ciclos, módulos y asignaturas, y para mostrar/ocultar menús de módulos.
 * - Métodos para manejar cambios de tamaño de la ventana y cambios de visibilidad para asegurar una correcta visualización de los paneles laterales y los iconos.
 */
class ContextManager {
    /**
     * Constructor de la clase ContextManager.
     * Inicializa el contexto de la aplicación y configura los valores iniciales.
     * Contexto inicial:
     * - Comunidad: 'aragon'
     * - Nivel educativo: null
     * - Grado: null
     * - Ciclo: null
     */
    constructor() {
        this.currentCommunity = 'aragon';
        this.currentEducationLevel = null; // 'FP' o 'SEC'
        this.currentGrade = null; // Para FP: 'GB', 'GM', 'GS'
        this.currentCycle = null;
        this.currentModule = null;

        // Cache para datos cargados
        this.dataCache = {
            cycles: {}
        };

        this.init();
    }

    /**
     * Inicializa el contexto manager, configurando valores iniciales y verificando que el DOM esté listo para interactuar.
     * Incluye logs detallados para facilitar el debugging durante la inicialización y para verificar que los elementos clave del DOM estén disponibles.
     * Contexto inicial:
     * - Comunidad: 'aragon'
     * - Nivel educativo: null
     * - Grado: null
     * - Ciclo: null
     */
    async init() {
        // Inicialización básica
        console.log('Context Manager initialized');

        // Verificar que el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                console.log('DOM loaded, Context Manager ready');
            });
        } else {
            console.log('DOM already loaded, Context Manager ready');
        }

        // Debug: verificar elementos clave
        setTimeout(() => {
            const subjectDropdown = document.getElementById('subjectDropdown');
            console.log('subjectDropdown found:', !!subjectDropdown);
        }, 1000);
    }

    /**
     * Actualiza la comunidad autónoma seleccionada
     * @param {string} community - Nombre de la comunidad autónoma
     */
    setCommunity(community) {
        console.log('setCommunity called with:', community);
        this.currentCommunity = community;
        this.currentCycle = null;
        this.currentModule = null;
        this.hideSelectedModuleDisplay();
        this.updateSubjectSelector();
    }

    /**
     * Actualiza el nivel educativo (FP o SEC)
     * @param {string} level - Nivel educativo ('FP' o 'SEC')
     */
    setEducationLevel(level) {
        console.log('setEducationLevel called with:', level);
        this.currentEducationLevel = level;
        this.hideSelectedModuleDisplay();
        this.updateSubjectSelector();
    }

    /**
     * Actualiza el grado de FP
     * @param {string} grade - Grado de FP ('basico', 'medio', 'superior', 'GB', 'GM', 'GS')
     */
    setFPGrade(grade) {
        console.log('setFPGrade called with:', grade);

        // Convert from HTML format to context manager format
        const gradeMap = {
            'basico': 'GB',
            'medio': 'GM',
            'superior': 'GS',
            // Also support direct codes
            'GB': 'GB',
            'GM': 'GM',
            'GS': 'GS'
        };

        this.currentGrade = gradeMap[grade] || grade;
        console.log('Converted grade to:', this.currentGrade);
        this.currentModule = null;
        this.hideSelectedModuleDisplay();
        this.updateSubjectSelector();
    }

    /**
     * Actualiza el nivel de Secundaria
     * @param {string} level - Nivel de Secundaria
     */
    setSecLevel(level) {
        this.currentSecLevel = level;
        this.currentSubject = null;
        this.hideSelectedModuleDisplay();
        this.updateSubjectSelector();
    }

    /**
     * Actualiza el curso de Secundaria
     * @param {string} course - Curso de Secundaria
     */
    setSecCourse(course) {
        this.currentCourse = course;
        this.currentSubject = null;
        this.hideSelectedModuleDisplay();
        this.updateSubjectSelector();
    }

    /**
     * Actualiza el selector de asignaturas basado en el nivel educativo y grado/ciclo seleccionado
     * @returns {Promise<void>}
     */
    async updateSubjectSelector() {
        console.log('updateSubjectSelector called - Level:', this.currentEducationLevel, 'Grade:', this.currentGrade);

        const subjectDropdown = document.getElementById('subjectDropdown');
        if (!subjectDropdown) {
            console.warn('subjectDropdown not found in DOM');
            return;
        }

        // Mostrar mensaje de carga
        try {
            if (this.currentEducationLevel === 'FP' && this.currentGrade) {
                console.log('Loading cycles for FP grade:', this.currentGrade);
                await this.loadCyclesForGrade();
            } else if (this.currentEducationLevel === 'SEC' && this.currentSecLevel && this.currentCourse) {
                console.log('Loading subjects for Secundaria:', this.currentSecLevel, 'Course:', this.currentCourse);
                await this.loadSubjectsForSecondary();
            } else {
                console.log('Showing default placeholder message');
                // Mostrar mensaje por defecto
                subjectDropdown.innerHTML = `
                    <div class="edu-level-option" data-type="placeholder">
                        <div class="edu-level-option-content">
                            <div class="edu-level-option-title">Seleccione nivel educativo y grado</div>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error updating subject selector:', error);
        }
    }

    /**
     * Carga los ciclos disponibles para el grado actual de FP
     * Solo carga archivos que terminen en _{gradeCode}.json
     * @returns {Promise<void>}
     */
    async loadCyclesForGrade() {
        if (!this.currentGrade || !this.currentCommunity) {
            console.warn('loadCyclesForGrade: Missing grade or community', {
                grade: this.currentGrade,
                community: this.currentCommunity
            });
            return;
        }

        // Convertir grado a código esperado en los nombres de archivo
        const gradeCode = this.currentGrade.toLowerCase(); // gb, gm, gs
        const cyclesPath = `data/${this.currentCommunity}/fp/ciclos/`;


        console.log('loadCyclesForGrade:', {
            gradeCode,
            cyclesPath,
            community: this.currentCommunity
        });

        // Mostrar mensaje de carga
        try {
            // Obtener archivos disponibles para este grado específico
            const availableCycles = await this.scanCyclesForGrade(gradeCode);
            console.log('Available cycles found:', availableCycles);

            let html = '';

            for (const cycleFile of availableCycles) {
                try {
                    const fullPath = `${cyclesPath}${cycleFile}`;
                    console.log('Fetching cycle file:', fullPath);

                    const response = await fetch(fullPath);
                    console.log(`Response for ${cycleFile}:`, {
                        ok: response.ok,
                        status: response.status,
                        statusText: response.statusText
                    });

                    if (response.ok) {
                        const cycleData = await response.json();
                        console.log(`Loaded cycle data for ${cycleFile}:`, cycleData);

                        // Extraer el nombre del ciclo (sin _gx.json)
                        const cycleName = cycleFile.replace(`_${gradeCode}.json`, '');
                        // Primera letra en mayúscula según especificaciones
                        const displayName = this.capitalizeFirstLetter(cycleName.toUpperCase());

                        html += `
                            <div class="edu-level-option cycle-option" data-type="cycle" data-value="${cycleName}_${gradeCode}" data-cycle="${cycleName}">
                                <div class="edu-level-option-content">
                                    <div class="edu-level-option-title">${displayName}</div>
                                    <div class="edu-level-option-desc">${cycleData.identificacion?.denominación || ''}</div>
                                </div>
                                <i data-lucide="check" class="edu-level-option-check" size="18"></i>
                                <div class="modules-submenu">
                                    ${this.generateModulesMenu(cycleData.modulos, cycleName, gradeCode)}
                                </div>
                            </div>
                        `;

                        // Cache cycle data
                        this.dataCache.cycles[`${cycleName}_${gradeCode}`] = cycleData;
                    } else {
                        console.warn(`Failed to load ${cycleFile}: ${response.status} ${response.statusText}`);
                    }
                } catch (error) {
                    console.error(`Could not load cycle ${cycleFile}:`, error);
                }
            }

            if (html === '') {
                html = `
                    <div class="edu-level-option" data-type="placeholder">
                        <div class="edu-level-option-content">
                            <div class="edu-level-option-title">No hay ciclos disponibles para ${this.currentGrade} en ${this.currentCommunity}</div>
                        </div>
                    </div>
                `;
            }

            const subjectDropdown = document.getElementById('subjectDropdown');
            subjectDropdown.innerHTML = html;

            // Re-inicializar iconos de Lucide
            if (window.lucide) {
                lucide.createIcons();
            }

            // Agregar event listeners
            this.addCycleEventListeners();

        } catch (error) {
            console.error('Error loading cycles for grade:', error);
        }
    }

    /**
     * Genera el menú de módulos para un ciclo específico
     * @param {Array} modules - Lista de módulos del ciclo
     * @param {string} cycleName - Nombre del ciclo
     * @param {string} gradeCode - Código del grado
     * @returns {string} HTML del menú de módulos
     */
    generateModulesMenu(modules, cycleName, gradeCode) {
        console.log('generateModulesMenu called with:', { modules, cycleName, gradeCode });

        if (!modules || modules.length === 0) {
            console.log('No modules found, returning empty string');
            return '';
        }

        let html = '<div class="modules-list">';
        modules.forEach(module => {
            const moduleTitle = this.capitalizeFirstLetter(module.titulo_modulo);
            console.log('Generating module HTML for:', { moduleId: module.id_modulo, moduleTitle });
            html += `
                <div class="module-option" data-type="module" data-cycle="${cycleName}" data-grade="${gradeCode}" data-module="${module.id_modulo}">
                    <span class="module-title">${moduleTitle}</span>
                </div>
            `;
        });
        html += '</div>';
        console.log('Generated modules menu HTML:', html);
        return html;
    }

    /**
     * Escanea los ciclos disponibles para un grado específico
     * Filtra archivos con patrón {nombre}_{grado}.json
     * @param {string} gradeCode - Código del grado
     * @returns {Promise<Array<string>>} Lista de archivos de ciclos disponibles
     */
    async scanCyclesForGrade(gradeCode) {
        console.log('scanCyclesForGrade called for:', gradeCode);

        // Ciclos disponibles por comunidad (solo Aragón disponible actualmente)
        const cyclesByCommunity = {
            'aragon': [
                'dam_gs.json',
                'asir_gs.json',
                'daw_gs.json',
                'smr_gm.json'
            ]
        };

        const communityFiles = cyclesByCommunity[this.currentCommunity] || [];
        console.log(`Files for community ${this.currentCommunity}:`, communityFiles);

        // Filtrar solo los del grado solicitado
        const filtered = communityFiles.filter(file => file.endsWith(`_${gradeCode}.json`));
        console.log(`Filtered files for grade ${gradeCode}:`, filtered);

        return filtered;
    }

    /**
     * Carga las asignaturas disponibles para Educación Secundaria
     * Filtra por nivel (ESO/BACH) y curso, y verifica que existan los archivos
     * @returns {Promise<void>}
     */
    async loadSubjectsForSecondary() {
        if (!this.currentSecLevel || !this.currentCourse || !this.currentCommunity) {
            console.warn('loadSubjectsForSecondary: Missing required data', {
                secLevel: this.currentSecLevel,
                course: this.currentCourse,
                community: this.currentCommunity
            });
            return;
        }

        console.log('loadSubjectsForSecondary:', {
            level: this.currentSecLevel,
            course: this.currentCourse,
            community: this.currentCommunity
        });

        try {
            // Obtener asignaturas del nivel y curso seleccionado
            const levelKey = this.currentSecLevel;
            const courseKey = this.currentCourse;

            let availableSubjects = [];
            if (ASIGNATURAS_SECUNDARIA[levelKey] && ASIGNATURAS_SECUNDARIA[levelKey][courseKey]) {
                availableSubjects = ASIGNATURAS_SECUNDARIA[levelKey][courseKey];
            }

            console.log('Available subjects from config:', availableSubjects);

            let html = '';

            // Verificar existencia de archivos y generar HTML
            for (const subject of availableSubjects) {
                try {
                    const folderName = levelKey === 'ESO' ? 'secundaria' : 'bachillerato';
                    const filePath = `data/${this.currentCommunity}/${folderName}/${subject.archivo}`;

                    console.log('Checking file existence:', filePath);

                    const response = await fetch(filePath, { method: 'HEAD' });

                    if (response.ok) {
                        console.log(`File exists: ${subject.archivo}`);

                        html += `
                            <div class="edu-level-option subject-option" data-type="subject" data-subject="${subject.archivo}" data-name="${subject.nombre}">
                                <div class="edu-level-option-content">
                                    <div class="edu-level-option-title">${subject.nombre}</div>
                                    <div class="edu-level-option-desc">${levelKey} - ${courseKey}º</div>
                                </div>
                                <i data-lucide="check" class="edu-level-option-check" size="18"></i>
                            </div>
                        `;
                    } else {
                        console.warn(`File not found: ${filePath}`);
                    }
                } catch (error) {
                    console.error(`Error checking file ${subject.archivo}:`, error);
                }
            }

            if (html === '') {
                html = `
                    <div class="edu-level-option" data-type="placeholder">
                        <div class="edu-level-option-content">
                            <div class="edu-level-option-title">No hay asignaturas disponibles para ${levelKey} ${courseKey}º</div>
                        </div>
                    </div>
                `;
            }

            const subjectDropdown = document.getElementById('subjectDropdown');
            subjectDropdown.innerHTML = html;

            // Re-inicializar iconos de Lucide
            if (window.lucide) {
                lucide.createIcons();
            }

            // Agregar event listeners para asignaturas
            this.addSubjectEventListeners();

        } catch (error) {
            console.error('Error loading subjects for secondary:', error);
        }
    }

    /**
     * Configura los event handlers específicos para elementos de secundaria, como la actualización de datos en el popup de descripción cuando se selecciona una asignatura de secundaria.
     * Se extiende la función updatePopupsWithSubjectData del context manager para incluir lógica adicional que maneje los datos específicos necesarios para el popup de descripción de secundaria.
     * También se incluyen validaciones y logs detallados para asegurar que los datos necesarios estén presentes y para facilitar el debugging en caso de problemas con la carga de datos en el popup.
     * Incluye verificaciones para asegurar que los datos específicos requeridos para el popup de descripción estén presentes, y logs detallados de la estructura de los datos para facilitar el debugging.
     * @returns {void}
     */
    addCycleEventListeners() {
        console.log('addCycleEventListeners called');
        const cycleOptions = document.querySelectorAll('.cycle-option');
        console.log('Found cycle options:', cycleOptions.length);

        // Event listeners para ciclos
        cycleOptions.forEach((option, index) => {
            console.log(`Adding listeners to cycle option ${index}:`, option);

            option.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectCycle(option.dataset.value, option.dataset.cycle);
            });

            // 1.1.1 - Event listener para mostrar módulos al hacer hover
            option.addEventListener('mouseenter', () => {
                console.log('Mouse entered cycle option');
                this.showModulesMenu(option);
            });

            option.addEventListener('mouseleave', () => {
                console.log('Mouse left cycle option');
                this.hideModulesMenu(option);
            });
        });

        // Event listeners para módulos
        document.querySelectorAll('.module-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectModule(
                    option.dataset.cycle,
                    option.dataset.grade,
                    option.dataset.module
                );
            });
        });
    }

    /**
     * Configura los event handlers específicos para elementos de asignaturas de Secundaria, como la actualización de datos en el popup de descripción cuando se selecciona una asignatura de secundaria.
     * Se extiende la función updatePopupsWithSubjectData del context manager para incluir lógica adicional que maneje los datos específicos necesarios para el popup de descripción de secundaria.
     * También se incluyen validaciones y logs detallados para asegurar que los datos necesarios estén presentes y para facilitar el debugging en caso de problemas con la carga de datos en el popup.
     * Incluye verificaciones para asegurar que los datos específicos requeridos para el popup de descripción estén presentes, y logs detallados de la estructura de los datos para facilitar el debugging.
     * @returns {void}
     */
    addSubjectEventListeners() {
        console.log('addSubjectEventListeners called');
        const subjectOptions = document.querySelectorAll('.subject-option');
        console.log('Found subject options:', subjectOptions.length);

        subjectOptions.forEach((option, index) => {
            console.log(`Adding listeners to subject option ${index}:`, option);

            option.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectSubject(option.dataset.subject, option.dataset.name);
            });
        });
    }

    /**
     * Muestra el menú de módulos al hacer hover sobre un ciclo
     * @param {HTMLElement} cycleOption - Elemento del ciclo sobre el que se hace hover
     */
    showModulesMenu(cycleOption) {
        console.log('showModulesMenu called for:', cycleOption);
        const modulesMenu = cycleOption.querySelector('.modules-submenu');
        console.log('Found modules menu:', modulesMenu);
        if (modulesMenu) {
            modulesMenu.classList.add('show');
            console.log('Added show class to modules menu');
        } else {
            console.warn('No modules menu found in cycle option');
        }
    }

    /**
     * Oculta el menú de módulos
     * @param {HTMLElement} cycleOption - Elemento del ciclo del que se oculta el menú
     */
    hideModulesMenu(cycleOption) {
        console.log('hideModulesMenu called for:', cycleOption);
        const modulesMenu = cycleOption.querySelector('.modules-submenu');
        if (modulesMenu) {
            modulesMenu.classList.remove('show');
            console.log('Removed show class from modules menu');
        }
    }

    /**
     * Selecciona un ciclo de FP
     * @param {string} cycleValue - Valor del ciclo seleccionado
     * @param {string} cycleName - Nombre del ciclo seleccionado
     */
    async selectCycle(cycleValue, cycleName) {
        this.currentCycle = cycleValue;

        // Actualizar UI del botón
        const subjectButton = document.getElementById('subjectText');
        if (subjectButton) {
            subjectButton.textContent = this.capitalizeFirstLetter(cycleName.toUpperCase());
        }

        // Cerrar dropdown
        this.closeSubjectDropdown();
    }

    /**
     * Selecciona un módulo de FP
     */
    //async selectModule(cycleName, gradeCode, moduleId) {
    //    console.log('selectModule called:', { cycleName, gradeCode, moduleId });
    //    this.currentModule = moduleId;
    //    this.currentCycle = cycleName;
    //    const cycleKey = `${cycleName}_${gradeCode}`;
//
    //    // Actualizar UI del botón del selector de asignaturas
    //    const subjectButton = document.getElementById('subjectText');
    //    const cycleData = this.dataCache.cycles[cycleKey];
//
    //    if (subjectButton && cycleData) {
    //        const module = cycleData.modulos.find(m => m.id_modulo === moduleId);
    //        if (module) {
    //            subjectButton.textContent = module.titulo_modulo;
//
    //            // Mostrar el nombre del módulo en el menú de pestañas (lado derecho)
    //            this.updateSelectedModuleDisplay(module.titulo_modulo);
//
    //            // Cargar los datos del módulo desde data/{community}/fp/modulos
    //            const moduleData = await this.loadModuleData(moduleId);
//
    //            // Cargar los datos del ciclo (ya los tenemos en cache pero pueden necesitarse actualizados)
    //            const fullCycleData = await this.loadCycleData(cycleName);
//
    //            // Actualizar los popups con la nueva información
    //            if (moduleData && fullCycleData) {
    //                try {
    //                    await this.updatePopupsWithModuleData(moduleData, fullCycleData);
    //                } catch (error) {
    //                    console.error('Error updating popups with module data:', error);
    //                    // No bloquear la UI si hay error en los popups
    //                }
    //            }
    //        }
    //    }
//
    //    // Cerrar dropdown
    //    this.closeSubjectDropdown();
    //}

    /**
     * Selecciona una asignatura de Educación Secundaria
     */
    //async selectSubject(subjectFile, subjectName) {
    //    console.log('selectSubject called:', { subjectFile, subjectName });
    //    this.currentSubject = subjectFile;
//
    //    // Actualizar UI del botón del selector de asignaturas
    //    const subjectButton = document.getElementById('subjectText');
    //    if (subjectButton) {
    //        subjectButton.textContent = subjectName;
//
    //        // Mostrar el nombre de la asignatura en el menú de pestañas (lado derecho)
    //        this.updateSelectedModuleDisplay(subjectName);
//
    //        // Cargar los datos de la asignatura
    //        const subjectData = await this.loadSubjectData(subjectFile);
//
    //        // Actualizar los popups con la nueva información
    //        if (subjectData) {
    //            try {
    //                await this.updatePopupsWithSubjectData(subjectData);
    //            } catch (error) {
    //                console.error('Error updating popups with subject data:', error);
    //            }
    //        }
    //    }
//
    //    // Cerrar dropdown
    //    this.closeSubjectDropdown();
    //}

    async selectModule(cycleName, gradeCode, moduleId) {
    console.log('selectModule called:', { cycleName, gradeCode, moduleId });
    this.currentModule = moduleId;
    this.currentCycle = cycleName;
    const cycleKey = `${cycleName}_${gradeCode}`;

    const subjectButton = document.getElementById('subjectText');
    const cycleData = this.dataCache.cycles[cycleKey];

    if (subjectButton && cycleData) {
        const module = cycleData.modulos.find(m => m.id_modulo === moduleId);
        if (module) {
            subjectButton.textContent = module.titulo_modulo;
            this.updateSelectedModuleDisplay(module.titulo_modulo);

            const moduleData = await this.loadModuleData(moduleId);
            const fullCycleData = await this.loadCycleData(cycleName);

            if (moduleData && fullCycleData) {
                await this.updatePopupsWithModuleData(moduleData, fullCycleData);
            }

            // --- INICIALIZACIÓN DE SESSION STORAGE ---
            // Creamos la memoria en cuanto se selecciona el módulo
            if (window.sessionStorageManager) {
                const response = await fetch('data/resumen_fp.json');
                const templateData = await response.json();
                await window.sessionStorageManager.initializeFromTemplate(templateData);
            }
        }
    }
    this.closeSubjectDropdown();
}

/**
 * Selecciona una asignatura de Educación Secundaria
 * @param {*} subjectFile 
 * @param {*} subjectName 
 */
async selectSubject(subjectFile, subjectName) {
    console.log('selectSubject called:', { subjectFile, subjectName });
    this.currentSubject = subjectFile;

    const subjectButton = document.getElementById('subjectText');
    if (subjectButton) {
        subjectButton.textContent = subjectName;
        this.updateSelectedModuleDisplay(subjectName);

        const subjectData = await this.loadSubjectData(subjectFile);

        if (subjectData) {
            await this.updatePopupsWithSubjectData(subjectData);
            
            // --- INICIALIZACIÓN DE SESSION STORAGE ---
            // Creamos la memoria en cuanto se selecciona la materia
            if (window.sessionStorageManager) {
                const response = await fetch('data/resumen_secundaria.json');
                const templateData = await response.json();
                await window.sessionStorageManager.initializeFromTemplate(templateData);
            }
        }
    }
    this.closeSubjectDropdown();
}

    /**
     * Oculta el dropdown de selección de asignaturas o ciclos
     */
    closeSubjectDropdown() {
        const subjectDropdown = document.getElementById('subjectDropdown');
        if (subjectDropdown) {
            subjectDropdown.classList.remove('show');
        }
    }

    /**
     * Actualiza la visualización del módulo seleccionado en el menú de pestañas
     * @param {string} moduleTitle - Título del módulo seleccionado
     */
    updateSelectedModuleDisplay(moduleTitle) {
        const moduleNameElement = document.getElementById('selectedModuleName');
        if (moduleNameElement) {
            moduleNameElement.textContent = moduleTitle;
            moduleNameElement.style.display = 'inline';
            console.log('Updated selected module display:', moduleTitle);
        } else {
            console.warn('selectedModuleName element not found');
        }
    }

    /**
     * Oculta la visualización del módulo seleccionado
     */
    hideSelectedModuleDisplay() {
        const moduleNameElement = document.getElementById('selectedModuleName');
        if (moduleNameElement) {
            moduleNameElement.style.display = 'none';
            moduleNameElement.textContent = '';
        }
    }

    /**
     * Carga los datos de un módulo desde data/{community}/fp/modulos
     * @param {string} moduleId - ID del módulo a cargar
     * @returns {Promise<Object|null>} - Datos del módulo o null si ocurre un error
     */
    async loadModuleData(moduleId) {
        if (!this.currentCommunity || !moduleId) {
            console.warn('loadModuleData: Missing community or moduleId', {
                community: this.currentCommunity,
                moduleId: moduleId
            });
            return null;
        }

        // Verificar si los datos del módulo ya están en cache
        const modulePath = `data/${this.currentCommunity}/fp/modulos/${moduleId}.json`;
        console.log('Loading module data from:', modulePath);

        // Si el módulo ya está en cache, devolverlo directamente
        try {
            const response = await fetch(modulePath);
            console.log(`Response for module ${moduleId}:`, {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText
            });

            if (response.ok) {
                const moduleData = await response.json();
                console.log(`Loaded module data for ${moduleId}:`, moduleData);

                // Cache module data
                if (!this.dataCache.modules) {
                    this.dataCache.modules = {};
                }
                this.dataCache.modules[moduleId] = moduleData;

                return moduleData;
            } else {
                console.warn(`Failed to load module ${moduleId}: ${response.status} ${response.statusText}`);
                return null;
            }
        } catch (error) {
            console.error(`Could not load module ${moduleId}:`, error);
            return null;
        }
    }

    /**
     * Carga los datos completos de un ciclo desde data/{community}/fp/ciclos
     * @param {string} cycleName - Nombre del ciclo a cargar
     * @returns {Promise<Object|null>} - Datos del ciclo o null si ocurre un error
     */
    async loadCycleData(cycleName) {
        if (!this.currentCommunity || !cycleName || !this.currentGrade) {
            console.warn('loadCycleData: Missing required data', {
                community: this.currentCommunity,
                cycleName: cycleName,
                grade: this.currentGrade
            });
            return null;
        }

        const gradeCode = this.currentGrade.toLowerCase();
        const cyclePath = `data/${this.currentCommunity}/fp/ciclos/${cycleName}_${gradeCode}.json`;
        console.log('Loading full cycle data from:', cyclePath);

        try {
            const response = await fetch(cyclePath);
            console.log(`Response for cycle ${cycleName}:`, {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText
            });

            if (response.ok) {
                const cycleData = await response.json();
                console.log(`Loaded full cycle data for ${cycleName}:`, cycleData);
                return cycleData;
            } else {
                console.warn(`Failed to load cycle ${cycleName}: ${response.status} ${response.statusText}`);
                return null;
            }
        } catch (error) {
            console.error(`Could not load cycle ${cycleName}:`, error);
            return null;
        }
    }

    /**
     * Carga los datos de una asignatura de Educación Secundaria
     * @param {string} subjectFile - Nombre del archivo de la asignatura a cargar
     * @returns {Promise<Object|null>} - Datos de la asignatura o null si ocurre un error
     */
    async loadSubjectData(subjectFile) {
        if (!this.currentCommunity || !subjectFile) {
            console.warn('loadSubjectData: Missing community or subjectFile', {
                community: this.currentCommunity,
                subjectFile: subjectFile
            });
            return null;
        }

        const folderName = this.currentSecLevel === 'ESO' ? 'secundaria' : 'bachillerato';
        const subjectPath = `data/${this.currentCommunity}/${folderName}/${subjectFile}`;
        console.log('Loading subject data from:', subjectPath);

        try {
            const response = await fetch(subjectPath);
            console.log(`Response for subject ${subjectFile}:`, {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText
            });

            if (response.ok) {
                const subjectData = await response.json();
                console.log(`Loaded subject data for ${subjectFile}:`, subjectData);

                // Cache subject data
                if (!this.dataCache.subjects) {
                    this.dataCache.subjects = {};
                }
                this.dataCache.subjects[subjectFile] = subjectData;

                return subjectData;
            } else {
                console.warn(`Failed to load subject ${subjectFile}: ${response.status} ${response.statusText}`);
                return null;
            }
        } catch (error) {
            console.error(`Could not load subject ${subjectFile}:`, error);
            return null;
        }
    }

    /**
     * Actualiza todos los popups con los datos del módulo y ciclo seleccionados
     * @param {Object} moduleData - Datos del módulo seleccionado
     * @param {Object} cycleData - Datos del ciclo seleccionado
     */
    async updatePopupsWithModuleData(moduleData, cycleData) {
        console.log('Updating popups with module and cycle data:', { moduleData, cycleData });

        try {
            console.log('Starting popup updates with data:', {
                moduleKeys: Object.keys(moduleData || {}),
                cycleKeys: Object.keys(cycleData || {})
            });

            // 1.1. Orientación - seccion_orientaciones del módulo
            if (moduleData?.seccion_orientaciones) {
                this.updateOrientacionPopup(moduleData.seccion_orientaciones);
            } else {
                console.warn('No seccion_orientaciones found in module data');
            }

            // 1.2. Prospectiva - prospectiva y entorno_profesional del ciclo
            if (cycleData?.prospectiva || cycleData?.entorno_profesional) {
                this.updateProspectivaPopup(cycleData.prospectiva, cycleData.entorno_profesional);
            } else {
                console.warn('No prospectiva or entorno_profesional found in cycle data');
            }

            // 1.3. RA/CE - resultados_aprendizaje del módulo
            if (moduleData?.resultados_aprendizaje) {
                this.updateRACEPopup(moduleData.resultados_aprendizaje);
            } else {
                console.warn('No resultados_aprendizaje found in module data');
            }

            // 1.4. Contenidos - bloques_contenidos_basicos del módulo
            if (moduleData?.bloques_contenidos_basicos) {
                this.updateContenidosPopup(moduleData.bloques_contenidos_basicos);
            } else {
                console.warn('No bloques_contenidos_basicos found in module data');
            }

            // 1.5. ObGs - objetivos_generales del ciclo
            if (cycleData?.objetivos_generales) {
                this.updateObGsPopup(cycleData.objetivos_generales);
            } else {
                console.warn('No objetivos_generales found in cycle data');
            }

            // 1.6. CPPs - cpps del ciclo
            if (cycleData?.cpps) {
                this.updateCPPsPopup(cycleData.cpps);
            } else {
                console.warn('No cpps found in cycle data');
            }

            console.log('✅ All popup updates completed successfully');
        } catch (error) {
            console.error('❌ Error updating popups:', error);
        }
    }

    /**
     * Actualiza todos los popups con los datos de la asignatura seleccionada de Secundaria
     * @param {Object} subjectData - Datos de la asignatura seleccionada
     */
    async updatePopupsWithSubjectData(subjectData) {
        console.log('Updating popups with subject data:', subjectData);

        try {
            console.log('Starting popup updates with subject data:', {
                subjectKeys: Object.keys(subjectData || {})
            });

            // Guardar todos los datos de la asignatura en el modalComponent
            if (window.modalComponent) {
                window.modalComponent.secondarySubjectData = subjectData;
                console.log('✓ Complete subject data saved to modalComponent');
                console.log('Subject data keys:', Object.keys(subjectData));
                console.log('Modal component secondarySubjectData:', window.modalComponent.secondarySubjectData);
            } else {
                console.error('❌ modalComponent not available');
            }

            // Actualizar popups específicos de Secundaria
            if (subjectData?.objetivos_etapa) {
                this.updateObjetivosEtapaPopup(subjectData.objetivos_etapa);
            } else {
                console.warn('No objetivos_etapa found in subject data');
            }

            if (subjectData?.competencias_clave) {
                this.updateCompetenciasClavePopup(subjectData.competencias_clave);
            } else {
                console.warn('No competencias_clave found in subject data');
            }

            if (subjectData?.competencias_especificas) {
                this.updateCompetenciasEspecificasPopup(subjectData.competencias_especificas);
            } else {
                console.warn('No competencias_especificas found in subject data');
            }

            if (subjectData?.saberes_basicos) {
                this.updateSaberesBasicosPopup(subjectData.saberes_basicos);
            } else {
                console.warn('No saberes_basicos found in subject data');
            }

            console.log('✅ All popup updates completed successfully for subject');
        } catch (error) {
            console.error('❌ Error updating popups with subject data:', error);
        }
    }

    /**
     * Actualiza el popup de Objetivos de Etapa con datos de Secundaria
     * @param {Object} objetivosEtapa - Datos de los objetivos de etapa
     */
    updateObjetivosEtapaPopup(objetivosEtapa) {
        console.log('Updating Objetivos de Etapa popup with:', objetivosEtapa);
        // Los datos ya están guardados en secondarySubjectData por updatePopupsWithSubjectData
        console.log('✓ Objetivos de Etapa data ready');
    }

    /**
     * Actualiza el popup de Competencias Clave con datos de Secundaria
     * @param {Object} competenciasClave - Datos de las competencias clave
     */
    updateCompetenciasClavePopup(competenciasClave) {
        console.log('Updating Competencias Clave popup with:', competenciasClave);
        // Los datos ya están guardados en secondarySubjectData por updatePopupsWithSubjectData
        console.log('✓ Competencias Clave data ready');
    }

    /**
     * Actualiza el popup de Competencias Específicas con datos de Secundaria
     * @param {Object} competenciasEspecificas - Datos de las competencias específicas
     */
    updateCompetenciasEspecificasPopup(competenciasEspecificas) {
        console.log('Updating Competencias Específicas popup with:', competenciasEspecificas);
        // Los datos ya están guardados en secondarySubjectData por updatePopupsWithSubjectData
        console.log('✓ Competencias Específicas data ready');
    }

    /**
     * Actualiza el popup de Saberes Básicos con datos de Secundaria
     * @param {Object} saberesBasicos - Datos de los saberes básicos
     */
    updateSaberesBasicosPopup(saberesBasicos) {
        console.log('Updating Saberes Básicos popup with:', saberesBasicos);
        // Los datos ya están guardados en secondarySubjectData por updatePopupsWithSubjectData
        console.log('✓ Saberes Básicos data ready');
    }

    /**
     * 1.1. Actualiza el popup de Orientación con seccion_orientaciones del módulo
     * Estilo como Objetivos de Etapa - texto con botón check seleccionado por defecto
     * @param {Object} seccionOrientaciones - Datos de la sección de orientaciones
     */
    updateOrientacionPopup(seccionOrientaciones) {
        console.log('Updating Orientacion popup with:', seccionOrientaciones);

        try {
            if (window.modalComponent) {
                // Guardar los datos para cuando se abra el modal
                window.modalComponent.fpModuleData = window.modalComponent.fpModuleData || {};
                window.modalComponent.fpModuleData.orientacion = seccionOrientaciones;
                console.log('✓ Orientacion data saved successfully');
            } else {
                console.warn('Modal component not available for Orientacion');
            }
        } catch (error) {
            console.error('Error updating Orientacion popup:', error);
        }
    }

    /**
     * 1.2. Actualiza el popup de Prospectiva con prospectiva y entorno_profesional del ciclo
     * Estilo como Objetivos de Etapa - lista de elementos con check seleccionables
     * @param {Object} prospectiva - Datos de la prospectiva
     * @param {Object} entornoProfesional - Datos del entorno profesional
     */
    updateProspectivaPopup(prospectiva, entornoProfesional) {
        console.log('Updating Prospectiva popup with:', { prospectiva, entornoProfesional });

        try {
            if (window.modalComponent) {
                window.modalComponent.fpCycleData = window.modalComponent.fpCycleData || {};
                window.modalComponent.fpCycleData.prospectiva = prospectiva;
                window.modalComponent.fpCycleData.entorno_profesional = entornoProfesional;
                console.log('✓ Prospectiva data saved successfully');
            } else {
                console.warn('Modal component not available for Prospectiva');
            }
        } catch (error) {
            console.error('Error updating Prospectiva popup:', error);
        }
    }

    /**
     * 1.3. Actualiza el popup de RA/CE con resultados_aprendizaje del módulo
     * Estilo como ODS - desplegables con elementos seleccionables
     * @param {Object} resultadosAprendizaje - Datos de los resultados de aprendizaje
     */
    updateRACEPopup(resultadosAprendizaje) {
        console.log('Updating RA/CE popup with:', resultadosAprendizaje);

        if (window.modalComponent) {
            window.modalComponent.fpModuleData = window.modalComponent.fpModuleData || {};
            window.modalComponent.fpModuleData.race = resultadosAprendizaje;
        }
    }

    /**
     * 1.4. Actualiza el popup de Contenidos con bloques_contenidos_basicos del módulo
     * Estilo como ODS - desplegables con elementos seleccionables
     * @param {Object} bloquesContenidos - Datos de los bloques de contenidos
     */
    updateContenidosPopup(bloquesContenidos) {
        console.log('Updating Contenidos popup with:', bloquesContenidos);

        if (window.modalComponent) {
            window.modalComponent.fpModuleData = window.modalComponent.fpModuleData || {};
            window.modalComponent.fpModuleData.contenidos = bloquesContenidos;
        }
    }

    /**
     * 1.5. Actualiza el popup de ObGs con objetivos_generales del ciclo
     * Estilo como Objetivos de Etapa - lista con check, ninguno seleccionado por defecto
     * @param {Object} objetivosGenerales - Datos de los objetivos generales
     */
    updateObGsPopup(objetivosGenerales) {
        console.log('Updating ObGs popup with:', objetivosGenerales);

        if (window.modalComponent) {
            window.modalComponent.fpCycleData = window.modalComponent.fpCycleData || {};
            window.modalComponent.fpCycleData.objetivos = objetivosGenerales;
        }
    }

    /**
     * 1.6. Actualiza el popup de CPPs con cpps del ciclo
     * Estilo como Objetivos de Etapa - lista con check, ninguno seleccionado por defecto
     * @param {Object} cpps - Datos de los CPPs
     */
    updateCPPsPopup(cpps) {
        console.log('Updating CPPs popup with:', cpps);

        if (window.modalComponent) {
            window.modalComponent.fpCycleData = window.modalComponent.fpCycleData || {};
            window.modalComponent.fpCycleData.cpps = cpps;
        }
    }

    /**
     * Capitaliza la primera letra de una cadena
     * @param {string} string - Cadena a capitalizar
     * @returns {string} Cadena con la primera letra en mayúscula
     */
    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
}

/**
 * 
 */
window.contextManager = new ContextManager();