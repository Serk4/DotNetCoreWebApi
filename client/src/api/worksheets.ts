import axios from 'axios';

const apiBase = (process.env.REACT_APP_API_URL ?? 'https://localhost:7049').replace(/\/$/, '');
const endpoint = `${apiBase}/api/worksheets`;

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

export type CreateRunFromWorkflowPayload = {
  runName?: string;
  workflowId: number;
  analystId: number;
};

export async function createRunFromWorkflow(payload: CreateRunFromWorkflowPayload): Promise<{ workflowGroupId: number; workflowRunName: string; worksheetIds: number[] }> {
  try {
    const res = await axios.post(`${endpoint}/run`, payload);
    return res.data;
  } catch (e) {
    handleAxiosError(e);
  }
}

const WorksheetsApi = {
  createRunFromWorkflow
};

export default WorksheetsApi;