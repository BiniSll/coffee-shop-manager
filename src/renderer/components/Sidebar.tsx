import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { ipc } from '../ipc';
import { User } from '../App';

interface Props {
  user: User;
  onLogout: () => void;
}

export default function Sidebar({ user, onLogout }: Props) {
  const [logo, setLogo] = useState<string | null>(null);
  const [caffeName, setCaffeName] = useState<string | null>(null);

  useEffect(() => {
    ipc.getSetting('logo').then((val: string | null) => setLogo(val));
    ipc.getSetting('caffe_name').then((val: string | null) => setCaffeName(val));
  }, []);

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        {logo && (
          <img src={logo} alt="Logo" className="sidebar-logo" />
        )}
        {caffeName || 'Menaxhimi i Kafes'}
        <span>{user.username} ({user.role === 'admin' ? 'Admin' : 'Stafi'})</span>
      </div>
      <nav>
        <NavLink to="/orders" className={({ isActive }) => isActive ? 'active' : ''}>
          Porosite
        </NavLink>
        <NavLink to="/new-order" className={({ isActive }) => isActive ? 'active' : ''}>
          + Porosi e Re
        </NavLink>
        <NavLink to="/close-day" className={({ isActive }) => isActive ? 'active' : ''}>
          Mbyll Diten
        </NavLink>
        {user.role === 'admin' && (
          <>
            <NavLink to="/menu" className={({ isActive }) => isActive ? 'active' : ''}>
              Menuja
            </NavLink>
            <NavLink to="/rooms" className={({ isActive }) => isActive ? 'active' : ''}>
              Sallat & Tavolinat
            </NavLink>
            <NavLink to="/reports" className={({ isActive }) => isActive ? 'active' : ''}>
              Raportet
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''}>
              Cilesimet
            </NavLink>
          </>
        )}
      </nav>
      <div className="sidebar-footer">
        <button onClick={onLogout}>Dil</button>
      </div>
    </div>
  );
}
