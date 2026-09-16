// controllers/aiController.js
//
// Rule-based / statistical "AI" logic (no external LLM API needed).
// Assumes Mongoose models: Product, Sale, Purchase
// ⚠️ ADJUST FIELD NAMES BELOW to match your actual schema if they differ.
//    Common fields assumed:
//      Product: { _id, name, sku, stock, reorderLevel, price, category, supplier }
//      Sale:    { _id, items: [{ product, quantity, price }], createdAt }
//      Purchase:{ _id, items: [{ product, quantity, cost }], createdAt }

const Product = require('../models/Product');
const Sale = require('../models/Sale');
// const Purchase = require('../models/Purchase'); // uncomment if you use purchase data too

// ---------------------------------------------------------------
// @desc    Suggest products that need reordering
// @route   GET /api/admin/ai/reorder-suggestions
// @access  Admin/Manager
//
// Logic: For each product, calculate average daily sales over the
// last 30 days. If current stock will run out within `leadTimeDays`,
// flag it for reorder and suggest a quantity.
// ---------------------------------------------------------------
const getReorderSuggestions = async (req, res) => {
  try {
    const leadTimeDays = parseInt(req.query.leadTimeDays) || 7; // default: 7 day supplier lead time
    const lookbackDays = 30;
    const since = new Date();
    since.setDate(since.getDate() - lookbackDays);

    const products = await Product.find({});

    // Aggregate total quantity sold per product in the lookback window
    const salesAgg = await Sale.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' },
        },
      },
    ]);

    const soldMap = {};
    salesAgg.forEach((row) => {
      soldMap[row._id.toString()] = row.totalSold;
    });

    const suggestions = products
      .map((p) => {
        const totalSold = soldMap[p._id.toString()] || 0;
        const avgDailySales = totalSold / lookbackDays;
        const daysOfStockLeft =
          avgDailySales > 0 ? p.stock / avgDailySales : Infinity;

        const needsReorder =
          daysOfStockLeft <= leadTimeDays || p.stock <= (p.reorderLevel || 0);

        // Suggest enough stock to cover lead time + a 14-day buffer
        const suggestedQty = Math.ceil(avgDailySales * (leadTimeDays + 14));

        return {
          productId: p._id,
          name: p.name,
          sku: p.sku,
          currentStock: p.stock,
          avgDailySales: Number(avgDailySales.toFixed(2)),
          daysOfStockLeft:
            daysOfStockLeft === Infinity
              ? null
              : Number(daysOfStockLeft.toFixed(1)),
          needsReorder,
          suggestedReorderQty: needsReorder ? suggestedQty : 0,
        };
      })
      .filter((p) => p.needsReorder)
      .sort((a, b) => (a.daysOfStockLeft ?? 0) - (b.daysOfStockLeft ?? 0));

    res.status(200).json({
      count: suggestions.length,
      leadTimeDays,
      suggestions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------
// @desc    Simple demand forecast based on recent sales trend
// @route   GET /api/admin/ai/demand-forecast
// @access  Admin/Manager
//
// Logic: Compare last 30 days sales vs previous 30 days sales per
// product to get a trend %, then project next 30 days demand.
// This is a simple moving-average trend model, not ML — but works
// well as a lightweight production-safe baseline.
// ---------------------------------------------------------------
const getDemandForecast = async (req, res) => {
  try {
    const now = new Date();
    const period1Start = new Date(now);
    period1Start.setDate(now.getDate() - 30); // last 30 days
    const period2Start = new Date(now);
    period2Start.setDate(now.getDate() - 60); // 30 days before that

    const recentAgg = await Sale.aggregate([
      { $match: { createdAt: { $gte: period1Start } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', qty: { $sum: '$items.quantity' } } },
    ]);

    const previousAgg = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: period2Start, $lt: period1Start },
        },
      },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', qty: { $sum: '$items.quantity' } } },
    ]);

    const recentMap = {};
    recentAgg.forEach((r) => (recentMap[r._id.toString()] = r.qty));
    const prevMap = {};
    previousAgg.forEach((r) => (prevMap[r._id.toString()] = r.qty));

    const products = await Product.find({});

    const forecast = products.map((p) => {
      const id = p._id.toString();
      const recentQty = recentMap[id] || 0;
      const prevQty = prevMap[id] || 0;

      let trendPercent = 0;
      if (prevQty > 0) {
        trendPercent = ((recentQty - prevQty) / prevQty) * 100;
      } else if (recentQty > 0) {
        trendPercent = 100; // new demand where there was none before
      }

      // Naive forecast: assume next 30 days continues the trend
      const forecastedQty = Math.max(
        0,
        Math.round(recentQty * (1 + trendPercent / 100))
      );

      return {
        productId: p._id,
        name: p.name,
        sku: p.sku,
        last30DaysSold: recentQty,
        previous30DaysSold: prevQty,
        trendPercent: Number(trendPercent.toFixed(1)),
        forecastedNext30Days: forecastedQty,
      };
    });

    // Sort by highest forecasted demand first
    forecast.sort((a, b) => b.forecastedNext30Days - a.forecastedNext30Days);

    res.status(200).json({ count: forecast.length, forecast });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------
// @desc    Detect anomalies in sales/stock (simple statistical outliers)
// @route   GET /api/admin/ai/anomalies
// @access  Admin/Manager
//
// Logic: Flag products whose daily sales on a given day are more
// than 2 standard deviations away from their own 30-day average
// (a classic, explainable outlier-detection rule).
// ---------------------------------------------------------------
const getAnomalies = async (req, res) => {
  try {
    const lookbackDays = 30;
    const since = new Date();
    since.setDate(since.getDate() - lookbackDays);

    // Daily sales per product
    const dailyAgg = await Sale.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            product: '$items.product',
            day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          },
          qty: { $sum: '$items.quantity' },
        },
      },
    ]);

    // Group by product -> array of daily quantities
    const byProduct = {};
    dailyAgg.forEach((row) => {
      const pid = row._id.product.toString();
      if (!byProduct[pid]) byProduct[pid] = [];
      byProduct[pid].push({ day: row._id.day, qty: row.qty });
    });

    const products = await Product.find({});
    const productMap = {};
    products.forEach((p) => (productMap[p._id.toString()] = p));

    const anomalies = [];

    Object.entries(byProduct).forEach(([pid, days]) => {
      const qtys = days.map((d) => d.qty);
      const mean = qtys.reduce((a, b) => a + b, 0) / qtys.length;
      const variance =
        qtys.reduce((sum, q) => sum + Math.pow(q - mean, 2), 0) / qtys.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev === 0) return; // no variation, nothing to flag

      days.forEach((d) => {
        const zScore = (d.qty - mean) / stdDev;
        if (Math.abs(zScore) > 2) {
          const p = productMap[pid];
          anomalies.push({
            productId: pid,
            name: p ? p.name : 'Unknown',
            sku: p ? p.sku : null,
            date: d.day,
            quantitySold: d.qty,
            averageDailySales: Number(mean.toFixed(2)),
            zScore: Number(zScore.toFixed(2)),
            type: zScore > 0 ? 'spike' : 'drop',
          });
        }
      });
    });

    anomalies.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));

    res.status(200).json({ count: anomalies.length, anomalies });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ---------------------------------------------------------------
