import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import Sidebar from './components/Sidebar';
import UpdateBar from './components/UpdateBar';
import MenuPage from './pages/MenuPage';
import RoomsPage from './pages/RoomsPage';
import OrdersPage from './pages/OrdersPage';
import NewOrderPage from './pages/NewOrderPage';
import ReportsPage from './pages/ReportsPage';
import DayClosePage from './pages/DayClosePage';
import SettingsPage from './pages/SettingsPage';

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'staff';
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  return (
    <HashRouter>
      <div className="app-layout">
        <Sidebar user={user} onLogout={() => setUser(null)} />
        <div className="main-content">
          <UpdateBar />
          <Routes>
            <Route path="/orders" element={<OrdersPage user={user} />} />
            <Route path="/new-order" element={<NewOrderPage user={user} />} />
            <Route path="/close-day" element={<DayClosePage user={user} />} />
            {user.role === 'admin' && (
              <>
                <Route path="/menu" element={<MenuPage />} />
                <Route path="/rooms" element={<RoomsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </>
            )}
            <Route path="*" element={<Navigate to="/orders" replace />} />
          </Routes>
        </div>
      </div>
    </HashRouter>
  );
}
