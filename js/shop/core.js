/* Shared payment helpers (Lead Developer). Exposes window.KR_SHOP. Load with defer after resort-data.js and de.js.
   Prices come only from shop/catalog.json via the service; the browser only shows what the service answers. */
(function () {
  'use strict';
  var script = document.currentScript;
  var ROOT = new URL('../../', script ? script.src : location.href).href;
  var API = ROOT + 'api/shop/';
  var SITE = (ROOT.match(/\/s\/([^\/]+)\/$/) || [])[1] || location.hostname.split('.')[0] || 'kokrobite-resort';
  var PREFIX = 'shop:' + SITE + ':', memory = {};

  function get(key, fallback) {
    try { var v = localStorage.getItem(PREFIX + key); return v === null ? fallback : JSON.parse(v); }
    catch (e) { return key in memory ? memory[key] : fallback; }
  }
  function set(key, value) { memory[key] = value; try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) {} return value; }

  function customerId() {
    var id = get('customer', null);
    if (!id) {
      var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', out = '', buf = new Uint8Array(24);
      if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(buf); else for (var j = 0; j < 24; j++) buf[j] = Math.random() * 256;
      for (var i = 0; i < 24; i++) out += chars[buf[i] % chars.length];
      id = set('customer', out);
    }
    return id;
  }

  function api(path, body) {
    var opts = body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
    return fetch(API + path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok || d.error) throw new Error(d.error || 'Etwas ist schiefgelaufen. Bitte versuche es noch einmal.');
        return d;
      });
    });
  }

  function money(cents) { return window.KR_DE ? KR_DE.money(cents / 100) : (cents / 100).toFixed(2).replace('.', ',') + ' €'; }

  /* The service line for a stay: item = room id, qty = nights, tarif option = 'woche' from 7 nights.
     The note carries the dates so the order is readable: 'KR-XXXXXX|2026-12-11|2026-12-14|2|Mia'. */
  function line(roomId, nights, note) {
    var o = {}; o['tarif-' + roomId] = nights >= 7 ? 'woche' : 'standard';
    return { item: roomId, qty: nights, options: o, note: note || '' };
  }

  /* Orders (tokens) kept in the browser, newest first. */
  function orders() { return get('orders', []); }
  function addOrder(token) { var l = orders().filter(function (t) { return t !== token; }); l.unshift(token); set('orders', l.slice(0, 30)); }

  window.KR_SHOP = {
    ROOT: ROOT, API: API, SITE: SITE, api: api, get: get, set: set, customerId: customerId, money: money, line: line,
    orders: orders, addOrder: addOrder,
    TEST_LABEL: 'Demo: nur Testzahlung, es bewegt sich kein echtes Geld. Teste mit der Karte 4242 4242 4242 4242.'
  };
})();
