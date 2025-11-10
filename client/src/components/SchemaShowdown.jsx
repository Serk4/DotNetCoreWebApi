import React, { useState } from 'react';
import { toastSuccess, toastError } from '../toast';

const API_BASE = process.env.REACT_APP_API_BASE || ''; // ← uses client/.env.development

export default function SchemaShowdown() {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const runShowdown = async () => {
        setLoading(true);
        setError(null);
        setMetrics(null);
        try {
            const res = await fetch(`${API_BASE}/api/diag/showdown`);
            const text = await res.text();
            if (!res.ok) {
                const excerpt = text ? ` Response body: ${text.slice(0, 1000)}` : '';
                throw new Error(`API error: ${res.status} ${res.statusText}.${excerpt}`);
            }
            let data = null;
            try {
                data = text ? JSON.parse(text) : null;
            } catch (parseErr) {
                const snippet = text ? text.slice(0, 1000) : '';
                throw new Error(`Invalid JSON response from server. Response body (truncated): ${snippet}`);
            }
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

    // Helper to render the common optimized vs naive breakdown returned by DiagController
    const renderOptimizedVsNaive = (m) => {
        const opt = m?.optimized;
        const nai = m?.naive;

        if (!opt && !nai) return null;

        const rows = [
            { label: 'Duration (ms)', good: opt?.durationMs, bad: nai?.durationMs },
            { label: 'Workflow Count', good: opt?.workflowCount, bad: nai?.workflowCount },
            { label: 'Process Links', good: opt?.processLinks, bad: nai?.processLinks }
        ];

        return (
            <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: 8 }}>
                <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                        <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>Metric</th>
                        <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left', color: 'green' }}>Normalized (Good)</th>
                        <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left', color: 'red' }}>Legacy (Bad)</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(r => (
                        <tr key={r.label}>
                            <td style={{ border: '1px solid #ddd', padding: 8 }}>{r.label}</td>
                            <td style={{ border: '1px solid #ddd', padding: 8 }}>{r.good ?? 'N/A'}</td>
                            <td style={{ border: '1px solid #ddd', padding: 8 }}>{r.bad ?? 'N/A'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    return (
        <div className="showdown-section" style={{ marginTop: 20, padding: '16px', border: '1px solid #ddd', borderRadius: 8 }}>
            <h4>Showdown: Optimized vs. Naive Queries</h4>
            <p>Click to compare single-query (normalized) vs. multi-roundtrip (legacy) performance on sample data.</p>
            <button onClick={runShowdown} disabled={loading}>
                {loading ? 'Running...' : 'Run Showdown'}
            </button>
            {error && (
                <div style={{ marginTop: 8, color: 'red', fontSize: '0.9em' }}>
                    {error}
                </div>
            )}
            {metrics && (
                <div style={{ marginTop: 12 }}>
                    <h5>Results</h5>

                    {/* Preferred structured rendering for the object returned by DiagController */}
                    { (metrics.optimized || metrics.naive) ? (
                        renderOptimizedVsNaive(metrics)
                    ) : (
                        // fallback: render generic key/value pairs if different shape
                        <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: 8 }}>
                            <thead>
                                <tr style={{ background: '#f8f9fa' }}>
                                    <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>Metric</th>
                                    <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(metrics).map(([k, v]) => (
                                    <tr key={k}>
                                        <td style={{ border: '1px solid #ddd', padding: 8 }}>{k}</td>
                                        <td style={{ border: '1px solid #ddd', padding: 8 }}>
                                            {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    <p style={{ fontSize: '0.9em', marginTop: 8, fontStyle: 'italic' }}>
                        Tip: Normalized schema wins with efficient single queries (includes/projections)—legacy requires N+1 round-trips per process, exploding at scale.
                    </p>
                </div>
            )}
        </div>
    );
}