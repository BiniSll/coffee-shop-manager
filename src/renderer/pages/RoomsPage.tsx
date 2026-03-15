import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ipc } from '../ipc';

interface Room {
  id: number;
  name: string;
  width: number;
  height: number;
}

interface Table {
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

type TableShape = 'circle' | 'square' | 'rect';
type SelectedItem = { kind: 'table'; item: Table } | { kind: 'fixture'; item: Fixture } | null;

const GRID_SIZE = 20;
const snapToGrid = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;

const FIXTURE_TYPES = [
  { type: 'toilet', label: 'Tualeti', icon: '🚻', defaultW: 80, defaultH: 60 },
  { type: 'bar', label: 'Banaku', icon: '🍸', defaultW: 160, defaultH: 50 },
  { type: 'kitchen', label: 'Kuzhina', icon: '🍳', defaultW: 120, defaultH: 80 },
  { type: 'door', label: 'Dera', icon: '🚪', defaultW: 60, defaultH: 20 },
  { type: 'window', label: 'Dritarja', icon: '🪟', defaultW: 80, defaultH: 16 },
  { type: 'stairs', label: 'Shkallet', icon: '🪜', defaultW: 60, defaultH: 80 },
  { type: 'column', label: 'Kolona', icon: '⬤', defaultW: 30, defaultH: 30 },
  { type: 'plant', label: 'Bima', icon: '🌿', defaultW: 40, defaultH: 40 },
  { type: 'wall', label: 'Muri', icon: '▬', defaultW: 200, defaultH: 16 },
  { type: 'sofa', label: 'Divani', icon: '🛋️', defaultW: 120, defaultH: 50 },
  { type: 'cashier', label: 'Arka', icon: '💰', defaultW: 80, defaultH: 60 },
  { type: 'storage', label: 'Magazina', icon: '📦', defaultW: 100, defaultH: 80 },
];

const FIXTURE_COLORS: Record<string, string> = {
  toilet: '#78909c',
  bar: '#6d4c41',
  kitchen: '#ef6c00',
  door: '#43a047',
  window: '#29b6f6',
  stairs: '#8d6e63',
  column: '#616161',
  plant: '#66bb6a',
  wall: '#455a64',
  sofa: '#7e57c2',
  cashier: '#ffa000',
  storage: '#90a4ae',
};

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [selected, setSelected] = useState<SelectedItem>(null);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState(false);
  const [roomForm, setRoomForm] = useState({ name: '', width: '800', height: '500' });
  const [dragging, setDragging] = useState<{ kind: 'table' | 'fixture'; id: number; offsetX: number; offsetY: number } | null>(null);
  const [addMode, setAddMode] = useState<'table' | 'fixture' | null>(null);
  const [newTableSeats, setNewTableSeats] = useState(4);
  const [newFixtureType, setNewFixtureType] = useState('toilet');
  const canvasRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 500 });

  const getTableShape = (table: Table): TableShape => {
    if (table.seats <= 2) return 'circle';
    if (table.seats <= 4) return 'square';
    return 'rect';
  };

  const updateCanvasSize = useCallback(() => {
    if (!wrapperRef.current || !selectedRoom) return;
    const wrapper = wrapperRef.current;
    const maxW = wrapper.clientWidth - 28;
    const maxH = wrapper.clientHeight - 28;
    const roomAspect = selectedRoom.width / selectedRoom.height;
    let w = maxW;
    let h = w / roomAspect;
    if (h > maxH) { h = maxH; w = h * roomAspect; }
    setCanvasSize({ w: Math.floor(Math.max(w, 300)), h: Math.floor(Math.max(h, 200)) });
  }, [selectedRoom]);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize]);

  const scale = selectedRoom ? canvasSize.w / selectedRoom.width : 1;

  const loadRooms = async () => {
    const data = await ipc.listRooms();
    setRooms(data);
    if (data.length > 0 && !selectedRoom) setSelectedRoom(data[0]);
  };

  const loadTables = useCallback(async () => {
    if (!selectedRoom) return;
    const data = await ipc.listTables(selectedRoom.id);
    setTables(data);
  }, [selectedRoom]);

  const loadFixtures = useCallback(async () => {
    if (!selectedRoom) return;
    const data = await ipc.listFixtures(selectedRoom.id);
    setFixtures(data);
  }, [selectedRoom]);

  useEffect(() => { loadRooms(); }, []);
  useEffect(() => { loadTables(); loadFixtures(); }, [selectedRoom, loadTables, loadFixtures]);

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRoom && selectedRoom) {
      await ipc.updateRoom({ id: selectedRoom.id, name: roomForm.name, width: parseInt(roomForm.width), height: parseInt(roomForm.height) });
      const data = await ipc.listRooms();
      setRooms(data);
      setSelectedRoom(data.find((r: Room) => r.id === selectedRoom.id) || data[0]);
    } else {
      await ipc.createRoom({ name: roomForm.name, width: parseInt(roomForm.width), height: parseInt(roomForm.height) });
      const data = await ipc.listRooms();
      setRooms(data);
      setSelectedRoom(data[data.length - 1]);
    }
    setShowRoomForm(false);
    setEditingRoom(false);
  };

  const handleDeleteRoom = async () => {
    if (!selectedRoom) return;
    if (confirm('Fshi sallen "' + selectedRoom.name + '" dhe te gjitha tavolinat?')) {
      await ipc.deleteRoom(selectedRoom.id);
      setSelectedRoom(null);
      setSelected(null);
      loadRooms();
    }
  };

  const openEditRoom = () => {
    if (!selectedRoom) return;
    setEditingRoom(true);
    setRoomForm({ name: selectedRoom.name, width: String(selectedRoom.width), height: String(selectedRoom.height) });
    setShowRoomForm(true);
  };

  const openAddRoom = () => {
    setEditingRoom(false);
    setRoomForm({ name: '', width: '800', height: '500' });
    setShowRoomForm(true);
  };

  const screenToRoom = (sx: number, sy: number) => {
    return { x: snapToGrid(sx / scale), y: snapToGrid(sy / scale) };
  };

  const handleCanvasClick = async (e: React.MouseEvent) => {
    if (!addMode || !selectedRoom || dragging) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (addMode === 'table') {
      const { x, y } = screenToRoom(e.clientX - rect.left - 40 * scale, e.clientY - rect.top - 40 * scale);
      const tableCount = tables.length + 1;
      const label = 'T' + tableCount;
      const result = await ipc.createTable({
        room_id: selectedRoom.id, label,
        x: Math.max(0, Math.min(x, selectedRoom.width - 80)),
        y: Math.max(0, Math.min(y, selectedRoom.height - 80)),
        seats: newTableSeats,
      });
      setAddMode(null);
      await loadTables();
      const newTables = await ipc.listTables(selectedRoom.id);
      const created = newTables.find((t: Table) => t.id === Number(result.id));
      if (created) setSelected({ kind: 'table', item: created });
    } else if (addMode === 'fixture') {
      const ft = FIXTURE_TYPES.find(f => f.type === newFixtureType)!;
      const { x, y } = screenToRoom(e.clientX - rect.left - (ft.defaultW / 2) * scale, e.clientY - rect.top - (ft.defaultH / 2) * scale);
      const result = await ipc.createFixture({
        room_id: selectedRoom.id, type: newFixtureType, label: ft.label,
        x: Math.max(0, Math.min(x, selectedRoom.width - ft.defaultW)),
        y: Math.max(0, Math.min(y, selectedRoom.height - ft.defaultH)),
        width: ft.defaultW, height: ft.defaultH, rotation: 0,
      });
      setAddMode(null);
      await loadFixtures();
      const newFixtures = await ipc.listFixtures(selectedRoom.id);
      const created = newFixtures.find((f: Fixture) => f.id === Number(result.id));
      if (created) setSelected({ kind: 'fixture', item: created });
    }
  };

  // Dragging for both tables and fixtures
  const onMouseDown = (e: React.MouseEvent, kind: 'table' | 'fixture', item: Table | Fixture) => {
    if (addMode) return;
    e.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSelected({ kind, item } as SelectedItem);
    setDragging({
      kind, id: item.id,
      offsetX: e.clientX - rect.left - item.x * scale,
      offsetY: e.clientY - rect.top - item.y * scale,
    });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !canvasRef.current || !selectedRoom) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const rawX = (e.clientX - rect.left - dragging.offsetX) / scale;
    const rawY = (e.clientY - rect.top - dragging.offsetY) / scale;
    const x = snapToGrid(Math.max(0, Math.min(rawX, selectedRoom.width - 40)));
    const y = snapToGrid(Math.max(0, Math.min(rawY, selectedRoom.height - 40)));

    if (dragging.kind === 'table') {
      setTables(prev => prev.map(t => t.id === dragging.id ? { ...t, x, y } : t));
      setSelected(prev => prev && prev.kind === 'table' && prev.item.id === dragging.id ? { kind: 'table', item: { ...prev.item, x, y } } : prev);
    } else {
      setFixtures(prev => prev.map(f => f.id === dragging.id ? { ...f, x, y } : f));
      setSelected(prev => prev && prev.kind === 'fixture' && prev.item.id === dragging.id ? { kind: 'fixture', item: { ...prev.item as Fixture, x, y } } : prev);
    }
  };

  const onMouseUp = async () => {
    if (!dragging) return;
    if (dragging.kind === 'table') {
      const table = tables.find(t => t.id === dragging.id);
      if (table) await ipc.updateTable({ id: table.id, label: table.label, x: table.x, y: table.y, seats: table.seats });
    } else {
      const fixture = fixtures.find(f => f.id === dragging.id);
      if (fixture) await ipc.updateFixture(fixture);
    }
    setDragging(null);
  };

  // Table property updates
  const updateTableProp = async (field: string, value: string | number) => {
    if (!selected || selected.kind !== 'table') return;
    const updated = { ...selected.item, [field]: value };
    setSelected({ kind: 'table', item: updated });
    setTables(prev => prev.map(t => t.id === updated.id ? updated : t));
    await ipc.updateTable({ id: updated.id, label: updated.label, x: updated.x, y: updated.y, seats: updated.seats });
  };

  const handleDeleteTable = async () => {
    if (!selected || selected.kind !== 'table') return;
    if (confirm('Fshi tavoline "' + selected.item.label + '"?')) {
      await ipc.deleteTable(selected.item.id);
      setSelected(null);
      loadTables();
    }
  };

  // Fixture property updates
  const updateFixtureProp = async (field: string, value: string | number) => {
    if (!selected || selected.kind !== 'fixture') return;
    const updated = { ...selected.item as Fixture, [field]: value };
    setSelected({ kind: 'fixture', item: updated });
    setFixtures(prev => prev.map(f => f.id === updated.id ? updated : f));
    await ipc.updateFixture(updated);
  };

  const handleDeleteFixture = async () => {
    if (!selected || selected.kind !== 'fixture') return;
    if (confirm('Fshi "' + (selected.item as Fixture).label + '"?')) {
      await ipc.deleteFixture(selected.item.id);
      setSelected(null);
      loadFixtures();
    }
  };

  const gridBg = `repeating-linear-gradient(0deg, transparent, transparent ${GRID_SIZE * scale - 1}px, rgba(0,0,0,0.04) ${GRID_SIZE * scale - 1}px, rgba(0,0,0,0.04) ${GRID_SIZE * scale}px),
    repeating-linear-gradient(90deg, transparent, transparent ${GRID_SIZE * scale - 1}px, rgba(0,0,0,0.04) ${GRID_SIZE * scale - 1}px, rgba(0,0,0,0.04) ${GRID_SIZE * scale}px)`;

  const getTableNodeClass = (table: Table) => {
    const shape = getTableShape(table);
    let cls = 'floor-table';
    if (shape === 'circle') cls += ' floor-table-circle';
    else if (shape === 'square') cls += ' floor-table-square';
    else cls += ' floor-table-rect';
    if (selected?.kind === 'table' && selected.item.id === table.id) cls += ' floor-table-selected';
    return cls;
  };

  const getTableSize = (table: Table) => {
    const shape = getTableShape(table);
    if (shape === 'rect') return { width: 110 * scale, height: 70 * scale };
    return { width: 80 * scale, height: 80 * scale };
  };

  const selectedFixture = selected?.kind === 'fixture' ? selected.item as Fixture : null;
  const selectedTable = selected?.kind === 'table' ? selected.item : null;

  return (
    <div className="rooms-layout">
      {/* Left: Floor plan */}
      <div className="rooms-main">
        <div className="page-header" style={{ marginBottom: 12 }}>
          <h2>Sallat & Tavolinat</h2>
          <button className="btn btn-primary" onClick={openAddRoom}>+ Salle e Re</button>
        </div>

        {rooms.length > 0 && (
          <div className="room-tabs">
            {rooms.map(room => (
              <button key={room.id}
                className={`room-tab ${selectedRoom?.id === room.id ? 'active' : ''}`}
                onClick={() => { setSelectedRoom(room); setSelected(null); }}>
                {room.name}
              </button>
            ))}
          </div>
        )}

        {selectedRoom && (
          <div className="floor-toolbar">
            <button className={`toolbar-btn ${addMode === 'table' ? 'active' : ''}`}
              onClick={() => setAddMode(addMode === 'table' ? null : 'table')}>
              {addMode === 'table' ? 'Anulo' : '+ Tavoline'}
            </button>
            {addMode === 'table' && (
              <div className="toolbar-add-options">
                <label>Ulse:</label>
                {[2, 4, 6, 8].map(n => (
                  <button key={n}
                    className={`toolbar-seat-btn ${newTableSeats === n ? 'active' : ''}`}
                    onClick={() => setNewTableSeats(n)}>
                    {n}
                  </button>
                ))}
              </div>
            )}
            <button className={`toolbar-btn ${addMode === 'fixture' ? 'active' : ''}`}
              onClick={() => setAddMode(addMode === 'fixture' ? null : 'fixture')}>
              {addMode === 'fixture' ? 'Anulo' : '+ Element'}
            </button>
            {addMode && <span className="toolbar-hint">Kliko ne harten per te vendosur</span>}
            <div style={{ flex: 1 }} />
            <button className="toolbar-btn" onClick={openEditRoom}>Ndrysho Sallen</button>
            <button className="toolbar-btn toolbar-btn-danger" onClick={handleDeleteRoom}>Fshi Sallen</button>
          </div>
        )}

        {/* Fixture type picker */}
        {addMode === 'fixture' && (
          <div className="fixture-picker">
            {FIXTURE_TYPES.map(ft => (
              <button key={ft.type}
                className={`fixture-pick-btn ${newFixtureType === ft.type ? 'active' : ''}`}
                onClick={() => setNewFixtureType(ft.type)}>
                <span className="fixture-pick-icon">{ft.icon}</span>
                <span className="fixture-pick-label">{ft.label}</span>
              </button>
            ))}
          </div>
        )}

        {selectedRoom && (
          <div className="floor-canvas-wrapper" ref={wrapperRef}>
            <div
              ref={canvasRef}
              className={`floor-canvas ${addMode ? 'floor-canvas-add' : ''}`}
              style={{ width: canvasSize.w, height: canvasSize.h, backgroundImage: gridBg }}
              onClick={handleCanvasClick}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            >
              <div className="floor-room-label">{selectedRoom.name} ({selectedRoom.width}x{selectedRoom.height})</div>

              {/* Fixtures rendered first (behind tables) */}
              {fixtures.map(fixture => {
                const ft = FIXTURE_TYPES.find(f => f.type === fixture.type);
                const color = FIXTURE_COLORS[fixture.type] || '#616161';
                const isSelected = selectedFixture?.id === fixture.id;
                return (
                  <div
                    key={'f-' + fixture.id}
                    className={`floor-fixture ${isSelected ? 'floor-fixture-selected' : ''}`}
                    style={{
                      left: fixture.x * scale,
                      top: fixture.y * scale,
                      width: fixture.width * scale,
                      height: fixture.height * scale,
                      backgroundColor: color,
                      transform: fixture.rotation ? `rotate(${fixture.rotation}deg)` : undefined,
                      fontSize: Math.max(9, 11 * scale),
                    }}
                    onMouseDown={e => onMouseDown(e, 'fixture', fixture)}
                  >
                    <span className="floor-fixture-icon" style={{ fontSize: Math.max(14, 20 * scale) }}>{ft?.icon}</span>
                    <span className="floor-fixture-label">{fixture.label}</span>
                  </div>
                );
              })}

              {/* Tables */}
              {tables.map(table => {
                const size = getTableSize(table);
                return (
                  <div
                    key={'t-' + table.id}
                    className={getTableNodeClass(table)}
                    style={{
                      left: table.x * scale,
                      top: table.y * scale,
                      width: size.width,
                      height: size.height,
                      fontSize: Math.max(10, 13 * scale),
                    }}
                    onMouseDown={e => onMouseDown(e, 'table', table)}
                  >
                    <span className="floor-table-label">{table.label}</span>
                    <span className="floor-table-seats">{table.seats} ulse</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {rooms.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <h3 style={{ marginBottom: 8 }}>Nuk ka salla ende</h3>
            <p style={{ color: '#8d6e63', marginBottom: 16 }}>Shto sallen e pare per te filluar, p.sh. "Salla Kryesore" ose "Tarrace"</p>
            <button className="btn btn-primary btn-lg" onClick={openAddRoom}>+ Shto Salle te Re</button>
          </div>
        )}
      </div>

      {/* Right: Properties panel */}
      <div className="rooms-panel">
        {selectedTable ? (
          <div className="props-panel">
            <h3>Vetite e Tavolines</h3>
            <div className="form-group">
              <label>Emri</label>
              <input value={selectedTable.label}
                onChange={e => updateTableProp('label', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Numri i Ulseve</label>
              <div className="seat-picker">
                {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map(n => (
                  <button key={n}
                    className={`seat-pick-btn ${selectedTable.seats === n ? 'active' : ''}`}
                    onClick={() => updateTableProp('seats', n)}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Pozicioni</label>
              <div className="pos-inputs">
                <div>
                  <span>X</span>
                  <input type="number" value={selectedTable.x}
                    onChange={e => updateTableProp('x', parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <span>Y</span>
                  <input type="number" value={selectedTable.y}
                    onChange={e => updateTableProp('y', parseInt(e.target.value) || 0)} />
                </div>
              </div>
            </div>
            <button className="btn btn-danger btn-block mt-12" onClick={handleDeleteTable}>
              Fshi Tavoline
            </button>
          </div>
        ) : selectedFixture ? (
          <div className="props-panel">
            <h3>Vetite e Elementit</h3>
            <div className="form-group">
              <label>Lloji</label>
              <div className="fixture-type-display">
                <span style={{ fontSize: 24 }}>{FIXTURE_TYPES.find(f => f.type === selectedFixture.type)?.icon}</span>
                <select value={selectedFixture.type} onChange={e => updateFixtureProp('type', e.target.value)}>
                  {FIXTURE_TYPES.map(ft => (
                    <option key={ft.type} value={ft.type}>{ft.icon} {ft.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Emri</label>
              <input value={selectedFixture.label}
                onChange={e => updateFixtureProp('label', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Madhesia</label>
              <div className="pos-inputs">
                <div>
                  <span>W</span>
                  <input type="number" min="16" max="400" value={selectedFixture.width}
                    onChange={e => updateFixtureProp('width', parseInt(e.target.value) || 40)} />
                </div>
                <div>
                  <span>H</span>
                  <input type="number" min="16" max="400" value={selectedFixture.height}
                    onChange={e => updateFixtureProp('height', parseInt(e.target.value) || 40)} />
                </div>
              </div>
            </div>
            <div className="form-group">
              <label>Pozicioni</label>
              <div className="pos-inputs">
                <div>
                  <span>X</span>
                  <input type="number" value={selectedFixture.x}
                    onChange={e => updateFixtureProp('x', parseInt(e.target.value) || 0)} />
                </div>
                <div>
                  <span>Y</span>
                  <input type="number" value={selectedFixture.y}
                    onChange={e => updateFixtureProp('y', parseInt(e.target.value) || 0)} />
                </div>
              </div>
            </div>
            <div className="form-group">
              <label>Rotacioni ({selectedFixture.rotation}°)</label>
              <input type="range" min="0" max="360" step="15" value={selectedFixture.rotation}
                onChange={e => updateFixtureProp('rotation', parseInt(e.target.value))}
                style={{ width: '100%' }} />
            </div>
            <button className="btn btn-danger btn-block mt-12" onClick={handleDeleteFixture}>
              Fshi Elementin
            </button>
          </div>
        ) : (
          <div className="props-panel props-empty">
            <div className="props-empty-icon">&#9678;</div>
            <h4>Zgjidh nje element</h4>
            <p>Kliko mbi nje tavoline ose element ne harte per te ndryshuar vetite.</p>
            {selectedRoom && (
              <div className="props-stats">
                <div className="props-stat">
                  <span className="props-stat-value">{tables.length}</span>
                  <span className="props-stat-label">Tavolina</span>
                </div>
                <div className="props-stat">
                  <span className="props-stat-value">{tables.reduce((s, t) => s + t.seats, 0)}</span>
                  <span className="props-stat-label">Ulse Gjithsej</span>
                </div>
                <div className="props-stat">
                  <span className="props-stat-value">{fixtures.length}</span>
                  <span className="props-stat-label">Elemente</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Room Form Modal */}
      {showRoomForm && (
        <div className="modal-overlay" onClick={() => { setShowRoomForm(false); setEditingRoom(false); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editingRoom ? 'Ndrysho Sallen' : 'Shto Salle te Re'}</h3>
            <form onSubmit={handleSaveRoom}>
              <div className="form-group">
                <label>Emri i Salles</label>
                <input value={roomForm.name} onChange={e => setRoomForm({ ...roomForm, name: e.target.value })}
                  placeholder="p.sh. Salla Kryesore, Tarrace, Kati i Dyte" required autoFocus />
              </div>
              <div className="room-size-presets">
                <label>Madhesia</label>
                <div className="flex-gap">
                  {[
                    { label: 'E vogel', w: 600, h: 400 },
                    { label: 'Mesatare', w: 800, h: 500 },
                    { label: 'E madhe', w: 1000, h: 600 },
                  ].map(p => (
                    <button type="button" key={p.label}
                      className={`preset-btn ${roomForm.width === String(p.w) && roomForm.height === String(p.h) ? 'active' : ''}`}
                      onClick={() => setRoomForm({ ...roomForm, width: String(p.w), height: String(p.h) })}>
                      {p.label}
                      <span>{p.w}x{p.h}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid-2 mt-12">
                <div className="form-group">
                  <label>Gjeresia (px)</label>
                  <input type="number" min="300" max="1400" value={roomForm.width}
                    onChange={e => setRoomForm({ ...roomForm, width: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Lartesia (px)</label>
                  <input type="number" min="200" max="900" value={roomForm.height}
                    onChange={e => setRoomForm({ ...roomForm, height: e.target.value })} required />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary btn-lg"
                  onClick={() => { setShowRoomForm(false); setEditingRoom(false); }}>Anulo</button>
                <button type="submit" className="btn btn-primary btn-lg">
                  {editingRoom ? 'Ruaj Ndryshimet' : 'Krijo Sallen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
