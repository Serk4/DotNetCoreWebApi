import React, { useState } from 'react';
import UsersList from './components/UsersList';
import DnaProcessesList from './components/DnaProcessesList';
import WorkflowsList from './components/WorkflowsList';
import SchemaShowcase from './components/SchemaShowcase';
import SchemaShowdown from './components/SchemaShowdown';
import WorkflowRunner from './components/WorkflowRunner';
import WorksheetManager from './components/WorksheetManager';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const App: React.FC = () => {
    const [view, setView] = useState<'home' | 'users' | 'dnaProcesses' | 'workflows' | 'run' | 'worksheets'>('home');
    const [showWorkflowMenu, setShowWorkflowMenu] = useState(false);

    // Always start with Showcase selected on page load
    const [schemaView, setSchemaView] = useState<'showcase' | 'showdown'>('showcase');

    const renderHome = () => (
        <div className="p-4">
            <h1>DNA Workflow</h1>
            <p>Welcome! Use the navigation to view users and create or run workflows.</p>
            <br />

            {/* Schema Demo header with toggle moved under title/subtitle */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                    <h2 style={{ margin: 0 }}>Schema Demo</h2>
                    <div style={{ fontSize: '0.85rem', color: 'rgba(0,0,0,0.6)' }}>Toggle the visualizer below</div>
                </div>

                <div role="tablist" aria-label="Schema view toggle" style={{ display: 'flex', gap: 8 }}>
                    <button
                        role="tab"
                        aria-selected={schemaView === 'showcase'}
                        onClick={() => setSchemaView('showcase')}
                        className={`btn btn-sm ${schemaView === 'showcase' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    >
                        Showcase
                    </button>
                    <button
                        role="tab"
                        aria-selected={schemaView === 'showdown'}
                        onClick={() => setSchemaView('showdown')}
                        className={`btn btn-sm ${schemaView === 'showdown' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    >
                        Showdown
                    </button>
                </div>
            </div>

            <br />
            <hr />

            {/* Render the selected schema component */}
            <div style={{ marginTop: 12 }}>
                {schemaView === 'showcase' ? <SchemaShowcase /> : <SchemaShowdown />}
            </div>
        </div>
    );

    const navButtonClass = (active: boolean) => `btn btn-sm ${active ? 'btn-primary' : 'btn-outline-secondary'} me-2`;

    return (
        <div>
            <nav className="navbar navbar-expand-lg navbar-light bg-light border-bottom">
                <div className="container-fluid">
                    <span className="navbar-brand fw-semibold">DNA Workflow</span>
                    <div className="d-flex align-items-center" style={{ position: 'relative' }}>
                        <button
                            onClick={() => setView('home')}
                            aria-pressed={view === 'home'}
                            className={navButtonClass(view === 'home')}
                        >
                            Home
                        </button>
                        <button
                            onClick={() => setView('users')}
                            aria-pressed={view === 'users'}
                            className={navButtonClass(view === 'users')}
                        >
                            Users
                        </button>

                        {/* Workflow Setup top-level menu */}
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setShowWorkflowMenu(s => !s)}
                                aria-expanded={showWorkflowMenu}
                                className={navButtonClass(false)}
                                type="button"
                            >
                                Workflow Setup
                            </button>

                            {showWorkflowMenu && (
                                <div
                                    className="card p-2"
                                    style={{
                                        position: 'absolute',
                                        top: '2.5rem',
                                        left: 0,
                                        zIndex: 1000,
                                        minWidth: 160,
                                        boxShadow: '0 6px 12px rgba(0,0,0,.175)'
                                    }}
                                >
                                    <button
                                        className={`btn btn-sm w-100 text-start ${view === 'workflows' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                        onClick={() => { setView('workflows'); setShowWorkflowMenu(false); }}
                                    >
                                        Workflows
                                    </button>
                                    <button
                                        className={`btn btn-sm w-100 text-start mt-2 ${view === 'dnaProcesses' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                        onClick={() => { setView('dnaProcesses'); setShowWorkflowMenu(false); }}
                                    >
                                        DNA Processes
                                    </button>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setView('run')}
                            aria-pressed={view === 'run'}
                            className={navButtonClass(view === 'run')}
                        >
                            Run Workflow
                        </button>

                        <button
                            onClick={() => setView('worksheets')}
                            aria-pressed={view === 'worksheets'}
                            className={navButtonClass(view === 'worksheets')}
                        >
                            Work on Tasks
                        </button>
                    </div>
                </div>
            </nav>

            <main>
                {view === 'users' && <UsersList />}
                {view === 'dnaProcesses' && <DnaProcessesList />}
                {view === 'workflows' && <WorkflowsList />}
                {view === 'run' && <WorkflowRunner />}
                {view === 'worksheets' && <WorksheetManager />}
                {view === 'home' && renderHome()}
            </main>

            {/* Toast container (global) */}
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover draggable />
        </div>
    );
};

export default App;