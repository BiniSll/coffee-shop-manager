const { ipcRenderer } = window.require('electron');

export const ipc = {
  // Auth
  login: (username: string, password: string) => ipcRenderer.invoke('auth:login', username, password),

  // Users
  listUsers: () => ipcRenderer.invoke('users:list'),
  createUser: (username: string, password: string, role: string) => ipcRenderer.invoke('users:create', username, password, role),
  deleteUser: (id: number) => ipcRenderer.invoke('users:delete', id),

  // Menu
  listMenu: () => ipcRenderer.invoke('menu:list'),
  createMenuItem: (item: { name: string; category: string; price: number }) => ipcRenderer.invoke('menu:create', item),
  updateMenuItem: (item: { id: number; name: string; category: string; price: number; available: number }) => ipcRenderer.invoke('menu:update', item),
  deleteMenuItem: (id: number) => ipcRenderer.invoke('menu:delete', id),

  // Rooms
  listRooms: () => ipcRenderer.invoke('rooms:list'),
  createRoom: (room: { name: string; width: number; height: number }) => ipcRenderer.invoke('rooms:create', room),
  updateRoom: (room: { id: number; name: string; width: number; height: number }) => ipcRenderer.invoke('rooms:update', room),
  deleteRoom: (id: number) => ipcRenderer.invoke('rooms:delete', id),

  // Tables
  listTables: (roomId: number) => ipcRenderer.invoke('tables:list', roomId),
  listAllTables: () => ipcRenderer.invoke('tables:list-all'),
  createTable: (table: { room_id: number; label: string; x: number; y: number; seats: number }) => ipcRenderer.invoke('tables:create', table),
  updateTable: (table: { id: number; label: string; x: number; y: number; seats: number }) => ipcRenderer.invoke('tables:update', table),
  deleteTable: (id: number) => ipcRenderer.invoke('tables:delete', id),

  // Fixtures
  listFixtures: (roomId: number) => ipcRenderer.invoke('fixtures:list', roomId),
  createFixture: (fixture: { room_id: number; type: string; label: string; x: number; y: number; width: number; height: number; rotation: number }) => ipcRenderer.invoke('fixtures:create', fixture),
  updateFixture: (fixture: { id: number; type: string; label: string; x: number; y: number; width: number; height: number; rotation: number }) => ipcRenderer.invoke('fixtures:update', fixture),
  deleteFixture: (id: number) => ipcRenderer.invoke('fixtures:delete', id),

  // Orders
  listOrders: () => ipcRenderer.invoke('orders:list'),
  listTodayOrders: () => ipcRenderer.invoke('orders:list-today'),
  createOrder: (order: { table_id: number | null; order_type: string; created_by: number; items: { menu_item_id: number; quantity: number; price: number }[] }) => ipcRenderer.invoke('orders:create', order),
  getOrderItems: (orderId: number) => ipcRenderer.invoke('orders:get-items', orderId),
  updateOrderStatus: (id: number, status: string) => ipcRenderer.invoke('orders:update-status', id, status),
  getTableActiveOrders: (tableId: number) => ipcRenderer.invoke('orders:table-active', tableId),
  todaySummary: () => ipcRenderer.invoke('orders:today-summary'),

  // Daily closings
  closeDay: (closedBy: number, notes: string, targetDate?: string) => ipcRenderer.invoke('daily:close', closedBy, notes, targetDate),
  listClosings: () => ipcRenderer.invoke('daily:list'),
  isClosedToday: () => ipcRenderer.invoke('daily:is-closed-today'),
  unclosedPreviousDay: () => ipcRenderer.invoke('daily:unclosed-previous'),
  daySummary: (date: string) => ipcRenderer.invoke('orders:day-summary', date),

  // Settings
  getSetting: (key: string) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
  deleteSetting: (key: string) => ipcRenderer.invoke('settings:delete', key),

  // Admin
  resetAll: () => ipcRenderer.invoke('admin:reset-all'),

  // Reports
  reportsDailyRange: (start: string, end: string) => ipcRenderer.invoke('reports:daily-range', start, end),
  reportsTopItems: (start: string, end: string) => ipcRenderer.invoke('reports:top-items', start, end),
};
