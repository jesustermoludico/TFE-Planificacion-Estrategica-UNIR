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

/**
 * Gestor único de estado temporal para la vista Resumen
 */

/**
 * Clase para gestionar el estado temporal de la vista Resumen utilizando sessionStorage.
 * Proporciona métodos para inicializar el estado desde una plantilla, verificar la necesidad de reset, obtener y actualizar el estado completo, actualizar campos específicos respetando candados, y manejar selecciones desde los menús laterales.
 */
class SessionStorageManager {
    /**
     * Constructor de la clase SessionStorageManager.
     * Inicializa las claves de almacenamiento para el estado y la plantilla.
     * Claves utilizadas:
     * - STORAGE_KEY: Clave para almacenar el estado actual del resumen.
     * - TEMPLATE_STORAGE_KEY: Clave para almacenar la plantilla JSON exacta utilizada para inicializar el estado.
     */
    constructor() {
        this.STORAGE_KEY = 'resumen_state';
        this.TEMPLATE_STORAGE_KEY = 'resumen_template';
    }

    /**
     * Inicializa el estado desde una plantilla JSON exacta.
     * @param {*} templateData - Datos de la plantilla para inicializar el estado
     * @returns {Object} Estado inicializado
     */
    async initializeFromTemplate(templateData) {
        sessionStorage.setItem(this.TEMPLATE_STORAGE_KEY, JSON.stringify(templateData));

        if (!this.hasState() || this.needsReset()) {
            this.createFromTemplate(templateData);
        }

        console.log('Estado inicializado desde nueva plantilla');
        return this.getState();
    }

    /**
     * Crea un nuevo estado basado en la plantilla exacta.
     * @param {*} templateData - Datos de la plantilla para crear el estado
     */
    createFromTemplate(templateData) {
        const initialState = {
            ...JSON.parse(JSON.stringify(templateData)), // Deep copy
            _metadata: {
                created: Date.now(),
                lastUpdate: Date.now(),
                templateSource: sessionStorage.getItem('current_education_type') || 'fp'
            }
        };

        this.setState(initialState);
        console.log('Estado creado desde nueva plantilla:', initialState);
    }

    /**
     * Verifica si existe estado en sessionStorage
     * @returns {Boolean} True si existe estado, false en caso contrario
     */
    hasState() {
        return sessionStorage.getItem(this.STORAGE_KEY) !== null;
    }

    /**
     * Verifica si el estado actual necesita ser reseteado comparando la plantilla de origen con la plantilla actual.
     * @returns {Boolean} True si necesita reset, false en caso contrario
     */
    needsReset() {
        try {
            const currentState = this.getState();
            const currentEduType = sessionStorage.getItem('current_education_type');

            if (!currentState || !currentState._metadata) {
                return true;
            }

            return currentState._metadata.templateSource !== currentEduType;
        } catch (error) {
            console.warn('Error checking reset need:', error);
            return true;
        }
    }

    /**
     * Obtiene el estado completo
     * @returns {Object|null} Estado completo si existe, null en caso contrario
     */
    getState() {
        try {
            const stateStr = sessionStorage.getItem(this.STORAGE_KEY);
            return stateStr ? JSON.parse(stateStr) : null;
        } catch (error) {
            console.error('Error getting state:', error);
            return null;
        }
    }

