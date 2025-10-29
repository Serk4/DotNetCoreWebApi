import React, { useEffect, useState } from 'react';
import UsersApi from '../api/users';
import { User } from '../types';
import UserForm from './UserForm';

interface Props {
  apiUrl?: string; // kept for compatibility, not used when wrapper is used
}

const UsersList: React.FC<Props> = ({ apiUrl }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state for create/edit
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await UsersApi.list();
      setUsers(res);
    } catch (ex: unknown) {
      console.error('API error (users):', ex);
      setError(ex instanceof Error ? ex.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // wrapper determines endpoint via REACT_APP_API_URL if needed

  const handleCreate = () => {
    setEditingUser(null);
    setShowForm(true);
  };

  const handleEdit = (u: User) => {
    setEditingUser(u);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingUser(null);
  };

  const handleSubmit = async (payload: Omit<User, 'id'> & Partial<Pick<User, 'id'>>) => {
    setSubmitting(true);
    setError(null);
    try {
      if (payload.id) {
        // Update
        await UsersApi.update({ ...(payload as any) as { id: number } });
        setUsers(prev => prev.map(p => (p.id === payload.id ? { ...(p as User), ...payload } as User : p)));
      } else {
        // Create
        const res = await UsersApi.create(payload as Omit<User, 'id'>);
        setUsers(prev => [res, ...prev]);
      }
      setShowForm(false);
      setEditingUser(null);
    } catch (ex: unknown) {
      console.error('API error (save user):', ex);
      setError(ex instanceof Error ? ex.message : 'Failed to save user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (u: User) => {
    if (!window.confirm(`Delete user "${u.userName}" (ID ${u.id})?`)) return;
    setError(null);
    try {
      await UsersApi.remove(u.id);
      setUsers(prev => prev.filter(x => x.id !== u.id));
    } catch (ex: unknown) {
      console.error('API error (delete user):', ex);
      setError(ex instanceof Error ? ex.message : 'Failed to delete user');
    }
  };

  if (loading) return <div className="p-3">Loading users...</div>;
  if (error) return <div className="p-3 text-danger">{error}</div>;

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="mb-0">DNA Workflow Users</h1>
        <div>
          <button className="btn btn-sm btn-success" onClick={handleCreate}>Add User</button>
        </div>
      </div>

      {showForm && (
        <UserForm
          initialUser={editingUser}
          onCancel={handleCancel}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      )}

      <div className="table-responsive">
        <table className="table table-striped table-hover table-bordered">
          <thead className="table-light">
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>Type</th>
              <th style={{ width: 160 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.userName}</td>
                <td>{user.email}</td>
                <td>{user.userType === 0 ? 'Admin' : user.userType === 1 ? 'Technician' : 'Analyst'}</td>
                <td>
                  <div className="btn-group" role="group">
                    <button className="btn btn-sm btn-primary" onClick={() => handleEdit(user)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(user)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted">No users</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersList;