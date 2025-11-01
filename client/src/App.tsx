import React, { useState } from 'react';
import UsersList from './components/UsersList';
import DnaProcessesList from './components/DnaProcessesList';
import WorkflowsList from './components/WorkflowsList';
import SchemaShowcase from './components/SchemaShowcase';
import WorkflowRunner from './components/WorkflowRunner';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const App: React.FC = () => {
    const [view, setView] = useState<'home' | 'users' | 'dnaProcesses' | 'workflows' | 'run'>('home');
    const [showWorkflowMenu, setShowWorkflowMenu] = useState(false);

    const renderHome = () => (
        <div className="p-4">
            <h1>DNA Workflow</h1>
            <p>Welcome — use the navigation to view users and other pages.</p>
            <br />
            <hr />
            <SchemaShowcase />
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
                    </div>
                </div>
            </nav>

            <main>
                {view === 'users' && <UsersList />}
                {view === 'dnaProcesses' && <DnaProcessesList />}
                {view === 'workflows' && <WorkflowsList />}
                {view === 'run' && <WorkflowRunner />}
                {view === 'home' && renderHome()}
            </main>

            {/* Toast container (global) */}
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover draggable />
        </div>
    );
};

export default App;