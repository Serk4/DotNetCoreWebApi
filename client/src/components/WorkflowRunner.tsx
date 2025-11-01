import React, { useEffect, useState } from 'react';
import WorkflowsApi from '../api/workflows';
import WorksheetsApi from '../api/worksheets';
import UsersApi from '../api/users';
import { Workflow, User } from '../types';

export default function WorkflowRunner(): JSX.Element {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<number | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [analystId, setAnalystId] = useState<number | null>(null);
  const [runName, setRunName] = useState<string>('Demo Run');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    WorkflowsApi.list()
      .then(list => mounted && setWorkflows(list || []))
      .catch(() => mounted && setWorkflows([]));
    UsersApi.list()
      .then(list => {
        if (!mounted) return;
        setUsers(list || []);
        if (list && list.length) setAnalystId(id => id ?? list[0].id);
      })
      .catch(() => mounted && setUsers([]));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!selectedWorkflowId) { setSelectedWorkflow(null); return; }
    WorkflowsApi.get(selectedWorkflowId)
      .then(w => setSelectedWorkflow(w))
      .catch(() => setSelectedWorkflow(null));
  }, [selectedWorkflowId]);

  async function handleCreateRun() {
    if (!selectedWorkflowId || !analystId) {
      setError('Select a workflow and an analyst first.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await WorksheetsApi.createRunFromWorkflow({
        runName,
        workflowId: selectedWorkflowId,
        analystId
      });
      setResult(res);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create run');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 12 }}>
      <h3>Run a Workflow (Generate Worksheets)</h3>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <div>
          <label>Workflow</label><br />
          <select value={selectedWorkflowId ?? ''} onChange={e => setSelectedWorkflowId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">-- choose workflow --</option>
            {workflows.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>

        <div>
          <label>Analyst</label><br />
          <select value={analystId ?? ''} onChange={e => setAnalystId(Number(e.target.value))}>
            <option value="">-- choose analyst --</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.userName}</option>)}
          </select>
        </div>

        <div>
          <label>Run Name</label><br />
          <input value={runName} onChange={e => setRunName(e.target.value)} />
        </div>

        <div style={{ alignSelf: 'flex-end' }}>
          <button onClick={handleCreateRun} disabled={loading}>
            {loading ? 'Creating…' : 'Create Run'}
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <h4>Selected Workflow Preview</h4>
        {selectedWorkflow ? (
          <ol>
            {selectedWorkflow.workflowProcesses?.sort((a,b)=>a.processOrder - b.processOrder).map(wp => (
              <li key={wp.id}>{wp.dnaProcess?.name ?? `Process ${wp.dnaProcessId}`}</li>
            )) ?? <li className="text-muted">No processes</li>}
          </ol>
        ) : <div className="text-muted">No workflow selected</div>}
      </div>

      {error && <div style={{ color: 'crimson', marginBottom: 8 }}>{error}</div>}

      {result && (
        <div style={{ marginTop: 12 }}>
          <h4>Run Created</h4>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}