/**
 * Auth web: Firebase Firestore (misma lógica que RegistroActivity/AuthService en Android).
 * Si Firebase no está configurado, usa fallback en localStorage.
 */
(function () {
  var KEY_SESSION = 'ceoclinicos_session';
  var KEY_SESSION_NOMBRE = 'ceoclinicos_session_nombre';
  var KEY_USERS = 'ceoclinicos_users';
  var USERS_COLLECTION = 'users';

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

  // --- Sesión (userId + nombre para mostrar) ---
  function getSession() {
    return localStorage.getItem(KEY_SESSION) || null;
  }
  function getSessionNombre() {
    var n = localStorage.getItem(KEY_SESSION_NOMBRE);
    return n || getSession() || '';
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

  // --- Firestore: usuarios ---
  function usernameExistsFirestore(nombre) {
    var lower = (nombre || '').trim().toLowerCase();
    if (!lower) return Promise.resolve(false);
    return db.collection(USERS_COLLECTION)
      .where('nombreLowercase', '==', lower)
      .limit(1)
      .get()
      .then(function (snap) { return !snap.empty; })
      .catch(function (e) {
        console.warn('usernameExists Firestore', e);
        return false;
      });
  }

  function getUserIdByNombreFirestore(nombre) {
    var lower = (nombre || '').trim().toLowerCase();
    if (!lower) return Promise.resolve(null);
    return db.collection(USERS_COLLECTION)
      .where('nombreLowercase', '==', lower)
      .limit(1)
      .get()
      .then(function (snap) {
        if (snap.empty) return null;
        return snap.docs[0].id;
      })
      .catch(function (e) {
        console.warn('getUserIdByNombre Firestore', e);
        return null;
      });
  }

  function getUserByNombreFirestore(nombre) {
    var lower = (nombre || '').trim().toLowerCase();
    if (!lower) return Promise.resolve(null);
    return db.collection(USERS_COLLECTION)
      .where('nombreLowercase', '==', lower)
      .limit(1)
      .get()
      .then(function (snap) {
        if (snap.empty) return null;
        return snap.docs[0].data();
      })
      .catch(function (e) {
        console.warn('getUserByNombre Firestore', e);
        return null;
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

  // --- Register con Firebase ---
  function registerFirestore(nombre, password, data) {
    var u = (nombre || '').trim();
    if (!u || !password) return Promise.resolve({ ok: false, msg: 'Nombre y contraseña obligatorios.' });
    if (u.indexOf(' ') >= 0) return Promise.resolve({ ok: false, msg: 'El nombre no puede contener espacios.' });
    if (password.length < 4) return Promise.resolve({ ok: false, msg: 'La contraseña debe tener al menos 4 caracteres.' });

    return usernameExistsFirestore(u).then(function (exists) {
      if (exists) return { ok: false, msg: 'Ese nombre de usuario ya existe.' };
      return hashPassword(password).then(function (passwordHash) {
        return getNextUserIdNumber().then(function (nextId) {
          var userId = String(nextId);
          var now = firebaseTimestamp.now();
          var profile = {
            nombre: u,
            nombreLowercase: u.toLowerCase(),
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
            setSession(userId, u);
            return { ok: true, username: u, userId: userId };
          }).catch(function (e) {
            console.warn('register Firestore set', e);
            return { ok: false, msg: 'Error al crear la cuenta. Revisa la consola.' };
          });
        });
      });
    });
  }

  // --- Login con Firebase ---
  function loginFirestore(nombre, password) {
    var u = (nombre || '').trim();
    if (!u || !password) return Promise.resolve({ ok: false, msg: 'Nombre y contraseña obligatorios.' });

    return getUserByNombreFirestore(u).then(function (user) {
      if (!user) return { ok: false, msg: 'Usuario o contraseña incorrectos.' };
      if (!user.passwordHash) return { ok: false, msg: 'Usuario o contraseña incorrectos.' };
      return hashPassword(password).then(function (hash) {
        if (user.passwordHash !== hash) return { ok: false, msg: 'Usuario o contraseña incorrectos.' };
        return getUserIdByNombreFirestore(u).then(function (userId) {
          if (!userId) return { ok: false, msg: 'Error al obtener la cuenta.' };
          setSession(userId, user.nombre || u);
          return { ok: true, username: user.nombre || u, userId: userId };
        });
      });
    });
  }

  // --- Cargar datos de usuario desde Firebase ---
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
  function registerLocal(nombre, password, data) {
    var u = (nombre || '').trim();
    if (!u || !password) return { ok: false, msg: 'Nombre y contraseña obligatorios.' };
    if (u.indexOf(' ') >= 0) return { ok: false, msg: 'El nombre no puede contener espacios.' };
    if (password.length < 4) return { ok: false, msg: 'La contraseña debe tener al menos 4 caracteres.' };
    var users = _getUsersLocal();
    var key = Object.keys(users).find(function (k) { return k.toLowerCase() === u.toLowerCase(); });
    if (key) return { ok: false, msg: 'Ese nombre de usuario ya existe.' };
    users[u] = {
      password: password,
      pildoras: 0,
      temasUnlock: [],
      edad: (data && data.edad) || '',
      sexo: (data && data.sexo) || '',
      profesion: (data && data.profesion) || '',
      pais: (data && data.pais) || '',
      instagram: (data && data.instagram) || ''
    };
    _saveUsersLocal(users);
    setSession(u, u);
    return { ok: true, username: u };
  }
  function loginLocal(nombre, password) {
    var u = (nombre || '').trim();
    if (!u || !password) return { ok: false, msg: 'Nombre y contraseña obligatorios.' };
    var users = _getUsersLocal();
    var key = Object.keys(users).find(function (k) { return k.toLowerCase() === u.toLowerCase(); });
    if (!key || users[key].password !== password) return { ok: false, msg: 'Usuario o contraseña incorrectos.' };
    setSession(key, key);
    return { ok: true, username: key };
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

  // --- API pública ---
  var useFirebase = initFirebase();

  window.AuthService = {
    useFirebase: function () { return useFirebase; },
    getSession: getSession,
    getSessionNombre: getSessionNombre,
    clearSession: clearSession,

    register: function (nombre, password, data) {
      if (useFirebase) return registerFirestore(nombre, password, data);
      return Promise.resolve(registerLocal(nombre, password, data));
    },
    login: function (nombre, password) {
      if (useFirebase) return loginFirestore(nombre, password);
      return Promise.resolve(loginLocal(nombre, password));
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
