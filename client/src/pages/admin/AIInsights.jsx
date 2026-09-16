// src/pages/admin/AIInsights.jsx
// PHASE 28/29: four data-driven "AI" features, computed purely from this
// project's own real Sale/Product data via statistics (moving averages,
// linear regression, standard-deviation outlier detection, and a
// standard reorder-point formula) - NOT a paid AI/LLM API and NOT a
// separate Python service, per the explicit "no extra service, no paid
// API key" requirement. Every number here traces back to real documents
// in MongoDB; nothing is invented. See server/controllers/aiController.js
// for the actual math, including the Assistant's fixed, controlled set
// of intents (it can never run an arbitrary query).

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  getReorderSuggestions,
  getDemandForecast,
  getAnomalies,
  askAiAssistant,
} from '../../api/admin';
import { formatCurrency } from '../../utils/formatCurrency';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';

const riskBadge = {
  CRITICAL: 'badge badge-red',
  HIGH: 'badge badge-red',
  MEDIUM: 'badge badge-yellow',
  LOW: 'badge badge-green',
};

const TABS = [
  { id: 'reorder', label: '📦 Reorder & Stock Risk' },
  { id: 'forecast', label: '📈 Demand Forecast' },
  { id: 'anomalies', label: '🚨 Anomaly Detection' },
  { id: 'assistant', label: '🧠 Assistant' },
];

const SUGGESTED_QUESTIONS = [
  'Which products need reordering?',
  'Which products have critical stock risk?',
  'Show unusual sales activity.',
  'What are today\'s inventory insights?',
  'Which products have the highest demand?',
];

function AIInsights() {
  const [tab, setTab] = useState('reorder');

  const [reorder, setReorder] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [anomalies, setAnomalies] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getReorderSuggestions(), getDemandForecast(), getAnomalies()])
      .then(([r, f, a]) => {
        setReorder(r);
        setForecast(f);
        setAnomalies(a);
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to load AI insights'));
  }, []);

  const loading = !reorder || !forecast || !anomalies;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>AI Insights</h1>
          <p className="page-subtitle">
            Data-driven suggestions computed from your real sales history - no external AI service,
            just statistics on your own data. Recommendations, not guarantees.
          </p>
        </div>
      </div>

      <div className="pos-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`pos-tab${tab === t.id ? ' pos-tab-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="banner banner-error">{error}</p>}

      {tab === 'assistant' ? (
        <AssistantTab />
      ) : loading ? (
        <Loader label="Crunching your sales data..." />
      ) : (
        <>
          {tab === 'reorder' && <ReorderTab data={reorder} />}
          {tab === 'forecast' && <ForecastTab data={forecast} />}
          {tab === 'anomalies' && <AnomaliesTab data={anomalies} />}
        </>
      )}
    </div>
  );
}

