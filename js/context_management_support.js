/**
 * Context Management Support - Soporte adicional para funcionalidades de Educaci�n Secundaria
 * Trabaja en conjunto con context_management.js
 */

/**
 * Funciones de utilidad para manejar markdown en la aplicación, incluyendo renderizado a HTML, extracción de texto plano y truncado de texto.
 * Utiliza la biblioteca marked para el renderizado de markdown a HTML.
 * Incluye:
 * - render: Renderiza markdown a HTML utilizando la biblioteca marked.
 * - toPlainText: Extrae texto plano de una cadena markdown eliminando caracteres especiales.
 * - truncate: Trunca el texto markdown a una longitud máxima, devolviendo solo el texto plano.
 * - sanitizeResponse: Limpia una cadena de texto para extraer solo el JSON relevante, eliminando markdown, bloques de código y texto explicativo común.
 * - validateSecondaryDescriptionData: Función de validación para verificar que todos los datos necesarios están disponibles para el popup de descripción de secundaria.
 * - initSecondarySupport: Función de inicialización para configurar el soporte adicional de secundaria, incluyendo la configuración de event handlers específicos para elementos de secundaria.
 * - setupSecondaryEventHandlers: Configura los event handlers específicos para elementos de secundaria, como la actualización de datos en el popup de descripción cuando se selecciona una asignatura de secundaria.
 */
function initSecondarySupport() {
    console.log('Initializing Secondary Education Support...');

    // Verificar que el modal component est� disponible
    if (typeof window !== 'undefined') {
        // Esperar que el modal component est� disponible
        const checkModalComponent = setInterval(() => {
            if (window.modalComponent) {
                console.log(' Modal component detected, secondary support ready');
                clearInterval(checkModalComponent);
                setupSecondaryEventHandlers();
            }
        }, 100);

        // Timeout despu�s de 5 segundos
        setTimeout(() => {
            clearInterval(checkModalComponent);
        }, 5000);
    }
}

/**
 * Configura los event handlers específicos para elementos de secundaria, como la actualización de datos en el popup de descripción cuando se selecciona una asignatura de secundaria.
 * Se extiende la función updatePopupsWithSubjectData del context manager para incluir lógica adicional que maneje los datos específicos necesarios para el popup de descripción de secundaria.
 * También se incluyen validaciones y logs detallados para asegurar que los datos necesarios estén presentes y para facilitar el debugging en caso de problemas con la carga de datos en el popup.
 * Incluye verificaciones para asegurar que los datos específicos requeridos para el popup de descripción estén presentes, y logs detallados de la estructura de los datos para facilitar el debugging.
 * @returns {void}
 */
function setupSecondaryEventHandlers() {
    console.log('Setting up secondary event handlers...');

    // Verificar que el context manager est� disponible
    if (window.contextManager) {
        // Agregar listener para cuando se seleccione una asignatura de secundaria
        const originalUpdatePopupsWithSubjectData = window.contextManager.updatePopupsWithSubjectData.bind(window.contextManager);

        // Extender la funci�n existente
        window.contextManager.updatePopupsWithSubjectData = async function(subjectData) {
            console.log('Enhanced updatePopupsWithSubjectData called with:', subjectData);

            // Llamar a la funci�n original
            await originalUpdatePopupsWithSubjectData(subjectData);

            // Funcionalidades adicionales espec�ficas para el popup de Descripci�n
            if (subjectData && window.modalComponent) {
                console.log(' Setting up description popup data for secondary subject');

                // Asegurar que todos los datos est�n disponibles para el popup de descripci�n
                if (!window.modalComponent.secondarySubjectData) {
                    window.modalComponent.secondarySubjectData = subjectData;
                    console.log(' Secondary subject data initialized in modal component');
                }

                // Verificar datos espec�ficos requeridos para descripci�n
                const requiredKeys = ['asignatura', 'etapa', 'curso', 'introduccion', 'ejes_competenciales', 'orientaciones_metodologicas'];
                const missingKeys = requiredKeys.filter(key => !subjectData[key]);

                if (missingKeys.length > 0) {
                    console.warn('Missing required keys for description popup:', missingKeys);
                } else {
                    console.log(' All required keys present for description popup');
                }

                // Log de estructura de datos para debugging
                console.log('Subject data structure for description:', {
                    asignatura: subjectData.asignatura,
                    etapa: subjectData.etapa,
                    curso: subjectData.curso,
                    hasIntroduccion: !!subjectData.introduccion,
                    hasEjesCompetenciales: !!subjectData.introduccion?.ejes_competenciales,
                    hasOrientaciones: !!subjectData.orientaciones_metodologicas,
                    totalKeys: Object.keys(subjectData).length
                });
            }
        };

        console.log(' Secondary event handlers configured successfully');
    } else {
        console.warn('Context manager not available for secondary support');
    }
}

/**
 * Función de validación para verificar que todos los datos necesarios están disponibles para el popup de descripción de secundaria.
 * Verifica que el modal component y los datos específicos necesarios para el popup de descripción estén presentes, y que contengan las claves requeridas.
 * Incluye logs detallados para facilitar el debugging en caso de problemas con la carga de datos en el popup.
 * @returns {boolean} - Devuelve true si los datos son válidos y completos, false en caso contrario.
 */
function validateSecondaryDescriptionData() {
    if (!window.modalComponent || !window.modalComponent.secondarySubjectData) {
        console.error('Secondary subject data not available for description popup');
        return false;
    }

    // Verificar que los datos necesarios estén presentes
    const data = window.modalComponent.secondarySubjectData;
    const requiredKeys = ['asignatura', 'etapa', 'curso', 'introduccion'];

    for (const key of requiredKeys) {
        if (!data[key]) {
            console.error(`Missing required key for description: ${key}`);
            return false;
        }
    }

    console.log(' Secondary description data validation passed');
    return true;
}

/**
 * Funciones de utilidad para manejar markdown en la aplicación, incluyendo renderizado a HTML, extracción de texto plano y truncado de texto.
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
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSecondarySupport);
} else {
    initSecondarySupport();
}

// Exportar funciones para uso externo si es necesario
window.secondarySupport = {
    validateSecondaryDescriptionData,
    initSecondarySupport,
    setupSecondaryEventHandlers
};