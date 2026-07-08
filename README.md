# Diseño y prueba de concepto de una aplicación web basada en inteligencia artificial para la planificación docente - UNIR - Trabajo Fin de Estudios (TFE)

---
## Autor

Jesús Villarroya Lancis

**Proyecto desarrollado como parte del Trabajo de Fin de Estudio del Grado en Ingeniería Informática de la Universidad Internacional de La Rioja (UNIR).**

---

**Planificación Estratégica Docente (TFE - UNIR)** es una aplicación web progresiva orientada al diseño, desarrollo y estructuración de unidades didácticas y situaciones de aprendizaje en el marco del sistema educativo español, especialmente bajo el enfoque competencial de la **LOMLOE**.

---

## Descripción

Planificación Estratégica Docente (TFE - UNIR) es una plataforma digital diseñada para facilitar la creación, gestión y organización de contenidos curriculares en **Educación Secundaria**, **Bachillerato** y **Formación Profesional**.

La aplicación permite trabajar con elementos curriculares como competencias clave, descriptores operativos, resultados de aprendizaje, criterios de evaluación, saberes básicos, contenidos, metodologías y recursos de evaluación, integrándolos en una estructura coherente para apoyar la planificación docente.

Su objetivo principal es reducir la fragmentación de herramientas y documentos que intervienen en la programación didáctica, ofreciendo un entorno centralizado, flexible y orientado a la toma de decisiones educativas.

---

## Características principales

- **Gestión curricular integral**  
  Soporte para Educación Secundaria, Bachillerato y Formación Profesional.

- **Interfaz adaptativa**  
  Diseño responsivo para su uso en diferentes dispositivos y tamaños de pantalla.

- **Contextualización educativa**  
  Herramientas para adaptar la planificación a niveles educativos, comunidades autónomas, materias o módulos específicos.

- **Integración de elementos curriculares**  
  Organización de competencias, criterios de evaluación, saberes básicos, resultados de aprendizaje y contenidos.

- **Exportación avanzada**  
  Generación de documentos en diferentes formatos, como PDF y Word.

- **Base de datos legislativa y curricular**  
  Estructura preparada para trabajar con normativa educativa y datos curriculares organizados.

---

## Estructura del proyecto

