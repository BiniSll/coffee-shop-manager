import React, { useState, useEffect } from 'react';
import { ipc } from '../ipc';

interface MenuItem {
  id: number;
  name: string;
  category: string;
  price: number;
  available: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  coffee: 'Kafe',
  tea: 'Caj',
  'cold-drinks': 'Pije te Ftohta',
  pastry: 'Embelsira',
  food: 'Ushqim',
  other: 'Tjeter',
};

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [form, setForm] = useState({ name: '', category: 'coffee', price: '' });

  const load = async () => {
    const data = await ipc.listMenu();
    setItems(data);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await ipc.updateMenuItem({
        id: editing.id,
        name: form.name,
        category: form.category,
        price: parseFloat(form.price),
        available: editing.available,
      });
    } else {
      await ipc.createMenuItem({
        name: form.name,
        category: form.category,
        price: parseFloat(form.price),
      });
    }
    setShowForm(false);
    setEditing(null);
    setForm({ name: '', category: 'coffee', price: '' });
    load();
  };

  const startEdit = (item: MenuItem) => {
    setEditing(item);
    setForm({ name: item.name, category: item.category, price: String(item.price) });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Fshi kete artikull?')) {
      await ipc.deleteMenuItem(id);
      load();
    }
  };

  const toggleAvailable = async (item: MenuItem) => {
    await ipc.updateMenuItem({ ...item, available: item.available ? 0 : 1 });
    load();
  };

  const categories = [...new Set(items.map(i => i.category))];

  return (
    <div>
      <div className="page-header">
        <h2>Menuja</h2>
        <button className="btn btn-primary btn-lg" onClick={() => { setEditing(null); setForm({ name: '', category: 'coffee', price: '' }); setShowForm(true); }}>
          + Shto Artikull
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editing ? 'Ndrysho Artikullin' : 'Shto Artikull te Ri'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Emri</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required autoFocus />
              </div>
              <div className="form-group">
                <label>Kategoria</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  <option value="coffee">Kafe</option>
                  <option value="tea">Caj</option>
                  <option value="cold-drinks">Pije te Ftohta</option>
                  <option value="pastry">Embelsira</option>
                  <option value="food">Ushqim</option>
                  <option value="other">Tjeter</option>
                </select>
              </div>
              <div className="form-group">
                <label>Cmimi (€)</label>
                <input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary btn-lg" onClick={() => setShowForm(false)}>Anulo</button>
                <button type="submit" className="btn btn-primary btn-lg">{editing ? 'Ruaj' : 'Shto'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {categories.length === 0 ? (
        <div className="card">
          <p>Nuk ka artikuj ne menu. Kliko "+ Shto Artikull" per te shtuar kafen e pare!</p>
        </div>
      ) : (
        categories.map(cat => (
          <div key={cat} className="card">
            <h3 style={{ marginBottom: 12 }}>{CATEGORY_LABELS[cat] || cat}</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Emri</th>
                  <th>Cmimi</th>
                  <th>Statusi</th>
                  <th>Veprimet</th>
                </tr>
              </thead>
              <tbody>
                {items.filter(i => i.category === cat).map(item => (
                  <tr key={item.id}>
                    <td style={{ fontSize: 15 }}>{item.name}</td>
                    <td>{item.price.toFixed(2)} €</td>
                    <td>
                      <span className={`badge ${item.available ? 'badge-completed' : 'badge-cancelled'}`}>
                        {item.available ? 'Aktiv' : 'Joaktiv'}
                      </span>
                    </td>
                    <td>
                      <div className="flex-gap">
                        <button className="btn btn-secondary" onClick={() => toggleAvailable(item)}>
                          {item.available ? 'Caktivizo' : 'Aktivizo'}
                        </button>
                        <button className="btn btn-primary" onClick={() => startEdit(item)}>Ndrysho</button>
                        <button className="btn btn-danger" onClick={() => handleDelete(item.id)}>Fshi</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}
