(function () {
  var grid = document.getElementById('materias-grid');

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function renderTemas(temas) {
    grid.innerHTML = '';
    (temas || []).forEach(function (t) {
      var card = document.createElement('a');
      card.className = 'materia-card' + (t.tieneGuia ? ' has-guia' : '');
      card.href = t.pdfUrl || '#';
      if (t.pdfUrl) {
        card.target = '_blank';
        card.rel = 'noopener';
      }
      card.innerHTML =
        '<p class="materia-titulo">' + escapeHtml(t.titulo) + '</p>' +
        '<p class="materia-meta">' + escapeHtml(t.descripcion || '') + '</p>' +
        '<p class="materia-preguntas">' + (t.numPreguntas || 0) + ' preguntas</p>';
      grid.appendChild(card);
    });
  }

  function initTemas() {
    var temas = (window.TEMAS_DATA && window.TEMAS_DATA.temas) || [];
    var base = window.ContentPaths ? ContentPaths.temasCatalog() : '';

    if (base) {
      fetch(base)
        .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
        .then(function (data) {
          if (data && data.temas && data.temas.length) {
            window.TEMAS_DATA = data;
            temas = data.temas;
          }
          renderTemas(temas);
        })
        .catch(function () { renderTemas(temas); });
    } else {
      renderTemas(temas);
    }
  }

  initTemas();

  var navLinks = document.querySelectorAll('.nav-link');
  var pages = document.querySelectorAll('.page');

  function showPage(id) {
    pages.forEach(function (p) {
      p.classList.toggle('active', p.id === id);
    });
    navLinks.forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-page') === id);
    });
  }

  navLinks.forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      showPage(a.getAttribute('data-page'));
    });
  });

  window.addEventListener('hashchange', function () {
    var id = (location.hash || '#inicio').slice(1) || 'inicio';
    var valid = ['inicio', 'estudiar', 'calcular', 'diagnostico', 'ia', 'generar-guia'].indexOf(id) !== -1;
    showPage(valid ? id : 'inicio');
  });

  if (location.hash) {
    var id = location.hash.slice(1);
    if (['inicio', 'estudiar', 'calcular', 'diagnostico', 'ia', 'generar-guia'].indexOf(id) !== -1) {
      showPage(id);
    }
  }
})();
