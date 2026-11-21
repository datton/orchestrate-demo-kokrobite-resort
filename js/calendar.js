/* Buchungskalender (Senior Developer 2). KR_CAL.mount(container, {room, range, onChange(range)}).
   range = {in, out} (ISO) or null. Belegte Tage kommen aus KR_DATA.bookedDates(roomId); ein belegter Tag darf Abreisetag sein. */
(function () {
  'use strict';
  var MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  var DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  var DAYS_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  var uid = 0;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) { var p = String(s).slice(0, 10).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  // A real calendar date written YYYY-MM-DD, nothing else (a bad value in the address must never reach a loop).
  function validISO(s) { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return false; var d = parse(s); return !isNaN(d) && iso(d) === s; }
  function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
  function today() { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
  function nightsBetween(a, b) { return Math.round((parse(b) - parse(a)) / 864e5); }
  function monthName(i) { var D = window.KR_DE; return (D && D.months && D.months[i]) || MONTHS[i]; }
  function long(d) { return DAYS_LONG[(d.getDay() + 6) % 7] + ', ' + d.getDate() + '. ' + monthName(d.getMonth()) + ' ' + d.getFullYear(); }
  function nightsText(n) { return n + (n === 1 ? ' Nacht' : ' Nächte'); }

  function bookedSet(roomId) {
    var set = {}, list = [];
    try { list = (window.KR_DATA && KR_DATA.bookedDates && KR_DATA.bookedDates(roomId)) || []; } catch (e) {}
    var arr = [];
    if (list && typeof list.forEach === 'function') list.forEach(function (x) { arr.push(x); });
    arr.forEach(function (x) { if (x) set[iso(x instanceof Date ? x : parse(x && x.date ? x.date : x))] = true; });
    return set;
  }

  function mount(container, opts) {
    if (!container) return null;
    opts = opts || {};
    var roomId = opts.room && typeof opts.room === 'object' ? opts.room.id : opts.room;
    var id = 'krcal' + (++uid), t0 = today(), booked = bookedSet(roomId);
    var view = new Date(t0.getFullYear(), t0.getMonth(), 1), focus = iso(t0), range = null, pending = null;
    var cb = typeof opts.onChange === 'function' ? opts.onChange : function () {};

    container.classList.add('krcal');
    container.innerHTML =
      '<div class="krcal__head"><button type="button" class="krcal__nav" data-nav="-1" aria-label="Voriger Monat">‹</button>' +
      '<h3 class="krcal__title" id="' + id + '-t" aria-live="polite"></h3>' +
      '<button type="button" class="krcal__nav" data-nav="1" aria-label="Nächster Monat">›</button></div>' +
      '<div class="krcal__grid" role="grid" aria-labelledby="' + id + '-t"></div>' +
      '<div class="krcal__foot"><p class="krcal__status" role="status" aria-live="polite"></p><button type="button" class="krcal__clear" hidden>Daten löschen</button></div>' +
      '<p class="krcal__legend"><span class="krcal__key krcal__key--booked"></span> Belegt <span class="krcal__key krcal__key--sel"></span> Dein Aufenthalt <span class="krcal__key krcal__key--today"></span> Heute</p>';
    var grid = container.querySelector('.krcal__grid'), title = container.querySelector('.krcal__title'),
        status = container.querySelector('.krcal__status'), clearBtn = container.querySelector('.krcal__clear');

    function isBooked(s) { return !!booked[s]; }
    function isPast(d) { return d < t0; }
    function blocked(d) { return isPast(d) || isBooked(iso(d)); }
    // Abreisetag: der Tag selbst darf belegt sein, wenn alle Nächte davor frei sind.
    function spansBooked(a, b) {
      if (!validISO(a) || !validISO(b)) return true;
      var n = 0; for (var d = parse(a); iso(d) < b; d = addDays(d, 1)) { if (blocked(d)) return true; if (++n > 800) return true; }
      return false;
    }
    function canCheckout(s) { return pending && s > pending && !spansBooked(pending, s); }

    function say() {
      if (range) status.textContent = 'Anreise ' + long(parse(range.in)) + ', Abreise ' + long(parse(range.out)) + ': ' + nightsText(nightsBetween(range.in, range.out)) + '.';
      else if (pending) status.textContent = 'Anreise ' + long(parse(pending)) + '. Wähle nun den Abreisetag.';
      else status.textContent = 'Wähle den Anreisetag.';
      clearBtn.hidden = !(range || pending);
    }
    function emit() { cb(range ? { in: range.in, out: range.out } : null); }

    function draw(keepFocus) {
      title.textContent = monthName(view.getMonth()) + ' ' + view.getFullYear();
      var first = new Date(view.getFullYear(), view.getMonth(), 1), lead = (first.getDay() + 6) % 7;
      var count = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      var fd = parse(focus);
      if (fd.getMonth() !== view.getMonth() || fd.getFullYear() !== view.getFullYear()) focus = iso(first);
      var h = '<div role="row" class="krcal__row">' + DAYS.map(function (d, i) { return '<span role="columnheader" class="krcal__dow" aria-label="' + DAYS_LONG[i] + '">' + d + '</span>'; }).join('') + '</div>';
      var cells = [], i;
      for (i = 0; i < lead; i++) cells.push('<span role="gridcell" class="krcal__blank"></span>');
      for (i = 1; i <= count; i++) {
        var d = new Date(view.getFullYear(), view.getMonth(), i), s = iso(d), cls = 'krcal__day';
        var co = canCheckout(s), dis = blocked(d) && !co;
        var isIn = range && s === range.in, isOut = range && s === range.out, mid = range && s > range.in && s < range.out;
        if (isBooked(s)) cls += ' is-booked'; else if (isPast(d)) cls += ' is-past';
        if (s === iso(t0)) cls += ' is-today';
        if (isIn || isOut || s === pending) cls += ' is-edge';
        if (mid) cls += ' is-mid';
        var label = long(d) + (s === iso(t0) ? ', heute' : '') + (isBooked(s) ? (co ? ', belegt, als Abreisetag möglich' : ', belegt') : isPast(d) ? ', nicht verfügbar, vergangen' : ', frei') +
          (isIn || s === pending ? ', Anreise' : '') + (isOut ? ', Abreise' : '');
        cells.push('<span role="gridcell"><button type="button" class="' + cls + '" data-d="' + s + '" tabindex="' + (s === focus ? 0 : -1) + '" aria-label="' + label + '"' +
          (dis ? ' aria-disabled="true"' : '') + ((isIn || isOut || mid || s === pending) ? ' aria-pressed="true"' : '') + '>' + i + '</button></span>');
      }
      while (cells.length % 7) cells.push('<span role="gridcell" class="krcal__blank"></span>');
      for (i = 0; i < cells.length; i += 7) h += '<div role="row" class="krcal__row">' + cells.slice(i, i + 7).join('') + '</div>';
      grid.innerHTML = h;
      container.querySelector('[data-nav="-1"]').disabled = view <= new Date(t0.getFullYear(), t0.getMonth(), 1);
      say();
      if (keepFocus) { var b = grid.querySelector('button[data-d="' + focus + '"]'); if (b) b.focus(); }
    }

    function pick(s) {
      var d = parse(s);
      if (pending) {
        if (s === pending) { pending = null; range = null; emit(); draw(true); return; }
        if (s > pending && canCheckout(s)) { range = { in: pending, out: s }; pending = null; emit(); draw(true); return; }
        if (blocked(d)) { status.textContent = 'Dieser Tag ist nicht möglich: Zwischen den Daten liegen belegte Nächte.'; return; }
        pending = s; range = null; emit(); draw(true); return;
      }
      if (blocked(d)) { status.textContent = 'Dieser Tag ist nicht verfügbar.'; return; }
      pending = s; range = null; emit(); draw(true);
    }
    function month(n) { view = new Date(view.getFullYear(), view.getMonth() + n, 1); }
    function move(s, n) {
      var d = addDays(parse(s), n); if (d < t0) d = t0;
      focus = iso(d); view = new Date(d.getFullYear(), d.getMonth(), 1); draw(true);
    }

    container.addEventListener('click', function (e) {
      var nav = e.target.closest('[data-nav]');
      if (nav && !nav.disabled) { month(+nav.dataset.nav); draw(false); return; }
      if (e.target.closest('.krcal__clear')) { api.clear(); return; }
      var b = e.target.closest('button[data-d]'); if (b) { focus = b.dataset.d; pick(focus); }
    });
    grid.addEventListener('keydown', function (e) {
      var b = e.target.closest('button[data-d]'); if (!b) return;
      var s = b.dataset.d, k = e.key, handled = true;
      if (k === 'ArrowLeft') move(s, -1); else if (k === 'ArrowRight') move(s, 1);
      else if (k === 'ArrowUp') move(s, -7); else if (k === 'ArrowDown') move(s, 7);
      else if (k === 'Home') move(s, -((parse(s).getDay() + 6) % 7));
      else if (k === 'End') move(s, 6 - ((parse(s).getDay() + 6) % 7));
      else if (k === 'PageUp') { month(e.shiftKey ? -12 : -1); focus = iso(new Date(view.getFullYear(), view.getMonth(), Math.min(parse(s).getDate(), 28))); if (parse(focus) < t0) { focus = iso(t0); view = new Date(t0.getFullYear(), t0.getMonth(), 1); } draw(true); }
      else if (k === 'PageDown') { month(e.shiftKey ? 12 : 1); focus = iso(new Date(view.getFullYear(), view.getMonth(), Math.min(parse(s).getDate(), 28))); draw(true); }
      else if (k === 'Enter' || k === ' ') pick(s);
      else if (k === 'Escape' && (pending || range)) { range = null; pending = null; emit(); draw(true); }
      else handled = false;
      if (handled) e.preventDefault();
    });

    var api = {
      clear: function () { range = null; pending = null; emit(); draw(false); },
      getRange: function () { return range ? { in: range.in, out: range.out } : null; },
      setBooked: function (id2) { if (id2 != null) roomId = id2; booked = bookedSet(roomId); range = null; pending = null; draw(false); emit(); },
      setRange: function (r) {
        if (r && validISO(r.in) && validISO(r.out) && r.out > r.in && r.in >= iso(t0) && !spansBooked(r.in, r.out)) {
          range = { in: r.in, out: r.out }; pending = null; focus = r.in; view = new Date(parse(r.in).getFullYear(), parse(r.in).getMonth(), 1); draw(false); emit(); return true;
        }
        return false;
      }
    };
    if (opts.range) api.setRange(opts.range); else draw(false);
    return api;
  }
  window.KR_CAL = { mount: mount };
})();
