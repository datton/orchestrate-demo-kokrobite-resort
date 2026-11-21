/* Bestätigung (Senior Developer 4): pages/order.html?o=<token>. Paid via the shop service; reservation kept in KR_RES. */
(function () {
  'use strict';
  var root = document.getElementById('order-root');
  var token = new URLSearchParams(location.search).get('o');
  var KEY = 'kokrobite:reservations';
  var tries = 0, MAX = 10, order = null;
  var TEST = 'Demo: nur Testzahlung, kein echtes Geld.';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(c) { return window.KR_SHOP ? KR_SHOP.money(c) : (c / 100).toFixed(2).replace('.', ',') + ' €'; }
  function date(iso) { try { return KR_DE.date(iso); } catch (e) { return iso; } }
  function nightsTxt(n) { try { return KR_DE.nights(n); } catch (e) { return n + (n === 1 ? ' Nacht' : ' Nächte'); } }
  function roomName(id) { var r = ((window.KR_DATA && KR_DATA.rooms) || []).filter(function (x) { return x.id === id; })[0]; return r ? r.name : id; }
  function days(a, b) { return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000); }

  function parseNote(note) {
    var p = String(note || '').split('|');
    if (p.length < 5 || !/^KR-[A-Z0-9]{6}$/.test(p[0]) || !/^\d{4}-\d{2}-\d{2}$/.test(p[1]) || !/^\d{4}-\d{2}-\d{2}$/.test(p[2])) return null;
    return { ref: p[0], in: p[1], out: p[2], guests: parseInt(p[3], 10) || 1, name: p.slice(4).join('|') };
  }
  function readRes() { try { var v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function writeRes(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} }

  /* The reservation for this order: from this browser (orderToken), else rebuilt from the order note. */
  function reservation(o) {
    var line = (o.lines && o.lines[0]) || {}, n = parseNote(o.note || line.note);
    var list = readRes(), found = list.filter(function (r) { return r.orderToken === token || (n && r.ref === n.ref); })[0];
    var res = found ? JSON.parse(JSON.stringify(found)) : null;
    if (!res && n) {
      res = { ref: n.ref, room: line.item, in: n.in, out: n.out, guests: n.guests, nights: days(n.in, n.out) || line.qty, total: o.total / 100, name: n.name || o.name, email: '', note: '', created: o.placedAt || new Date().toISOString() };
    }
    if (!res) return null;
    res.orderToken = token; res.pay = 'bezahlt'; res.paid = o.total;
    var i = -1; list.forEach(function (r, k) { if (r.ref === res.ref) i = k; });
    if (i > -1) list[i] = res; else list.unshift(res);
    writeRes(list);
    return res;
  }

  function lead(title, text, extra) {
    root.innerHTML = '<p class="ord__eyebrow">Bestätigung <span class="demo-label">Demo / fiktives Hotel</span></p><h1 class="ord__title">' + title + '</h1>' +
      (text ? '<p class="ord__muted">' + text + '</p>' : '') + (extra || '');
  }
  function links(extra) {
    return '<div class="ord__actions">' + (extra || '') + '<a class="ord__btn ord__btn--ghost" href="meine-reservierungen.html">Meine Reservierungen</a><a class="ord__btn ord__btn--ghost" href="reservierung.html">Zurück zur Reservierung</a></div>';
  }
  function problem(title, text) { lead(title, text, '<span class="ord__test">' + TEST + '</span>' + links()); }

  function paidView(o) {
    var res = reservation(o), line = (o.lines && o.lines[0]) || {};
    var room = roomName((res && res.room) || line.item), nights = (res && res.nights) || line.qty;
    var h = '<p class="ord__eyebrow">Bestätigung <span class="demo-label">Demo / fiktives Hotel</span></p>' +
      '<h1 class="ord__title">Danke, ' + esc(o.firstName || res && res.name || '') + '! Deine Zahlung ist angekommen.</h1>';
    if (res) h += '<div class="ord__ref"><small>Deine Referenz</small><strong>' + esc(res.ref) + '</strong></div>';
    h += '<br><span class="ord__test">' + TEST + '</span>';
    h += '<section class="ord__card" aria-labelledby="ord-h"><h2 id="ord-h">Deine Reservierung</h2><dl class="ord__dl">' +
      '<div><dt>Zimmer</dt><dd>' + esc(room) + '</dd></div>' +
      (res ? '<div><dt>Anreise</dt><dd>' + esc(date(res.in)) + '</dd></div><div><dt>Abreise</dt><dd>' + esc(date(res.out)) + '</dd></div><div><dt>Gäste</dt><dd>' + esc(res.guests) + '</dd></div>' : '') +
      '<div><dt>Dauer</dt><dd>' + esc(nightsTxt(nights)) + '</dd></div>' +
      '<div class="ord__paid"><dt>Bezahlt</dt><dd>' + esc(money(o.total)) + '</dd></div>' +
      (o.payment && o.payment.card ? '<div><dt>Zahlung</dt><dd>' + esc(o.payment.card) + ' (Testkarte)</dd></div>' : '') +
      '</dl></section>';
    h += '<p class="ord__muted">Das ist eine Demo: Es bewegt sich kein echtes Geld. Name und Reisedaten gingen nur an den Shop-Dienst der Demo für die Testbestellung; deine Reservierung ist in diesem Browser gespeichert.</p>';
    h += links(res ? '<button class="ord__btn" type="button" id="ord-ics">Kalenderdatei (.ics) laden</button>' : '');
    root.innerHTML = h;
    var b = document.getElementById('ord-ics');
    if (b) b.addEventListener('click', function () { try { KR_RES.download(res); } catch (e) {
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([KR_RES.ics(res)], { type: 'text/calendar;charset=utf-8' })); a.download = res.ref + '.ics'; document.body.appendChild(a); a.click(); a.remove(); } });
    try { document.title = 'Danke: ' + (res ? res.ref : 'Bestätigung'); } catch (e) {}
  }

  function setCancelled(o) {
    var n = parseNote(o.note || ((o.lines && o.lines[0]) || {}).note), list = readRes(), ch = false;
    list.forEach(function (r) { if (r.orderToken === token || (n && r.ref === n.ref)) { r.pay = 'abgebrochen'; ch = true; } });
    if (ch) writeRes(list);
  }

  function poll() {
    tries++;
    KR_SHOP.api('orders/' + encodeURIComponent(token)).then(function (res) {
      order = res.order || res;
      var s = order.status, paid = order.payment && order.payment.state === 'paid';
      if (s === 'cancelled' || s === 'refunded') { setCancelled(order); return problem('Die Zahlung wurde abgebrochen', 'Es wurde nichts abgebucht. Du kannst deine Reservierung jederzeit noch einmal starten.'); }
      if (paid || (s && s !== 'pending')) { KR_SHOP.addOrder(token); return paidView(order); }
      if (tries >= MAX) return lead('Deine Zahlung ist noch nicht bestätigt', 'Das dauert gerade länger als erwartet. Lade die Seite gleich noch einmal, oder starte die Reservierung neu.', '<div class="ord__actions"><button class="ord__btn" type="button" onclick="location.reload()">Noch einmal prüfen</button></div>' + links());
      lead('Einen Moment, wir prüfen deine Zahlung …', '<span class="ord__spin" aria-hidden="true"></span>Das dauert nur ein paar Sekunden.');
      setTimeout(poll, 3000);
    }, function (e) { problem('Wir finden diese Bestellung nicht', esc(e.message) + ' Starte die Reservierung bitte noch einmal.'); });
  }

  function start() {
    if (!window.KR_SHOP) return setTimeout(start, 50);
    if (!token) return problem('Hier fehlt die Bestellnummer', 'Dieser Link gehört zu keiner Zahlung. Öffne deine Reservierung noch einmal.');
    poll();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