    /**
     * Guarda el estado completo
     * @param {*} newState - Nuevo estado a guardar
     */
    setState(newState) {
        try {
            if (!newState._metadata) {
                newState._metadata = {};
            }
            newState._metadata.lastUpdate = Date.now();
            sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(newState));
            console.log('Estado guardado');
        } catch (error) {
            console.error('Error setting state:', error);
        }
    }

    /**
     * Actualiza un campo específico por ruta respetando candados
     * @param {string} path - Ruta del campo a actualizar
     * @param {*} value - Nuevo valor a asignar
     * @param {boolean} respectLocks - Indica si se deben respetar los candados
     * @returns {boolean} True si se actualizó el campo, false en caso contrario
     */
    updateField(path, value, respectLocks = true) {
        const state = this.getState();
        if (!state) return false;

        // Verificar candado si es necesario
        if (respectLocks && this.isFieldLocked(path)) {
            console.warn(`Campo bloqueado, no se puede modificar: ${path}`);
            return false;
        }

        const keys = path.split('.');
        let current = state;

        // Navegar hasta el objeto padre
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];

            if (Array.isArray(current) && !isNaN(parseInt(key))) {
                const index = parseInt(key);
                if (!current[index]) {
                    current[index] = {};
                }
                current = current[index];
            } else {
                if (!current[key]) {
                    current[key] = {};
                }
                current = current[key];
            }
        }

        // Asignar valor final
        const finalKey = keys[keys.length - 1];
        if (Array.isArray(current) && !isNaN(parseInt(finalKey))) {
            current[parseInt(finalKey)] = value;
        } else {
            current[finalKey] = value;
        }

        this.setState(state);
        console.log(`Campo actualizado: ${path} = `, value);
        return true;
    }

    /**
     * Obtiene el valor de un campo específico
     * @param {string} path - Ruta del campo a obtener
     * @returns {*} Valor del campo si existe, null en caso contrario
     */
    getField(path) {
        const state = this.getState();
        if (!state) return null;

        const keys = path.split('.');
        let current = state;

        for (const key of keys) {
            if (Array.isArray(current) && !isNaN(parseInt(key))) {
                current = current[parseInt(key)];
            } else if (current && current.hasOwnProperty(key)) {
                current = current[key];
            } else {
                return null;
            }
        }

        return current;
    }

    /**
     * Verifica si un campo está bloqueado por candado
     * @param {string} path - Ruta del campo a verificar
     * @returns {boolean} True si el campo está bloqueado, false en caso contrario
     */
    isFieldLocked(path) {
        // Buscar candado en diferentes ubicaciones según la estructura
        const lockPaths = [
            path + '.candado',
            path.replace(/\.valor$/, '.candado'),
            path.split('.').slice(0, -1).join('.') + '.candado'
        ];

        for (const lockPath of lockPaths) {
            const lockValue = this.getField(lockPath);
            if (lockValue === true) {
                return true;
            }
        }

        return false;
    }

    /**
     * Añade un nuevo objetivo a la lista de objetivos
     * @param {*} newObjective - Nuevo objetivo a añadir
     * @returns {boolean} True si se añadió el objetivo, false en caso contrario
     */
    addObjective(newObjective) {
        const state = this.getState();
        if (!state) return false;

        if (this.isFieldLocked('objetivos.valor')) {
            console.warn('Objetivos bloqueados, no se puede añadir');
            return false;
        }

        if (!Array.isArray(state.objetivos.valor)) {
            state.objetivos.valor = [];
        }

        state.objetivos.valor.push(newObjective);
        this.setState(state);
        console.log('Objetivo añadido:', newObjective);
        return true;
    }

    /**
     * Elimina un objetivo de la lista de objetivos
     * @param {number} index - Índice del objetivo a eliminar
     * @returns {boolean} True si se eliminó el objetivo, false en caso contrario
     */
    removeObjective(index) {
        const state = this.getState();
        if (!state) return false;

        if (this.isFieldLocked('objetivos.valor')) {
            console.warn('Objetivos bloqueados, no se puede eliminar');
            return false;
        }

        if (Array.isArray(state.objetivos.valor) && index >= 0 && index < state.objetivos.valor.length) {
            state.objetivos.valor.splice(index, 1);
            this.setState(state);
            console.log('Objetivo eliminado en índice:', index);
            return true;
        }

        return false;
    }


    /**
    * Actualiza selecciones globales desde los menús laterales
    * @param {string} menuType - El identificador del menú (ods, xxi, cpps, etc.)
    * @param {Array} selections - Los datos transformados listos para guardar
    * @returns {boolean} True si se actualizaron las selecciones, false en caso contrario
    */
    updateMenuSelection(menuType, selections) {
        const state = this.getState();
        if (!state) return false;

        // Caso especial: RA/CE y Competencias Específicas se guardan en elementos_curriculares
        if (['race', 'ra_ce', 'competenciasEspecificas'].includes(menuType)) {
            const existingRows = Array.isArray(state.elementos_curriculares) ? state.elementos_curriculares : [];
            const existingById = new Map();

            existingRows.forEach(row => {
                const ra = row?.ras?.[0];
                const raId = ra?.ra_id;
                if (raId) {
                    existingById.set(raId, row);
                }
            });

            const normalizedSelections = Array.isArray(selections) ? selections : [];
            state.elementos_curriculares = normalizedSelections.map(item => {
                const raId = item?.ra_id || '';
                const previousRow = existingById.get(raId);
                const previousRa = previousRow?.ras?.[0] || {};

                return {
                    ras: [{
                        ra_id: raId,
                        ra_descripcion: item?.ra_descripcion || '',
                        ra_metodo: previousRa.ra_metodo || {
                            valor: '',
                            opciones: [
                                'Evaluación simple directa',
                                'lista de valoración',
                                'lista de control',
                                'auto-evaluación',
                                'co-evaluación'
                            ]
                        },
                        ra_evaluador: previousRa.ra_evaluador || {
                            valor: '',
                            opciones: ['Profesor', 'Alumno']
                        },
                        ra_ce: Array.isArray(item?.ra_ce) ? item.ra_ce : [],
                        ra_contenidos: Array.isArray(previousRa.ra_contenidos) ? previousRa.ra_contenidos : [{
                            bloque_id: '',
                            bloque_descripcion: '',
                            bloque_puntos: [{
                                punto_id: '',
                                punto_descripcion: ''
                            }],
                            desde_menu: 'Contenidos'
                        }],
                        candado: previousRa.candado === true
                    }],
                    desde_menu: previousRow?.desde_menu || 'RA/CE'
                };
            });

            this.setState(state);
            document.dispatchEvent(new CustomEvent('sessionStateUpdated', {
                detail: { path: 'elementos_curriculares', menuType }
            }));
            return true;
        }

        // Mapeo de tipos de menú a rutas exactas según requerimientos
        const menuMappings = {
            'ods': 'contextualizacion.ods.valor',
            'retos_xxi': 'contextualizacion.retos_xxi.valor',
            'xxi': 'contextualizacion.retos_xxi.valor',
            'objetivos_generales': 'contextualizacion.para_fp.objetivos_generales.valor',
            'objetivos': 'contextualizacion.para_fp.objetivos_generales.valor',
            'cpps': 'contextualizacion.para_fp.competencias_profesionales.valor',
            'competencias_clave': 'contextualizacion.para_eso_bachillerato.competencias_clave.cc',
            'competenciasClave': 'contextualizacion.para_eso_bachillerato.competencias_clave.cc',
            'soft_skills': 'soft_skills',
            'metodologia': 'metodologia.metodologias_aplicadas',
            'atencion_diversidad': 'atencion_diversidad',
            'dua': 'dua'
        };
        
        // Obtener la ruta exacta para el tipo de menú
        const path = menuMappings[menuType];
        if (!path) {
            console.warn('Ruta no definida para el menú:', menuType);
            return false;
        }

        // Verificar si el campo está bloqueado antes de escribir
        if (this.isFieldLocked(path)) {
            console.warn(`Intento de escritura en campo bloqueado: ${path}`);
            return false;
        }

        //Normalizacion 
        let normalizedSelections = selections;

        // Normalizar datos según tipo de menú para asegurar que cumplen el esquema esperado
        if (menuType === 'metodologia') {
            normalizedSelections = Array.isArray(selections)
                ? selections.map(item => ({
                    metodologia_id: item.metodologia_id || '',
                    metodologia_titulo: item.metodologia_titulo || '',
                    metodologia_descripcion: item.metodologia_descripcion || '',
                    metodologia_sugerencia: item.metodologia_sugerencia || '',
                    candado: item.candado === true
                }))
                : [];
        }

        // Normalización específica para Soft Skills con estructura anidada
        if (menuType === 'soft_skills') {
            normalizedSelections = Array.isArray(selections)
                ? selections.map(group => ({
                    grupo_id: group.grupo_id || '',
                    grupo_descripcion: group.grupo_descripcion || '',
                    skill: Array.isArray(group.skill)
                        ? group.skill.map(sk => ({
                            sk_id: sk.sk_id || '',
                            sk_descripcion: sk.sk_descripcion || '',
                            sk_items: Array.isArray(sk.sk_items)
                                ? sk.sk_items.map(it => ({
                                    skitems_id: it.skitems_id || '',
                                    skitems_descripcion: it.skitems_descripcion || ''
                                }))
                                : [],
                            sk_metodo: sk.sk_metodo || {
                                valor: '',
                                opciones: [
                                    'Evaluación simple directa',
                                    'lista de valoración',
                                    'lista de control',
                                    'auto-evaluación',
                                    'co-evaluación'
                                ]
                            },
                            sk_agente: sk.sk_agente || {
                                valor: '',
                                opciones: ['Profesor', 'Alumno']
                            }
                        }))
                        : [],
                    desde_menu: 'Soft Skills',
                    candado: group.candado === true
                }))
                : [];
        }

        // Actualizar el estado y guardar
        this.updateField(path, normalizedSelections, false);

        // Disparar evento para que el ResumenComponent se entere del cambio
        document.dispatchEvent(new CustomEvent('sessionStateUpdated', {
            detail: { path, menuType }
        }));

        return true;
    }

    /**
     * Transforma selecciones de menús laterales a la estructura específica requerida para almacenamiento, según el tipo de menú.
     * @param {*} menuType 
     * @param {*} selections 
     * @returns {Array} - Selecciones transformadas listas para almacenamiento
     */
    transformSelectionsForStorage(menuType, selections) {
        if (!Array.isArray(selections)) return [];

        // Transformación específica según tipo de menú para asegurar que los datos cumplen el esquema esperado
        switch (menuType) {
            case 'ods':
                return selections.map(item => ({
                    ods_numer: item.ods_numer || '',
                    ods_descripcion: item.ods_descripcion || '',
                    metas: (item.metas || []).map(meta => ({
                        meta_id: meta.meta_id || '',
                        meta_descripcion: meta.meta_descripcion || ''
                    }))
                }));
            case 'retos_xxi':
            case 'xxi':
                return selections.map(item => ({
                    reto_id: item.reto_id || '',
                    reto_titulo: item.reto_titulo || '',
                    reto_descripcion: item.reto_descripcion || ''
                }));
            case 'objetivos_generales':
            case 'objetivos':
                return selections.map(item => ({
                    obg_id: item.obg_id || '',
                    obg_descripcion: item.obg_descripcion || ''
                }));
            case 'cpps':
                return selections.map(item => ({
                    ccps_id: item.ccps_id || '', // "Orden"
                    cpps_descripcion: item.cpps_descripcion || '' // "Título"
                }));
            case 'competencias_clave':
            case 'competenciasClave':
                return selections.map(item => ({
                    cc_id: item.cc_id || '',
                    cc_descripcion: item.cc_descripcion || '',
                    cc_descriptores: (item.cc_descriptores || []).map(desc => ({
                        ccd_id: desc.ccd_id || '',
                        ccd_descripcion_eso: desc.ccd_descripcion_eso || '',
                        ccd_descripcion_bachillerato: desc.ccd_descripcion_bachillerato || ''
                    }))
                }));
            default:
                return selections;
        }
    }


    /**
     * Actualiza datos de contextualización en el estado
     * @param {string} menuType - El tipo de menú (ods, retos_xxi, objetivos_generales, cpps, competencias_clave)
     * @param {Array} selectedData - Los datos seleccionados para actualizar
     * @returns {boolean} True si se actualizaron los datos, false en caso contrario
     */
    updateContextualizacionData(menuType, selectedData) {
        const state = this.getState();
        if (!state) return false;

        // Asegurar que existe la estructura contextualizacion
        if (!state.contextualizacion) {
            state.contextualizacion = {};
        }

        try {
            switch (menuType) {
                case 'ods':
                    if (!state.contextualizacion.ods) {
                        state.contextualizacion.ods = { valor: [] };
                    }
                    state.contextualizacion.ods.valor = this.transformODSData(selectedData);
                    break;

                case 'retos_xxi':
                    if (!state.contextualizacion.retos_xxi) {
                        state.contextualizacion.retos_xxi = { valor: [] };
                    }
                    state.contextualizacion.retos_xxi.valor = this.transformRetosData(selectedData);
                    break;

                case 'objetivos_generales':
                    if (!state.contextualizacion.para_fp) {
                        state.contextualizacion.para_fp = {};
                    }
                    if (!state.contextualizacion.para_fp.objetivos_generales) {
                        state.contextualizacion.para_fp.objetivos_generales = { valor: [] };
                    }
                    state.contextualizacion.para_fp.objetivos_generales.valor = this.transformObjetivosData(selectedData);
                    break;

                case 'cpps':
                    if (!state.contextualizacion.para_fp) {
                        state.contextualizacion.para_fp = {};
                    }
                    if (!state.contextualizacion.para_fp.competencias_profesionales) {
                        state.contextualizacion.para_fp.competencias_profesionales = { valor: [] };
                    }
                    state.contextualizacion.para_fp.competencias_profesionales.valor = this.transformCPPsData(selectedData);
                    break;

                case 'competencias_clave':
                    if (!state.contextualizacion.para_eso_bachillerato) {
                        state.contextualizacion.para_eso_bachillerato = {};
                    }
                    if (!state.contextualizacion.para_eso_bachillerato.competencias_clave) {
                        state.contextualizacion.para_eso_bachillerato.competencias_clave = { cc: [] };
                    }
                    state.contextualizacion.para_eso_bachillerato.competencias_clave.cc = this.transformCompetenciasClaveData(selectedData);
                    break;

                default:
                    console.warn('Tipo de menú no reconocido:', menuType);
                    return false;
            }

            this.setState(state);
            console.log(`Datos de contextualización actualizados para ${menuType}:`, selectedData);
            return true;

        } catch (error) {
            console.error('Error actualizando datos de contextualización:', error);
            return false;
        }
    }

    /**
     * Transforma datos ODS según especificaciones
     * @param {Array} selectedData - Los datos seleccionados para transformar
     * @returns {Array} - Datos transformados listos para almacenamiento
     */
    transformODSData(selectedData) {
        if (!Array.isArray(selectedData)) return [];

        return selectedData.map(item => ({
            ods_numer: item.numero || item.ods_numer || '',
            ods_descripcion: item.descripcion || item.ods_descripcion || '',
            metas: (item.metas || []).map(meta => ({
                meta_id: meta.id || meta.meta_id || '',
                meta_descripcion: meta.descripcion || meta.meta_descripcion || ''
            }))
        }));
    }

    /**
     * Transforma datos Retos XXI según especificaciones
     * @param {Array} selectedData - Los datos seleccionados para transformar
     * @returns {Array} - Datos transformados listos para almacenamiento
     */
    transformRetosData(selectedData) {
        if (!Array.isArray(selectedData)) return [];

        return selectedData.map(item => ({
            reto_id: item.id || item.reto_id || '',
            reto_titulo: item.titulo || item.reto_titulo || '',
            reto_descripcion: item.descripcion || item.reto_descripcion || ''
        }));
    }

    /**
     * Transforma datos Objetivos Generales según especificaciones
     * @param {Array} selectedData - Los datos seleccionados para transformar
     * @returns {Array} - Datos transformados listos para almacenamiento
     */
    transformObjetivosData(selectedData) {
        if (!Array.isArray(selectedData)) return [];

        return selectedData.map(item => ({
            obg_id: item.codigo || item.id || item.obg_id || '',
            obg_descripcion: item.descripcion || item.obg_descripcion || ''
        }));
    }

    /**
     * Transforma datos CPPs según especificaciones
     * @param {Array} selectedData - Los datos seleccionados para transformar
     * @returns {Array} - Datos transformados listos para almacenamiento
     */
    transformCPPsData(selectedData) {
        if (!Array.isArray(selectedData)) return [];

        return selectedData.map(item => ({
            ccps_id: item.orden || item.id || item.ccps_id || item.cpps_id || '',
            cpps_descripcion: item.titulo || item.descripcion || item.cpps_descripcion || ''
        }));
    }

    /**
     * Transforma datos Competencias Clave según especificaciones
     * @param {Array} selectedData - Los datos seleccionados para transformar
     * @returns {Array} - Datos transformados listos para almacenamiento
     */
    transformCompetenciasClaveData(selectedData) {
        if (!Array.isArray(selectedData)) return [];

        return selectedData.map(item => ({
            cc_id: item.id || item.competencia || item.cc_id || '',
            cc_descripcion: item.descripcion || item.cc_descripcion || '',
            cc_descriptores: (item.cc_descriptores || item.descriptores || []).map(desc => ({
                ccd_id: desc.id || desc.codigo || desc.ccd_id || '',
                ccd_descripcion_eso: desc.eso || desc.ccd_descripcion_eso || '',
                ccd_descripcion_bachillerato: desc.bachillerato || desc.ccd_descripcion_bachillerato || ''
            })),
            candado: item.candado ?? false
        }));
    }


    /**
     * Actualiza la selección de una actividad en la secuenciación didáctica
     * @param {number} activityIndex - Índice de la actividad a actualizar
     * @param {string} field - Campo a actualizar ('bloom' o 'inteligencias_multiples')
     * @param {Array} selection - Selección de datos para actualizar
     * @returns {boolean} - Indica si la actualización fue exitosa
     */
    updateActividadSelection(activityIndex, field, selection) {
        const state = this.getState();
        if (!state) return false;

        if (!Array.isArray(state.secuenciacion_didactica)) {
            console.warn('secuenciacion_didactica no es un array');
            return false;
        }

        const actividad = state.secuenciacion_didactica[activityIndex];
        if (!actividad) {
            console.warn(`No existe actividad en índice ${activityIndex}`);
            return false;
        }

        if (field === 'bloom') {
            actividad.bloom = Array.isArray(selection)
                ? selection.map(item => ({
                    bloom_nivel: item.bloom_nivel || item.nivel || '',
                    bloom_definicion: item.bloom_definicion || item.definicion || '',
                    bloom_verbos_clave: item.bloom_verbos_clave || item.verbos || '',
                    bloom_ejemplos: item.bloom_ejemplos || item.ejemplos || '',
                    desde_menu: 'Taxonomía de Bloom'
                }))
                : [];
        }

        if (field === 'inteligencias_multiples') {
            actividad.inteligencias_multiples = Array.isArray(selection)
                ? selection.map(item => ({
                    im_inteligencia: item.im_inteligencia || item.inteligencia || '',
                    im_definicion: item.im_definicion || item.definicion || '',
                    im_perfil_alumno: item.im_perfil_alumno || item.perfil || '',
                    im_estrategias_clave: item.im_estrategias_clave || item.estrategias || '',
                    desde_menu: 'Inteligencias Múltiples'
                }))
                : [];
        }

        this.setState(state);

        document.dispatchEvent(new CustomEvent('sessionStateUpdated', {
            detail: {
                path: `secuenciacion_didactica.${activityIndex}.${field}`,
                value: field === 'bloom'
                    ? actividad.bloom
                    : actividad.inteligencias_multiples
            }
        }));

        return true;
    }
    //updateActividadSelection(activityIndex, field, selection) {
    //    const state = this.getState();

    //    if (
    //        !state ||
    //        !state.secuenciacion_didactica ||
    //        !Array.isArray(state.secuenciacion_didactica.actividades)
    //    ) {
    //        return;
    //    }

    //    const actividad = state.secuenciacion_didactica.actividades[activityIndex];
    //    if (!actividad) return;

    //    if (field === 'bloom') {
    //        actividad.bloom = {
    //            valor: Array.isArray(selection)
    //                ? selection.map(item => ({
    //                    bloom_id: item.bloom_id || item.id || '',
    //                    bloom_descripcion: item.bloom_descripcion || item.descripcion || ''
    //                }))
    //                : []
    //        };
    //    }

    //    if (field === 'inteligencias_multiples') {
    //        actividad.inteligencias_multiples = {
    //            valor: Array.isArray(selection)
    //                ? selection.map(item => ({
    //                    im_id: item.im_id || item.id || '',
    //                    im_descripcion: item.im_descripcion || item.descripcion || ''
    //                }))
    //                : []
    //        };
    //    }

    //    this.saveState(state);
    //    this.notifyStateUpdated();
    //}

    /**
     * Actualiza el contexto de una fila para elementos curriculares
     * @param {string} section - Sección a la que pertenece la fila
     * @param {number} rowIndex - Índice de la fila a actualizar
     * @param {string} fieldType - Tipo de campo a actualizar ('bloom', 'inteligencias_multiples', 'contenidos', 'saberes', 'ra_ce')
     * @param {Array} selections - Selección de datos para actualizar
     * @returns {boolean} - Indica si la actualización fue exitosa
     */
    updateRowContext(section, rowIndex, fieldType, selections) {
        const state = this.getState();
        if (!state) return false;

        const rowPath = `${section}.${rowIndex}`;
        if (this.isFieldLocked(rowPath + '.candado')) {
            console.warn(`Fila bloqueada: ${section}[${rowIndex}]`);
            return false;
        }

        // Actualizar según tipo de campo en estructura actualizada
        if (fieldType === 'bloom') {
            this.updateField(`${section}.${rowIndex}.bloom`, selections, false);
        } else if (fieldType === 'inteligencias_multiples') {
            this.updateField(`${section}.${rowIndex}.inteligencias_multiples`, selections, false);
        } else if (fieldType === 'contenidos' || fieldType === 'saberes') {
            this.updateField(`${section}.${rowIndex}.ras.0.ra_contenidos`, selections, false);
        } else if (fieldType === 'ra_ce') {
            const currentRa = this.getField(`${section}.${rowIndex}.ras.0`) || {};

            const firstSelection = Array.isArray(selections) && selections.length > 0
                ? selections[0]
                : {};

            const updatedRa = {
                ra_id: firstSelection.ra_id || currentRa.ra_id || '',
                ra_descripcion: firstSelection.ra_descripcion || currentRa.ra_descripcion || '',
                ra_metodo: currentRa.ra_metodo || {
                    valor: '',
                    opciones: [
                        'Evaluación simple directa',
                        'lista de valoración',
                        'lista de control',
                        'auto-evaluación',
                        'co-evaluación'
                    ]
                },
                ra_evaluador: currentRa.ra_evaluador || {
                    valor: '',
                    opciones: ['Profesor', 'Alumno']
                },
                ra_ce: Array.isArray(firstSelection.ra_ce) ? firstSelection.ra_ce : [],
                ra_contenidos: Array.isArray(currentRa.ra_contenidos) ? currentRa.ra_contenidos : [],
                candado: currentRa.candado === true
            };

            this.updateField(`${section}.${rowIndex}.ras`, [updatedRa], false);
        }

        document.dispatchEvent(new CustomEvent('sessionStateUpdated', {
            detail: {
                section,
                rowIndex,
                fieldType
            }
        }));

        console.log(`Contexto por fila actualizado: ${section}[${rowIndex}].${fieldType}`, selections);
        return true;
    }

    /**
     * Añade nueva actividad a secuenciación didáctica
     * @returns {boolean} - Indica si la adición fue exitosa
     */
    addNewActivity() {
        const state = this.getState();
        if (!state) return false;

        if (!Array.isArray(state.secuenciacion_didactica)) {
            state.secuenciacion_didactica = [];
        }

        const nextNumber = state.secuenciacion_didactica.length + 1;
        const newActivity = {
            sd_numero_actividad: {
                sd_valor: nextNumber,
                editable: true
            },
            sd_actividad: {
                sd_titulo: {
                    valor: "",
                    editable: true
                },
                sd_descripcion: {
                    valor: "",
                    editable: true
                }
            },
            sd_metodo: {
                valor: "",
                opciones: [
                    "Evaluación simple directa",
                    "lista de valoración",
                    "lista de control",
                    "auto-evaluación",
                    "co-evaluación"
                ],
                editable: true
            },
            sd_agente: {
                valor: "",
                opciones: ["profesor", "alumno"],
                editable: true
            },
            bloom: [
                {
                    bloom_nivel: "",
                    bloom_definicion: "",
                    bloom_verbos_clave: "",
                    bloom_ejemplos: "",
                    desde_menu: "Taxonomía de Bloom"
                }
            ],
            inteligencias_multiples: [
                {
                    im_inteligencia: "",
                    im_definicion: "",
                    im_perfil_alumno: "",
                    im_estrategias_clave: "",
                    desde_menu: "Taxonomía de Bloom"
                }
            ],
            candado: false
        };

        state.secuenciacion_didactica.push(newActivity);
        this.setState(state);
        console.log('Nueva actividad añadida');
        return true;
    }

    /**
     * Toggle candado de un campo
     * @param {string} path - Ruta del campo a bloquear/desbloquear
     * @returns {boolean} - Nuevo estado del candado
     */
    toggleLock(path) {
        const lockPath = path.includes('.candado') ? path : path + '.candado';
        const currentLock = this.getField(lockPath);
        const newLock = !currentLock;

        this.updateField(lockPath, newLock, false);
        console.log(`Candado ${newLock ? 'cerrado' : 'abierto'} para:`, path);
        return newLock;
    }

    /**
     * Reset completo del estado
     * @returns {boolean} - Indica si el reset fue exitoso
     */
    reset() {
        const template = sessionStorage.getItem(this.TEMPLATE_STORAGE_KEY);
        if (template) {
            this.createFromTemplate(JSON.parse(template));
            console.log('Estado reseteado a plantilla');
            return true;
        } else {
            console.warn('No hay plantilla para reset');
            return false;
        }
    }

    /**
     * Reset por cambio de contexto educativo
     * @param {string} newEduType - Nuevo tipo de educación
     * @param {string|null} newModule - Nuevo módulo (opcional)
     * @param {string|null} newStage - Nueva etapa (opcional)
     */
    resetForContextChange(newEduType, newModule = null, newStage = null) {
        sessionStorage.removeItem(this.STORAGE_KEY);
        sessionStorage.setItem('current_education_type', newEduType);
        if (newModule) sessionStorage.setItem('current_module', newModule);
        if (newStage) sessionStorage.setItem('current_stage', newStage);

        console.log(`Reset por cambio de contexto: ${newEduType}/${newModule}/${newStage}`);
    }

    /**
     * Exporta todo el estado para integración con IA
     * @returns {Object|null} - Estado exportado listo para IA o null si no hay estado
     */
    exportStateForAI() {
        const state = this.getState();
        if (!state) return null;

        const exportedState = JSON.parse(JSON.stringify(state));
        exportedState._lockStatus = this.getLockStatus(state);

        console.log('Estado exportado para IA');
        return exportedState;
    }

    /**
     * Obtiene el estado de candados de todos los campos
     * @param {Object} state - Estado del que se obtendrán los candados
     * @param {string} [prefix=''] - Prefijo para las rutas de los candados
     * @returns {Object} - Objeto con el estado de los candados
     */
    getLockStatus(state, prefix = '') {
        const locks = {};

        const checkLocks = (obj, path) => {
            if (!obj || typeof obj !== 'object') return;

            Object.keys(obj).forEach(key => {
                const currentPath = path ? `${path}.${key}` : key;
                const value = obj[key];

                if (key === 'candado' && typeof value === 'boolean') {
                    locks[currentPath.replace('.candado', '')] = value;
                } else if (typeof value === 'object' && value !== null) {
                    if (Array.isArray(value)) {
                        value.forEach((item, index) => {
                            checkLocks(item, `${currentPath}.${index}`);
                        });
                    } else {
                        checkLocks(value, currentPath);
                    }
                }
            });
        };

        checkLocks(state, prefix);
        return locks;
    }

    /**
     * Aplica actualización parcial respetando candados
     * @param {Object} proposedChanges - Cambios propuestos para aplicar
     * @returns {Object} - Resultado de la actualización parcial
     */
    applyPartialUpdate(proposedChanges) {
        const state = this.getState();
        if (!state) {
            return { success: false, error: 'No state available' };
        }

        const appliedChanges = [];
        const rejectedChanges = [];

        const applyChanges = (changes, basePath = '') => {
            Object.keys(changes).forEach(key => {
                if (key.startsWith('_')) {
                    return;
                }

                const currentPath = basePath ? `${basePath}.${key}` : key;
                const newValue = changes[key];

                if (typeof newValue === 'object' && newValue !== null && !Array.isArray(newValue)) {
                    applyChanges(newValue, currentPath);
                } else {
                    const isLocked = this.isFieldLocked(currentPath);

                    if (isLocked) {
                        rejectedChanges.push({
                            path: currentPath,
                            value: newValue,
                            reason: 'Field is locked'
                        });
                    } else {
                        const success = this.updateField(currentPath, newValue, false);
                        if (success) {
                            appliedChanges.push({
                                path: currentPath,
                                value: newValue
                            });
                        } else {
                            rejectedChanges.push({
                                path: currentPath,
                                value: newValue,
                                reason: 'Update failed'
                            });
                        }
                    }
                }
            });
        };

        applyChanges(proposedChanges);

        console.log(`Actualización parcial: ${appliedChanges.length} aplicados, ${rejectedChanges.length} rechazados`);

        return {
            success: true,
            appliedChanges,
            rejectedChanges,
            totalProposed: appliedChanges.length + rejectedChanges.length
        };
    }

    /**
     * Limpia completamente el estado eliminando las claves de almacenamiento
     * @returns {void}
     */
    clearState() {
        sessionStorage.removeItem(this.STORAGE_KEY);
        sessionStorage.removeItem(this.TEMPLATE_STORAGE_KEY);
        console.log('Estado limpio');
    }

    /**
     * Obtiene los datos de contextualización
     * @returns {Object} - Datos de contextualización
     */
    getContextualizacionData() {
        const state = this.getState();
        if (!state || !state.contextualizacion) {
            return {
                ods: [],
                retos_xxi: [],
                objetivos_generales: [],
                competencias_profesionales: [],
                competencias_clave: []
            };
        }

        const ctx = state.contextualizacion;

        return {
            ods: ctx.ods?.valor || [],
            retos_xxi: ctx.retos_xxi?.valor || [],
            objetivos_generales: ctx.para_fp?.objetivos_generales?.valor || [],
            competencias_profesionales: ctx.para_fp?.competencias_profesionales?.valor || [],
            competencias_clave: ctx.para_eso_bachillerato?.competencias_clave?.cc || []
        };
    }

    /**
     * Verifica si hay datos de contextualización para un elemento específico
     * @param {string} element - El elemento a verificar (ods, retos_xxi, objetivos_generales, competencias_profesionales, competencias_clave)
     * @returns {boolean} - True si hay datos, false si no hay datos o el elemento no es válido
     */
    hasContextualizacionData(element) {
        const data = this.getContextualizacionData();
        return Array.isArray(data[element]) && data[element].length > 0;
    }

    /**
     * Obtiene mensaje de estado vacío para la vista de resumen
     * @param {string} element - El elemento para el cual obtener el mensaje (ods, retos_xxi, objetivos_generales, competencias_profesionales, competencias_clave)
     * @returns {string} - Mensaje de estado vacío
     */
    getEmptyMessage(element) {
        const messages = {
            ods: 'No hay ODS seleccionados',
            retos_xxi: 'No hay Retos del Siglo XXI seleccionados',
            objetivos_generales: 'No hay Objetivos Generales seleccionados',
            competencias_profesionales: 'No hay Competencias Profesionales seleccionadas',
            competencias_clave: 'No hay Competencias Clave seleccionadas'
        };
        return messages[element] || 'Sin selecciones...';
    }

    /**
     * Realiza un reset forzado del estado, ignorando todos los candados
     * @returns {boolean} - True si el reset fue exitoso, false si no se pudo realizar
     */
    forceReset() {
        this.clearState();
        const template = sessionStorage.getItem(this.TEMPLATE_STORAGE_KEY);
        if (template) {
            this.createFromTemplate(JSON.parse(template));
            console.log('Reset forzado completado ignorando candados');
            return true;
        } else {
            // Intentar recargar desde archivo base
            console.warn('Plantilla no disponible para reset forzado');
            return false;
        }
    }

    /**
     * Elimina actividad de secuenciación didáctica
     * @param {number} index - Índice de la actividad a eliminar
     * @returns {boolean} - True si la actividad fue eliminada, false si no se pudo eliminar
     */
    removeActivity(index) {
        const state = this.getState();
        if (!state || !Array.isArray(state.secuenciacion_didactica)) return false;

        if (index >= 0 && index < state.secuenciacion_didactica.length) {
            state.secuenciacion_didactica.splice(index, 1);

            // Reordenar números de actividad
            state.secuenciacion_didactica.forEach((activity, newIndex) => {
                activity.sd_numero_actividad.sd_valor = newIndex + 1;
            });

            this.setState(state);
            console.log('Actividad eliminada y lista reordenada');
            return true;
        }

        return false;
    }

    /**
     * Reordena actividades en secuenciación didáctica
     * @param {number} fromIndex - Índice de la actividad a mover
     * @param {number} toIndex - Índice de destino para la actividad
     * @returns {boolean} - True si la actividad fue reordenada, false si no se pudo reordenar
     */
    reorderActivity(fromIndex, toIndex) {
        const state = this.getState();
        if (!state || !Array.isArray(state.secuenciacion_didactica)) return false;

        if (fromIndex < 0 || toIndex < 0 || fromIndex >= state.secuenciacion_didactica.length || toIndex >= state.secuenciacion_didactica.length) {
            return false;
        }

        // Mover elemento
        const [removed] = state.secuenciacion_didactica.splice(fromIndex, 1);
        state.secuenciacion_didactica.splice(toIndex, 0, removed);

        // Reordenar números de actividad
        state.secuenciacion_didactica.forEach((activity, index) => {
            activity.sd_numero_actividad.sd_valor = index + 1;
        });

        this.setState(state);
        console.log(`Actividad movida de posición ${fromIndex} a ${toIndex}`);
        return true;
    }
}

/**
 * Instancia global del gestor de almacenamiento en sesión
 */
window.sessionStorageManager = new SessionStorageManager();

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SessionStorageManager;
}
