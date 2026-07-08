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
   STORE - SINGLETON STATE MANAGEMENT
   ============================================ */

   /**
    * Clase Store para gestionar el estado global de la aplicación, incluyendo:
    * - Nivel
    * - Subnivel
    * - Materia/Módulo seleccionado
    * - Comunidad seleccionada
    * - Navegación y UI
    * - Datos de contexto y sesiones
    * - Selections from modal components for resumen integration
    * Incluye métodos para actualizar el estado, suscribirse a cambios y persistir en localStorage.
    */
class Store {
    /**
     * Crea una nueva instancia de la clase Store.
     * Inicializa el estado con valores predeterminados o los valores almacenados en localStorage.
     * El estado incluye configuraciones de tema, modo, modelo de IA, nivel educativo, materia seleccionada, comunidad, navegación, datos de contexto y sesiones.
     * También inicializa un array de listeners para permitir que otros componentes se suscriban a cambios en el estado.
     * Algunos campos clave del estado:
     * - educationalLevel: 'FP' o 'SEC' para indicar el nivel educativo seleccionado.
     * - fpGrade: 'basico', 'medio' o 'superior' para indicar el grado de FP seleccionado.
     * - secLevel: 'ESO' o 'BACH' para indicar el nivel de secundaria seleccionado.
     * - secCourse: '1', '2', '3' o '4' para indicar el curso de secundaria seleccionado.
     * - selectedSubject: Cadena que representa la materia o módulo seleccionado.
     * - community: Comunidad autónoma seleccionada.
     * - contexto: Objeto que contiene los datos de contexto para la unidad didáctica o situación de aprendizaje.
     * - sesiones: Array de objetos que representan las sesiones planificadas.
     * - disenoCurricular, evaluacion, recursos: Objetos que contienen los datos para cada uno de estos paneles.
     * - modalSelections: Objeto para almacenar las selecciones realizadas en los modales, que luego se integrarán en el resumen.
     * El constructor también llama al método loadInitialData para cargar mensajes de chat de ejemplo y otros datos iniciales.
     * El estado se persiste en localStorage para mantener la configuración y selecciones del usuario entre sesiones.
     * Incluye métodos para actualizar el estado, como setEducationalLevel, setFPGrade, setSecLevel, setSecCourse, setCommunity, setSubject, setModule, generateSesiones, updateSesion, addActividad y updateActividad.
     */
    constructor() {
        this.state = {
            // Theme and UI
            theme: localStorage.getItem('theme') || 'light',
            mode: localStorage.getItem('mode') || 'UD',
            aiModel: localStorage.getItem('aiModel') || 'chatgpt',

            // ============================================
            // NUEVO: Nivel Educativo (FP / Secundaria)
            // ============================================
            educationalLevel: localStorage.getItem('educationalLevel') || 'FP', // 'FP' | 'SEC'
            
            // Subniveles para FP
            fpGrade: localStorage.getItem('fpGrade') || 'medio', // 'basico' | 'medio' | 'superior'
            
            // Subniveles para Secundaria
            secLevel: localStorage.getItem('secLevel') || 'ESO', // 'ESO' | 'BACH'
            secCourse: localStorage.getItem('secCourse') || '1', // '1' | '2' | '3' | '4' para ESO, '1' | '2' para Bach
            
            // Materia/Módulo seleccionado
            selectedSubject: localStorage.getItem('selectedSubject') || '',

            // Community selection
            community: localStorage.getItem('community') || 'aragon',

            // Subject/Cycle/Module selection
            selectedCycle: localStorage.getItem('selectedCycle') || '',
            selectedModule: localStorage.getItem('selectedModule') || '',
            selectedModuleCycle: localStorage.getItem('selectedModuleCycle') || '',

            // Navigation
            currentTab: 'chat',
            leftSidebarOpen: false,
            rightSidebarOpen: false,
            activeLeftPanel: null,
            activeRightPanel: null,
            sidebarClosedByResize: false,

            // User
            user: {
                name: 'Jesús',
                initials: 'JM',
                email: 'jesus@example.com'
            },

            // Chat
            chatMessages: [],

            // Contexto (formerly Configuración)
            contexto: {
                titulo: '',
                numero: 2,
                trimestre: '',
                objetivos: '',
                descripcion: '',
                numSesiones: 0,
                tiempoSesion: 55,
                contextoAlumnado: '',
                contextoCentro: '',

                // Extra para SdA
                justificacion: '',
                centroInteres: '',
                vidaCotidiana: '',
                reto: '',
                productoFinal: '',
                
                // Extra para Secundaria
                materia: '',
                curso: '',
                etapa: ''
            },

            // Sesiones
            sesiones: [],

            // Diseño Curricular - Elementos comunes
            disenoCurricular: {
                orientacion: { title: 'Orientación', content: '' },
                prospectiva: { title: 'Prospectiva', content: '' },
                metodologia: { title: 'Metodología', content: '' },
                softskills: { title: 'Soft Skills', content: '' },
                ods: { title: 'ODs', content: '' },
                xxi: { title: 'XXI', content: '' },
                bloom: { title: 'Taxonomía Bloom', content: '' },
                inteligencias: { title: 'Inteligencias múltiples', content: '' },
                dua: { title: 'DUA (Diseño Universal Aprendizaje)', content: '' },
                diversidad: { title: 'Atención a la Diversidad', content: '' },
                
                // Elementos específicos FP
                race: { title: 'RA/CE', content: '' },
                contenidos: { title: 'Contenidos', content: '' },
                objetivos: { title: 'Objetivos Generales (ObGs)', content: '' },
                cpps: { title: 'CPPs', content: '' },
                
                // Elementos específicos Secundaria (LOMLOE)
                competenciasClave: { title: 'Competencias Clave', content: '' },
                objetivosEtapa: { title: 'Objetivos de Etapa', content: '' },
                competenciasEspecificas: { title: 'Competencias Específicas', content: '' },
                saberes: { title: 'Saberes Básicos', content: '' }
            },

            // Evaluación
            evaluacion: {
                rubrica: { title: 'Rúbrica de evaluación', content: '' },
                autoevaluacion: { title: 'Autoevaluación', content: '' },
                coevaluacion: { title: 'Coevaluación', content: '' },
                listaValoracion: { title: 'Lista de Valoración', content: '' },
                listaControl: { title: 'Lista de control', content: '' }
            },

            // Recursos
            recursos: {
                apuntes: { title: 'Apuntes en PDF', content: '' },
                presentacion: { title: 'Presentación Docente', content: '' },
                videos: { title: 'Vídeos', content: '' }
            },

            // Selections from modal components - for resumen integration
            modalSelections: {
                ods: [],
                xxi: [], // Retos del Siglo XXI
                objetivos: [], // Objetivos Generales
                cpps: [], // Competencias Profesionales
                race: {}, // RA/CE selections
                contenidos: [],
                softskills: {},
                metodologia: [],
                bloom: {},
                inteligencias: {},
                diversidad: '',
                dua: ''
            }
        };

        this.listeners = [];
        this.loadInitialData();
    }

