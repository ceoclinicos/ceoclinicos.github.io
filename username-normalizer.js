/**
 * Misma lógica que UsernameNormalizer.kt (app Android).
 */
(function () {
  var MAX_USUARIO_LETTERS = 25;

  function stripAccents(text) {
    return (text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function normalizeForUniqueness(input) {
    return stripAccents((input || '').trim())
      .toLowerCase()
      .replace(/[^a-z]/g, '');
  }

  function canonicalUsuario(input) {
    var letters = stripAccents((input || '').trim()).replace(/[^a-zA-Z]/g, '');
    if (!letters) return '';
    return letters.charAt(0).toUpperCase() + letters.slice(1).toLowerCase();
  }

  function storeNombreApellido(input) {
    return (input || '').trim().toLowerCase();
  }

  function formatNombreApellidoForDisplay(stored) {
    return (stored || '').trim().split(/\s+/).filter(Boolean).map(function (word) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
  }

  function letterCount(input) {
    return stripAccents((input || '').trim()).replace(/[^a-zA-Z]/g, '').length;
  }

  function isValidUsuario(input) {
    var trimmed = (input || '').trim();
    if (!trimmed || trimmed.indexOf(' ') >= 0) return false;
    if (letterCount(trimmed) > MAX_USUARIO_LETTERS) return false;
    var stripped = stripAccents(trimmed);
    return stripped.length > 0 && /^[a-zA-Z]+$/.test(stripped);
  }

  function isValidNombreApellido(input) {
    return (input || '').trim().length > 0;
  }

  function displayUsuario(user) {
    if (!user) return '';
    if (user.usuario) return user.usuario;
    if (user.nombre) return canonicalUsuario(user.nombre);
    return '';
  }

  window.UsernameNormalizer = {
    MAX_USUARIO_LETTERS: MAX_USUARIO_LETTERS,
    stripAccents: stripAccents,
    normalizeForUniqueness: normalizeForUniqueness,
    canonicalUsuario: canonicalUsuario,
    storeNombreApellido: storeNombreApellido,
    formatNombreApellidoForDisplay: formatNombreApellidoForDisplay,
    letterCount: letterCount,
    isValidUsuario: isValidUsuario,
    isValidNombreApellido: isValidNombreApellido,
    displayUsuario: displayUsuario
  };
})();
