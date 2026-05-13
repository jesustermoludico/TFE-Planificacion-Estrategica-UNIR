
/* ============================================
   DOCUMENTS COMPONENT
   Editor documental para "Apuntes en PDF"
   ============================================ */

/**
 * Componente de documentos para la edición de "Apuntes en PDF".
 * Proporciona funcionalidades para crear, editar y guardar borradores de apuntes en formato PDF.
 */
class DocumentsComponent {
    /**
     * Inicializa el componente de documentos, estableciendo las propiedades necesarias para su funcionamiento, 
     * como la clave de almacenamiento para los borradores, el estado actual del editor y la referencia al modal activo.
     */
    constructor() {
        this.storageKey = 'pdf_notes_draft';
        this.currentModal = null;
        this.currentResourceKey = 'apuntes';
        this.currentState = this.getDefaultState();
        this.boundEvents = [];
        this.stylesInjected = false;
    }
    /**
     * Obtiene el estado por defecto del componente de documentos.
     * @returns {Object} Estado por defecto del editor de documentos.
     */
    getDefaultState() {
        return {
            coverTitle: '',
            coverSubtitle: '',
            coverAuthor: '',
            instructions: '',
            includeSessionContext: false,
            markdown: '',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
    }

    /**
     * Renderiza el editor de apuntes en PDF dentro de un modal específico.
     * @param {Object} param0 Parámetros de configuración para el editor.
     * @param {Object} param0.modal Modal en el que se renderizará el editor.
     * @param {HTMLElement} param0.container Contenedor donde se insertará el editor.
     * @param {string} [param0.resourceKey='apuntes'] Clave de recurso para identificar los apuntes.
     * @param {Object} [param0.data={}] Datos iniciales para el editor.
     */
    renderApuntesEditor({ modal, container, resourceKey = 'apuntes', data = {} }) {
        this.currentModal = modal;
        this.currentResourceKey = resourceKey;
        this.injectStyles();

        const storedDraft = this.readDraft();
        const merged = {
            ...this.getDefaultState(),
            ...(data || {}),
            ...(storedDraft || {})
        };

        if (!merged.markdown?.trim()) {
            merged.markdown = '# Título del tema\n\n## Introducción\n\nEmpieza aquí a redactar o genera los apuntes con IA.\n';
        }

        this.currentState = merged;
        container.innerHTML = this.getLayoutHTML(merged);
        this.configureModalChrome();
        this.cacheElements();
        this.syncProviderLabel();
        this.bindUI();
        this.syncAll({ keepScroll: false });

        if (window.lucide) {
            lucide.createIcons();
        }
    }

    /**
     * Limpia el estado del componente, desvincula los eventos y restablece la configuración del modal a su estado original.
     */
    cleanup() {
        this.unbindAll();
        this.currentModal = null;
    }

    /**
     * Configura la apariencia y el comportamiento del modal para el editor de documentos.
     * @returns {void}
     */
    configureModalChrome() {
        if (!this.currentModal?.elements) return;
        const { fullscreen, body, saveButton, cancelButton, title } = this.currentModal.elements;

        if (title) title.textContent = 'Apuntes en PDF';
        if (fullscreen) fullscreen.classList.add('documents-modal-active');
        if (body) body.classList.add('documents-modal-body');
        if (saveButton) {
            saveButton.textContent = 'Guardar borrador';
            saveButton.style.display = '';
        }
        if (cancelButton) {
            cancelButton.textContent = 'Cerrar';
        }
    }

    /**
     * Restablece la apariencia y el comportamiento del modal a su estado original.
     * @returns {void}
     */
    resetModalChrome() {
        if (!this.currentModal?.elements) return;
        const { fullscreen, body, saveButton, cancelButton } = this.currentModal.elements;
        if (fullscreen) fullscreen.classList.remove('documents-modal-active', 'documents-modal-immersive');
        if (body) body.classList.remove('documents-modal-body');
        if (saveButton) {
            saveButton.textContent = 'Guardar';
            saveButton.style.display = '';
        }
        if (cancelButton) {
            cancelButton.textContent = 'Cancelar';
        }
    }

    /**
     * Almacena referencias a los elementos clave del DOM para facilitar su manipulación en otras partes del componente.
     */
    cacheElements() {
        this.els = {
            root: document.getElementById('documentsEditorRoot'),
            coverTitle: document.getElementById('docCoverTitle'),
            coverSubtitle: document.getElementById('docCoverSubtitle'),
            coverAuthor: document.getElementById('docCoverAuthor'),
            instructions: document.getElementById('docAiInstructions'),
            includeContext: document.getElementById('docIncludeContext'),
            providerLabel: document.getElementById('docProviderLabel'),
            markdown: document.getElementById('docMarkdownEditor'),
            preview: document.getElementById('docPdfPreview'),
            generateBtn: document.getElementById('docGenerateBtn'),
            printBtn: document.getElementById('docPrintBtn'),
            wordBtn: document.getElementById('docWordBtn'),
            immersiveBtn: document.getElementById('docImmersiveBtn'),
            status: document.getElementById('docStatusText'),
            hiddenRender: document.getElementById('docHiddenRender'),
            toolbar: document.getElementById('docMarkdownToolbar'),
            pageCounter: document.getElementById('docPageCounter')
        };
    }

    /**
     * Vincula los eventos de interacción del usuario con los elementos del editor, como la edición de campos, 
     * clics en botones y cambios en el proveedor de IA, para mantener sincronizado el estado del editor y 
     * proporcionar una experiencia interactiva fluida.
     */
    bindUI() {
        const bind = (el, event, handler) => {
            if (!el) return;
            el.addEventListener(event, handler);
            this.boundEvents.push(() => el.removeEventListener(event, handler));
        };

        ['input', 'change'].forEach(evt => {
            bind(this.els.coverTitle, evt, () => this.syncAll());
            bind(this.els.coverSubtitle, evt, () => this.syncAll());
            bind(this.els.coverAuthor, evt, () => this.syncAll());
            bind(this.els.instructions, evt, () => this.syncAll());
            bind(this.els.includeContext, evt, () => this.syncAll());
        });

        bind(this.els.markdown, 'input', () => this.syncAll());
        bind(this.els.toolbar, 'click', (e) => this.handleToolbarClick(e));
        bind(this.els.generateBtn, 'click', () => this.generateWithAI());
        bind(this.els.printBtn, 'click', () => this.printDocument());
        bind(this.els.wordBtn, 'click', () => this.exportToWord());
        bind(this.els.immersiveBtn, 'click', () => this.toggleImmersive());

        bind(document, 'iaProviderChanged', () => this.syncProviderLabel());
        bind(document, 'DOMContentLoaded', () => this.syncProviderLabel());
    }

    /**
     * Desvincula todos los eventos previamente vinculados para evitar fugas de memoria y comportamientos 
     * no deseados cuando el componente se desmonta o se cierra el modal.
     */
    unbindAll() {
        this.boundEvents.forEach(fn => {
            try { fn(); } catch (_) { }
        });
        this.boundEvents = [];
        this.resetModalChrome();
    }

    /**
     * Maneja la acción de guardar en el modal, recopilando el estado actual del editor y persistiendo el borrador.
     * @param {*} modal - El objeto del modal que contiene el estado y las funciones de actualización.
     * @returns {boolean} - Devuelve true si el guardado se realizó correctamente, false en caso contrario.
     */
    handleModalSave(modal) {
        if (!this.els?.root) return false;

        const state = this.collectState();
        this.persistDraft(state);

        const storePath = `recursos.${this.currentResourceKey}.content`;
        if (modal?.store?.updateNestedState) {
            modal.store.updateNestedState(storePath, JSON.stringify(state));
        }
        return true;
    }

    /**
     * Recopila el estado actual del editor, incluyendo el contenido de los campos y la configuración del usuario.
     * @returns {object} - Devuelve un objeto que representa el estado actual del editor.
     */
    collectState() {
        this.currentState = {
            ...this.currentState,
            coverTitle: this.els.coverTitle?.value?.trim() || '',
            coverSubtitle: this.els.coverSubtitle?.value?.trim() || '',
            coverAuthor: this.els.coverAuthor?.value?.trim() || '',
            instructions: this.els.instructions?.value || '',
            includeSessionContext: !!this.els.includeContext?.checked,
            markdown: this.els.markdown?.value || '',
            updatedAt: Date.now()
        };
        return this.currentState;
    }

    /**
     * Persiste el estado actual del editor en el almacenamiento de sesión.
     * @param {object} state - El estado del editor que se desea guardar.
     */
    persistDraft(state) {
        try {
            sessionStorage.setItem(this.storageKey, JSON.stringify(state));
        } catch (error) {
            console.warn('No se pudo guardar el borrador documental:', error);
        }
    }

    /**
     * Lee el borrador guardado en el almacenamiento de sesión.
     * @returns {object|null} - Devuelve el estado del editor si existe, o null si no se encuentra.
     */
    readDraft() {
        try {
            const raw = sessionStorage.getItem(this.storageKey);
            return raw ? JSON.parse(raw) : null;
        } catch (_) {
            return null;
        }
    }

    /**
     * Sincroniza el estado del editor con la vista previa y el almacenamiento de sesión.
     * @param {object} [options] - Opciones de sincronización.
     * @param {boolean} [options.keepScroll=true] - Indica si se debe mantener la posición de desplazamiento.
     */
    syncAll({ keepScroll = true } = {}) {
        if (!this.els?.root) return;

        const scrollTop = keepScroll ? this.els.preview?.scrollTop || 0 : 0;
        const state = this.collectState();

        if (this.els.status) {
            this.els.status.textContent = state.markdown.trim()
                ? 'Cambios preparados'
                : 'Escribe contenido o genera con IA';
        }

        this.persistDraft(state);
        this.renderPreview(state);

        if (this.els.preview && keepScroll) {
            this.els.preview.scrollTop = scrollTop;
        }
    }

    /**
     * Actualiza la etiqueta del proveedor de IA en la interfaz. 
     * Si el proveedor no está disponible, muestra un texto predeterminado.
     */
    syncProviderLabel() {
        const provider = window.IAService?.getProviderLabel?.() || 'IA activa';
        if (this.els?.providerLabel) {
            this.els.providerLabel.textContent = provider;
        }
    }

    /**
     * Maneja los clics en la barra de herramientas del editor.
     * @param {Event} event - El evento de clic.
     * @returns {void}
     */
    handleToolbarClick(event) {
        const button = event.target.closest('[data-insert]');
        if (!button) return;

        const type = button.dataset.insert;
        const snippets = {
            h1: '\n# Nuevo título principal\n\n',
            h2: '\n## Nuevo apartado\n\n',
            h3: '\n### Nuevo subapartado\n\n',
            paragraph: '\nPárrafo de desarrollo.\n\n',
            bullets: '\n- Punto 1\n- Punto 2\n- Punto 3\n\n',
            numbers: '\n1. Punto 1\n2. Punto 2\n3. Punto 3\n\n',
            quote: '\n> Nota o cita destacada.\n\n',
            code: '\n```javascript\n// Ejemplo de código\nfunction ejemplo() {\n  return true;\n}\n```\n\n'
        };

        this.insertAtCursor(snippets[type] || '');
    }

    /**
     * Inserta el texto proporcionado en la posición actual del cursor del editor.
     * @param {string} text - El texto que se desea insertar.
     * @returns {void}
     */
    insertAtCursor(text) {
        const editor = this.els.markdown;
        if (!editor) return;

        const start = editor.selectionStart || 0;
        const end = editor.selectionEnd || 0;
        const current = editor.value || '';

        editor.value = current.slice(0, start) + text + current.slice(end);
        editor.focus();

        const nextPos = start + text.length;
        editor.selectionStart = nextPos;
        editor.selectionEnd = nextPos;
        this.syncAll();
    }

    /**
     * Renderiza la vista previa del contenido del editor.
     * @param {object} state - El estado del editor que se desea renderizar.
     * @returns {void}
     */
    renderPreview(state) {
        if (!this.els.preview || !this.els.hiddenRender) return;

        const hidden = this.els.hiddenRender;
        const preview = this.els.preview;

        // Limpiar contenido anterior
        hidden.innerHTML = '';
        preview.innerHTML = '';

        try {
            const renderRoot = document.createElement('div');
            renderRoot.className = 'doc-render-root render-root';

            // Parsear markdown de manera m�s robusta
            const parsedMarkdown = this.parseMarkdown(state.markdown || '');
            renderRoot.innerHTML = parsedMarkdown;
            hidden.appendChild(renderRoot);

            // Generar p�ginas con mejor manejo de errores
            const coverPage = this.buildCoverPage(state);
            const contentPages = this.paginateRenderRoot(renderRoot);
            const allPages = [coverPage, ...contentPages];

            // Agregar todas las p�ginas
            allPages.forEach((page, index) => {
                if (page) {
                    preview.appendChild(page);
                }
            });

            // Actualizar contador de p�ginas
            if (this.els.pageCounter) {
                const totalPages = allPages.filter(Boolean).length;
                this.els.pageCounter.textContent = `${totalPages} p�gina${totalPages === 1 ? '' : 's'}`;
            }

            // Aplicar highlighting de c�digo
            if (window.hljs) {
                preview.querySelectorAll('pre code').forEach(block => {
                    try {
                        hljs.highlightElement(block);
                    } catch (error) {
                        console.warn('Error highlighting code:', error);
                    }
                });
            }

        } catch (error) {
            console.error('Error en renderPreview:', error);
            preview.innerHTML = `<div class="error-message">Error al renderizar el contenido: ${error.message}</div>`;
        }
    }

    /**
     * Construye la página de portada del documento.
     * @param {object} state - El estado del editor que contiene la información de la portada.
     * @returns {HTMLElement} - Devuelve el elemento de la página de portada.
     */
    buildCoverPage(state) {
        const page = document.createElement('section');
        page.className = 'doc-pdf-page doc-cover-page';
        page.innerHTML = `
        <div class="doc-page-label">Página 1</div>
        <div class="doc-page-inner doc-cover-inner">
            <div class="doc-cover-content">
                <div class="doc-cover-kicker">Contenidos teóricos</div>
                <h1 class="doc-cover-title">${this.escapeHtml(state.coverTitle || 'Título del documento')}</h1>
                <h2 class="doc-cover-subtitle">${this.escapeHtml(state.coverSubtitle || 'Subtítulo')}</h2>
                <div class="doc-cover-author">${this.escapeHtml(state.coverAuthor || 'Autor')}</div>
            </div>
        </div>
    `;
        return page;
    }

    /**
     * Paginates the content of the render root into individual pages.
     * @param {HTMLElement} renderRoot - The root element containing the content to paginate.
     * @returns {HTMLElement[]} - An array of page elements.
     */
    paginateRenderRoot(renderRoot) {
        const pages = [];
        let nextPageNumber = 2;
        let currentPage = this.createContentPage(nextPageNumber++);
        let currentBody = currentPage.querySelector('.doc-content-flow');
        const maxHeight = this.cmToPx(25.2); // 26.0 antes. Altura máxima del contenido en la página A4 considerando márgenes
        const sourceNodes = Array.from(renderRoot.children);

        // Función para verificar si la página actual tiene contenido significativo
        const hasBodyContent = () => Array.from(currentBody.children).some(node => {
            const text = (node.textContent || '').trim();
            return text.length > 0 || ['pre', 'table', 'ul', 'ol', 'img'].includes(node.tagName?.toLowerCase?.());
        });
        // Función para agregar la página actual al arreglo de páginas si tiene contenido, y luego crear una nueva página
        const pushCurrentPage = () => {
            if (!pages.includes(currentPage) && hasBodyContent()) {
                pages.push(currentPage);
            }
        };
        // Función para crear una nueva página y actualizar las referencias actuales
        const appendFreshPage = () => {
            pushCurrentPage();
            currentPage = this.createContentPage(nextPageNumber++);
            currentBody = currentPage.querySelector('.doc-content-flow');
        };
        //  Función para intentar agregar un nodo a la página actual, verificando si cabe dentro de los límites de altura
        const tryAppend = (node) => {
            // Clonar el nodo para evitar modificar el original
            const testNode = node.cloneNode(true);
            currentBody.appendChild(testNode);

            // Verificar si cabe con un margen de tolerancia
            const fits = currentBody.scrollHeight <= (maxHeight + this.cmToPx(0.5));

            if (fits) {
                // Si cabe, reemplazar con el nodo original
                currentBody.removeChild(testNode);
                currentBody.appendChild(node);
                return true;
            } else {
                // Si no cabe, remover el test
                currentBody.removeChild(testNode);
                return false;
            }
        };

        // Función para agregar un fragmento de contenido, creando una nueva página si es necesario
        const appendFragmentWithPaging = (fragment) => {
            if (!fragment) return;
            if (!tryAppend(fragment)) {
                appendFreshPage();
                currentBody.appendChild(fragment);
            }
        };
        // Función para dividir nodos de texto largos en fragmentos más pequeños, utilizando un splitter específico para cada tipo de contenido
        const appendTextFragments = (node, splitter) => {
            const fragments = splitter.call(this, node, currentBody, maxHeight);
            fragments.forEach(fragment => {
                if (!fragment) return;
                if (!tryAppend(fragment)) {
                    appendFreshPage();
                    currentBody.appendChild(fragment);
                }
            });
        };
        // Función para manejar la paginación de listas, creando nuevas páginas según sea necesario y ajustando los atributos de las listas ordenadas
        const appendListNode = (listNode) => {
            const tag = listNode.tagName?.toLowerCase() || 'ul';
            const items = Array.from(listNode.children).filter(child => child.tagName?.toLowerCase() === 'li');

            if (!items.length) {
                appendFragmentWithPaging(listNode.cloneNode(true));
                return;
            }
            // Para listas ordenadas, necesitamos ajustar el atributo "start" en cada fragmento para mantener la numeración correcta
            const startValue = Number(listNode.getAttribute('start') || 1);
            items.forEach((item, index) => {
                const singleList = this.createElementLike(listNode);
                if (tag === 'ol') {
                    singleList.setAttribute('start', String(startValue + index));
                }
                singleList.appendChild(item.cloneNode(true));

                if (!tryAppend(singleList)) {
                    const li = singleList.querySelector('li') || item;
                    appendTextFragments(li, this.splitTextNodeAcrossPagesForListItem);
                }
            });
        };
        // Iterar sobre los nodos fuente y agregarlos a las páginas, manejando la paginación según el tipo de contenido
        sourceNodes.forEach((node) => {
            const tag = node.tagName?.toLowerCase() || '';

            if (['h1', 'h2'].includes(tag) && hasBodyContent()) {
                appendFreshPage();
            }

            if (tag === 'ul' || tag === 'ol') {
                appendListNode(node);
                return;
            }

            if (tag === 'pre') {
                appendTextFragments(node, this.splitPreNodeAcrossPages);
                return;
            }

            const clone = node.cloneNode(true);
            if (tryAppend(clone)) {
                return;
            }

            if (['p', 'blockquote'].includes(tag)) {
                appendTextFragments(node, this.splitTextNodeAcrossPages);
                return;
            }

            appendFreshPage();
            currentBody.appendChild(clone);
        });

        pushCurrentPage();
        return pages;
    }

    /**
     * Divide un nodo de texto en fragmentos que se ajusten a las páginas.
     * @param {HTMLElement} node - El nodo de texto a dividir.
     * @param {HTMLElement} currentBody - El cuerpo de la página actual.
     * @param {number} maxHeight - La altura máxima permitida para el contenido de la página.
     * @returns {HTMLElement[]} - Un array de nodos de texto fragmentados.
     */
    splitTextNodeAcrossPages(node, currentBody, maxHeight) {
        const text = (node.textContent || '').trim();
        const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);

        // Si no hay oraciones, usar el m�todo de palabras original
        if (sentences.length <= 1) {
            return this.splitTextNodeByWords(node, currentBody, maxHeight);
        }

        const fragments = [];
        let workingNode = this.createElementLike(node);
        let buffer = [];

        // Iterar sobre las oraciones y construir fragmentos que se ajusten a la página, creando nuevas páginas según sea necesario
        for (let i = 0; i < sentences.length; i++) {
            const testBuffer = [...buffer, sentences[i]];
            const testText = testBuffer.join(' ');

            this.applyTextToNode(workingNode, testText);
            currentBody.appendChild(workingNode);

            if (currentBody.scrollHeight > maxHeight) {
                currentBody.removeChild(workingNode);

                if (buffer.length > 0) {
                    // Crear fragmento con buffer actual
                    const finalNode = this.createElementLike(node);
                    this.applyTextToNode(finalNode, buffer.join(' '));
                    fragments.push(finalNode);
                    buffer = [sentences[i]];
                } else {
                    // Oraci�n muy larga, dividir por palabras
                    const wordFragments = this.splitTextNodeByWords(
                        this.createNodeWithText(node, sentences[i]),
                        currentBody,
                        maxHeight
                    );
                    fragments.push(...wordFragments);
                    buffer = [];
                }
                workingNode = this.createElementLike(node);
            } else {
                currentBody.removeChild(workingNode);
                buffer = testBuffer;
            }
        }

        // Agregar cualquier fragmento restante en el buffer
        if (buffer.length > 0) {
            const lastNode = this.createElementLike(node);
            this.applyTextToNode(lastNode, buffer.join(' '));
            fragments.push(lastNode);
        }

        return fragments.filter(Boolean);
    }