    // ============================================
    // GETTERS para configuración según nivel educativo
    // ============================================
    
    /**
     * Devuelve la terminología correcta según el nivel educativo
     * @returns {Object} Objeto con la terminología correspondiente
     */
    getTerminology() {
        const isFP = this.state.educationalLevel === 'FP';
        
        return {
            // Unidad de programación
            unitName: isFP ? 'Unidad de Trabajo' : 'Situación de Aprendizaje',
            unitNameShort: isFP ? 'UT' : 'SdA',
            
            // Referente curricular
            subjectName: isFP ? 'Módulo Profesional' : 'Materia',
            
            // Evaluación
            learningOutcome: isFP ? 'Resultado de Aprendizaje (RA)' : 'Competencia Específica',
            learningOutcomeShort: isFP ? 'RA' : 'CE',
            evaluationCriteria: isFP ? 'Criterio de Evaluación' : 'Criterio de Evaluación',
            
            // Contenidos
            contents: isFP ? 'Contenidos' : 'Saberes Básicos',
            
            // Competencias transversales
            transversalCompetences: isFP ? 'CPPs' : 'Competencias Clave',
            
            // Objetivos
            objectives: isFP ? 'Objetivos Generales' : 'Perfil de Salida',
            
            // Curso/Ciclo
            levelName: isFP ? 'Ciclo Formativo' : (this.state.secLevel === 'ESO' ? 'ESO' : 'Bachillerato'),
            gradeName: isFP ? this.getFPGradeName() : `${this.state.secCourse}º`,
        };
    }
    
