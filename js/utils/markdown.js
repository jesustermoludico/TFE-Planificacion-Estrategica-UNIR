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
   MARKDOWN UTILITIES
   Markdown rendering and sanitization
   ============================================ */

   /**
    * Markdown utilities class
    * Métodos para renderizar markdown a HTML, extraer texto plano y truncar texto markdown.
    * Incluye:
    * - render: Renderiza markdown a HTML utilizando la biblioteca marked.
    * - toPlainText: Extrae texto plano de una cadena markdown eliminando caracteres especiales.
    * - truncate: Trunca el texto markdown a una longitud máxima, devolviendo solo el texto plano.
    */
class MarkdownUtils {
    /**
     * Render markdown to HTML
     * @param {String} text - Markdown text
     * @returns {String} HTML string
     */
    static render(text) {
        if (!text || typeof text !== 'string') return '';
        
        try {
            // Configure marked options
            marked.setOptions({
                breaks: true,
                gfm: true,
                headerIds: false,
                mangle: false
            });
            
            // Parse markdown
            const html = marked.parse(text);
            
            return html;
        } catch (error) {
            console.error('Error rendering markdown:', error);
            return text;
        }
    }
    
    /**
     * Extract plain text from markdown
     * @param {String} markdown - Markdown text
     * @returns {String} Plain text
     */
    static toPlainText(markdown) {
        if (!markdown) return '';
        
        return markdown
            .replace(/[#*`_~\[\]()]/g, '')
            .replace(/\n+/g, ' ')
            .trim();
    }
    
    /**
     * Truncate markdown text
     * @param {String} markdown - Markdown text
     * @param {Number} maxLength - Maximum length
     * @returns {String} Truncated text
     */
    static truncate(markdown, maxLength = 100) {
        const plainText = this.toPlainText(markdown);
        
        if (plainText.length <= maxLength) {
            return plainText;
        }
        
        return plainText.substring(0, maxLength).trim() + '...';
    }
}

// Make available globally
window.MarkdownUtils = MarkdownUtils;
