import axios from 'axios';
import { Worksheet, WorkflowIntersection, WorksheetStatus } from '../types';

const apiBase = (process.env.REACT_APP_API_BASE ?? 'https://localhost:7049/api').replace(/\/$/, '');
const endpoint = `${apiBase}/worksheets`;

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

export interface CreateRunFromWorkflowResponse {
  workflowGroupId: number;
  workflowRunName: string;
  worksheetIds: number[];
}

export interface StartWorksheetResponse {
  id: number;
  status: WorksheetStatus;
  startAt: string;
}

export interface CompleteWorksheetResponse {
  completedWorksheetId: number;
  nextWorksheetId?: number;
  nextWorksheetName?: string;
  message: string;
}

export async function createRunFromWorkflow(payload: CreateRunFromWorkflowPayload): Promise<CreateRunFromWorkflowResponse> {
  try {
    const res = await axios.post(`${endpoint}/run`, payload);
    return res.data;
  } catch (e) {
    handleAxiosError(e);
  }
}

export async function getPendingWorksheets(analystId?: number): Promise<Worksheet[]> {
  try {
    const url = analystId ? `${endpoint}/pending?analystId=${analystId}` : `${endpoint}/pending`;
    const res = await axios.get(url);
    return res.data;
  } catch (e) {
    handleAxiosError(e);
  }
}

export async function getInProgressWorksheets(analystId?: number): Promise<Worksheet[]> {
  try {
    const url = analystId ? `${endpoint}/inprogress?analystId=${analystId}` : `${endpoint}/inprogress`;
    const res = await axios.get(url);
    return res.data;
  } catch (e) {
    handleAxiosError(e);
  }
}

export async function startWorksheet(id: number): Promise<StartWorksheetResponse> {
  try {
    const res = await axios.post(`${endpoint}/${id}/start`);
    return res.data;
  } catch (e) {
    handleAxiosError(e);
  }
}

export async function completeWorksheet(id: number): Promise<CompleteWorksheetResponse> {
  try {
    const res = await axios.post(`${endpoint}/${id}/complete`);
    return res.data;
  } catch (e) {
    handleAxiosError(e);
  }
}

export async function getIntersections(): Promise<WorkflowIntersection[]> {
  try {
    const res = await axios.get(`${endpoint}/intersections`);
    return res.data;
  } catch (e) {
    handleAxiosError(e);
  }
}

const WorksheetsApi = {
  createRunFromWorkflow,
  getPendingWorksheets,
  getInProgressWorksheets,
  startWorksheet,
  completeWorksheet,
  getIntersections
};

export default WorksheetsApi;