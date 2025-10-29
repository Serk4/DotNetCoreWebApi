import axios from 'axios';
import { Workflow } from '../types';

const apiBase = (process.env.REACT_APP_API_URL ?? 'https://localhost:7049').replace(/\/$/, '');
const workflowsEndpoint = `${apiBase}/api/workflows`;

type CreateWorkflowPayload = { name: string; createdBy: number };
type UpdateWorkflowPayload = CreateWorkflowPayload & { id: number };

function handleAxiosError(e: unknown): never {
  if (axios.isAxiosError(e)) {
    const msg =
      (e.response && (e.response.data as any)?.message) ||
      (e.response && JSON.stringify(e.response.data)) ||
      e.message ||
      'Network error';
    throw new Error(msg);
  }
  throw new Error(String(e));
}

export async function listWorkflows(): Promise<Workflow[]> {
  try {
    const res = await axios.get<Workflow[]>(workflowsEndpoint);
    return res.data;
  } catch (e) {
    handleAxiosError(e);
  }
}

export async function getWorkflow(id: number): Promise<Workflow> {
  try {
    const res = await axios.get<Workflow>(`${workflowsEndpoint}/${id}`);
    return res.data;
  } catch (e) {
    handleAxiosError(e);
  }
}

export async function createWorkflow(payload: CreateWorkflowPayload): Promise<Workflow> {
  try {
    const res = await axios.post<Workflow>(workflowsEndpoint, payload);
    return res.data;
  } catch (e) {
    handleAxiosError(e);
  }
}

export async function updateWorkflow(payload: UpdateWorkflowPayload | any): Promise<void> {
  try {
    await axios.put(`${workflowsEndpoint}/${payload.id}`, payload);
  } catch (e) {
    handleAxiosError(e);
  }
}

export async function deleteWorkflow(id: number): Promise<void> {
  try {
    await axios.delete(`${workflowsEndpoint}/${id}`);
  } catch (e) {
    handleAxiosError(e);
  }
}

// Adds a single dna process to a workflow (existing)
export async function addProcess(workflowId: number, dnaProcessId: number, processOrder: number): Promise<void> {
  try {
    await axios.post(
      `${workflowsEndpoint}/${workflowId}/add-process?dnaProcessId=${dnaProcessId}&processOrder=${processOrder}`
    );
  } catch (e) {
    handleAxiosError(e);
  }
}

// New: replace the workflow's ordered process list atomically
export async function replaceProcesses(workflowId: number, dnaProcessIds: number[]): Promise<void> {
  try {
    await axios.put(`${workflowsEndpoint}/${workflowId}/processes`, { dnaProcessIds });
  } catch (e) {
    handleAxiosError(e);
  }
}

const WorkflowsApi = {
  list: listWorkflows,
  get: getWorkflow,
  create: createWorkflow,
  update: updateWorkflow,
  remove: deleteWorkflow,
  addProcess,
  replaceProcesses
};

export default WorkflowsApi;