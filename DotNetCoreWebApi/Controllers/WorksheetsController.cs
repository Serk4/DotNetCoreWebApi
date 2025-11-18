using System;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DotNetCoreWebApi.Data;
using DotNetCoreWebApi.Models;

namespace DotNetCoreWebApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WorksheetsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        public WorksheetsController(ApplicationDbContext context) => _context = context;

        // GET: api/worksheets
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetWorksheets()
        {
            var list = await _context.Worksheets
                .Include(w => w.DnaProcess)
                .Include(w => w.Analyst)
                .Select(w => new
                {
                    w.Id,
                    w.Name,
                    Analyst = new { w.Analyst.Id, w.Analyst.UserName },
                    DnaProcess = new { w.DnaProcess.Id, w.DnaProcess.Name },
                    w.Status,
                    w.StartAt
                })
                .ToListAsync();

            return Ok(list);
        }

        // GET: api/worksheets/{id}
        [HttpGet("{id:int}")]
        public async Task<ActionResult<object>> GetWorksheet(int id)
        {
            var w = await _context.Worksheets
                .Include(x => x.DnaProcess)
                .Include(x => x.Analyst)
                .Where(x => x.Id == id)
                .Select(x => new
                {
                    x.Id,
                    x.Name,
                    Analyst = new { x.Analyst.Id, x.Analyst.UserName },
                    DnaProcess = new { x.DnaProcess.Id, x.DnaProcess.Name },
                    x.Status,
                    x.StartAt
                })
                .FirstOrDefaultAsync();

            if (w == null) return NotFound();
            return Ok(w);
        }

        public class CreateWorksheetDto
        {
            public string Name { get; set; } = string.Empty;
            public int AnalystId { get; set; }
            public int DnaProcessId { get; set; }
        }

        // POST: api/worksheets
        [HttpPost]
        public async Task<ActionResult<object>> PostWorksheet([FromBody] CreateWorksheetDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            // Validate analyst and dna process exist
            if (!await _context.Users.AnyAsync(u => u.Id == dto.AnalystId))
                return BadRequest($"Analyst {dto.AnalystId} not found");
            if (!await _context.DnaProcesses.AnyAsync(dp => dp.Id == dto.DnaProcessId))
                return BadRequest($"DnaProcess {dto.DnaProcessId} not found");

            var ws = new Worksheet
            {
                Name = dto.Name,
                AnalystId = dto.AnalystId,
                DnaProcessId = dto.DnaProcessId,
                Status = WorksheetStatus.Pending
            };

            _context.Worksheets.Add(ws);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetWorksheet), new { id = ws.Id }, new { ws.Id, ws.Name });
        }

        // DTO for creating a run following a workflow template
        public class CreateRunFromWorkflowDto
        {
            public string RunName { get; set; } = string.Empty; // base name for worksheets
            public int WorkflowId { get; set; }
            public int AnalystId { get; set; }
        }

        // POST: api/worksheets/run
        // Creates a WorkflowGroup (the run) and Worksheets for each step in the Workflow template.
        [HttpPost("run")]
        public async Task<IActionResult> CreateRunFromWorkflow([FromBody] CreateRunFromWorkflowDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            // Validate workflow and analyst
            var workflow = await _context.Workflows
                .Include(w => w.WorkflowProcesses)
                    .ThenInclude(wp => wp.DnaProcess)
                .FirstOrDefaultAsync(w => w.Id == dto.WorkflowId);

            if (workflow == null) return BadRequest($"Workflow {dto.WorkflowId} not found");
            if (!await _context.Users.AnyAsync(u => u.Id == dto.AnalystId))
                return BadRequest($"Analyst {dto.AnalystId} not found");

            var orderedProcesses = workflow.WorkflowProcesses
                .OrderBy(wp => wp.ProcessOrder)
                .ToList();

            if (!orderedProcesses.Any())
                return BadRequest("Workflow has no processes defined");

            await using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                // Create WorkflowGroup to represent this run; store the RunName
                var group = new WorkflowGroup
                {
                    WorkflowId = workflow.Id,
                    RunName = dto.RunName ?? string.Empty
                };
                _context.WorkflowGroups.Add(group);
                await _context.SaveChangesAsync(); // get group.Id

                var createdWorksheetIds = new List<int>();
                var wwgEntries = new List<WorksheetWorkflowGroup>();

                // Create a Worksheet per workflow process and link it to the group
                foreach (var wp in orderedProcesses)
                {
                    var worksheet = new Worksheet
                    {
                        Name = $"{dto.RunName} - {wp.DnaProcess.Name}",
                        AnalystId = dto.AnalystId,
                        DnaProcessId = wp.DnaProcessId,
                        Status = WorksheetStatus.Pending
                    };
                    _context.Worksheets.Add(worksheet);
                    await _context.SaveChangesAsync(); // persist to get id

                    createdWorksheetIds.Add(worksheet.Id);

                    wwgEntries.Add(new WorksheetWorkflowGroup
                    {
                        WorksheetId = worksheet.Id,
                        WorkflowGroupId = group.Id,
                        StepOrder = wp.ProcessOrder
                    });
                }

                if (wwgEntries.Count > 0)
                {
                    _context.WorksheetWorkflowGroups.AddRange(wwgEntries);
                    await _context.SaveChangesAsync();
                }

                await tx.CommitAsync();

                return Created(string.Empty, new
                {
                    WorkflowGroupId = group.Id,
                    WorkflowRunName = group.RunName,
                    WorksheetIds = createdWorksheetIds
                });
            }
            catch (Exception)
            {
                await tx.RollbackAsync();
                return StatusCode(500, "Failed to create run from workflow");
            }
        }

        // POST: api/worksheets/{id}/start
        // Mark the worksheet as started and create process-specific row when analyst starts work.
        [HttpPost("{id:int}/start")]
        public async Task<IActionResult> StartWorksheetProcess(int id)
        {
            // Load worksheet + its dna process
            var worksheet = await _context.Worksheets
                .Include(w => w.DnaProcess)
                .FirstOrDefaultAsync(w => w.Id == id);

            if (worksheet == null) return NotFound($"Worksheet {id} not found");

            if (worksheet.Status == WorksheetStatus.InProgress)
                return Conflict("Worksheet already in progress");
            if (worksheet.Status == WorksheetStatus.Completed)
                return Conflict("Worksheet already completed");

            var pname = worksheet.DnaProcess?.Name?.Trim().ToLowerInvariant();
            if (string.IsNullOrEmpty(pname)) return BadRequest("Worksheet has no process defined");

            // Start: set StartAt and Status
            worksheet.StartAt = DateTime.UtcNow;
            worksheet.Status = WorksheetStatus.InProgress;

            // Ensure we don't create duplicate process rows
            switch (pname)
            {
                case "extraction":
                    if (await _context.Extractions.AnyAsync(e => e.WorksheetId == id))
                        return Conflict("Extraction already started for this worksheet");

                    var extraction = new Extraction { WorksheetId = id, Prop1 = 0, Prop2 = 0 };
                    _context.Extractions.Add(extraction);
                    await _context.SaveChangesAsync();
                    break;

                case "amplification":
                    if (await _context.Amplifications.AnyAsync(a => a.WorksheetId == id))
                        return Conflict("Amplification already started for this worksheet");

                    var amplification = new Amplification { WorksheetId = id, Prop1 = 0, Prop2 = 0 };
                    _context.Amplifications.Add(amplification);
                    await _context.SaveChangesAsync();
                    break;

                case "quantification":
                    if (await _context.Quantifications.AnyAsync(q => q.WorksheetId == id))
                        return Conflict("Quantification already started for this worksheet");

                    var quant = new Quantification { WorksheetId = id, Prop1 = 0, Prop2 = 0 };
                    _context.Quantifications.Add(quant);
                    await _context.SaveChangesAsync();
                    break;

                default:
                    // Unknown process types: revert status change and return 400
                    worksheet.StartAt = null;
                    worksheet.Status = WorksheetStatus.Pending;
                    return BadRequest($"Unsupported process type: {worksheet.DnaProcess?.Name}");
            }

            // persist worksheet status/start time
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetWorksheet), new { id = worksheet.Id }, new { worksheet.Id, worksheet.Status, worksheet.StartAt });
        }

        // POST: api/worksheets/{id}/complete
        // Mark worksheet as completed and automatically create next worksheet in the workflow
        [HttpPost("{id:int}/complete")]
        public async Task<IActionResult> CompleteWorksheet(int id)
        {
            var worksheet = await _context.Worksheets
                .Include(w => w.WorksheetWorkflowGroups)
                    .ThenInclude(wwg => wwg.WorkflowGroup)
                        .ThenInclude(wg => wg.Workflow)
                            .ThenInclude(wf => wf.WorkflowProcesses)
                                .ThenInclude(wp => wp.DnaProcess)
                .FirstOrDefaultAsync(w => w.Id == id);

            if (worksheet == null) return NotFound($"Worksheet {id} not found");

            if (worksheet.Status == WorksheetStatus.Completed)
                return Conflict("Worksheet already completed");

            // Mark as completed
            worksheet.Status = WorksheetStatus.Completed;
            await _context.SaveChangesAsync();

            // Find the next process in the workflow and create its worksheet
            var wwg = worksheet.WorksheetWorkflowGroups.FirstOrDefault();
            if (wwg != null)
            {
                var workflow = wwg.WorkflowGroup.Workflow;
                var currentStepOrder = wwg.StepOrder;
                
                // Find next process in workflow
                var nextProcess = workflow.WorkflowProcesses
                    .Where(wp => wp.ProcessOrder > currentStepOrder)
                    .OrderBy(wp => wp.ProcessOrder)
                    .FirstOrDefault();

                if (nextProcess != null)
                {
                    // Create next worksheet
                    var nextWorksheet = new Worksheet
                    {
                        Name = $"{wwg.WorkflowGroup.RunName} - {nextProcess.DnaProcess.Name}",
                        AnalystId = worksheet.AnalystId,
                        DnaProcessId = nextProcess.DnaProcessId,
                        Status = WorksheetStatus.Pending
                    };
                    _context.Worksheets.Add(nextWorksheet);
                    await _context.SaveChangesAsync();

                    // Link to the same workflow group
                    var nextWwg = new WorksheetWorkflowGroup
                    {
                        WorksheetId = nextWorksheet.Id,
                        WorkflowGroupId = wwg.WorkflowGroupId,
                        StepOrder = nextProcess.ProcessOrder
                    };
                    _context.WorksheetWorkflowGroups.Add(nextWwg);
                    await _context.SaveChangesAsync();

                    return Ok(new
                    {
                        CompletedWorksheetId = id,
                        NextWorksheetId = nextWorksheet.Id,
                        NextWorksheetName = nextWorksheet.Name,
                        Message = "Worksheet completed and next worksheet created"
                    });
                }
            }

            return Ok(new
            {
                CompletedWorksheetId = id,
                Message = "Worksheet completed (final step in workflow)"
            });
        }

        // GET: api/worksheets/pending?analystId={id}
        // Get pending worksheets for a specific analyst
        [HttpGet("pending")]
        public async Task<ActionResult<IEnumerable<object>>> GetPendingWorksheets([FromQuery] int? analystId)
        {
            var query = _context.Worksheets
                .Include(w => w.DnaProcess)
                .Include(w => w.Analyst)
                .Include(w => w.WorksheetWorkflowGroups)
                    .ThenInclude(wwg => wwg.WorkflowGroup)
                .Where(w => w.Status == WorksheetStatus.Pending);

            if (analystId.HasValue)
            {
                query = query.Where(w => w.AnalystId == analystId.Value);
            }

            var list = await query
                .Select(w => new
                {
                    w.Id,
                    w.Name,
                    Analyst = new { w.Analyst.Id, w.Analyst.UserName },
                    DnaProcess = new { w.DnaProcess.Id, w.DnaProcess.Name },
                    w.Status,
                    w.StartAt,
                    WorkflowGroup = w.WorksheetWorkflowGroups.FirstOrDefault() != null
                        ? new
                        {
                            Id = w.WorksheetWorkflowGroups.FirstOrDefault()!.WorkflowGroup.Id,
                            RunName = w.WorksheetWorkflowGroups.FirstOrDefault()!.WorkflowGroup.RunName,
                            StepOrder = w.WorksheetWorkflowGroups.FirstOrDefault()!.StepOrder
                        }
                        : null
                })
                .OrderBy(w => w.WorkflowGroup != null ? w.WorkflowGroup.StepOrder : 999)
                .ToListAsync();

            return Ok(list);
        }

        // GET: api/worksheets/inprogress?analystId={id}
        // Get in-progress worksheets for a specific analyst
        [HttpGet("inprogress")]
        public async Task<ActionResult<IEnumerable<object>>> GetInProgressWorksheets([FromQuery] int? analystId)
        {
            var query = _context.Worksheets
                .Include(w => w.DnaProcess)
                .Include(w => w.Analyst)
                .Include(w => w.WorksheetWorkflowGroups)
                    .ThenInclude(wwg => wwg.WorkflowGroup)
                .Where(w => w.Status == WorksheetStatus.InProgress);

            if (analystId.HasValue)
            {
                query = query.Where(w => w.AnalystId == analystId.Value);
            }

            var list = await query
                .Select(w => new
                {
                    w.Id,
                    w.Name,
                    Analyst = new { w.Analyst.Id, w.Analyst.UserName },
                    DnaProcess = new { w.DnaProcess.Id, w.DnaProcess.Name },
                    w.Status,
                    w.StartAt,
                    WorkflowGroup = w.WorksheetWorkflowGroups.FirstOrDefault() != null
                        ? new
                        {
                            Id = w.WorksheetWorkflowGroups.FirstOrDefault()!.WorkflowGroup.Id,
                            RunName = w.WorksheetWorkflowGroups.FirstOrDefault()!.WorkflowGroup.RunName,
                            StepOrder = w.WorksheetWorkflowGroups.FirstOrDefault()!.StepOrder
                        }
                        : null
                })
                .OrderBy(w => w.StartAt)
                .ToListAsync();

            return Ok(list);
        }

        // GET: api/worksheets/intersections
        // Find potential workflow intersections where multiple worksheets use the same DNA process
        [HttpGet("intersections")]
        public async Task<ActionResult<IEnumerable<object>>> GetWorkflowIntersections()
        {
            // Find worksheets that are pending or in progress with the same DNA process
            var worksheets = await _context.Worksheets
                .Include(w => w.DnaProcess)
                .Include(w => w.Analyst)
                .Include(w => w.WorksheetWorkflowGroups)
                    .ThenInclude(wwg => wwg.WorkflowGroup)
                        .ThenInclude(wg => wg.Workflow)
                .Where(w => w.Status == WorksheetStatus.Pending || w.Status == WorksheetStatus.InProgress)
                .ToListAsync();

            // Group by DNA process to find intersections
            var intersections = worksheets
                .GroupBy(w => w.DnaProcessId)
                .Where(g => g.Count() > 1) // Only processes with multiple worksheets
                .Select(g => new
                {
                    DnaProcessId = g.Key,
                    DnaProcessName = g.First().DnaProcess.Name,
                    WorksheetCount = g.Count(),
                    Worksheets = g.Select(w => new
                    {
                        w.Id,
                        w.Name,
                        Analyst = new { w.Analyst.Id, w.Analyst.UserName },
                        w.Status,
                        w.StartAt,
                        WorkflowGroup = w.WorksheetWorkflowGroups.FirstOrDefault() != null
                            ? new
                            {
                                Id = w.WorksheetWorkflowGroups.FirstOrDefault()!.WorkflowGroup.Id,
                                RunName = w.WorksheetWorkflowGroups.FirstOrDefault()!.WorkflowGroup.RunName,
                                WorkflowName = w.WorksheetWorkflowGroups.FirstOrDefault()!.WorkflowGroup.Workflow.Name
                            }
                            : null
                    }).ToList(),
                    PotentialSavings = "Can batch process multiple samples together"
                })
                .ToList();

            return Ok(intersections);
        }
    }
}