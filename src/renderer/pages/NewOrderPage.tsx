import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ipc } from '../ipc';
import { User } from '../App';

interface MenuItem {
  id: number;
  name: string;
  category: string;
  price: number;
  available: number;
}

interface Room {
  id: number;
  name: string;
  width: number;
  height: number;
}

interface TableItem {
  id: number;
  room_id: number;
  label: string;
  x: number;
  y: number;
  seats: number;
}

interface Fixture {
  id: number;
  room_id: number;
  type: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
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

interface OrderWithItems {
  id: number;
  created_by_name: string;
  created_at: string;
  items: OrderItem[];
}

const FIXTURE_ICONS: Record<string, string> = {
  toilet: '🚻', bar: '🍸', kitchen: '🍳', door: '🚪', window: '🪟',
  stairs: '🪜', column: '⬤', plant: '🌿', wall: '▬', sofa: '🛋️',
  cashier: '💰', storage: '📦',
};

const FIXTURE_COLORS: Record<string, string> = {
  toilet: '#78909c', bar: '#6d4c41', kitchen: '#ef6c00', door: '#43a047',
  window: '#29b6f6', stairs: '#8d6e63', column: '#616161', plant: '#66bb6a',
  wall: '#455a64', sofa: '#7e57c2', cashier: '#ffa000', storage: '#90a4ae',
};

const CATEGORY_LABELS: Record<string, string> = {
  coffee: 'Kafe',
  tea: 'Caj',
  'cold-drinks': 'Pije te Ftohta',
  pastry: 'Embelsira',
  food: 'Ushqim',
  other: 'Tjeter',
};

export default function NewOrderPage({ user }: { user: User }) {
  const [orderType, setOrderType] = useState<'dine-in' | 'take-away'>('dine-in');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [tables, setTables] = useState<TableItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [busyTables, setBusyTables] = useState<Set<number>>(new Set());
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [logo, setLogo] = useState<string | null>(null);
  const [tableOrdersData, setTableOrdersData] = useState<OrderWithItems[]>([]);
  const [loadingTableOrders, setLoadingTableOrders] = useState(false);

  useEffect(() => {
    ipc.getSetting('logo').then((val: string | null) => setLogo(val));
    ipc.listMenu().then((items: MenuItem[]) => setMenuItems(items.filter(i => i.available)));
    ipc.listRooms().then((data: Room[]) => {
      setRooms(data);
      if (data.length > 0) setSelectedRoom(data[0]);
    });
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      ipc.listTables(selectedRoom.id).then((data: TableItem[]) => {
        setTables(data);
        Promise.all(data.map((t: TableItem) => ipc.getTableActiveOrders(t.id).then((orders: any[]) => ({ id: t.id, busy: orders.length > 0 }))))
          .then(results => {
            const busy = new Set<number>();
            results.forEach(r => { if (r.busy) busy.add(r.id); });
            setBusyTables(busy);
          });
      });
      ipc.listFixtures(selectedRoom.id).then((data: Fixture[]) => setFixtures(data));
    }
  }, [selectedRoom]);

