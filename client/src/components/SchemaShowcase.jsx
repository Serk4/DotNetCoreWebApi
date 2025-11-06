import React, { useEffect, useState, useRef } from 'react';
import mermaid from 'mermaid';
import './SchemaShowcase.css';
import SchemaShowdown from './SchemaShowdown';

/*
Pseudocode / Plan (detailed):
- Objective: Center both lines of the feature callout text in both the bad-panel and good-panel occurrences.
- Locate the two `feature-note` divs:
  1) In the bad panel: rendered for validations for Amplification/Quantification (`showValidations[s] && s !== 'Extraction'`).
  2) In the good panel: the grouped center block next to `WorksheetValidations`.
- Change approach:
  - Add inline style `{ textAlign: 'center' }` to both `feature-note` divs so both lines (separated by `<br />`) are centered horizontally.
  - Keep existing grid placement and `justifySelf: 'center'` for the bad panel element so cell alignment remains the same.
  - Preserve ARIA attributes (`role="status" aria-live="polite"`) and existing class names.
- Rationale:
  - Minimal change, explicit centering of text.
  - Avoids touching CSS files in case class styles are reused elsewhere.
- Deliverable: Full updated `SchemaShowcase.jsx` with the two `feature-note` divs updated to center their text.
*/

export default function SchemaShowcase() {
    const [diagrams, setDiagrams] = useState({ legacy: '', normalized: '' });
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
    // allow one extra step for validations
    const MAX_STEP = PROCESSES.length; // 3 processes -> steps 0..3 (step 3 = show validations)

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

    const [flashRefNote, setFlashRefNote] = useState(false);
    const flashTimer = useRef(null);
    const [newAdded, setNewAdded] = useState(null);
    const newAddedTimer = useRef(null);

    // NEW: keep the center note static after the first Add action
    const [notePersistent, setNotePersistent] = useState(false);

    // validation appearance tracking + timers
    const [showValidations, setShowValidations] = useState({
        Extraction: false,
        Amplification: false,
        Quantification: false
    });
    const valTimers = useRef([]);

    const nextStep = () =>
        setStep((prev) => {
            const next = Math.min(prev + 1, MAX_STEP);

            // If we're advancing into the validation step, only start the validation timers
            // and do NOT touch the DnaProcess ref-table animation state (no `newAdded` or `flashRefNote`).
            if (next === MAX_STEP && next !== prev) {
                // make the center note persistent from now on
                setNotePersistent(true);

                // clear previous timers/state and hide validations before staggering
                valTimers.current.forEach(t => clearTimeout(t));
                setShowValidations({ Extraction: false, Amplification: false, Quantification: false });

                // staggered appearance for validation tables (no changes to good panel)
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

                // Show 'Added' badge only for processes after the original (never for Extraction).
                const addedIndex = next; // when step becomes 1 -> Amplification, 2 -> Quantification
                if (addedIndex > 0 && addedIndex < PROCESSES.length) {
                    const addedProcess = PROCESSES[addedIndex];
                    setNewAdded(addedProcess);
                    if (newAddedTimer.current) clearTimeout(newAddedTimer.current);
                    newAddedTimer.current = setTimeout(() => setNewAdded(null), 1200);
                } else {
                    setNewAdded(null);
                }

                // make the center note persistent from now on
                setNotePersistent(true);

                // ensure validations are cleared if we're leaving that step
                valTimers.current.forEach(t => clearTimeout(t));
                valTimers.current = [];
                setShowValidations({ Extraction: false, Amplification: false, Quantification: false });
            }

            return next;
        });

    // ensure timers are cleared on unmount
    useEffect(() => {
        return () => {
            if (flashTimer.current) clearTimeout(flashTimer.current);
            if (newAddedTimer.current) clearTimeout(newAddedTimer.current);
            valTimers.current.forEach(t => clearTimeout(t));
            valTimers.current = [];
        };
    }, []);

    const prevStep = () => setStep((prev) => Math.max(prev - 1, 0));
    const reset = () => {
        setStep(0);
        setSelectedBad(null);
        setHoveredBad(null);
        setSelectedGood(null);
        setHoveredGood(null);
        setFlashRefNote(false);
        setNewAdded(null);
        // reset the persistent note
        setNotePersistent(false);
        // clear validation timers and hide tables
        valTimers.current.forEach(t => clearTimeout(t));
        valTimers.current = [];
        setShowValidations({ Extraction: false, Amplification: false, Quantification: false });
        if (flashTimer.current) {
            clearTimeout(flashTimer.current);
            flashTimer.current = null;
        }
        if (newAddedTimer.current) {
            clearTimeout(newAddedTimer.current);
            newAddedTimer.current = null;
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

    // Bad panel renderer (updated)
    const renderBadIcons = (prefix, isDuplicate = false) => (
      <>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <IconItem Icon={IconTable} label={`${prefix} (Worksheets)`} labelClass="core-title" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <IconItem Icon={IconVial} label={`${prefix}Specimen`} labelClass="core-title" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <IconItem Icon={IconPipette} label={`${prefix}Pipette`} labelClass="core-title" />
        </div>

        {/* Place the "Duplicated!" callout in the second column below the icon row so it doesn't move icons */}
        {isDuplicate && (
          <div style={{ gridColumn: '2 / 3', justifySelf: 'center', marginTop: 8 }} className="dupe-note" role="status" aria-live="polite">
            Duplicated!
          </div>
        )}
      </>
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
                    <button onClick={nextStep} style={{ marginLeft: 6 }}>▶ Add New Process</button>
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
                                            gridTemplateColumns: '1fr 220px', // left = icons, right = validation column
                                            gridTemplateRows: 'auto auto',    // top = icons, bottom = callouts
                                            alignItems: 'center',
                                            gap: 12,
                                            position: 'relative'
                                        }}
                                    >
                                        {/* left column, top row: icons horizontally aligned */}
                                        <div style={{ gridColumn: 1, gridRow: 1, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'flex-start' }}>
                                            <IconItem Icon={IconTable} label={`${s} (Worksheets)`} labelClass="core-title" />
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <IconItem Icon={IconVial} label={`${s}Specimen`} labelClass="core-title" />
                                            </div>
                                            <IconItem Icon={IconPipette} label={`${s}Pipette`} labelClass="core-title" />
                                        </div>

                                        {/* left column, bottom row: duplicated callout (keeps icons from moving) */}
                                        {i > 0 && (
                                            <div
                                                style={{
                                                    gridColumn: 1,
                                                    gridRow: 2,
                                                    justifySelf: 'center',
                                                    marginTop: 6
                                                }}
                                                className="dupe-note"
                                                role="status"
                                                aria-live="polite"
                                            >
                                                Duplicated!
                                            </div>
                                        )}

                                        {/* right column, top row: validation icon + name */}
                                        <div style={{ gridColumn: 2, gridRow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                            {showValidations[s] ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 6 }}>
                                                    <IconTable title={`${s}Validation`} />
                                                    <div className="core-title" style={{ marginTop: 6 }}>{s}Validation</div>
                                                </div>
                                            ) : null}
                                        </div>

                                        {/* right column, bottom row: Copy/Paste! callout for Amplification/Quantification */}
                                        {showValidations[s] && s !== 'Extraction' && (
                                            <div
                                                style={{
                                                    gridColumn: 2,
                                                    gridRow: 2,
                                                    justifySelf: 'center',
                                                    marginTop: 6,
                                                    textAlign: 'center' // center both lines of text
                                                }}
                                                className="dupe-note"
                                                role="status"
                                                aria-live="polite"
                                            >
                                                New Feature Scaling!<br />Copy/Paste!
                                            </div>
                                        )}
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
                                            <div className="core-title">DnaProcess (ref table)</div>

                                            <div style={{ marginTop: 10, width: '100%' }}>
                                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                                    {visibleRefProcesses.map((p) => (
                                                        <div
                                                            key={p}
                                                            className="ref-row"
                                                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}
                                                            aria-hidden
                                                        >
                                                            <div style={{ fontWeight: 400 }} className={newAdded === p ? 'new-row-highlight' : ''}>
                                                                {p}
                                                            </div>
                                                            {newAdded === p && <span className="added-badge" aria-hidden>Added</span>}
                                                        </div>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div
                                                style={{ marginTop: 6, fontSize: 12 }}
                                                className={`silo-note ${flashRefNote ? 'emphasize' : ''} ${notePersistent ? 'persistent' : ''}`}
                                                aria-live="polite"
                                            >
                                                {flashRefNote ? 'Row Inserted!' : 'Add a row for new process'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Grouped center block: Worksheets | WorksheetSpecimen | Pipettes */}
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div className="core-group" style={{ width: '100%', justifyContent: 'center', flexWrap: 'wrap', gap: 24 }}>
                                            {/* Top row: three core items */}
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

                                            {/* Bottom row inside same border: centered WorksheetValidations */}
                                            {showValidations.Quantification && (
                                              <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 12 }}>
                                                <div className="core-silo" style={{ padding: 10 }}>
                                                  <IconTable title="WorksheetValidations" />
                                                  <div className="core-title" style={{ marginTop: 8, fontWeight: 600 }}>WorksheetValidations</div>
                                                  <div className="core-fk muted">(FK to Worksheets)</div>
                                                </div>

                                                {/* New: feature callout next to the validations table (green variant of dupe-note) */}
                                                <div className="feature-note" role="status" aria-live="polite" style={{ textAlign: 'center' }}>
                                                  New Feature Scaling!<br />No Copy/Paste!
                                                </div>
                                              </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* second row: props tables for visible processes */}
                                <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                    {visibleRefProcesses.map((p) => (
                                        <div
                                            key={p}
                                            className={`silo process-specific visible`}
                                            role="button"
                                            tabIndex={0}
                                        >
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
            <SchemaShowdown />

            {/* Screen reader announcement area */}
            <div aria-live="polite" className="sr-only" role="status">
                {newAdded ? `${newAdded} added` : ''}
            </div>
        </div>
    );
}