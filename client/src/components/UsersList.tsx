import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { User } from '../types';

interface Props {
    apiUrl?: string;
}

const UsersList: React.FC<Props> = ({ apiUrl = 'https://localhost:7049/api/users' }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        axios.get<User[]>(apiUrl)
            .then(res => setUsers(res.data))
            .catch(ex => {
                console.error('API error (users):', ex);
                setError('Failed to load users');
            })
            .finally(() => setLoading(false));
    }, [apiUrl]);

    if (loading) return <div className="p-3">Loading users...</div>;
    if (error) return <div className="p-3 text-danger">{error}</div>;

    return (
        <div className="p-4">
            <h1 className="mb-4">DNA Workflow Users</h1>
            <div className="table-responsive">
                <table className="table table-striped table-hover table-bordered">
                    <thead className="table-light">
                        <tr>
                            <th>ID</th>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Type</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td>{user.id}</td>
                                <td>{user.userName}</td>
                                <td>{user.email}</td>
                                <td>{user.userType === 0 ? 'Admin' : user.userType === 1 ? 'Technician' : 'Analyst'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UsersList;