    /**
     * Divide un nodo de texto en fragmentos más pequeños que se ajusten a las páginas, utilizando palabras como unidad de división.
     * @param {HTMLElement} node - El nodo de texto a dividir.
     * @param {HTMLElement} currentBody - El cuerpo de la página actual.
     * @param {number} maxHeight - La altura máxima permitida para el contenido de la página.
     * @returns {HTMLElement[]} - Un array de nodos de texto fragmentados.
     */
    splitTextNodeByWords(node, currentBody, maxHeight) {
        const text = (node.textContent || '').trim();
        const words = text.split(/\s+/).filter(Boolean);
        if (!words.length) return [node.cloneNode(true)];

        const fragments = [];
        let workingNode = this.createElementLike(node);
        let buffer = '';

        // Iterar sobre las palabras y construir fragmentos que se ajusten a la página, creando nuevas páginas según sea necesario
        for (let i = 0; i < words.length; i++) {
            const candidate = buffer ? `${buffer} ${words[i]}` : words[i];
            this.applyTextToNode(workingNode, candidate);
            currentBody.appendChild(workingNode);

            if (currentBody.scrollHeight > maxHeight) {
                currentBody.removeChild(workingNode);
                if (buffer) {
                    const finalNode = this.createElementLike(node);
                    this.applyTextToNode(finalNode, buffer);
                    fragments.push(finalNode);
                    buffer = words[i];
                } else {
                    fragments.push(workingNode.cloneNode(true));
                    buffer = '';
                }
                workingNode = this.createElementLike(node);
            } else {
                currentBody.removeChild(workingNode);
                buffer = candidate;
            }
        }
        
        // Agregar cualquier fragmento restante en el buffer
        if (buffer) {
            const lastNode = this.createElementLike(node);
            this.applyTextToNode(lastNode, buffer);
            fragments.push(lastNode);
        }

        return fragments.filter(Boolean);
    }

