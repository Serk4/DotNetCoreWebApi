import React, { useEffect, useState } from 'react';
import WorksheetsApi from '../api/worksheets';
import UsersApi from '../api/users';
import { Worksheet, WorkflowIntersection, User, WorksheetStatus } from '../types';
import { toastSuccess, toastError } from '../toast';

export default function WorksheetManager(): JSX.Element {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedAnalystId, setSelectedAnalystId] = useState<number | null>(null);
  const [pendingWorksheets, setPendingWorksheets] = useState<Worksheet[]>([]);
  const [inProgressWorksheets, setInProgressWorksheets] = useState<Worksheet[]>([]);
  const [intersections, setIntersections] = useState<WorkflowIntersection[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'inprogress' | 'intersections'>('pending');

  useEffect(() => {
    let mounted = true;
    UsersApi.list()
      .then(list => {
        if (!mounted) return;
        setUsers(list || []);
        if (list && list.length) setSelectedAnalystId(id => id ?? list[0].id);
      })
      .catch(() => mounted && setUsers([]));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (selectedAnalystId) {
      loadWorksheets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAnalystId]);

  async function loadWorksheets() {
    if (!selectedAnalystId) return;
    setLoading(true);
    try {
      const [pending, inProgress, intersect] = await Promise.all([
        WorksheetsApi.getPendingWorksheets(selectedAnalystId),
        WorksheetsApi.getInProgressWorksheets(selectedAnalystId),
        WorksheetsApi.getIntersections()
      ]);
      setPendingWorksheets(pending);
      setInProgressWorksheets(inProgress);
      setIntersections(intersect);
    } catch (e: any) {
      toastError(`Failed to load worksheets: ${e?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartWorksheet(id: number) {
    try {
      await WorksheetsApi.startWorksheet(id);
      toastSuccess('Worksheet started!');
      loadWorksheets();
    } catch (e: any) {
      toastError(`Failed to start worksheet: ${e?.message || 'Unknown error'}`);
    }
  }

  async function handleCompleteWorksheet(id: number) {
    try {
      const result = await WorksheetsApi.completeWorksheet(id);
      if (result.nextWorksheetId) {
        toastSuccess(`Worksheet completed! Next worksheet created: ${result.nextWorksheetName}`);
      } else {
        toastSuccess('Worksheet completed (final step in workflow)!');
      }
      loadWorksheets();
    } catch (e: any) {
      toastError(`Failed to complete worksheet: ${e?.message || 'Unknown error'}`);
    }
  }

  const getStatusBadge = (status: WorksheetStatus) => {
    switch (status) {
      case WorksheetStatus.Pending:
        return <span className="badge bg-secondary">Pending</span>;
      case WorksheetStatus.InProgress:
        return <span className="badge bg-primary">In Progress</span>;
      case WorksheetStatus.Completed:
        return <span className="badge bg-success">Completed</span>;
      default:
        return <span className="badge bg-light">Unknown</span>;
    }
  };

  const renderPendingWorksheets = () => (
    <div>
      <h4>Pending Worksheets</h4>
      {pendingWorksheets.length === 0 ? (
        <p className="text-muted">No pending worksheets</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>DNA Process</th>
                <th>Workflow</th>
                <th>Step Order</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingWorksheets.map(ws => (
                <tr key={ws.id}>
                  <td>{ws.id}</td>
                  <td>{ws.name}</td>
                  <td>{ws.dnaProcess.name}</td>
                  <td>{ws.workflowGroup?.runName || 'N/A'}</td>
                  <td>{ws.workflowGroup?.stepOrder ?? 'N/A'}</td>
                  <td>{getStatusBadge(ws.status)}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleStartWorksheet(ws.id)}
                    >
                      Start
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderInProgressWorksheets = () => (
    <div>
      <h4>In Progress Worksheets</h4>
      {inProgressWorksheets.length === 0 ? (
        <p className="text-muted">No worksheets in progress</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>DNA Process</th>
                <th>Workflow</th>
                <th>Step Order</th>
                <th>Started At</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inProgressWorksheets.map(ws => (
                <tr key={ws.id}>
                  <td>{ws.id}</td>
                  <td>{ws.name}</td>
                  <td>{ws.dnaProcess.name}</td>
                  <td>{ws.workflowGroup?.runName || 'N/A'}</td>
                  <td>{ws.workflowGroup?.stepOrder ?? 'N/A'}</td>
                  <td>{ws.startAt ? new Date(ws.startAt).toLocaleString() : 'N/A'}</td>
                  <td>{getStatusBadge(ws.status)}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => handleCompleteWorksheet(ws.id)}
                    >
                      Complete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderIntersections = () => (
    <div>
      <h4>Workflow Intersections - Potential Cost Savings</h4>
      <p className="text-muted">
        These are DNA processes where multiple workflows are currently pending or in progress.
        Coordinating these workflows can save costs by batching samples together.
      </p>
      {intersections.length === 0 ? (
        <div className="alert alert-info">
          No intersections found. Create multiple workflow runs to see potential savings opportunities.
        </div>
      ) : (
        <div>
          {intersections.map((intersection) => (
            <div key={intersection.dnaProcessId} className="card mb-3">
              <div className="card-header bg-warning text-dark">
                <h5 className="mb-0">
                  <strong>{intersection.dnaProcessName}</strong> - {intersection.worksheetCount} worksheets can be batched
                </h5>
              </div>
              <div className="card-body">
                <div className="alert alert-success">
                  <strong>💡 Cost Saving Opportunity:</strong> {intersection.potentialSavings}
                </div>
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Worksheet</th>
                      <th>Analyst</th>
                      <th>Workflow</th>
                      <th>Status</th>
                      <th>Started At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intersection.worksheets.map(ws => (
                      <tr key={ws.id}>
                        <td>{ws.name}</td>
                        <td>{ws.analyst.userName}</td>
                        <td>{ws.workflowGroup?.workflowName || ws.workflowGroup?.runName || 'N/A'}</td>
                        <td>{getStatusBadge(ws.status)}</td>
                        <td>{ws.startAt ? new Date(ws.startAt).toLocaleString() : 'Not started'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ padding: 20 }}>
      <h2>Worksheet Manager</h2>
      <p className="text-muted">
        Manage your worksheets and discover workflow intersections for cost savings
      </p>

      <div style={{ marginBottom: 20 }}>
        <label>
          <strong>Select Analyst:</strong>
        </label>
        <select
          className="form-select"
          style={{ maxWidth: 300 }}
          value={selectedAnalystId ?? ''}
          onChange={e => setSelectedAnalystId(Number(e.target.value))}
        >
          <option value="">-- Select Analyst --</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>
              {u.userName}
            </option>
          ))}
        </select>
      </div>

      {selectedAnalystId && (
        <>
          <div className="mb-3">
            <button
              className="btn btn-primary"
              onClick={loadWorksheets}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          <ul className="nav nav-tabs mb-3">
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'pending' ? 'active' : ''}`}
                onClick={() => setActiveTab('pending')}
              >
                Pending ({pendingWorksheets.length})
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'inprogress' ? 'active' : ''}`}
                onClick={() => setActiveTab('inprogress')}
              >
                In Progress ({inProgressWorksheets.length})
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'intersections' ? 'active' : ''}`}
                onClick={() => setActiveTab('intersections')}
              >
                Intersections ({intersections.length})
              </button>
            </li>
          </ul>

          <div>
            {activeTab === 'pending' && renderPendingWorksheets()}
            {activeTab === 'inprogress' && renderInProgressWorksheets()}
            {activeTab === 'intersections' && renderIntersections()}
          </div>
        </>
      )}
    </div>
  );
}
