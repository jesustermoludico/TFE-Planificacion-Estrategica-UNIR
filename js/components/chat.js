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
   CHAT COMPONENT + IA INTEGRATION
   ============================================ */

   /**
    * ChatComponent es el encargado de gestionar la interfaz de chat, la interacción con el usuario y la comunicación con IAService.
    * Se encarga de renderizar los mensajes, manejar el estado de la conversación, mostrar indicadores de carga, y sincronizar con el diseño cuando se solicite.
    */
class ChatComponent {
    /**
     * Constructor del componente de chat.
     * @param {*} store - Instancia de AppStore para gestionar el estado global de la aplicación, especialmente los mensajes del chat y la IA seleccionada.
     */
    constructor(store) {
        this.store = store;
        this.elements = {
            chatMessages: document.getElementById('chatMessages'),
            chatInput: document.getElementById('chatInput'),
            sendButton: document.getElementById('sendButton')
        };
        this.isSending = false;
        this.init();
    }
    
    /**
     * Inicializa el componente de chat: inyecta la barra de herramientas, estilos, configura los listeners de eventos, se suscribe a cambios en el store, 
     * limpia mensajes iniciales si es necesario, y renderiza los mensajes existentes. También espera a que IAService esté disponible para inicializarlo 
     * y configurar el modo de conversación y la badge del proveedor. Finalmente, asegura que Mermaid esté cargado para renderizar diagramas si es necesario.
     * Este método es asíncrono porque depende de la disponibilidad de IAService y Mermaid, y maneja errores en caso de que no se puedan cargar correctamente,
     *  mostrando mensajes al usuario mediante toasts.
     */
    async init() {
        this.injectToolbar();
        this.injectStyles();
        this.setupEventListeners();
        this.subscribeToStore();
        this.sanitizeInitialMessages();
        this.renderMessages();

        try {
            await this.waitForIAService();
            await window.IAService.init();
            this.setConversationMode(window.IAService.getConversationMode());
            this.updateProviderBadge();
        } catch (error) {
            console.error('Error inicializando IAService:', error);
            this.showToast(error.message || 'No se pudo inicializar el servicio de IA.', 'error');
        }

        await this.ensureMermaidLoaded();
    }

