/* Pennant price list: the whole range, every option, in the open.
   Supplied and fitted, per opening, inc VAT, old frames out and taken away.

   This is the file a supplier's real list drops into. Today the figures are
   guide estimates: the midpoints of ~/gap-demo/PRICING.md (public 2026 UK
   installed-price guides, calibrated for South Wales), shared with every
   window tool in the family. Shown to the homeowner as a band, midpoint ±6%,
   so no range spans more than 15% (Lee's rule, 15 Aug 2026).

   Product names come from the supplier in config.js (`range`), so the same
   table reads "Rockdoor composite" on a GAP installer's site and "Premium
   composite" on a library site. */
(function () {
  var SIZES = {
    S: { name: 'Small', hint: 'up to ~0.6m², e.g. 600×900mm' },
    M: { name: 'Standard', hint: 'up to ~1.5m², e.g. 1200×1200mm' },
    L: { name: 'Large', hint: 'over 1.5m², e.g. 1800×1200mm' }
  };

  // range: which supplier product line it is (see config.js SUPPLIERS)
  var KINDS = {
    casement: { group: 'Windows', cat: 'window', range: 'window', name: 'Casement', sized: true, price: { S: 490, M: 640, L: 850 }, note: 'Side- or top-hung. The usual UK window.' },
    flush:    { group: 'Windows', cat: 'window', range: 'window', name: 'Flush casement', sized: true, price: { S: 565, M: 735, L: 975 }, note: 'Sashes sit flush in the frame, like timber.' },
    sash:     { group: 'Windows', cat: 'window', range: 'window', name: 'Sliding sash', sized: true, price: { S: 815, M: 1010, L: 1260 }, note: 'Vertical sliders for period homes.' },
    tilt:     { group: 'Windows', cat: 'window', range: 'window', name: 'Tilt & turn', sized: true, price: { S: 560, M: 740, L: 960 }, note: 'Tilts in to air, swings in to clean.' },
    bay3:     { group: 'Windows', cat: 'window', range: 'window', name: '3-panel bay', price: 1700, note: 'Per bay, all three frames.' },
    bay4:     { group: 'Windows', cat: 'window', range: 'window', name: '4-panel bay', price: 2100, note: 'Per bay, all four frames.' },
    bow:      { group: 'Windows', cat: 'window', range: 'window', name: 'Bow window', price: 2425, note: 'Five or more frames on a curve.' },
    front:    { group: 'Front doors', cat: 'door', range: 'front', name: 'Front door', price: 1925, colourIn: true, note: 'Solid-core composite, multi-point locking, colour and hardware included.' },
    frontgrp: { group: 'Front doors', cat: 'door', range: 'frontgrp', name: 'Front door', price: 1550, colourIn: true, note: 'GRP composite skin, colour and hardware included.' },
    back:     { group: 'Garden & back doors', cat: 'door', range: 'door', name: 'Back door', price: 900, note: 'Half-glazed, multi-point locking.' },
    french:   { group: 'Garden & back doors', cat: 'door', range: 'door', name: 'French doors', price: 1275, note: 'A pair, opening out.' },
    patio:    { group: 'Garden & back doors', cat: 'door', range: 'door', name: 'Patio slider', price: 1950, note: 'Two panes, up to 2.5m.' },
    patio3:   { group: 'Garden & back doors', cat: 'door', range: 'door', name: 'Wide patio slider', price: 2600, note: 'Three metres and over.' },
    bifold2:  { group: 'Bi-folds', cat: 'door', range: 'bifold', name: '2-panel bi-fold', price: 3200, colourIn: true, note: 'Aluminium, about 1.8m.' },
    bifold3:  { group: 'Bi-folds', cat: 'door', range: 'bifold', name: '3-panel bi-fold', price: 3750, colourIn: true, note: 'Aluminium, about 2.4m.' },
    bifold4:  { group: 'Bi-folds', cat: 'door', range: 'bifold', name: '4-panel bi-fold', price: 5050, colourIn: true, note: 'Aluminium, about 3.2m.' },
    bifold5:  { group: 'Bi-folds', cat: 'door', range: 'bifold', name: '5-panel bi-fold', price: 6250, colourIn: true, note: 'Aluminium, about 4m.' }
  };
  var WINDOW_KINDS = ['casement', 'flush', 'sash', 'tilt', 'bay3', 'bay4', 'bow'];
  var DOOR_KINDS = ['front', 'frontgrp', 'back', 'french', 'patio', 'patio3', 'bifold2', 'bifold3', 'bifold4', 'bifold5'];
  var BAYS = { bay3: 3, bay4: 4, bow: 5 };   // frames in a bay, for per-frame options

  // Every colour on the range. `photo` is the nearest of the three colours we
  // can draw on a photo; the sheet always names the real one.
  var FINISHES = {
    white:      { name: 'White', mult: 1, hex: '#F2F1EC', photo: 'white', swatch: 'media/swatch-white.webp' },
    cream:      { name: 'Cream', mult: 1.15, hex: '#E9E0C6', photo: 'white' },
    anthracite: { name: 'Anthracite grey', mult: 1.18, hex: '#383E42', photo: 'anthracite', swatch: 'media/swatch-anthracite.webp' },
    agate:      { name: 'Agate grey', mult: 1.18, hex: '#8C9190', photo: 'anthracite' },
    black:      { name: 'Black', mult: 1.18, hex: '#1B1C1E', photo: 'anthracite', swatch: 'media/swatch-black.webp' },
    chartwell:  { name: 'Chartwell green', mult: 1.2, hex: '#A9B8A0', photo: 'white' },
    oak:        { name: 'Golden oak', mult: 1.22, hex: '#A8692F', photo: 'oak', swatch: 'media/swatch-oak.webp' },
    irishoak:   { name: 'Irish oak', mult: 1.22, hex: '#7A4E2C', photo: 'oak' },
    rosewood:   { name: 'Rosewood', mult: 1.22, hex: '#5C2E22', photo: 'oak' }
  };
  var FINISH_ORDER = ['white', 'anthracite', 'oak', 'black', 'agate', 'cream', 'chartwell', 'irishoak', 'rosewood'];

  // Options a homeowner can switch on any opening. Per frame (bays multiply).
  var OPTIONS = {
    triple:  { name: 'Triple glazing', for: 'window', add: { S: 90, M: 140, L: 210 }, note: 'Warmer and quieter. Worth it on a main road.' },
    obscure: { name: 'Obscure glass', for: 'window', add: { S: 35, M: 45, L: 60 }, note: 'Bathrooms and landings.' },
    tough:   { name: 'Toughened glass', for: 'window', add: { S: 40, M: 55, L: 75 }, note: 'Required low down and near doors, and included there free. This is for anywhere else.' },
    bars:    { name: 'Georgian bars', for: 'window', add: { S: 60, M: 80, L: 110 }, note: 'Period look, bonded to the glass.' },
    sill:    { name: 'New inside sill', for: 'window', add: { S: 45, M: 45, L: 55 }, note: 'Replaces the window board inside.' },
    side:    { name: 'Glazed side panel', for: 'front', add: 620, note: 'Full-height panel beside the door.' },
    top:     { name: 'Glazed top light', for: 'front', add: 340, note: 'Fanlight above the door.' }
  };
  var WINDOW_OPTS = ['triple', 'obscure', 'tough', 'bars', 'sill'];
  var FRONT_OPTS = ['side', 'top'];

  // Roofline, priced per metre of the front: fascia, soffit and guttering
  // together, from a tower (scaffold is quoted separately if a house needs it).
  var ROOFLINE = { name: 'Roofline', perMetre: 85, range: 'roofline', note: 'Fascia, soffit and guttering, priced per metre of the front.' };

  // Fitting a house in one visit saves a second van, a second day and a second
  // skip, so a whole-house job is genuinely cheaper per opening.
  var MULTI_MIN = 5, MULTI_OFF = 0.08;

  var r10 = function (n) { return Math.round(n / 10) * 10; };
  var band = function (mid) { return [r10(mid * 0.94), r10(mid * 1.06)]; };
  var frames = function (item) { return BAYS[item.kind] || 1; };

  function optAdd(item, key) {
    var o = OPTIONS[key], a = o.add;
    if (typeof a === 'number') return a;
    var k = KINDS[item.kind];
    return a[k.sized ? (item.size || 'M') : 'M'] * frames(item);
  }
  function optionsFor(item) {
    var k = KINDS[item.kind];
    if (k.cat === 'window') return WINDOW_OPTS;
    if (item.kind === 'front' || item.kind === 'frontgrp') return FRONT_OPTS;
    return [];
  }
  function unit(item, finish) {
    var k = KINDS[item.kind];
    var base = k.sized ? k.price[item.size || 'M'] : k.price;
    var opts = item.opts || {};
    optionsFor(item).forEach(function (key) { if (opts[key]) base += optAdd(item, key); });
    return k.colourIn ? r10(base) : r10(base * FINISHES[finish || 'white'].mult);
  }
  function rooflineCost(m, finish) {
    return m > 0 ? r10(m * ROOFLINE.perMetre * (FINISHES[finish || 'white'].mult > 1 ? 1.12 : 1)) : 0;
  }
  function totals(items, finish, roofM) {
    var on = items.filter(function (i) { return i.on !== false; });
    var sub = on.reduce(function (s, i) { return s + unit(i, finish); }, 0);
    var units = on.length;
    var off = units >= MULTI_MIN ? r10(sub * MULTI_OFF) : 0;
    var roof = rooflineCost(roofM || 0, finish);
    var mid = sub - off + roof;
    return { units: units, sub: sub, off: off, roof: roof, mid: mid, band: band(mid) };
  }
  function label(item) {
    var k = KINDS[item.kind];
    return k.sized ? SIZES[item.size || 'M'].name + ' ' + k.name.toLowerCase().replace(/\bfrench\b/, 'French') : k.name;
  }
  function optLabels(item) {
    var opts = item.opts || {};
    return optionsFor(item).filter(function (key) { return opts[key]; }).map(function (key) { return OPTIONS[key].name.toLowerCase().replace(/\bgeorgian\b/, 'Georgian'); });
  }
  var gbp = function (n) { return '£' + Math.round(n).toLocaleString('en-GB'); };
  var range = function (b) { return gbp(b[0]) + '–' + gbp(b[1]); };

  window.PRICES = {
    SIZES: SIZES, KINDS: KINDS, WINDOW_KINDS: WINDOW_KINDS, DOOR_KINDS: DOOR_KINDS,
    FINISHES: FINISHES, FINISH_ORDER: FINISH_ORDER, OPTIONS: OPTIONS, ROOFLINE: ROOFLINE,
    MULTI_MIN: MULTI_MIN, MULTI_OFF: MULTI_OFF,
    unit: unit, optAdd: optAdd, optionsFor: optionsFor, rooflineCost: rooflineCost, totals: totals,
    band: band, label: label, optLabels: optLabels, gbp: gbp, range: range
  };
})();
