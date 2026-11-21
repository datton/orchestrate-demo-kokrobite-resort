/* Kokrobite Resort demo data (Senior Developer 1). FICTIONAL hotel, rooms and prices: demo only, nothing is booked or paid.
   window.KR_DATA = { currency, demo, label, rooms, room(id), today(), bookedDates(roomId) -> Set of ISO dates (nights taken),
                      isBooked(roomId, iso), quote(roomId, inISO, outISO, guests) -> {nights, perNight, subtotal, discount, total, ok, error} }
   bookedRanges are [startOffset, endOffset) in days from today (the end day is the check-out day and is free), so
   availability is always relative to today. From 7 nights the stay is 10 % cheaper (whole euros). */
(function () {
  'use strict';
  var DAY = 86400000, MAX_NIGHTS = 30, DISCOUNT_FROM = 7, DISCOUNT_PCT = 10;

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(ms) { var d = new Date(ms); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function parse(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return NaN;
    var ms = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    return iso(ms) === s ? ms : NaN;
  }
  function today() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  var rooms = [
    { id: 'meerblick-suite', name: 'Meerblick-Suite', maxGuests: 2, pricePerNight: 310, sizeM2: 58,
      blurb: 'Weite Suite mit eigenem Balkon und Blick auf den Atlantik. Zum Aufwachen mit dem Rauschen der Wellen.',
      features: ['Balkon mit Meerblick', 'Großes Bett', 'Regendusche', 'Klimaanlage', 'WLAN'],
      bookedRanges: [[3, 7], [20, 25], [48, 53]] },
    { id: 'palmengarten-zimmer', name: 'Palmengarten-Zimmer', maxGuests: 2, pricePerNight: 190, sizeM2: 34,
      blurb: 'Helles Zimmer mit Terrasse zum Garten. Ruhig, grün und nur wenige Schritte vom Pool.',
      features: ['Eigene Terrasse', 'Gartenblick', 'Klimaanlage', 'WLAN', 'Teekocher'],
      bookedRanges: [[0, 3], [11, 16], [34, 40]] },
    { id: 'strandhaus', name: 'Strandhaus', maxGuests: 4, pricePerNight: 420, sizeM2: 86,
      blurb: 'Ein kleines Haus für Freundinnen oder Familie: zwei Schlafzimmer, Wohnbereich und Veranda in Strandnähe.',
      features: ['Zwei Schlafzimmer', 'Wohnbereich', 'Veranda', 'Klimaanlage', 'WLAN'],
      bookedRanges: [[6, 12], [27, 33]] },
    { id: 'ruckzugs-studio', name: 'Rückzugs-Studio', maxGuests: 1, pricePerNight: 150, sizeM2: 26,
      blurb: 'Das Zimmer für alle, die allein reisen: gemütlich, sicher gelegen und mit einem Platz zum Schreiben und Durchatmen.',
      features: ['Für eine Person', 'Schreibtisch', 'Klimaanlage', 'WLAN', 'Leseecke'],
      bookedRanges: [[2, 5], [14, 18], [41, 46]] },
    { id: 'freundinnen-suite', name: 'Freundinnen-Suite', maxGuests: 3, pricePerNight: 360, sizeM2: 72,
      blurb: 'Drei Betten, ein großer Wohnraum und eine Dachterrasse für lange Abende. Gemacht für Reisen zu dritt.',
      features: ['Drei Betten', 'Dachterrasse', 'Wohnraum', 'Klimaanlage', 'WLAN'],
      bookedRanges: [[9, 14], [30, 36]] }
  ];
  rooms.forEach(function (r) { r.demo = true; r.currency = 'EUR'; });

  function room(id) { for (var i = 0; i < rooms.length; i++) if (rooms[i].id === id) return rooms[i]; return null; }

  function bookedDates(roomId) {
    var set = new Set(), r = typeof roomId === 'string' ? room(roomId) : roomId, base = parse(today());
    ((r && r.bookedRanges) || []).forEach(function (rg) { for (var d = rg[0]; d < rg[1]; d++) set.add(iso(base + d * DAY)); });
    return set;
  }
  function isBooked(roomId, isoDate) { return bookedDates(roomId).has(isoDate); }

  function fail(r, nights, error) {
    return { nights: nights, perNight: r ? r.pricePerNight : 0, subtotal: 0, discount: 0, total: 0, ok: false, error: error, currency: 'EUR' };
  }

  function quote(roomId, inISO, outISO, guests) {
    var r = typeof roomId === 'string' ? room(roomId) : roomId;
    if (!r) return fail(null, 0, 'Bitte wähle zuerst ein Zimmer.');
    var a = parse(inISO), b = parse(outISO);
    if (isNaN(a) || isNaN(b)) return fail(r, 0, 'Bitte wähle An- und Abreisedatum.');
    var nights = Math.round((b - a) / DAY);
    if (nights < 1) return fail(r, 0, 'Die Abreise muss nach der Anreise liegen.');
    if (a < parse(today())) return fail(r, nights, 'Die Anreise darf nicht in der Vergangenheit liegen.');
    if (nights > MAX_NIGHTS) return fail(r, nights, 'Du kannst höchstens ' + MAX_NIGHTS + ' Nächte am Stück buchen.');
    var g = guests == null ? 1 : Number(guests);
    if (!isFinite(g) || g < 1 || Math.floor(g) !== g) return fail(r, nights, 'Bitte gib die Zahl der Gäste an.');
    if (g > r.maxGuests) return fail(r, nights, 'Dieses Zimmer bietet Platz für höchstens ' + r.maxGuests + (r.maxGuests === 1 ? ' Gast.' : ' Gäste.'));
    var booked = bookedDates(r);
    for (var t = a; t < b; t += DAY) {
      if (booked.has(iso(t))) return fail(r, nights, 'Einige dieser Nächte sind leider schon vergeben. Bitte wähle andere Daten.');
    }
    var subtotal = r.pricePerNight * nights;
    var discount = nights >= DISCOUNT_FROM ? Math.round(subtotal * DISCOUNT_PCT / 100) : 0;
    return { nights: nights, perNight: r.pricePerNight, subtotal: subtotal, discount: discount, total: subtotal - discount, ok: true, error: '', currency: 'EUR', guests: g };
  }

  window.KR_DATA = { currency: 'EUR', demo: true, label: 'Fiktives Hotel: Demo-Zimmer und Demo-Preise', maxNights: MAX_NIGHTS,
    discountFromNights: DISCOUNT_FROM, discountPercent: DISCOUNT_PCT,
    rooms: rooms, room: room, byId: room, get: room, today: today, bookedDates: bookedDates, isBooked: isBooked, quote: quote };
})();
