/**
 * Servicio de píldoras en la web (localStorage).
 * Compatible con la lógica de la app; luego se sincronizará con login/backend.
 */
window.PildorasService = {
  KEY: 'ceoclinicos_pildoras',
  KEY_TEMAS_UNLOCK: 'ceoclinicos_temas_unlock',

  get: function () {
    var v = localStorage.getItem(this.KEY);
    if (v === null) return 0;
    var n = parseInt(v, 10);
    return isNaN(n) ? 0 : Math.max(0, n);
  },

  setPildoras: function (n) {
    n = Math.max(0, parseInt(n, 10) || 0);
    localStorage.setItem(this.KEY, String(n));
    this._notify();
  },

  setUnlockedThemeIds: function (ids) {
    var arr = Array.isArray(ids) ? ids : [];
    localStorage.setItem(this.KEY_TEMAS_UNLOCK, JSON.stringify(arr));
    this._notify();
  },

  add: function (cantidad) {
    cantidad = parseInt(cantidad, 10) || 0;
    if (cantidad <= 0) return this.get();
    var n = this.get() + cantidad;
    localStorage.setItem(this.KEY, String(n));
    this._notify();
    return n;
  },

  spend: function (cantidad) {
    cantidad = parseInt(cantidad, 10) || 0;
    if (cantidad <= 0) return true;
    var n = this.get();
    if (n < cantidad) return false;
    n -= cantidad;
    localStorage.setItem(this.KEY, String(n));
    this._notify();
    return true;
  },

  canSpend: function (cantidad) {
    return this.get() >= (parseInt(cantidad, 10) || 0);
  },

  /** Temas desbloqueados: array de tema.id guardado en localStorage */
  getUnlockedThemeIds: function () {
    try {
      var raw = localStorage.getItem(this.KEY_TEMAS_UNLOCK);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  },

  isThemeUnlocked: function (temaId) {
    return this.getUnlockedThemeIds().indexOf(temaId) >= 0;
  },

  unlockTheme: function (temaId) {
    var ids = this.getUnlockedThemeIds();
    if (ids.indexOf(temaId) >= 0) return;
    ids.push(temaId);
    localStorage.setItem(this.KEY_TEMAS_UNLOCK, JSON.stringify(ids));
    this._notify();
  },

  _listeners: [],
  onUpdate: function (fn) {
    if (typeof fn === 'function') this._listeners.push(fn);
  },
  _notify: function () {
    this._listeners.forEach(function (fn) { fn(); });
  }
};
