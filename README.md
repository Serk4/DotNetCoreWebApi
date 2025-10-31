# DNA Workflow API Showcase
![Schema Score](https://img.shields.io/badge/Normalization-3NF%2B-green)

![DNA](dna-6883239_small.jpg)

This repository demonstrates a scalable database schema and RESTful API for managing DNA lab workflows, built with .NET 9, Entity Framework Core, and SQL Server. The goal is to showcase **data modeling for complex lab processes** (e.g., ordered sequences of extraction, amplification, quantification), **RESTful endpoints** for CRUD and custom operations, and future integration with a modern frontend like **React** (my first dive into it!).

Inspired by real-world lab management needs, this app lets users define reusable workflows, instantiate runs (groups), and track worksheets with process-specific props—all while handling sharing across users without duplication.

## Features
- **Scalable Schema**: Normalized design (3NF+) with junction tables for many-to-many relationships (e.g., workflows to processes, worksheets to groups). Supports n-user sharing of worksheets at varying orders via `StepOrder` per group.
- **RESTful APIs**: Full CRUD for Users, DnaProcesses, Workflows, and WorkflowGroups. Custom actions like adding processes to workflows with validation (no dups per WF). Endpoints use async EF queries with projections to avoid cycles.
- **Seeded Data**: Baseline with 4 users (Admin, Technicians, Analyst), 3 processes, 1 default workflow with ordered steps, and a sample run with worksheets/step props.
- **No Cascade Cycles**: FKs configured with `ON DELETE NO ACTION` to prevent SQL Server errors in complex deletes.
- **Future Frontend**: Planning a React single-page app for intuitive UI (e.g., drag-drop process sequencing, real-time run tracking). This repo focuses on backend; frontend branch coming soon!

## Frontend
The repository includes a React frontend stub in the `/client` folder to showcase API integration. It fetches and displays the seeded users in a simple table, demonstrating live data loading from the backend.

### How to Run the Frontend
1. **Install Dependencies** (in repo root):
cd client
npm install

2. **Start the React App**:
npm start
- Opens http://localhost:3000—shows the Users table populated from `/api/users`.
- Ensure the API is running (`dotnet run`) for data.

3. **Tech**: Create React App with TypeScript, Axios for API calls. Expandable for full UI (e.g., workflow builder).

See `/client/src/App.tsx` for the Users component. Future: Add forms for CRUD, routing, and styling (e.g., Material-UI).

## Schema Overview
The core is a hierarchical model:
- **Users**: Owners/analysts (with enum roles: Admin, Technician, Analyst).
- **DnaProcesses**: Reusable steps (e.g., Extraction with props like yield/purity).
- **Workflows**: Templates with ordered processes (via junction `WorkflowProcesses`).
- **WorkflowGroups**: Concrete runs/instances of workflows.
- **Worksheets**: Step instances linked to groups (many-to-many via `WorksheetWorkflowGroup` with `StepOrder` for per-run ordering).
- **Step Tables** (Extraction, Amplification, Quantification): Process-specific props (Prop1/Prop2 placeholders).

ERD (generated from dbdiagram.io):
[User] --(createdBy)--> [DnaProcess] <--(dnaProcessId)-- [Worksheet] --(worksheetId)--> [Extraction|Amplification|Quantification]
[User] --(createdBy)--> [Workflow] --(workflowId)--> [WorkflowGroup] --(workflowGroupId)--> [WorksheetWorkflowGroup] <--(worksheetId)-- [Worksheet]
[Workflow] --(workflowId)--> [WorkflowProcess] --(dnaProcessId)--> [DnaProcess]

See `dbdiagram.io` link in commit history for full DBML.

## API Endpoints
All at `/api/{controller}` (e.g., `/api/workflows`). Test in Swagger at `/swagger`.

| Controller | Method | Endpoint | Description |
|------------|--------|----------|-------------|
| **Users** | GET | /users | List all users. |
| | GET | /users/{id} | Get user by Id. |
| | POST | /users | Create user (e.g., {"userName": "newtech", "userType": 1}). |
| | PUT | /users/{id} | Update user (body Id must match path). |
| | DELETE | /users/{id} | Delete user. |
| **DnaProcesses** | GET | /dnaprocesses | List processes with creators. |
| | GET | /dnaprocesses/{id} | Get process by Id. |
| | POST | /dnaprocesses | Create process (e.g., {"name": "Sequencing", "createdBy": 1}). |
| | PUT/DELETE | /dnaprocesses/{id} | Update/delete. |
| **Workflows** | GET | /workflows | List workflows with ordered processes. |
| | GET | /workflows/{id} | Get workflow with ordered processes. |
| | POST | /workflows | Create workflow (e.g., {"name": "Test WF", "createdBy": 1}). |
| | POST | /workflows/{id}/add-process | Add single process (e.g., {"dnaProcessId": 1, "processOrder": 1}). |
| | PUT/DELETE | /workflows/{id} | Update/delete. |
| **WorkflowGroups** | GET | /workflowgroups/{id}/report | Ordered report of run (worksheets + processes). |

Swagger: [localhost:7049/swagger](https://localhost:7049/swagger) (dev mode).

## Tech Stack
- **Backend**: .NET 9, ASP.NET Core Web API, EF Core 8+ (code-first migrations).
- **Database**: SQL Server (LocalDB for dev; conn in appsettings.json).
- **Tools**: Swagger for docs/testing, dbdiagram.io for ERD.
- **Frontend**: React (with Axios for API calls, React Router for pages like Workflow Builder).

## How to Run
1. **Clone & Restore**:
2. git clone <your-repo-name.git>
cd DotNetCoreWebApi
dotnet restore

2. **Update DB** (runs migrations + seed):
dotnet ef database update

3. **Run Backend**:
dotnet run
   - API at `https://localhost:7049`.
- Swagger at `https://localhost:7049/swagger`.

4. **Run Frontend**:
cd client
npm install
npm start
- App at `http://localhost:3000`

5. **Test**: Use Swagger for API, React for UI. CORS enabled for local dev.

## Future Plans
- **React Frontend**: Expand to workflow builder (drag-drop processes), run dashboard, and real-time sharing.
- **Auth**: JWT with role-based access (e.g., Analysts only for worksheets).
- **Advanced**: Batch process addition, workflow validation (e.g., required steps), file uploads for lab data.
- **Deployment**: Docker + Azure/AWS for scalability.

## Contributing
Fork, branch, PR! Focus on schema tweaks, new endpoints, or React integration.

## License
MIT—free to use/fork for your lab apps or showcases.