```txt
proyecto/
├── index.html                          # Punto de entrada principal de la aplicación
├── data/                               # Datos curriculares, legislativos y plantillas base
│   ├── aragon/                         # Datos curriculares específicos de Aragón
│   │   ├── bachillerato/               # Datos de Bachillerato
│   │   ├── fp/                         # Datos de Formación Profesional
│   │   └── secundaria/                 # Datos de Educación Secundaria
│   ├── ApiKeys.json                    # Configuración local de claves API
│   ├── bloom.xml                       # Taxonomía de Bloom
│   ├── competencias_clave.xml          # Competencias clave y descriptores
│   ├── data_general.json               # Datos generales de configuración curricular
│   ├── gardner.xml                     # Inteligencias múltiples de Gardner
│   ├── metodologias.xml                # Metodologías didácticas
│   ├── objetivos_etapa.xml             # Objetivos generales de etapa
│   ├── ods.xml                         # Objetivos de Desarrollo Sostenible
│   ├── prompts.json                    # Prompts base para la generación asistida
│   ├── resumen_fp.json                 # Estructura y plantilla de resumen
│   ├── reto_xxi.xml                    # Retos del siglo XXI
│   └── softskills.xml                  # Competencias transversales o soft skills
├── js/                                 # Código JavaScript de la aplicación
│   ├── app.js                          # Inicialización principal de la aplicación
│   ├── context_management.js           # Gestión del contexto educativo seleccionado
│   ├── context_management_support.js   # Funciones auxiliares para la gestión del contexto
│   ├── store.js                        # Estado global centralizado de la aplicación
│   ├── components/                     # Componentes principales de la interfaz
│   │   ├── chat.js                     # Componente de conversación con IA
│   │   ├── desarrollo.js               # Gestión del desarrollo de la planificación
│   │   ├── documents.js                # Generación, vista previa y exportación de documentos
│   │   ├── header.js                   # Cabecera y selectores principales
│   │   ├── modal.js                    # Ventanas modales y formularios emergentes
│   │   ├── resumen.js                  # Vista resumen de la planificación
│   │   ├── sidebar.js                  # Barra lateral y navegación secundaria
│   │   └── tabs.js                     # Sistema de pestañas de la interfaz
│   ├── config/                         # Configuración específica de JavaScript
│   │   └── prompts.json                # Prompts utilizados por los módulos de IA
│   ├── lib/                            # Librerías propias o adaptadas
│   │   ├── ias_library.js              # Integración con proveedores de inteligencia artificial
│   │   └── pdf_export_library.js       # Funciones de exportación a PDF
│   └── utils/                          # Utilidades compartidas
│       ├── markdown.js                 # Procesamiento de contenido Markdown
│       ├── schemaValidator.js          # Validación de estructuras y esquemas JSON
│       └── sessionStorage.js           # Gestión de persistencia temporal en sessionStorage
├── json/                               # Ejemplos, esquemas o plantillas JSON auxiliares
│   ├── modulo_read.json                # Ejemplo o plantilla de lectura de módulo
│   └── sda_complete.json               # Ejemplo completo de situación de aprendizaje
└── styles/                             # Hojas de estilo de la aplicación
    ├── components.css                  # Estilos generales de componentes
    ├── edu-level.css                   # Estilos asociados al nivel educativo
    ├── layout.css                      # Estructura general y disposición visual
    ├── modal-extended.css              # Estilos ampliados para modales
    ├── pdf_export_styles.css           # Estilos específicos para exportación a PDF
    ├── popup.css                       # Estilos de ventanas emergentes
    ├── responsive.css                  # Adaptación responsive
    ├── resumen.css                     # Estilos de la vista resumen
    └── theme.css                       # Variables visuales, colores y tema general
```

El archivo `data/ApiKeys.json` no se incluye en el repositorio.  
Se proporciona, en su caso, un archivo `data/ApiKeys.example.json` como plantilla sin claves reales.


---

## Tecnologías utilizadas

- **HTML5**
- **CSS3**
- **JavaScript Vanilla ES6+**
- **JSON**
- **XML Parsing**
- **Markdown**
- **Highlight.js**
- **jsPDF**
- **html2canvas**
- **Lucide Icons**

---

## Instalación y configuración

### Requisitos previos

Para ejecutar el proyecto en local se necesita:

- Un navegador moderno compatible con JavaScript ES6+.
- Un servidor web local, como Apache, Nginx, PHP Server, Python HTTP Server o similar.

---

### Instalación

Clona el repositorio:

```bash
git clone URL_DEL_REPOSITORIO
```

Accede a la carpeta del proyecto:

```bash
cd proyecto
```

---

### Ejecución en local

Planificación Estratégica Docente (TFE - UNIR) debe ejecutarse desde un servidor web local, ya que la aplicación carga archivos `JSON` y `XML` desde la carpeta `data/`.  
No se recomienda abrir directamente el archivo `index.html` con doble clic, porque el navegador puede bloquear la lectura de archivos locales.

La carpeta raíz del proyecto debe ser aquella que contiene:

```txt
index.html
data/
js/
json/
styles/
```

---

#### Opción recomendada: MAMP

Si utilizas **MAMP**, copia la carpeta del proyecto dentro de la carpeta `htdocs`.

En macOS, normalmente la ruta es:

```txt
/Applications/MAMP/htdocs/
```

Por ejemplo:

```txt
/Applications/MAMP/htdocs/proyecto/
```

Después:

1. Abre **MAMP**.
2. Pulsa **Start Servers**.
3. Abre el navegador.
4. Accede a la aplicación desde:

