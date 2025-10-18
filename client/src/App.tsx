import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface User {
    id: number;
    userName: string;
    email: string;
    userType: number;  // 0=Admin, 1=Technician, 2=Analyst
}

const App: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get<User[]>('https://localhost:7049/api/users')  // Your API (update port if different)
            .then(res => setUsers(res.data))
            .catch(ex => console.error('API error:', ex))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div>Loading users...</div>;

    return (
        <div style={{ padding: '20px' }}>
            <h1>DNA Workflow Users</h1>
            <table style={{ borderCollapse: 'collapse', width: '100%', border: '1px solid #ddd' }}>
                <thead>
                    <tr>
                        <th style={{ border: '1px solid #ddd', padding: '8px' }}>ID</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px' }}>Username</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px' }}>Email</th>
                        <th style={{ border: '1px solid #ddd', padding: '8px' }}>Type</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user.id}>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.id}</td>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.userName}</td>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.email}</td>
                            <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                                {user.userType === 0 ? 'Admin' : user.userType === 1 ? 'Technician' : 'Analyst'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default App;