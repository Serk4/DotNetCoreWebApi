using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DotNetCoreWebApi.Data;
using DotNetCoreWebApi.Models;

namespace DotNetCoreWebApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WorkflowsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public WorkflowsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/workflows
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetWorkflows()
        {
            var workflows = await _context.Workflows
                .Include(w => w.CreatedByUser)
                .Select(w => new
                {
                    w.Id,
                    w.Name,
                    CreatedByUser = new { w.CreatedByUser.Id, w.CreatedByUser.UserName },
                    WorkflowProcesses = w.WorkflowProcesses.OrderBy(wp => wp.ProcessOrder).Select(wp => new
                    {
                        wp.Id,
                        wp.ProcessOrder,
                        DnaProcess = new { wp.DnaProcess.Id, wp.DnaProcess.Name }
                    })
                })
                .ToListAsync();

            return Ok(workflows);
        }

        // GET: api/workflows/5
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetWorkflow(int id)
        {
            var workflow = await _context.Workflows
                .Include(w => w.CreatedByUser)
                .Where(w => w.Id == id)
                .Select(w => new
                {
                    w.Id,
                    w.Name,
                    CreatedByUser = new { w.CreatedByUser.Id, w.CreatedByUser.UserName },
                    WorkflowProcesses = w.WorkflowProcesses.OrderBy(wp => wp.ProcessOrder).Select(wp => new
                    {
                        wp.Id,
                        wp.ProcessOrder,
                        DnaProcess = new { wp.DnaProcess.Id, wp.DnaProcess.Name }
                    })
                })
                .FirstOrDefaultAsync();

            if (workflow == null) return NotFound();
            return Ok(workflow);
        }

        // POST: api/workflows
        [HttpPost]
        public async Task<ActionResult<object>> PostWorkflow([FromBody] CreateWorkflowDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var workflow = new Workflow
            {
                Name = dto.Name,
                CreatedBy = dto.CreatedBy
            };
            _context.Workflows.Add(workflow);
            await _context.SaveChangesAsync();

            // Project response to avoid cycle
            var response = new
            {
                workflow.Id,
                workflow.Name,
                CreatedByUser = new { CreatedBy = dto.CreatedBy }  // Scalar only; load full via GET if needed
            };

            return CreatedAtAction(nameof(GetWorkflow), new { id = workflow.Id }, response);
        }

        // POST: api/workflows/{id}/add-process - Custom action for sequencing
        [HttpPost("{id}/add-process")]
        public async Task<IActionResult> AddProcessToWorkflow(int id, int dnaProcessId, int processOrder)
        {
            var workflow = await _context.Workflows.FindAsync(id);
            if (workflow == null) return NotFound();

            // Validate no dup process (uses unique index)
            if (await _context.WorkflowProcesses.AnyAsync(wp => wp.WorkflowId == id && wp.DnaProcessId == dnaProcessId))
                return BadRequest("Process already in workflow");

            var processLink = new WorkflowProcess
            {
                WorkflowId = id,
                DnaProcessId = dnaProcessId,
                ProcessOrder = processOrder
            };
            _context.WorkflowProcesses.Add(processLink);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // PUT: api/workflows/{id}/processes
        // Replace the workflow's ordered process list in a single request.
        [HttpPut("{id}/processes")]
        public async Task<IActionResult> ReplaceWorkflowProcesses(int id, [FromBody] ReplaceProcessesDto dto)
        {
            if (dto == null || dto.DnaProcessIds == null)
                return BadRequest("Payload missing");

            // Validate workflow exists
            var workflow = await _context.Workflows
                .Include(w => w.WorkflowProcesses)
                .FirstOrDefaultAsync(w => w.Id == id);

            if (workflow == null) return NotFound();

            // Validate dna process ids are unique
            if (dto.DnaProcessIds.Count != dto.DnaProcessIds.Distinct().Count())
                return BadRequest("Duplicate dnaProcessIds are not allowed");

            // Validate all dnaProcessIds exist
            var existingProcessIds = await _context.DnaProcesses
                .Where(dp => dto.DnaProcessIds.Contains(dp.Id))
                .Select(dp => dp.Id)
                .ToListAsync();

            if (existingProcessIds.Count != dto.DnaProcessIds.Count)
                return BadRequest("One or more dnaProcessIds are invalid");

            // Use transaction to replace atomically
            using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                // Remove existing links
                if (workflow.WorkflowProcesses != null && workflow.WorkflowProcesses.Any())
                {
                    _context.WorkflowProcesses.RemoveRange(workflow.WorkflowProcesses);
                    await _context.SaveChangesAsync();
                }

                // Add new ordered links
                var newLinks = new List<WorkflowProcess>();
                for (int i = 0; i < dto.DnaProcessIds.Count; i++)
                {
                    newLinks.Add(new WorkflowProcess
                    {
                        WorkflowId = id,
                        DnaProcessId = dto.DnaProcessIds[i],
                        ProcessOrder = i + 1
                    });
                }

                if (newLinks.Count > 0)
                {
                    _context.WorkflowProcesses.AddRange(newLinks);
                    await _context.SaveChangesAsync();
                }

                await tx.CommitAsync();
                return NoContent();
            }
            catch (DbUpdateException ex)
            {
                await tx.RollbackAsync();
                // log ex if you have logging; return generic error
                return StatusCode(500, "Failed to replace workflow processes");
            }
        }

        // PUT: api/workflows/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutWorkflow(int id, Workflow workflow)
        {
            if (id != workflow.Id) return BadRequest();
            _context.Entry(workflow).State = EntityState.Modified;
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!WorkflowExists(id)) return NotFound();
                throw;
            }
            return NoContent();
        }

        // DELETE: api/workflows/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteWorkflow(int id)
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

        public class AddProcessDto
        {
            public int DnaProcessId { get; set; }
            public int ProcessOrder { get; set; }
        }

        public class CreateWorkflowDto
        {
            public string Name { get; set; }
            public int CreatedBy { get; set; }
        }

        public class ReplaceProcessesDto
        {
            public List<int> DnaProcessIds { get; set; } = new List<int>();
        }

        private bool WorkflowExists(int id) => _context.Workflows.Any(e => e.Id == id);
    }
}