function ReorderTab({ data }) {
  return (
    <div className="chart-card">
      <h3>Reorder Suggestions &amp; Stock-Out Risk</h3>
      <p className="page-subtitle" style={{ marginBottom: '1rem' }}>
        Based on average daily units sold over the last {data.windowDays} days. Assumes a{' '}
        {data.leadTimeDays}-day supplier lead time and a {data.safetyStockDays}-day safety buffer
        (no per-supplier lead time is tracked yet, so this default applies to every product).
      </p>
      {data.suggestions.length === 0 ? (
        <p className="empty-state">Nothing needs reordering right now - stock levels look healthy.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th className="col-numeric">Current Stock</th>
              <th className="col-numeric">Avg Daily Sales</th>
              <th className="col-numeric">Days Left</th>
              <th className="col-numeric">Reorder Point</th>
              <th className="col-numeric">Recommended Qty</th>
              <th>Risk</th>
            </tr>
          </thead>
          <tbody>
            {data.suggestions.map((s, index) => (
              <motion.tr
                key={s.productId}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index, 10) * 0.03 }}
              >
                <td>{s.name}</td>
                <td className="cell-mono">{s.sku}</td>
                <td className="cell-numeric">{s.currentQuantity}</td>
                <td className="cell-numeric">{s.avgDailySales}</td>
                <td className="cell-numeric">{s.daysOfStockLeft ?? '—'}</td>
                <td className="cell-numeric">{s.reorderPoint}</td>
                <td className="cell-numeric">{s.recommendedQuantity}</td>
                <td>
                  <span className={riskBadge[s.riskLevel]}>{s.riskLevel}</span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ForecastTab({ data }) {
  if (data.note) {
    return (
      <div className="chart-card">
        <h3>Sales Demand Forecast</h3>
        <p className="empty-state">{data.note}</p>
      </div>
    );
  }

  const chartData = [
    ...data.history.map((h) => ({ date: h.date.slice(5), actual: h.revenue, movingAvg: h.movingAvg })),
    ...data.forecast.map((f) => ({ date: f.date.slice(5), forecast: f.forecastRevenue })),
  ];

  const trendIcon = data.trend === 'up' ? '📈' : data.trend === 'down' ? '📉' : '➡️';

  return (
    <div className="chart-card">
      <h3>Sales Demand Forecast</h3>
      <div className="stats-grid" style={{ marginBottom: '1rem' }}>
        <div className="stat-card">
          <span className="stat-card-icon">{trendIcon}</span>
          <p className="stat-card-label">14-Day Trend</p>
          <p className="stat-card-value">
            {data.trend === 'up' ? '+' : ''}
            {data.trendPercent}%
          </p>
        </div>
      </div>
      <p className="page-subtitle" style={{ marginBottom: '0.75rem' }}>
        Solid line = actual daily revenue (last 60 days) and its 7-day moving average. Dashed line =
        projected revenue for the next 14 days, based on a linear trend fit to recent history - not a
        guarantee.
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={6} />
          <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value) => formatCurrency(value)} />
          <Legend />
          <Line type="monotone" dataKey="actual" name="Actual Revenue" stroke="#94a3b8" strokeWidth={1.5} dot={false} />
          <Line type="monotone" dataKey="movingAvg" name="7-Day Avg" stroke="#4f46e5" strokeWidth={2} dot={false} />
          <Line
            type="monotone"
            dataKey="forecast"
            name="Forecast"
            stroke="#a855f7"
            strokeWidth={2.5}
            strokeDasharray="6 4"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function AnomaliesTab({ data }) {
  if (data.note) {
    return (
      <div className="chart-card">
        <h3>Anomaly Detection</h3>
        <p className="empty-state">{data.note}</p>
      </div>
    );
  }

  return (
    <>
      <div className="chart-card" style={{ marginBottom: '1rem' }}>
        <h3>Unusual Sales Days</h3>
        <p className="page-subtitle" style={{ marginBottom: '1rem' }}>
          Days where total revenue was statistically unusual compared to the last 30 days (more than
          2 standard deviations from average). "Unusual" only - not a fraud claim.
        </p>
        {data.dayAnomalies.length === 0 ? (
          <p className="empty-state">No unusual sales days detected in the last 30 days.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th className="col-numeric">Revenue</th>
                <th className="col-numeric">Typical Average</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {data.dayAnomalies.map((a) => (
                <tr key={a.date}>
                  <td>{new Date(a.date).toLocaleDateString()}</td>
                  <td className="cell-numeric">{formatCurrency(a.revenue)}</td>
                  <td className="cell-numeric">{formatCurrency(a.averageRevenue)}</td>
                  <td>
                    <span className={a.type === 'spike' ? 'badge badge-green' : 'badge badge-red'}>
                      {a.type === 'spike' ? '▲ Spike' : '▼ Drop'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="chart-card">
        <h3>Sudden Demand Spikes by Product</h3>
        <p className="page-subtitle" style={{ marginBottom: '1rem' }}>
          Products selling at least 2.5x faster in the last 7 days than their prior average.
        </p>
        {data.productSpikes.length === 0 ? (
          <p className="empty-state">No unusual product demand spikes right now.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th className="col-numeric">Recent Avg/Day</th>
                <th className="col-numeric">Usual Avg/Day</th>
                <th className="col-numeric">Increase</th>
              </tr>
            </thead>
            <tbody>
              {data.productSpikes.map((p) => (
                <tr key={p.productId}>
                  <td>{p.name}</td>
                  <td className="cell-mono">{p.sku}</td>
                  <td className="cell-numeric">{p.recentAvgPerDay}</td>
                  <td className="cell-numeric">{p.baselineAvgPerDay}</td>
                  <td className="cell-numeric">
                    <span className="badge badge-yellow">{p.increaseFactor}x</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

// PHASE 29: the Assistant only ever sends the free-text question to the
// backend, which matches it against a FIXED list of known intents
// (keyword matching, no LLM) and returns real data from the same
// functions the other tabs use - see aiController.js's detectIntent().
// This component just renders whatever structured reply comes back.
function AssistantTab() {
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState([]); // [{question, reply, products?, forecast?, anomalies?, topProducts?}]
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState('');

  const ask = async (q) => {
    const finalQuestion = (q ?? question).trim();
    if (!finalQuestion) return;
    setError('');
    setAsking(true);
    setQuestion('');
    try {
      const data = await askAiAssistant(finalQuestion);
      setHistory((h) => [...h, { question: finalQuestion, ...data }]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to get an answer');
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="chart-card">
      <h3>AI Inventory Assistant</h3>
      <p className="page-subtitle" style={{ marginBottom: '1rem' }}>
        Ask about stock, reorders, demand, or unusual activity. Answers come from your real data via
        a fixed set of supported questions - not a general chatbot.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        {SUGGESTED_QUESTIONS.map((q) => (
          <button key={q} type="button" className="ai-suggested-chip" onClick={() => ask(q)}>
            {q}
          </button>
        ))}
      </div>

      {error && <p className="banner banner-error">{error}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
        {history.map((h, i) => (
          <div key={i}>
            <p style={{ fontWeight: 600, marginBottom: '0.35rem' }}>🙋 {h.question}</p>
            <p className="page-subtitle" style={{ marginBottom: h.products || h.topProducts ? '0.5rem' : 0 }}>
              🧠 {h.reply}
            </p>

            {h.products && h.products.length > 0 && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="col-numeric">Current Stock</th>
                    <th className="col-numeric">Recommended Qty</th>
                    <th>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {h.products.map((p) => (
                    <tr key={p.productId}>
                      <td>{p.name}</td>
                      <td className="cell-numeric">{p.currentQuantity}</td>
                      <td className="cell-numeric">{p.recommendedQuantity}</td>
                      <td>
                        <span className={riskBadge[p.riskLevel]}>{p.riskLevel}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {h.topProducts && h.topProducts.length > 0 && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="col-numeric">Quantity Sold</th>
                  </tr>
                </thead>
                <tbody>
                  {h.topProducts.map((p, idx) => (
                    <tr key={idx}>
                      <td>{p.name}</td>
                      <td className="cell-numeric">{p.quantitySold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask();
        }}
        style={{ display: 'flex', gap: '0.5rem' }}
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about your inventory..."
          style={{ flex: 1 }}
        />
        <Button variant="primary" type="submit" disabled={asking}>
          {asking ? 'Thinking...' : 'Ask'}
        </Button>
      </form>
    </div>
  );
}

export default AIInsights;
