import React, { useState, useEffect } from 'react';
import { ipc } from '../ipc';
import { User } from '../App';

interface Summary {
  total_orders: number;
  completed_orders: number;
  open_orders: number;
  dine_in_orders: number;
  take_away_orders: number;
  total_revenue: number;
  total_items: number;
}

interface Closing {
  id: number;
  date: string;
  total_orders: number;
  total_revenue: number;
  total_items: number;
  dine_in_orders: number;
  take_away_orders: number;
  closed_by_name: string;
  closed_at: string;
  notes: string;
}

export default function DayClosePage({ user }: { user: User }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isClosed, setIsClosed] = useState(false);
  const [notes, setNotes] = useState('');
  const [closings, setClosings] = useState<Closing[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [prevUnclosed, setPrevUnclosed] = useState<{ date: string; order_count: number } | null>(null);
  const [prevSummary, setPrevSummary] = useState<Summary | null>(null);
  const [showPrevConfirm, setShowPrevConfirm] = useState(false);
  const [prevNotes, setPrevNotes] = useState('');

  const load = async () => {
    const [s, closed, list, prev] = await Promise.all([
      ipc.todaySummary(),
      ipc.isClosedToday(),
      ipc.listClosings(),
      ipc.unclosedPreviousDay(),
    ]);
    setSummary(s);
    setIsClosed(closed);
    setClosings(list);
    setPrevUnclosed(prev);
    if (prev) {
      const ps = await ipc.daySummary(prev.date);
      setPrevSummary(ps);
    } else {
      setPrevSummary(null);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCloseDay = async () => {
    const result = await ipc.closeDay(user.id, notes);
    if (result.success) {
      setShowConfirm(false);
      load();
    } else {
      alert(result.error);
    }
  };

  const handleClosePrevDay = async () => {
    if (!prevUnclosed) return;
    const result = await ipc.closeDay(user.id, prevNotes, prevUnclosed.date);
    if (result.success) {
      setShowPrevConfirm(false);
      setPrevNotes('');
      load();
    } else {
      alert(result.error);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Mbyll Diten</h2>
      </div>

      {/* Unclosed previous day warning */}
      {prevUnclosed && (
        <div className="card" style={{ marginBottom: 16, border: '2px solid #e65100', background: '#fff3e0' }}>
          <div style={{ padding: 16 }}>
            <h3 style={{ color: '#e65100', marginBottom: 8 }}>Dita e {prevUnclosed.date} nuk eshte mbyllur!</h3>
            <p style={{ marginBottom: 12, color: '#555' }}>
              Ka {prevUnclosed.order_count} porosi nga dita {prevUnclosed.date} qe nuk jane perfshire ne mbyllje.
              {prevSummary && ` Te ardhurat: ${prevSummary.total_revenue.toFixed(2)} €, Porosi: ${prevSummary.total_orders}.`}
            </p>
            <button className="btn btn-primary" onClick={() => setShowPrevConfirm(true)}>
              Mbyll Diten {prevUnclosed.date}
            </button>
          </div>
        </div>
      )}

      {/* Confirm modal for previous day */}
      {showPrevConfirm && prevUnclosed && (
        <div className="modal-overlay" onClick={() => setShowPrevConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Mbyll Diten {prevUnclosed.date}</h3>
            <p style={{ marginBottom: 16 }}>
              Kjo do te perfundoj te gjitha porosite e hapura dhe do te ruaj permbledhjen per daten {prevUnclosed.date}.
            </p>
            {prevSummary && (
              <div className="close-summary">
                <div><strong>Te ardhurat:</strong> {prevSummary.total_revenue.toFixed(2)} €</div>
                <div><strong>Porosi:</strong> {prevSummary.total_orders}</div>
                <div><strong>Artikuj:</strong> {prevSummary.total_items}</div>
              </div>
            )}
            <div className="form-group" style={{ marginTop: 16 }}>
              <label>Shenime (opsionale)</label>
              <input value={prevNotes} onChange={e => setPrevNotes(e.target.value)} placeholder="Shenime per diten..." />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary btn-lg" onClick={() => setShowPrevConfirm(false)}>Anulo</button>
              <button className="btn btn-success btn-lg" onClick={handleClosePrevDay}>Konfirmo</button>
            </div>
          </div>
        </div>
      )}

      {/* Today summary */}
      {summary && (
        <div className="summary-grid">
          <div className="summary-card summary-revenue">
            <div className="summary-label">Te ardhurat sot</div>
            <div className="summary-value">{summary.total_revenue.toFixed(2)} €</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Porosi gjithsej</div>
            <div className="summary-value">{summary.total_orders}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Te perfunduara</div>
            <div className="summary-value">{summary.completed_orders}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Te hapura</div>
            <div className="summary-value">{summary.open_orders}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Ne lokal</div>
            <div className="summary-value">{summary.dine_in_orders}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Me vete</div>
            <div className="summary-value">{summary.take_away_orders}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Artikuj te shitur</div>
            <div className="summary-value">{summary.total_items}</div>
          </div>
        </div>
      )}

      {/* Close day action */}
      <div className="card" style={{ marginTop: 20 }}>
        {isClosed ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <h3 style={{ color: '#2e7d32' }}>Dita e sotme eshte mbyllur</h3>
            <p style={{ color: '#8d6e63', marginTop: 8 }}>Te dhenat jane ruajtur. Shikoni raportet per me shume detaje.</p>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <p style={{ fontSize: 16, marginBottom: 16 }}>Mbyll diten dhe ruaj te dhenat per sot.</p>
            <p style={{ color: '#8d6e63', marginBottom: 16, fontSize: 14 }}>
              Te gjitha porosite e hapura do te perfundohen automatikisht.
            </p>
            <button className="btn btn-primary btn-xl" onClick={() => setShowConfirm(true)}>
              Mbyll Diten
            </button>
          </div>
        )}
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Konfirmo Mbylljen e Dites</h3>
            <p style={{ marginBottom: 16 }}>
              Kjo do te perfundoj te gjitha porosite e hapura dhe do te ruaj permbledhjen e dites.
            </p>
            {summary && (
              <div className="close-summary">
                <div><strong>Te ardhurat:</strong> {summary.total_revenue.toFixed(2)} €</div>
                <div><strong>Porosi:</strong> {summary.total_orders}</div>
                <div><strong>Artikuj:</strong> {summary.total_items}</div>
              </div>
            )}
            <div className="form-group" style={{ marginTop: 16 }}>
              <label>Shenime (opsionale)</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Shenime per diten..." />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary btn-lg" onClick={() => setShowConfirm(false)}>Anulo</button>
              <button className="btn btn-success btn-lg" onClick={handleCloseDay}>Konfirmo</button>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {closings.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 12 }}>Historia e Mbylljeve</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Te ardhurat</th>
                <th>Porosi</th>
                <th>Artikuj</th>
                <th>Ne Lokal</th>
                <th>Me Vete</th>
                <th>Mbyllur nga</th>
                <th>Shenime</th>
              </tr>
            </thead>
            <tbody>
              {closings.map(c => (
                <tr key={c.id}>
                  <td>{c.date}</td>
                  <td style={{ fontWeight: 'bold' }}>{c.total_revenue.toFixed(2)} €</td>
                  <td>{c.total_orders}</td>
                  <td>{c.total_items}</td>
                  <td>{c.dine_in_orders}</td>
                  <td>{c.take_away_orders}</td>
                  <td>{c.closed_by_name}</td>
                  <td>{c.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
