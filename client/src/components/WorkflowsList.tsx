import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Workflow } from '../types';

interface Props {
    apiUrl?: string;
}

const WorkflowsList: React.FC<Props> = ({ apiUrl = 'https://localhost:7049/api/workflows' }) => {
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        axios.get<Workflow[]>(apiUrl)
            .then(res => setWorkflows(res.data))
            .catch(ex => {
                console.error('API error (workflows):', ex);
                setError('Failed to load workflows');
            })
            .finally(() => setLoading(false));
    }, [apiUrl]);

    if (loading) return <div className="p-3">Loading workflows...</div>;
    if (error) return <div className="p-3 text-danger">{error}</div>;

    return (
        <div className="p-4">
            <h1 className="mb-4">Workflows</h1>
            <div className="table-responsive">
                <table className="table table-striped table-hover table-bordered">
                    <thead className="table-light">
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Created By</th>
                            <th>Processes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {workflows.map(w => (
                            <tr key={w.id}>
                                <td>{w.id}</td>
                                <td>{w.name}</td>
                                <td>{w.createdByUser ? w.createdByUser.userName : '—'}</td>
                                <td>
                                    {w.workflowProcesses && w.workflowProcesses.length > 0 ? (
                                        <ol className="mb-0 ps-3">
                                            {w.workflowProcesses
                                                .slice()
                                                .sort((a, b) => a.processOrder - b.processOrder)
                                                .map(wp => (
                                                    <li key={wp.id}>
                                                        {wp.dnaProcess
                                                            ? wp.dnaProcess.name
                                                            : `Process ${wp.id}`}{" "}
                                                        <small className="text-muted"> (order {wp.processOrder})</small>
                                                    </li>
                                                ))}
                                        </ol>
                                    ) : (
                                        <span className="text-muted">No processes</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default WorkflowsList;