// src/utils/gst.js
// GST maths for the billing screen and the product form. This is the same
// algorithm as server/utils/gst.js (keep the two identical): the client uses it
// for live previews, and the SERVER recalculates everything when a sale is
// saved, so the saved invoice is always the server's figure.
//
// THE PRICE IS THE MRP *INCLUDING* GST - GST is never added on top of it.
//   Taxable value      = GST-inclusive amount x 100 / (100 + total GST rate)
//   Total GST included = GST-inclusive amount - Taxable value
// Example: MRP 85,000, SGST 9% + CGST 9%
//   Taxable 72,033.90, SGST 6,483.05, CGST 6,483.05, GST included 12,966.10,
//   amount payable 85,000.00.
//
// Within the state ('intra', default) SGST + CGST apply; to another state
// ('inter') IGST applies instead - never both. All amounts are worked out in
// whole paise (BigInt) and rounded half-up once, so the parts always add up.

const toPaise = (n) => {
  const v = Number(n);
  return BigInt(Number.isFinite(v) ? Math.round(v * 100) : 0);
};
const fromPaise = (p) => Number(p) / 100;

const toBp = (rate) => {
  const v = Number(rate);
  if (!Number.isFinite(v) || v < 0) return 0n;
  return BigInt(Math.round(Math.min(v, 100) * 100));
};

const divRound = (num, den) => (num * 2n + den) / (den * 2n);

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

function resolveRates(product, supplyType) {
  const s = toBp(product.sgstRate);
  const c = toBp(product.cgstRate);
  const i = toBp(product.igstRate);
  if (supplyType === 'inter') {
    return { sgst: 0n, cgst: 0n, igst: i > 0n ? i : s + c };
  }
  if (s > 0n || c > 0n) return { sgst: s, cgst: c, igst: 0n };
  const half = i / 2n;
  return { sgst: half, cgst: i - half, igst: 0n };
}

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

// lines: [{ subtotal, sgstRate, cgstRate, igstRate }]  (subtotal = qty x GST-inclusive price)
export function calculateGst(lines, discount = 0, supplyType = 'intra') {
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

  return {
    lines: computed.map((l) => {
      const out = {};
      Object.keys(l).forEach((k) => {
        out[k] = Number(l[k]) / 100; // paise -> rupees, hundredths-of-percent -> percent
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
      grandTotal: fromPaise(sum('lineTotal')),
    },
  };
}

// What ONE unit of a product carries, for the Products screens and the
// product form preview. A product configured with only IGST is previewed as
// an other-state (IGST) sale; otherwise as a within-state (SGST + CGST) sale.
// If both structures are configured, `interGstIncluded` is also returned so
// the form can show what an other-state sale would carry.
export function productGst(product) {
  const s = Number(product.sgstRate) || 0;
  const c = Number(product.cgstRate) || 0;
  const i = Number(product.igstRate) || 0;
  const price = Number(product.price) || 0;
  const igstOnly = i > 0 && !(s > 0 || c > 0);
  const line = { subtotal: price, sgstRate: s, cgstRate: c, igstRate: i };

  const main = calculateGst([line], 0, igstOnly ? 'inter' : 'intra').lines[0];
  const hasBoth = i > 0 && (s > 0 || c > 0);
  const inter = hasBoth ? calculateGst([line], 0, 'inter').lines[0] : null;

  return {
    mrp: price,
    structure: igstOnly ? 'inter' : 'intra',
    taxableValue: main.taxableValue,
    sgstRate: main.sgstRate,
    cgstRate: main.cgstRate,
    igstRate: main.igstRate,
    sgstAmount: main.sgstAmount,
    cgstAmount: main.cgstAmount,
    igstAmount: main.igstAmount,
    gstIncluded: main.gstTotal,
    interGstIncluded: inter ? inter.gstTotal : null,
    interIgstRate: inter ? inter.igstRate : null,
  };
}

// "6%" / "2.5%" - no trailing zeros.
export const formatRate = (rate) => `${Number(rate) || 0}%`;

// " (9%)" when every line has the same rate for this component, else "".
// Used to label the totals rows of a bill ("SGST (9%)").
export function uniformRateLabel(lines, key) {
  if (!lines.length) return '';
  const rates = new Set(lines.map((l) => Number(l[key]) || 0));
  return rates.size === 1 ? ` (${formatRate([...rates][0])})` : '';
}
