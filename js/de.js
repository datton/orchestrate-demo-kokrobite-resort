/* KR_DE: German (de-DE) formatting helpers shared by every page. */
(function () {
  var MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  var MONTHS_SHORT = ['Jan.','Feb.','März','Apr.','Mai','Juni','Juli','Aug.','Sept.','Okt.','Nov.','Dez.'];
  var WEEKDAYS = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
  var WEEKDAYS_SHORT = ['So','Mo','Di','Mi','Do','Fr','Sa'];
  var WEEKDAYS_MON = ['Mo','Di','Mi','Do','Fr','Sa','So'];

  function parse(iso) {
    if (iso instanceof Date) return new Date(iso.getFullYear(), iso.getMonth(), iso.getDate());
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function iso(d) {
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function money(n) {
    n = Number(n) || 0;
    var neg = n < 0, s = Math.abs(n).toFixed(2).split('.');
    s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '-' : '') + s[0] + ',' + s[1] + ' €';
  }
  function date(v) {
    var d = parse(v); if (!d) return '';
    return WEEKDAYS_SHORT[d.getDay()] + ', ' + d.getDate() + '. ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }
  function dateShort(v) {
    var d = parse(v); if (!d) return '';
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear();
  }
  function nights(n) { n = Number(n) || 0; return n + (n === 1 ? ' Nacht' : ' Nächte'); }

  window.KR_DE = {
    money: money, date: date, dateShort: dateShort, nights: nights,
    parse: parse, iso: iso,
    months: MONTHS, monthsShort: MONTHS_SHORT,
    weekdays: WEEKDAYS, weekdaysShort: WEEKDAYS_SHORT, weekdaysMon: WEEKDAYS_MON
  };
})();
