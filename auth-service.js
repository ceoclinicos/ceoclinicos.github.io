/**
 * Auth web: Firebase Firestore (misma lógica que RegistroActivity/AuthService en Android).
 * Si Firebase no está configurado, usa fallback en localStorage.
 */
(function () {
  var KEY_SESSION = 'ceoclinicos_session';
  var KEY_SESSION_NOMBRE = 'ceoclinicos_session_nombre';
  var KEY_USERS = 'ceoclinicos_users';
  var USERS_COLLECTION = 'users';
  var N = window.UsernameNormalizer;

  var db = null;
  var firebaseTimestamp = null;

  function initFirebase() {
    if (db) return true;
    if (typeof firebase === 'undefined' || !window.FIREBASE_CONFIG || !window.FIREBASE_CONFIG.apiKey) return false;
    try {
      if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(window.FIREBASE_CONFIG);
      }
      db = firebase.firestore();
      firebaseTimestamp = firebase.firestore.Timestamp;
      return true;
    } catch (e) {
      console.warn('AuthService: Firebase no disponible', e);
      return false;
    }
  }

  function hashPassword(password) {
    return new Promise(function (resolve) {
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        var enc = new TextEncoder();
        crypto.subtle.digest('SHA-256', enc.encode(password)).then(function (buf) {
          var arr = new Uint8Array(buf);
          var hex = '';
          for (var i = 0; i < arr.length; i++) hex += ('0' + arr[i].toString(16)).slice(-2);
          resolve(hex);
        }).catch(function () { resolve(''); });
      } else {
        resolve('');
      }
    });
  }

  function getSession() {
    return localStorage.getItem(KEY_SESSION) || null;
  }
  function getSessionNombre() {
    var n = localStorage.getItem(KEY_SESSION_NOMBRE);
    return n || '';
  }
  function setSession(userId, nombre) {
    if (userId) {
      localStorage.setItem(KEY_SESSION, userId);
      if (nombre != null) localStorage.setItem(KEY_SESSION_NOMBRE, nombre);
    } else {
      localStorage.removeItem(KEY_SESSION);
      localStorage.removeItem(KEY_SESSION_NOMBRE);
    }
  }
  function clearSession() {
    setSession(null);
  }

  function queryFirst(field, value) {
    if (!value) return Promise.resolve(null);
    return db.collection(USERS_COLLECTION)
      .where(field, '==', value)
      .limit(1)
      .get()
      .then(function (snap) {
        return snap.empty ? null : snap.docs[0];
      })
      .catch(function (e) {
        console.warn('queryFirst', field, e);
        return null;
      });
  }

  function findUserDocByLoginInput(usuarioInput) {
    var trimmed = (usuarioInput || '').trim();
    if (!trimmed || !N) return Promise.resolve(null);

    var norm = N.normalizeForUniqueness(trimmed);
    var rawLower = trimmed.toLowerCase();
    var canonical = N.canonicalUsuario(trimmed);

    function chain() {
      if (norm) {
        return queryFirst('usuarioNormalizado', norm).then(function (doc) {
          if (doc) return doc;
          return queryFirst('nombreLowercase', norm);
        }).then(function (doc) {
          if (doc) return doc;
          if (rawLower !== norm) {
            return queryFirst('nombreLowercase', rawLower);
          }
          return null;
        }).then(function (doc) {
          if (doc) return doc;
          if (!canonical) return null;
          return queryFirst('usuario', canonical).then(function (d) {
            if (d) return d;
            return queryFirst('nombre', canonical);
          });
        }).then(function (doc) {
          if (doc) return doc;
          return db.collection(USERS_COLLECTION)
            .where('nombreLowercase', '==', rawLower)
            .limit(5)
            .get()
            .then(function (snap) {
              for (var i = 0; i < snap.docs.length; i++) {
                var d = snap.docs[i];
                var existing = d.get('nombre') || '';
                if (existing.toLowerCase() === rawLower ||
                    N.normalizeForUniqueness(existing) === norm) {
                  return d;
                }
              }
              return null;
            });
        });
      }
      return Promise.resolve(null);
    }

    return chain().catch(function (e) {
      console.warn('findUserDocByLoginInput', e);
      return null;
    });
  }

  function usernameExistsFirestore(usuarioInput) {
    return findUserDocByLoginInput(usuarioInput).then(function (doc) { return !!doc; });
  }

  function getUserIdByLoginInput(usuarioInput) {
    return findUserDocByLoginInput(usuarioInput).then(function (doc) {
      return doc ? doc.id : null;
    });
  }

  function getUserByLoginInput(usuarioInput) {
    return findUserDocByLoginInput(usuarioInput).then(function (doc) {
      return doc ? doc.data() : null;
    });
  }

  function getNextUserIdNumber() {
    return db.collection(USERS_COLLECTION)
      .orderBy(firebase.firestore.FieldPath.documentId(), 'desc')
      .limit(1)
      .get()
      .then(function (snap) {
        if (snap.empty) return 1;
        var id = snap.docs[0].id;
        var n = parseInt(id, 10);
        return (isNaN(n) ? 0 : n) + 1;
      })
      .catch(function () { return Math.max(1, Math.floor(Date.now() / 1000000) % 100000); });
  }

  function getUserProfileFirestore(userId) {
    if (!userId) return Promise.resolve(null);
    return db.collection(USERS_COLLECTION).doc(userId).get()
      .then(function (doc) { return doc.exists ? doc.data() : null; })
      .catch(function (e) {
        console.warn('getUserProfile Firestore', e);
        return null;
      });
  }

  function saveUserProfileFirestore(userId, data) {
    if (!userId || !data) return Promise.resolve(false);
    var ref = db.collection(USERS_COLLECTION).doc(userId);
    var update = {
      totalPills: data.totalPills != null ? data.totalPills : 0,
      unlockedThemes: Array.isArray(data.unlockedThemes) ? data.unlockedThemes : [],
      lastActivity: firebaseTimestamp.now()
    };
    return ref.update(update).then(function () { return true; }).catch(function (e) {
      if (e && e.code === 5) {
        return ref.set(update, { merge: true }).then(function () { return true; });
      }
      console.warn('saveUserProfile Firestore', e);
      return false;
    });
  }

  function registerFirestore(usuarioInput, password, data) {
    if (!N) return Promise.resolve({ ok: false, msg: 'Normalizador no cargado.' });
    var raw = (usuarioInput || '').trim();
    var nombreApellidoRaw = (data && data.nombreApellido) ? String(data.nombreApellido) : '';

    if (!raw || !password) return Promise.resolve({ ok: false, msg: 'Usuario y contraseña obligatorios.' });
    if (!N.isValidNombreApellido(nombreApellidoRaw)) {
      return Promise.resolve({ ok: false, msg: 'Nombre y apellido obligatorio.' });
    }
    if (!N.isValidUsuario(raw)) {
      return Promise.resolve({ ok: false, msg: 'Usuario inválido: solo letras, sin espacios, máximo 25 letras.' });
    }
    if (password.length < 4) {
      return Promise.resolve({ ok: false, msg: 'La contraseña debe tener al menos 4 caracteres.' });
    }

    var usuario = N.canonicalUsuario(raw);
    var usuarioNorm = N.normalizeForUniqueness(raw);
    var nombreApellido = N.storeNombreApellido(nombreApellidoRaw);

    return usernameExistsFirestore(raw).then(function (exists) {
      if (exists) {
        return { ok: false, msg: 'El usuario "' + usuario + '" ya está registrado. Inicia sesión u elige otro.' };
      }
      return hashPassword(password).then(function (passwordHash) {
        return getNextUserIdNumber().then(function (nextId) {
          var userId = String(nextId);
          var now = firebaseTimestamp.now();
          var profile = {
            nombre: usuario,
            nombreLowercase: usuarioNorm,
            usuario: usuario,
            usuarioNormalizado: usuarioNorm,
            nombreApellido: nombreApellido,
            passwordHash: passwordHash,
            edad: (data && data.edad) ? parseInt(data.edad, 10) || 0 : 0,
            sexo: (data && data.sexo) || '',
            profesion: (data && data.profesion) || '',
            pais: (data && data.pais) || '',
            instagram: (data && data.instagram) || '',
            userId: userId,
            level: 1,
            totalPills: 0,
            totalCorrectAnswers: 0,
            puntosMes: 0,
            puntosJugador: 0,
            joinDate: now,
            lastActivity: now,
            unlockedThemes: []
          };
          return db.collection(USERS_COLLECTION).doc(userId).set(profile).then(function () {
            setSession(userId, usuario);
            return { ok: true, username: usuario, userId: userId };
          }).catch(function (e) {
            console.warn('register Firestore set', e);
            return { ok: false, msg: 'Error al crear la cuenta. Revisa la consola.' };
          });
        });
      });
    });
  }

  function loginFirestore(usuarioInput, password) {
    var u = (usuarioInput || '').trim();
    if (!u || !password) return Promise.resolve({ ok: false, msg: 'Usuario y contraseña obligatorios.' });

    return getUserByLoginInput(u).then(function (user) {
      if (!user) return { ok: false, msg: 'Usuario o contraseña incorrectos.' };
      if (!user.passwordHash) return { ok: false, msg: 'Usuario o contraseña incorrectos.' };
      return hashPassword(password).then(function (hash) {
        if (user.passwordHash !== hash) return { ok: false, msg: 'Usuario o contraseña incorrectos.' };
        return getUserIdByLoginInput(u).then(function (userId) {
          if (!userId) return { ok: false, msg: 'Error al obtener la cuenta.' };
          var display = N ? N.displayUsuario(user) : (user.usuario || user.nombre || u);
          setSession(userId, display);
          return { ok: true, username: display, userId: userId };
        });
      });
    });
  }

  function loadUserDataFromFirestore() {
    var userId = getSession();
    if (!userId || !window.PildorasService) return Promise.resolve();
    return getUserProfileFirestore(userId).then(function (profile) {
      if (!profile) return;
      var pills = profile.totalPills != null ? profile.totalPills : 0;
      var themes = Array.isArray(profile.unlockedThemes) ? profile.unlockedThemes : [];
      PildorasService.setPildoras(pills);
      PildorasService.setUnlockedThemeIds(themes);
    });
  }

  function saveCurrentUserDataToFirestore() {
    var userId = getSession();
    if (!userId || !window.PildorasService) return Promise.resolve();
    return saveUserProfileFirestore(userId, {
      totalPills: PildorasService.get(),
      unlockedThemes: PildorasService.getUnlockedThemeIds()
    });
  }

  // --- Fallback localStorage ---
  function _getUsersLocal() {
    try {
      var raw = localStorage.getItem(KEY_USERS);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }
  function _saveUsersLocal(users) {
    localStorage.setItem(KEY_USERS, JSON.stringify(users));
  }

  function findLocalUserKey(usuarioInput) {
    var norm = N.normalizeForUniqueness(usuarioInput);
    var users = _getUsersLocal();
    return Object.keys(users).find(function (k) {
      var u = users[k];
      var keyNorm = u.usuarioNormalizado || N.normalizeForUniqueness(k);
      return keyNorm === norm || k.toLowerCase() === (usuarioInput || '').trim().toLowerCase();
    }) || null;
  }

  function registerLocal(usuarioInput, password, data) {
    if (!N) return { ok: false, msg: 'Normalizador no cargado.' };
    var raw = (usuarioInput || '').trim();
    var nombreApellidoRaw = (data && data.nombreApellido) ? String(data.nombreApellido) : '';

    if (!raw || !password) return { ok: false, msg: 'Usuario y contraseña obligatorios.' };
    if (!N.isValidNombreApellido(nombreApellidoRaw)) {
      return { ok: false, msg: 'Nombre y apellido obligatorio.' };
    }
    if (!N.isValidUsuario(raw)) {
      return { ok: false, msg: 'Usuario inválido: solo letras, sin espacios, máximo 25 letras.' };
    }
    if (password.length < 4) {
      return { ok: false, msg: 'La contraseña debe tener al menos 4 caracteres.' };
    }

    var usuario = N.canonicalUsuario(raw);
    var usuarioNorm = N.normalizeForUniqueness(raw);
    if (findLocalUserKey(raw)) {
      return { ok: false, msg: 'El usuario "' + usuario + '" ya existe.' };
    }

    var users = _getUsersLocal();
    users[usuario] = {
      password: password,
      usuario: usuario,
      usuarioNormalizado: usuarioNorm,
      nombreApellido: N.storeNombreApellido(nombreApellidoRaw),
      pildoras: 0,
      temasUnlock: [],
      edad: (data && data.edad) || '',
      sexo: (data && data.sexo) || '',
      profesion: (data && data.profesion) || '',
      pais: (data && data.pais) || '',
      instagram: (data && data.instagram) || ''
    };
    _saveUsersLocal(users);
    setSession(usuario, usuario);
    return { ok: true, username: usuario };
  }

  function loginLocal(usuarioInput, password) {
    var u = (usuarioInput || '').trim();
    if (!u || !password) return { ok: false, msg: 'Usuario y contraseña obligatorios.' };
    var key = findLocalUserKey(u);
    if (!key) return { ok: false, msg: 'Usuario o contraseña incorrectos.' };
    var users = _getUsersLocal();
    var entry = users[key];
    if (!entry || entry.password !== password) {
      return { ok: false, msg: 'Usuario o contraseña incorrectos.' };
    }
    var display = entry.usuario || key;
    setSession(key, display);
    return { ok: true, username: display };
  }

  function getUserDataLocal() {
    var session = getSession();
    if (!session) return null;
    var users = _getUsersLocal();
    var u = users[session];
    return u ? { pildoras: u.pildoras || 0, temasUnlock: u.temasUnlock || [] } : null;
  }
  function loadUserDataLocal() {
    var data = getUserDataLocal();
    if (!data || !window.PildorasService) return;
    PildorasService.setPildoras(data.pildoras);
    PildorasService.setUnlockedThemeIds(data.temasUnlock || []);
  }
  function saveCurrentUserDataLocal() {
    var session = getSession();
    if (!session || !window.PildorasService) return;
    var users = _getUsersLocal();
    var u = users[session];
    if (!u) return;
    u.pildoras = PildorasService.get();
    u.temasUnlock = PildorasService.getUnlockedThemeIds();
    _saveUsersLocal(users);
  }

  var useFirebase = initFirebase();

  window.AuthService = {
    useFirebase: function () { return useFirebase; },
    getSession: getSession,
    getSessionNombre: getSessionNombre,
    clearSession: clearSession,

    register: function (usuarioInput, password, data) {
      if (useFirebase) return registerFirestore(usuarioInput, password, data);
      return Promise.resolve(registerLocal(usuarioInput, password, data));
    },
    login: function (usuarioInput, password) {
      if (useFirebase) return loginFirestore(usuarioInput, password);
      return Promise.resolve(loginLocal(usuarioInput, password));
    },
    loadUserDataIntoApp: function () {
      if (useFirebase) return loadUserDataFromFirestore();
      loadUserDataLocal();
      return Promise.resolve();
    },
    saveCurrentUserDataToStorage: function () {
      if (useFirebase) return saveCurrentUserDataToFirestore();
      saveCurrentUserDataLocal();
      return Promise.resolve();
    }
  };
})();
