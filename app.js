(function () {
  var grid = document.getElementById('materias-grid');

  // Fallback si no se puede cargar questions/es/categories.json
  var MATERIAS_FALLBACK = [
    'General', 'Anatomía', 'Cardiología', 'Cirugía', 'Embriología', 'Fisiología',
    'Fisiopatología', 'Gastroenterología', 'Gineco-Obstetricia', 'Histología',
    'Medicina Interna', 'Neurología', 'Neumonología', 'Odontología', 'Oftalmología',
    'Pediatría', 'Psiquiatría', 'Traumatología', 'Urología', 'Microbiología',
    'Otorrinolaringología', 'Endocrinología', 'Farmacología', 'Parasitología', 'Verdadero/Falso'
  ];

  function renderMateriasInicio(list) {
    if (!grid) return;
    var items = Array.isArray(list) && list.length ? list : MATERIAS_FALLBACK.map(function (n) { return { name: n }; });
    grid.innerHTML = '';
    items.forEach(function (item) {
      var nombre = typeof item === 'string' ? item : (item.name || item.id || '');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'materia-card materia-btn';
      btn.setAttribute('data-page-link', 'quiz-materia');
      if (item && item.id) btn.setAttribute('data-category-id', item.id);
      btn.innerHTML = '<p class="materia-titulo">' + escapeHtml(nombre) + '</p>';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var catId = item.id || (nombre === 'Verdadero/Falso' ? 'true_false_general' : slugFromName(nombre));
        window.selectedQuizCategory = { id: catId, name: nombre };
        showPage('quiz-materia');
        if (typeof updateQuizMateriaPage === 'function') updateQuizMateriaPage();
        location.hash = 'quiz-materia';
        return false;
      });
      grid.appendChild(btn);
    });
  }

  function loadMateriasFromCategories() {
    var url = window.ContentPaths && ContentPaths.categoriesList ? ContentPaths.categoriesList('es') : '';
    if (!url) {
      renderMateriasInicio(null);
      return;
    }
    fetch(url)
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (data) {
        var list = Array.isArray(data) ? data : (data.categories || data.items || []);
        renderMateriasInicio(list);
      })
      .catch(function () { renderMateriasInicio(null); });
  }

  if (grid) loadMateriasFromCategories();

  function updatePillsDisplay() {
    var el = document.getElementById('pills-count');
    if (el && window.PildorasService) el.textContent = PildorasService.get();
  }
  if (window.PildorasService) {
    PildorasService.onUpdate(updatePillsDisplay);
    updatePillsDisplay();
    if (window.AuthService) {
      PildorasService.onUpdate(function () { AuthService.saveCurrentUserDataToStorage(); });
    }
  }
  window.updatePillsDisplay = updatePillsDisplay;

  function updateTopBarAuth() {
    var userEl = document.getElementById('topbar-user');
    var btnLogin = document.getElementById('btn-open-login');
    var btnRegister = document.getElementById('btn-open-register');
    var btnLogout = document.getElementById('btn-logout');
    if (!userEl || !btnLogin || !btnRegister || !btnLogout) return;
    var session = window.AuthService ? (AuthService.getSessionNombre && AuthService.getSessionNombre()) || AuthService.getSession() : null;
    if (session) {
      userEl.textContent = 'Hola, ' + session;
      userEl.style.display = 'inline';
      btnLogin.style.display = 'none';
      btnRegister.style.display = 'none';
      btnLogout.style.display = 'block';
    } else {
      userEl.style.display = 'none';
      btnLogin.style.display = 'block';
      btnRegister.style.display = 'block';
      btnLogout.style.display = 'none';
    }
  }

  // Menú desplegable de 3 puntos (auth)
  var btnAuthMenu = document.getElementById('btn-auth-menu');
  var authDropdown = document.getElementById('auth-dropdown');
  if (btnAuthMenu && authDropdown) {
    btnAuthMenu.addEventListener('click', function (e) {
      e.stopPropagation();
      authDropdown.classList.toggle('open');
    });
    document.addEventListener('click', function () {
      authDropdown.classList.remove('open');
    });
    authDropdown.addEventListener('click', function () {
      authDropdown.classList.remove('open');
    });
  }
  if (window.AuthService) {
    var loadPromise = AuthService.loadUserDataIntoApp && AuthService.loadUserDataIntoApp();
    if (loadPromise && typeof loadPromise.then === 'function') {
      loadPromise.then(function () { updateTopBarAuth(); if (window.updatePillsDisplay) updatePillsDisplay(); });
    } else {
      updateTopBarAuth();
    }
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function slugFromName(name) {
    return (name || '').toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
      .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u').replace(/ñ/g, 'n');
  }

  var navLinks = document.querySelectorAll('.nav-link');
  var pages = document.querySelectorAll('.page');

  function showPage(id) {
    document.body.classList.remove('quiz-active');
    var qv = document.getElementById('quiz-view');
    var qf = document.getElementById('quiz-final');
    if (qv) qv.classList.remove('visible');
    if (qf) qf.classList.remove('visible');
    pages.forEach(function (p) {
      p.classList.toggle('active', p.id === id);
    });
    navLinks.forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-page') === id);
    });
    if (id === 'estudiar' && typeof loadGuias === 'function') loadGuias();
  }

  navLinks.forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var page = a.getAttribute('data-page');
      showPage(page);
      location.hash = page;
    });
  });

  window.addEventListener('hashchange', function () {
    var id = (location.hash || '#inicio').slice(1) || 'inicio';
    var valid = ['inicio', 'estudiar', 'ia', 'quiz-materia'].indexOf(id) !== -1;
    showPage(valid ? id : 'inicio');
    if (valid && id === 'estudiar' && typeof loadGuias === 'function') loadGuias();
    if (valid && id === 'quiz-materia' && typeof updateQuizMateriaPage === 'function') updateQuizMateriaPage();
  });

  if (location.hash) {
    var id = location.hash.slice(1);
    if (['inicio', 'estudiar', 'ia', 'quiz-materia'].indexOf(id) !== -1) showPage(id);
    if (id === 'quiz-materia' && typeof updateQuizMateriaPage === 'function') updateQuizMateriaPage();
  }

  // --- Estudiar: solo guías ---
  var guiasGrid = document.getElementById('guias-grid');

  function renderGuiasGrid(guias) {
    if (!guiasGrid) return;
    guiasGrid.innerHTML = '';
    (guias || []).forEach(function (g) {
      var card = document.createElement('a');
      card.className = 'guia-card';
      card.href = g.url || '#';
      if (g.url) {
        card.target = '_blank';
        card.rel = 'noopener';
      }
      card.innerHTML =
        '<p class="guia-titulo">' + escapeHtml(g.titulo) + '</p>' +
        '<p class="guia-desc">' + escapeHtml(g.descripcion || '') + '</p>' +
        '<span class="guia-descarga">Descargar PDF</span>';
      guiasGrid.appendChild(card);
    });
  }

  function loadGuias() {
    var base = window.ContentPaths ? ContentPaths.guiasCatalog() : '';
    if (!base) {
      renderGuiasGrid([]);
      return;
    }
    var url = base + (base.indexOf('?') === -1 ? '?' : '&') + 't=' + Date.now();
    fetch(url)
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error(r.status)); })
      .then(function (data) {
        var list = (data && data.guias) ? data.guias : [];
        window.GUIAS_DATA = list;
        renderGuiasGrid(list);
      })
      .catch(function () {
        window.GUIAS_DATA = [];
        renderGuiasGrid([]);
        if (guiasGrid) {
          var msg = document.createElement('p');
          msg.className = 'favoritos-empty';
          msg.textContent = 'No se pudieron cargar las guías. Si abriste la página desde el disco (file://), usa un servidor local: en la carpeta website_clinicos ejecuta "npx serve" o "python -m http.server 8080" y entra en http://localhost:8080';
          msg.style.marginTop = '16px';
          guiasGrid.appendChild(msg);
        }
      });
  }

  // --- Quiz (alineado con app: QuizActivity + QuestionFileManager/JsonUtil)
  // App: MainActivity en app/src/main/java/com/ceoclinicos/MainActivity.kt
  //      QuizActivity en app/src/main/java/com/ceoclinicos/QuizActivity.kt
  // Rutas: categorías = questions/{lang}/categories/{id}_questions.json (QuestionFileManager.getQuestionFilePath)
  //        temas = temas/{lang}/{topicId}_questions.json (getTopicQuestionFileName). correctAnswer 1-based.
  var quizQuestions = [];
  var quizTema = null;
  var quizIndex = 0;
  var quizScore = 0;
  var quizAnswered = false;
  var quizTotal = 10;

  function shuffleArray(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function updateQuizMateriaPage() {
    var titleEl = document.getElementById('quiz-materia-title');
    var subtitleEl = document.getElementById('quiz-materia-subtitle');
    var btnJugar = document.getElementById('quiz-materia-btn-jugar');
    var fileWarning = document.getElementById('quiz-file-warning');
    var cat = window.selectedQuizCategory;
    if (titleEl) titleEl.textContent = 'Quiz';
    if (subtitleEl) subtitleEl.textContent = cat ? 'Preguntas al azar de ' + cat.name + '. Pulsa Jugar para empezar.' : 'Elige una materia en Inicio para jugar.';
    if (btnJugar) btnJugar.style.display = cat ? 'inline-block' : 'none';
    if (fileWarning) {
      var isFile = window.location.protocol === 'file:';
      fileWarning.setAttribute('aria-hidden', !isFile);
      fileWarning.style.display = isFile ? 'block' : 'none';
    }
  }

  function startQuizWithQuestions(list, temaObj) {
    quizTema = temaObj;
    quizQuestions = list;
    quizIndex = 0;
    quizScore = 0;
    document.body.classList.add('quiz-active');
    document.getElementById('quiz-view').classList.add('visible');
    document.getElementById('quiz-final').classList.remove('visible');
    displayQuizQuestion();
  }

  function getCategoryQuestionsUrl(categoryId) {
    if (!window.ContentPaths) return '';
    return ContentPaths.categoryQuestions(categoryId, 'es');
  }

  document.getElementById('quiz-materia-btn-jugar').addEventListener('click', function () {
    var cat = window.selectedQuizCategory;
    if (!cat || !cat.id) {
      alert('Elige una materia en Inicio.');
      return;
    }
    var url = getCategoryQuestionsUrl(cat.id);
    if (!url) {
      alert('No se puede cargar el quiz para esta materia.');
      return;
    }
    fetch(url)
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error(r.status + ' ' + r.statusText)); })
      .then(function (data) {
        var list = data.questions || (Array.isArray(data) ? data : []);
        if (list.length === 0) {
          alert('No hay preguntas para esta materia.');
          return;
        }
        list = shuffleArray(list);
        var take = Math.min(10, list.length);
        startQuizWithQuestions(list.slice(0, take), { id: cat.id, titulo: cat.name });
      })
      .catch(function (err) {
        var msg = 'Error al cargar las preguntas.';
        if (window.location.protocol === 'file:') {
          msg += ' Los navegadores no permiten cargar archivos locales (file://). Abre la carpeta website_clinicos en la terminal y ejecuta: npx serve . (o python -m http.server 8080) y entra en http://localhost:3000 (o :8080).';
        } else {
          msg += ' Comprueba que exista: ' + url;
          if (err && err.message) msg += ' (' + err.message + ')';
        }
        alert(msg);
      });
  });

  document.getElementById('quiz-materia-volver').addEventListener('click', function (e) {
    e.preventDefault();
    showPage('inicio');
    location.hash = 'inicio';
  });

  function startQuiz(tema) {
    var url = window.ContentPaths ? ContentPaths.temaQuestions(tema.id, 'es') : '';
    if (!url) {
      alert('No se puede cargar el quiz para este tema.');
      return;
    }
    fetch(url)
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (data) {
        var list = data.questions || (Array.isArray(data) ? data : []);
        if (list.length === 0) {
          alert('No hay preguntas para este tema.');
          return;
        }
        list = shuffleArray(list);
        var take = Math.min(10, list.length);
        startQuizWithQuestions(list.slice(0, take), tema);
      })
      .catch(function () {
        var msg = 'Error al cargar las preguntas.';
        if (window.location.protocol === 'file:') {
          msg += ' Abre la web con un servidor local (npx serve o python -m http.server 8080).';
        } else {
          msg += ' Comprueba que exista temas/es/' + tema.id + '_questions.json';
        }
        alert(msg);
      });
  }

  function displayQuizQuestion() {
    var q = quizQuestions[quizIndex];
    if (!q) return;
    document.getElementById('quiz-tema-label').textContent = quizTema ? quizTema.titulo : 'Quiz';
    document.getElementById('quiz-counter').textContent = (quizIndex + 1) + ' / ' + quizQuestions.length;
    document.getElementById('quiz-question').textContent = q.question || '';
    var opts = document.getElementById('quiz-options');
    opts.innerHTML = '';
    var feedback = document.getElementById('quiz-feedback');
    feedback.setAttribute('aria-hidden', 'true');
    feedback.classList.remove('visible');
    var options = q.options || [];
    options.forEach(function (text, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quiz-option';
      btn.textContent = text;
      btn.dataset.index = i;
      btn.addEventListener('click', function () {
        if (quizAnswered) return;
        quizAnswered = true;
        var correctIdx = (q.correctAnswer || 1) - 1;
        var isCorrect = i === correctIdx;
        if (isCorrect) quizScore++;
        btn.classList.add(isCorrect ? 'correct' : 'incorrect');
        var optEls = opts.querySelectorAll('.quiz-option');
        for (var j = 0; j < optEls.length; j++) {
          optEls[j].disabled = true;
          if (j === correctIdx && j !== i) optEls[j].classList.add('correct');
        }
        var msg = document.getElementById('quiz-feedback-msg');
        var expl = document.getElementById('quiz-feedback-explicacion');
        msg.textContent = isCorrect ? 'Correcto' : 'Incorrecto';
        msg.className = 'quiz-feedback-msg ' + (isCorrect ? 'correct' : 'incorrect');
        expl.textContent = q.explanation || '';
        feedback.setAttribute('aria-hidden', 'false');
        feedback.classList.add('visible');
      });
      opts.appendChild(btn);
    });
    quizAnswered = false;
  }

  document.getElementById('quiz-btn-siguiente').addEventListener('click', function () {
    if (quizIndex < quizQuestions.length - 1) {
      quizIndex++;
      displayQuizQuestion();
    } else {
      showQuizFinal();
    }
  });

  function showQuizFinal() {
    document.getElementById('quiz-view').classList.remove('visible');
    document.getElementById('quiz-final').classList.add('visible');
    document.getElementById('quiz-final-score').textContent = quizScore + ' / ' + quizQuestions.length;
    var msg = document.getElementById('quiz-final-mensaje');
    if (quizScore >= 6) msg.textContent = '¡Bien hecho!';
    else if (quizScore >= 4) msg.textContent = 'Sigue practicando.';
    else msg.textContent = 'Repasa el tema.';
    if (window.PildorasService) PildorasService.add(quizScore);
    if (window.updatePillsDisplay) updatePillsDisplay();
  }

  document.getElementById('quiz-final-reintentar').addEventListener('click', function () {
    document.getElementById('quiz-final').classList.remove('visible');
    document.getElementById('quiz-view').classList.add('visible');
    quizIndex = 0;
    quizScore = 0;
    displayQuizQuestion();
  });

  document.getElementById('quiz-final-salir').addEventListener('click', function () {
    showPage('inicio');
    location.hash = 'inicio';
  });

  document.getElementById('quiz-btn-salir').addEventListener('click', function () {
    showPage('inicio');
    location.hash = 'inicio';
  });

  // --- Auth: Login / Registro (como RegistroActivity) ---
  var authOverlay = document.getElementById('auth-overlay');
  var authPanel = document.getElementById('auth-panel');
  var authWarning = document.getElementById('auth-warning');
  var authTabRegistro = document.getElementById('auth-tab-registro');
  var authTabLogin = document.getElementById('auth-tab-login');
  var authSeccionRegistro = document.getElementById('auth-seccion-registro');
  var authSeccionLogin = document.getElementById('auth-seccion-login');

  function openAuth(tab) {
    authOverlay.classList.add('visible');
    authPanel.classList.add('visible');
    authOverlay.setAttribute('aria-hidden', 'false');
    authPanel.setAttribute('aria-hidden', 'false');
    authWarning.classList.remove('visible');
    authWarning.textContent = '';
    if (tab === 'registro') {
      authTabRegistro.classList.add('active');
      authTabLogin.classList.remove('active');
      authSeccionRegistro.classList.remove('hidden');
      authSeccionLogin.classList.add('hidden');
    } else {
      authTabLogin.classList.add('active');
      authTabRegistro.classList.remove('active');
      authSeccionLogin.classList.remove('hidden');
      authSeccionRegistro.classList.add('hidden');
    }
  }
  function closeAuth() {
    authOverlay.classList.remove('visible');
    authPanel.classList.remove('visible');
    authOverlay.setAttribute('aria-hidden', 'true');
    authPanel.setAttribute('aria-hidden', 'true');
  }

  document.getElementById('btn-open-login').addEventListener('click', function () { openAuth('login'); });
  document.getElementById('btn-open-register').addEventListener('click', function () { openAuth('registro'); });
  authOverlay.addEventListener('click', closeAuth);
  document.getElementById('auth-btn-cerrar').addEventListener('click', closeAuth);

  authTabRegistro.addEventListener('click', function () { openAuth('registro'); });
  authTabLogin.addEventListener('click', function () { openAuth('login'); });

  var edadSelect = document.getElementById('auth-edad');
  for (var i = 15; i <= 80; i++) {
    var opt = document.createElement('option');
    opt.value = i;
    opt.textContent = i;
    edadSelect.appendChild(opt);
  }

  function isValidUsername(nombre) {
    var t = nombre.trim();
    return t.length > 0 && t.indexOf(' ') === -1;
  }

  function validarRegistro() {
    var nombre = document.getElementById('auth-nombre').value.trim();
    var password = document.getElementById('auth-password').value;
    var edad = document.getElementById('auth-edad').value;
    var sexoM = document.getElementById('auth-sexo-m').checked;
    var sexoF = document.getElementById('auth-sexo-f').checked;
    var profesion = document.getElementById('auth-profesion').value;
    var pais = document.getElementById('auth-pais').value;
    var ok = true;
    authWarning.classList.remove('visible');
    document.getElementById('auth-nombre').classList.remove('error');
    document.getElementById('auth-password').classList.remove('error');
    if (!nombre) {
      authWarning.textContent = 'El nombre es obligatorio.';
      authWarning.classList.add('visible');
      document.getElementById('auth-nombre').classList.add('error');
      ok = false;
    } else if (!isValidUsername(nombre)) {
      authWarning.textContent = 'El nombre no puede contener espacios.';
      authWarning.classList.add('visible');
      document.getElementById('auth-nombre').classList.add('error');
      ok = false;
    }
    if (!password) {
      authWarning.textContent = (authWarning.textContent || '') + ' La contraseña es obligatoria.';
      authWarning.classList.add('visible');
      document.getElementById('auth-password').classList.add('error');
      ok = false;
    } else if (password.length < 4) {
      authWarning.textContent = 'La contraseña debe tener al menos 4 caracteres.';
      authWarning.classList.add('visible');
      document.getElementById('auth-password').classList.add('error');
      ok = false;
    }
    if (!edad) {
      authWarning.textContent = (authWarning.textContent || '') + ' Selecciona tu edad.';
      authWarning.classList.add('visible');
      ok = false;
    }
    if (!sexoM && !sexoF) {
      authWarning.textContent = (authWarning.textContent || '') + ' Selecciona sexo.';
      authWarning.classList.add('visible');
      ok = false;
    }
    if (!profesion) {
      authWarning.textContent = (authWarning.textContent || '') + ' Selecciona profesión.';
      authWarning.classList.add('visible');
      ok = false;
    }
    if (!pais) {
      authWarning.textContent = (authWarning.textContent || '') + ' Selecciona país.';
      authWarning.classList.add('visible');
      ok = false;
    }
    return ok;
  }

  function validarLogin() {
    var nombre = document.getElementById('auth-login-nombre').value.trim();
    var password = document.getElementById('auth-login-password').value;
    authWarning.classList.remove('visible');
    document.getElementById('auth-login-nombre').classList.remove('error');
    document.getElementById('auth-login-password').classList.remove('error');
    if (!nombre) {
      authWarning.textContent = 'El nombre es obligatorio.';
      authWarning.classList.add('visible');
      document.getElementById('auth-login-nombre').classList.add('error');
      return false;
    }
    if (!password) {
      authWarning.textContent = 'La contraseña es obligatoria.';
      authWarning.classList.add('visible');
      document.getElementById('auth-login-password').classList.add('error');
      return false;
    }
    return true;
  }

  document.getElementById('auth-btn-registrar').addEventListener('click', function () {
    if (!validarRegistro()) return;
    var nombre = document.getElementById('auth-nombre').value.trim();
    var password = document.getElementById('auth-password').value;
    var data = {
      edad: document.getElementById('auth-edad').value,
      sexo: document.getElementById('auth-sexo-m').checked ? 'M' : (document.getElementById('auth-sexo-f').checked ? 'F' : ''),
      profesion: document.getElementById('auth-profesion').value,
      pais: document.getElementById('auth-pais').value,
      instagram: document.getElementById('auth-instagram').value.trim()
    };
    if (!AuthService) {
      authWarning.textContent = 'Servicio de registro no disponible.';
      authWarning.classList.add('visible');
      return;
    }
    AuthService.register(nombre, password, data).then(function (result) {
      if (!result || !result.ok) {
        authWarning.textContent = (result && result.msg) || 'Error al registrarse.';
        authWarning.classList.add('visible');
        return;
      }
      closeAuth();
      return (AuthService.loadUserDataIntoApp && AuthService.loadUserDataIntoApp()) || Promise.resolve();
    }).then(function () {
      updateTopBarAuth();
      if (window.updatePillsDisplay) updatePillsDisplay();
    });
  });

  document.getElementById('auth-btn-login').addEventListener('click', function () {
    if (!validarLogin()) return;
    var nombre = document.getElementById('auth-login-nombre').value.trim();
    var password = document.getElementById('auth-login-password').value;
    if (!AuthService) {
      authWarning.textContent = 'Servicio de login no disponible.';
      authWarning.classList.add('visible');
      return;
    }
    AuthService.login(nombre, password).then(function (result) {
      if (!result || !result.ok) {
        authWarning.textContent = (result && result.msg) || 'Usuario o contraseña incorrectos.';
        authWarning.classList.add('visible');
        return;
      }
      closeAuth();
      return (AuthService.loadUserDataIntoApp && AuthService.loadUserDataIntoApp()) || Promise.resolve();
    }).then(function () {
      updateTopBarAuth();
      if (window.updatePillsDisplay) updatePillsDisplay();
    });
  });

  var btnLogout = document.getElementById('btn-logout');
  if (btnLogout && window.AuthService) {
    btnLogout.addEventListener('click', function () {
      AuthService.saveCurrentUserDataToStorage();
      AuthService.clearSession();
      if (window.PildorasService) {
        PildorasService.setPildoras(0);
        PildorasService.setUnlockedThemeIds([]);
      }
      updateTopBarAuth();
      if (window.updatePillsDisplay) updatePillsDisplay();
    });
  }

  if ((location.hash || '#inicio').slice(1) === 'estudiar') loadGuias();

  // === IA Page Logic (replica IAReadOnlyActivity) ===
  (function initIA() {
    if (!window.IAService) return;
    var tools = IAService.HERRAMIENTAS;
    var select = document.getElementById('ia-tool-select');
    var infoDesc = document.getElementById('ia-info-desc');
    var btnGenerar = document.getElementById('ia-btn-generar');
    var btnText = document.getElementById('ia-btn-text');
    var btnCost = document.getElementById('ia-btn-cost');
    var loadingEl = document.getElementById('ia-loading');
    var loadingMsg = document.getElementById('ia-loading-msg');
    var resultCard = document.getElementById('ia-result-card');
    var resultContent = document.getElementById('ia-result-content');
    if (!select || !btnGenerar) return;

    var providerSelect = document.getElementById('ia-provider-select');
    if (providerSelect) {
      providerSelect.value = IAService.getProvider();
      providerSelect.addEventListener('change', function () {
        IAService.setProvider(providerSelect.value);
      });
    }

    var panelIds = ['diccionario','enciclopedia','patologia','diagnostico','comparativo','tutor','ordenes'];
    var contenidoGuardado = {};

    tools.forEach(function (h) {
      var opt = document.createElement('option');
      opt.value = h.id;
      opt.textContent = h.nombre;
      select.appendChild(opt);
    });

    function currentTool() { return IAService.getHerramienta(select.value); }

    function showPanel(id) {
      panelIds.forEach(function (pid) {
        var el = document.getElementById('ia-panel-' + pid);
        if (el) el.style.display = pid === id ? '' : 'none';
      });
    }

    function updateInfo() {
      var h = currentTool();
      if (!h) return;
      infoDesc.textContent = h.desc;
      btnCost.textContent = h.costo + ' 💊';
      showPanel(h.id);
      if (contenidoGuardado[h.id]) {
        resultCard.style.display = '';
        resultContent.innerHTML = contenidoGuardado[h.id];
      } else {
        resultCard.style.display = 'none';
        resultContent.innerHTML = '';
      }
    }

    select.addEventListener('change', updateInfo);
    updateInfo();

    function getParams() {
      var id = select.value;
      switch (id) {
        case 'diccionario':
          return { terminos: document.getElementById('ia-input-diccionario').value.trim() };
        case 'enciclopedia':
          return { farmaco: document.getElementById('ia-input-enciclopedia').value.trim() };
        case 'patologia':
          return { patologia: document.getElementById('ia-input-patologia').value.trim() };
        case 'diagnostico':
          return { patologia: document.getElementById('ia-input-diagnostico').value.trim() };
        case 'comparativo':
          return { termino1: document.getElementById('ia-input-comp1').value.trim(), termino2: document.getElementById('ia-input-comp2').value.trim() };
        case 'tutor':
          return { pregunta: document.getElementById('ia-input-tutor').value.trim() };
        case 'ordenes':
          return { patologia: document.getElementById('ia-input-ordenes-pat').value.trim(), caracter: document.getElementById('ia-input-ordenes-car').value };
        default:
          return {};
      }
    }

    function validate(params) {
      var id = select.value;
      if (id === 'comparativo') {
        if (!params.termino1 || !params.termino2) return 'Ingresa ambos términos para comparar.';
      } else if (id === 'ordenes') {
        if (!params.patologia) return 'Ingresa la patología.';
        if (!params.caracter) return 'Selecciona el carácter (Emergencia o Ambulatoria).';
      } else {
        var val = params.terminos || params.farmaco || params.patologia || params.pregunta || '';
        if (!val) return 'Ingresa el dato solicitado.';
      }
      return null;
    }

    function setLoading(show, msg) {
      loadingEl.style.display = show ? '' : 'none';
      if (msg) loadingMsg.textContent = msg;
      btnGenerar.disabled = show;
    }

    btnGenerar.addEventListener('click', function () {
      var h = currentTool();
      if (!h) return;
      var params = getParams();
      var err = validate(params);
      if (err) { alert(err); return; }

      // var pills = window.PildorasService ? PildorasService.get() : 0;
      // if (pills < h.costo) {
      //   alert('No tienes suficientes píldoras. Necesitas ' + h.costo + ' y tienes ' + pills + '.');
      //   return;
      // }

      setLoading(true, 'Generando ' + h.nombre + '…');
      resultCard.style.display = 'none';

      IAService.generar(h.id, params)
        .then(function (html) {
          // if (window.PildorasService) {
          //   PildorasService.spend(h.costo);
          //   if (window.updatePillsDisplay) updatePillsDisplay();
          // }
          contenidoGuardado[h.id] = html;
          resultContent.innerHTML = html;
          resultCard.style.display = '';
          setLoading(false);
        })
        .catch(function (e) {
          setLoading(false);
          alert('Error: ' + (e.message || 'No se pudo generar el contenido.'));
        });
    });

    panelIds.forEach(function (pid) {
      var panel = document.getElementById('ia-panel-' + pid);
      if (!panel) return;
      var inputs = panel.querySelectorAll('input');
      inputs.forEach(function (inp) {
        inp.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') btnGenerar.click();
        });
      });
    });
  })();

})();
