(() => {
  'use strict';

  // ECB snapshot, quoted per EUR. Update date and both rates together after review.
  // https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html
  const snapshot = { date: '2026-09-10', GBP: 0.85915, USD: 1.1616 };
  const rates = { GBP: 1, USD: snapshot.USD / snapshot.GBP, EUR: 1 / snapshot.GBP };
  const selectors = [...document.querySelectorAll('[data-currency-select]')];
  const prices = [...document.querySelectorAll('[data-price-gbp]')];
  if (!selectors.length || !prices.length) return;

  const date = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
  }).format(new Date(snapshot.date + 'T00:00:00Z'));

  function update(currency, announce = true) {
    if (!Object.hasOwn(rates, currency)) currency = 'GBP';
    const converted = currency !== 'GBP';
    const formatter = new Intl.NumberFormat('en-GB', {
      style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0
    });
    // Always convert the original GBP amount, never an already rounded display value.
    prices.forEach(price => {
      const amount = Number(price.dataset.priceGbp) * rates[currency];
      price.textContent = (price.dataset.pricePrefix || '') +
        (converted ? '\u2248 ' : '') + formatter.format(amount);
    });
    selectors.forEach(select => { select.value = currency; });
    document.querySelectorAll('[data-currency-note]').forEach(note => {
      note.textContent = converted
        ? `Approximate ${currency} prices, excluding VAT. Rate snapshot: ${date} (not live). Rounded to the nearest whole ${currency === 'USD' ? 'dollar' : 'euro'}.`
        : 'Prices in GBP, excluding VAT.';
    });
    document.querySelectorAll('[data-rate-source]').forEach(source => { source.hidden = !converted; });
    if (announce) document.getElementById('currency-status').textContent =
      `All catalogue, analytical method and package prices are now in ${currency}${converted ? ', indicative conversions' : ''}, excluding VAT.`;
  }

  update('GBP', false);
  selectors.forEach(select => select.addEventListener('change', () => update(select.value)));
  document.querySelectorAll('[data-currency-controls]').forEach(control => { control.hidden = false; });
})();
