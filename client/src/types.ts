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
    dnaProcess?: DnaProcess | null;
}

export interface Workflow {
    id: number;
    name: string;
    createdByUser?: User | null;
    workflowProcesses?: WorkflowProcess[];
}