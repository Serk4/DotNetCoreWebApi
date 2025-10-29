import axios from 'axios';
import { DnaProcess } from '../types';

const apiBase = (process.env.REACT_APP_API_URL ?? 'https://localhost:7049').replace(/\/$/, '');
const endpoint = `${apiBase}/api/dnaprocesses`;

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

export async function listDnaProcesses(): Promise<DnaProcess[]> {
  try {
    const res = await axios.get<DnaProcess[]>(endpoint);
    return res.data;
  } catch (e) {
    handleAxiosError(e);
  }
}

const DnaProcessesApi = {
  list: listDnaProcesses
};

export default DnaProcessesApi;