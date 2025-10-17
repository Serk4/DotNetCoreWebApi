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
        public async Task<ActionResult<IEnumerable<Workflow>>> GetWorkflows()
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
        public async Task<ActionResult<Workflow>> GetWorkflow(int id)
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
            var workflow = await _context.Workflows.FindAsync(id);
            if (workflow == null) return NotFound();
            _context.Workflows.Remove(workflow);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        public class AddProcessDto
        {
            public int DnaProcessId { get; set; }
            public int ProcessOrder { get; set; }
        }

        private bool WorkflowExists(int id) => _context.Workflows.Any(e => e.Id == id);
    }
}