  const reloadTableOrders = useCallback(async (tableId: number) => {
    const orders: any[] = await ipc.getTableActiveOrders(tableId);
    const withItems: OrderWithItems[] = await Promise.all(
      orders.map(async (order: any) => {
        const items = await ipc.getOrderItems(order.id);
        return { ...order, items };
      })
    );
    setTableOrdersData(withItems);
    setBusyTables(prev => {
      const next = new Set(prev);
      if (withItems.length === 0) next.delete(tableId);
      else next.add(tableId);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!selectedTable) {
      setTableOrdersData([]);
      return;
    }
    setLoadingTableOrders(true);
    reloadTableOrders(selectedTable).finally(() => setLoadingTableOrders(false));
  }, [selectedTable, reloadTableOrders]);

  // Recalculate canvas size when sidebar appears/disappears
  useEffect(() => {
    const timer = setTimeout(updateCanvasSize, 10);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTable]);

  const handleCompleteOrder = async (orderId: number) => {
    await ipc.updateOrderStatus(orderId, 'completed');
    if (selectedTable) await reloadTableOrders(selectedTable);
  };

  const handleCancelOrder = async (orderId: number) => {
    await ipc.updateOrderStatus(orderId, 'cancelled');
    if (selectedTable) await reloadTableOrders(selectedTable);
  };

  const handleCompleteAllOrders = async () => {
    await Promise.all(tableOrdersData.map(o => ipc.updateOrderStatus(o.id, 'completed')));
    if (selectedTable) await reloadTableOrders(selectedTable);
  };

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === item.id);
      if (existing) {
        return prev.map(c => c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };

  const updateQty = (menuItemId: number, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.menuItem.id === menuItemId) {
        const newQty = c.quantity + delta;
        return newQty <= 0 ? null! : { ...c, quantity: newQty };
      }
      return c;
    }).filter(Boolean));
  };

  const total = cart.reduce((sum, c) => sum + c.menuItem.price * c.quantity, 0);

  const handleSubmit = async () => {
    if (cart.length === 0) return alert('Shto te pakten nje artikull');
    if (orderType === 'dine-in' && !selectedTable) return alert('Zgjidh nje tavoline');

    await ipc.createOrder({
      table_id: orderType === 'dine-in' ? selectedTable : null,
      order_type: orderType,
      created_by: user.id,
      items: cart.map(c => ({
        menu_item_id: c.menuItem.id,
        quantity: c.quantity,
        price: c.menuItem.price,
      })),
    });

    setCart([]);
    if (selectedTable) {
      await reloadTableOrders(selectedTable);
    }
  };

  // Responsive table canvas
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: 300 });

  const updateCanvasSize = useCallback(() => {
    if (!canvasWrapperRef.current || !selectedRoom) return;
    const wrapper = canvasWrapperRef.current;
    const maxW = wrapper.clientWidth - 4; // border
    const maxH = 300; // max height for table selection area
    const roomAspect = selectedRoom.width / selectedRoom.height;
    let w = maxW;
    let h = w / roomAspect;
    if (h > maxH) {
      h = maxH;
      w = h * roomAspect;
    }
    setCanvasSize({ w: Math.floor(Math.max(w, 200)), h: Math.floor(Math.max(h, 150)) });
  }, [selectedRoom]);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize]);

  const tableScale = selectedRoom ? canvasSize.w / selectedRoom.width : 1;

  const categories = [...new Set(menuItems.map(i => i.category))];

  const tableOrdersTotal = tableOrdersData.reduce(
    (sum, order) => sum + order.items.reduce((s, i) => s + i.price * i.quantity, 0),
    0
  );

  return (
    <div className="new-order-layout">
      {/* Left column: table selection + menu items (scrollable) */}
      <div className="new-order-left">
        <div className="page-header" style={{ marginBottom: 12 }}>
          <h2>Porosi e Re</h2>
        </div>

        {/* Order type - big touch buttons */}
        <div className="order-type-bar">
          <button
            className={`order-type-btn ${orderType === 'dine-in' ? 'active' : ''}`}
            onClick={() => setOrderType('dine-in')}
          >
            Ne Lokal
          </button>
          <button
            className={`order-type-btn ${orderType === 'take-away' ? 'active' : ''}`}
            onClick={() => setOrderType('take-away')}
          >
            Me Vete
          </button>
        </div>

        {/* Visual table selection for dine-in */}
        {orderType === 'dine-in' && (
          <div className="card">
            <div className="tabs">
              {rooms.map(r => (
                <button key={r.id} className={`tab ${selectedRoom?.id === r.id ? 'active' : ''}`}
                  onClick={() => { setSelectedRoom(r); setSelectedTable(null); }}>
                  {r.name}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              {/* Floor plan canvas */}
              {selectedRoom && (
                <div ref={canvasWrapperRef} style={{ flex: '1 1 auto', minWidth: 0 }}>
                  <div className="room-canvas room-canvas-select"
                    style={{ width: canvasSize.w, height: canvasSize.h, margin: '0 auto' }}>
                    {/* Fixtures (non-clickable, for context) */}
                    {fixtures.map(fixture => (
                      <div
                        key={'f-' + fixture.id}
                        className="floor-fixture floor-fixture-readonly"
                        style={{
                          left: fixture.x * tableScale,
                          top: fixture.y * tableScale,
                          width: fixture.width * tableScale,
                          height: fixture.height * tableScale,
                          backgroundColor: FIXTURE_COLORS[fixture.type] || '#616161',
                          transform: fixture.rotation ? `rotate(${fixture.rotation}deg)` : undefined,
                          fontSize: Math.max(8, 10 * tableScale),
                        }}
                      >
                        <span className="floor-fixture-icon" style={{ fontSize: Math.max(12, 16 * tableScale) }}>{FIXTURE_ICONS[fixture.type] || '?'}</span>
                        <span className="floor-fixture-label">{fixture.label}</span>
                      </div>
                    ))}
                    {/* Tables */}
                    {tables.map(table => {
                      const nodeSize = Math.max(50, 85 * tableScale);
                      return (
                        <div
                          key={table.id}
                          className={`table-node table-node-select ${selectedTable === table.id ? 'selected' : ''} ${busyTables.has(table.id) ? 'has-order' : ''}`}
                          style={{
                            left: table.x * tableScale,
                            top: table.y * tableScale,
                            width: nodeSize,
                            height: nodeSize,
                            fontSize: Math.max(11, 14 * tableScale),
                          }}
                          onClick={() => setSelectedTable(table.id)}
                        >
                          {table.label}
                          <span className="seats">{table.seats} ulse</span>
                        </div>
                      );
                    })}
                    {tables.length === 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8d6e63' }}>
                        Nuk ka tavolina ne kete salle
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Table orders sidebar */}
              {selectedTable && (
                <div className="table-orders-sidebar">
                  <div className="table-orders-sidebar-header">
                    <span>Tavolina {tables.find(t => t.id === selectedTable)?.label}</span>
                    <button className="table-orders-close-btn" onClick={() => setSelectedTable(null)}>✕</button>
                  </div>

                  {loadingTableOrders ? (
                    <p className="table-orders-empty">Duke ngarkuar...</p>
                  ) : tableOrdersData.length === 0 ? (
                    <p className="table-orders-empty">Nuk ka porosi te hapura.</p>
                  ) : (
                    <>
                      <div className="table-orders-list">
                        {tableOrdersData.map(order => {
                          const orderTotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
                          return (
                            <div key={order.id} className="table-order-entry">
                              <div className="table-order-entry-header">
                                <span className="table-order-id">#{order.id}</span>
                                <span className="table-order-staff">{order.created_by_name}</span>
                              </div>
                              <div className="table-order-items">
                                {order.items.map(item => (
                                  <div key={item.id} className="table-order-item-row">
                                    <span className="table-order-item-name">{item.item_name}</span>
                                    <span className="table-order-item-qty">x{item.quantity}</span>
                                    <span className="table-order-item-price">{(item.price * item.quantity).toFixed(2)}€</span>
                                  </div>
                                ))}
                              </div>
                              <div className="table-order-subtotal">
                                {orderTotal.toFixed(2)} €
                                <div className="table-order-actions">
                                  <button className="btn btn-success btn-sm" onClick={() => handleCompleteOrder(order.id)}>✓</button>
                                  <button className="btn btn-danger btn-sm" onClick={() => handleCancelOrder(order.id)}>✕</button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="table-orders-total">
                        <span>TOTAL</span>
                        <span>{tableOrdersTotal.toFixed(2)} €</span>
                      </div>
                      <button className="btn btn-success btn-block" style={{ marginTop: 10 }} onClick={handleCompleteAllOrders}>
                        Paguaj ({tableOrdersTotal.toFixed(2)} €)
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Menu items */}
        {categories.map(cat => (
          <div key={cat} className="mb-12">
            <h4 style={{ marginBottom: 8, color: '#5d4037' }}>{CATEGORY_LABELS[cat] || cat}</h4>
            <div className="menu-grid">
              {menuItems.filter(i => i.category === cat).map(item => (
                <div key={item.id} className="menu-card-touch" onClick={() => addToCart(item)}>
                  <div className="menu-card-name">{item.name}</div>
                  <div className="menu-card-price">{item.price.toFixed(2)} €</div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {menuItems.length === 0 && (
          <div className="card"><p>Nuk ka artikuj ne menu. Kerkoni nga admini te shtoj artikuj.</p></div>
        )}
      </div>

      {/* Right column: cart/bill (always visible) */}
      <div className="new-order-right">
        <div className="card cart-card">
          {logo && (
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <img src={logo} alt="Logo" style={{ maxWidth: 120, maxHeight: 60, objectFit: 'contain', opacity: 0.85 }} />
            </div>
          )}
          <h3>Permbledhja</h3>
          <p style={{ color: '#8d6e63', fontSize: 14, marginBottom: 12 }}>
            {orderType === 'take-away' ? 'Me Vete' : selectedTable ? `Tavolina: ${tables.find(t => t.id === selectedTable)?.label}` : 'Zgjidh nje tavoline'}
          </p>

          {cart.length === 0 ? (
            <p style={{ color: '#8d6e63', fontSize: 15 }}>Kliko artikujt per ti shtuar.</p>
          ) : (
            <>
              <div className="cart-items-scroll">
                {cart.map(c => (
                  <div key={c.menuItem.id} className="cart-item-row">
                    <span className="cart-item-name">{c.menuItem.name}</span>
                    <div className="qty-controls-lg">
                      <button onClick={() => updateQty(c.menuItem.id, -1)}>-</button>
                      <span>{c.quantity}</span>
                      <button onClick={() => updateQty(c.menuItem.id, 1)}>+</button>
                    </div>
                    <span className="cart-item-price">{(c.menuItem.price * c.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="cart-total">
                <span>Totali</span>
                <span>{total.toFixed(2)} €</span>
              </div>
              <button className="btn btn-success btn-block btn-lg" onClick={handleSubmit}>
                Konfirmo Porosine
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
