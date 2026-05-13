/**
 * Validador de esquema para resumen_fp.json
 */

/**
 * Clase para validar esquemas de datos.
 * Proporciona métodos para verificar la estructura y los campos requeridos en un objeto de datos.
 * Incluye:
 * - validateResponse: Valida un objeto de datos contra un esquema predefinido, verificando la presencia de campos requeridos y la estructura básica.
 * - hasPath: Verifica si un objeto tiene una ruta específica de propiedades.
 * - sanitizeResponse: Limpia una cadena de texto para extraer solo el JSON relevante, eliminando markdown, bloques de código y texto explicativo común.
 */
class SchemaValidator {
    /**
     * Constructor de la clase SchemaValidator.
     * Inicializa los campos requeridos para la validación.
     * Campos requeridos:
     * - numero.valor
     * - trimestre.valor
     * - titulo.valor
     * - objetivos.valor
     * - descripcion.valor
     * - contextualizacion
     * - desafio_producto
     * - elementos_curriculares
     * - soft_skills
     * - metodologia
     * - secuenciacion_didactica
     * - atencion_diversidad
     * - dua
     */
    constructor() {
        this.requiredFields = [
            'numero.valor',
            'trimestre.valor',
            'titulo.valor',
            'objetivos.valor',
            'descripcion.valor',
            'contextualizacion',
            'desafio_producto',
            'elementos_curriculares',
            'soft_skills',
            'metodologia',
            'secuenciacion_didactica',
            'atencion_diversidad',
            'dua'
        ];
    }

    /**
     * Valida un objeto de datos contra el esquema predefinido.
     * @param {*} response - Objeto de datos o cadena JSON a validar
     * @returns {Object} Resultado de la validación
     */
    validateResponse(response) {
        try {
            // Intentar parsear si es string
            const data = typeof response === 'string' ? JSON.parse(response) : response;

            // Verificar campos requeridos
            const missingFields = this.requiredFields.filter(field => {
                return !this.hasPath(data, field);
            });

            if (missingFields.length > 0) {
                console.warn('Campos faltantes en respuesta IA:', missingFields);
            }

            // Validar estructura básica
            if (!data.numero || !data.titulo) {
                throw new Error('Estructura básica inválida: faltan numero o titulo');
            }

            return {
                isValid: missingFields.length === 0,
                data: data,
                missingFields: missingFields,
                errors: []
            };

        } catch (error) {
            return {
                isValid: false,
                data: null,
                missingFields: [],
                errors: [error.message]
            };
        }
    }

    /**
     * Verifica si un objeto tiene una ruta específica de propiedades.
     * @param {*} obj - Objeto a verificar
     * @param {String} path - Ruta de propiedades separadas por puntos
     * @returns {Boolean} True si la ruta existe, false en caso contrario
     */
    hasPath(obj, path) {
        const keys = path.split('.');
        let current = obj;

        for (const key of keys) {
            if (current === null || current === undefined || !current.hasOwnProperty(key)) {
                return false;
            }
            current = current[key];
        }

        return true;
    }

    /**
     * Limpia una cadena de texto para extraer solo el JSON relevante, eliminando markdown, bloques de código y texto explicativo común.
     * @param {String} responseText - Texto de respuesta a limpiar
     * @returns {String} Texto limpio con solo el JSON relevante
     */
    sanitizeResponse(responseText) {
        // Limpiar markdown, bloques de código y texto extra
        let cleaned = responseText;

        // Remover bloques de código markdown
        cleaned = cleaned.replace(/```json\n?/g, '');
        cleaned = cleaned.replace(/```\n?/g, '');

        // Remover texto explicativo común
        cleaned = cleaned.replace(/^.*?(?=\{)/s, ''); // Todo antes del primer {
        cleaned = cleaned.replace(/\}[^}]*$/s, '}'); // Todo después del último }

        // Limpiar espacios y caracteres de control
        cleaned = cleaned.trim();

        return cleaned;
    }
}

/**
 * Exponer la clase SchemaValidator a nivel global para su uso en otras partes de la aplicación.
 */
window.SchemaValidator = SchemaValidator;