    /**
     * Espera a que IAService esté disponible antes de inicializarlo.
     * @param {number} retries - Número de intentos antes de fallar.
     * @param {number} delay - Tiempo de espera entre intentos en milisegundos.
     * @returns {Promise<boolean>} - Resuelve a true si IAService está disponible, de lo contrario lanza un error.
     */
    async waitForIAService(retries = 40, delay = 120) {
        for (let i = 0; i < retries; i++) {
            if (window.IAService && typeof window.IAService.init === 'function') return true;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        throw new Error('IAService no está disponible. Revisa que js/lib/ias_library.js se cargue antes que chat.js');
    }

    /**
     * Inyecta la barra de herramientas en el contenedor del chat si no existe. 
     * La barra de herramientas incluye un badge para mostrar el proveedor de IA seleccionado, un switch para cambiar entre modo continuo y modo limpio, 
     * y botones para limpiar la conversación y sincronizar con el diseño. También guarda referencias a estos elementos para usarlos posteriormente en 
     * la interacción del usuario.
     * @returns {void} 
     */
    injectToolbar() {
        const container = document.querySelector('#tab-chat .chat-container');
        if (!container || container.querySelector('.chat-toolbar')) return;

        const toolbar = document.createElement('div');
        toolbar.className = 'chat-toolbar';
        toolbar.innerHTML = `
            <div class="chat-toolbar-left">
                <span class="chat-provider-badge" id="chatProviderBadge">IA: --</span>
                <label class="chat-mode-switch" title="Modo continuo o modo limpio">
                    <input type="checkbox" id="conversationModeSwitch">
                    <span class="chat-mode-slider"></span>
                    <span class="chat-mode-label" id="conversationModeLabel">Modo continuo</span>
                </label>
            </div>
            <div class="chat-toolbar-right">
                <button class="chat-toolbar-btn" id="clearConversationBtn">Limpiar conversación</button>
                <button class="chat-toolbar-btn primary" id="syncDesignBtn">Sincronizar con diseño</button>
            </div>
        `;

        container.insertBefore(toolbar, container.firstChild);

        this.elements.providerBadge = document.getElementById('chatProviderBadge');
        this.elements.conversationModeSwitch = document.getElementById('conversationModeSwitch');
        this.elements.conversationModeLabel = document.getElementById('conversationModeLabel');
        this.elements.clearConversationBtn = document.getElementById('clearConversationBtn');
        this.elements.syncDesignBtn = document.getElementById('syncDesignBtn');
    }

    /**
     * Inyecta los estilos necesarios para el componente de chat si no existen.
     * @returns {void} 
     */
    injectStyles() {
        if (document.getElementById('chatIaStyles')) return;
        const style = document.createElement('style');
        style.id = 'chatIaStyles';
        style.textContent = `
            .chat-toolbar{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px 14px;border-bottom:1px solid var(--border-color,#2e3440);flex-wrap:wrap;background:linear-gradient(180deg,rgba(99,102,241,.06),rgba(99,102,241,.02))}
            .chat-toolbar-left,.chat-toolbar-right{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
            .chat-provider-badge{padding:6px 10px;border-radius:999px;background:rgba(59,130,246,.12);font-size:12px;font-weight:700;border:1px solid rgba(59,130,246,.18)}
            .chat-mode-switch{display:inline-flex;align-items:center;gap:10px;cursor:pointer;user-select:none}
            .chat-mode-switch input{display:none}
            .chat-mode-slider{position:relative;width:44px;height:24px;border-radius:999px;background:#64748b;transition:.2s}
            .chat-mode-slider:before{content:'';position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:white;transition:.2s}
            .chat-mode-switch input:checked + .chat-mode-slider{background:#10b981}
            .chat-mode-switch input:checked + .chat-mode-slider:before{transform:translateX(20px)}
            .chat-mode-label{font-size:13px;font-weight:600}
            .chat-toolbar-btn{border:1px solid var(--border-color,#334155);background:transparent;padding:8px 12px;border-radius:10px;cursor:pointer;font-weight:600}
            .chat-toolbar-btn.primary{background:#2563eb;color:white;border-color:#2563eb}
            .chat-message{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:flex-start;margin-bottom:16px}
            .chat-message-avatar{min-width:42px;height:42px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;border:1px solid rgba(100,116,139,.2);padding:0 10px;background:#fff;box-shadow:0 8px 22px rgba(15,23,42,.06)}
            .chat-message.user .chat-message-avatar{color:#1d4ed8;background:linear-gradient(180deg,#eff6ff,#dbeafe)}
            .chat-message.ai .chat-message-avatar{color:#4c1d95;background:linear-gradient(180deg,#f5f3ff,#ede9fe);min-width:72px}
            .chat-message-body{display:flex;flex-direction:column;gap:10px}
            .chat-user-bubble{background:#ffffff;border:1px solid rgba(148,163,184,.22);border-radius:18px;padding:14px 16px;box-shadow:0 10px 30px rgba(15,23,42,.04)}
            .chat-ai-card{border:1px solid rgba(99,102,241,.16);border-radius:20px;padding:16px;background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(248,250,252,.98));box-shadow:0 14px 36px rgba(15,23,42,.07)}
            .chat-ai-card-header{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px;flex-wrap:wrap}
            .chat-ai-provider{display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:rgba(124,58,237,.08);color:#6d28d9;font-size:12px;font-weight:800;border:1px solid rgba(124,58,237,.14)}
            .chat-ai-card-title{font-size:18px;font-weight:800;line-height:1.2;color:#0f172a}
            .chat-ai-markdown{font-size:15px;line-height:1.7;color:#1e293b}
            .chat-ai-markdown h1,.chat-ai-markdown h2,.chat-ai-markdown h3{margin:0 0 10px;color:#0f172a}
            .chat-ai-markdown p{margin:0 0 12px}
            .chat-ai-markdown ul,.chat-ai-markdown ol{margin:0 0 12px 20px}
            .chat-ai-markdown table{width:100%;border-collapse:collapse;margin:10px 0 14px;background:white;border-radius:12px;overflow:hidden}
            .chat-ai-markdown th,.chat-ai-markdown td{border:1px solid rgba(148,163,184,.2);padding:10px 12px;text-align:left}
            .chat-ai-markdown blockquote{margin:12px 0;padding:12px 14px;border-left:4px solid #8b5cf6;background:rgba(139,92,246,.06);border-radius:10px}
            .chat-ai-card .mermaid-wrapper{padding:14px;border-radius:16px;background:linear-gradient(180deg,rgba(245,243,255,.9),rgba(250,245,255,.85));overflow:auto;border:1px solid rgba(139,92,246,.12)}
            .chat-ai-card pre{overflow:auto;background:#0f172a;color:#e2e8f0;padding:14px;border-radius:14px}
            .chat-ai-card code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
            .chat-toast{position:fixed;right:16px;bottom:16px;z-index:9999;padding:12px 14px;border-radius:12px;color:#fff;box-shadow:0 12px 28px rgba(0,0,0,.22);max-width:420px}
            .chat-toast.success{background:#059669}.chat-toast.error{background:#dc2626}.chat-toast.info{background:#2563eb}
            .chat-loading{display:inline-flex;gap:6px;align-items:center;font-size:13px;opacity:.8}
            .chat-loading-dot{width:7px;height:7px;border-radius:50%;background:currentColor;opacity:.35;animation:chatPulse 1s infinite}
            .chat-loading-dot:nth-child(2){animation-delay:.15s}.chat-loading-dot:nth-child(3){animation-delay:.3s}
            .chat-empty-cta{max-width:860px;margin:34px auto;padding:18px 10px}
            
            .chat-empty-hero{position:relative;overflow:hidden;border:1px solid rgba(226,232,240,.95);border-radius:28px;padding:28px;background:#ffffff;box-shadow:0 18px 50px rgba(15,23,42,.08);}
            .chat-empty-hero:before,
            .chat-empty-hero:after{display:none;content:none;}
            
            .chat-empty-kicker{display:inline-flex;align-items:center;gap:8px;padding:7px 12px;border-radius:999px;background:rgba(255,255,255,.78);border:1px solid rgba(148,163,184,.18);font-size:12px;font-weight:800;letter-spacing:.02em;text-transform:uppercase;color:#4338ca;box-shadow:0 8px 22px rgba(15,23,42,.04)}
            .chat-empty-title{margin:16px 0 10px;font-size:30px;line-height:1.12;font-weight:900;color:#0f172a}
            .chat-empty-subtitle{margin:0;max-width:680px;color:#475569;line-height:1.7;font-size:15px}
            .chat-empty-steps{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:22px;text-align:left}
            .chat-empty-step{position:relative;display:flex;gap:14px;align-items:flex-start;padding:16px 16px 16px 14px;border-radius:20px;background:rgba(255,255,255,.76);border:1px solid rgba(148,163,184,.16);box-shadow:0 12px 30px rgba(15,23,42,.05)}
            
            .chat-empty-step-number{flex:0 0 34px;width:34px;height:34px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,#4f46e5,#7c3aed);color:#fff;font-size:14px;font-weight:900;box-shadow:0 10px 24px rgba(79,70,229,.28)}
            
            .chat-empty-step-content strong{display:block;margin-bottom:4px;color:#0f172a;font-size:15px}
            .chat-empty-step-content span{display:block;color:#64748b;font-size:13px;line-height:1.55}
            .chat-empty-footer{margin-top:18px;color:#64748b;font-size:13px}
            @media (max-width: 760px){.chat-empty-title{font-size:24px}.chat-empty-steps{grid-template-columns:1fr}}
            @keyframes chatPulse{0%,80%,100%{transform:scale(.6);opacity:.35}40%{transform:scale(1);opacity:1}}
        `;
        document.head.appendChild(style);
    }

    /**
     * Limpia los mensajes iniciales del chat si son mensajes de introducción predefinidos.
     * @returns {void} 
     */
    sanitizeInitialMessages() {
        const state = this.store.getState();
        const messages = Array.isArray(state.chatMessages) ? state.chatMessages : [];
        if (!messages.length) return;

        const seededIntroPatterns = [
            /planificaci[oó]n\s+de\s+unidad\s+did[aá]ctica/i,
            /planificaci[oó]n\s+de\s+la\s+unidad\s+did[aá]ctica/i,
            /bash\s+scripting/i,
            /he\s+diseñado\s+una\s+propuesta\s+de\s+unidad\s+did[aá]ctica/i,
            /estrategia\s+pedag[oó]gica/i,
            /secuencia\s+de\s+actividades/i,
            /arquitectura\s+de\s+sistemas/i,
            /variables\s+y\s+tipos\s+de\s+datos/i
        ];

        const isSeededIntro = (msg) => {
            const content = String(msg?.content || '').trim();
            if (!content) return false;
            return seededIntroPatterns.some(pattern => pattern.test(content));
        };

        const onlySeededMessages = messages.every(isSeededIntro);
        const hasSeededBundle = messages.length <= 4 && messages.some(isSeededIntro);

        if (onlySeededMessages || hasSeededBundle) {
            this.store.setState({ chatMessages: [] });
        }
    }

    /**
     * Configura los listeners de eventos para el envío de mensajes, cambio de modo de conversación, sincronización con el diseño, y limpieza de la conversación. 
     * También se suscribe a cambios en el store para actualizar la badge del proveedor cuando se cambie la IA seleccionada.
     * @return {void} 
     */
    setupEventListeners() {
        this.elements.sendButton.addEventListener('click', () => this.sendMessage());

        this.elements.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.elements.chatInput.addEventListener('input', () => this.autoResizeTextarea());

        this.elements.conversationModeSwitch?.addEventListener('change', (e) => {
            const mode = e.target.checked ? 'clean' : 'continuous';
            this.setConversationMode(mode);
        });

        this.elements.syncDesignBtn?.addEventListener('click', async () => {
            await this.syncWithDesign();
        });

        this.elements.clearConversationBtn?.addEventListener('click', () => {
            const provider = window.IAService.getSelectedProvider();
            window.IAService.clearConversation(provider);
            this.store.setState({ chatMessages: [] });
            this.showToast('Conversación limpiada para la IA actual.', 'info');
        });

        this.store.subscribe((state) => {
            this.updateProviderBadge(state.aiModel);
        });
    }

    /**
     * Se suscribe a cambios en el store para renderizar los mensajes cada vez que se actualice el estado del chat. 
     * Esto asegura que la interfaz de usuario esté siempre sincronizada con el estado global de la aplicación.
     * @return {void}
     */
    subscribeToStore() {
        this.store.subscribe(() => this.renderMessages());
    }

    /**
     * Configura el modo de conversación en IAService y actualiza el estado del switch y su label en la interfaz de usuario.
     * @param {*} mode Modo de conversación ('clean' o 'continuous')
     */
    setConversationMode(mode) {
        window.IAService.setConversationMode(mode);
        const isClean = mode === 'clean';
        if (this.elements.conversationModeSwitch) {
            this.elements.conversationModeSwitch.checked = isClean;
        }
        if (this.elements.conversationModeLabel) {
            this.elements.conversationModeLabel.textContent = isClean ? 'Modo limpio' : 'Modo continuo';
        }
    }

    /**
     * Actualiza la badge del proveedor de IA en la interfaz de usuario.
     * @param {*} aiModel Modelo de IA ('chatgpt', 'claude', 'gemini', etc.)
     */
    updateProviderBadge(aiModel = null) {
        const model = aiModel || this.store.getState().aiModel || 'chatgpt';
        const label = window.IAService?.getProviderLabel?.(model) || this.getProviderLabel(model);
        if (this.elements.providerBadge) {
            this.elements.providerBadge.textContent = `IA: ${label}`;
        }
    }

    /**
     * Obtiene la etiqueta del proveedor de IA basado en el modelo.
     * @param {*} model Modelo de IA ('chatgpt', 'claude', 'gemini', etc.)
     * @returns {string} Etiqueta del proveedor de IA
     */
    getProviderLabel(model) {
        const names = {
            chatgpt: 'ChatGPT',
            claude: 'Claude',
            gemini: 'Gemini'
        };
        return names[model] || model;
    }

    /**
     * Envía un mensaje al servicio de IA y maneja la respuesta.
     * @returns {Promise<void>} 
     */
    async sendMessage() {
        const text = this.elements.chatInput.value.trim();
        if (!text || this.isSending) return;

        this.store.addChatMessage({ type: 'user', content: text });
        this.elements.chatInput.value = '';
        this.autoResizeTextarea();
        this.isSending = true;
        this.elements.sendButton.disabled = true;

        const providerId = window.IAService?.getSelectedProvider?.() || this.store.getState().aiModel || 'chatgpt';
        const providerLabel = window.IAService?.getProviderLabel?.(providerId) || this.getProviderLabel(providerId);
        const loadingId = `loading-${Date.now()}`;
        this.store.addChatMessage({
            id: loadingId,
            type: 'ai',
            providerId,
            providerLabel,
            content: '<div class="chat-loading"><span class="chat-loading-dot"></span><span class="chat-loading-dot"></span><span class="chat-loading-dot"></span><span>Pensando…</span></div>',
            isHtml: true,
            isLoading: true
        });

        try {
            const normalized = await window.IAService.sendMessage(text);
            this.removeLoadingMessage(loadingId);
            this.store.addChatMessage({
                type: 'ai',
                providerId: normalized.displayPayload?.providerId || providerId,
                providerLabel: normalized.displayPayload?.providerLabel || providerLabel,
                content: this.buildAiHtml(normalized.displayPayload),
                isHtml: true,
                structuredPayload: normalized.structuredPayload,
                rawText: normalized.displayPayload?.rawText || ''
            });
            this.renderMessages();
        } catch (error) {
            this.removeLoadingMessage(loadingId);
            this.store.addChatMessage({
                type: 'ai',
                providerId,
                providerLabel,
                content: `
                    <div class="chat-ai-card">
                        <div class="chat-ai-card-header">
                            <span class="chat-ai-provider">${this.escapeHtml(providerLabel)}</span>
                            <div class="chat-ai-card-title">No se pudo completar la petición</div>
                        </div>
                        <p>${this.escapeHtml(error.message || 'No se pudo completar la petición.')}</p>
                    </div>
                `,
                isHtml: true
            });
        } finally {
            this.isSending = false;
            this.elements.sendButton.disabled = false;
        }
    }

    /**
     * Elimina un mensaje de carga del estado del chat.
     * @param {string} loadingId ID del mensaje de carga a eliminar.
     */
    removeLoadingMessage(loadingId) {
        const state = this.store.getState();
        const filtered = (state.chatMessages || []).filter(msg => msg.id !== loadingId);
        this.store.setState({ chatMessages: filtered });
    }

    /**
     * Construye el HTML para un mensaje de IA.
     * @param {Object} displayPayload Payload de visualización de la IA.
     * @returns {string} HTML del mensaje de IA.
     */
    buildAiHtml(displayPayload) {
        const title = this.escapeHtml(displayPayload?.title || 'Respuesta');
        const providerLabel = this.escapeHtml(displayPayload?.providerLabel || 'IA');
        const markdownHtml = window.MarkdownUtils?.render(displayPayload?.summaryMarkdown || '') || this.escapeHtml(displayPayload?.summaryMarkdown || '');
        const mermaidBlocks = (displayPayload?.mermaid || []).map((code, index) => `
            <div class="mermaid-wrapper">
                <div class="mermaid" data-mermaid-index="${index}">${this.escapeHtml(code)}</div>
            </div>
        `).join('');

        return `
            <div class="chat-ai-card">
                <div class="chat-ai-card-header">
                    <span class="chat-ai-provider">${providerLabel}</span>
                    <div class="chat-ai-card-title">${title}</div>
                </div>
                <div class="chat-ai-markdown">${markdownHtml}</div>
                ${mermaidBlocks}
            </div>
        `;
    }

    /**
     * Renderiza los mensajes del chat en la interfaz de usuario.
     * @returns {void}
     */
    renderMessages() {
        const state = this.store.getState();
        const messages = state.chatMessages || [];

        if (!messages.length) {
            this.elements.chatMessages.innerHTML = `
                <div class="chat-empty-cta">
                    <div class="chat-empty-hero">
                        <div class="chat-empty-kicker">Asistente de diseño educativo</div>
                        <h2 class="chat-empty-title">Empieza a conversar con la IA</h2>
                        <p class="chat-empty-subtitle">Prepara primero el contexto básico y, a partir de ahí, pídele a la IA que te ayude a construir, mejorar o reorganizar tu diseño didáctico.</p>
                        <div class="chat-empty-steps">
                            <div class="chat-empty-step">
                                <div class="chat-empty-step-number">1</div>
                                <div class="chat-empty-step-content">
                                    <strong>Elige una IA</strong>
                                    <span>Selecciona ChatGPT, Claude o Gemini desde el encabezado.</span>
                                </div>
                            </div>
                            <div class="chat-empty-step">
                                <div class="chat-empty-step-number">2</div>
                                <div class="chat-empty-step-content">
                                    <strong>Selecciona la etapa</strong>
                                    <span>Escoge ESO, Bachillerato o Formación Profesional.</span>
                                </div>
                            </div>
                            <div class="chat-empty-step">
                                <div class="chat-empty-step-number">3</div>
                                <div class="chat-empty-step-content">
                                    <strong>Escoge asignatura o módulo</strong>
                                    <span>Define la materia concreta para que el contexto curricular sea correcto.</span>
                                </div>
                            </div>
                            <div class="chat-empty-step">
                                <div class="chat-empty-step-number">4</div>
                                <div class="chat-empty-step-content">
                                    <strong>Elige los elementos curriculares</strong>
                                    <span>Marca los elementos del menú derecho que quieras incorporar al diseño.</span>
                                </div>
                            </div>
                        </div>
                        <div class="chat-empty-footer">Cuando lo tengas, escribe tu primera petición en el chat.</div>
                    </div>
                </div>
            `;
            return;
        }

        this.elements.chatMessages.innerHTML = messages.map(message => this.renderMessage(message)).join('');
        if (window.lucide) lucide.createIcons();
        this.scrollToBottom();
        this.renderMermaidDiagrams();
    }


    /**
     * Renderiza un mensaje en el chat.
     * @param {Object} message Mensaje a renderizar.
     * @returns {string} HTML del mensaje.
     */
    renderMessage(message) {
        const isAI = message.type === 'ai';
        const providerLabel = message.providerLabel || (isAI ? (window.IAService?.getProviderLabel?.(message.providerId) || this.getProviderLabel(message.providerId || this.store.getState().aiModel)) : 'Tú');
        const body = message.isHtml
            ? message.content
            : (isAI
                ? (window.MarkdownUtils?.render(message.content) || this.escapeHtml(message.content))
                : `<div class="chat-user-bubble">${this.escapeHtml(message.content).replace(/\n/g, '<br>')}</div>`);

        return `
            <div class="chat-message ${isAI ? 'ai' : 'user'}" data-message-id="${message.id || ''}">
                <div class="chat-message-avatar">${isAI ? this.escapeHtml(providerLabel) : 'Tú'}</div>
                <div class="chat-message-body">${body}</div>
            </div>
        `;
    }

    /**
     * Ajusta automáticamente la altura del textarea del input del chat para que se adapte al contenido, con un máximo de 160px.
     * @return {void}
     */
    autoResizeTextarea() {
        const textarea = this.elements.chatInput;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
    }

    /**
     * Desplaza el chat hacia el final para mostrar los mensajes más recientes.
     * @return {void}
     */
    scrollToBottom() {
        this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
    }

    /**
     * Carga Mermaid si no está disponible en el entorno.
     * @returns {Promise<void>}
     */
    async ensureMermaidLoaded() {
        if (window.mermaid) return;
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        }).catch(() => {
            this.showToast('No se pudo cargar Mermaid. Los diagramas se mostrarán como texto.', 'error');
        });

