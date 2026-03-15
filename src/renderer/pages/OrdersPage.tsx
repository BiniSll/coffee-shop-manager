import React, { useState, useEffect } from 'react';
import { ipc } from '../ipc';
import { User } from '../App';

interface Order {
  id: number;
  table_id: number | null;
  order_type: string;
  status: string;
  created_by: number;
  created_by_name: string;
  created_at: string;
  table_label: string;
  room_name: string;
}

interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id: number;
  quantity: number;
  price: number;
  item_name: string;
  category: string;
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Hapur',
  completed: 'Perfunduar',
  cancelled: 'Anulluar',
};

export default function OrdersPage({ user }: { user: User }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>('open');
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  const load = async () => {
    const data = await ipc.listOrders();
    setOrders(data);
  };

  useEffect(() => { load(); }, []);

  const toggleExpand = async (orderId: number) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
      return;
    }
    const items = await ipc.getOrderItems(orderId);
    setOrderItems(items);
    setExpandedOrder(orderId);
  };

  const updateStatus = async (orderId: number, status: string) => {
    await ipc.updateOrderStatus(orderId, status);
    load();
  };

  const filtered = orders.filter(o => filter === 'all' || o.status === filter);

  return (
    <div>
      <div className="page-header">
        <h2>Porosite</h2>
      </div>

      <div className="tabs">
        {(['open', 'completed', 'cancelled', 'all'] as const).map(f => (
          <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'Te gjitha' : STATUS_LABELS[f]} {f !== 'all' && `(${orders.filter(o => o.status === f).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card"><p>Nuk u gjet asnje porosi.</p></div>
      ) : (
        filtered.map(order => (
          <div key={order.id} className="card order-card" onClick={() => toggleExpand(order.id)}>
            <div className="order-card-header">
              <div className="order-card-left">
                <strong style={{ fontSize: 16 }}>Porosi #{order.id}</strong>
                <span className={`badge badge-${order.status}`}>{STATUS_LABELS[order.status] || order.status}</span>
                <span className="order-type-label">
                  {order.order_type === 'take-away' ? 'Me Vete' : `${order.room_name} - ${order.table_label}`}
                </span>
              </div>
              <div className="order-card-right">
                <span className="order-meta">{order.created_by_name} - {new Date(order.created_at).toLocaleString('sq-AL')}</span>
                {order.status === 'open' && (
                  <div className="flex-gap" onClick={e => e.stopPropagation()}>
                    <button className="btn btn-success" onClick={() => updateStatus(order.id, 'completed')}>Perfundo</button>
                    <button className="btn btn-danger" onClick={() => updateStatus(order.id, 'cancelled')}>Anullo</button>
                  </div>
                )}
              </div>
            </div>

            {expandedOrder === order.id && (
              <div className="order-details">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Artikulli</th>
                      <th>Sasia</th>
                      <th>Cmimi</th>
                      <th>Nentotali</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderItems.map(item => (
                      <tr key={item.id}>
                        <td>{item.item_name}</td>
                        <td>{item.quantity}</td>
                        <td>{item.price.toFixed(2)} €</td>
                        <td>{(item.price * item.quantity).toFixed(2)} €</td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={3} style={{ fontWeight: 'bold', textAlign: 'right' }}>Totali:</td>
                      <td style={{ fontWeight: 'bold' }}>{orderItems.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2)} €</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
