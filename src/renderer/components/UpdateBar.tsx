import React, { useState, useEffect } from 'react';
import { ipc } from '../ipc';

type UpdateState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available'; version: string }
  | { status: 'downloading'; percent: number }
  | { status: 'downloaded'; version: string }
  | { status: 'error'; message: string };

export default function UpdateBar() {
  const [state, setState] = useState<UpdateState>({ status: 'idle' });

  useEffect(() => {
    const unsub = [
      ipc.onUpdaterEvent('updater:checking', () =>
        setState({ status: 'checking' })),
      ipc.onUpdaterEvent('updater:available', (info: any) =>
        setState({ status: 'available', version: info?.version ?? '' })),
      ipc.onUpdaterEvent('updater:not-available', () =>
        setState({ status: 'idle' })),
      ipc.onUpdaterEvent('updater:progress', (progress: any) =>
        setState({ status: 'downloading', percent: Math.round(progress?.percent ?? 0) })),
      ipc.onUpdaterEvent('updater:downloaded', (info: any) =>
        setState({ status: 'downloaded', version: info?.version ?? '' })),
      ipc.onUpdaterEvent('updater:error', (message: string) =>
        setState({ status: 'error', message })),
    ];
    return () => unsub.forEach(fn => fn());
  }, []);

  if (state.status === 'idle' || state.status === 'checking') return null;

  const barStyle: React.CSSProperties = {
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    fontSize: 14,
    fontWeight: 500,
    flexShrink: 0,
  };

  if (state.status === 'available') {
    return (
      <div style={{ ...barStyle, background: '#1565c0', color: '#fff' }}>
        <span>Versioni i ri {state.version} eshte i disponueshem!</span>
        <button
          className="btn btn-sm"
          style={{ background: '#fff', color: '#1565c0', fontWeight: 700, padding: '4px 14px' }}
          onClick={() => ipc.downloadUpdate()}
        >
          Shkarko
        </button>
        <button
          style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#90caf9', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
          onClick={() => setState({ status: 'idle' })}
        >
          ✕
        </button>
      </div>
    );
  }

  if (state.status === 'downloading') {
    return (
      <div style={{ ...barStyle, background: '#1565c0', color: '#fff', flexDirection: 'column', alignItems: 'stretch', padding: '8px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span>Duke shkarkuar perditesimin... {state.percent}%</span>
        </div>
        <div style={{ background: '#0d47a1', borderRadius: 4, height: 6 }}>
          <div style={{ background: '#90caf9', borderRadius: 4, height: 6, width: `${state.percent}%`, transition: 'width 0.3s' }} />
        </div>
      </div>
    );
  }

  if (state.status === 'downloaded') {
    return (
      <div style={{ ...barStyle, background: '#2e7d32', color: '#fff' }}>
        <span>Versioni {state.version} eshte shkarkuar dhe gati per instalim.</span>
        <button
          className="btn btn-sm"
          style={{ background: '#fff', color: '#2e7d32', fontWeight: 700, padding: '4px 14px' }}
          onClick={() => ipc.installUpdate()}
        >
          Rinisni &amp; Instaloni
        </button>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div style={{ ...barStyle, background: '#b71c1c', color: '#fff' }}>
        <span>Gabim gjate kontrollit per perditesime: {state.message}</span>
        <button
          style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#ef9a9a', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
          onClick={() => setState({ status: 'idle' })}
        >
          ✕
        </button>
      </div>
    );
  }

  return null;
}