        if (window.mermaid) {
            window.mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', theme: 'default' });
        }
    }

    /**
     * Renderiza los diagramas de Mermaid en los mensajes del chat.
     * @returns {Promise<void>}
     */
    async renderMermaidDiagrams() {
        if (!window.mermaid) return;
        const nodes = Array.from(this.elements.chatMessages.querySelectorAll('.mermaid'));
        for (const node of nodes) {
            if (node.dataset.rendered === 'true') continue;
            const code = node.textContent;
            const id = `mermaid-${Math.random().toString(36).slice(2)}`;
            try {
                const { svg } = await window.mermaid.render(id, code);
                node.innerHTML = svg;
                node.dataset.rendered = 'true';
            } catch (error) {
                node.innerHTML = `<pre>${this.escapeHtml(code)}</pre>`;
                node.dataset.rendered = 'true';
            }
        }
    }

    /**
     * Muestra un mensaje emergente (toast) en la interfaz de usuario.
     * @param {string} message Mensaje a mostrar.
     * @param {string} [type='info'] Tipo de mensaje ('info', 'success', 'error').
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `chat-toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3600);
    }

    /**
     * Escapa caracteres HTML en una cadena para evitar la inyección de código.
     * @param {string} str Cadena a escapar.
     * @returns {string} Cadena escapada.
     */
    escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Sincroniza la última respuesta de la IA con el diseño, utilizando IAService para adaptar la respuesta al formato requerido por el diseño.
     * Muestra un mensaje al usuario con el resultado de la sincronización, indicando cuántos cambios se aplicaron, cuántos se rechazaron, 
     * y si se intentó adaptar automáticamente la respuesta.
     */
    async syncWithDesign() {
        const button = this.elements.syncDesignBtn;
        const originalLabel = button?.textContent || 'Sincronizar con diseño';

        try {
            if (button) {
                button.disabled = true;
                button.textContent = 'Sincronizando...';
            }

            // Usar el nuevo IAService para sincronización
            if (!window.IAService) {
                throw new Error('IAService no disponible');
            }

            const result = await window.IAService.syncLastAnswerToDesign();

            if (!result.success) {
                throw new Error(result.error || 'No se pudo sincronizar.');
            }

            // Notificar al componente Resumen para que se actualice
            document.dispatchEvent(new CustomEvent('sessionStateUpdated', {
                detail: { source: 'ia-sync' }
            }));

            const repairPrefix = result.repaired
                ? 'La respuesta no cumplía el contrato y se ha intentado adaptar automáticamente. '
                : '';

            this.showToast(
                `${repairPrefix}Sincronización completada. Aplicados: ${result.appliedChanges.length}. Rechazados: ${result.rejectedChanges.length}.`,
                'success'
            );

        } catch (error) {
            console.error('Error en sincronización:', error);
            this.showToast(error.message || 'Error sincronizando con el diseño.', 'error');
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = originalLabel;
            }
        }
    }

    /**
     * Desplaza el chat hacia el final para mostrar los mensajes más recientes.
     * @returns {void}
     */
    getLastAIResponse() {
        // Buscar mensajes de IA con la estructura correcta
        const messages = this.elements.chatMessages.querySelectorAll('.chat-message.ai');
        if (messages.length === 0) return null;

        const lastMessage = messages[messages.length - 1];

        // Intentar obtener el contenido de diferentes elementos posibles
        let contentElement = lastMessage.querySelector('.chat-ai-markdown');
        if (!contentElement) {
            contentElement = lastMessage.querySelector('.message-content');
        }
        if (!contentElement) {
            contentElement = lastMessage.querySelector('.chat-message-body');
        }

        if (contentElement) {
            // Obtener el texto pero también intentar obtener el rawText de los datos almacenados
            const messageId = lastMessage.getAttribute('data-message-id');
            if (messageId) {
                const state = this.store.getState();
                const chatMessage = (state.chatMessages || []).find(m => m.id === messageId);
                if (chatMessage && chatMessage.rawText) {
                    return chatMessage.rawText.trim();
                }
                if (chatMessage && chatMessage.structuredPayload) {
                    return JSON.stringify(chatMessage.structuredPayload, null, 2);
                }
            }

            return contentElement.textContent.trim();
        }

        return null;
    }
}

// Inicializar el componente de chat una vez que el DOM esté completamente cargado
window.chatComponent = new ChatComponent(window.AppStore);
