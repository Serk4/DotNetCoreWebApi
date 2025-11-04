import React, { useEffect, useState, useRef } from 'react';
import mermaid from 'mermaid';
import './SchemaShowcase.css';
import SchemaShowdown from './SchemaShowdown';

export default function SchemaShowcase() {
    const [diagrams, setDiagrams] = useState({ legacy: '', normalized: '' });
    const [metrics, setMetrics] = useState(null);
    const [step, setStep] = useState(0);
    const [autoplay, setAutoplay] = useState(false);
    const [intervalMs, setIntervalMs] = useState(1500);
    const [loop, setLoop] = useState(true);

    // independent hover/selection state for each panel
    const [hoveredBad, setHoveredBad] = useState(null);
    const [selectedBad, setSelectedBad] = useState(null);
    const [hoveredGood, setHoveredGood] = useState(null);
    const [selectedGood, setSelectedGood] = useState(null);

    const legacyRef = useRef(null);
    const normRef = useRef(null);

    const PROCESSES = ['Extraction', 'Amplification', 'Quantification'];
    const MAX_STEP = PROCESSES.length - 1;

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
            if (typeof mermaid.contentLoaded === 'function') mermaid.contentLoaded();
        }
        if (diagrams.normalized && normRef.current) {
            normRef.current.innerHTML = `<div class="mermaid">${diagrams.normalized}</div>`;
            if (typeof mermaid.contentLoaded === 'function') mermaid.contentLoaded();
        }
    }, [diagrams]);

    // Auto-advance
    useEffect(() => {
        if (!autoplay) return undefined;
        const id = setInterval(() => {
            setStep(prev => {
                if (prev < MAX_STEP) return prev + 1;
                if (loop) return 0;
                setAutoplay(false);
                return prev;
            });
        }, Math.max(250, Number(intervalMs) || 1500));
        return () => clearInterval(id);
    }, [autoplay, intervalMs, loop, MAX_STEP]);

    const nextStep = () => setStep((prev) => Math.min(prev + 1, MAX_STEP));
    const prevStep = () => setStep((prev) => Math.max(prev - 1, 0));
    const reset = () => {
        setStep(0);
        setSelectedBad(null);
        setHoveredBad(null);
        setSelectedGood(null);
        setHoveredGood(null);
    };

    // Icon primitives
    const IconTable = ({ title = 'Table' }) => (
        <svg className="icon-svg" viewBox="0 0 24 24" role="img" aria-label={title}>
            <rect x="2" y="4" width="20" height="16" rx="2" ry="2" fill="#fff" stroke="currentColor" strokeWidth="1.2" />
            <line x1="2" y1="10" x2="22" y2="10" stroke="currentColor" strokeWidth="1" />
            <line x1="2" y1="16" x2="22" y2="16" stroke="currentColor" strokeWidth="1" />
        </svg>
    );
    const IconVial = ({ title = 'Specimen' }) => (
        <svg className="icon-svg" viewBox="0 0 24 24" role="img" aria-label={title}>
            <rect x="9" y="3" width="6" height="4" rx="1" fill="currentColor" />
            <rect x="7.5" y="7" width="9" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="12" cy="17" r="2" fill="currentColor" opacity="0.12" />
        </svg>
    );
    const IconPipette = ({ title = 'Pipette' }) => (
        <svg className="icon-svg" viewBox="0 0 24 24" role="img" aria-label={title}>
            <path d="M3 21c0-1.1.9-2 2-2l4-4 8-8 2 2-8 8-4 4c-1.1 1.1-3 1.1-4.9 0L3 21z" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="17" cy="7" r="1.2" fill="currentColor" />
        </svg>
    );

    const IconItem = ({ Icon, label, small = false }) => (
        <div className={`icon ${small ? 'small-inline' : ''}`} aria-hidden>
            <Icon title={label} />
            <div className="icon-label">{label}</div>
        </div>
    );

    // Bad panel renderer (unchanged)
    const renderBadIcons = (prefix, isDuplicate = false) => (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <IconItem Icon={IconTable} label={`${prefix} (Worksheets)`} />
            <IconItem Icon={IconVial} label={`${prefix}Specimen`} />
            <IconItem Icon={IconPipette} label={`${prefix}Pipette`} />
            {isDuplicate && (
                <div className="dupe-note" role="status" aria-live="polite">
                    Duplicated!
                </div>
            )}
        </div>
    );

    // Good panel: simplified independent rendering
    const visibleRefProcesses = PROCESSES.slice(0, Math.min(step + 1, PROCESSES.length));
    const badSilos = ['Extraction'];
    if (step >= 1) badSilos.push('Amplification');
    if (step >= 2) badSilos.push('Quantification');

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ gridColumn: '1 / span 2' }}><h3>Interactive Demo</h3></div>

            <div><h4>Legacy (Worked, but not scalable)</h4><div ref={legacyRef} /></div>
            <div><h4>Normalized (Scalable)</h4><div ref={normRef} /></div>

            <div style={{ gridColumn: '1 / span 2' }}>
                <div className="controls" style={{ marginBottom: 8 }}>
                    <button onClick={prevStep}>◀</button>
                    <button onClick={nextStep} style={{ marginLeft: 6 }}>▶ Add Process</button>
                    <button onClick={reset} style={{ marginLeft: 8 }}>Reset</button>

                    <button onClick={() => setAutoplay(a => !a)} style={{ marginLeft: 12 }}>{autoplay ? 'Pause Auto' : 'Auto Play'}</button>

                    <label style={{ marginLeft: 12 }}>
                        Interval(ms):
                        <input type="number" value={intervalMs} onChange={e => setIntervalMs(Number(e.target.value))} style={{ width: 100, marginLeft: 6 }} min={250} />
                    </label>

                    <label style={{ marginLeft: 12 }}>
                        <input type="checkbox" checked={loop} onChange={e => setLoop(e.target.checked)} />
                        <span style={{ marginLeft: 6 }}>Loop</span>
                    </label>
                </div>

                <div className="animation-demo" style={{ marginTop: 8 }}>
                    <h4>Schema Animation: Add a New Process</h4>
                    <div className="panels">
                        {/* Bad panel (vertical silo rows) */}
                        <div className="panel bad">
                            <h5>Bad: Siloed Copy-Paste</h5>
                            <div className="silo-rows">
                                {badSilos.map((s, i) => (
                                    <div
                                        key={s}
                                        className={`silo-row ${i > 0 ? 'duplicate visible' : ''} ${hoveredBad === s || selectedBad === s ? 'highlight' : ''}`}
                                        onMouseEnter={() => setHoveredBad(s)}
                                        onMouseLeave={() => setHoveredBad(null)}
                                        onClick={() => setSelectedBad(selectedBad === s ? null : s)}
                                    >
                                        {renderBadIcons(s, i > 0)}
                                        <div className={i === 0 ? 'silo-note silo-warning' : 'silo-note'}>
                                            {i === 0 ? (
                                                <>
                                                    <span className="warning-icon" aria-hidden>⚠️</span>
                                                    <span className="warning-text">All supporting tables must be duplicated for each silo!</span>
                                                </>
                                            ) : 'Copied & Renamed'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Good panel: grouped center row for Worksheets, WorksheetSpecimen, Pipettes */}
                        <div className="panel good">
                            <h5>Good: Normalized Reuse</h5>
                            <div className="silo-area">
                                {/* Top row */}
                                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', width: '100%' }}>
                                    {/* DnaProcess ref list with IconTable and caption */}
                                    <div className="ref" style={{ minWidth: 220 }}>
                                        <div className="table reftable" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 12 }}>
                                            <IconTable title="DnaProcess (ref table)" />
                                            <div style={{ marginTop: 8, fontWeight: 600 }}>DnaProcess (ref table)</div>

                                            <div style={{ marginTop: 10, width: '100%' }}>
                                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                                    {visibleRefProcesses.map((p) => (
                                                        <li key={p} style={{ padding: '2px 0', fontWeight: 400 }}>
                                                            {p}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div style={{ marginTop: 6, fontSize: 12 }} className="silo-note">Add a row for new process</div>
                                        </div>
                                    </div>

                                    {/* Grouped center block: Worksheets | WorksheetSpecimen | Pipettes */}
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', justifyContent: 'center', width: '100%' }}>
                                            {/* Worksheets */}
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 12, minWidth: 140 }}>
                                                <IconTable title="Worksheets" />
                                                <div style={{ marginTop: 8, fontWeight: 600 }}>Worksheets</div>
                                                <div style={{ marginTop: 6, fontSize: 12 }} className="muted">(FK to DnaProcess)</div>
                                            </div>

                                            {/* WorksheetSpecimen uses vial icon */}
                                            <div
                                                className="silo shared"
                                                onMouseEnter={() => setHoveredGood('WorksheetSpecimen')}
                                                onMouseLeave={() => setHoveredGood(null)}
                                                onClick={() => setSelectedGood(selectedGood === 'WorksheetSpecimen' ? null : 'WorksheetSpecimen')}
                                                role="button"
                                                tabIndex={0}
                                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 12, minWidth: 140 }}
                                            >
                                                <IconVial title="WorksheetSpecimen" />
                                                <div style={{ marginTop: 8, fontWeight: 600 }}>WorksheetSpecimen</div>
                                                <div style={{ marginTop: 6, fontSize: 12 }} className="muted">(FK to Worksheets)</div>
                                            </div>

                                            {/* Pipettes uses pipette icon */}
                                            <div
                                                className="silo shared"
                                                onMouseEnter={() => setHoveredGood('Pipettes')}
                                                onMouseLeave={() => setHoveredGood(null)}
                                                onClick={() => setSelectedGood(selectedGood === 'Pipettes' ? null : 'Pipettes')}
                                                role="button"
                                                tabIndex={0}
                                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 12, minWidth: 140 }}
                                            >
                                                <IconPipette title="Pipettes" />
                                                <div style={{ marginTop: 8, fontWeight: 600 }}>Pipettes</div>
                                                <div style={{ marginTop: 6, fontSize: 12 }} className="muted">(FK to Worksheets)</div>
                                            </div>
                                        </div>

                                        {/* Centered note applying to the three grouped tables */}
                                        <div style={{ marginTop: 8, textAlign: 'center', width: '100%' }} className="silo-note">
                                            <span style={{ fontSize: 12 }}>No copy-paste; reuse core tables</span>
                                        </div>
                                    </div>
                                </div>

                                {/* second row: props tables for visible processes */}
                                <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                    {visibleRefProcesses.map((p) => (
                                        <div
                                            key={p}
                                            className={`silo process-specific visible ${hoveredGood === p || selectedGood === p ? 'highlight' : ''}`}
                                            onMouseEnter={() => setHoveredGood(p)}
                                            onMouseLeave={() => setHoveredGood(null)}
                                            onClick={() => setSelectedGood(selectedGood === p ? null : p)}
                                            role="button"
                                            tabIndex={0}
                                        >
                                            <div className="table small" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                                <IconTable title={`${p}Props`} />
                                                <div style={{ marginTop: 4, fontSize: '0.9rem' }}>{p}Props<br /><small className="muted">(1 new table)</small></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <SchemaShowdown />
        </div>
    );
}