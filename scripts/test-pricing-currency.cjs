const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'assets/js/pricing-currency.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'services/index.html'), 'utf8');

function page() {
  const prices = [...html.matchAll(/<strong data-price-gbp="(\d+)"(?: data-price-prefix="([^"]*)")?>([^<]*)<\/strong>/g)]
    .map(([, amount, prefix, text]) => ({ dataset: { priceGbp: amount, pricePrefix: prefix }, textContent: text }));
  const selectors = [0, 1].map(() => ({ value: 'GBP', addEventListener(event, fn) { this.change = fn; } }));
  const controls = [{ hidden: true }, { hidden: true }];
  const notes = [{}, {}];
  const sources = [{ hidden: true }, { hidden: true }];
  const status = { textContent: '' };
  const nodes = { '[data-price-gbp]': prices, '[data-currency-select]': selectors,
    '[data-currency-controls]': controls, '[data-currency-note]': notes, '[data-rate-source]': sources };
  vm.runInNewContext(script, { Intl, Date, document: {
    querySelectorAll: query => nodes[query] || [], getElementById: () => status
  } });
  return { prices, selectors, controls, notes, sources, status };
}

test('all prices convert from GBP, preserve prefixes, and return exactly to GBP', () => {
  const p = page();
  assert.equal(p.prices.length, 22);
  const originals = p.prices.map(x => x.textContent);
  assert(p.controls.every(x => !x.hidden));
  assert.equal(p.status.textContent, '');
  for (const currency of ['USD', 'EUR', 'USD', 'GBP']) {
    p.selectors[1].value = currency;
    p.selectors[1].change();
    assert(p.selectors.every(x => x.value === currency));
    const rate = { GBP: 1, USD: 1.1616 / 0.85915, EUR: 1 / 0.85915 }[currency];
    const format = new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 0, minimumFractionDigits: 0 });
    for (const item of p.prices) assert.equal(item.textContent,
      (item.dataset.pricePrefix || '') + (currency === 'GBP' ? '' : '\u2248 ') + format.format(Number(item.dataset.priceGbp) * rate));
    if (currency !== 'GBP') {
      assert(p.notes.every(x => x.textContent.includes('10 September 2026 (not live)')));
      assert(p.sources.every(x => !x.hidden));
    }
  }
  assert.deepEqual(p.prices.map(x => x.textContent), originals);
  assert(p.sources.every(x => x.hidden));
  assert(p.notes.every(x => x.textContent === 'Prices in GBP, excluding VAT.'));
});

test('unknown currencies fall back to GBP', () => {
  const p = page();
  for (const value of ['JPY', '', 'toString', '__proto__']) {
    p.selectors[0].value = value;
    p.selectors[0].change();
    assert(p.selectors.every(x => x.value === 'GBP'));
  }
});

test('GBP fallback, pricing coverage and no external runtime dependency', () => {
  assert.equal((html.match(/\u00a3[\d,]+/g) || []).length, 22);
  assert.equal((html.match(/data-currency-controls hidden/g) || []).length, 2);
  assert(html.includes('<strong>&mdash;</strong>'));
  assert(!/fetch\(|XMLHttpRequest|localStorage|sessionStorage|document\.cookie|innerHTML/.test(script));
  vm.runInNewContext(script, { document: { querySelectorAll: () => [] } });
});
