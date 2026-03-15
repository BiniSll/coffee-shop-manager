import React, { useState, useEffect, useRef } from 'react';
import { ipc } from '../ipc';

interface DailyData {
  date: string;
  total_orders: number;
  total_revenue: number;
  total_items: number;
  dine_in_orders: number;
  take_away_orders: number;
}

interface TopItem {
  name: string;
  category: string;
  total_qty: number;
  total_revenue: number;
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<'week' | 'month' | 'custom'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<DailyData[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const now = new Date();
    let start: Date;
    if (period === 'week') {
      start = new Date(now);
      start.setDate(start.getDate() - 7);
    } else if (period === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      return;
    }
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
  }, [period]);

  useEffect(() => {
    if (!startDate || !endDate) return;
    Promise.all([
      ipc.reportsDailyRange(startDate, endDate),
      ipc.reportsTopItems(startDate, endDate),
    ]).then(([daily, top]: [DailyData[], TopItem[]]) => {
      setData(daily);
      setTopItems(top);
    });
  }, [startDate, endDate]);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const padding = { top: 30, right: 20, bottom: 60, left: 70 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const maxRevenue = Math.max(...data.map(d => d.total_revenue), 1);

    // Background
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#efebe9';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + chartH - (chartH * i / 5);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      // Y-axis labels
      ctx.fillStyle = '#8d6e63';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText((maxRevenue * i / 5).toFixed(0), padding.left - 8, y + 4);
    }

    // Bars
    const barWidth = Math.max(8, Math.min(40, chartW / data.length - 4));
    data.forEach((d, i) => {
      const x = padding.left + (i * chartW / data.length) + (chartW / data.length - barWidth) / 2;
      const barH = (d.total_revenue / maxRevenue) * chartH;
      const y = padding.top + chartH - barH;

      // Bar gradient
      ctx.fillStyle = '#5d4037';
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, [4, 4, 0, 0]);
      ctx.fill();

      // Revenue on top of bar
      if (barH > 20) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(d.total_revenue.toFixed(0), x + barWidth / 2, y + 14);
      }

      // Date label
      ctx.fillStyle = '#8d6e63';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.save();
      ctx.translate(x + barWidth / 2, padding.top + chartH + 12);
      ctx.rotate(-0.5);
      ctx.fillText(d.date.slice(5), 0, 0);
      ctx.restore();
    });

    // Y-axis title
    ctx.fillStyle = '#5d4037';
    ctx.font = 'bold 12px sans-serif';
    ctx.save();
    ctx.translate(14, padding.top + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Te ardhurat (€)', 0, 0);
    ctx.restore();

  }, [data]);

  const totalRevenue = data.reduce((s, d) => s + d.total_revenue, 0);
  const totalOrders = data.reduce((s, d) => s + d.total_orders, 0);
  const totalItems = data.reduce((s, d) => s + d.total_items, 0);
  const avgDaily = data.length ? totalRevenue / data.length : 0;

  return (
    <div>
      <div className="page-header">
        <h2>Raportet</h2>
      </div>

      {/* Period selection */}
      <div className="flex-gap mb-12">
        <button className={`btn ${period === 'week' ? 'btn-primary' : 'btn-secondary'} btn-lg`} onClick={() => setPeriod('week')}>
          7 Dite
        </button>
        <button className={`btn ${period === 'month' ? 'btn-primary' : 'btn-secondary'} btn-lg`} onClick={() => setPeriod('month')}>
          Kete Muaj
        </button>
        <button className={`btn ${period === 'custom' ? 'btn-primary' : 'btn-secondary'} btn-lg`} onClick={() => setPeriod('custom')}>
          Zgjedh Datat
        </button>
        {period === 'custom' && (
          <>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="date-input" />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="date-input" />
          </>
        )}
      </div>

      {/* Summary cards */}
      <div className="summary-grid">
        <div className="summary-card summary-revenue">
          <div className="summary-label">Te ardhurat totale</div>
          <div className="summary-value">{totalRevenue.toFixed(2)} €</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Porosi gjithsej</div>
          <div className="summary-value">{totalOrders}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Artikuj te shitur</div>
          <div className="summary-value">{totalItems}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Mesatarja ditore</div>
          <div className="summary-value">{avgDaily.toFixed(2)} €</div>
        </div>
      </div>

      {/* Chart */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Te ardhurat ditore</h3>
        {data.length === 0 ? (
          <p style={{ color: '#8d6e63', textAlign: 'center', padding: 40 }}>Nuk ka te dhena per kete periudhe. Mbyll diten per te ruajtur te dhenat.</p>
        ) : (
          <canvas ref={canvasRef} style={{ width: '100%', height: 300 }} />
        )}
      </div>

      {/* Top items */}
      {topItems.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Artikujt me te shitur</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Artikulli</th>
                <th>Kategoria</th>
                <th>Sasia</th>
                <th>Te ardhurat</th>
              </tr>
            </thead>
            <tbody>
              {topItems.map((item, i) => (
                <tr key={item.name}>
                  <td style={{ fontWeight: 'bold' }}>{i + 1}</td>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
                  <td>{item.total_qty}</td>
                  <td style={{ fontWeight: 'bold' }}>{item.total_revenue.toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