    /**
     * Crea un nuevo nodo basado en un nodo original y le aplica un texto.
     * @param {HTMLElement} originalNode - El nodo original a clonar.
     * @param {string} text - El texto a aplicar al nuevo nodo.
     * @returns {HTMLElement} - El nuevo nodo con el texto aplicado.
     */
    createNodeWithText(originalNode, text) {
        const node = this.createElementLike(originalNode);
        this.applyTextToNode(node, text);
        return node;
    }

    /**
     * Divide un nodo de texto en fragmentos que se ajusten a las páginas, específicamente para elementos de lista.
     * @param {HTMLElement} node - El nodo de texto a dividir.
     * @param {HTMLElement} currentBody - El cuerpo de la página actual.
     * @param {number} maxHeight - La altura máxima permitida para el contenido de la página.
     * @returns {HTMLElement[]} - Un array de nodos de lista fragmentados.
     */
    splitTextNodeAcrossPagesForListItem(node, currentBody, maxHeight) {
        const tag = node.parentElement?.tagName?.toLowerCase() === 'ol' ? 'ol' : 'ul';
        const fragments = this.splitTextNodeAcrossPages(node, currentBody, maxHeight);
        return fragments.map((fragment, index) => {
            const list = document.createElement(tag);
            const parent = node.parentElement;
            list.className = parent?.className || '';
            if (tag === 'ol') {
                const baseStart = Number(parent?.getAttribute('start') || 1);
                list.setAttribute('start', String(baseStart + index));
            }
            const li = document.createElement('li');
            li.className = node.className || '';
            li.innerHTML = fragment.innerHTML || this.escapeHtml(fragment.textContent || '');
            list.appendChild(li);
            return list;
        });
    }

