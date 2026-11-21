/* Erlebnisse: Tagesplaner (Senior Developer 4). Plan in localStorage, download as .txt. */
(function () {
  'use strict';
  var KEY = 'kokrobite:planner';
  var ACT = [
    { id: 'strand', name: 'Strandtag', note: 'Weißer Sandstrand am Atlantik.' },
    { id: 'surfen', name: 'Surfen', note: 'Beständiger Surfspot; größte Wellen etwa April bis September.' },
    { id: 'trommeln', name: 'Trommeln und Tanz', note: 'Workshop als Demo-Angebot des Hotels.' },
    { id: 'fischerdorf', name: 'Fischerdorf-Spaziergang', note: 'Traditionelle Küstenfischerei.' },
    { id: 'ruhe', name: 'Ruhe am Pool oder im Zimmer', note: 'Zeit für dich.' }
  ];
  var SLOTS = [{ id: 'vor', name: 'Vormittag' }, { id: 'nach', name: 'Nachmittag' }, { id: 'abend', name: 'Abend' }];
  var WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  var $ = function (s) { return document.querySelector(s); };

  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function parse(s) { var p = (s || '').split('-'); return p.length === 3 ? new Date(+p[0], +p[1] - 1, +p[2]) : null; }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); return x; }
  function fmt(d) {
    var s = iso(d);
    if (window.KR_DE && KR_DE.date) { try { return KR_DE.date(s); } catch (e) {} }
    return WD[d.getDay()] + ', ' + d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function actName(id) { var a = ACT.filter(function (x) { return x.id === id; })[0]; return a ? a.name : ''; }

  var state = load();
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (s && typeof s === 'object' && s.start && s.picks) return s;
    } catch (e) {}
    var t = addDays(new Date(), 14);
    return { start: iso(t), days: 5, picks: {} };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  function dayList() {
    var d0 = parse(state.start) || new Date(), out = [];
    for (var i = 0; i < state.days; i++) out.push(addDays(d0, i));
    return out;
  }
  function pick(d, slot) { return (state.picks[iso(d)] || {})[slot] || ''; }

  function notes(d) {
    var n = [], m = d.getMonth() + 1, wd = d.getDay(), chosen = SLOTS.map(function (s) { return pick(d, s.id); });
    if (chosen.indexOf('surfen') > -1 && (m < 4 || m > 9)) n.push('Die größten Wellen gibt es laut Reiseführern etwa von April bis September. Bitte vor Ort nach den Bedingungen fragen.');
    if (m === 5) n.push('Im Mai feiern die Ga das Homowo-Fest: Lärm und große Veranstaltungen sind dann eingeschränkt. Genaue Termine bitte prüfen.');
    if ((wd === 0 || wd === 6) && (chosen.indexOf('strand') > -1 || chosen.indexOf('trommeln') > -1)) n.push('Am Wochenende gibt es oft Strandtreffen mit Essen, Tanz und Musik.');
    return n;
  }

  function renderDays() {
    var h = '';
    dayList().forEach(function (d, i) {
      h += '<fieldset class="pl__day"><legend>Tag ' + (i + 1) + ': ' + esc(fmt(d)) + '</legend>';
      SLOTS.forEach(function (s) {
        var id = 'pl-' + iso(d) + '-' + s.id, cur = pick(d, s.id);
        h += '<div class="pl__slot"><label for="' + id + '">' + s.name + '</label><select id="' + id + '" data-day="' + iso(d) + '" data-slot="' + s.id + '"><option value="">Frei</option>' +
          ACT.map(function (a) { return '<option value="' + a.id + '"' + (a.id === cur ? ' selected' : '') + '>' + esc(a.name) + '</option>'; }).join('') + '</select></div>';
      });
      h += '<p class="pl__daynotes" id="pl-notes-' + iso(d) + '"></p></fieldset>';
    });
    $('#pl-days-wrap').innerHTML = h;
    updateNotes();
  }
  function updateNotes() {
    dayList().forEach(function (d) { var el = document.getElementById('pl-notes-' + iso(d)); if (el) el.textContent = notes(d).join(' '); });
  }

  function planText() {
    var lines = ['MEIN TAGESPLAN: Kokrobite (Demo / fiktives Hotel)', ''];
    dayList().forEach(function (d, i) {
      lines.push('Tag ' + (i + 1) + ': ' + fmt(d));
      SLOTS.forEach(function (s) { lines.push('  ' + s.name + ': ' + (actName(pick(d, s.id)) || 'Frei')); });
      notes(d).forEach(function (n) { lines.push('  Hinweis: ' + n); });
      lines.push('');
    });
    lines.push('Gespeichert nur in diesem Browser. Nichts gesendet, nichts gebucht, keine Zahlung. Angebote eines fiktiven Hotels.');
    return lines.join('\n');
  }

  function renderPlan() {
    var any = false, h = '';
    dayList().forEach(function (d, i) {
      var rows = SLOTS.filter(function (s) { return pick(d, s.id); });
      if (rows.length) any = true;
      h += '<article class="pl__pday"><h4>Tag ' + (i + 1) + ' <span>' + esc(fmt(d)) + '</span></h4>' +
        (rows.length ? '<ul>' + rows.map(function (s) { return '<li><strong>' + s.name + '</strong> ' + esc(actName(pick(d, s.id))) + '</li>'; }).join('') + '</ul>' : '<p class="pl__free">Noch nichts geplant: ein freier Tag.</p>') + '</article>';
    });
    $('#pl-plan').innerHTML = h;
    $('#pl-download').disabled = !any;
    $('#pl-hint').textContent = any ? 'Gespeichert in diesem Browser.' : 'Wähle für jeden Tagesabschnitt ein Erlebnis oder lass ihn frei.';
  }

  function changed() { save(); updateNotes(); renderPlan(); }

  function init() {
    var start = $('#pl-start'), days = $('#pl-days');
    if (!start) return;
    start.value = state.start; start.min = iso(new Date()); days.value = String(state.days);
    start.addEventListener('change', function () { if (parse(start.value)) { state.start = start.value; save(); renderDays(); renderPlan(); } });
    days.addEventListener('change', function () { state.days = +days.value; save(); renderDays(); renderPlan(); });
    $('#pl-days-wrap').addEventListener('change', function (e) {
      var t = e.target; if (!t.getAttribute || !t.getAttribute('data-day')) return;
      var day = t.getAttribute('data-day'); state.picks[day] = state.picks[day] || {};
      if (t.value) state.picks[day][t.getAttribute('data-slot')] = t.value; else delete state.picks[day][t.getAttribute('data-slot')];
      changed();
    });
    $('#pl-clear').addEventListener('click', function () { state.picks = {}; save(); renderDays(); renderPlan(); });
    $('#pl-download').addEventListener('click', function () {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([planText()], { type: 'text/plain;charset=utf-8' }));
      a.download = 'kokrobite-tagesplan.txt'; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
    $('#pl-start').addEventListener('keydown', function () {});
    renderDays(); renderPlan();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
