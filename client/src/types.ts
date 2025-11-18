export interface User {
    id: number;
    userName: string;
    email: string;
    userType: number; // 0=Admin, 1=Technician, 2=Analyst
}

export interface DnaProcess {
    id: number;
    name: string;
    createdByUser?: User | null;
}

export interface WorkflowProcess {
    id: number;
    processOrder: number;
    dnaProcessId?: number;
    dnaProcess?: DnaProcess | null;
}

export interface Workflow {
    id: number;
    name: string;
    createdByUser?: User | null;
    workflowProcesses?: WorkflowProcess[];
}

export enum WorksheetStatus {
    Pending = 0,
    InProgress = 1,
    Completed = 2
}

export interface Worksheet {
    id: number;
    name: string;
    analyst: { id: number; userName: string };
    dnaProcess: { id: number; name: string };
    status: WorksheetStatus;
    startAt?: string | null;
    workflowGroup?: {
        id: number;
        runName: string;
        stepOrder?: number;
        workflowName?: string;
    } | null;
}

export interface WorkflowIntersection {
    dnaProcessId: number;
    dnaProcessName: string;
    worksheetCount: number;
    worksheets: Worksheet[];
    potentialSavings: string;
}