    /**
     * Divide un nodo <pre> en fragmentos que se ajusten a las páginas, utilizando líneas como unidad de división.
     * @param {HTMLElement} node - El nodo <pre> a dividir.
     * @param {HTMLElement} currentBody - El cuerpo de la página actual.
     * @param {number} maxHeight - La altura máxima permitida para el contenido de la página.
     * @returns {HTMLElement[]} - Un array de nodos <pre> fragmentados.
     */
    splitPreNodeAcrossPages(node, currentBody, maxHeight) {
        const rawText = node.textContent || '';
        const lines = rawText.split(/\n/);
        if (!lines.length) return [node.cloneNode(true)];

        const fragments = [];
        let buffer = [];

        const flush = () => {
            if (!buffer.length) return;
            const fragment = this.createElementLike(node);
            this.applyTextToNode(fragment, buffer.join('\n'));
            fragments.push(fragment);
            buffer = [];
        };
        // Iterar sobre las líneas y construir fragmentos que se ajusten a la página, creando nuevas páginas según sea necesario
        lines.forEach((line) => {
            const candidateLines = [...buffer, line];
            const probe = this.createElementLike(node);
            this.applyTextToNode(probe, candidateLines.join('\n'));
            currentBody.appendChild(probe);

            if (currentBody.scrollHeight > maxHeight) {
                currentBody.removeChild(probe);
                if (buffer.length) {
                    flush();
                    buffer = [line];
                } else {
                    buffer = [line];
                    flush();
                }
            } else {
                currentBody.removeChild(probe);
                buffer = candidateLines;
            }
        });

        flush();
        return fragments.filter(Boolean);
    }

    /**
     * Crea una nueva página de contenido.
     * @param {number} pageNumber - El número de la página.
     * @returns {HTMLElement} - El elemento de la página creada.
     */
    createContentPage(pageNumber = 2) {
        const page = document.createElement('section');
        page.className = 'doc-pdf-page';
        page.innerHTML = `
        <div class="doc-page-label">Página ${pageNumber}</div>
        <div class="doc-page-inner">
            <div class="doc-content-flow"></div>
        </div>
    `;
        return page;
    }

    /**
     * Crea un nuevo nodo basado en un nodo original.
     * @param {HTMLElement} node - El nodo original a clonar.
     * @returns {HTMLElement} - El nuevo nodo clonado.
     */
    createElementLike(node) {
        const tag = node.tagName?.toLowerCase() || 'p';
        const clone = document.createElement(tag);
        clone.className = node.className || '';

        Array.from(node.attributes || []).forEach(attr => {
            if (attr.name === 'class') return;
            clone.setAttribute(attr.name, attr.value);
        });

        if (tag === 'pre') {
            const code = document.createElement('code');
            const sourceCode = node.querySelector('code');
            if (sourceCode) {
                code.className = sourceCode.className || '';
            }
            clone.appendChild(code);
        }
        return clone;
    }

    /**
     * Aplica texto a un nodo, manejando específicamente nodos <pre> con <code>.
     * @param {HTMLElement} node - El nodo al que se aplicará el texto.
     * @param {string} text - El texto a aplicar.
     */
    applyTextToNode(node, text) {
        if (node.tagName?.toLowerCase() === 'pre') {
            const code = node.querySelector('code') || node;
            code.textContent = text;
            return;
        }
        node.textContent = text;
    }