    /**
     * Devuelve el nombre del grado de FP según el valor de fpGrade
     * @returns {string} Nombre del grado de FP
     */
    getFPGradeName() {
        const grades = {
            'basico': 'Grado Básico',
            'medio': 'Grado Medio',
            'superior': 'Grado Superior'
        };
        return grades[this.state.fpGrade] || 'Grado Medio';
    }
    
    /**
     * Devuelve los elementos del panel curricular según el nivel
     * @returns {Array} Array de objetos con los elementos del panel curricular
     */
    getCurricularElements() {
        const common = [
            { key: 'orientacion', label: 'Orientación' },
            { key: 'prospectiva', label: 'Prospectiva' },
            { key: 'metodologia', label: 'Metodología' },
            { key: 'softskills', label: 'Soft Skills' },
            { key: 'ods', label: 'ODS' },
            { key: 'xxi', label: 'Retos Siglo XXI' },
            { key: 'bloom', label: 'Taxonomía Bloom' },
            { key: 'inteligencias', label: 'Inteligencias Múltiples' },
            { key: 'dua', label: 'DUA' },
            { key: 'diversidad', label: 'Atención a la Diversidad' }
        ];
        
        // Elementos específicos de FP
        if (this.state.educationalLevel === 'FP') {
            return [
                // Elementos específicos de FP
                { key: 'orientacion', label: 'Orientación', highlight: true },
                { key: 'prospectiva', label: 'Prospectiva', highlight: true },
                { key: 'race', label: 'RA/CE', highlight: true },
                { key: 'contenidos', label: 'Contenidos', highlight: true },
                { key: 'objetivos', label: 'Objetivos Generales (ObGs)', highlight: true },
                { key: 'cpps', label: 'CPPs', highlight: true },
                // Elementos comunes
                { key: 'metodologia', label: 'Metodología' },
                { key: 'softskills', label: 'Soft Skills' },
                { key: 'ods', label: 'ODS' },
                { key: 'xxi', label: 'Retos Siglo XXI' },
                { key: 'bloom', label: 'Taxonomía Bloom' },
                { key: 'inteligencias', label: 'Inteligencias Múltiples' },
                { key: 'dua', label: 'DUA' },
                { key: 'diversidad', label: 'Atención a la Diversidad' }
            ];
        } else {
            // Secundaria (ESO / Bachillerato)
            return [
                // Elementos específicos de Secundaria (LOMLOE)
                { key: 'descripcion', label: 'Descripción', highlight: true },
                { key: 'objetivos_etapa', label: 'Objetivos de Etapa', highlight: true },
                { key: 'competenciasClave', label: 'Competencias Clave', highlight: true },
                { key: 'competenciasEspecificas', label: 'Competencias Específicas', highlight: true },
                { key: 'saberes', label: 'Saberes Básicos', highlight: true },
                // Elementos comunes
                { key: 'metodologia', label: 'Metodología' },
                { key: 'softskills', label: 'Soft Skills' },
                { key: 'ods', label: 'ODS' },
                { key: 'xxi', label: 'Retos Siglo XXI' },
                { key: 'bloom', label: 'Taxonomía Bloom' },
                { key: 'inteligencias', label: 'Inteligencias Múltiples' },
                { key: 'dua', label: 'DUA' },
                { key: 'diversidad', label: 'Atención a la Diversidad' }
            ];
        }
    }
    
