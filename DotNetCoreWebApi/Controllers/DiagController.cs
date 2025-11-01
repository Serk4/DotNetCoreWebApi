using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DotNetCoreWebApi.Data;
using DotNetCoreWebApi.Models;

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
        public async Task<IActionResult> Showdown()
        {
            var swOpt = Stopwatch.StartNew();
            var optimized = await _context.Workflows
                .Include(w => w.WorkflowProcesses!)
                    .ThenInclude(wp => wp.DnaProcess!)
                .Select(w => new
                {
                    w.Id,
                    w.Name,
                    Processes = w.WorkflowProcesses!.OrderBy(wp => wp.ProcessOrder)
                        .Select(wp => new { wp.Id, wp.ProcessOrder, DnaProcessName = wp.DnaProcess.Name })
                })
                .ToListAsync();
            swOpt.Stop();

            var swNaive = Stopwatch.StartNew();
            var workflows = await _context.Workflows.ToListAsync();
            var naiveCount = 0;
            foreach (var w in workflows)
            {
                var wps = await _context.WorkflowProcesses.Where(wp => wp.WorkflowId == w.Id).ToListAsync();
                foreach (var wp in wps)
                {
                    var dp = await _context.DnaProcesses.FirstOrDefaultAsync(d => d.Id == wp.DnaProcessId);
                    if (dp != null) naiveCount++;
                }
            }
            swNaive.Stop();

            return Ok(new
            {
                optimized = new { durationMs = swOpt.ElapsedMilliseconds, workflowCount = optimized.Count, processLinks = optimized.Sum(w => w.Processes.Count()) },
                naive = new { durationMs = swNaive.ElapsedMilliseconds, workflowCount = workflows.Count, processLinks = naiveCount }
            });
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