    /**
     * Parsea un texto en formato Markdown y lo convierte en HTML.
     * @param {string} markdown - El texto en formato Markdown.
     * @returns {string} - El HTML generado a partir del Markdown.
     */
    parseMarkdown(markdown) {
        if (!window.marked) {
            return this.escapeHtml(markdown).replace(/\n/g, '<br>');
        }
        // Personalizamos el renderer para manejar mejor los encabezados y otros elementos, asegurando una estructura más consistente en el HTML generado
        const renderer = new marked.Renderer();
        // Personalización del renderer para manejar encabezados de manera más robusta, permitiendo tanto el formato tradicional como el basado en tokens
        renderer.heading = function (...args) {
            let text = '';
            let level = 1;

            if (typeof args[0] === 'object' && args[0] !== null) {
                const token = args[0];
                level = token.depth || token.level || 1;
                text = token.text || token.raw || '';

                if (!text && Array.isArray(token.tokens) && window.marked?.parser) {
                    text = marked.parser(token.tokens);
                }
            } else {
                text = args[0] || '';
                level = args[1] || 1;
            }

            const safeLevel = Math.min(Math.max(Number(level) || 1, 1), 6);
            return `<h${safeLevel}>${text}</h${safeLevel}>`;
        };
        // Otras personalizaciones del renderer pueden ir aquí si es necesario
        marked.setOptions({
            breaks: false,
            gfm: true,
            renderer
        });

        return marked.parse(markdown || '');
    }

    /**
     * Convierte centímetros a píxeles.
     * @param {number} cm - La medida en centímetros.
     * @returns {number} - La medida en píxeles.
     */
    cmToPx(cm) {
        return cm * 37.7952755906;
    }

    /**
     * Genera contenido utilizando inteligencia artificial.
     * @returns {Promise<void>}
     */
    async generateWithAI() {
        const btn = this.els.generateBtn;
        if (this.els.status) {
            this.els.status.textContent = 'Generando contenido con IA…';
        }
        const prompt = this.buildDocumentPrompt();

        if (!prompt.trim()) {
            alert('Escribe unas indicaciones para la IA o activa el contexto de sessionStorage.');
            return;
        }

        btn.disabled = true;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="loader-circle" class="documents-spin"></i> Generando…';
        if (window.lucide) lucide.createIcons();

        try {
            await window.IAService?.init?.();
            const providerId = window.IAService?.getSelectedProvider?.() || 'chatgpt';
            const providerConfig = window.IAService?.apiKeyManager?.getProviderConfig?.(providerId);

            if (!providerConfig?.apiKey) {
                throw new Error(`No hay API key configurada para ${providerId}.`);
            }

            let markdown = '';
            if (providerId === 'claude') {
                markdown = await this.callClaude(prompt, providerConfig);
            } else if (providerId === 'gemini') {
                markdown = await this.callGemini(prompt, providerConfig);
            } else {
                markdown = await this.callChatGPT(prompt, providerConfig);
            }

            this.els.markdown.value = markdown.trim();
            this.syncAll({ keepScroll: false });
        } catch (error) {
            console.error(error);
            if (this.els.status) {
                this.els.status.textContent = 'Error al generar el contenido';
            }
            alert('Error al generar el contenido: ' + (error?.message || 'respuesta no válida'));
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
            if (window.lucide) lucide.createIcons();
        }
    }

    /**
     * Construye el prompt para la generación de documentos utilizando IA.
     * @returns {string} - El prompt generado.
     */
    buildDocumentPrompt() {
        const state = this.collectState();
        const parts = [];

        // Instrucciones detalladas para la IA, enfatizando la necesidad de contenido extenso, claro y pedagógico, 
        // con reglas estrictas sobre el formato de salida y el objetivo de extensión
        parts.push(`Actúa como un autor académico y diseñador instruccional experto.
                        Tu tarea es redactar unos apuntes extensos, claros, pedagógicos y listos para maquetarse en PDF.

                        REGLAS OBLIGATORIAS:
                        - Devuelve únicamente Markdown válido.
                        - Usa # solo para títulos principales de grandes bloques.
                        - Usa ## y ### para el resto de niveles.
                        - Desarrolla el contenido con profundidad real.
                        - Escribe explicaciones amplias, no resúmenes breves.
                        - Añade ejemplos cuando aclaren el contenido.
                        - Usa listas, citas y bloques de código solo cuando aporten valor.
                        - No incluyas texto fuera del Markdown.
                        - No incluyas separadores horizontales.
                        - No digas que eres una IA.

                        OBJETIVO DE EXTENSIÓN:
                        - Genera una respuesta equivalente aproximadamente a entre 10 y 20 páginas A4 bien desarrolladas.`);

        // Agregar información de la portada si está disponible
        if (state.coverTitle) parts.push(`TÍTULO DE LA PORTADA: ${state.coverTitle}`);
        // El subtítulo se incluye como parte del prompt para que la IA pueda integrarlo de manera coherente en el contenido generado,
        if (state.coverSubtitle) parts.push(`SUBTÍTULO DE LA PORTADA: ${state.coverSubtitle}`);
        // El autor se incluye para que la IA pueda referenciarlo adecuadamente en el contenido generado, especialmente si se requiere mencionar al autor en la introducción o en la sección de créditos.
        if (state.instructions?.trim()) {
            parts.push(`INDICACIONES DEL USUARIO:\n${state.instructions.trim()}`);
        }

        // Si el usuario ha optado por incluir el contexto de la sesión, se agrega al prompt para que la IA pueda tener en cuenta el estado actual del diseño, 
        // lo que puede ayudar a generar contenido más relevante y coherente con el trabajo previo realizado en el editor.
        if (state.includeSessionContext) {
            const sessionContext = this.getSessionContext();
            if (sessionContext) {
                parts.push(`CONTEXTO DEL DISEÑO ACTUAL EN SESSION STORAGE:\n${sessionContext}`);
            }
        }

        return parts.join('\n\n');
    }

    /**
     * Obtiene el contexto de la sesión actual desde el almacenamiento de sesión.
     * @returns {string} - El contexto de la sesión en formato JSON.
     */ 
    getSessionContext() {
        try {
            const exported = window.sessionStorageManager?.exportStateForAI?.();
            if (!exported) return '';
            return JSON.stringify(exported, null, 2);
        } catch (_) {
            return '';
        }
    }