    /**
     * Verifica si un elemento curricular está disponible para el nivel actual
     * @param {string} elementKey - Clave del elemento curricular
     * @returns {boolean} True si el elemento está disponible, false en caso contrario
     */
    isElementAvailable(elementKey) {
        const fpOnly = ['orientacion', 'prospectiva', 'race', 'contenidos', 'objetivos', 'cpps'];
        const secOnly = ['descripcion', 'competenciasClave', 'objetivos_etapa', 'competenciasEspecificas',
                         'saberes'];
        
        if (this.state.educationalLevel === 'FP') {
            return !secOnly.includes(elementKey);
        } else {
            return !fpOnly.includes(elementKey);
        }
    }

    /**
     * Verifica si un elemento curricular es un elemento destacado para el nivel actual
     * @param {string} elementKey - Clave del elemento curricular
     */
    loadInitialData() {
        this.state.chatMessages = [
            {
                type: 'user',
                content: '¿Puedes ayudarme a crear una UD sobre Bash scripting?',
                timestamp: new Date().toISOString()
            },
            {
                type: 'ai',
                content: `# Planificación de Unidad Didáctica: Bash Scripting

¡Por supuesto! Te ayudo a crear una **Unidad Didáctica completa** sobre Bash Scripting para Formación Profesional. Aquí tienes una estructura inicial:

## Objetivos principales

1. Comprender la sintaxis básica de Bash
2. Crear scripts automatizados para gestión de sistemas
3. Aplicar buenas prácticas de programación

## Contenidos sugeridos

- Variables y tipos de datos
- Estructuras de control (if, for, while)
- Funciones y modularización
- Gestión de archivos y directorios

## Ejemplo de código básico

\`\`\`bash
#!/bin/bash
# Script de ejemplo: backup automatizado

SOURCE_DIR="/home/user/documents"
BACKUP_DIR="/backup"
DATE=$(date +%Y%m%d)

tar -czf $BACKUP_DIR/backup_$DATE.tar.gz $SOURCE_DIR
echo "Backup completado: backup_$DATE.tar.gz"
\`\`\`

¿Qué aspecto te gustaría desarrollar primero?`,
                timestamp: new Date().toISOString()
            }
        ];
    }

    /**
     * Permite a otros componentes suscribirse a cambios en el estado.
     * @param {Function} listener - Función que se ejecutará cuando el estado cambie
     * @returns {Function} Función para desuscribirse del listener
     */
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /**
     * Notifica a todos los listeners suscritos sobre cambios en el estado.
     * Cada listener se ejecuta dentro de un bloque try-catch para evitar que errores en un listener afecten a los demás.
     * Los errores se registran en la consola para facilitar el debugging.
     * @returns {void}
     */
    notify() {
        this.listeners.forEach(listener => {
            try {
                listener(this.state);
            } catch (error) {
                console.error('Error in state listener:', error);
            }
        });
    }

    /**
     * Actualiza el estado con los valores proporcionados.
     * @param {Object} updates - Objeto con las propiedades a actualizar
     */
    setState(updates) {
        this.state = { ...this.state, ...updates };
        this.persistState();
        this.notify();
    }

    /**
     * Actualiza un valor anidado en el estado.
     * @param {string} path - Ruta al valor anidado (por ejemplo, "user.name")
     * @param {*} value - Nuevo valor a asignar
     */
    updateNestedState(path, value) {
        const keys = path.split('.');
        let current = this.state;

        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }

        current[keys[keys.length - 1]] = value;
        this.persistState();
        this.notify();
    }

    /**
     * Agrega un mensaje al chat.
     * @param {Object} message - Objeto con la información del mensaje
     * @param {string} message.type - Tipo de mensaje ('user' o 'ai')
     * @param {string} message.content - Contenido del mensaje
     */
    addChatMessage(message) {
        this.state.chatMessages.push({
            ...message,
            timestamp: new Date().toISOString()
        });
        this.notify();
    }

        // ============================================
        // Métodos para cambio de nivel educativo
        // ============================================
    
        /**
         * Establece el nivel educativo.
         * @param {string} level - Nivel educativo ('FP' o 'SEC')
         * @returns {void}
         */
    setEducationalLevel(level) {
        if (level !== 'FP' && level !== 'SEC') {
            console.error('Invalid educational level:', level);
            return;
        }
        
        this.setState({ educationalLevel: level });
        
        // Disparar evento personalizado para que otros componentes reaccionen
        document.dispatchEvent(new CustomEvent('educationalLevelChanged', { 
            detail: { level, terminology: this.getTerminology() }
        }));
        
        console.log('Educational level changed to:', level);
    }

    /**
     * Establece el grado de FP.
     * @param {string} grade - Grado de FP ('basico', 'medio', 'superior')
     * @returns {void}
     */
    setFPGrade(grade) {
        if (!['basico', 'medio', 'superior'].includes(grade)) {
            console.error('Invalid FP grade:', grade);
            return;
        }
        this.setState({ fpGrade: grade });
    }
    
    /**
     * Establece el nivel educativo secundario.
     * @param {string} level - Nivel educativo secundario ('ESO' o 'BACH')
     * @returns {void}
     */
    setSecLevel(level) {
        if (!['ESO', 'BACH'].includes(level)) {
            console.error('Invalid secondary level:', level);
            return;
        }
        this.setState({ secLevel: level });
        
        // Resetear curso si cambiamos de ESO a Bach
        if (level === 'BACH' && parseInt(this.state.secCourse) > 2) {
            this.setState({ secCourse: '1' });
        }
    }
    
    /**
     * Establece el curso del nivel educativo secundario.
     * @param {string} course - Curso del nivel educativo secundario
     * @returns {void}
     */
    setSecCourse(course) {
        this.setState({ secCourse: course });
    }

    // ============================================
    // Community and Subject Selection Methods
    // ============================================

    /**
     * Establece la comunidad.
     * @param {string} community - Comunidad a establecer
     * @returns {void}
     */
    setCommunity(community) {
        this.setState({ community });
        // Reset subject selections when community changes
        this.setState({
            selectedCycle: '',
            selectedModule: '',
            selectedModuleCycle: '',
            selectedSubject: ''
        });
    }

    /**
     * Establece la materia o ciclo seleccionado.
     * @param {string} type - Tipo de selección ('cycle' o 'subject')
     * @param {string} value - Valor a establecer
     * @returns {void}
     */
    setSubject(type, value) {
        if (type === 'cycle') {
            this.setState({
                selectedCycle: value,
                selectedModule: '',
                selectedModuleCycle: '',
                selectedSubject: value
            });
        } else if (type === 'subject') {
            this.setState({
                selectedSubject: value,
                selectedCycle: '',
                selectedModule: '',
                selectedModuleCycle: ''
            });
        }
    }

    /**
     * Establece el módulo seleccionado.
     * @param {string} cycle - Ciclo al que pertenece el módulo
     * @param {string} moduleId - ID del módulo a establecer
     * @returns {void}
     */
    setModule(cycle, moduleId) {
        this.setState({
            selectedModule: moduleId,
            selectedModuleCycle: cycle,
            selectedSubject: `${cycle}-${moduleId}`
        });
    }

    /**
     * Genera las sesiones.
     * @param {number} numSesiones - Número de sesiones a generar
     * @returns {void}
     */
    generateSesiones(numSesiones) {
        this.state.sesiones = [];
        for (let i = 1; i <= numSesiones; i++) {
            this.state.sesiones.push({
                id: `sesion-${i}`,
                numero: i,
                titulo: '',
                objetivos: '',
                descripcion: '',
                numActividades: 0,
                indicaciones: '',
                actividades: [],
                status: 'pending' // pending, adjusted, saved
            });
        }
        this.notify();
    }

    /**
     * Actualiza una sesión existente.
     * @param {string} sesionId - ID de la sesión a actualizar
     * @param {Object} updates - Objeto con las propiedades a actualizar
     * @returns {void}
     */
    updateSesion(sesionId, updates) {
        const sesion = this.state.sesiones.find(s => s.id === sesionId);
        if (sesion) {
            Object.assign(sesion, updates);
            this.notify();
        }
    }

    /**
     * Agrega una actividad a una sesión existente.
     * @param {string} sesionId - ID de la sesión a la que se agregará la actividad
     * @param {Object} actividad - Objeto con las propiedades de la actividad
     * @returns {void}
     */
    addActividad(sesionId, actividad) {
        const sesion = this.state.sesiones.find(s => s.id === sesionId);
        if (sesion) {
            sesion.actividades.push({
                id: `actividad-${Date.now()}`,
                ...actividad,
                metodosEvaluacion: []
            });
            this.notify();
        }
    }

    /**
     * Actualiza una actividad existente en una sesión.
     * @param {string} sesionId - ID de la sesión a la que pertenece la actividad
     * @param {string} actividadId - ID de la actividad a actualizar
     * @param {Object} updates - Objeto con las propiedades a actualizar
     * @returns {void}
     */
    updateActividad(sesionId, actividadId, updates) {
        const sesion = this.state.sesiones.find(s => s.id === sesionId);
        if (sesion) {
            const actividad = sesion.actividades.find(a => a.id === actividadId);
            if (actividad) {
                Object.assign(actividad, updates);
                this.notify();
            }
        }
    }

    /**
     * Obtiene el estado actual.
     * @returns {Object} Estado actual
     */
    getState() {
        return this.state;
    }

    /**
     * Persiste el estado en localStorage para mantener la configuración y selecciones del usuario entre sesiones.
     * Maneja errores de persistencia y los registra en la consola.
     * @returns {void}
     */
    persistState() {
        try {
            localStorage.setItem('theme', this.state.theme);
            localStorage.setItem('mode', this.state.mode);
            localStorage.setItem('aiModel', this.state.aiModel);
            
            // Persistir nivel educativo
            localStorage.setItem('educationalLevel', this.state.educationalLevel);
            localStorage.setItem('fpGrade', this.state.fpGrade);
            localStorage.setItem('secLevel', this.state.secLevel);
            localStorage.setItem('secCourse', this.state.secCourse);
            localStorage.setItem('selectedSubject', this.state.selectedSubject);

            // Persistir selecciones de comunidad y materia/ciclo/módulo
            localStorage.setItem('community', this.state.community);
            localStorage.setItem('selectedCycle', this.state.selectedCycle);
            localStorage.setItem('selectedModule', this.state.selectedModule);
            localStorage.setItem('selectedModuleCycle', this.state.selectedModuleCycle);
        } catch (error) {
            console.error('Error persisting state:', error);
        }
    }

    /**
     * Limpia el estado y localStorage, restableciendo la aplicación a su configuración inicial.
     * Este método es útil para pruebas o para permitir a los usuarios restablecer la aplicación.
     * @returns {void}
     */
    clearState() {
        localStorage.clear();
        this.state = {
            theme: 'light',
            mode: 'UD',
            aiModel: 'chatgpt',
            educationalLevel: 'FP',
            fpGrade: 'medio',
            secLevel: 'ESO',
            secCourse: '1',
            selectedSubject: '',
            community: 'aragon',
            selectedCycle: '',
            selectedModule: '',
            selectedModuleCycle: '',
            currentTab: 'chat',
            leftSidebarOpen: false,
            rightSidebarOpen: false,
            activeLeftPanel: null,
            activeRightPanel: null,
            sidebarClosedByResize: false,
            chatMessages: [],
            contexto: {},
            sesiones: [],
            disenoCurricular: {},
            evaluacion: {},
            recursos: {}
        };
        this.notify();
    }
}

/**
 * Crear instancia global del Store para que pueda ser accedida desde cualquier parte de la aplicación.
 */
const store = new Store();
window.AppStore = store;