```txt
http://localhost:8888/proyecto/
```

Si has cambiado el puerto de Apache en MAMP, deberás usar el puerto correspondiente.

---

#### Opción alternativa: XAMPP

Si utilizas **XAMPP**, copia la carpeta del proyecto dentro de `htdocs`.

En macOS, la ruta habitual es:

```txt
/Applications/XAMPP/htdocs/
```

En Windows, normalmente es:

```txt
C:\xampp\htdocs\
```

Por ejemplo:

```txt
C:\xampp\htdocs\proyecto\
```

Después:

1. Abre **XAMPP Control Panel**.
2. Inicia el servicio **Apache**.
3. Abre el navegador.
4. Accede a la aplicación desde:

```txt
http://localhost/proyecto/
```

Si Apache está configurado en otro puerto, por ejemplo `8080`, la ruta sería:

```txt
http://localhost:8080/proyecto/
```

---

### Nota importante sobre claves API

El archivo:

```txt
data/ApiKeys.json
```
Este archivo no se adjunta en el repositorio por contener claves API de diferentes proveedores de inteligencia artificial.

Se proporciona, en su caso, un archivo data/ApiKeys.example.json como plantilla sin claves reales.

---

## Arquitectura del sistema

La aplicación está organizada mediante una arquitectura modular basada en componentes de interfaz, utilidades compartidas, gestión centralizada del estado y archivos de datos curriculares.

### Gestión de estado

La aplicación utiliza un patrón de almacén centralizado mediante `store.js`, que coordina el estado global entre los distintos componentes.

Además, se emplea `sessionStorage` para mantener la información activa durante la sesión de trabajo del usuario.

### Modularidad

Cada módulo tiene una responsabilidad específica dentro del sistema:

- `header.js`: navegación principal y selección del contexto educativo.
- `resumen.js`: visualización, edición y revisión de la planificación generada.
- `documents.js`: generación, previsualización y exportación de documentos.
- `modal.js`: gestión de ventanas emergentes, formularios y configuración avanzada.
- `store.js`: coordinación del estado global de la aplicación.

### Datos curriculares

La información curricular y legislativa se organiza en archivos estructurados, principalmente en formato JSON y XML.

La estructura de datos contempla:

- Comunidades autónomas.
- Niveles educativos.
- Materias y módulos.
- Competencias.
- Criterios de evaluación.
- Resultados de aprendizaje.
- Saberes básicos y contenidos.

---

## Uso de la aplicación

### 1. Selección del contexto educativo

El usuario comienza configurando el contexto de trabajo:

1. Seleccionar el nivel educativo.
2. Elegir la comunidad autónoma.
3. Indicar el curso, materia o módulo.
4. Cargar la estructura curricular correspondiente.

---

### 2. Desarrollo de la planificación

A partir del contexto seleccionado, la aplicación permite:

1. Completar la información de contextualización.
2. Seleccionar o revisar elementos curriculares.
3. Definir metodologías.
4. Organizar la evaluación.
5. Incorporar recursos y actividades.
6. Revisar el resumen final de la planificación.

---

### 3. Exportación de resultados

La planificación generada puede exportarse en diferentes formatos:

- **PDF**: documento final preparado para impresión o entrega.
- **DOCX/WORD**: documento editable preparado para revisión, impresión o entrega.


---

## Marco legal y referencias

Planificación Estratégica Docente (TFE - UNIR) se desarrolla tomando como referencia el marco normativo del sistema educativo español, especialmente:

- **Ley Orgánica 3/2020**, de 29 de diciembre, por la que se modifica la Ley Orgánica 2/2006, de Educación.
- **Real Decreto 217/2022**, de 29 de marzo, por el que se establece la ordenación y las enseñanzas mínimas de la Educación Secundaria Obligatoria.
- **Real Decreto 243/2022**, de 5 de abril, por el que se establece la ordenación y las enseñanzas mínimas del Bachillerato.
- Normativa autonómica aplicable según la comunidad seleccionada.
- Currículos oficiales de Formación Profesional correspondientes a cada ciclo y módulo.

