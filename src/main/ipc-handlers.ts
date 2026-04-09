import { ipcMain } from 'electron';
import { getDb } from './database';

function getLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function registerIpcHandlers() {
  const db = getDb();

  // ── Auth ──
  ipcMain.handle('auth:login', (_e, username: string, password: string) => {
    const user = db.prepare('SELECT id, username, role FROM users WHERE username = ? AND password = ?').get(username, password);
    return user || null;
  });

  // ── Users ──
  ipcMain.handle('users:list', () => {
    return db.prepare('SELECT id, username, role, created_at FROM users').all();
  });

  ipcMain.handle('users:create', (_e, username: string, password: string, role: string) => {
    try {
      db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, password, role);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('users:delete', (_e, id: number) => {
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return { success: true };
  });

  // ── Menu ──
  ipcMain.handle('menu:list', () => {
    return db.prepare('SELECT * FROM menu_items ORDER BY category, name').all();
  });

  ipcMain.handle('menu:create', (_e, item: { name: string; category: string; price: number }) => {
    const result = db.prepare('INSERT INTO menu_items (name, category, price) VALUES (?, ?, ?)').run(item.name, item.category, item.price);
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('menu:update', (_e, item: { id: number; name: string; category: string; price: number; available: number }) => {
    db.prepare('UPDATE menu_items SET name=?, category=?, price=?, available=? WHERE id=?').run(item.name, item.category, item.price, item.available, item.id);
    return { success: true };
  });

  ipcMain.handle('menu:delete', (_e, id: number) => {
    db.prepare('DELETE FROM menu_items WHERE id = ?').run(id);
    return { success: true };
  });

  // ── Rooms ──
  ipcMain.handle('rooms:list', () => {
    return db.prepare('SELECT * FROM rooms').all();
  });

  ipcMain.handle('rooms:create', (_e, room: { name: string; width: number; height: number }) => {
    const result = db.prepare('INSERT INTO rooms (name, width, height) VALUES (?, ?, ?)').run(room.name, room.width, room.height);
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('rooms:update', (_e, room: { id: number; name: string; width: number; height: number }) => {
    db.prepare('UPDATE rooms SET name=?, width=?, height=? WHERE id=?').run(room.name, room.width, room.height, room.id);
    return { success: true };
  });

  ipcMain.handle('rooms:delete', (_e, id: number) => {
    db.prepare('DELETE FROM rooms WHERE id = ?').run(id);
    return { success: true };
  });

  // ── Tables ──
  ipcMain.handle('tables:list', (_e, roomId: number) => {
    return db.prepare('SELECT * FROM tables WHERE room_id = ?').all(roomId);
  });

  ipcMain.handle('tables:list-all', () => {
    return db.prepare('SELECT t.*, r.name as room_name FROM tables t JOIN rooms r ON t.room_id = r.id').all();
  });

  ipcMain.handle('tables:create', (_e, table: { room_id: number; label: string; x: number; y: number; seats: number }) => {
    const result = db.prepare('INSERT INTO tables (room_id, label, x, y, seats) VALUES (?, ?, ?, ?, ?)').run(table.room_id, table.label, table.x, table.y, table.seats);
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('tables:update', (_e, table: { id: number; label: string; x: number; y: number; seats: number }) => {
    db.prepare('UPDATE tables SET label=?, x=?, y=?, seats=? WHERE id=?').run(table.label, table.x, table.y, table.seats, table.id);
    return { success: true };
  });

  ipcMain.handle('tables:delete', (_e, id: number) => {
    db.prepare('DELETE FROM tables WHERE id = ?').run(id);
    return { success: true };
  });

  // ── Room Fixtures ──
  ipcMain.handle('fixtures:list', (_e, roomId: number) => {
    return db.prepare('SELECT * FROM room_fixtures WHERE room_id = ?').all(roomId);
  });

  ipcMain.handle('fixtures:create', (_e, fixture: { room_id: number; type: string; label: string; x: number; y: number; width: number; height: number; rotation: number }) => {
    const result = db.prepare('INSERT INTO room_fixtures (room_id, type, label, x, y, width, height, rotation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      fixture.room_id, fixture.type, fixture.label, fixture.x, fixture.y, fixture.width, fixture.height, fixture.rotation
    );
    return { id: result.lastInsertRowid };
  });

  ipcMain.handle('fixtures:update', (_e, fixture: { id: number; type: string; label: string; x: number; y: number; width: number; height: number; rotation: number }) => {
    db.prepare('UPDATE room_fixtures SET type=?, label=?, x=?, y=?, width=?, height=?, rotation=? WHERE id=?').run(
      fixture.type, fixture.label, fixture.x, fixture.y, fixture.width, fixture.height, fixture.rotation, fixture.id
    );
    return { success: true };
  });

  ipcMain.handle('fixtures:delete', (_e, id: number) => {
    db.prepare('DELETE FROM room_fixtures WHERE id = ?').run(id);
    return { success: true };
  });

  // ── Orders ──
  ipcMain.handle('orders:list', () => {
    return db.prepare(`
      SELECT o.*, u.username as created_by_name,
        CASE WHEN o.table_id IS NOT NULL THEN t.label ELSE 'Take-away' END as table_label,
        r.name as room_name
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN rooms r ON t.room_id = r.id
      LEFT JOIN users u ON o.created_by = u.id
      ORDER BY o.created_at DESC
    `).all();
  });

  ipcMain.handle('orders:list-today', () => {
    return db.prepare(`
      SELECT o.*, u.username as created_by_name,
        CASE WHEN o.table_id IS NOT NULL THEN t.label ELSE 'Take-away' END as table_label,
        r.name as room_name
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN rooms r ON t.room_id = r.id
      LEFT JOIN users u ON o.created_by = u.id
      WHERE date(o.created_at) = date('now', 'localtime')
      ORDER BY o.created_at DESC
    `).all();
  });

  ipcMain.handle('orders:create', (_e, order: { table_id: number | null; order_type: string; created_by: number; items: { menu_item_id: number; quantity: number; price: number }[] }) => {
    const insertOrder = db.prepare('INSERT INTO orders (table_id, order_type, created_by) VALUES (?, ?, ?)');
    const insertItem = db.prepare('INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES (?, ?, ?, ?)');

    const transaction = db.transaction(() => {
      const result = insertOrder.run(order.table_id, order.order_type, order.created_by);
      const orderId = result.lastInsertRowid;
      for (const item of order.items) {
        insertItem.run(orderId, item.menu_item_id, item.quantity, item.price);
      }
      return orderId;
    });

    const orderId = transaction();
    return { id: orderId };
  });

  ipcMain.handle('orders:get-items', (_e, orderId: number) => {
    return db.prepare(`
      SELECT oi.*, mi.name as item_name, mi.category
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = ?
    `).all(orderId);
  });

  ipcMain.handle('orders:update-status', (_e, id: number, status: string) => {
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
    return { success: true };
  });

  ipcMain.handle('orders:table-active', (_e, tableId: number) => {
    return db.prepare("SELECT * FROM orders WHERE table_id = ? AND status = 'open'").all(tableId);
  });

  ipcMain.handle('orders:today-summary', () => {
    const summary = db.prepare(`
      SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed_orders,
        COALESCE(SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END), 0) as open_orders,
        COALESCE(SUM(CASE WHEN order_type = 'dine-in' THEN 1 ELSE 0 END), 0) as dine_in_orders,
        COALESCE(SUM(CASE WHEN order_type = 'take-away' THEN 1 ELSE 0 END), 0) as take_away_orders
      FROM orders
      WHERE date(created_at) = date('now', 'localtime')
    `).get() as any;

    const revenue = db.prepare(`
      SELECT COALESCE(SUM(oi.price * oi.quantity), 0) as total_revenue,
             COALESCE(SUM(oi.quantity), 0) as total_items
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE date(o.created_at) = date('now', 'localtime')
        AND o.status != 'cancelled'
    `).get() as any;

    return { ...summary, ...revenue };
  });

  // ── Daily Closings ──
  ipcMain.handle('daily:close', (_e, closedBy: number, notes: string, targetDate?: string) => {
    const today = targetDate || getLocalDate();

    // Check if already closed
    const existing = db.prepare('SELECT id FROM daily_closings WHERE date = ?').get(today);
    if (existing) {
      return { success: false, error: 'Kjo dite eshte mbyllur tashme' };
    }

    // Complete all open orders for this date
    db.prepare("UPDATE orders SET status = 'completed' WHERE status = 'open' AND date(created_at, 'localtime') = ?").run(today);

    // Calculate summary (all non-cancelled orders; open ones were just completed above)
    const summary = db.prepare(`
      SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(CASE WHEN order_type = 'dine-in' THEN 1 ELSE 0 END), 0) as dine_in_orders,
        COALESCE(SUM(CASE WHEN order_type = 'take-away' THEN 1 ELSE 0 END), 0) as take_away_orders
      FROM orders
      WHERE date(created_at, 'localtime') = ?
        AND status != 'cancelled'
    `).get(today) as any;

    const revenue = db.prepare(`
      SELECT COALESCE(SUM(oi.price * oi.quantity), 0) as total_revenue,
             COALESCE(SUM(oi.quantity), 0) as total_items
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE date(o.created_at, 'localtime') = ?
        AND o.status != 'cancelled'
    `).get(today) as any;

    db.prepare(`
      INSERT INTO daily_closings (date, total_orders, total_revenue, total_items, dine_in_orders, take_away_orders, closed_by, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(today, summary.total_orders, revenue.total_revenue, revenue.total_items, summary.dine_in_orders, summary.take_away_orders, closedBy, notes);

    return { success: true, revenue: revenue.total_revenue, orders: summary.total_orders };
  });

  ipcMain.handle('daily:list', () => {
    return db.prepare(`
      SELECT dc.*, u.username as closed_by_name
      FROM daily_closings dc
      LEFT JOIN users u ON dc.closed_by = u.id
      ORDER BY dc.date DESC
    `).all();
  });

  ipcMain.handle('daily:is-closed-today', () => {
    const today = getLocalDate();
    const row = db.prepare('SELECT id FROM daily_closings WHERE date = ?').get(today);
    return !!row;
  });

  ipcMain.handle('daily:unclosed-previous', () => {
    // Find the most recent past date that has orders but no closing record
    const row = db.prepare(`
      SELECT date(o.created_at, 'localtime') as date, COUNT(*) as order_count
      FROM orders o
      WHERE date(o.created_at, 'localtime') < date('now', 'localtime')
        AND date(o.created_at, 'localtime') NOT IN (SELECT date FROM daily_closings)
        AND o.status != 'cancelled'
      GROUP BY date(o.created_at, 'localtime')
      ORDER BY date DESC
      LIMIT 1
    `).get() as any;
    return row || null;
  });

  ipcMain.handle('orders:day-summary', (_e, date: string) => {
    const summary = db.prepare(`
      SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed_orders,
        COALESCE(SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END), 0) as open_orders,
        COALESCE(SUM(CASE WHEN order_type = 'dine-in' THEN 1 ELSE 0 END), 0) as dine_in_orders,
        COALESCE(SUM(CASE WHEN order_type = 'take-away' THEN 1 ELSE 0 END), 0) as take_away_orders
      FROM orders
      WHERE date(created_at, 'localtime') = ?
        AND status != 'cancelled'
    `).get(date) as any;

    const revenue = db.prepare(`
      SELECT COALESCE(SUM(oi.price * oi.quantity), 0) as total_revenue,
             COALESCE(SUM(oi.quantity), 0) as total_items
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE date(o.created_at, 'localtime') = ?
        AND o.status != 'cancelled'
    `).get(date) as any;

    return { ...summary, ...revenue };
  });

  // ── Settings ──
  ipcMain.handle('settings:get', (_e, key: string) => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any;
    return row ? row.value : null;
  });

  ipcMain.handle('settings:set', (_e, key: string, value: string) => {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
    return { success: true };
  });

  ipcMain.handle('settings:delete', (_e, key: string) => {
    db.prepare('DELETE FROM settings WHERE key = ?').run(key);
    return { success: true };
  });

  // ── Admin ──
  ipcMain.handle('admin:reset-all', () => {
    db.exec(`
      DELETE FROM order_items;
      DELETE FROM orders;
      DELETE FROM daily_closings;
      DELETE FROM room_fixtures;
      DELETE FROM tables;
      DELETE FROM rooms;
      DELETE FROM menu_items;
    `);
    return { success: true };
  });

  // ── Reports ──
  ipcMain.handle('reports:daily-range', (_e, startDate: string, endDate: string) => {
    return db.prepare(`
      SELECT * FROM daily_closings
      WHERE date >= ? AND date <= ?
      ORDER BY date ASC
    `).all(startDate, endDate);
  });

  ipcMain.handle('reports:top-items', (_e, startDate: string, endDate: string) => {
    return db.prepare(`
      SELECT mi.name, mi.category, SUM(oi.quantity) as total_qty, SUM(oi.quantity * oi.price) as total_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE date(o.created_at) >= ? AND date(o.created_at) <= ?
        AND o.status = 'completed'
      GROUP BY mi.id
      ORDER BY total_qty DESC
      LIMIT 10
    `).all(startDate, endDate);
  });
}
