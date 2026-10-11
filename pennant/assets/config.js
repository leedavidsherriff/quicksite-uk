/* Everything that changes from one installer, or one supplier, to the next.
   A new client is this file plus their prices in prices.js.

   Pitch overrides in the address, kept for the visit:
     ?name=Smith+Windows      the installer's name everywhere
     ?town=Neath              the town in the hero line
     ?supplier=none           library mode: no supplier on the spec sheet
     ?supplier=gap            (default) frames named as GAP's own ranges */
(function () {
  var q = new URLSearchParams(location.search);
  function keep(key, fallback) {
    var v = (q.get(key) || '').trim().slice(0, 40);
    try {
      if (v) sessionStorage.setItem('pn-' + key, v);
      else v = sessionStorage.getItem('pn-' + key) || '';
    } catch (e) { /* private mode */ }
    return v || fallback;
  }

  var name = keep('name', 'Pennant Windows & Doors');

  // Product lines named on the spec sheet. This is the pull-through a supplier
  // pays for: every quote leaves the house naming their frames. No logo, no
  // "powered by" — the installer's site stays the installer's.
  var SUPPLIERS = {
    gap: {
      key: 'gap',
      by: 'GAP',
      window: 'Homeframe uPVC',
      front: 'Rockdoor composite',
      frontgrp: 'Homeframe GRP composite',
      bifold: 'Homeview aluminium',
      door: 'Homeframe uPVC',
      roofline: 'HomeLine uPVC'
    },
    none: {
      key: 'none',
      by: '',
      window: 'Made-to-measure uPVC',
      front: 'Premium composite',
      frontgrp: 'GRP composite',
      bifold: 'Slimline aluminium',
      door: 'Made-to-measure uPVC',
      roofline: 'uPVC'
    }
  };

  window.BIZ = {
    name: name,
    // Ofcom's drama range, so it rings nobody.
    phone: '01632 960712',
    tel: 'tel:+441632960712',
    whatsapp: '441632960712',
    town: keep('town', 'Bridgend'),
    areas: ['Bridgend', 'Porthcawl', 'Pencoed', 'Maesteg', 'Cowbridge', 'Barry', 'Llantwit Major', 'Pontypridd', 'Cardiff', 'Port Talbot', 'Neath'],
    surveyDays: [1, 2, 3, 4, 5, 6],
    supplier: SUPPLIERS[keep('supplier', 'gap')] || SUPPLIERS.gap,
    // The deployed photo reader (~/windows-doors-app/worker). It allows
    // github.io and localhost origins only.
    reader: 'https://windows-doors-reader.honest-misty-photo-reader.workers.dev'
  };
})();
