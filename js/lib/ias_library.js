/**
 * IAService: Servicio centralizado para manejar la interacción con proveedores de IA, gestión de contexto, construcción de prompts y sincronización con el diseño.
 * - Gestiona la carga de configuraciones, prompts y esquemas.
 * - Construye el contexto para cada mensaje basado en el estado de la aplicación y el historial de conversación.
 * - Normaliza las respuestas de los proveedores para cumplir con un contrato específico.
 * - Maneja la conversación y su persistencia en el almacenamiento local.
 * - Proporciona una función de reparación para adaptar respuestas que no cumplen el contrato de sincronización.
 * - Permite la selección dinámica de proveedores y la gestión de múltiples conversaciones.
 * - Diseñado para ser extensible y adaptable a diferentes proveedores de IA y cambios en el esquema de diseño.
 */
(function () {
  'use strict';

  // Configuración por defecto para el servicio de IA, incluyendo rutas de archivos, límites de mensajes y nombres de proveedores.
  const DEFAULT_CONFIG = {
    apiKeysPath: 'data/ApiKeys.json',
    promptsPath: 'data/prompts.json',
    schemaPathFP: 'data/resumen_fp.json',
    schemaPathSEC: 'data/resumen_secundaria.json',
    maxRecentMessages: 6,
    conversationStorageKey: 'ia_conversations_state',
    uiStateKey: 'ia_chat_ui_state',
    providerTimeoutMs: 90000,
    knowledgeSources: {
      bloom: 'data/bloom.xml',
      gardner: 'data/gardner.xml',
      ods: 'data/ods.xml',
      retoXXI: 'data/reto_xxi.xml',
      softskills: 'data/softskills.xml',
      metodologias: 'data/metodologias.xml',
      competenciasClave: 'data/competencias_clave.xml',
      objetivosEtapa: 'data/objetivos_etapa.xml'
    },
    providerNames: {
      chatgpt: 'ChatGPT',
      claude: 'Claude',
      gemini: 'Gemini'
    }
  };

  /**
   * IAService: Clase principal que encapsula toda la lógica relacionada con la interacción con proveedores de IA, gestión de contexto, construcción de prompts y sincronización con el diseño.
   * Proporciona métodos para inicializar el servicio, enviar mensajes, sincronizar respuestas con el diseño y reparar respuestas que no cumplen el contrato de sincronización.
   * Utiliza varias clases auxiliares para manejar aspectos específicos como la gestión de API keys, construcción de prompts, construcción de contexto, gestión de conversaciones y registro de proveedores.
   * Está diseñado para ser extensible y adaptable a diferentes proveedores de IA y cambios en el esquema de diseño, proporcionando una base sólida para la integración de IA en la aplicación.
   * Emite un evento 'iaServiceReady' cuando la inicialización se completa, permitiendo que otros componentes de la aplicación reaccionen a la disponibilidad del servicio de IA.
   */
  class IAService {
    /**
     * Constructor de IAService, inicializa las clases auxiliares y configura el estado inicial del servicio.
     * @param {*} config Configuración opcional para sobrescribir los valores por defecto.
     */
    constructor(config = {}) {
      this.config = { ...DEFAULT_CONFIG, ...config };
      this.apiKeyManager = new ApiKeyManager(this.config.apiKeysPath);
      this.promptManager = new PromptManager(this.config.promptsPath);
      this.contextBuilder = new ContextBuilder(this.config);
      this.conversationManager = new ConversationManager(this.config);
      this.providerRegistry = new ProviderRegistry(this.config);
      this.responseNormalizer = new ResponseNormalizer(this.config);
      this.designSyncEngine = new DesignSyncEngine();
      this.initialized = false;
      this.initPromise = null;
      this.schemaCache = { FP: null, SEC: null };


      this.sendMessage = this.sendMessage.bind(this);
      this.syncLastAnswerToDesign = this.syncLastAnswerToDesign.bind(this);
      this.getCurrentSchema = this.getCurrentSchema.bind(this);
    }

    /**
     * Inicializa el servicio de IA, cargando las configuraciones, esquemas y conocimientos necesarios.
     * Emite un evento 'iaServiceReady' cuando la inicialización se completa.
     * @returns {Promise<IAService>} Una promesa que se resuelve con la instancia del servicio de IA.
     */
    async init() {
      if (this.initialized) return this;
      if (this.initPromise) return this.initPromise;

      this.initPromise = (async () => {
        await Promise.all([
          this.apiKeyManager.load(),
          this.promptManager.load(),
          this.loadSchemas(),
          this.contextBuilder.preloadKnowledge()
        ]);

        this.initialized = true;
        document.dispatchEvent(new CustomEvent('iaServiceReady'));
        return this;
      })();

      return this.initPromise;
    }

    /**
     * Carga los esquemas de diseño para FP y SEC desde las rutas configuradas y los almacena en caché para su uso posterior.
     * Esto permite que el servicio de IA tenga acceso rápido a los esquemas necesarios para construir prompts y normalizar respuestas según el nivel educativo actual.
     * @returns {Promise<void>} Una promesa que se resuelve cuando los esquemas se han cargado y almacenado en caché.
     */
    async loadSchemas() {
      const [fpSchema, secSchema] = await Promise.all([
        safeFetchJson(this.config.schemaPathFP, null),
        safeFetchJson(this.config.schemaPathSEC, null)
      ]);

      this.schemaCache.FP = fpSchema;
      this.schemaCache.SEC = secSchema;
    }

    /**
     * Obtiene el esquema de diseño actual según el nivel educativo configurado en la aplicación.
     * @returns {Object|null} El esquema de diseño actual o null si no está disponible.
     */
    getCurrentSchema() {
      const level = window.AppStore?.getState?.().educationalLevel === 'SEC' ? 'SEC' : 'FP';
      return this.schemaCache[level] || this.schemaCache.FP || null;
    }

    /**
     * Obtiene el proveedor de IA seleccionado actualmente en la aplicación.
     * @returns {string} El ID del proveedor de IA seleccionado.
     */
    getSelectedProvider() {
      return window.AppStore?.getState?.().aiModel || 'chatgpt';
    }

    /**
     * Obtiene la etiqueta del proveedor de IA dado su ID.
     * @param {string|null} providerId El ID del proveedor de IA. Si no se proporciona, se utiliza el proveedor seleccionado actualmente.
     * @returns {string} La etiqueta del proveedor de IA.
     */
    getProviderLabel(providerId = null) {
      const id = providerId || this.getSelectedProvider();
      return this.config.providerNames[id] || id;
    }

    /**
     * Establece el proveedor de IA seleccionado actualmente en la aplicación.
     * @param {string} providerId El ID del proveedor de IA a seleccionar.
     * @returns {string} El ID del proveedor de IA seleccionado.
     */
    setSelectedProvider(providerId) {
      if (window.AppStore?.setState) {
        window.AppStore.setState({ aiModel: providerId });
      }
      return providerId;
    }

    /**
     * Obtiene el estado de la conversación actual.
     * @returns 
     */
    getConversationState() {
      return this.conversationManager.getState();
    }

    /**
     * Establece el modo de conversación actual.
     * @param {string} mode El modo de conversación a establecer.
     */
    setConversationMode(mode) {
      this.conversationManager.setMode(mode);
    }

    /**
     * Obtiene el modo de conversación actual.
     * @returns {string} El modo de conversación actual.
     */
    getConversationMode() {
      return this.conversationManager.getMode();
    }

    /**
     * Limpia la conversación actual para el proveedor de IA especificado.
     * @param {string|null} providerId El ID del proveedor de IA. Si no se proporciona, se utiliza el proveedor seleccionado actualmente.
     */
    clearConversation(providerId = null) {
      this.conversationManager.clear(providerId || this.getSelectedProvider());
    }

    /**
     * Envía un mensaje al proveedor de IA seleccionado y obtiene la respuesta normalizada.
     * @param {string} userText El texto del usuario a enviar.
     * @returns {Promise<Object>} La respuesta normalizada del proveedor de IA.
     */
    async sendMessage(userText) {
      await this.init();

      const providerId = this.getSelectedProvider();
      const providerConfig = this.apiKeyManager.getProviderConfig(providerId);
      const provider = this.providerRegistry.get(providerId);

      if (!provider) {
        throw new Error(`Proveedor no soportado: ${providerId}`);
      }

      if (!providerConfig || !providerConfig.apiKey) {
        throw new Error(`No hay API key configurada para ${providerId}. Revisa data/ApiKeys.json`);
      }

      const schema = typeof this.getCurrentSchema === 'function'
        ? this.getCurrentSchema()
        : this.schemaCache?.FP || null;

      const runtime = this.contextBuilder.getRuntimeContext();
      const context = await this.contextBuilder.build({
        providerId,
        userText,
        schema,
        conversationState: this.conversationManager.getProviderState(providerId),
        mode: this.conversationManager.getMode(),
        maxRecentMessages: this.config.maxRecentMessages
      });

      const promptPack = this.promptManager.buildPromptPack({
        runtime,
        context,
        schema
      });

      const rawResponse = await provider.send({
        apiKey: providerConfig.apiKey,
        model: providerConfig.model,
        promptPack,
        conversationState: this.conversationManager.getProviderState(providerId),
        mode: this.conversationManager.getMode(),
        timeoutMs: this.config.providerTimeoutMs
      });

      const normalized = this.responseNormalizer.normalize({
        rawResponse,
        providerId,
        userText,
        schema
      });

      this.conversationManager.registerTurn({
        providerId,
        mode: this.conversationManager.getMode(),
        userText,
        assistantDisplay: normalized.displayPayload,
        assistantStructured: normalized.structuredPayload,
        providerMeta: normalized.providerMeta,
        normalizationMeta: normalized.normalizationMeta
      });

      return normalized;
    }

    /**
     * Sincroniza la última respuesta del proveedor de IA con el diseño.
     * @param {string|null} providerId El ID del proveedor de IA. Si no se proporciona, se utiliza el proveedor seleccionado actualmente.
     * @returns {Promise<Object>} El resultado de la sincronización.
     */
    async syncLastAnswerToDesign(providerId = null) {
      await this.init();
      const currentProvider = providerId || this.getSelectedProvider();
      const schema = this.getCurrentSchema();
      const providerState = this.conversationManager.getProviderState(currentProvider);
      const lastSyncable = providerState?.lastSyncableAnswer
        || (providerState?.lastNormalization?.isSyncable ? providerState?.lastStructuredAnswer : null);

      if (lastSyncable && typeof lastSyncable === 'object' && !Array.isArray(lastSyncable)) {
        const syncResult = this.designSyncEngine.sync(lastSyncable, schema);
        return {
          ...syncResult,
          repaired: false,
          syncable: true
        };
      }

      const repairResult = await this.repairLastAnswerForSync(currentProvider);
      if (!repairResult.success) {
        return {
          success: false,
          repaired: true,
          syncable: false,
          error: repairResult.error || 'No se pudo adaptar la respuesta al contrato estricto.'
        };
      }

      const syncResult = this.designSyncEngine.sync(repairResult.structuredPayload, schema);
      return {
        ...syncResult,
        repaired: true,
        syncable: true,
        repairMessage: repairResult.message || ''
      };
    }

    /**
     * Repara la última respuesta del proveedor de IA para que cumpla con el contrato estricto.
     * @param {string|null} providerId El ID del proveedor de IA. Si no se proporciona, se utiliza el proveedor seleccionado actualmente.
     * @returns {Promise<Object>} El resultado de la reparación.
     */
    async repairLastAnswerForSync(providerId = null) {
      await this.init();
      const currentProvider = providerId || this.getSelectedProvider();
      const providerConfig = this.apiKeyManager.getProviderConfig(currentProvider);
      const provider = this.providerRegistry.get(currentProvider);
      const providerState = this.conversationManager.getProviderState(currentProvider);
      const schema = this.getCurrentSchema();
      const display = providerState?.lastDisplayAnswer || {};
      const sourceText = String(display.rawText || display.summaryMarkdown || '').trim();

      if (!sourceText) {
        return {
          success: false,
          error: 'No hay una respuesta previa que se pueda adaptar al contrato estricto.'
        };
      }

      if (!provider || !providerConfig?.apiKey) {
        return {
          success: false,
          error: `No hay proveedor o API key disponible para ${currentProvider}.`
        };
      }

      // Construir un prompt específico para la reparación, proporcionando la respuesta original, el motivo de la reparación y el contrato de salida esperado.
      const promptPack = this.promptManager.buildRepairPromptPack({
        providerId: currentProvider,
        schema,
        sourceText,
        failureReason: providerState?.lastNormalization?.reason || ''
      });

      // Enviar el prompt de reparación al proveedor de IA para obtener una respuesta adaptada al contrato estricto.
      const rawResponse = await provider.send({
        apiKey: providerConfig.apiKey,
        model: providerConfig.model,
        promptPack,
        conversationState: { messages: [] },
        mode: 'clean',
        timeoutMs: this.config.providerTimeoutMs
      });

      // Normalizar la respuesta de reparación utilizando el mismo proceso que para las respuestas normales, pero con un contexto específico que indique que se trata de una reparación.
      const normalized = this.responseNormalizer.normalize({
        rawResponse,
        providerId: currentProvider,
        userText: 'repair_last_answer_for_sync',
        schema
      });

      // Registrar la respuesta reparada en el estado de la conversación, incluso si no cumple con el contrato de sincronización, para mantener un historial completo de las interacciones con el proveedor de IA.
      providerState.lastStructuredAnswer = normalized.structuredPayload;
      providerState.lastSyncableAnswer = normalized.normalizationMeta?.isSyncable ? normalized.structuredPayload : null;
      providerState.lastDisplayAnswer = {
        ...display,
        rawText: rawResponse?.text || display.rawText || '',
        summaryMarkdown: normalized.displayPayload?.summaryMarkdown || display.summaryMarkdown || ''
      };
      providerState.lastNormalization = normalized.normalizationMeta || null;
      saveJsonStorage(this.config.conversationStorageKey, this.conversationManager.state);

      if (!normalized.normalizationMeta?.isSyncable) {
        return {
          success: false,
          error: normalized.normalizationMeta?.reason || 'La respuesta reparada sigue sin cumplir el contrato estricto.'
        };
      }

      return {
        success: true,
        structuredPayload: normalized.structuredPayload,
        message: 'La respuesta se ha adaptado al contrato estricto y puede sincronizarse.'
      };
    }


  }

  /**
   * ApiKeyManager: Clase encargada de cargar y gestionar las API keys de los proveedores de IA desde un archivo JSON.
   * Proporciona métodos para cargar las API keys y obtener la configuración de un proveedor específico. La configuración se espera que tenga al menos una propiedad 'apiKey' para cada proveedor, y opcionalmente otras propiedades como 'model' para especificar el modelo de IA a utilizar. Esta clase abstrae la gestión de las credenciales necesarias para interactuar con los proveedores de IA, permitiendo que el servicio principal de IA se enfoque en la lógica de interacción y procesamiento de respuestas.
   * El archivo JSON de configuración se espera que tenga una estructura similar a la siguiente:
   * {
   *   "providers": {
   *     "chatgpt": {
   *      "apiKey": "tu_api_key_aqui",
   *     "model": "gpt-4"
   *    },
   *    "claude": {
   *     "apiKey": "tu_api_key_aqui",
   *    "model": "claude-2"
   *  }
   * }
   * 
   */
  class ApiKeyManager {
    /**
     * Constructor de ApiKeyManager, inicializa la ruta del archivo de configuración y el estado de las API keys.
     * @param {*} path 
     */
    constructor(path) {
      this.path = path;
      this.data = null;
    }

    /**
     * Carga las API keys desde el archivo JSON configurado. Si la carga es exitosa, almacena la configuración en el estado de la clase para su uso posterior. Si ocurre un error durante la carga, se captura y se registra en la consola, y se establece un estado vacío para evitar errores posteriores al intentar acceder a la configuración de los proveedores.
     * @returns 
     */
    async load() {
      this.data = await safeFetchJson(this.path, { providers: {} });
      return this.data;
    }

    /**
     * Obtiene la configuración de un proveedor específico.
     * @param {string} providerId - Identificador del proveedor.
     * @returns {object|null} Configuración del proveedor o null si no existe.
     */
    getProviderConfig(providerId) {
      return this.data?.providers?.[providerId] || null;
    }
  }

  /**
   * PromptManager: Clase encargada de cargar y gestionar los templates de prompts desde un archivo JSON, y construir los prompts específicos para cada interacción con el proveedor de IA.
   * Proporciona métodos para cargar los templates de prompts y construir un paquete de prompts (prompt pack) que incluye las instrucciones para el sistema y el mensaje del usuario, reemplazando los tokens en los templates con la información contextual relevante. También proporciona un método específico para construir un prompt pack orientado a la reparación de respuestas que no cumplen con el contrato de sincronización, incluyendo instrucciones detalladas para guiar al modelo de IA en la generación de una respuesta adaptada al contrato estricto.
   * El archivo JSON de prompts se espera que tenga una estructura similar a la siguiente:
   * {
   *   "system": "Instrucciones para el sistema con tokens como {{MODE}}, {{EDUCATIONAL_LEVEL}}, etc.",
   *   "chat": "Template para el mensaje del usuario con tokens como {{USER_MESSAGE}}, {{CONVERSATION_MEMORY}}, etc."
   * }
   * 
   */
  class PromptManager {
    /**
     * Constructor de PromptManager, inicializa la ruta del archivo de prompts y el estado de los datos.
     * @param {string} path - Ruta del archivo JSON de prompts.
     */
    constructor(path) {
      this.path = path;
      this.data = null;
    }

    /**
     * Carga los templates de prompts desde el archivo JSON configurado. Si la carga es exitosa, almacena la configuración en el estado de la clase para su uso posterior. Si ocurre un error durante la carga, se captura y se registra en la consola, y se establece un estado vacío para evitar errores posteriores al intentar acceder a los templates de prompts.
     * @returns {object} Templates de prompts cargados.
     */
    async load() {
      this.data = await safeFetchJson(this.path, {});
      return this.data;
    }

    /**
     * Construye un paquete de prompts (prompt pack) que incluye las instrucciones para el sistema y el mensaje del usuario, reemplazando los tokens en los templates con la información contextual relevante.
     * @param {object} param0 - Parámetros para construir el prompt pack.
     * @param {object} param0.runtime - Información del runtime.
     * @param {object} param0.context - Información del contexto.
     * @param {object} param0.schema - Esquema de salida esperado.
     * @returns {object} Prompt pack construido.
     */
    buildPromptPack({ runtime, context, schema }) {
      const systemTemplate = this.data?.system || '';
      const chatTemplate = this.data?.chat || '';
      const outputContract = JSON.stringify(buildOutputContract(schema), null, 2);

      const replacements = {
        '{{MODE}}': runtime.mode,
        '{{EDUCATIONAL_LEVEL}}': runtime.educationalLevel,
        '{{STAGE_LABEL}}': runtime.stageLabel,
        '{{SUBJECT_LABEL}}': runtime.subjectLabel,
        '{{CONVERSATION_MODE}}': context.conversationMode,
        '{{LOCK_STATUS}}': JSON.stringify(context.lockStatus, null, 2),
        '{{DESIGN_STATE}}': JSON.stringify(context.designState, null, 2),
        '{{GENERAL_KNOWLEDGE}}': context.generalKnowledge,
        '{{CURRICULAR_KNOWLEDGE}}': JSON.stringify(context.curricularKnowledge, null, 2),
        '{{SELECTED_CONTEXT_SUMMARY}}': context.selectedContextSummary || '',
        '{{CONVERSATION_MEMORY}}': JSON.stringify(context.conversationMemory, null, 2),
        '{{OUTPUT_CONTRACT}}': outputContract,
        '{{USER_MESSAGE}}': context.userText
      };

      return {
        instructions: replaceTokens(systemTemplate, replacements),
        userMessage: replaceTokens(chatTemplate, replacements),
        rawReplacements: replacements
      };
    }

    /**
     * Construye un paquete de prompts para la reparación de respuestas que no cumplen el contrato.
     * @param {object} param0 - Parámetros para construir el prompt de reparación.
     * @param {string} param0.providerId - ID del proveedor original de la respuesta.
     * @param {object} param0.schema - Esquema de salida esperado.
     * @param {string} param0.sourceText - Texto de la respuesta original a reparar.
     * @param {string} [param0.failureReason] - Razón de la falla en la respuesta original.
     * @returns {object} Prompt pack de reparación construido.
     */
    buildRepairPromptPack({ providerId, schema, sourceText, failureReason = '' }) {
      const outputContract = JSON.stringify(buildOutputContract(schema), null, 2);

      return {
        instructions: [
          'Actua como un reparador estricto de JSON.',
          'Debes devolver un unico JSON valido, sin texto fuera del JSON.',
          'Reconstruye la respuesta para que cumpla exactamente el contrato indicado.',
          'design_sync debe respetar exactamente la estructura del schema base para cada rama incluida.',
          'No uses atajos del tipo titulo: "..." si el contrato exige titulo: { valor: "..." }.',
          'No inventes claves que no existan en el schema.',
          'Si no puedes mapear una parte con seguridad, omitela del design_sync.',
          'Puedes devolver solo las ramas que cambian, pero cada rama debe mantener la forma exacta del contrato.',
          `Proveedor original: ${providerId}`
        ].join('\n'),
        userMessage: [
          'RESPUESTA ORIGINAL A REPARAR:',
          sourceText,
          '',
          'MOTIVO DE LA REPARACION:',
          failureReason || 'La respuesta no cumple el contrato estricto de sincronizacion.',
          '',
          'CONTRATO DE SALIDA OBLIGATORIO:',
          outputContract,
          '',
          'Devuelve exclusivamente un JSON valido que respete el contrato.'
        ].join('\n')
      };
    }
  }

  /**
   * ContextBuilder: Clase encargada de construir el contexto necesario para cada interacción con el proveedor de IA, 
   * incluyendo la gestión de conocimientos curriculares y generales, el resumen del contexto seleccionado y la memoria de la conversación.
   * Proporciona métodos para precargar los conocimientos desde las fuentes configuradas, 
   * construir el contexto de ejecución basado en el estado actual de la aplicación, validar si una respuesta cumple 
   * con el contrato de sincronización, y construir el contexto completo para enviar al proveedor de IA. 
   * El contexto construido incluye información relevante sobre el nivel educativo, la etapa y materia seleccionada, 
   * el estado del diseño, los conocimientos curriculares y generales disponibles, un resumen del contexto seleccionado 
   * y la memoria de la conversación reciente. Esta clase abstrae la complejidad de reunir 
   * y organizar toda la información contextual necesaria para que el proveedor de IA pueda generar respuestas relevantes 
   * y adaptadas a la situación actual del usuario.
   */
  class ContextBuilder {
    /**
     * Constructor de ContextBuilder, inicializa la configuración y el caché de conocimientos.
     * @param {*} config 
     */
    constructor(config) {
      this.config = config;
      this.knowledgeCache = {};
    }

    /**
     * Pre-carga los conocimientos curriculares y generales desde las fuentes configuradas en la aplicación, almacenándolos en caché para su uso posterior al construir el contexto para las interacciones con el proveedor de IA. Esto permite que el servicio de IA tenga acceso rápido a la información relevante sobre taxonomía de Bloom, inteligencias múltiples, soft skills, metodologías, ODS, retos del siglo XXI, competencias clave y objetivos de etapa, sin tener que cargar esta información cada vez que se construye el contexto para una nueva interacción. La función maneja la carga de cada fuente de conocimiento de manera asíncrona y captura cualquier error que pueda ocurrir durante la carga, registrándolo en la consola para facilitar la depuración.
     * @returns {Promise<void>} Una promesa que se resuelve cuando todos los conocimientos han sido precargados y almacenados en caché.
     */
    async preloadKnowledge() {
      const entries = Object.entries(this.config.knowledgeSources);
      await Promise.all(entries.map(async ([key, path]) => {
        const text = await safeFetchText(path, '');
        this.knowledgeCache[key] = text;
      }));
    }

    /**
     * Construye y devuelve el contexto de ejecución basado en el estado actual de la aplicación.
     * @returns {Object} Un objeto que contiene el nivel educativo, el modo, la etiqueta de la etapa, la etiqueta de la materia y el estado de la aplicación.
     */
    getRuntimeContext() {
      const appState = window.AppStore?.getState?.() || {};
      const educationalLevel = appState.educationalLevel || 'FP';
      const isFP = educationalLevel === 'FP';
      const mode = appState.mode || 'UD';

      // Construir la etiqueta de la etapa según el nivel educativo. Para FP se muestra el grado, y para SEC se muestra el nivel y curso.
      const stageLabel = isFP
        ? `FP ${appState.fpGrade || 'medio'}`
        : `${appState.secLevel || 'ESO'} ${appState.secCourse || '1'}º`;

      // Obtener la etiqueta de la materia seleccionada, intentando obtenerla del DOM para reflejar cualquier cambio dinámico, y si no está disponible, usar el estado de la aplicación. Si no se encuentra ninguna etiqueta, se establece como 'Sin seleccionar'.
      const subjectLabel = document.getElementById('selectedModuleName')?.textContent?.trim()
        || appState.selectedModule
        || appState.selectedSubject
        || 'Sin seleccionar';

      return {
        educationalLevel,
        mode,
        stageLabel,
        subjectLabel,
        appState
      };
    }

    /**
     * Valida si la respuesta del proveedor cumple con el contrato esperado.
     * @param {*} parsed La respuesta parseada del proveedor de IA.
     * @param {*} providerId El identificador del proveedor de IA.
     * @returns {Object} Un objeto que indica si la respuesta es sincronizable, la razón en caso contrario y el payload a utilizar.
     */
    validateContractPayload(parsed, providerId) {
      const fallback = {
        meta: { provider: providerId, response_type: 'fallback' },
        chat_display: {
          title: 'Respuesta no sincronizable',
          summary_markdown: '',
          mermaid: []
        },
        design_sync: {}
      };

      // Validar que la respuesta parseada es un objeto y no un array ni otro tipo de dato. Si no es un objeto válido, se considera que no cumple con el contrato.
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {
          isSyncable: false,
          reason: 'La respuesta no contiene un JSON válido.',
          payload: fallback
        };
      }

      const hasMeta = parsed.meta && typeof parsed.meta === 'object' && !Array.isArray(parsed.meta);
      const hasChatDisplay = parsed.chat_display && typeof parsed.chat_display === 'object' && !Array.isArray(parsed.chat_display);
      const hasDesignSync = Object.prototype.hasOwnProperty.call(parsed, 'design_sync')
        && parsed.design_sync && typeof parsed.design_sync === 'object' && !Array.isArray(parsed.design_sync);

        // Validar que se cumplen las claves obligatorias del contrato: meta, chat_display y design_sync. Si falta alguna de estas claves o no tienen la estructura esperada, se considera que la respuesta no cumple con el contrato de sincronización.
      if (!hasMeta || !hasChatDisplay || !hasDesignSync) {
        return {
          isSyncable: false,
          reason: 'Faltan claves obligatorias del contrato (meta, chat_display o design_sync).',
          payload: {
            ...fallback,
            chat_display: {
              ...fallback.chat_display,
              title: parsed?.chat_display?.title || fallback.chat_display.title,
              summary_markdown: parsed?.chat_display?.summary_markdown || ''
            }
          }
        };
      }

      // Validar que meta.provider y meta.response_type son cadenas de texto. Si no cumplen con este formato, se considera que la respuesta no cumple con el contrato de sincronización.
      const summary = typeof parsed.chat_display.summary_markdown === 'string'
        ? parsed.chat_display.summary_markdown
        : '';

        // Validar que chat_display.mermaid es un array de strings. Si no cumple con este formato, se establece como un array vacío para evitar errores posteriores al intentar procesar el mermaid.
      const mermaid = Array.isArray(parsed.chat_display.mermaid)
        ? parsed.chat_display.mermaid.filter(Boolean)
        : [];

      return {
        isSyncable: true,
        reason: '',
        payload: {
          meta: {
            provider: parsed.meta.provider || providerId,
            response_type: parsed.meta.response_type || 'design_update'
          },
          chat_display: {
            title: parsed.chat_display.title || `Respuesta de ${this.config.providerNames[providerId] || providerId}`,
            summary_markdown: summary,
            mermaid
          },
          design_sync: parsed.design_sync
        }
      };
    }

    /**
     * Construye y devuelve el contexto de ejecución basado en el estado actual de la aplicación.
     * @param {Object} param0 Los parámetros para construir el contexto.
     * @param {string} param0.providerId El identificador del proveedor de IA.
     * @param {string} param0.userText El texto ingresado por el usuario.
     * @param {Object} param0.schema El esquema de datos.
     * @param {Object} param0.conversationState El estado de la conversación.
     * @param {string} param0.mode El modo de la conversación.
     * @param {number} param0.maxRecentMessages El número máximo de mensajes recientes.
     * @returns {Object} Un objeto que contiene el contexto de ejecución.
     */
    async build({ providerId, userText, schema, conversationState, mode, maxRecentMessages }) {
      const designState = window.sessionStorageManager?.exportStateForAI?.() || null;
      const lockStatus = designState?._lockStatus || {};
      const curricularKnowledge = await this.buildCurricularKnowledge();
      const generalKnowledge = this.buildGeneralKnowledge();
      const selectedContextSummary = this.buildSelectedContextSummary(curricularKnowledge);
      const conversationMemory = this.buildConversationMemory(conversationState, mode, maxRecentMessages);

      return {
        providerId,
        userText,
        schema,
        designState,
        lockStatus,
        curricularKnowledge,
        generalKnowledge,
        selectedContextSummary,
        conversationMemory,
        conversationMode: mode
      };
    }

    /**
     * Construye y devuelve el conocimiento general basado en el estado actual de la aplicación.
     * @returns {string} Un bloque de texto que contiene el conocimiento general.
     */
    buildGeneralKnowledge() {
      const appState = window.AppStore?.getState?.() || {};
      const isSEC = appState.educationalLevel === 'SEC';
      const state = window.sessionStorageManager?.getState?.() || {};

      const selectedMetodologias = state?.metodologia?.metodologias_aplicadas || [];
      const selectedODS = state?.contextualizacion?.ods?.valor || [];
      const selectedRetos = state?.contextualizacion?.retos_xxi?.valor || [];

      const blocks = [];

      // Extraer y formatear los conocimientos generales disponibles desde la caché, incluyendo taxonomía de Bloom, inteligencias múltiples, soft skills, metodologías, ODS y retos del siglo XXI. Cada bloque de conocimiento se formatea como un texto separado para facilitar su inclusión en el contexto enviado al proveedor de IA.
      if (this.knowledgeCache.bloom) {
        const bloomSummary = extractBloomLevels(this.knowledgeCache.bloom);
        if (bloomSummary.length) {
          blocks.push(`TAXONOMIA BLOOM DISPONIBLE:\n${compactJson(bloomSummary, 2600)}`);
        }
      }

      // Para las inteligencias múltiples, se extraen y formatean de manera similar, pero con un límite de caracteres más bajo para asegurar que el bloque de conocimiento no sea demasiado extenso para el contexto.
      if (this.knowledgeCache.gardner) {
        const intelligencesSummary = extractGardnerIntelligences(this.knowledgeCache.gardner);
        if (intelligencesSummary.length) {
          blocks.push(`INTELIGENCIAS MULTIPLES DISPONIBLES:\n${compactJson(intelligencesSummary, 3200)}`);
        }
      }

      // Para las soft skills, se extraen y formatean de manera similar, con un límite de caracteres específico para asegurar que el bloque de conocimiento sea conciso y relevante para el contexto.
      if (this.knowledgeCache.softskills) {
        const softSkillsSummary = extractSoftSkillsSummary(this.knowledgeCache.softskills);
        if (softSkillsSummary.length) {
          blocks.push(`SOFT SKILLS DISPONIBLES:\n${compactJson(softSkillsSummary, 2200)}`);
        }
      }

      // Para las metodologías, se incluyen directamente desde la caché si hay metodologías seleccionadas, con un límite de caracteres para asegurar que el bloque de conocimiento sea manejable dentro del contexto.
      if (selectedMetodologias.length && this.knowledgeCache.metodologias) {
        blocks.push(`METODOLOGIAS SELECCIONADAS:\n${compactJson(selectedMetodologias, 2200)}`);
      }

      // Para los ODS y retos del siglo XXI, se incluyen directamente desde el estado si hay elementos seleccionados, con un límite de caracteres para asegurar que cada bloque de conocimiento sea manejable dentro del contexto.
      if (selectedODS.length) {
        blocks.push(`ODS SELECCIONADOS:\n${compactJson(selectedODS, 1800)}`);
      }

      // Para los retos del siglo XXI, se incluyen directamente desde el estado si hay elementos seleccionados, con un límite de caracteres para asegurar que el bloque de conocimiento sea manejable dentro del contexto.
      if (selectedRetos.length) {
        blocks.push(`RETOS SIGLO XXI SELECCIONADOS:\n${compactJson(selectedRetos, 1800)}`);
      }

      // Para el nivel SEC, se incluyen las competencias clave y los objetivos de etapa disponibles desde la caché, con límites de caracteres específicos para asegurar que cada bloque de conocimiento sea manejable dentro del contexto.
      if (isSEC) {
        if (this.knowledgeCache.competenciasClave) {
          blocks.push(`COMPETENCIAS CLAVE:\n${limitText(this.knowledgeCache.competenciasClave, 2400)}`);
        }
        if (this.knowledgeCache.objetivosEtapa) {
          blocks.push(`OBJETIVOS DE ETAPA:\n${compactJson(extractObjetivosEtapa(this.knowledgeCache.objetivosEtapa, appState.secLevel), 2200)}`);
        }
      }

      return blocks.filter(Boolean).join('\n\n');
    }

    /**
     * Construye y devuelve el conocimiento curricular basado en el estado actual de la aplicación.
     * @returns {Promise<Object>} Un objeto que contiene el conocimiento curricular.
     */
    async buildCurricularKnowledge() {
      const appState = window.AppStore?.getState?.() || {};
      const isFP = appState.educationalLevel !== 'SEC';
      const state = window.sessionStorageManager?.getState?.() || {};
      const moduleData = await this.resolveSelectedCurricularData(appState);

      if (isFP) {
        return {
          type: 'FP',
          title: moduleData?.titulo_modulo || '',
          seleccion: {
            ra_ce: state?.elementos_curriculares || [],
            contenidos: (state?.elementos_curriculares || []).flatMap(block =>
              Array.isArray(block?.ras)
                ? block.ras.flatMap(ra => Array.isArray(ra?.ra_contenidos) ? ra.ra_contenidos : [])
                : []
            ),
            metodologias: state?.metodologia?.metodologias_aplicadas || [],
            ods: state?.contextualizacion?.ods?.valor || [],
            retos_xxi: state?.contextualizacion?.retos_xxi?.valor || [],
            objetivos_generales: state?.contextualizacion?.para_fp?.objetivos_generales?.valor || [],
            competencias_profesionales: state?.contextualizacion?.para_fp?.competencias_profesionales?.valor || []
          }
        };
      }

      const competenciasSeleccionadas = moduleData?.competencias_especificas || moduleData?.competenciasEspecificas || [];
      const cursoSec = appState.secCourse || appState.selectedSecCourse || '1';

      return {
        type: 'SEC',
        title: moduleData?.asignatura || moduleData?.titulo || moduleData?.nombre_asignatura || '',
        seleccion: {
          competencias_especificas: competenciasSeleccionadas,
          criterios_evaluacion: competenciasSeleccionadas.map(comp => ({
            competencia_id: comp.id,
            titulo: comp.titulo,
            criterios: cursoSec === '4'
              ? (comp?.criterios_evaluacion?.['4_ESO'] || [])
              : (comp?.criterios_evaluacion?.['1_3_ESO'] || [])
          })),
          metodologias: state?.metodologia?.metodologias_aplicadas || [],
          ods: state?.contextualizacion?.ods?.valor || [],
          retos_xxi: state?.contextualizacion?.retos_xxi?.valor || []
        }
      };
    }

    /**
     * Resuelve y devuelve los datos curriculares seleccionados basados en el estado de la aplicación.
     * @param {Object} appState - El estado actual de la aplicación.
     * @returns {Promise<Object>} Un objeto que contiene los datos curriculares seleccionados.
     */
    async resolveSelectedCurricularData(appState) {
      if (window.contextManager?.currentEducationLevel === 'FP' || appState.educationalLevel === 'FP') {
        const moduleId = window.contextManager?.currentModule || appState.selectedModule;
        const community = window.contextManager?.currentCommunity || appState.community || 'aragon';
        if (!moduleId) return {};

        const path = `data/${community}/fp/modulos/${moduleId}.json`;
        return await safeFetchJson(path, {});
      }

      const subjectFile = window.contextManager?.currentSubject || appState.selectedSubject;
      if (!subjectFile) return {};
      return await safeFetchJson(`data/${subjectFile}`, {});
    }

    /**
     * Construye y devuelve la memoria de la conversación basada en el estado actual de la conversación.
     * @param {Object} conversationState - El estado actual de la conversación.
     * @param {string} mode - El modo de construcción de la memoria ('clean' o 'full').
     * @param {number} maxRecentMessages - El número máximo de mensajes recientes a incluir.
     * @returns {Object} Un objeto que contiene la memoria de la conversación.
     */
    buildConversationMemory(conversationState, mode, maxRecentMessages) {
      const messages = Array.isArray(conversationState?.messages) ? conversationState.messages : [];
      if (mode === 'clean') {
        return {
          mode,
          summary: conversationState?.summary || '',
          recentMessages: []
        };
      }

      return {
        mode,
        summary: conversationState?.summary || '',
        recentMessages: messages.slice(-maxRecentMessages)
      };
    }

    /**
     * Construye y devuelve un resumen del contexto seleccionado basado en el conocimiento curricular.
     * @param {Object} curricularKnowledge - El conocimiento curricular seleccionado.
     * @returns {string} Un resumen del contexto seleccionado.
     */
    buildSelectedContextSummary(curricularKnowledge) {
      const selection = curricularKnowledge?.seleccion || {};
      const blocks = [];

      if (curricularKnowledge?.type === 'FP') {
        const raRows = Array.isArray(selection.ra_ce) ? selection.ra_ce : [];
        const raSummary = raRows
          .map(row => row?.ras?.[0])
          .filter(Boolean)
          .map(ra => `${ra.ra_id || 'RA'}: ${truncate(ra.ra_descripcion || '', 140)} | CE: ${Array.isArray(ra.ra_ce) ? ra.ra_ce.length : 0}`)
          .slice(0, 12);

        if (raSummary.length) blocks.push(`RA/CE SELECCIONADOS:\n- ${raSummary.join('\n- ')}`);

        // Para FP, se extraen y formatean los contenidos seleccionados de manera similar
        const contenidos = Array.isArray(selection.contenidos) ? selection.contenidos : [];
        if (contenidos.length) {
          blocks.push(`CONTENIDOS SELECCIONADOS:\n- ${contenidos.map(item => `${item.bloque_id || ''} ${truncate(item.bloque_descripcion || '', 120)}`).slice(0, 12).join('\n- ')}`);
        }

        // Para FP, se extraen y formatean los objetivos generales seleccionados de manera similar
        const objetivosGenerales = Array.isArray(selection.objetivos_generales) ? selection.objetivos_generales : [];
        if (objetivosGenerales.length) {
          blocks.push(`OBJETIVOS GENERALES SELECCIONADOS:\n- ${objetivosGenerales.map(item => `${item.obg_id || ''} ${truncate(item.obg_descripcion || '', 140)}`).slice(0, 12).join('\n- ')}`);
        }

        // Para FP, se extraen y formatean las competencias profesionales seleccionadas de manera similar
        const competenciasProfesionales = Array.isArray(selection.competencias_profesionales) ? selection.competencias_profesionales : [];
        if (competenciasProfesionales.length) {
          blocks.push(`CPPS SELECCIONADAS:\n- ${competenciasProfesionales.map(item => `${item.cpps_id || ''} ${truncate(item.cpps_descripcion || '', 140)}`).slice(0, 12).join('\n- ')}`);
        }
      }

      // Para SEC, se extraen y formatean las competencias específicas seleccionadas de manera similar
      const metodologias = Array.isArray(selection.metodologias) ? selection.metodologias : [];
      if (metodologias.length) {
        blocks.push(`METODOLOGIAS ACTIVAS:\n- ${metodologias.map(item => truncate(item.metodologia_titulo || item.metodologia_descripcion || '', 120)).slice(0, 10).join('\n- ')}`);
      }

      // Para SEC, se extraen y formatean los ODS seleccionados de manera similar
      const ods = Array.isArray(selection.ods) ? selection.ods : [];
      if (ods.length) {
        blocks.push(`ODS ACTIVOS:\n- ${ods.map(item => `ODS ${item.ods_numer || ''}: ${truncate(item.ods_descripcion || '', 120)}`).slice(0, 10).join('\n- ')}`);
      }

      // Para SEC, se extraen y formatean los retos del siglo XXI seleccionados de manera similar
      const retos = Array.isArray(selection.retos_xxi) ? selection.retos_xxi : [];
      if (retos.length) {
        blocks.push(`RETOS SIGLO XXI ACTIVOS:\n- ${retos.map(item => `${item.reto_id || ''} ${truncate(item.reto_titulo || item.reto_descripcion || '', 120)}`).slice(0, 10).join('\n- ')}`);
      }

      return blocks.join('\n\n');
    }
  }

  /**
   * ConversationManager: Clase encargada de gestionar el estado de las conversaciones con los proveedores de IA, incluyendo el almacenamiento de mensajes, respuestas estructuradas, resúmenes y metadatos relacionados con cada proveedor. Proporciona métodos para registrar cada turno de la conversación, obtener el estado actual de la conversación para un proveedor específico, cambiar el modo de la conversación (limpia o continua) y limpiar la conversación para un proveedor determinado. El estado de la conversación se almacena en el almacenamiento local del navegador utilizando una clave específica configurada en la aplicación, lo que permite que el estado persista entre sesiones y se recupere fácilmente cuando sea necesario. Esta clase abstrae la complejidad de gestionar el estado de las conversaciones con múltiples proveedores de IA, proporcionando una interfaz sencilla para registrar y acceder a la información relevante de cada interacción.
   * El estado de la conversación para cada proveedor incluye el ID de la conversación, el ID de la respuesta anterior, los mensajes intercambiados (con roles de usuario y asistente), un resumen de la conversación, la última respuesta estructurada, la última respuesta que cumple con el contrato de sincronización, la última respuesta para mostrar en el chat, metadatos del proveedor y metadatos de la última normalización realizada. Esta estructura permite un seguimiento detallado de cada interacción con los proveedores de IA y facilita la generación de respuestas relevantes y adaptadas al contexto de la conversación.
   */
  class ConversationManager {
    /**
     * Constructor de ConversationManager, inicializa las claves de almacenamiento para la conversación y el estado de la interfaz de usuario, y carga el estado inicial desde el almacenamiento local. Si no hay estado almacenado previamente, se inicializa con una estructura predeterminada que incluye un objeto para cada proveedor de IA configurado en la aplicación. El estado de la interfaz de usuario se inicializa con un modo predeterminado de 'continuous' si no hay un estado almacenado previamente. Esta configuración permite que el ConversationManager gestione el estado de las conversaciones con múltiples proveedores de IA y el modo de la conversación de manera persistente a través del almacenamiento local del navegador.
     * @param {*} config 
     */
    constructor(config) {
      this.storageKey = config.conversationStorageKey;
      this.uiStateKey = config.uiStateKey;
      this.state = loadJsonStorage(this.storageKey, {
        byProvider: {
          chatgpt: this.createProviderState(),
          claude: this.createProviderState(),
          gemini: this.createProviderState()
        }
      });

      this.uiState = loadJsonStorage(this.uiStateKey, { mode: 'continuous' });
    }

    /**
     * Crea un estado inicial para un proveedor de IA, incluyendo IDs de conversación y respuesta, mensajes, resúmenes y metadatos.
     * @returns {Object} Estado inicial del proveedor
     */
    createProviderState() {
      return {
        conversationId: null,
        previousResponseId: null,
        messages: [],
        summary: '',
        lastStructuredAnswer: null,
        lastSyncableAnswer: null,
        lastDisplayAnswer: null,
        providerMeta: null,
        lastNormalization: null
      };
    }

    /**
     * Obtiene el estado actual de la conversación, incluyendo los mensajes intercambiados, resúmenes y respuestas relacionadas con cada proveedor de IA. El estado se devuelve como una copia profunda para evitar modificaciones accidentales desde fuera de la clase.
     * @returns {Object} Estado actual de la conversación
     */
    getState() {
      return JSON.parse(JSON.stringify(this.state));
    }

    /**
     * Obtiene el modo actual de la conversación, que puede ser 'clean' o 'continuous', dependiendo de la configuración almacenada en el estado de la interfaz de usuario. Si no hay un modo almacenado previamente, se devuelve 'continuous' como valor predeterminado.
     * @returns {string} Modo actual de la conversación
     */
    getMode() {
      return this.uiState.mode || 'continuous';
    }

    /**
     * Establece el modo de la conversación, que puede ser 'clean' o 'continuous'. Si se proporciona un valor no válido, se establece 'continuous' como valor predeterminado.
     * @param {string} mode Modo de la conversación
     */
    setMode(mode) {
      this.uiState.mode = mode === 'clean' ? 'clean' : 'continuous';
      saveJsonStorage(this.uiStateKey, this.uiState);
    }

    /**
     * Obtiene el estado de un proveedor de IA específico. Si el proveedor no tiene un estado existente, se crea uno nuevo.
     * @param {string} providerId ID del proveedor de IA
     * @returns {Object} Estado del proveedor de IA
     */
    getProviderState(providerId) {
      if (!this.state.byProvider[providerId]) {
        this.state.byProvider[providerId] = this.createProviderState();
      }
      return this.state.byProvider[providerId];
    }

    /**
     * Registra un turno de conversación, incluyendo el texto del usuario, las respuestas del asistente y los metadatos del proveedor.
     * @param {Object} param0 Parámetros del turno de conversación
     * @param {string} param0.providerId ID del proveedor de IA
     * @param {string} param0.userText Texto del usuario
     * @param {Object} param0.assistantDisplay Respuesta del asistente para mostrar
     * @param {Object} param0.assistantStructured Respuesta estructurada del asistente
     * @param {Object} param0.providerMeta Metadatos del proveedor
     * @param {Object} param0.normalizationMeta Metadatos de normalización
     */
    registerTurn({ providerId, userText, assistantDisplay, assistantStructured, providerMeta, normalizationMeta }) {
      const entry = this.getProviderState(providerId);
      entry.messages.push({ role: 'user', content: userText, ts: Date.now() });
      entry.messages.push({ role: 'assistant', content: assistantDisplay?.summaryMarkdown || '', ts: Date.now() });
      entry.lastStructuredAnswer = assistantStructured;
      entry.lastSyncableAnswer = normalizationMeta?.isSyncable ? assistantStructured : null;
      entry.lastDisplayAnswer = assistantDisplay;
      entry.providerMeta = providerMeta || null;
      entry.lastNormalization = normalizationMeta || null;
      entry.previousResponseId = providerMeta?.previousResponseId || entry.previousResponseId || null;
      entry.conversationId = providerMeta?.conversationId || entry.conversationId || null;
      entry.summary = summarizeMessages(entry.messages);

      saveJsonStorage(this.storageKey, this.state);
    }

    /**
     * Limpia el estado de un proveedor de IA específico, restableciendo su estado a uno nuevo.
     * @param {string} providerId ID del proveedor de IA
     */
    clear(providerId) {
      this.state.byProvider[providerId] = this.createProviderState();
      saveJsonStorage(this.storageKey, this.state);
    }
  }

  /**
   * ProviderRegistry: Clase encargada de registrar y gestionar los proveedores de IA disponibles en la aplicación, proporcionando una interfaz para obtener el proveedor correspondiente según su ID. En este caso, se registran tres proveedores: ChatGPT, Claude y Gemini, cada uno implementado como una clase que extiende de BaseProvider. La clase BaseProvider proporciona métodos comunes para realizar solicitudes HTTP y extraer JSON de las respuestas, mientras que cada proveedor específico implementa su propia lógica para enviar solicitudes y procesar respuestas según las características de su API. El ProviderRegistry permite abstraer la gestión de múltiples proveedores de IA y facilita la integración de nuevos proveedores en el futuro si es necesario.
   * Cada proveedor implementa un método send que toma como parámetros la clave de API, el modelo a utilizar, el paquete de prompts, el estado de la conversación, el modo de la conversación y un tiempo de espera opcional. El método send realiza la solicitud al proveedor de IA correspondiente, procesa la respuesta y devuelve un objeto que incluye el texto original, el JSON extraído y cualquier metadato relevante para la conversación. Esta estructura permite que cada proveedor maneje sus propias peculiaridades en cuanto a formato de solicitud y respuesta, mientras que el resto de la aplicación puede interactuar con ellos de manera uniforme a través del ProviderRegistry.
   */
  class ProviderRegistry {
    /**
     * Constructor de ProviderRegistry, inicializa los proveedores de IA disponibles en la aplicación utilizando la configuración proporcionada. Cada proveedor se instancia con la configuración necesaria para realizar solicitudes a su API correspondiente. En este caso, se crean instancias de ChatGPTProvider, ClaudeProvider y GeminiProvider, cada una configurada con los parámetros necesarios para su funcionamiento. El ProviderRegistry almacena estas instancias en un objeto interno, lo que permite que otros componentes de la aplicación puedan obtener el proveedor correspondiente según su ID de manera sencilla y uniforme.
     * @param {*} config 
     */
    constructor(config) {
      this.providers = {
        chatgpt: new ChatGPTProvider(config),
        claude: new ClaudeProvider(config),
        gemini: new GeminiProvider(config)
      };
    }

    /**
     * Obtiene el proveedor de IA correspondiente según su ID. Si el ID no corresponde a ningún proveedor registrado, se devuelve null. Este método permite que otros componentes de la aplicación puedan acceder al proveedor de IA que necesitan para realizar solicitudes y procesar respuestas, sin tener que preocuparse por la implementación específica de cada proveedor.
     * @param {string} providerId ID del proveedor de IA
     * @returns {BaseProvider|null} Instancia del proveedor de IA o null si no se encuentra
     */
    get(providerId) {
      return this.providers[providerId] || null;
    }
  }

  /**
   * BaseProvider: Clase base para los proveedores de IA, proporcionando métodos comunes para realizar solicitudes HTTP y extraer JSON de las respuestas. Cada proveedor específico extiende de esta clase e implementa su propia lógica para enviar solicitudes y procesar respuestas según las características de su API.
   */
  class BaseProvider {
    /**
     * Constructor de BaseProvider, inicializa la configuración del proveedor de IA.
     * @param {*} config Configuración del proveedor de IA
     */
    constructor(config) {
      this.config = config;
    }

    /**
     * Realiza una solicitud HTTP a la URL especificada con las opciones proporcionadas y un tiempo de espera opcional. Utiliza AbortController para manejar el tiempo de espera, abortando la solicitud si se excede el tiempo límite. Si la respuesta no es exitosa (código de estado HTTP no en el rango 200-299), se lanza un error con un mensaje descriptivo que puede incluir información del cuerpo de la respuesta si está disponible. Si la respuesta es exitosa, se devuelve el cuerpo de la respuesta parseado como JSON. Este método proporciona una forma común de realizar solicitudes HTTP para los proveedores de IA, manejando tanto el tiempo de espera como los errores de manera consistente.
     * @param {*} url 
     * @param {*} options 
     * @param {*} timeoutMs 
     * @returns {Promise<Object>} Promesa que se resuelve con el JSON de la respuesta
     */
    async fetchJson(url, options, timeoutMs) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs || this.config.providerTimeoutMs);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message = data?.error?.message || data?.error?.details || data?.message || JSON.stringify(data) || `HTTP ${response.status}`;
          throw new Error(message);
        }
        return data;
      } finally {
        clearTimeout(timeout);
      }
    }

    /**
     * Extrae un objeto JSON de un texto dado. Intenta limpiar el texto de posibles delimitadores de código y luego busca candidatos de JSON balanceados. Devuelve el primer JSON válido que encuentra o null si no se encuentra ninguno.
     * @param {string} text Texto del cual extraer el JSON
     * @returns {Object|null} Objeto JSON extraído o null si no se encuentra
     */
    extractJson(text) {
      if (!text) return null;
      const raw = String(text).trim();
      const stripped = raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();

      const candidates = [];
      const pushCandidate = (value) => {
        const candidate = String(value || '').trim();
        if (candidate && !candidates.includes(candidate)) {
          candidates.push(candidate);
        }
      };

      pushCandidate(stripped);

      const balanced = this.extractBalancedJsonCandidates(stripped);
      balanced.forEach(pushCandidate);

      for (const candidate of candidates) {
        try {
          return JSON.parse(candidate);
        } catch (_) { }
      }
      return null;
    }

    /**
     * Extrae candidatos de JSON balanceados de un texto dado. Busca objetos JSON completos dentro del texto y devuelve una lista de cadenas JSON válidas.
     * @param {string} text Texto del cual extraer los candidatos de JSON balanceados
     * @returns {string[]} Lista de cadenas JSON balanceadas
     */
    extractBalancedJsonCandidates(text) {
      const results = [];
      const seen = new Set();
      const source = String(text || '');

      for (let start = 0; start < source.length; start++) {
        if (source[start] !== '{') continue;

        let depth = 0;
        let inString = false;
        let escaped = false;

        for (let i = start; i < source.length; i++) {
          const ch = source[i];

          if (inString) {
            if (escaped) {
              escaped = false;
            } else if (ch === '\\') {
              escaped = true;
            } else if (ch === '"') {
              inString = false;
            }
            continue;
          }

          if (ch === '"') {
            inString = true;
            continue;
          }

          if (ch === '{') depth += 1;
          if (ch === '}') depth -= 1;

          if (depth === 0) {
            const candidate = source.slice(start, i + 1).trim();
            if (candidate && !seen.has(candidate)) {
              seen.add(candidate);
              results.push(candidate);
            }
            break;
          }
        }
      }

      return results.sort((a, b) => b.length - a.length);
    }
  }

  /**
   * Proveedor de IA utilizando el modelo ChatGPT de OpenAI.
   * Implementa el método send para enviar solicitudes a la API de OpenAI, procesar las respuestas y extraer el texto y JSON relevantes para la conversación. 
   */
  class ChatGPTProvider extends BaseProvider {
    /**
     * Envía una solicitud a la API de OpenAI y procesa la respuesta.
     * @param {Object} param0 Parámetros para la solicitud
     * @param {string} param0.apiKey Clave de API de OpenAI
     * @param {string} param0.model Modelo de OpenAI a utilizar
     * @param {Object} param0.promptPack Paquete de instrucciones y mensaje del usuario
     * @param {Object} param0.conversationState Estado de la conversación
     * @param {string} param0.mode Modo de la conversación ('continuous' o 'clean')
     * @param {number} param0.timeoutMs Tiempo de espera en milisegundos
     * @returns {Promise<Object>} Promesa que se resuelve con el JSON de la respuesta
     */
    async send({ apiKey, model, promptPack, conversationState, mode, timeoutMs }) {
      const body = {
        model,
        instructions: promptPack.instructions,
        input: promptPack.userMessage,
        store: true,
        truncation: 'auto',
        temperature: 0.3,
        max_output_tokens: 8192
      };

      if (mode === 'continuous' && conversationState?.previousResponseId) {
        body.previous_response_id = conversationState.previousResponseId;
      }

      // Realiza la solicitud a la API de OpenAI utilizando el método fetchJson heredado de BaseProvider, pasando la URL, las opciones de la solicitud (incluyendo los encabezados y el cuerpo) y el tiempo de espera. Luego, procesa la respuesta para extraer el texto relevante utilizando la función extractOpenAIText y devuelve un objeto que incluye el texto original, el JSON extraído y cualquier metadato relevante para la conversación.
      const data = await this.fetchJson('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
      }, timeoutMs);

      // La función extractOpenAIText se encarga de extraer el texto relevante de la respuesta de OpenAI, manejando diferentes formatos de respuesta que la API puede devolver. El texto extraído se utiliza para generar el JSON que se espera en la conversación, y también se incluye en el objeto de respuesta para mostrarlo en el chat.
      const text = extractOpenAIText(data);
      return {
        provider: 'chatgpt',
        raw: data,
        text,
        json: this.extractJson(text),
        providerMeta: {
          previousResponseId: data?.id || null,
          conversationId: data?.conversation || null,
          usage: data?.usage || null
        }
      };
    }
  }

  /**
   * Proveedor de IA utilizando el modelo Claude de Anthropic.
   * Implementa el método send para enviar solicitudes a la API de Anthropic, procesar las respuestas y extraer el texto y JSON relevantes para la conversación.
   */
  class ClaudeProvider extends BaseProvider {
    /**
     * Envía una solicitud a la API de Anthropic y procesa la respuesta.
     * @param {Object} param0 Parámetros para la solicitud
     * @param {string} param0.apiKey Clave de API de Anthropic
     * @param {string} param0.model Modelo de Anthropic a utilizar
     * @param {Object} param0.promptPack Paquete de instrucciones y mensaje del usuario
     * @param {Object} param0.conversationState Estado de la conversación
     * @param {string} param0.mode Modo de la conversación ('continuous' o 'clean')
     * @param {number} param0.timeoutMs Tiempo de espera en milisegundos
     * @returns {Promise<Object>} Promesa que se resuelve con el JSON de la respuesta
     */
    async send({ apiKey, model, promptPack, conversationState, mode, timeoutMs }) {
      const messages = [];

      if (mode === 'continuous' && Array.isArray(conversationState?.messages)) {
        const recent = conversationState.messages.slice(-6).map(item => ({
          role: item.role === 'assistant' ? 'assistant' : 'user',
          content: item.content
        }));
        messages.push(...recent);
      }

      // Combina el mensaje del usuario con las instrucciones para asegurarse de que la respuesta se ajuste al formato esperado, indicando claramente que la respuesta debe ser exclusivamente JSON válido. Esto ayuda a guiar al modelo de IA para que genere una respuesta que cumpla con el contrato requerido, facilitando la extracción del JSON posteriormente.
      const combinedPrompt = `${promptPack.userMessage}\n\nResponde exclusivamente con JSON válido siguiendo el contrato pedido. Tu respuesta debe comenzar por "{" y terminar por "}". No añadas explicaciones fuera del JSON.`;
      messages.push({ role: 'user', content: combinedPrompt });

      const body = {
        model,
        system: promptPack.instructions,
        max_tokens: 8192,
        temperature: 0,
        messages
      };

      // Realiza la solicitud a la API de Anthropic utilizando el método fetchJson heredado de BaseProvider, pasando la URL, las opciones de la solicitud (incluyendo los encabezados y el cuerpo) y el tiempo de espera. Luego, procesa la respuesta para extraer el texto relevante, que puede estar en diferentes formatos dependiendo de cómo Anthropic devuelva la respuesta. El texto extraído se utiliza para generar el JSON que se espera en la conversación, y también se incluye en el objeto de respuesta para mostrarlo en el chat.
      const data = await this.fetchJson('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify(body)
      }, timeoutMs);

      const text = Array.isArray(data?.content)
        ? data.content.filter(x => x.type === 'text').map(x => x.text).join('\n')
        : '';

      return {
        provider: 'claude',
        raw: data,
        text,
        json: this.extractJson(text),
        providerMeta: {
          conversationId: null,
          previousResponseId: data?.id || null,
          usage: data?.usage || null
        }
      };
    }
  }

  /**
   * Proveedor de IA utilizando el modelo Gemini de Google.
   * Implementa el método send para enviar solicitudes a la API de Google Generative Language, procesar las respuestas y extraer el texto y JSON relevantes para la conversación.
    * Este proveedor maneja la construcción de la solicitud de manera específica para la API de Google, incluyendo la estructura de los mensajes y las instrucciones para asegurar que la respuesta se ajuste al formato esperado. La respuesta se procesa para extraer el texto relevante, que puede estar en diferentes formatos dependiendo de cómo Google devuelva la respuesta. El texto extraído se utiliza para generar el JSON que se espera en la conversación, y también se incluye en el objeto de respuesta para mostrarlo en el chat.
     * @param {Object} param0 Parámetros para la solicitud
     * @param {string} param0.apiKey Clave de API de Google
     * @param {string} param0.model Modelo de Google a utilizar
     * @param {Object} param0.promptPack Paquete de instrucciones y mensaje del usuario
     * @param {Object} param0.conversationState Estado de la conversación
     * @param {string} param0.mode Modo de la conversación ('continuous' o 'clean')
     * @param {number} param0.timeoutMs Tiempo de espera en milisegundos
     * @returns {Promise<Object>} Promesa que se resuelve con el JSON de la respuesta
   */
  class GeminiProvider extends BaseProvider {
    /**
     * Envía una solicitud a la API de Google Generative Language y procesa la respuesta.
     * @param {Object} param0 Parámetros para la solicitud
     * @param {string} param0.apiKey Clave de API de Google
     * @param {string} param0.model Modelo de Google a utilizar
     * @param {Object} param0.promptPack Paquete de instrucciones y mensaje del usuario
     * @param {Object} param0.conversationState Estado de la conversación
     * @param {string} param0.mode Modo de la conversación ('continuous' o 'clean')
     * @param {number} param0.timeoutMs Tiempo de espera en milisegundos
     * @returns {Promise<Object>} Promesa que se resuelve con el JSON de la respuesta
     */
    async send({ apiKey, model, promptPack, conversationState, mode, timeoutMs }) {
      const contents = [];

      // Si el modo de la conversación es 'continuous' y hay mensajes previos en el estado de la conversación, se incluyen los últimos 6 mensajes (alternando entre usuario y asistente) en la solicitud para proporcionar contexto adicional al modelo de IA. Esto ayuda a que el modelo genere respuestas más coherentes y relevantes basadas en la historia de la conversación, aunque se limita a los mensajes más recientes para evitar exceder los límites de tokens de la API.
      if (mode === 'continuous' && Array.isArray(conversationState?.messages)) {
        conversationState.messages.slice(-6).forEach(item => {
          contents.push({
            role: item.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: item.content }]
          });
        });
      }

      // Combina el mensaje del usuario con las instrucciones para asegurarse de que la respuesta se ajuste al formato esperado, indicando claramente que la respuesta debe ser exclusivamente JSON válido. Esto ayuda a guiar al modelo de IA para que genere una respuesta que cumpla con el contrato requerido, facilitando la extracción del JSON posteriormente.
      contents.push({
        role: 'user',
        parts: [{
          text: `${promptPack.userMessage}\n\nResponde exclusivamente con JSON válido siguiendo el contrato. Tu respuesta debe comenzar por "{" y terminar por "}". No añadas texto fuera del JSON.`
        }]
      });

      // Construye el cuerpo de la solicitud para la API de Google Generative Language, incluyendo las instrucciones del sistema, los contenidos (mensajes) y la configuración de generación como la temperatura y el número máximo de tokens de salida. La estructura del cuerpo se ajusta a los requisitos de la API de Google, asegurando que se proporcionen las instrucciones y el contexto necesarios para que el modelo genere una respuesta adecuada.
      const body = {
        systemInstruction: { parts: [{ text: promptPack.instructions }] },
        contents,
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192
        }
      };

      // Realiza la solicitud a la API de Google Generative Language utilizando el método fetchJson heredado de BaseProvider, pasando la URL (con el modelo y la clave de API), las opciones de la solicitud (incluyendo los encabezados y el cuerpo) y el tiempo de espera. Luego, procesa la respuesta para extraer el texto relevante, que puede estar en diferentes formatos dependiendo de cómo Google devuelva la respuesta. El texto extraído se utiliza para generar el JSON que se espera en la conversación, y también se incluye en el objeto de respuesta para mostrarlo en el chat.
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const data = await this.fetchJson(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }, timeoutMs);

      const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n') || '';

      return {
        provider: 'gemini',
        raw: data,
        text,
        json: this.extractJson(text),
        providerMeta: {
          conversationId: null,
          previousResponseId: null,
          usage: data?.usageMetadata || null
        }
      };
    }
  }

  /**
   * ResponseNormalizer: Clase encargada de normalizar las respuestas recibidas de los proveedores de IA, extrayendo el texto relevante, validando la estructura del JSON según un esquema definido y preparando la información para su visualización en el chat. Esta clase se encarga de manejar diferentes formatos de respuesta que los proveedores pueden devolver, asegurándose de que se extraiga el contenido relevante para mostrar al usuario y que se valide correctamente contra el contrato esperado para la sincronización de diseño. Además, proporciona mensajes de error claros cuando la respuesta no cumple con el formato esperado, lo que ayuda a guiar al usuario o al desarrollador para corregir posibles problemas con la respuesta del proveedor.
   * El método normalize toma como parámetros la respuesta cruda del proveedor, el ID del proveedor, el texto del usuario y un esquema para validar la estructura del JSON. Devuelve un objeto que incluye los metadatos del proveedor, el payload para mostrar en el chat (incluyendo el título, el resumen en Markdown y cualquier diagrama de Mermaid), el payload estructurado para la sincronización de diseño (si es válido), los metadatos de normalización y la respuesta cruda original. Este proceso de normalización permite que la aplicación maneje de manera consistente las respuestas de diferentes proveedores de IA, asegurando que se extraiga y valide correctamente la información relevante para la conversación.
   */
  class ResponseNormalizer {
    /**
     * Constructor de ResponseNormalizer, inicializa la configuración necesaria para normalizar las respuestas de los proveedores de IA.
     * @param {*} config 
     */
    constructor(config) {
      this.config = config;
    }

    /**
     * Normaliza la respuesta de un proveedor de IA, extrayendo el texto relevante, validando la estructura del JSON según un esquema definido y preparando la información para su visualización en el chat.
     * @param {*} param0 
     * @returns {Object} Objeto que incluye los metadatos del proveedor, el payload para mostrar en el chat, el payload estructurado para la sincronización de diseño, los metadatos de normalización y la respuesta cruda original.
     */
    normalize({ rawResponse, providerId, userText, schema }) {
      const parsed = rawResponse?.json;
      const normalizationMeta = validateContractPayloadShape(parsed, schema);
      const payload = this.coercePayload(parsed, rawResponse, providerId, schema);
      const designSync = normalizationMeta.isSyncable
        ? sanitizeDesignSync(payload.design_sync || {}, schema)
        : null;
      const providerLabel = this.config.providerNames[providerId] || providerId;

      const summaryMarkdown = this.resolveSummaryMarkdown(payload, rawResponse, providerLabel, normalizationMeta);

      const mermaid = Array.isArray(payload?.chat_display?.mermaid)
        ? payload.chat_display.mermaid.filter(Boolean)
        : [];

      return {
        providerMeta: rawResponse.providerMeta || {},
        displayPayload: {
          providerId,
          providerLabel,
          title: payload?.chat_display?.title || `Respuesta de ${providerLabel}`,
          summaryMarkdown,
          mermaid,
          rawText: rawResponse?.text || ''
        },
        structuredPayload: designSync,
        normalizationMeta,
        meta: payload?.meta || {},
        raw: rawResponse.raw,
        userText
      };
    }

    /**
     * Resuelve el resumen en Markdown para mostrar en el chat, manejando casos donde la respuesta puede no cumplir con el esquema esperado.
     * @param {*} payload 
     * @param {*} rawResponse 
     * @param {*} providerLabel 
     * @param {*} validation 
     * @returns {string} Resumen en Markdown para mostrar en el chat.
     */
    resolveSummaryMarkdown(payload, rawResponse, providerLabel, validation) {
      const preferred = payload?.chat_display?.summary_markdown;
      if (typeof preferred === 'string' && preferred.trim()) {
        if (!validation?.isSyncable && looksLikeJsonText(preferred)) {
          return buildContractRepairMessage(providerLabel, validation?.reason);
        }
        return preferred.trim();
      }

      const rawText = String(rawResponse?.text || '').trim();
      if (!rawText) {
        return 'Sin contenido.';
      }

      if (!validation?.isSyncable && looksLikeJsonText(rawText)) {
        return buildContractRepairMessage(providerLabel, validation?.reason);
      }

      return rawText;
    }

    /**
     * Coerce el payload recibido para asegurar que tenga la estructura esperada, proporcionando valores predeterminados en caso de que falten campos.
     * @param {*} parsed 
     * @param {*} rawResponse 
     * @param {*} providerId 
     * @param {*} schema 
     * @returns {Object} Payload normalizado con la estructura esperada.
     */
    coercePayload(parsed, rawResponse, providerId, schema) {
      const fallback = {
        meta: { provider: providerId, response_type: 'fallback' },
        chat_display: {
          title: 'Respuesta sin estructura completa',
          summary_markdown: rawResponse?.text || 'No se recibió contenido.',
          mermaid: []
        },
        design_sync: {}
      };

      // Si el JSON extraído no tiene la estructura esperada, se devuelve un payload de fallback que incluye un mensaje genérico para mostrar en el chat, indicando que la respuesta no cumple con el formato esperado. Esto asegura que la aplicación pueda manejar respuestas inesperadas de manera robusta, proporcionando al usuario información útil sobre lo que salió mal sin romper la experiencia de usuario.
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return fallback;
      }

      // Si el JSON extraído tiene las claves principales del contrato (meta, chat_display o design_sync), se intenta coerce cada una de ellas para asegurar que tengan la estructura esperada. Si alguna de las claves falta o no tiene el formato correcto, se proporciona un valor predeterminado para esa clave, pero se mantiene cualquier información válida que pueda estar presente en el JSON. Esto permite que la aplicación maneje respuestas parcialmente correctas de manera flexible, mostrando la información disponible mientras se asegura de que la estructura general del payload sea consistente con lo que la aplicación espera.
      if ('design_sync' in parsed || 'chat_display' in parsed || 'meta' in parsed) {
        return {
          meta: parsed.meta || fallback.meta,
          chat_display: parsed.chat_display || fallback.chat_display,
          design_sync: this.coerceDesignSync(parsed.design_sync, schema)
        };
      }

      // Si el JSON extraído no tiene las claves principales del contrato pero parece un fragmento que podría ser parte de la sincronización de diseño (es decir, tiene claves que coinciden con el esquema esperado), se asume que todo el JSON es un fragmento de diseño y se intenta coerce como tal. Esto permite que la aplicación maneje respuestas que contienen solo la parte de sincronización de diseño sin la estructura completa del contrato, lo que puede ser útil en casos donde el modelo de IA devuelve solo una sección del JSON esperado.
      if (looksLikeSchemaFragment(parsed, schema)) {
        return {
          meta: { provider: providerId, response_type: 'design_update' },
          chat_display: {
            title: `Propuesta de ${this.config.providerNames[providerId] || providerId}`,
            summary_markdown: rawResponse?.text || 'Se ha recibido una propuesta estructurada.',
            mermaid: []
          },
          design_sync: this.coerceDesignSync(parsed, schema)
        };
      }

      return fallback;
    }

    /**
     * Coerce el valor de sincronización de diseño para asegurar que tenga la estructura esperada, proporcionando un objeto vacío en caso de que el valor sea inválido.
     * @param {*} value 
     * @param {*} schema 
     * @returns {Object} Valor de sincronización de diseño normalizado.
     */
    coerceDesignSync(value, schema) {
      if (!value) return {};
      if (typeof value === 'string') {
        try {
          value = JSON.parse(value);
        } catch (_) {
          return {};
        }
      }
      if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
      return value;
    }
  }

  /**
   * DesignSyncEngine: Clase encargada de aplicar las actualizaciones de diseño propuestas por los proveedores de IA al estado de la aplicación, utilizando un esquema para validar la estructura de las actualizaciones y asegurando que solo se apliquen cambios válidos. Esta clase interactúa con el sessionStorageManager para obtener el estado actual de la aplicación y aplicar actualizaciones parciales basadas en el payload estructurado recibido de los proveedores de IA. El método sync toma como parámetros el payload estructurado para la sincronización de diseño y un esquema para validar su estructura, y devuelve un objeto que indica si la sincronización fue exitosa o si hubo un error, proporcionando mensajes claros en caso de que el payload no cumpla con el formato esperado o si el sessionStorageManager no está disponible.
   * El proceso de sincronización implica validar el payload estructurado contra el esquema definido para asegurarse de que cumple con el contrato esperado, y luego aplicar las actualizaciones al estado de la aplicación utilizando el sessionStorageManager. Si la validación falla, se devuelve un mensaje de error que indica la razón específica por la cual el payload no es válido, lo que ayuda a guiar al usuario o al desarrollador para corregir posibles problemas con la estructura del JSON antes de intentar sincronizar nuevamente. Si el sessionStorageManager no está disponible, se devuelve un mensaje de error indicando que no se puede realizar la sincronización, lo que permite manejar este caso de manera robusta en la aplicación.
   */
  class DesignSyncEngine {
    /**
     * Aplica las actualizaciones de diseño propuestas por los proveedores de IA al estado de la aplicación, validando la estructura del payload contra un esquema definido y utilizando el sessionStorageManager para aplicar cambios parciales al estado. Devuelve un objeto que indica si la sincronización fue exitosa o si hubo un error, proporcionando mensajes claros en caso de que el payload no cumpla con el formato esperado o si el sessionStorageManager no está disponible.
     * @param {Object} structuredPayload Payload estructurado para la sincronización de diseño propuesto por el proveedor de IA
     * @param {Object} schema Esquema para validar la estructura del payload de sincronización de diseño
     * @returns {Object} Objeto que indica el resultado de la sincronización, con una propiedad 'success' que es true si la sincronización fue exitosa, o false si hubo un error, y una propiedad 'error' que contiene un mensaje descriptivo en caso de error. 
     */
    sync(structuredPayload, schema = null) {
      if (!window.sessionStorageManager?.applyPartialUpdate || !window.sessionStorageManager?.getState) {
        return {
          success: false,
          error: 'sessionStorageManager no está disponible.'
        };
      }

      // Valida el payload estructurado contra el esquema definido para asegurarse de que cumple con el contrato esperado para la sincronización de diseño. Si la validación falla, se devuelve un mensaje de error que indica la razón específica por la cual el payload no es válido, lo que ayuda a guiar al usuario o al desarrollador para corregir posibles problemas con la estructura del JSON antes de intentar sincronizar nuevamente.
      const validation = validateDesignSyncAgainstSchema(structuredPayload || {}, schema, 'design_sync');
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.reason || 'El payload no cumple el schema exacto de sincronizacion.'
        };
      }

      const currentState = window.sessionStorageManager.getState() || {};
      const cleanPayload = deepStripMermaid(structuredPayload || {});
      const normalizedPayload = materializePayloadAgainstState(cleanPayload, currentState, currentState);
      return window.sessionStorageManager.applyPartialUpdate(normalizedPayload);
    }
  }


  /**
   * Función auxiliar para determinar si un payload parece ser un fragmento del esquema esperado, verificando si tiene claves que coinciden con el esquema aunque no tenga la estructura completa del contrato. Esto se utiliza para manejar casos donde la respuesta del proveedor de IA puede contener solo una parte de la información esperada, pero aún así puede ser útil para la sincronización de diseño si contiene claves relevantes que coinciden con el esquema.
   * @param {*} payload 
   * @param {*} schema 
   * @returns {boolean} Devuelve true si el payload parece ser un fragmento del esquema, false en caso contrario.
   */
  function looksLikeSchemaFragment(payload, schema) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
    if (!schema || typeof schema !== 'object') return false;
    const keys = Object.keys(payload).filter(key => !key.startsWith('_'));
    if (!keys.length) return false;
    return keys.some(key => key in schema);
  }

  /**
   * Valida la forma del payload del contrato contra el esquema proporcionado, asegurándose de que contiene todas las claves obligatorias y que sus valores cumplen con el tipo esperado.
   * @param {*} parsed 
   * @param {*} schema 
   * @returns {Object} Devuelve un objeto con las propiedades 'isSyncable' (boolean) y 'reason' (string) que indica la razón en caso de que no sea sincronizable.
   */
  function validateContractPayloadShape(parsed, schema) {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        isSyncable: false,
        reason: 'La respuesta no contiene un JSON valido.'
      };
    }

    const hasMeta = parsed.meta && typeof parsed.meta === 'object' && !Array.isArray(parsed.meta);
    const hasChatDisplay = parsed.chat_display && typeof parsed.chat_display === 'object' && !Array.isArray(parsed.chat_display);
    const hasDesignSync = Object.prototype.hasOwnProperty.call(parsed, 'design_sync')
      && parsed.design_sync
      && typeof parsed.design_sync === 'object'
      && !Array.isArray(parsed.design_sync);
    const hasSummaryMarkdown = hasChatDisplay && typeof parsed.chat_display.summary_markdown === 'string';

    if (!hasMeta || !hasChatDisplay || !hasDesignSync || !hasSummaryMarkdown) {
      return {
        isSyncable: false,
        reason: 'Faltan claves obligatorias del contrato o el formato es invalido.'
      };
    }

    const designSyncValidation = validateDesignSyncAgainstSchema(parsed.design_sync, schema, 'design_sync');
    if (!designSyncValidation.isValid) {
      return {
        isSyncable: false,
        reason: designSyncValidation.reason
      };
    }

    return {
      isSyncable: true,
      reason: ''
    };
  }

  /**
   * Valida la sincronización de diseño contra el esquema proporcionado, asegurándose de que cumple con el contrato esperado.
   * @param {*} source 
   * @param {*} schema 
   * @param {*} path 
   * @returns {Object} Devuelve un objeto con las propiedades 'isValid' (boolean) y 'reason' (string) que indica la razón en caso de que no sea válido.
   */
  function validateDesignSyncAgainstSchema(source, schema, path = 'design_sync') {
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
      return {
        isValid: false,
        reason: 'No hay un schema cargado para validar la sincronizacion.'
      };
    }

    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      return {
        isValid: false,
        reason: `${path} debe ser un objeto compatible con el contrato.`
      };
    }

    return validateNodeAgainstSchema(source, schema, path);
  }

  /**
   * Valida un nodo del payload contra el nodo correspondiente del esquema, manejando recursivamente objetos y arrays para asegurar que toda la estructura cumple con el contrato esperado. Devuelve un objeto que indica si el nodo es válido o no, y proporciona una razón específica en caso de que no sea válido, lo que ayuda a identificar exactamente dónde en la estructura del JSON se encuentra el problema.
   * @param {*} source 
   * @param {*} schemaNode 
   * @param {*} path 
   * @returns {Object} Devuelve un objeto con las propiedades 'isValid' (boolean) y 'reason' (string) que indica la razón en caso de que el nodo no sea válido.
   */
  function validateNodeAgainstSchema(source, schemaNode, path) {
    if (Array.isArray(schemaNode)) {
      if (!Array.isArray(source)) {
        return {
          isValid: false,
          reason: `${path} debe ser un array para respetar el contrato.`
        };
      }

      // Asume que el esquema para un array es un array con un solo elemento que define el esquema de los items. Valida cada item del array de origen contra ese esquema, proporcionando una razón específica si algún item no cumple con el contrato esperado.
      const itemSchema = schemaNode[0];
      for (let index = 0; index < source.length; index++) {
        const result = validateNodeAgainstSchema(source[index], itemSchema, `${path}[${index}]`);
        if (!result.isValid) return result;
      }

      return { isValid: true, reason: '' };
    }

    // Si el nodo del esquema es un objeto, valida que el nodo de origen también sea un objeto (no un array) y que no contenga claves adicionales que no estén definidas en el esquema. Además, si el esquema define una clave 'valor', se asegura de que el nodo de origen también la incluya para cumplir con el contrato exacto. Luego, valida recursivamente cada clave del nodo de origen contra el nodo correspondiente del esquema, proporcionando una razón específica si alguna clave no cumple con el contrato esperado.
    if (schemaNode && typeof schemaNode === 'object') {
      if (!source || typeof source !== 'object' || Array.isArray(source)) {
        return {
          isValid: false,
          reason: `${path} debe ser un objeto para respetar el contrato.`
        };
      }

      const sourceKeys = Object.keys(source);
      for (const key of sourceKeys) {
        if (!(key in schemaNode)) {
          return {
            isValid: false,
            reason: `${path}.${key} no existe en el contrato base.`
          };
        }
      }

      if (Object.prototype.hasOwnProperty.call(schemaNode, 'valor')
        && sourceKeys.length
        && !Object.prototype.hasOwnProperty.call(source, 'valor')) {
        return {
          isValid: false,
          reason: `${path} debe incluir la clave valor para respetar el contrato exacto.`
        };
      }

      for (const key of sourceKeys) {
        const result = validateNodeAgainstSchema(source[key], schemaNode[key], `${path}.${key}`);
        if (!result.isValid) return result;
      }

      return { isValid: true, reason: '' };
    }

    return validatePrimitiveAgainstSchema(source, schemaNode, path);
  }

  /**
   * Valida un nodo primitivo del payload contra el nodo correspondiente del esquema, asegurándose de que el tipo y el valor cumplen con el contrato esperado. Devuelve un objeto que indica si el nodo es válido o no, y proporciona una razón específica en caso de que no sea válido.
   * @param {*} source 
   * @param {*} schemaNode 
   * @param {*} path 
   * @returns {Object} Devuelve un objeto con las propiedades 'isValid' (boolean) y 'reason' (string) que indica la razón en caso de que el nodo no sea válido.
   */
  function validatePrimitiveAgainstSchema(source, schemaNode, path) {
    // Si el nodo del esquema es null, el nodo de origen también debe ser null para cumplir con el contrato exacto. Proporciona una razón específica si el nodo de origen no es null, indicando que debe ser null para respetar el contrato.
    if (schemaNode === null) {
      return source === null
        ? { isValid: true, reason: '' }
        : { isValid: false, reason: `${path} debe ser null.` };
    }

    // Valida los tipos primitivos básicos (string, number, boolean) asegurándose de que el nodo de origen tenga el mismo tipo que el nodo del esquema para cumplir con el contrato exacto. Proporciona una razón específica si el tipo del nodo de origen no coincide con el tipo esperado según el esquema.
    if (typeof schemaNode === 'string') {
      return typeof source === 'string'
        ? { isValid: true, reason: '' }
        : { isValid: false, reason: `${path} debe ser un texto.` };
    }
    
    // Para los números, además de verificar que el tipo sea 'number', también se asegura de que el valor sea finito (no NaN ni Infinity) para cumplir con el contrato exacto. Proporciona una razón específica si el nodo de origen no es un número finito, indicando que debe ser un número válido para respetar el contrato.
    if (typeof schemaNode === 'number') {
      return typeof source === 'number' && Number.isFinite(source)
        ? { isValid: true, reason: '' }
        : { isValid: false, reason: `${path} debe ser un numero.` };
    }

    // Para los booleanos, verifica que el tipo del nodo de origen sea 'boolean' para cumplir con el contrato exacto. Proporciona una razón específica si el nodo de origen no es un booleano, indicando que debe ser un valor booleano para respetar el contrato.
    if (typeof schemaNode === 'boolean') {
      return typeof source === 'boolean'
        ? { isValid: true, reason: '' }
        : { isValid: false, reason: `${path} debe ser booleano.` };
    }

    return { isValid: true, reason: '' };
  }

  /**
   * Construye un mensaje de reparación del contrato exacto para un proveedor específico, incluyendo un motivo opcional.
   * @param {string} providerLabel - Etiqueta del proveedor.
   * @param {string} reason - Motivo opcional de la violación del contrato.
   * @returns {string} Mensaje de reparación del contrato exacto.
   */
  function buildContractRepairMessage(providerLabel, reason = '') {
    const detail = reason ? ` Motivo: ${reason}` : '';
    return `La respuesta de ${providerLabel} no cumple el contrato exacto de sincronizacion.${detail} Puedes pulsar "Sincronizar con diseno" para pedir a la IA que reconstruya el JSON con la forma exacta de resumen_fp.json.`;
  }

  /**
   * Materializa un payload contra el estado actual y el estado de plantilla, asegurándose de que los valores se ajusten a la estructura esperada.
   * @param {*} payload - Payload entrante.
   * @param {*} currentState - Estado actual.
   * @param {*} templateState - Estado de plantilla.
   * @returns {Object} Objeto materializado.
   */
  function materializePayloadAgainstState(payload, currentState, templateState) {
    if (!payload || typeof payload !== 'object') return {};
    const result = {};
    Object.keys(payload).forEach(key => {
      if (key.startsWith('_')) return;
      const incoming = payload[key];
      const current = currentState ? currentState[key] : undefined;
      const template = templateState ? templateState[key] : undefined;
      result[key] = materializeNode(incoming, current, template);
    });
    return result;
  }

  /**
   * Materializa un nodo contra el estado actual y el estado de plantilla, asegurándose de que los valores se ajusten a la estructura esperada.
   * @param {*} incoming - Nodo entrante.
   * @param {*} current - Nodo del estado actual.
   * @param {*} template - Nodo del estado de plantilla.
   * @returns {*} Nodo materializado.
   */
  function materializeNode(incoming, current, template) {
    // Si el nodo entrante es un array, se materializa recursivamente cada uno de sus items, utilizando el nodo correspondiente del estado actual o del estado de plantilla como referencia para asegurar que la estructura y los valores se ajusten al contrato esperado. Esto permite que el payload entrante se adapte a la forma esperada por la aplicación, incluso si el modelo de IA devuelve una estructura ligeramente diferente, siempre y cuando contenga la información necesaria para cumplir con el contrato.
    if (Array.isArray(incoming)) {
      const currentArray = Array.isArray(current) ? current : [];
      const templateArray = Array.isArray(template) ? template : currentArray;
      return incoming.map((item, index) => {
        const currentItem = currentArray[index];
        const templateItem = Array.isArray(templateArray) ? templateArray[index] ?? templateArray[0] : undefined;
        return materializeNode(item, currentItem, templateItem);
      });
    }

    // Si el nodo entrante es un objeto, se materializa recursivamente cada una de sus claves, utilizando el nodo correspondiente del estado actual o del estado de plantilla como referencia para asegurar que la estructura y los valores se ajusten al contrato esperado. Esto permite que el payload entrante se adapte a la forma esperada por la aplicación, incluso si el modelo de IA devuelve una estructura ligeramente diferente, siempre y cuando contenga la información necesaria para cumplir con el contrato.
    if (incoming && typeof incoming === 'object') {
      return materializeObject(
        incoming,
        current && typeof current === 'object' ? current : {},
        template && typeof template === 'object' ? template : current
      );
    }

    // Si el nodo entrante es un valor primitivo y el nodo correspondiente del estado actual o del estado de plantilla espera un wrapper con una clave 'valor', se crea un nuevo objeto que incluye la clave 'valor' con el valor entrante, utilizando el nodo correspondiente del estado actual o del estado de plantilla como referencia para asegurar que la estructura se ajuste al contrato esperado. Esto permite que los valores primitivos entrantes se adapten a la forma esperada por la aplicación, incluso si el modelo de IA devuelve un valor directo en lugar de un objeto con una clave 'valor', siempre y cuando el contrato espere esa estructura.
    if (expectsValueWrapper(current, template)) {
      const base = cloneDeep(current && typeof current === 'object' ? current : template && typeof template === 'object' ? template : {});
      base.valor = incoming;
      return base;
    }

    return incoming;
  }

  /**
   * Materializa un objeto contra el estado actual y el estado de plantilla, asegurándose de que los valores se ajusten a la estructura esperada.
   * @param {*} incomingObj - Objeto entrante.
   * @param {*} currentObj - Objeto del estado actual.
   * @param {*} templateObj - Objeto del estado de plantilla.
   * @returns {*} Objeto materializado.
   */
  function materializeObject(incomingObj, currentObj, templateObj) {
    const base = cloneDeep(currentObj && typeof currentObj === 'object' ? currentObj : templateObj && typeof templateObj === 'object' ? templateObj : {});
    Object.keys(incomingObj).forEach(key => {
      const incomingValue = incomingObj[key];
      const currentValue = base[key];
      const templateValue = templateObj && typeof templateObj === 'object' ? templateObj[key] : undefined;
      if (Array.isArray(incomingValue)) {
        base[key] = materializeNode(incomingValue, currentValue, templateValue);
      } else if (incomingValue && typeof incomingValue === 'object') {
        base[key] = materializeNode(incomingValue, currentValue, templateValue);
      } else if (expectsValueWrapper(currentValue, templateValue)) {
        const wrapperBase = cloneDeep(currentValue && typeof currentValue === 'object' ? currentValue : templateValue && typeof templateValue === 'object' ? templateValue : {});
        wrapperBase.valor = incomingValue;
        base[key] = wrapperBase;
      } else {
        base[key] = incomingValue;
      }
    });
    return base;
  }

  /**
   * Determina si un nodo espera un wrapper con una clave 'valor'.
   * @param {*} current - Nodo del estado actual.
   * @param {*} template - Nodo del estado de plantilla.
   * @returns {boolean} True si el nodo espera un wrapper con una clave 'valor', false en caso contrario.
   */
  function expectsValueWrapper(current, template) {
    const sample = current && typeof current === 'object' ? current : template && typeof template === 'object' ? template : null;
    return !!sample && !Array.isArray(sample) && Object.prototype.hasOwnProperty.call(sample, 'valor');
  }

  /**
   * Determina si un texto parece ser JSON.
   * @param {*} text - Texto a evaluar.
   * @returns {boolean} True si el texto parece ser JSON, false en caso contrario.
   */
  function looksLikeJsonText(text) {
    const clean = String(text || '').trim();
    if (!clean) return false;
    if (/^```json/i.test(clean)) return true;
    return /^[\[{]/.test(clean) || /"design_sync"\s*:|"chat_display"\s*:|"meta"\s*:/.test(clean);
  }

  /**
   * Reemplaza los tokens en una plantilla con los valores proporcionados.
   * @param {*} template - Plantilla de texto.
   * @param {*} replacements - Objeto con los valores de reemplazo.
   * @returns {*} Texto con los tokens reemplazados.
   */
  function replaceTokens(template, replacements) {
    return Object.entries(replacements).reduce((acc, [key, value]) => {
      return acc.split(key).join(String(value ?? ''));
    }, template || '');
  }

  /**
   * Construye un contrato de salida basado en un esquema proporcionado.
   * @param {*} schema - Esquema de diseño.
   * @returns {*} Contrato de salida.
   */
  function buildOutputContract(schema) {
    return {
      meta: {
        provider: 'chatgpt | claude | gemini',
        response_type: 'design_update'
      },
      chat_display: {
        title: 'Título breve',
        summary_markdown: 'Explicación bonita en markdown. Puede incluir listas, tablas cortas y bloques ```mermaid```.',
        mermaid: ['flowchart TD\nA[Inicio] --> B[Actividad]']
      },
      design_sync: schema || {}
    };
  }

  /**
   * Sanitiza un objeto de diseño sincronizado basado en un esquema proporcionado.
   * @param {*} payload - Objeto de diseño sincronizado entrante.
   * @param {*} schema - Esquema de diseño.
   * @returns {*} Objeto sanitizado.
   */
  function sanitizeDesignSync(payload, schema) {
    if (!payload || typeof payload !== 'object') return {};
    if (!schema || typeof schema !== 'object') return payload;

    // La función walk recorre el payload entrante y el esquema de manera recursiva, asegurándose de que solo se mantengan las claves que están definidas en el esquema y que los valores tengan la estructura esperada. Si el payload contiene claves adicionales que no están en el esquema, se omiten. Si el payload tiene la estructura correcta pero algunos valores no cumplen con el contrato esperado, se eliminan esos valores pero se mantiene la estructura general del JSON para preservar cualquier información válida que pueda estar presente.
    const walk = (source, template) => {
      if (Array.isArray(template)) {
        if (!Array.isArray(source)) return undefined;
        const itemTemplate = template[0];
        return source.map(item => walk(item, itemTemplate)).filter(v => v !== undefined);
      }

      if (template && typeof template === 'object') {
        if (!source || typeof source !== 'object') return undefined;
        const out = {};
        Object.keys(source).forEach(key => {
          if (!(key in template)) return;
          const nested = walk(source[key], template[key]);
          if (nested !== undefined) out[key] = nested;
        });
        return Object.keys(out).length ? out : undefined;
      }

      return source;
    };

    return walk(payload, schema) || {};
  }

  /**
   * Clona profundamente un valor.
   * @param {*} value - Valor a clonar.
   * @returns {*} Clon del valor.
   */
  function cloneDeep(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  /**
   * Elimina los bloques de código Mermaid de un valor de manera recursiva.
   * @param {*} value - Valor a procesar.
   * @returns {*} Valor con los bloques Mermaid eliminados.
   */
  function deepStripMermaid(value) {
    if (Array.isArray(value)) return value.map(deepStripMermaid);
    if (value && typeof value === 'object') {
      const out = {};
      Object.entries(value).forEach(([k, v]) => {
        out[k] = deepStripMermaid(v);
      });
      return out;
    }
    if (typeof value === 'string') {
      return value.replace(/```mermaid[\s\S]*?```/gi, '').trim();
    }
    return value;
  }

  /**
   * Extrae el texto de salida de un objeto de respuesta de OpenAI.
   * @param {*} data - Objeto de respuesta de OpenAI.
   * @returns {string} Texto extraído.
   */
  function extractOpenAIText(data) {
    if (typeof data?.output_text === 'string' && data.output_text) return data.output_text;

    if (Array.isArray(data?.output)) {
      const chunks = [];
      data.output.forEach(item => {
        if (Array.isArray(item?.content)) {
          item.content.forEach(part => {
            if (part?.type === 'output_text' && part?.text) chunks.push(part.text);
            if (part?.type === 'text' && part?.text) chunks.push(part.text);
          });
        }
      });
      if (chunks.length) return chunks.join('\n');
    }

    return '';
  }

  /**
   * Resume los últimos mensajes en un formato legible.
   * @param {*} messages - Array de mensajes.
   * @returns {string} Resumen de los mensajes.
   */
  function summarizeMessages(messages) {
    return messages.slice(-8).map(m => `${m.role}: ${truncate(m.content, 220)}`).join('\n');
  }

  /**
   * Trunca un texto a una longitud máxima.
   * @param {string} text - Texto a truncar.
   * @param {number} max - Longitud máxima.
   * @returns {string} Texto truncado.
   */
  function truncate(text, max = 180) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    return clean.length > max ? `${clean.slice(0, max)}…` : clean;
  }

  /**
   * Limita un texto a una longitud máxima.
   * @param {string} text - Texto a limitar.
   * @param {number} max - Longitud máxima.
   * @returns {string} Texto limitado.
   */
  function limitText(text, max = 2400) {
    return truncate(text, max);
  }

  /**
   * Convierte un valor a JSON compacto y lo limita a una longitud máxima.
   * @param {*} value - Valor a convertir.
   * @param {number} maxChars - Longitud máxima.
   * @returns {string} JSON compacto limitado.
   */
  function compactJson(value, maxChars = 2400) {
    try {
      return limitText(JSON.stringify(value, null, 2), maxChars);
    } catch (_) {
      return limitText(String(value || ''), maxChars);
    }
  }

  /**
   * Obtiene el valor de un nodo si está seleccionado, o su valor sin formato si no lo está.
   * @param {*} node - Nodo a procesar.
   * @returns {string} Valor del nodo.
   */
  function valueIfSelected(node) {
    if (!node) return '';
    if (node.seleccionado === true) return node.texto || node.valor || '';
    return node.valor || '';
  }

  /**
   * Extrae las metodologías de un texto XML.
   * @param {string} xmlText - Texto XML a procesar.
   * @returns {Array} Array de metodologías extraídas.
   */
  function extractXmlMetodologias(xmlText) {
    if (!xmlText) return [];
    try {
      const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
      return Array.from(doc.querySelectorAll('metodologia')).map(node => ({
        id: node.querySelector('id_metodologia')?.textContent?.trim() || '',
        titulo: node.querySelector('metodologia_titulo')?.textContent?.trim() || '',
        descripcion: node.querySelector('metodologia_descripcion')?.textContent?.trim() || '',
        sugerencia: node.querySelector('metodologia_sugerencias_implementacion')?.textContent?.trim() || ''
      }));
    } catch (_) {
      return [];
    }
  }

  /**
   * Extrae los niveles de Bloom de un texto XML.
   * @param {string} xmlText - Texto XML a procesar.
   * @returns {Array} Array de niveles de Bloom extraídos.
   */
  function extractBloomLevels(xmlText) {
    if (!xmlText) return [];
    try {
      const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
      return Array.from(doc.querySelectorAll('nivel_bloom')).map(node => ({
        id: node.querySelector('id_bloom')?.textContent?.trim() || '',
        nivel: node.querySelector('nivel')?.textContent?.trim() || '',
        definicion: node.querySelector('definicion')?.textContent?.trim() || '',
        verbos_clave: node.querySelector('verbos_clave')?.textContent?.trim() || '',
        ejemplo: node.querySelector('ejemplos_actividad')?.textContent?.trim() || ''
      }));
    } catch (_) {
      return [];
    }
  }

  /**
   * Extrae las inteligencias de Gardner de un texto XML.
   * @param {string} xmlText - Texto XML a procesar.
   * @returns {Array} Array de inteligencias de Gardner extraídas.
   */
  function extractGardnerIntelligences(xmlText) {
    if (!xmlText) return [];
    try {
      const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
      return Array.from(doc.querySelectorAll('inteligencia')).map(node => ({
        id: node.querySelector('id_inteligencia')?.textContent?.trim() || '',
        tipo: node.querySelector('tipo')?.textContent?.trim() || '',
        definicion: node.querySelector('definicion')?.textContent?.trim() || '',
        perfil_alumno: node.querySelector('perfil_alumno')?.textContent?.trim() || '',
        estrategias_aula: node.querySelector('estrategias_aula')?.textContent?.trim() || ''
      }));
    } catch (_) {
      return [];
    }
  }

  /**
   * Extrae un resumen de habilidades blandas de un texto XML.
   * @param {string} xmlText - Texto XML a procesar.
   * @returns {Array} Array de categorías de habilidades blandas extraídas.
   */
  function extractSoftSkillsSummary(xmlText) {
    if (!xmlText) return [];
    try {
      const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
      return Array.from(doc.querySelectorAll('categoria')).map(node => ({
        id: node.querySelector('id_categoria')?.textContent?.trim() || '',
        categoria: node.querySelector('sk_cat_nombre')?.textContent?.trim() || '',
        descripcion: node.querySelector('sk_cat_descripcion')?.textContent?.trim() || '',
        items: Array.from(node.querySelectorAll('items > item')).slice(0, 4).map(item => ({
          id: item.querySelector('id_softskills_items')?.textContent?.trim() || '',
          titulo: item.querySelector('sk_item_titulo')?.textContent?.trim() || ''
        }))
      }));
    } catch (_) {
      return [];
    }
  }

  /**
   * Extrae los objetivos de una etapa educativa de un texto XML, diferenciando entre Bachillerato y Educación Secundaria Obligatoria según el nivel educativo proporcionado.
   * @param {string} xmlText - Texto XML a procesar.
   * @param {string} secLevel - Nivel educativo ('BACH' para Bachillerato, otro valor para Educación Secundaria Obligatoria).
   * @returns {Array} Array de objetivos extraídos.
   */
  function extractObjetivosEtapa(xmlText, secLevel) {
    if (!xmlText) return [];
    try {
      const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
      const root = secLevel === 'BACH' ? 'bachillerato' : 'educacion_secundaria_obligatoria';
      return Array.from(doc.querySelectorAll(`${root} objetivo`)).map(node => ({
        codigo: node.querySelector('codigo')?.textContent?.trim() || '',
        descripcion: node.querySelector('descripcion')?.textContent?.trim() || ''
      }));
    } catch (_) {
      return [];
    }
  }

  /**
   * Realiza una solicitud fetch y devuelve el resultado como JSON de manera segura.
   * @param {string} path - URL o ruta del recurso a obtener.
   * @param {*} fallback - Valor a devolver en caso de error.
   * @returns {Promise<*>} Resultado de la solicitud o el valor de fallback.
   */
  async function safeFetchJson(path, fallback) {
    try {
      const response = await fetch(path);
      if (!response.ok) return fallback;
      return await response.json();
    } catch (_) {
      return fallback;
    }
  }

  /**
   * Realiza una solicitud fetch y devuelve el resultado como texto de manera segura.
   * @param {string} path - URL o ruta del recurso a obtener.
   * @param {*} fallback - Valor a devolver en caso de error.
   * @returns {Promise<*>} Resultado de la solicitud o el valor de fallback.
   */
  async function safeFetchText(path, fallback) {
    try {
      const response = await fetch(path);
      if (!response.ok) return fallback;
      return await response.text();
    } catch (_) {
      return fallback;
    }
  }

  /**
   * Carga un valor JSON desde el almacenamiento local de manera segura.
   * @param {string} key - Clave del valor a obtener.
   * @param {*} fallback - Valor a devolver en caso de error o si la clave no existe.
   * @returns {*} Valor almacenado o el valor de fallback.
   */
  function loadJsonStorage(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  /**
   * Guarda un valor JSON en el almacenamiento local de manera segura.
   * @param {string} key - Clave del valor a almacenar.
   * @param {*} value - Valor a almacenar.
   */
  function saveJsonStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  /**
   * Normaliza la respuesta de un proveedor de IA a un formato de texto uniforme.
   * @param {*} response - Respuesta del proveedor de IA.
   * @param {string} providerType - Tipo de proveedor de IA ('claude', 'gemini', 'chatgpt', 'openai').
   * @returns {string} Texto normalizado de la respuesta.
   */
  function normalizeProviderResponse(response, providerType) {
    let normalizedText = '';

    // La función normaliza la respuesta de diferentes proveedores de IA a un formato de texto uniforme, manejando las distintas estructuras que cada proveedor puede devolver. Para Claude, se maneja tanto el caso de arrays de contenido como objetos con una clave 'content'. Para Gemini, se extrae el texto de 'candidates[0].content.parts'. Para ChatGPT/OpenAI, se maneja la estructura típica de 'choices[0].message.content' o 'choices[0].text'. Si la estructura no coincide con lo esperado para cada proveedor, se intenta extraer el texto de manera más general o se devuelve la respuesta original como texto si es una cadena, o como JSON compacto si es un objeto.
    switch (providerType.toLowerCase()) {
      case 'claude':
        // Claude a veces devuelve arrays de content
        if (Array.isArray(response)) {
          normalizedText = response
            .filter(item => item.type === 'text')
            .map(item => item.text)
            .join('\n');
        } else if (response.content) {
          normalizedText = Array.isArray(response.content)
            ? response.content.map(c => c.text || '').join('\n')
            : response.content;
        } else {
          normalizedText = response;
        }
        break;

        // Gemini a veces devuelve candidates[0].content.parts, otras veces un texto directo
      case 'gemini':
        // Gemini devuelve structure candidates[0].content.parts[0].text
        if (response.candidates && response.candidates[0]) {
          const parts = response.candidates[0].content?.parts || [];
          normalizedText = parts.map(part => part.text || '').join('\n');
        } else if (response.text) {
          normalizedText = response.text;
        } else {
          normalizedText = response;
        }
        break;
        
        // ChatGPT/OpenAI suele devolver choices[0].message.content o choices[0].text
      case 'chatgpt':
      case 'openai':
        // ChatGPT/OpenAI structure
        if (response.choices && response.choices[0]) {
          normalizedText = response.choices[0].message?.content ||
            response.choices[0].text || '';
        } else if (response.message) {
          normalizedText = response.message.content || '';
        } else {
          normalizedText = response;
        }
        break;

      default:
        normalizedText = typeof response === 'string' ? response : JSON.stringify(response);
    }

    return normalizedText.trim();
  }

/**
 * 
 */
  window.normalizeProviderResponse = normalizeProviderResponse;

  window.IAService = new IAService();
})();
