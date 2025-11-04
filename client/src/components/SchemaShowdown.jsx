import React, { useState } from 'react';
import { toastSuccess, toastError } from '../toast';

export default function SchemaShowdown() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);

  async function runShowdown() {
    setLoading(true);
    setMetrics(null);
    try {
      const res = await fetch('/api/diag/showdown');
      const data = await res.json();
      setMetrics(data);
      toastSuccess('Showdown completed');
    } catch (e) {
      setMetrics({ error: 'Failed to run showdown' });
      toastError('Failed to run showdown');
      // eslint-disable-next-line no-console
      console.error('Showdown error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function safeDelete() {
    const id = parseInt((prompt('Workflow id to delete (demo):', '1') || '').trim(), 10);
    if (!id) return;
    try {
      const resp = await fetch(`/api/diag/workflow/${id}`, { method: 'DELETE' });
      if (resp.status === 204) {
        toastSuccess('Deleted (safe delete).');
      } else {
        toastError('Delete failed: ' + resp.status);
      }
    } catch (e) {
      toastError('Delete failed');
      // eslint-disable-next-line no-console
      console.error('Delete error:', e);
    }
  }

  return (
    <div style={{ gridColumn: '1 / span 2', marginTop: 8 }}>
      <h4>Run Showdown</h4>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button onClick={runShowdown} disabled={loading}>
          {loading ? 'Running…' : 'Run Showdown (optimized vs naive)'}
        </button>
        <button onClick={safeDelete}>Safe Delete Workflow</button>
      </div>

      {metrics && (
        <div style={{ marginTop: 12 }}>
          <h5>Showdown Results</h5>
          <pre style={{ maxHeight: 300, overflow: 'auto', background: '#f8f9fa', padding: 8, borderRadius: 6 }}>
            {JSON.stringify(metrics, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}