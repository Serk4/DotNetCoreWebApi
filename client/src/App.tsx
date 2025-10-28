import React, { useState } from 'react';
import 'bootswatch/dist/cerulean/bootstrap.min.css'; // Bootswatch theme (cerulean). Change to another theme if desired.
import UsersList from './components/UsersList';
import DnaProcessesList from './components/DnaProcessesList';
import WorkflowsList from './components/WorkflowsList';

const App: React.FC = () => {
    const [view, setView] = useState<'home' | 'users' | 'dnaProcesses' | 'workflows'>('home');

    const renderHome = () => (
        <div className="p-4">
            <h1>DNA Workflow</h1>
            <p>Welcome — use the navigation to view users and other pages.</p>
        </div>
    );

    const navButtonClass = (active: boolean) => `btn btn-sm ${active ? 'btn-primary' : 'btn-outline-secondary'} me-2`;

    return (
        <div>
            <nav className="navbar navbar-expand-lg navbar-light bg-light border-bottom">
                <div className="container-fluid">
                    <span className="navbar-brand fw-semibold">DNA Workflow</span>
                    <div className="d-flex">
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
                        <button
                            onClick={() => setView('dnaProcesses')}
                            aria-pressed={view === 'dnaProcesses'}
                            className={navButtonClass(view === 'dnaProcesses')}
                        >
                            DNA Processes
                        </button>
                        <button
                            onClick={() => setView('workflows')}
                            aria-pressed={view === 'workflows'}
                            className={navButtonClass(view === 'workflows')}
                        >
                            Workflows
                        </button>
                    </div>
                </div>
            </nav>

            <main>
                {view === 'users' && <UsersList />}
                {view === 'dnaProcesses' && <DnaProcessesList />}
                {view === 'workflows' && <WorkflowsList />}
                {view === 'home' && renderHome()}
            </main>
        </div>
    );
};

export default App;