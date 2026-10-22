// utils/gst.js
// Single source of truth for GST on a sale. Used by saleController.createSale
// (the server ALWAYS recalculates - it never trusts GST figures sent by the
// browser). The client has a matching copy in client/src/utils/gst.js for the
// live preview; keep the two identical.
//
// THE PRICE IS THE MRP *INCLUDING* GST. The customer pays the MRP - GST is
// never added on top of it. The GST that is already inside the MRP is
// extracted:
//
//   Taxable value      = GST-inclusive amount x 100 / (100 + total GST rate)
//   Total GST included = GST-inclusive amount - Taxable value
//
// Example: MRP 85,000, SGST 9% + CGST 9% (total 18%)
//   Taxable value      = 85,000 x 100 / 118       =  72,033.90
//   Total GST included = 85,000 - 72,033.90       =  12,966.10
//   SGST @ 9%          = 6,483.05
//   CGST @ 9%          = 6,483.05
//   Amount payable     = 85,000.00   (unchanged)
//
// Which GST structure applies depends on the sale ("supplyType"):
//   'intra' (within the state, default): SGST + CGST
//   'inter' (to another state):          IGST only
// Both are never applied together. If a product only has the other
// structure configured, its rate is carried across (IGST 18 -> SGST 9 + CGST 9
// within the state; SGST 9 + CGST 9 -> IGST 18 to another state), because the
// total rate is the same either way.
//
// All maths is done in whole paise with BigInt (rates in hundredths of a
// percent), so there is no floating-point drift. Each amount is rounded half-up
// to the paisa ONCE, and the parts are derived so they always add up:
//   taxable + GST included = amount payable   (per line)
//   SGST + CGST (or IGST)  = GST included     (per line)
//   sum of lines           = bill total
// A bill discount is spread across the lines in proportion to their value and
// reduces the amount payable (and therefore the GST inside it).

const toPaise = (n) => {
  const v = Number(n);
  return BigInt(Number.isFinite(v) ? Math.round(v * 100) : 0);
};
const fromPaise = (p) => Number(p) / 100;

// A rate in percent -> hundredths of a percent (9 -> 900n, 2.5 -> 250n), clamped 0-100.
const toBp = (rate) => {
  const v = Number(rate);
  if (!Number.isFinite(v) || v < 0) return 0n;
  return BigInt(Math.round(Math.min(v, 100) * 100));
};

// Integer division rounded half-up (non-negative operands only).
const divRound = (num, den) => (num * 2n + den) / (den * 2n);

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Which rates apply to this sale (never both structures at once).
function resolveRates(product, supplyType) {
  const s = toBp(product.sgstRate);
  const c = toBp(product.cgstRate);
  const i = toBp(product.igstRate);
  if (supplyType === 'inter') {
    return { sgst: 0n, cgst: 0n, igst: i > 0n ? i : s + c };
  }
  if (s > 0n || c > 0n) return { sgst: s, cgst: c, igst: 0n };
  const half = i / 2n; // only IGST configured: split equally within the state
  return { sgst: half, cgst: i - half, igst: 0n };
}

// Spreads `discount` (paise) over the lines in proportion to their value.
// The last line takes the remainder so the shares add up exactly.
function allocateDiscount(values, discount) {
  const total = values.reduce((a, b) => a + b, 0n);
  if (total <= 0n || discount <= 0n) return values.map(() => 0n);
  let allocated = 0n;
  return values.map((value, i) => {
    let share = i === values.length - 1 ? discount - allocated : divRound(discount * value, total);
    if (share > value) share = value;
    if (share < 0n) share = 0n;
    allocated += share;
    return share;
  });
}

// lines: [{ subtotal, sgstRate, cgstRate, igstRate }]
//   subtotal = quantity x price, where price is the GST-INCLUSIVE MRP.
function calculateGst(lines, discount = 0, supplyType = 'intra') {
  const values = lines.map((l) => toPaise(l.subtotal));
  const itemsTotal = values.reduce((a, b) => a + b, 0n);
  let billDiscount = toPaise(discount);
  if (billDiscount < 0n) billDiscount = 0n;
  if (billDiscount > itemsTotal) billDiscount = itemsTotal;
  const shares = allocateDiscount(values, billDiscount);

  const computed = lines.map((l, i) => {
    const rates = resolveRates(l, supplyType);
    const totalBp = rates.sgst + rates.cgst + rates.igst;
    const payable = values[i] - shares[i];
    const taxable = totalBp === 0n ? payable : divRound(payable * 10000n, 10000n + totalBp);
    const gstIncluded = payable - taxable;

    let sgstAmount = 0n;
    let cgstAmount = 0n;
    let igstAmount = 0n;
    if (gstIncluded > 0n) {
      if (rates.igst > 0n) {
        igstAmount = gstIncluded;
      } else {
        sgstAmount = divRound(gstIncluded * rates.sgst, rates.sgst + rates.cgst);
        cgstAmount = gstIncluded - sgstAmount;
      }
    }
    return {
      discountShare: shares[i],
      taxableValue: taxable,
      sgstRate: rates.sgst,
      cgstRate: rates.cgst,
      igstRate: rates.igst,
      sgstAmount,
      cgstAmount,
      igstAmount,
      gstTotal: gstIncluded,
      lineTotal: payable,
    };
  });

  const sum = (key) => computed.reduce((s, l) => s + l[key], 0n);
  const money = ['discountShare', 'taxableValue', 'sgstAmount', 'cgstAmount', 'igstAmount', 'gstTotal', 'lineTotal'];

  return {
    lines: computed.map((l) => {
      const out = {};
      Object.keys(l).forEach((k) => {
        out[k] = money.includes(k) ? fromPaise(l[k]) : Number(l[k]) / 100; // rates back to percent
      });
      return out;
    }),
    totals: {
      itemsTotal: fromPaise(itemsTotal),
      discount: fromPaise(sum('discountShare')),
      taxableTotal: fromPaise(sum('taxableValue')),
      sgstTotal: fromPaise(sum('sgstAmount')),
      cgstTotal: fromPaise(sum('cgstAmount')),
      igstTotal: fromPaise(sum('igstAmount')),
      gstTotal: fromPaise(sum('gstTotal')),
      // Amount payable = sum of the GST-inclusive line amounts after discount.
      grandTotal: fromPaise(sum('lineTotal')),
    },
  };
}

module.exports = { calculateGst, round2 };