    /**
     * Llama a la API de Claude para generar contenido basado en el prompt proporcionado.
     * @param {string} prompt - El prompt que se enviará a Claude.
     * @param {Object} config - Configuración de la API, incluyendo la clave y el modelo.
     * @returns {Promise<string>} - El contenido generado por Claude.
     */
    async callClaude(prompt, config) {
        // La API de Anthropic Claude requiere un formato específico de mensajes, por lo que se envía el prompt como un mensaje de rol "user".
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: config.model,
                max_tokens: 12000,
                temperature: 0.7,
                messages: [{ role: 'user', content: prompt }]
            })
        });
        // La respuesta de Claude se procesa para extraer el contenido generado, asegurando que se manejen correctamente 
        // los posibles errores y que se devuelva solo el texto relevante en formato Markdown.
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data?.error?.message || 'Error en Claude');
        }
        // El contenido generado por Claude puede estar estructurado en bloques, por lo que se filtran y se concatenan 
        // solo los bloques de texto para formar el resultado final.
        return (data.content || [])
            .filter(block => block.type === 'text')
            .map(block => block.text)
            .join('\n')
            .trim();
    }

    /**
     * Llama a la API de OpenAI para generar contenido basado en el prompt proporcionado.
     * @param {string} prompt - El prompt que se enviará a OpenAI.
     * @param {Object} config - Configuración de la API, incluyendo la clave y el modelo.
     * @returns {Promise<string>} - El contenido generado por OpenAI.
     */
    async callChatGPT(prompt, config) {
        // La API de OpenAI se llama con un formato específico que incluye instrucciones claras para la generación de contenido.
        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                instructions: 'Genera apuntes extensos, rigurosos y directamente utilizables en Markdown para un documento académico.',
                input: prompt,
                max_output_tokens: 12000
            })
        });
        // La respuesta de OpenAI se procesa para extraer el contenido generado, manejando posibles errores y 
        // asegurando que se devuelva solo el texto relevante en formato Markdown.
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data?.error?.message || 'Error en OpenAI');
        }
        // El contenido generado por OpenAI puede estar estructurado de diferentes maneras, 
        // por lo que se manejan varias posibilidades para extraer el texto de manera robusta.
        if (typeof data.output_text === 'string' && data.output_text.trim()) {
            return data.output_text.trim();
        }
        // En algunos casos, el contenido puede estar anidado en estructuras más complejas, 
        // por lo que se recorre la respuesta para extraer todo el texto disponible.
        const texts = [];
        (data.output || []).forEach(item => {
            (item.content || []).forEach(part => {
                if (part.type === 'output_text' && part.text) {
                    texts.push(part.text);
                }
            });
        });

        return texts.join('\n').trim();
    }

    /**
     * Llama a la API de Gemini para generar contenido basado en el prompt proporcionado.
     * @param {string} prompt - El prompt que se enviará a Gemini.
     * @param {Object} config - Configuración de la API, incluyendo la clave y el modelo.
     * @returns {Promise<string>} - El contenido generado por Gemini.
     */
    async callGemini(prompt, config) {
        // La API de Gemini se llama con un formato específico que incluye instrucciones claras para la generación de contenido, 
        // y se utiliza un endpoint que requiere la especificación del modelo en la URL.
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    role: 'user',
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 12000
                }
            })
        });
        // La respuesta de Gemini se procesa para extraer el contenido generado, manejando posibles errores 
        // y asegurando que se devuelva solo el texto relevante en formato Markdown.
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data?.error?.message || 'Error en Gemini');
        }
        // El contenido generado por Gemini puede estar estructurado en partes dentro de candidatos, por lo que se filtran y se concatenan 
        // solo las partes de texto para formar el resultado final.
        return (data.candidates?.[0]?.content?.parts || [])
            .map(part => part.text || '')
            .join('\n')
            .trim();
    }

    /**
     * Imprime el documento actual.
     * @returns {void}
     */
    printDocument() {
        if (!this.els.preview) return;

        this.syncAll({ keepScroll: true });
        const previewHtml = this.els.preview.innerHTML;
        const printWindow = window.open('', '_blank');
        const html = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>${this.escapeHtml(this.currentState.coverTitle || 'Apuntes en PDF')}</title>
                <style>${this.getPrintStyles()}</style>
            </head>
            <body>
                <div class="doc-print-root">${previewHtml}</div>
            </body>
            </html>
        `;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }

    /**
     * Exporta el documento actual a un archivo de Word.
     * @returns {void}
     */
    exportToWord() {
        // Para exportar a Word, generamos un documento HTML con el contenido del preview y lo descargamos con una extensión .doc.
        this.syncAll({ keepScroll: true });
        const previewHtml = this.els.preview?.innerHTML || '';

        // El documento HTML se construye con una estructura básica que incluye el contenido del preview 
        // y estilos específicos para asegurar una apariencia adecuada al abrirlo en Word.
        const htmlDoc = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>${this.escapeHtml(this.currentState.coverTitle || 'Apuntes en PDF')}</title>
                <style>${this.getPrintStyles()}</style>
            </head>
            <body>
                ${previewHtml}
            </body>
            </html>
        `;

        // Se crea un Blob con el contenido HTML y se descarga como un archivo .doc. 
        // El nombre del archivo se genera a partir del título de la portada,
        const blob = new Blob(['\ufeff', htmlDoc], {
            type: 'application/msword'
        });

        // Para el nombre del archivo, se toma el título de la portada, se convierte a minúsculas, 
        // se eliminan caracteres no alfanuméricos y se reemplazan los espacios por guiones.
        const safeName = (this.currentState.coverTitle || 'apuntes')
            .toLowerCase()
            .replace(/[^a-z0-9áéíóúñü\s-]/gi, '')
            .replace(/\s+/g, '-');

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${safeName || 'apuntes'}.doc`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    /**
     * Alterna el modo inmersivo del documento actual.
     * @returns {void}
     */
    toggleImmersive() {
        const fullscreen = this.currentModal?.elements?.fullscreen;
        if (!fullscreen) return;

        fullscreen.classList.toggle('documents-modal-immersive');

        const immersive = fullscreen.classList.contains('documents-modal-immersive');
        this.els.immersiveBtn?.setAttribute('aria-pressed', immersive ? 'true' : 'false');

        if (this.els.immersiveBtn) {
            this.els.immersiveBtn.innerHTML = immersive
                ? '<i data-lucide="minimize-2"></i> Salir de pantalla completa'
                : '<i data-lucide="maximize-2"></i> Pantalla completa';

            if (window.lucide) lucide.createIcons();
        }
    }

    /**
     * Genera el HTML del layout del editor de documentos.
     * @param {Object} state - Estado actual del documento.
     * @returns {string} HTML del layout del editor.
     */
    getLayoutHTML(state) {
        return `
            <div class="documents-editor-root" id="documentsEditorRoot">
                <div class="documents-toolbar-top">
                    <div class="documents-toolbar-meta">
                        <span class="documents-provider-pill">IA activa: <strong id="docProviderLabel">—</strong></span>
                        <span class="documents-status-pill" id="docStatusText">Preparando editor…</span>
                        <span class="documents-pages-pill" id="docPageCounter">0 páginas</span>
                    </div>
                    <div class="documents-toolbar-actions">
                        <button class="btn btn-secondary" type="button" id="docImmersiveBtn">
                            <i data-lucide="maximize-2"></i>
                            Pantalla completa
                        </button>
                        <button class="btn btn-secondary" type="button" id="docPrintBtn">
                            <i data-lucide="printer"></i>
                            Imprimir / PDF
                        </button>
                        <button class="btn btn-primary" type="button" id="docWordBtn">
                            <i data-lucide="file-text"></i>
                            Exportar Word
                        </button>
                    </div>
                </div>

                <div class="documents-grid">
                    <section class="documents-panel documents-panel-left">
                        <div class="documents-section">
                            <div class="documents-section-title">Portada</div>
                            <input class="form-input" id="docCoverTitle" type="text" placeholder="Título" value="${this.escapeAttr(state.coverTitle)}">
                            <input class="form-input" id="docCoverSubtitle" type="text" placeholder="Subtítulo" value="${this.escapeAttr(state.coverSubtitle)}">
                            <input class="form-input" id="docCoverAuthor" type="text" placeholder="Autor" value="${this.escapeAttr(state.coverAuthor)}">
                        </div>

                        <div class="documents-section">
                            <div class="documents-section-title">Generación con IA</div>
                            <textarea class="form-textarea" id="docAiInstructions" placeholder="Tema, profundidad, tono, ejemplos, enfoque didáctico..." style="min-height: 140px;">${this.escapeHtml(state.instructions)}</textarea>
                            <label class="documents-check-row">
                                <input type="checkbox" id="docIncludeContext" ${state.includeSessionContext ? 'checked' : ''}>
                                <span>Usar sessionStorage como contexto para generar el contenido</span>
                            </label>
                            <button class="btn btn-primary" type="button" id="docGenerateBtn">
                                <i data-lucide="sparkles"></i>
                                Generar con IA
                            </button>
                        </div>

                        <div class="documents-section">
                            <div class="documents-section-title">Markdown</div>
                            <div class="documents-markdown-toolbar" id="docMarkdownToolbar">
                                ${this.getToolbarButton('h1', 'T1')}
                                ${this.getToolbarButton('h2', 'T2')}
                                ${this.getToolbarButton('h3', 'T3')}
                                ${this.getToolbarButton('paragraph', 'P')}
                                ${this.getToolbarButton('bullets', '• Lista')}
                                ${this.getToolbarButton('numbers', '1. Lista')}
                                ${this.getToolbarButton('quote', 'Cita')}
                                ${this.getToolbarButton('code', '{ } Código')}
                            </div>
                            <textarea class="documents-markdown-editor" id="docMarkdownEditor">${this.escapeHtml(state.markdown)}</textarea>
                        </div>
                    </section>

                    <section class="documents-panel documents-panel-right">
                        <div class="documents-section-title documents-preview-title">Vista real del PDF / Word</div>
                        <div class="documents-preview-shell" id="docPdfPreview"></div>
                    </section>
                </div>

                <div id="docHiddenRender" class="documents-hidden-render" aria-hidden="true"></div>
            </div>
        `;
    }
    /**
     * Genera un botón de la barra de herramientas del editor de documentos.
     * @param {string} type - Tipo de inserción (h1, h2, h3, paragraph, bullets, numbers, quote, code).
     * @param {string} label - Etiqueta del botón.
     * @returns {string} HTML del botón.
     */
    getToolbarButton(type, label) {
        return `<button class="documents-tool-btn" type="button" data-insert="${type}">${label}</button>`;
    }

    /**
     * Escapa caracteres HTML especiales en una cadena.
     * @param {string} value - Cadena a escapar.
     * @returns {string} Cadena escapada.
     */
    escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    /**
     * Escapa caracteres especiales en un atributo HTML.
     * @param {string} value - Valor del atributo a escapar.
     * @returns {string} Valor escapado.
     */
    escapeAttr(value) {
        return this.escapeHtml(value).replace(/"/g, '&quot;');
    }

    /**
     * Inyecta los estilos necesarios para el componente de documentos. 
     * @returns {void}
     */
    injectStyles() {
        if (this.stylesInjected) return;
        this.stylesInjected = true;

        const style = document.createElement('style');
        style.id = 'documents-component-styles';
        style.textContent = `
            .documents-modal-active{
                width: min(96vw, 1800px);
                height: 94vh;
            }
            .documents-modal-body{
                padding: 0 !important;
                overflow: hidden !important;
            }
            .documents-modal-active .modal-footer{
                position: sticky;
                bottom: 0;
                background: var(--bg-primary);
                z-index: 10;
                border-top: 1px solid var(--border-color);
            }
            .documents-modal-immersive{
                position: fixed !important;
                inset: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                max-width: none !important;
                max-height: none !important;
                margin: 0 !important;
                border-radius: 0 !important;
            }
            .documents-modal-immersive .modal-body,
            .documents-modal-immersive #modalBody{
                flex: 1 1 auto;
                min-height: 0;
            }
            .documents-modal-immersive .documents-editor-root{
                height: 100%;
                min-height: 0;
            }
            .documents-editor-root{
                height: 100%;
                display: flex;
                flex-direction: column;
                background: var(--bg-secondary);
            }
            .documents-toolbar-top{
                display:flex;
                justify-content:space-between;
                gap:16px;
                padding:16px 20px;
                border-bottom:1px solid var(--border-color);
                background:var(--bg-primary);
                flex-wrap:wrap;
            }
            .documents-toolbar-meta,.documents-toolbar-actions{
                display:flex;
                align-items:center;
                gap:10px;
                flex-wrap:wrap;
            }
            .documents-provider-pill,.documents-status-pill,.documents-pages-pill{
                display:inline-flex;
                align-items:center;
                padding:8px 12px;
                border-radius:999px;
                background:var(--bg-secondary);
                font-size:12px;
                color:var(--text-secondary);
                border:1px solid var(--border-color);
            }
            .documents-grid{
                flex:1;
                min-height:0;
                display:grid;
                grid-template-columns:minmax(360px, 42%) 1fr;
                gap:0;
            }
            .documents-panel{
                min-width:0;
                min-height:0;
            }
            .documents-panel-left{
                overflow:auto;
                padding:18px;
                border-right:1px solid var(--border-color);
                background:var(--bg-primary);
            }
            .documents-panel-right{
                overflow:auto;
                padding:20px;
                background:#eef2f7;
            }
            .documents-section{
                display:grid;
                gap:12px;
                margin-bottom:18px;
                padding:16px;
                border-radius:16px;
                border:1px solid var(--border-color);
                background:var(--bg-primary);
                box-shadow:0 6px 18px rgba(15,23,42,0.04);
            }
            .documents-section-title{
                font-weight:800;
                font-size:12px;
                text-transform:uppercase;
                letter-spacing:.08em;
                color:var(--text-secondary);
            }
            .documents-check-row{
                display:flex;
                gap:10px;
                align-items:flex-start;
                font-size:13px;
                color:var(--text-secondary);
            }
            .documents-markdown-toolbar{
                display:flex;
                flex-wrap:wrap;
                gap:8px;
            }
            .documents-tool-btn{
                border:1px solid var(--border-color);
                background:var(--bg-secondary);
                color:var(--text-primary);
                border-radius:10px;
                padding:8px 10px;
                cursor:pointer;
                font-size:12px;
                font-weight:700;
            }
            .documents-tool-btn:hover{
                background:color-mix(in srgb, var(--bg-secondary) 65%, white);
            }
            .documents-markdown-editor{
                min-height:420px;
                resize:vertical;
                width:100%;
                border-radius:14px;
                border:1px solid var(--border-color);
                padding:14px;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                font-size:13px;
                line-height:1.55;
                background:#0f172a;
                color:#e2e8f0;
            }
            .documents-preview-title{
                margin-bottom:12px;
            }
            .documents-preview-shell{
                display:flex;
                flex-direction:column;
                gap:24px;
                align-items:center;
                min-height:100%;
            }
            .doc-pdf-page{
                width:210mm;
                min-height: 260mm; 
                background:white;
                box-shadow:0 12px 35px rgba(15,23,42,0.16);
                position:relative;
                border-radius:6px;
                overflow:hidden;
                border:1px solid #d9dee7;
            }
            .doc-page-label{
                position:absolute;
                top:10px;
                right:14px;
                font-size:11px;
                color:#6b7280;
                background:rgba(255,255,255,.92);
                padding:4px 8px;
                border-radius:999px;
                border:1px solid #d9dee7;
                z-index:3;
            }
            .doc-page-inner{
                padding:2.2cm 2cm 2.3cm 2cm;
                min-height:260mm;
                box-sizing:border-box;
            }
            .doc-cover-inner{
                display:flex;
                align-items:center;
                justify-content:center;
                background:linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
            }
            .doc-cover-content{
                max-width:75%;
                text-align:center;
            }
            .doc-cover-kicker{
                font-size:12px;
                letter-spacing:.2em;
                text-transform:uppercase;
                color:#64748b;
                margin-bottom:28px;
                font-weight:800;
            }
            .doc-cover-title{
                font-size:30px;
                line-height:1.2;
                margin:0 0 18px 0;
                color:#0f172a;
            }
            .doc-cover-subtitle{
                font-size:18px;
                line-height:1.4;
                margin:0 0 42px 0;
                color:#475569;
                font-weight:500;
            }
            .doc-cover-author{
                font-size:14px;
                color:#334155;
                font-weight:700;
            }
            .doc-content-flow{
                font-family: Georgia, 'Times New Roman', serif;
                color:#111827;
                line-height:1.6;
                font-size:12pt;
            }
            .doc-content-flow h1{
                font-size:24px;
                line-height:1.25;
                margin:0 0 18px 0;
                break-before:page;
                page-break-before:always;
            }
            .doc-content-flow h1:first-child{
                break-before:auto;
                page-break-before:auto;
            }
            .doc-content-flow h2{
                font-size:19px;
                line-height:1.3;
                margin:22px 0 12px 0;
            }
            .doc-content-flow h3{
                font-size:15px;
                line-height:1.35;
                margin:18px 0 10px 0;
            }
            .doc-content-flow p,
            .doc-content-flow li,
            .doc-content-flow blockquote{
                font-size:12pt;
            }
            .doc-content-flow p{
                margin:0 0 12px 0;
                text-align:justify;
            }
            .doc-content-flow ul,
            .doc-content-flow ol{
                padding-left:22px;
                margin:0 0 12px 0;
            }
            .doc-content-flow blockquote{
                border-left:4px solid #cbd5e1;
                margin:14px 0;
                padding:8px 0 8px 14px;
                color:#334155;
                background:#f8fafc;
            }
            .doc-content-flow pre{
                background:#0f172a;
                color:#e2e8f0;
                border-radius:12px;
                padding:14px;
                overflow:auto;
                margin:14px 0;
                font-size:9pt;
                line-height:1.45;
            }
            .doc-content-flow code{
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            }
            .documents-hidden-render{
                position:absolute;
                left:-99999px;
                top:-99999px;
                width:170mm;
                visibility:hidden;
                pointer-events:none;
            }
            @media (max-width: 1200px){
                .documents-grid{
                    grid-template-columns:1fr;
                }
                .documents-panel-left{
                    max-height:48vh;
                    border-right:none;
                    border-bottom:1px solid var(--border-color);
                }
                .doc-pdf-page{
                    transform:scale(.85);
                    transform-origin:top center;
                    margin-bottom:-36mm;
                }
            }
            .documents-spin{
                animation: documentsSpin 1s linear infinite;
            }

            @keyframes documentsSpin{
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Genera los estilos para la impresión del documento.
     * @returns {string} Estilos CSS para la impresión.
     */
    getPrintStyles() {
        return `
            html, body{
                margin:0;
                padding:0;
                background:white;
                font-family: Georgia, 'Times New Roman', serif;
            }
            .doc-pdf-page{
                width:210mm;
                min-height:297mm;
                margin:0 auto;
                page-break-after:always;
                break-after:page;
                background:white;
            }
            .doc-pdf-page:last-child{
                page-break-after:auto;
                break-after:auto;
            }
            .doc-page-inner{
                padding:2.2cm 2cm 2.3cm 2cm;
                min-height:297mm;
                box-sizing:border-box;
            }
            .doc-cover-inner{
                display:flex;
                align-items:center;
                justify-content:center;
                background:linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
            }
            .doc-cover-content{
                max-width:75%;
                text-align:center;
                margin:0 auto;
                padding-top:8cm;
            }
            .doc-cover-kicker{
                font-size:12px;
                letter-spacing:.2em;
                text-transform:uppercase;
                color:#64748b;
                margin-bottom:28px;
                font-weight:800;
            }
            .doc-cover-title{
                font-size:30px;
                line-height:1.2;
                margin:0 0 18px 0;
                color:#0f172a;
            }
            .doc-cover-subtitle{
                font-size:18px;
                line-height:1.4;
                margin:0 0 42px 0;
                color:#475569;
                font-weight:500;
            }
            .doc-cover-author{
                font-size:14px;
                color:#334155;
                font-weight:700;
            }
            .doc-content-flow{
                color:#111827;
                line-height:1.6;
                font-size:12pt;
            }
            .doc-content-flow h1{
                font-size:24px;
                line-height:1.25;
                margin:0 0 18px 0;
                break-before:page;
                page-break-before:always;
            }
            .doc-content-flow h1:first-child{
                break-before:auto;
                page-break-before:auto;
            }
            .doc-content-flow h2{
                font-size:19px;
                line-height:1.3;
                margin:22px 0 12px 0;
            }
            .doc-content-flow h3{
                font-size:15px;
                line-height:1.35;
                margin:18px 0 10px 0;
            }
            .doc-content-flow p{
                margin:0 0 12px 0;
                text-align:justify;
            }
            .doc-content-flow ul,
            .doc-content-flow ol{
                padding-left:22px;
                margin:0 0 12px 0;
            }
            .doc-content-flow blockquote{
                border-left:4px solid #cbd5e1;
                margin:14px 0;
                padding:8px 0 8px 14px;
                color:#334155;
                background:#f8fafc;
            }
            .doc-content-flow pre{
                background:#0f172a;
                color:#e2e8f0;
                border-radius:12px;
                padding:14px;
                overflow:auto;
                margin:14px 0;
                font-size:9pt;
                line-height:1.45;
                white-space:pre-wrap;
            }
            @page{
                size:A4;
                margin:0;
            }
        `;
    }
}

/**
 * Inicializa el componente de documentos y lo asigna a la ventana global para que esté disponible en toda la aplicación.
 * Esto permite que otras partes de la aplicación puedan interactuar con el componente de documentos, 
 * como abrir el editor, actualizar el estado o llamar a sus métodos para generar contenido, imprimir o exportar.
 */
window.documentsComponent = new DocumentsComponent();