// @desc    Rule-based assistant — answers common inventory questions
//          using canned patterns + real DB data (no external LLM API)
// @route   POST /api/admin/ai/ask
// @access  Admin/Manager
// ---------------------------------------------------------------
const getAssistantAnswer = async (req, res) => {
  try {
    const question = (req.body.question || '').toLowerCase().trim();

    if (!question) {
      return res.status(400).json({ message: 'Question is required' });
    }

    // Pattern: "low stock" / "out of stock"
    if (question.includes('low stock') || question.includes('out of stock')) {
      const lowStock = await Product.find({
        $expr: { $lte: ['$stock', '$reorderLevel'] },
      }).limit(10);

      return res.status(200).json({
        question: req.body.question,
        answer:
          lowStock.length > 0
            ? `${lowStock.length} product(s) are at or below reorder level: ${lowStock
                .map((p) => p.name)
                .join(', ')}.`
            : 'No products are currently low on stock.',
        data: lowStock,
      });
    }

    // Pattern: "best selling" / "top selling"
    if (question.includes('best selling') || question.includes('top selling')) {
      const since = new Date();
      since.setDate(since.getDate() - 30);

      const top = await Sale.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.product', qty: { $sum: '$items.quantity' } } },
        { $sort: { qty: -1 } },
        { $limit: 5 },
      ]);

      const productIds = top.map((t) => t._id);
      const products = await Product.find({ _id: { $in: productIds } });
      const nameMap = {};
      products.forEach((p) => (nameMap[p._id.toString()] = p.name));

      const list = top.map((t) => `${nameMap[t._id.toString()]} (${t.qty} sold)`);

      return res.status(200).json({
        question: req.body.question,
        answer:
          list.length > 0
            ? `Top selling products (last 30 days): ${list.join(', ')}.`
            : 'No sales recorded in the last 30 days.',
        data: top,
      });
    }

    // Pattern: "total products"
    if (question.includes('how many product') || question.includes('total product')) {
      const count = await Product.countDocuments();
      return res.status(200).json({
        question: req.body.question,
        answer: `There are ${count} products in inventory.`,
      });
    }

    // Fallback — no matching rule
    return res.status(200).json({
      question: req.body.question,
      answer:
        "I couldn't understand that question yet. Try asking about 'low stock', 'best selling products', or 'total products'.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getReorderSuggestions,
  getDemandForecast,
  getAnomalies,
  getAssistantAnswer,
};
