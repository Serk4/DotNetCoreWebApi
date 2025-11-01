import React, { useEffect, useState, useRef } from 'react';
import mermaid from 'mermaid';

export default function SchemaShowcase() {
    const [diagrams, setDiagrams] = useState({ legacy: '', normalized: '' });
    const [metrics, setMetrics] = useState(null);
    const legacyRef = useRef(null);
    const normRef = useRef(null);

    useEffect(() => {
        mermaid.initialize({ startOnLoad: false });
        fetch('/api/diag/mermaid')
            .then(r => r.json())
            .then(d => setDiagrams(d))
            .catch(() => setDiagrams({ legacy: '', normalized: '' }));
    }, []);

    useEffect(() => {
        if (diagrams.legacy && legacyRef.current) {
            legacyRef.current.innerHTML = `<div class="mermaid">${diagrams.legacy}</div>`;
            mermaid.init(undefined, legacyRef.current);
        }
        if (diagrams.normalized && normRef.current) {
            normRef.current.innerHTML = `<div class="mermaid">${diagrams.normalized}</div>`;
            mermaid.init(undefined, normRef.current);
        }
    }, [diagrams]);

    async function runShowdown() {
        try {
            const res = await fetch('/api/diag/showdown');
            const data = await res.json();
            setMetrics(data);
        } catch (e) {
            setMetrics({ error: 'Failed to run showdown' });
        }
    }

    async function safeDelete() {
        const id = parseInt(prompt('Workflow id to delete (demo):', '1'), 10);
        if (!id) return;
        const resp = await fetch(`/api/diag/workflow/${id}`, { method: 'DELETE' });
        if (resp.status === 204) alert('Deleted (safe delete).');
        else alert('Delete failed: ' + resp.status);
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
                <h3>Legacy (Worked, but not scalable)</h3>
                <div ref={legacyRef} />
            </div>
            <div>
                <h3>Normalized (Scalable)</h3>
                <div ref={normRef} />
            </div>

            <div style={{ gridColumn: '1 / span 2' }}>
                <h3>Interactive Demo</h3>
                <button onClick={runShowdown}>Run Showdown (optimized vs naive)</button>
                <button onClick={safeDelete} style={{ marginLeft: 8 }}>Safe Delete Workflow</button>

                {metrics && (
                    <div style={{ marginTop: 12 }}>
                        <h4>Showdown Results</h4>
                        <pre>{JSON.stringify(metrics, null, 2)}</pre>
                    </div>
                )}

                <p style={{ marginTop: 8 }}>
                    Tip: Use the showdown to demonstrate how a single query (includes/projection) beats many round-trips.
                </p>
            </div>
        </div>
    );
}