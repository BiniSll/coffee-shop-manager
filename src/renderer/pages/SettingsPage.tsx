import React, { useState, useEffect, useRef } from 'react';
import { ipc } from '../ipc';

export default function SettingsPage() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [done, setDone] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const [caffeName, setCaffeName] = useState('');
  const [caffeNameSaved, setCaffeNameSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [appVersion, setAppVersion] = useState('');
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'not-available' | 'error'>('idle');

  useEffect(() => {
    ipc.getSetting('logo').then((val: string | null) => setLogo(val));
    ipc.getSetting('caffe_name').then((val: string | null) => setCaffeName(val || ''));
    ipc.getAppVersion().then((v: string) => setAppVersion(v));
  }, []);

  useEffect(() => {
    const unsub = [
      ipc.onUpdaterEvent('updater:checking', () => setUpdateStatus('checking')),
      ipc.onUpdaterEvent('updater:available', () => setUpdateStatus('available')),
      ipc.onUpdaterEvent('updater:not-available', () => setUpdateStatus('not-available')),
      ipc.onUpdaterEvent('updater:downloaded', () => setUpdateStatus('idle')),
      ipc.onUpdaterEvent('updater:error', () => setUpdateStatus('error')),
    ];
    return () => unsub.forEach(fn => fn());
  }, []);

  const handleCheckUpdates = async () => {
    setUpdateStatus('checking');
    await ipc.checkForUpdates();
  };

  const handleSaveName = async () => {
    if (caffeName.trim()) {
      await ipc.setSetting('caffe_name', caffeName.trim());
    } else {
      await ipc.deleteSetting('caffe_name');
    }
    setCaffeNameSaved(true);
    setTimeout(() => setCaffeNameSaved(false), 2000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('Zgjidh nje imazh (PNG, JPG, etc.)');
    if (file.size > 2 * 1024 * 1024) return alert('Imazhi duhet te jete me i vogel se 2MB');
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      await ipc.setSetting('logo', base64);
      setLogo(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = async () => {
    await ipc.deleteSetting('logo');
    setLogo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReset = async () => {
    if (confirmText !== 'FSHI') return;
    await ipc.resetAll();
    setShowConfirm(false);
    setConfirmText('');
    setDone(true);
  };

  return (
    <div>
      <div className="page-header">
        <h2>Cilesimet</h2>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12, color: '#5d4037' }}>Emri i Kafeterise</h3>
        <p style={{ marginBottom: 16, color: '#8d6e63', fontSize: 14 }}>
          Vendos emrin e kafeterise qe do te shfaqet ne ekranin e hyrjes, sidebar, dhe ne permbledhjen e porosive.
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            value={caffeName}
            onChange={e => { setCaffeName(e.target.value); setCaffeNameSaved(false); }}
            placeholder="p.sh. Kafeteri Mbreti"
            style={{ flex: 1, padding: '12px 14px', border: '1px solid #d7ccc8', borderRadius: 6, fontSize: 15, background: '#fafafa' }}
          />
          <button className="btn btn-primary btn-lg" onClick={handleSaveName}>
            Ruaj
          </button>
        </div>
        {caffeNameSaved && (
          <p style={{ color: '#2e7d32', fontSize: 13, marginTop: 8 }}>Emri u ruajt me sukses!</p>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12, color: '#5d4037' }}>Logo e Kafeterise</h3>
        <p style={{ marginBottom: 16, color: '#8d6e63', fontSize: 14 }}>
          Ngarko logon qe do te shfaqet ne ekranin e hyrjes, sidebar, dhe ne permbledhjen e porosive.
        </p>
        {logo && (
          <div style={{ marginBottom: 16, textAlign: 'center' }}>
            <img src={logo} alt="Logo" style={{ maxWidth: 180, maxHeight: 120, objectFit: 'contain', borderRadius: 8, border: '1px solid #efebe9' }} />
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            style={{ display: 'none' }}
          />
          <button className="btn btn-primary btn-lg" onClick={() => fileInputRef.current?.click()}>
            {logo ? 'Ndrysho Logon' : 'Ngarko Logo'}
          </button>
          {logo && (
            <button className="btn btn-secondary btn-lg" onClick={handleRemoveLogo}>
              Hiq Logon
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12, color: '#5d4037' }}>Perditesimet</h3>
        <p style={{ marginBottom: 16, color: '#8d6e63', fontSize: 14 }}>
          Versioni aktual: <strong>{appVersion || '...'}</strong>
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={handleCheckUpdates}
            disabled={updateStatus === 'checking'}
          >
            {updateStatus === 'checking' ? 'Duke kontrolluar...' : 'Kontrollo per Perditesime'}
          </button>
          {updateStatus === 'available' && (
            <span style={{ color: '#1565c0', fontWeight: 600 }}>Versioni i ri eshte i disponueshem! Shiko njoftimin lart.</span>
          )}
          {updateStatus === 'not-available' && (
            <span style={{ color: '#2e7d32', fontWeight: 600 }}>Keni versionin me te ri!</span>
          )}
          {updateStatus === 'error' && (
            <span style={{ color: '#c62828' }}>Gabim gjate kontrollit. Kontrolloni lidhjen me internetin.</span>
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12, color: '#c62828' }}>Fshi te gjitha te dhenat</h3>
        <p style={{ marginBottom: 16, color: '#5d4037' }}>
          Kjo do te fshij te gjitha porosite, menune, sallat, tavolinat, elementet dhe raportet. Vetem perdoruesit do te ruhen.
        </p>
        {done ? (
          <p style={{ color: '#2e7d32', fontWeight: 'bold' }}>Te gjitha te dhenat u fshine me sukses. Rinisni aplikacionin.</p>
        ) : (
          <button className="btn btn-danger btn-lg" onClick={() => setShowConfirm(true)}>
            Fshi te Gjitha te Dhenat
          </button>
        )}
      </div>

      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#c62828' }}>Konfirmo Fshirjen</h3>
            <p style={{ marginBottom: 16 }}>
              Kjo veprim nuk mund te kthehet mbrapsht. Te gjitha te dhenat do te humbasin perfundimisht.
            </p>
            <div className="form-group">
              <label>Shkruaj <strong>FSHI</strong> per te konfirmuar</label>
              <input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="FSHI"
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary btn-lg" onClick={() => { setShowConfirm(false); setConfirmText(''); }}>
                Anulo
              </button>
              <button
                className="btn btn-danger btn-lg"
                onClick={handleReset}
                disabled={confirmText !== 'FSHI'}
                style={{ opacity: confirmText !== 'FSHI' ? 0.5 : 1 }}
              >
                Fshi Perfundimisht
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
