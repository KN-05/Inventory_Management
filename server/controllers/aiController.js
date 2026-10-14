// controllers/aiController.js
// PHASE 28/29: matches the exact response shape expected by
// client/src/pages/admin/AIInsights.jsx. Pure statistics on real
// Sale/Product data - no external AI/LLM API.

const Product = require('../models/Product');
const Sale = require('../models/Sale');

const WINDOW_DAYS = 30; // lookback window for reorder calculations
const LEAD_TIME_DAYS = 7; // assumed supplier lead time
const SAFETY_STOCK_DAYS = 3; // extra buffer on top of lead time
const MIN_SALES_FOR_FORECAST = 5; // minimum completed sales to attempt a forecast

// ---------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------

// Total quantity sold per product (completed sales only) since a given date.
async function getProductSalesTotals(since, until = new Date()) {
  const rows = await Sale.aggregate([
    { $match: { createdAt: { $gte: since, $lt: until }, status: 'completed' } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        qty: { $sum: '$items.quantity' },
      },
    },
  ]);
  const map = {};
  rows.forEach((r) => (map[r._id.toString()] = r.qty));
  return map;
}

// Daily revenue for each day in [since, now], filling gaps with 0.
async function getDailyRevenueSeries(since) {
  const rows = await Sale.aggregate([
    { $match: { createdAt: { $gte: since }, status: 'completed' } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$totalAmount' },
        count: { $sum: 1 },
      },
    },
  ]);
  const revenueByDay = {};
  let totalSalesCount = 0;
  rows.forEach((r) => {
    revenueByDay[r._id] = r.revenue;
    totalSalesCount += r.count;
  });

  const series = [];
  const cursor = new Date(since);
  const today = new Date();
  while (cursor <= today) {
    const key = cursor.toISOString().slice(0, 10);
    series.push({ date: key, revenue: revenueByDay[key] || 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return { series, totalSalesCount };
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ---------------------------------------------------------------
// Reorder suggestions builder
// ---------------------------------------------------------------
async function buildReorderSuggestions() {
  const since = daysAgo(WINDOW_DAYS);
  const products = await Product.find({});
  const soldMap = await getProductSalesTotals(since);

  const suggestions = products
    .map((p) => {
      const totalSold = soldMap[p._id.toString()] || 0;
      const avgDailySales = totalSold / WINDOW_DAYS;
      const daysOfStockLeft = avgDailySales > 0 ? p.quantity / avgDailySales : null;
      const reorderPoint = Math.ceil(avgDailySales * (LEAD_TIME_DAYS + SAFETY_STOCK_DAYS));

      let riskLevel = null;
      if (p.quantity <= 0) {
        riskLevel = 'CRITICAL';
      } else if (daysOfStockLeft !== null && daysOfStockLeft <= LEAD_TIME_DAYS) {
        riskLevel = 'HIGH';
      } else if (
        daysOfStockLeft !== null &&
        daysOfStockLeft <= LEAD_TIME_DAYS + SAFETY_STOCK_DAYS
      ) {
        riskLevel = 'MEDIUM';
      } else if (daysOfStockLeft === null && p.quantity <= p.lowStockThreshold) {
        riskLevel = 'MEDIUM';
      } else if (p.quantity <= reorderPoint) {
        riskLevel = 'LOW';
      }

      if (!riskLevel) return null;

      const targetLevel =
        avgDailySales > 0
          ? Math.ceil(avgDailySales * (LEAD_TIME_DAYS + SAFETY_STOCK_DAYS) * 2)
          : p.lowStockThreshold * 2;
      const recommendedQuantity = Math.max(0, targetLevel - p.quantity);

      return {
        productId: p._id,
        name: p.name,
        sku: p.sku,
        currentQuantity: p.quantity,
        avgDailySales: Number(avgDailySales.toFixed(2)),
        daysOfStockLeft: daysOfStockLeft === null ? null : Number(daysOfStockLeft.toFixed(1)),
        reorderPoint,
        recommendedQuantity,
        riskLevel,
      };
    })
    .filter(Boolean);

  const severity = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  suggestions.sort((a, b) => severity[a.riskLevel] - severity[b.riskLevel]);

  return {
    windowDays: WINDOW_DAYS,
    leadTimeDays: LEAD_TIME_DAYS,
    safetyStockDays: SAFETY_STOCK_DAYS,
    suggestions,
  };
}

// ---------------------------------------------------------------
// Demand forecast builder (revenue-based, linear regression)
// ---------------------------------------------------------------
async function buildForecast() {
  const HISTORY_DAYS = 60;
  const FORECAST_DAYS = 14;
  const since = daysAgo(HISTORY_DAYS);

  const { series, totalSalesCount } = await getDailyRevenueSeries(since);

  if (totalSalesCount < MIN_SALES_FOR_FORECAST) {
    return { note: 'Not enough sales data yet to generate a reliable forecast.' };
  }

  const history = series.map((point, i) => {
    const windowStart = Math.max(0, i - 6);
    const windowSlice = series.slice(windowStart, i + 1);
    const movingAvg =
      windowSlice.reduce((sum, s) => sum + s.revenue, 0) / windowSlice.length;
    return { date: point.date, revenue: point.revenue, movingAvg: Number(movingAvg.toFixed(2)) };
  });

  const n = series.length;
  const sumX = series.reduce((sum, _, i) => sum + i, 0);
  const sumY = series.reduce((sum, s) => sum + s.revenue, 0);
  const sumXY = series.reduce((sum, s, i) => sum + i * s.revenue, 0);
  const sumX2 = series.reduce((sum, _, i) => sum + i * i, 0);
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;

  const forecast = [];
  const lastDate = new Date(series[series.length - 1].date);
  for (let i = 0; i < FORECAST_DAYS; i++) {
    const x = n + i;
    const forecastRevenue = Math.max(0, slope * x + intercept);
    const date = new Date(lastDate);
    date.setDate(date.getDate() + i + 1);
    forecast.push({
      date: date.toISOString().slice(0, 10),
      forecastRevenue: Number(forecastRevenue.toFixed(2)),
    });
  }

  const recentAvg =
    series.slice(-7).reduce((sum, s) => sum + s.revenue, 0) / Math.min(7, series.length);
  const forecastAvg =
    forecast.reduce((sum, f) => sum + f.forecastRevenue, 0) / forecast.length;

  const trendPercent = recentAvg > 0 ? ((forecastAvg - recentAvg) / recentAvg) * 100 : 0;
  const trend = trendPercent > 2 ? 'up' : trendPercent < -2 ? 'down' : 'flat';

  return {
    history,
    forecast,
    trend,
    trendPercent: Number(trendPercent.toFixed(1)),
  };
}

// ---------------------------------------------------------------
// Anomaly detection builder
// ---------------------------------------------------------------
async function buildAnomalies() {
  const since = daysAgo(WINDOW_DAYS);
  const { series, totalSalesCount } = await getDailyRevenueSeries(since);

  if (totalSalesCount === 0) {
    return { note: 'No sales recorded in the last 30 days to analyze.' };
  }

  const revenues = series.map((s) => s.revenue);
  const mean = revenues.reduce((a, b) => a + b, 0) / revenues.length;
  const variance =
    revenues.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / revenues.length;
  const stdDev = Math.sqrt(variance);

  const dayAnomalies = [];
  if (stdDev > 0) {
    series.forEach((s) => {
      const z = (s.revenue - mean) / stdDev;
      if (Math.abs(z) > 2) {
        dayAnomalies.push({
          date: s.date,
          revenue: s.revenue,
          averageRevenue: Number(mean.toFixed(2)),
          type: z > 0 ? 'spike' : 'drop',
        });
      }
    });
  }

  const products = await Product.find({});
  const recentSince = daysAgo(7);
  const baselineSince = daysAgo(WINDOW_DAYS);

  const recentTotals = await getProductSalesTotals(recentSince);
  const baselineTotals = await getProductSalesTotals(baselineSince, recentSince);

  const productSpikes = [];
  products.forEach((p) => {
    const id = p._id.toString();
    const recentAvgPerDay = (recentTotals[id] || 0) / 7;
    const baselineAvgPerDay = (baselineTotals[id] || 0) / (WINDOW_DAYS - 7);

    if (baselineAvgPerDay > 0 && recentAvgPerDay >= baselineAvgPerDay * 2.5) {
      productSpikes.push({
        productId: p._id,
        name: p.name,
        sku: p.sku,
        recentAvgPerDay: Number(recentAvgPerDay.toFixed(2)),
        baselineAvgPerDay: Number(baselineAvgPerDay.toFixed(2)),
        increaseFactor: Number((recentAvgPerDay / baselineAvgPerDay).toFixed(1)),
      });
    }
  });

  productSpikes.sort((a, b) => b.increaseFactor - a.increaseFactor);

  return { dayAnomalies, productSpikes };
}

// ---------------------------------------------------------------
// Top-selling products helper
// ---------------------------------------------------------------
async function buildTopProducts(limit = 5, days = 30) {
  const since = daysAgo(days);
  const top = await Sale.aggregate([
    { $match: { createdAt: { $gte: since }, status: 'completed' } },
    { $unwind: '$items' },
    { $group: { _id: '$items.product', qty: { $sum: '$items.quantity' } } },
    { $sort: { qty: -1 } },
    { $limit: limit },
  ]);
  const productIds = top.map((t) => t._id);
  const products = await Product.find({ _id: { $in: productIds } });
  const nameMap = {};
  products.forEach((p) => (nameMap[p._id.toString()] = p.name));
  return top.map((t) => ({
    name: nameMap[t._id.toString()] || 'Unknown',
    quantitySold: t.qty,
  }));
}

// ---------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------
const getReorderSuggestions = async (req, res) => {
  try {
    res.status(200).json(await buildReorderSuggestions());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getDemandForecast = async (req, res) => {
  try {
    res.status(200).json(await buildForecast());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAnomalies = async (req, res) => {
  try {
    res.status(200).json(await buildAnomalies());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAssistantAnswer = async (req, res) => {
  try {
    const question = (req.body.question || '').toLowerCase().trim();
    if (!question) {
      return res.status(400).json({ message: 'Question is required' });
    }

    if (question.includes('critical')) {
      const { suggestions } = await buildReorderSuggestions();
      const critical = suggestions.filter((s) => s.riskLevel === 'CRITICAL');
      return res.status(200).json({
        reply:
          critical.length > 0
            ? `${critical.length} product(s) are at critical stock risk (out of stock or about to run out).`
            : 'No products are currently at critical stock risk.',
        products: critical,
      });
    }

    if (question.includes('reorder')) {
      const { suggestions } = await buildReorderSuggestions();
      return res.status(200).json({
        reply:
          suggestions.length > 0
            ? `${suggestions.length} product(s) need reordering soon.`
            : 'Nothing needs reordering right now — stock levels look healthy.',
        products: suggestions,
      });
    }

    if (question.includes('unusual') || question.includes('anomal')) {
      const anomalyData = await buildAnomalies();
      if (anomalyData.note) {
        return res.status(200).json({ reply: anomalyData.note });
      }
      const { dayAnomalies, productSpikes } = anomalyData;
      const parts = [];
      if (dayAnomalies.length > 0) {
        parts.push(`${dayAnomalies.length} unusual sales day(s) in the last 30 days`);
      }
      if (productSpikes.length > 0) {
        parts.push(
          `${productSpikes.length} product(s) with sudden demand spikes: ${productSpikes
            .slice(0, 5)
            .map((p) => p.name)
            .join(', ')}`
        );
      }
      return res.status(200).json({
        reply: parts.length > 0 ? parts.join('. ') + '.' : 'No unusual activity detected recently.',
      });
    }

    if (
      question.includes('highest demand') ||
      question.includes('best selling') ||
      question.includes('top selling') ||
      question.includes('most demand')
    ) {
      const topProducts = await buildTopProducts(5, 30);
      return res.status(200).json({
        reply:
          topProducts.length > 0
            ? `Top products by demand in the last 30 days:`
            : 'No completed sales in the last 30 days.',
        topProducts,
      });
    }

    if (question.includes('insight') || question.includes('today')) {
      const [reorderData, anomalyData] = await Promise.all([
        buildReorderSuggestions(),
        buildAnomalies(),
      ]);
      const criticalCount = reorderData.suggestions.filter(
        (s) => s.riskLevel === 'CRITICAL'
      ).length;
      const totalFlagged = reorderData.suggestions.length;
      const anomalyCount = anomalyData.note
        ? 0
        : anomalyData.dayAnomalies.length + anomalyData.productSpikes.length;

      return res.status(200).json({
        reply: `${totalFlagged} product(s) need attention (${criticalCount} critical). ${anomalyCount} unusual pattern(s) detected recently.`,
      });
    }

    if (question.includes('low stock') || question.includes('out of stock')) {
      const matchStatus = question.includes('out of stock')
        ? 'Out of Stock'
        : { $in: ['Low Stock', 'Out of Stock'] };
      const lowStock = await Product.find({ status: matchStatus }).limit(10);
      return res.status(200).json({
        reply:
          lowStock.length > 0
            ? `${lowStock.length} product(s) found: ${lowStock.map((p) => p.name).join(', ')}.`
            : 'No products currently match that status.',
      });
    }

    if (question.includes('revenue') || question.includes('total sales')) {
      const since = daysAgo(30);
      const result = await Sale.aggregate([
        { $match: { createdAt: { $gte: since }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]);
      const total = result[0]?.total || 0;
      return res.status(200).json({
        reply: `Total revenue in the last 30 days: ₹${total.toFixed(2)}.`,
      });
    }

    return res.status(200).json({
      reply:
        "I couldn't understand that question yet. Try one of the suggested questions above.",
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
