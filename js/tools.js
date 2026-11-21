/* Reservation logic (Senior Developer 3). KR_RES owns the reservations in localStorage and drives pages/reservierung.html. */
(function () {
  'use strict';
  var KEY = 'kokrobite:reservations';
  var mem = [];

  function read() {
    try { var v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; }
    catch (e) { return mem.slice(); }
  }
  function write(list) { mem = list.slice(); try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} return list; }

  function newRef(existing) {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', ref, n = 0;
    do {
      var out = '', buf = new Uint8Array(6);
      if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(buf); else for (var i = 0; i < 6; i++) buf[i] = Math.random() * 256;
      for (var j = 0; j < 6; j++) out += chars[buf[j] % chars.length];
      ref = 'KR-' + out;
    } while (existing.some(function (r) { return r.ref === ref; }) && ++n < 20);
    return ref;
  }

  function add(res) {
    var list = read();
    var r = {
      ref: newRef(list), room: res.room, in: res.in, out: res.out, guests: res.guests, nights: res.nights, total: res.total,
      name: res.name, email: res.email, note: res.note || '', created: new Date().toISOString()
    };
    list.unshift(r); write(list);
    return r;
  }
  function remove(ref) { var list = read().filter(function (r) { return r.ref !== ref; }); write(list); return list; }

  // iCalendar text: escape \ ; , and newlines; CRLF line ends; DTEND is exclusive (the check-out day).
  function esc(s) { return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  function ymd(iso) { return String(iso).slice(0, 10).replace(/-/g, ''); }
  function stamp(d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
  function fold(line) {
    var out = [], s = line;
    while (s.length > 74) { out.push(s.slice(0, 74)); s = ' ' + s.slice(74); }
    out.push(s); return out.join('\r\n');
  }
  function roomName(id) {
    var rooms = (window.KR_DATA && KR_DATA.rooms) || [];
    for (var i = 0; i < rooms.length; i++) if (rooms[i].id === id) return rooms[i].name;
    return id;
  }
  function ics(res) {
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kokrobite Resort Demo//DE', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      'UID:' + esc(res.ref) + '@kokrobite-resort.demo',
      'DTSTAMP:' + stamp(new Date()),
      'DTSTART;VALUE=DATE:' + ymd(res.in),
      'DTEND;VALUE=DATE:' + ymd(res.out),
      'SUMMARY:' + esc('Demo-Aufenthalt Kokrobite Resort (' + res.ref + ')'),
      'DESCRIPTION:' + esc('Fiktives Hotel, Demo ohne Zahlung. Zimmer: ' + roomName(res.room) + '. Gäste: ' + res.guests + '. ' + (res.note ? ' ' + res.note : '')),
      'END:VEVENT', 'END:VCALENDAR'];
    return lines.map(fold).join('\r\n') + '\r\n';
  }
  function downloadIcs(res) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics(res)], { type: 'text/calendar;charset=utf-8' }));
    a.download = res.ref + '.ics'; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  window.KR_RES = { list: read, add: add, remove: remove, ics: ics, download: downloadIcs };

  /* ---- the reservation page ---- */
  var $ = function (id) { return document.getElementById(id); };
  function h(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return window.KR_DE && KR_DE.money ? KR_DE.money(n) : (Math.round(n * 100) / 100).toFixed(2).replace('.', ',') + ' €'; }
  function date(iso) { return window.KR_DE && KR_DE.date ? KR_DE.date(iso) : String(iso).split('-').reverse().join('.'); }
  function nightsTxt(n) { return window.KR_DE && KR_DE.nights ? KR_DE.nights(n) : n + (n === 1 ? ' Nacht' : ' Nächte'); }

  function page() {
    if (!$('res-form')) return;
    var rooms = (window.KR_DATA && KR_DATA.rooms) || [];
    var q = new URLSearchParams(location.search);
    var st = { room: q.get('room') || (rooms[0] && rooms[0].id), range: null, quote: null, cal: null };
    if (!rooms.some(function (r) { return r.id === st.room; }) && rooms[0]) st.room = rooms[0].id;
    var roomSel = $('res-room'), guestSel = $('res-guests');

    roomSel.innerHTML = rooms.map(function (r) { return '<option value="' + h(r.id) + '">' + h(r.name) + ' · ' + money(r.pricePerNight) + ' pro Nacht</option>'; }).join('');
    roomSel.value = st.room;

    function room() { return rooms.filter(function (r) { return r.id === st.room; })[0] || { maxGuests: 2 }; }
    function guestsFill(keep) {
      var max = room().maxGuests || 2, cur = +keep || 1;
      guestSel.innerHTML = '';
      for (var i = 1; i <= max; i++) guestSel.insertAdjacentHTML('beforeend', '<option value="' + i + '">' + i + (i === 1 ? ' Gast' : ' Gäste') + '</option>');
      guestSel.value = String(Math.min(cur, max));
    }
    function mountCal() {
      $('res-cal').innerHTML = '';
      if (!window.KR_CAL) { $('res-cal').textContent = 'Der Kalender konnte nicht geladen werden.'; return; }
      st.cal = KR_CAL.mount($('res-cal'), { room: st.room, onChange: function (r) { st.range = r; summary(); } });
      st.range = null;
    }

    function summary() {
      var r = room(), rows = [];
      $('res-room-blurb').textContent = r.blurb || '';
      $('res-sum-err').textContent = ''; st.quote = null;
      rows.push(['Zimmer', h(r.name || '')]);
      rows.push(['Gäste', guestSel.value]);
      if (st.range) {
        rows.push(['Anreise', date(st.range.in)]);
        rows.push(['Abreise', date(st.range.out)]);
        var qt = window.KR_DATA && KR_DATA.quote ? KR_DATA.quote(st.room, st.range.in, st.range.out, +guestSel.value) : null;
        if (qt && qt.ok) {
          st.quote = qt;
          rows.push(['Dauer', nightsTxt(qt.nights)]);
          rows.push(['Preis pro Nacht', money(qt.perNight)]);
          rows.push(['<strong>Gesamt</strong>', '<strong class="res__total">' + money(qt.total) + '</strong>']);
        } else $('res-sum-err').textContent = (qt && qt.error) || 'Für diese Daten ist kein Preis verfügbar.';
      } else rows.push(['Reisedaten', 'Bitte im Kalender wählen']);
      $('res-sum').innerHTML = rows.map(function (x) { return '<div><dt>' + x[0] + '</dt><dd>' + x[1] + '</dd></div>'; }).join('');
    }

    roomSel.addEventListener('change', function () { st.room = this.value; guestsFill(guestSel.value); mountCal(); summary(); });
    guestSel.addEventListener('change', summary);

    function validate() {
      var name = $('res-name').value.trim(), email = $('res-email').value.trim(), ok = true, focus = null;
      $('res-dates-err').textContent = st.range && st.quote ? '' : 'Bitte wähle Anreise- und Abreisetag im Kalender.';
      if (!(st.range && st.quote)) { ok = false; focus = focus || $('res-cal').querySelector('button[tabindex="0"], button'); }
      $('res-name-err').textContent = name ? '' : 'Bitte gib deinen Namen ein.';
      if (!name) { ok = false; focus = focus || $('res-name'); }
      var eok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
      $('res-email-err').textContent = eok ? '' : 'Bitte gib eine gültige E-Mail-Adresse ein.';
      if (!eok) { ok = false; focus = focus || $('res-email'); }
      if (focus) focus.focus();
      return ok;
    }

    $('res-form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate()) return;
      var res = add({ room: st.room, in: st.range.in, out: st.range.out, guests: +guestSel.value, nights: st.quote.nights, total: st.quote.total,
        name: $('res-name').value.trim(), email: $('res-email').value.trim(), note: $('res-note').value.trim() });
      var done = $('res-done');
      done.innerHTML = '<h2>Danke, ' + h(res.name.split(' ')[0]) + '! Deine Demo-Reservierung steht.</h2>' +
        '<p class="res__ref">Referenz <strong>' + h(res.ref) + '</strong></p>' +
        '<p>' + h(room().name || '') + ', ' + date(res.in) + ' bis ' + date(res.out) + ' (' + nightsTxt(res.nights) + '), ' + res.guests + (res.guests === 1 ? ' Gast' : ' Gäste') + ', ' + money(res.total) + '.</p>' +
        '<p class="res__hint">Es wurde nichts bezahlt und nichts gesendet. Die Reservierung liegt nur in diesem Browser.</p>' +
        '<p class="res__actions"><button type="button" class="res__btn" id="res-ics">Kalenderdatei (.ics) laden</button> ' +
        '<a class="res__btn res__btn--ghost" href="meine-reservierungen.html">Meine Reservierungen</a> ' +
        '<button type="button" class="res__btn res__btn--ghost" id="res-again">Noch eine Reservierung</button></p>';
      done.hidden = false; $('res-grid').hidden = true; done.focus();
      $('res-ics').addEventListener('click', function () { downloadIcs(res); });
      $('res-again').addEventListener('click', function () { done.hidden = true; $('res-grid').hidden = false; $('res-form').reset(); guestsFill(1); mountCal(); summary(); roomSel.focus(); });
    });

    guestsFill(q.get('guests'));
    mountCal();
    var qi = q.get('in'), qo = q.get('out');
    if (qi && qo && st.cal && st.cal.setRange) { var okr = false; try { okr = st.cal.setRange({ in: qi, out: qo }); } catch (e) {} if (!okr) st.range = null; }
    summary();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', page); else page();
})();
