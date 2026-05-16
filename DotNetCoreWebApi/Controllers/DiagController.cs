using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DotNetCoreWebApi.Data;

namespace DotNetCoreWebApi.Controllers
{
    [ApiController]
    [Route("api/diag")]
    public class DiagController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        public DiagController(ApplicationDbContext context) => _context = context;

        [HttpGet("mermaid")]
        public IActionResult GetMermaidDiagrams()
        {
            var legacy = @"
                graph LR
                  UserB[""User - nvarchar PK\nusername""] --> WorkflowB[""workflow - int PK\ncreatedBy nvarchar (String Mismatch!)""] 
                  WorkflowB --> WPB[""workflowProcess\nprocessCode nvarchar (Half-Ref to DnaProcess)""] 
                  WPB --> DPB[""DnaProcess - nvarchar PK\nUnderused""] 
                  WorkflowB --> WWLB[""WorksheetWorkflowLink\nGeneric worksheetId int\nprocessCode nvarchar Ref""] 
                  WWLB -.->|""String Checks""| ExtractionB[""extraction Silo + Dupes\nex_Prop1""] 
                  WWLB -.->|""String Checks""| AmplificationB[""amplification Silo + Dupes\nam_Prop1""] 
                ";
            var normalized = @"
                graph LR
                  UserG[""Users - int PK""] --> WorkflowG[""Workflows\nCreatedBy int FK""] 
                  WorkflowG --> WPG[""WorkflowProcesses\nDnaProcessId int FK""] 
                  WPG --> DPG[""DnaProcesses - int PK Ref""] 
                  WorkflowG --> WsG[""Worksheets""] 
                  WsG --> WWGG[""WorksheetWorkflowGroups\nTyped FKs""] 
                ";
            return Ok(new { legacy, normalized });
        }

        [HttpGet("showdown")]
        public async Task<ActionResult<ShowdownResult>> Showdown()
        {
            var result = new ShowdownResult();

            //
            // Optimized approach: single query that eagerly loads the graph once,
            // then compute metrics in-memory. This demonstrates the "one shot" pattern.
            //
            var optimizedStopwatch = Stopwatch.StartNew();
            int queryCountOptimized = 0;

            var optimizedWorkflows = await _context.Workflows
                .Include(w => w.WorkflowGroups!)
                    .ThenInclude(g => g.WorksheetWorkflowGroups!)
                        .ThenInclude(wwg => wwg.Worksheet!)
                            .ThenInclude(ws => ws.DnaProcess)
                .Include(w => w.WorkflowProcesses!)
                    .ThenInclude(wp => wp.DnaProcess)
                .ToListAsync();

            queryCountOptimized = 1; // single DB roundtrip for the fetch above
            optimizedStopwatch.Stop();

            var optimizedProcessLinks = optimizedWorkflows.Sum(w =>
                (w.WorkflowProcesses?.Count(wp => wp.DnaProcess != null) ?? 0)
                + (w.WorkflowGroups?.Sum(g => g.WorksheetWorkflowGroups?.Count(wwg => wwg.Worksheet != null && wwg.Worksheet.DnaProcess != null) ?? 0) ?? 0)
            );

            result.Optimized = new ApproachMetrics
            {
                QueryCount = queryCountOptimized,
                OperationCount = optimizedWorkflows.Count + optimizedProcessLinks, // simple composite op metric
                WorkflowCount = optimizedWorkflows.Count,
                ProcessLinks = optimizedProcessLinks,
                DurationMs = optimizedStopwatch.ElapsedMilliseconds
            };

            //
            // Naive approach: simulate N+1 style runaround by issuing many small queries.
            // We count every DB call into queryCountNaive so the user can see how query count explodes.
            //
            var naiveStopwatch = Stopwatch.StartNew();
            int queryCountNaive = 0;
            int totalProcessLinks = 0;
            int totalOps = 0;

            var allWorkflows = await _context.Workflows.ToListAsync();
            queryCountNaive++; // fetched workflows

            foreach (var workflow in allWorkflows)
            {
                // fetch groups for this workflow (N queries)
                var groups = await _context.WorkflowGroups.Where(g => g.WorkflowId == workflow.Id).ToListAsync();
                queryCountNaive++;

                foreach (var group in groups)
                {
                    // fetch worksheet links for the group (N * M queries)
                    var wwgList = await _context.WorksheetWorkflowGroups.Where(wwg => wwg.WorkflowGroupId == group.Id).ToListAsync();
                    queryCountNaive++;

                    foreach (var wwg in wwgList)
                    {
                        // fetch worksheet individually (another query per link)
                        var worksheet = await _context.Worksheets.FindAsync(wwg.WorksheetId);
                        queryCountNaive++;
                        if (worksheet == null) continue;

                        // fetch dna process individually for that worksheet (simulate legacy lookup)
                        var dp = await _context.DnaProcesses.FirstOrDefaultAsync(p => p.Id == worksheet.DnaProcessId);
                        queryCountNaive++;
                        if (dp != null) totalProcessLinks++;

                        totalOps++; // count this per-worksheet lookup as an operation
                    }
                }
            }

            naiveStopwatch.Stop();

            result.Naive = new ApproachMetrics
            {
                QueryCount = queryCountNaive,
                OperationCount = totalOps,
                WorkflowCount = allWorkflows.Count,
                ProcessLinks = totalProcessLinks,
                DurationMs = naiveStopwatch.ElapsedMilliseconds
            };

            // Return a mermaid flowchart + numeric metrics for client-side rendering
            result.MermaidDiagram = GenerateRunaroundDiagram(result);

            return Ok(result);
        }

        private string GenerateRunaroundDiagram(ShowdownResult result)
        {
            // Simple mermaid flowchart showing query explosion and counts.
            // The client can render this with a mermaid renderer or convert to an image.
            return $@"
    flowchart TD
        A[Start: Fetch Workflows] --> B{{Choose approach}}
        B -->|Optimized| C[One query: includes + projection]
        C --> D[Workflows: {result.Optimized.WorkflowCount}]
        D --> E[Process links found: {result.Optimized.ProcessLinks}]
        E --> F[Queries: {result.Optimized.QueryCount}]
        
        B -->|Naive| G[Many small queries (N+1 style)]
        G --> H[Workflows: {result.Naive.WorkflowCount}]
        H --> I[Process links found: {result.Naive.ProcessLinks}]
        I --> J[Queries: {result.Naive.QueryCount}]
        J --> K[Operations: {result.Naive.OperationCount}]
        
        style C fill:#E6FFEA,stroke:#2E7D32
        style I fill:#FFECEC,stroke:#C62828
    ";
        }

        public class ShowdownResult
        {
            public ApproachMetrics Optimized { get; set; }
            public ApproachMetrics Naive { get; set; }
            public string MermaidDiagram { get; set; }
        }

        public class ApproachMetrics
        {
            public int QueryCount { get; set; }
            public int OperationCount { get; set; }
            public int WorkflowCount { get; set; }
            public int ProcessLinks { get; set; }
            public long DurationMs { get; set; } // optional timing for completeness
        }

        [HttpDelete("workflow/{id:int}")]
        public async Task<IActionResult> SafeDeleteWorkflow(int id)
        {
            var workflow = await _context.Workflows
                .Include(w => w.WorkflowProcesses)
                .FirstOrDefaultAsync(w => w.Id == id);
            if (workflow == null) return NotFound();

            if (workflow.WorkflowProcesses?.Any() == true)
                _context.WorkflowProcesses.RemoveRange(workflow.WorkflowProcesses);

            _context.Workflows.Remove(workflow);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}