import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { DnaProcess } from '../types';

interface Props {
    apiUrl?: string;
}

const DnaProcessesList: React.FC<Props> = ({ apiUrl = 'https://localhost:7049/api/dnaprocesses' }) => {
    const [processes, setProcesses] = useState<DnaProcess[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        axios.get<DnaProcess[]>(apiUrl)
            .then(res => setProcesses(res.data))
            .catch(ex => {
                console.error('API error (dnaProcesses):', ex);
                setError('Failed to load DNA processes');
            })
            .finally(() => setLoading(false));
    }, [apiUrl]);

    if (loading) return <div className="p-3">Loading DNA processes...</div>;
    if (error) return <div className="p-3 text-danger">{error}</div>;

    return (
        <div className="p-4">
            <h1 className="mb-4">DNA Processes</h1>
            <div className="table-responsive">
                <table className="table table-striped table-hover table-bordered">
                    <thead className="table-light">
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Created By</th>
                        </tr>
                    </thead>
                    <tbody>
                        {processes.map(p => (
                            <tr key={p.id}>
                                <td>{p.id}</td>
                                <td>{p.name}</td>
                                <td>{p.createdByUser ? p.createdByUser.userName : '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DnaProcessesList;