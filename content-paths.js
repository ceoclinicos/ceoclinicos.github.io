/**
 * Rutas compartidas con la app clinicos (mismo repo ceoclinicos.github.io).
 * La app usa ContentCacheHelper + baseRawUrl (raw.githubusercontent.com);
 * la web usa esta base (mismo origen cuando se sirve desde GitHub Pages).
 */
window.ContentPaths = {
  /** Base URL del contenido. En GitHub Pages suele ser '' (mismo origen) o el dominio. */
  getBase: function () {
    if (typeof window.CONTENT_BASE_URL === 'string' && window.CONTENT_BASE_URL.length > 0) {
      return window.CONTENT_BASE_URL.replace(/\/$/, '') + '/';
    }
    return '';
  },

  /** temas/temas.json (catálogo de materias) */
  temasCatalog: function () {
    return this.getBase() + 'temas/temas.json';
  },

  /** guias.json (documentos PDF: título, descripción, enlace descarga) */
  guiasCatalog: function () {
    return this.getBase() + 'guias.json';
  },

  /**
   * Preguntas de un tema por idioma (como en la app: temas/es/{topicId}_questions.json).
   * @param {string} topicId - id del tema (ej: hipertension_arterial, ciclo_celular)
   * @param {string} lang - 'es' | 'en' | 'pt'
   */
  temaQuestions: function (topicId, lang) {
    var file = topicId + '_questions.json';
    if (lang === 'en') file = topicId + '_questions_en.json';
    if (lang === 'pt') file = topicId + '_questions_pt.json';
    return this.getBase() + 'temas/' + lang + '/' + file;
  },

  /**
   * Preguntas por categoría (questions/{lang}/categories/).
   * @param {string} category - ej: cardiologia, anatomia
   * @param {string} lang - 'es' | 'en' | 'pt'
   */
  categoryQuestions: function (category, lang) {
    var file = category + '_questions.json';
    if (lang === 'en') file = category + '_questions_en.json';
    if (lang === 'pt') file = category + '_questions_pt.json';
    return this.getBase() + 'questions/' + lang + '/categories/' + file;
  },

  /**
   * Preguntas verdadero/falso por categoría.
   * @param {string} category - ej: general, cardiologia
   * @param {string} lang - 'es' | 'en' | 'pt'
   */
  trueFalseQuestions: function (category, lang) {
    var file = 'true_false_' + category + '_questions.json';
    if (lang === 'en') file = 'true_false_' + category + '_questions_en.json';
    if (lang === 'pt') file = 'true_false_' + category + '_questions_pt.json';
    return this.getBase() + 'questions/' + lang + '/categories/' + file;
  }
};
