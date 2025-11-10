import React, { useEffect, useState, useRef, useCallback } from 'react';
import mermaid from 'mermaid';
import './SchemaShowcase.css';

/* Keep PROCESSES and MAX_STEP stable across renders so they don't force
   nextStep to change when linting dependency lists are checked. */
const PROCESSES = ['Extraction', 'Amplification', 'Quantification'];
const MAX_STEP = PROCESSES.length; // 3 processes -> steps 0..3 (step 3 = show validations)

/* Timing: validation stagger ends at 3000ms (last setTimeout). Add buffer
   so loop reset doesn't jump before final animations complete. */
const VALIDATION_LAST_MS = 3000;
const VALIDATION_BUFFER_MS = 1200;
const RESET_WAIT_MS = VALIDATION_LAST_MS + VALIDATION_BUFFER_MS; // 4200ms

export default function SchemaShowcase() {
    const [diagrams, setDiagrams] = useState({ legacy: '', normalized: '' });
    const [step, setStep] = useState(0);
    const [autoplay, setAutoplay] = useState(false);
    const [intervalMs, setIntervalMs] = useState(1500);
    const [loop, setLoop] = useState(true);

    // independent hover/selection state for bad panel only
    const [hoveredBad, setHoveredBad] = useState(null);
    const [selectedBad, setSelectedBad] = useState(null);

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
            if (typeof mermaid.contentLoaded === 'function') mermaid.contentLoaded();
        }
        if (diagrams.normalized && normRef.current) {
            normRef.current.innerHTML = `<div class="mermaid">${diagrams.normalized}</div>`;
            if (typeof mermaid.contentLoaded === 'function') mermaid.contentLoaded();
        }
    }, [diagrams]);

    const [flashRefNote, setFlashRefNote] = useState(false);
    const flashTimer = useRef(null);
    const [newAdded, setNewAdded] = useState(null);
    const newAddedTimer = useRef(null);

    const [notePersistent, setNotePersistent] = useState(false);

    const [showValidations, setShowValidations] = useState({
        Extraction: false,
        Amplification: false,
        Quantification: false
    });
    const valTimers = useRef([]);

    const [showGoodWorksheetValidations, setShowGoodWorksheetValidations] = useState(false);
    const goodValTimer = useRef(null);

    // helpers to read current autoplay/loop from memoized nextStep without adding deps
    const autoplayRef = useRef(autoplay);
    useEffect(() => { autoplayRef.current = autoplay; }, [autoplay]);
    const loopRef = useRef(loop);
    useEffect(() => { loopRef.current = loop; }, [loop]);

    // keep a ref to indicate a pending reset scheduled by autoplay so we don't schedule multiple
    const waitingResetRef = useRef(false);
    const resetTimerRef = useRef(null);

    // Keep a ref to the "nextStep" function so the autoplay interval can call the latest impl.
    const nextStepRef = useRef(null);

    // Memoize nextStep so it is stable across renders and can be used in effect deps.
    const nextStep = useCallback(() =>
        setStep((prev) => {
            // If we're already on final step
            if (prev === MAX_STEP) {
                if (loopRef.current) {
                    // If autoplay is active, schedule a delayed reset allowing validations to finish.
                    if (autoplayRef.current) {
                        if (!waitingResetRef.current) {
                            waitingResetRef.current = true;
                            // schedule a reset after the last validation + buffer
                            resetTimerRef.current = setTimeout(() => {
                                // clear validation timers and state
                                valTimers.current.forEach(t => clearTimeout(t));
                                valTimers.current = [];
                                setShowValidations({ Extraction: false, Amplification: false, Quantification: false });
                                if (goodValTimer.current) { clearTimeout(goodValTimer.current); goodValTimer.current = null; }
                                setShowGoodWorksheetValidations(false);

                                // reset transient UI and go back to step 0
                                setFlashRefNote(false);
                                setNewAdded(null);
                                setNotePersistent(false);
                                setStep(0);

                                waitingResetRef.current = false;
                                resetTimerRef.current = null;
                            }, RESET_WAIT_MS);
                        }
                        // while waiting, keep on the final step
                        return prev;
                    } else {
                        // not autoplaying (manual Next on final step and loop enabled) -> wrap immediately
                        valTimers.current.forEach(t => clearTimeout(t));
                        valTimers.current = [];
                        setShowValidations({ Extraction: false, Amplification: false, Quantification: false });
                        if (goodValTimer.current) { clearTimeout(goodValTimer.current); goodValTimer.current = null; }
                        setShowGoodWorksheetValidations(false);
                        setFlashRefNote(false);
                        setNewAdded(null);
                        setNotePersistent(false);
                        return 0;
                    }
                } else {
                    // loop disabled, stay at final step
                    return prev;
                }
            }

            const next = Math.min(prev + 1, MAX_STEP);

            // If we're advancing into the validation step, only start the validation timers
            // and do NOT touch the DnaProcess ref-table animation state (no `newAdded` or `flashRefNote`).
            if (next === MAX_STEP && next !== prev) {
                setNotePersistent(true);

                valTimers.current.forEach(t => clearTimeout(t));
                valTimers.current = [];
                setShowValidations({ Extraction: false, Amplification: false, Quantification: false });

                if (goodValTimer.current) {
                    clearTimeout(goodValTimer.current);
                    goodValTimer.current = null;
                }
                setShowGoodWorksheetValidations(false);

                // staggered appearance for validation tables
                valTimers.current.push(setTimeout(() => setShowValidations(s => ({ ...s, Extraction: true })), 600));
                valTimers.current.push(setTimeout(() => setShowValidations(s => ({ ...s, Amplification: true })), 1800));
                valTimers.current.push(setTimeout(() => setShowValidations(s => ({ ...s, Quantification: true })), 3000));
                return next;
            }

            // Normal process-add behavior (does update the good-panel badges / flash)
            if (next !== prev) {
                setFlashRefNote(true);
                if (flashTimer.current) clearTimeout(flashTimer.current);
                flashTimer.current = setTimeout(() => setFlashRefNote(false), 900);

                const addedIndex = next;
                if (addedIndex > 0 && addedIndex < PROCESSES.length) {
                    const addedProcess = PROCESSES[addedIndex];
                    setNewAdded(addedProcess);
                    if (newAddedTimer.current) clearTimeout(newAddedTimer.current);
                    newAddedTimer.current = setTimeout(() => setNewAdded(null), 1200);
                } else {
                    setNewAdded(null);
                }

                setNotePersistent(true);

                valTimers.current.forEach(t => clearTimeout(t));
                valTimers.current = [];
                setShowValidations({ Extraction: false, Amplification: false, Quantification: false });

                if (goodValTimer.current) {
                    clearTimeout(goodValTimer.current);
                    goodValTimer.current = null;
                }
                setShowGoodWorksheetValidations(false);
            }

            return next;
        }), []); // relies on refs and top-level stable constants

    // Keep the ref up-to-date with the latest nextStep implementation
    useEffect(() => {
        nextStepRef.current = nextStep;
    }, [nextStep]);

    // Auto-advance (uses nextStepRef so autoplay triggers same logic as manual Next)
    useEffect(() => {
        if (!autoplay) return undefined;
        const tick = () => {
            if (nextStepRef.current) nextStepRef.current();
        };
        const id = setInterval(tick, Math.max(250, Number(intervalMs) || 1500));
        return () => clearInterval(id);
    }, [autoplay, intervalMs, loop]);

    // when validations fully show, stagger good-panel after quantification
    useEffect(() => {
        if (showValidations.Quantification) {
            if (goodValTimer.current) clearTimeout(goodValTimer.current);
            goodValTimer.current = setTimeout(() => {
                setShowGoodWorksheetValidations(true);
                goodValTimer.current = null;
            }, 700);
        } else {
            if (goodValTimer.current) {
                clearTimeout(goodValTimer.current);
                goodValTimer.current = null;
            }
            setShowGoodWorksheetValidations(false);
        }
    }, [showValidations.Quantification]);

    // ensure timers are cleared on unmount
    useEffect(() => {
        return () => {
            if (flashTimer.current) clearTimeout(flashTimer.current);
            if (newAddedTimer.current) clearTimeout(newAddedTimer.current);
            valTimers.current.forEach(t => clearTimeout(t));
            valTimers.current = [];
            if (goodValTimer.current) {
                clearTimeout(goodValTimer.current);
                goodValTimer.current = null;
            }
            if (resetTimerRef.current) {
                clearTimeout(resetTimerRef.current);
                resetTimerRef.current = null;
                waitingResetRef.current = false;
            }
        };
    }, []);

    const prevStep = () => setStep((prev) => Math.max(prev - 1, 0));
    const reset = () => {
        setStep(0);
        setSelectedBad(null);
        setHoveredBad(null);
        setFlashRefNote(false);
        setNewAdded(null);
        setNotePersistent(false);
        valTimers.current.forEach(t => clearTimeout(t));
        valTimers.current = [];
        setShowValidations({ Extraction: false, Amplification: false, Quantification: false });
        if (goodValTimer.current) {
            clearTimeout(goodValTimer.current);
            goodValTimer.current = null;
        }
        setShowGoodWorksheetValidations(false);
        if (flashTimer.current) {
            clearTimeout(flashTimer.current);
            flashTimer.current = null;
        }
        if (newAddedTimer.current) {
            clearTimeout(newAddedTimer.current);
            newAddedTimer.current = null;
        }
        if (resetTimerRef.current) {
            clearTimeout(resetTimerRef.current);
            resetTimerRef.current = null;
            waitingResetRef.current = false;
        }
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

    const IconItem = ({ Icon, label, small = false, labelClass = '' }) => (
        <div className={`icon ${small ? 'small-inline' : ''}`} aria-hidden>
            <Icon title={label} />
            <div className={`icon-label ${labelClass}`}>{label}</div>
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
                    <button onClick={() => nextStep()} style={{ marginLeft: 6 }}>▶ Add New Process</button>
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
                        <div className="panel bad" style={{ position: 'relative' }}>
                            <h5>Bad: All tables Copy/Pasted for each new DNA Process</h5>

                            <div className="silo-rows">
                                {badSilos.map((s, i) => (
                                    <div
                                        key={s}
                                        className={`silo-row ${i > 0 ? 'duplicate visible' : ''} ${hoveredBad === s || selectedBad === s ? 'highlight' : ''}`}
                                        onMouseEnter={() => setHoveredBad(s)}
                                        onMouseLeave={() => setHoveredBad(null)}
                                        onClick={() => setSelectedBad(selectedBad === s ? null : s)}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 220px',
                                            gridTemplateRows: 'auto auto',
                                            alignItems: 'center',
                                            gap: 12,
                                            position: 'relative'
                                        }}
                                    >
                                        <div style={{ gridColumn: 1, gridRow: 1, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'flex-start' }}>
                                            <IconItem Icon={IconTable} label={`${s} (Worksheets)`} labelClass="core-title" />
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <IconItem Icon={IconVial} label={`${s}Specimen`} labelClass="core-title" />
                                            </div>
                                            <IconItem Icon={IconPipette} label={`${s}Pipette`} labelClass="core-title" />
                                        </div>

                                        {i > 0 && (
                                            <div style={{ gridColumn: 1, gridRow: 2, justifySelf: 'center', marginTop: 6 }} className="dupe-note" role="status" aria-live="polite">
                                                Duplicated!
                                            </div>
                                        )}

                                        <div style={{ gridColumn: 2, gridRow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                            {showValidations[s] ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 6 }}>
                                                    <IconTable title={`${s}Validation`} />
                                                    <div className="core-title" style={{ marginTop: 6 }}>{s}Validation</div>
                                                </div>
                                            ) : null}
                                        </div>

                                        {showValidations[s] && s !== 'Extraction' && (
                                            <div style={{ gridColumn: 2, gridRow: 2, justifySelf: 'center', marginTop: 6, textAlign: 'center' }} className="dupe-note" role="status" aria-live="polite">
                                                New Feature Scaling!<br />Copy/Paste!
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Good panel: grouped center row for Worksheets, WorksheetSpecimen, Pipettes */}
                        <div className="panel good" style={{ minHeight: 240 }}>
                            <h5>Good: Normalized Reuse</h5>
                            <div className="silo-area">
                                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', width: '100%' }}>
                                    <div className="ref" style={{ minWidth: 220 }}>
                                        <div className="table reftable" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 12 }}>
                                            <IconTable title="DnaProcess (ref table)" />
                                            <div className="core-title">DnaProcess (ref table)</div>

                                            <div style={{ marginTop: 10, width: '100%' }}>
                                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                                    {visibleRefProcesses.map((p) => (
                                                        <div key={p} className="ref-row" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }} aria-hidden>
                                                            <div style={{ fontWeight: 400 }} className={newAdded === p ? 'new-row-highlight' : ''}>{p}</div>
                                                            {newAdded === p && <span className="added-badge" aria-hidden>Added</span>}
                                                        </div>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div style={{ marginTop: 6, fontSize: 12 }} className={`silo-note ${flashRefNote ? 'emphasize' : ''} ${notePersistent ? 'persistent' : ''}`} aria-live="polite">
                                                {flashRefNote ? 'Row Inserted!' : 'Add a row for new process'}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div className="core-group" style={{ width: '100%', justifyContent: 'center', flexWrap: 'wrap', gap: 24 }}>
                                            <div style={{ display: 'flex', gap: 24, width: '100%', justifyContent: 'center', alignItems: 'flex-start' }}>
                                                <div className="core-silo">
                                                    <IconTable title="Worksheets" />
                                                    <div className="core-title">Worksheets</div>
                                                    <div className="core-fk muted">(FK to DnaProcess)</div>
                                                </div>

                                                <div className="core-silo">
                                                    <IconVial title="WorksheetSpecimen" />
                                                    <div className="core-title">WorksheetSpecimen</div>
                                                    <div className="core-fk muted">(FK to Worksheets)</div>
                                                </div>

                                                <div className="core-silo">
                                                    <IconPipette title="Pipettes" />
                                                    <div className="core-title">Pipettes</div>
                                                    <div className="core-fk muted">(FK in Worksheets)</div>
                                                </div>
                                            </div>

                                            {showGoodWorksheetValidations && (
                                              <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 12 }}>
                                                <div className="core-silo" style={{ padding: 10 }}>
                                                  <IconTable title="WorksheetValidations" />
                                                  <div className="core-title" style={{ marginTop: 8, fontWeight: 600 }}>WorksheetValidations</div>
                                                  <div className="core-fk muted">(FK to Worksheets)</div>
                                                </div>

                                                <div className="feature-note" role="status" aria-live="polite" style={{ textAlign: 'center' }}>
                                                  New Feature Scaling!<br />No Copy/Paste!
                                                </div>
                                              </div>
                                            )}

                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                    {visibleRefProcesses.map((p) => (
                                        <div key={p} className={`silo process-specific visible`} role="button" tabIndex={0}>
                                            <div className="table small" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                                <IconTable title={`${p}Props`} />
                                                <div style={{ marginTop: 4, textAlign: 'center' }}>
                                                    <div className="core-title">{p}Props</div>
                                                    {p !== 'Extraction' && <div className="core-fk"><small className="silo-note persistent">(1 new table)</small></div>}
                                                </div>
                                                {newAdded === p && <span className="added-badge static" aria-hidden>Added</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div aria-live="polite" className="sr-only" role="status">
                {newAdded ? `${newAdded} added` : ''}
            </div>
        </div>
    );
}