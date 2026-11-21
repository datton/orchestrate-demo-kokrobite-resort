/* Startseite (Full-Stack): Verfügbarkeitssuche über KR_DATA. Nichts wird gesendet. */
(function () {
  'use strict';
  var D = window.KR_DATA, DE = window.KR_DE;
  var list = document.getElementById('results'), count = document.getElementById('count'), err = document.getElementById('f-err');
  if (!list) return;
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  if (!D || !D.rooms || !DE) { count.textContent = 'Die Zimmer konnten nicht geladen werden. Bitte lade die Seite neu.'; return; }
  var COLORS = ['#c2255c', '#0b7285', '#e67700', '#5f3dc4', '#2b8a3e'];
  var din = $('f-in'), dout = $('f-out'), guests = $('f-guests');
  var today = D.today();
  din.min = today; dout.min = today;

  function ms(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN; }

  function render() {
    var a = din.value, b = dout.value, g = +guests.value || 1, msg = '';
    din.removeAttribute('aria-invalid'); dout.removeAttribute('aria-invalid');
    if (a && ms(a) < ms(today)) { msg = 'Die Anreise darf nicht in der Vergangenheit liegen.'; din.setAttribute('aria-invalid', 'true'); }
    else if (a && b && ms(b) <= ms(a)) { msg = 'Die Abreise muss nach der Anreise liegen.'; dout.setAttribute('aria-invalid', 'true'); }
    err.textContent = msg;
    if (msg || !a || !b) {
      list.innerHTML = '';
      count.textContent = msg ? '' : 'Wähle Anreise und Abreise, dann siehst du die freien Zimmer und den Preis für deinen Aufenthalt.';
      return;
    }
    var rows = [];
    D.rooms.forEach(function (r, i) {
      if (r.maxGuests < g) return;
      var q = D.quote(r.id, a, b, g);
      if (q && q.ok) rows.push({ r: r, q: q, c: COLORS[i % COLORS.length] });
    });
    var nights = Math.round((ms(b) - ms(a)) / 86400000);
    if (!rows.length) {
      count.textContent = 'Keine freien Zimmer';
      list.innerHTML = '<li class="h-empty">Für diese Daten und ' + g + (g === 1 ? ' Gast' : ' Gäste') + ' ist nichts frei. Versuche andere Daten oder weniger Gäste.</li>';
      return;
    }
    count.textContent = rows.length + (rows.length === 1 ? ' Zimmer frei' : ' Zimmer frei') + ' für ' + DE.nights(nights) + ' (' + DE.dateShort(a) + ' bis ' + DE.dateShort(b) + ')';
    list.innerHTML = rows.map(function (x, i) {
      var link = 'pages/reservierung.html?room=' + encodeURIComponent(x.r.id) + '&in=' + encodeURIComponent(a) + '&out=' + encodeURIComponent(b);
      return '<li class="h-card" style="--c:' + x.c + ';animation-delay:' + (i * 60) + 'ms"><h3>' + esc(x.r.name) + '</h3><p>' + esc(x.r.blurb) + '</p>' +
        '<p>Bis zu ' + x.r.maxGuests + (x.r.maxGuests === 1 ? ' Gast' : ' Gäste') + '</p>' +
        '<div class="h-price">' + DE.money(x.q.total) + ' <small>für ' + DE.nights(nights) + '</small></div>' +
        '<p>' + DE.money(x.q.perNight) + ' pro Nacht' + (x.q.discount ? ', inkl. Langzeit-Rabatt' : '') + '</p>' +
        '<a class="h-btn" href="' + link + '" aria-label="' + esc(x.r.name) + ' reservieren">Reservieren (Demo)</a></li>';
    }).join('');
  }
  [din, dout, guests].forEach(function (el) { el.addEventListener('input', render); el.addEventListener('change', render); });
  $('find').addEventListener('submit', function (e) { e.preventDefault(); });
  render();
})();