Proyecto desarrollado como herramienta de apoyo a la planificación docente y a la implementación efectiva de la legislación educativa vigente en el sistema educativo español.

---

## Estado del proyecto

El proyecto se encuentra en fase de desarrollo y prueba de concepto.

Actualmente, la aplicación permite trabajar con estructuras curriculares, gestionar información de planificación docente y exportar resultados en distintos formatos.

---

## Posibles mejoras futuras

Las principales líneas de trabajo futuro se orientan a transformar la prueba de concepto en una solución más robusta, segura y evaluable en contextos reales de uso.

- **Evolucionar hacia una arquitectura de producción con backend seguro**, que permita gestionar las claves API de los proveedores de IA, las cuotas de uso, la auditoría y la protección de datos.

- **Sustituir el uso de `sessionStorage` por un sistema de persistencia permanente en servidor**, incorporando recuperación de sesiones, control de versiones y trazabilidad de cambios.

- **Ampliar la evaluación con una muestra mayor de docentes**, incorporando pruebas de usabilidad, comparación con herramientas existentes y métricas sobre utilidad percibida, facilidad de uso, tiempo empleado y carga docente percibida.

- **Extender la herramienta hacia los planos ejecutivo y formativo-personal de la acción docente**, conectando la planificación estratégica con la generación de actividades, instrumentos de evaluación, materiales adaptados y seguimiento del alumnado.

- **Interconectar los datos generados por la planificación, la evaluación y el seguimiento**, facilitando al docente visualizar el estado de cada alumno en un momento concreto de su proceso de aprendizaje.

- **Consolidar una arquitectura segura, trazable y pedagógicamente supervisada**, priorizando no solo la incorporación de nuevas funcionalidades, sino la fiabilidad, la auditabilidad y el control docente sobre el uso de la inteligencia artificial.

## Convenciones de código

Para mantener una estructura coherente en el proyecto, se recomienda seguir estas convenciones:

- **JavaScript**: uso de ES6+ y nomenclatura `camelCase`.
- **CSS**: clases claras, reutilizables y organizadas por componentes.
- **JSON**: estructuras consistentes y fácilmente validables.
- **Comentarios**: utilizar comentarios solo cuando ayuden a comprender la lógica del código.
- **Módulos**: mantener separadas las responsabilidades de cada archivo.

---

## Licencia

Este proyecto se publica bajo licencia MIT.  
El código fuente ha sido desarrollado por Jesús Villarroya Lancis como parte del Trabajo de Fin de Estudio del Grado en Ingeniería Informática de UNIR.

Consulta el archivo LICENSE para más información.

---

## Librerías y recursos de terceros

El proyecto utiliza librerías JavaScript de terceros para funcionalidades auxiliares, entre ellas jsPDF, html2canvas, Highlight.js y Lucide Icons. Estas librerías no forman parte del código original desarrollado para el TFE y se emplean conforme a sus respectivas licencias de uso.

- [jsPDF](https://github.com/parallax/jsPDF) · MIT — exportación a PDF
- [html2canvas](https://github.com/niklasvh/html2canvas) · MIT — captura de HTML para exportación
- [Highlight.js](https://github.com/highlightjs/highlight.js) · BSD-3-Clause — resaltado de sintaxis
- [Lucide Icons](https://github.com/lucide-icons/lucide) · ISC — iconografía de la interfaz

El código propio de la aplicación corresponde a la estructura, lógica funcional, integración curricular, gestión de estado, componentes de interfaz, sistema de exportación, integración con IA y organización del flujo de planificación docente.


---

## Contacto y soporte

Para consultas técnicas, sugerencias de mejora o comunicación de errores, se recomienda utilizar el sistema de **Issues** de GitHub.
