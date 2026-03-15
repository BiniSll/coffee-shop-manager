import React, { useState, useEffect } from 'react';
import { ipc } from '../ipc';
import { User } from '../App';

interface Props {
  onLogin: (user: User) => void;
}

export default function LoginPage({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [caffeName, setCaffeName] = useState<string | null>(null);

  useEffect(() => {
    ipc.getSetting('logo').then((val: string | null) => setLogo(val));
    ipc.getSetting('caffe_name').then((val: string | null) => setCaffeName(val));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const user = await ipc.login(username, password);
    if (user) {
      onLogin(user);
    } else {
      setError('Emri ose fjalekalimi nuk eshte i sakte');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {logo && (
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <img src={logo} alt="Logo" style={{ maxWidth: 160, maxHeight: 100, objectFit: 'contain' }} />
          </div>
        )}
        <h1>{caffeName || 'Kafeteri'}</h1>
        <p>Kyqu per te menaxhuar kafeterin</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Perdoruesi</label>
            <input value={username} onChange={e => setUsername(e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label>Fjalekalimi</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-block btn-lg" type="submit">Kyqu</button>
        </form>
        <p style={{ marginTop: 16, fontSize: 12 }}>Default: admin/admin ose staff/staff</p>
      </div>
    </div>
  );
}
