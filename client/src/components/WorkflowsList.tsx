import React, { useEffect, useState } from 'react';
import WorkflowsApi from '../api/workflows';
import UsersApi from '../api/users';
import { Workflow } from '../types';
import WorkflowForm from './WorkflowForm';
import { toastSuccess, toastError } from '../toast';

interface Props {
  apiUrl?: string; // not used when wrapper is used
}

const WorkflowsList: React.FC<Props> = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Workflow | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await WorkflowsApi.list();
      setWorkflows(list);
    } catch (ex: unknown) {
      console.error('API error (workflows):', ex);
      toastError(ex instanceof Error ? ex.message : 'Failed to load workflows');
      setWorkflows([]); // ensure empty state
      setError(null); // don't show inline error; rely on toast
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []); // wrapper uses REACT_APP_API_URL or default

  const handleCreate = () => {
    setEditing(null);
    setShowForm(true);
  };

  const handleEdit = (w: Workflow) => {
    setEditing(w);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditing(null);
  };

  // payload now optionally includes dnaProcessIds in order
  const handleSubmit = async (payload: { id?: number; name: string; createdBy: number; dnaProcessIds?: number[] }) => {
    setSubmitting(true);
    setError(null);
    try {
      if (payload.id) {
        // Update basic workflow fields (send createdByUser as before if needed)
        let createdByUser = undefined;
        try {
          createdByUser = await UsersApi.get(payload.createdBy);
        } catch {
          createdByUser = { id: payload.createdBy, userName: '', email: '', userType: 2 };
        }

        const updatePayload: any = {
          id: payload.id,
          name: payload.name,
          createdBy: payload.createdBy,
          createdByUser: createdByUser
        };

        await WorkflowsApi.update(updatePayload);

        // If processes were supplied in the edit, replace them atomically
        if (payload.dnaProcessIds && payload.dnaProcessIds.length) {
          await WorkflowsApi.replaceProcesses(payload.id, payload.dnaProcessIds);
        }

        toastSuccess(`Workflow "${payload.name}" updated`);
      } else {
        // create workflow then set processes in one call
        const created = await WorkflowsApi.create({ name: payload.name, createdBy: payload.createdBy });
        if (payload.dnaProcessIds && payload.dnaProcessIds.length) {
          await WorkflowsApi.replaceProcesses(created.id, payload.dnaProcessIds);
        }

        toastSuccess(`Workflow "${payload.name}" created`);
      }

      await load(); // refresh to get server-side projection (CreatedByUser, WorkflowProcesses)
      setShowForm(false);
      setEditing(null);
    } catch (ex: unknown) {
      console.error('API error (save workflow):', ex);
      toastError('Failed to save workflow');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (w: Workflow) => {
    if (!window.confirm(`Delete workflow "${w.name}" (ID ${w.id})?`)) return;
    setError(null);
    try {
      await WorkflowsApi.remove(w.id);
      toastSuccess(`Workflow "${w.name}" deleted`);
      await load();
    } catch (ex: unknown) {
      console.error('API error (delete workflow):', ex);
      toastError('Failed to delete workflow');
    }
  };

  if (loading) return <div className="p-3">Loading workflows...</div>;
  // Note: inline error display removed in favor of toastError notifications

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="mb-0">Workflows</h1>
        <div>
          <button className="btn btn-sm btn-success" onClick={handleCreate}>Add Workflow</button>
        </div>
      </div>

      {showForm && (
        <WorkflowForm
          initialWorkflow={editing}
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
              <th>Name</th>
              <th>Created By</th>
              <th>Processes</th>
              <th style={{ width: 160 }}>Actions</th>
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
                            {wp.dnaProcess ? wp.dnaProcess.name : `Process ${wp.id}`}
                            <small className="text-muted"> (order {wp.processOrder})</small>
                          </li>
                        ))}
                    </ol>
                  ) : (
                    <span className="text-muted">No processes</span>
                  )}
                </td>
                <td>
                  <div className="btn-group" role="group">
                    <button className="btn btn-sm btn-primary" onClick={() => handleEdit(w)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(w)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {workflows.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted">No workflows</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WorkflowsList;