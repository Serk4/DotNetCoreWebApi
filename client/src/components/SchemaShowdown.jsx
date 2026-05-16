import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { toastSuccess, toastError } from '../toast';

const API_BASE = process.env.REACT_APP_API_BASE || '';

export default function SchemaShowdown() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mermaidContainerRef = useRef(null);
  const lastSvgRef = useRef(null); // store last rendered SVG markup

  // Fetch metrics + mermaid text
  const runShowdown = async () => {
    setLoading(true);
    setError(null);
    setMetrics(null);
    lastSvgRef.current = null;
    if (mermaidContainerRef.current) mermaidContainerRef.current.innerHTML = '';

    try {
      const res = await fetch(`${API_BASE}/api/diag/showdown`);
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`API error ${res.status}: ${res.statusText}${txt ? ' — ' + txt.slice(0, 500) : ''}`);
      }
      const data = await res.json().catch((e) => {
        throw new Error('Failed to parse JSON from server: ' + e?.message);
      });
      setMetrics(data);
      toastSuccess('Showdown completed! Check results below.', { toastId: 'showdown-success', autoClose: 3000 });
    } catch (e) {
      const errMsg = (e && e.message) ? e.message : 'Failed to run showdown';
      setError(errMsg);
      console.error('SchemaShowdown runShowdown error:', e);
      toastError(errMsg, { toastId: 'showdown-error', autoClose: 5000 });
    } finally {
      setLoading(false);
    }
  };

  // Render mermaid to SVG when metrics arrive
  useEffect(() => {
    if (!metrics?.mermaidDiagram || !mermaidContainerRef.current) return;

    // initialize mermaid once (idempotent)
    try {
      mermaid.initialize({ startOnLoad: false, theme: 'default' });
    } catch { /* ignore if already initialized */ }

    const id = 'mermaid-' + Math.random().toString(36).slice(2, 9);

    // mermaidAPI.render accepts a callback in many versions; we support both sync and promise shapes.
    try {
      // Some mermaid versions expose mermaid.mermaidAPI.render returning a string or using callback.
      const renderResult = mermaid.mermaidAPI.render(id, metrics.mermaidDiagram, (svgCode) => {
        lastSvgRef.current = svgCode;
        if (mermaidContainerRef.current) mermaidContainerRef.current.innerHTML = svgCode;
      });

      // If render returned a string (older/newer API), use it.
      if (typeof renderResult === 'string') {
        lastSvgRef.current = renderResult;
        if (mermaidContainerRef.current) mermaidContainerRef.current.innerHTML = renderResult;
      } else if (renderResult?.then) {
        // promise-based API
        renderResult.then((res) => {
          const svg = res?.svg || res;
          lastSvgRef.current = svg;
          if (mermaidContainerRef.current) mermaidContainerRef.current.innerHTML = svg;
        }).catch(err => {
          console.warn('Mermaid async render failure', err);
        });
      }
    } catch (err) {
      console.warn('Mermaid render failed, will show raw diagram text.', err);
    }
  }, [metrics]);

  // Download helpers
  const downloadSvg = () => {
    const svg = lastSvgRef.current;
    if (!svg) {
      setError('No rendered SVG available to download. Render the diagram first.');
      return;
    }
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram.svg';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const downloadPng = async () => {
    const svg = lastSvgRef.current;
    if (!svg) {
      setError('No rendered SVG available to convert. Render the diagram first.');
      return;
    }

    try {
      // Ensure the SVG has an XML namespace (needed when converting to data URL)
      const svgWithNs = svg.includes('xmlns') ? svg : svg.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');

      // Create an Image from SVG
      const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgWithNs);
      const img = new Image();
      // Avoid tainting canvas by ensuring no external resources are referenced in the svg.
      img.crossOrigin = 'anonymous';

      await new Promise((resolve, reject) => {
        img.onload = () => resolve(null);
        img.onerror = (e) => reject(new Error('Failed to load SVG data as image: ' + String(e)));
        img.src = svgUrl;
      });

      // Draw to canvas and export PNG
      const canvas = document.createElement('canvas');
      // Try to detect svg dimension from viewBox or width/height attributes
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgWithNs, 'image/svg+xml');
      let width = 800, height = 600;
      const svgEl = doc.querySelector('svg');
      if (svgEl) {
        const vb = svgEl.getAttribute('viewBox');
        if (vb) {
          const parts = vb.split(/\s+/).map(Number);
          if (parts.length === 4 && parts.every(n => !Number.isNaN(n))) {
            width = parts[2];
            height = parts[3];
          }
        } else {
          const w = parseInt(svgEl.getAttribute('width') || '', 10);
          const h = parseInt(svgEl.getAttribute('height') || '', 10);
          if (!Number.isNaN(w)) width = w;
          if (!Number.isNaN(h)) height = h;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      // fill white background for PNG (optional)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(await (async () => img)(), 0, 0, canvas.width, canvas.height);

      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = 'diagram.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error('Failed to convert SVG to PNG', e);
      setError('Failed to convert diagram to PNG: ' + (e && e.message ? e.message : String(e)));
    }
  };

  // Compact table rendering
  const renderTable = (m) => {
    const opt = m?.optimized;
    const nai = m?.naive;
    if (!opt && !nai) return null;

    const rows = [
      { label: 'Queries', good: opt?.queryCount, bad: nai?.queryCount },
      { label: 'Process Links', good: opt?.processLinks, bad: nai?.processLinks },
      { label: 'Workflows', good: opt?.workflowCount, bad: nai?.workflowCount }
    ];

    const maxQuery = Math.max(opt?.queryCount ?? 0, nai?.queryCount ?? 0, 1);
    const maxLinks = Math.max(opt?.processLinks ?? 0, nai?.processLinks ?? 0, 1);

    const bar = (value, max, color) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 180, height: 14, background: '#eee', borderRadius: 6 }}>
          <div style={{
            width: `${Math.round((value ?? 0) / max * 100)}%`,
            height: '100%',
            background: color,
            borderRadius: 6
          }} />
        </div>
        <div style={{ width: 44, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{value ?? '—'}</div>
      </div>
    );

    return (
      <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: 12 }}>
        <thead>
          <tr style={{ background: '#f8f9fa' }}>
            <th style={{ textAlign: 'left', padding: 8 }}>Metric</th>
            <th style={{ textAlign: 'left', padding: 8, color: 'green' }}>Normalized</th>
            <th style={{ textAlign: 'left', padding: 8, color: 'red' }}>Legacy</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.label}>
              <td style={{ padding: 8 }}>{r.label}</td>
              <td style={{ padding: 8 }}>
                {r.label === 'Queries' ? bar(r.good, maxQuery, '#2E7D32') :
                  r.label === 'Process Links' ? bar(r.good, maxLinks, '#1B5E20') :
                  String(r.good ?? '—')}
              </td>
              <td style={{ padding: 8 }}>
                {r.label === 'Queries' ? bar(r.bad, maxQuery, '#C62828') :
                  r.label === 'Process Links' ? bar(r.bad, maxLinks, '#B71C1C') :
                  String(r.bad ?? '—')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div style={{ marginTop: 20, padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
      <h4>Showdown: Optimized vs Naive</h4>
      <p style={{ marginTop: 0 }}>
        Click to run a demo comparing single-query (normalized) versus many small queries (legacy).
      </p>

      <div style={{ marginTop: 8 }}>
        <button onClick={runShowdown} disabled={loading} style={{ padding: '8px 12px' }}>
          {loading ? 'Running…' : 'Run Showdown'}
        </button>
        {metrics && lastSvgRef.current && (
          <>
            <button onClick={downloadSvg} style={{ marginLeft: 8, padding: '8px 12px' }}>
              Download SVG
            </button>
            <button onClick={downloadPng} style={{ marginLeft: 8, padding: '8px 12px' }}>
              Download PNG
            </button>
          </>
        )}
      </div>

      {error && <div style={{ marginTop: 12, color: '#c62828' }}>{error}</div>}

      {metrics && (
        <div style={{ marginTop: 12 }}>
          <h5 style={{ marginBottom: 8 }}>Results</h5>

          {renderTable(metrics)}

          <div style={{ marginTop: 12 }}>
            <strong>Mermaid diagram</strong>
            <div style={{ marginTop: 8 }}>
              <div ref={mermaidContainerRef} />
              {/* If rendering failed, show raw source as fallback */}
              {!lastSvgRef.current && (
                <pre style={{ whiteSpace: 'pre-wrap', background: '#fafafa', padding: 12, borderRadius: 6 }}>
                  {metrics.mermaidDiagram ?? 'No diagram returned.'}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}