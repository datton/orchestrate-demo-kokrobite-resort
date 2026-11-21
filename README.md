# kokrobite-resort.demo.orchestrate.ca

Built live by the Orchestrate Solutions agent team in an Orchestrate demonstration. Static site: HTML, CSS and JavaScript, no build step.

**Fictional.** The hotel (a 5-star resort in Kokrobite, Ghana, for German-speaking women travellers), its rooms and its prices are invented for this demo and labelled so. No payment is taken, nothing is sent anywhere, and there is no phone, email or street address. Facts about Kokrobite and Ghana come only from `content/facts.md`.

## Language and pages
All visible copy is German (`<html lang="de">`). Dates and money use de-DE (`1.234,50 €`, `Mo, 3. Dezember 2026`).
Pages: `index.html` (home), `pages/zimmer.html` (rooms), `pages/reservierung.html` (reservation, the main feature), `pages/meine-reservierungen.html`, `pages/erlebnisse.html` (day planner), `pages/anreise.html` (arrival and safety), `pages/demo-hinweis.html` (about this demo and FAQ).

## Shared contract (one authority each)
- `js/resort-data.js` defines `window.KR_DATA`: `rooms` (id, name, blurb, maxGuests, pricePerNight in EUR, all fictional), `quote(roomId, inISO, outISO, guests)` returning `{nights, perNight, total, ok, error}`, and `bookedDates(roomId)` (unavailable dates, always relative to today). Everything that shows a price or availability uses it.
- `js/de.js` defines `window.KR_DE`: `money(n)`, `date(iso)`, `dateShort(iso)`, `nights(n)`, month and weekday names. Nobody writes their own formatter.
- `js/calendar.js` defines `KR_CAL.mount(container, {room, onChange(range)})`; `range` is `{in, out}` (ISO) or `null`.
- `js/tools.js` (the reservation logic) owns reservations in `localStorage` key `kokrobite:reservations` (array of `{ref, room, in, out, guests, nights, total, name, email, note, created}`), references `KR-XXXXXX`, `KR_RES.list() / add() / remove(ref) / ics(res)`. The reservation page and My reservations both use it.
- Query strings: `reservierung.html?room=<id>&in=<iso>&out=<iso>`.

## Look
`css/tokens.css` (Designer), `css/layout.css`, `js/nav.js`, `js/motion.js` (UI/UX), `css/site.css` (base, `.band`, `.band--dark`, `.prose`, `.demo-label`, `.guide-note`). Playful and colourful, one clear accent plus bright supporting colours, AA contrast.
