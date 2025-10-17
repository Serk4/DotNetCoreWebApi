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
            return await _context.Workflows
                .Include(w => w.CreatedByUser)  // Eager-load creator
                .Include(w => w.WorkflowProcesses)  // Eager-load sequences
                    .ThenInclude(wp => wp.DnaProcess)
                .ToListAsync();
        }

        // GET: api/workflows/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Workflow>> GetWorkflow(int id)
        {
            var workflow = await _context.Workflows
                .Include(w => w.WorkflowProcesses.OrderBy(wp => wp.ProcessOrder))
                    .ThenInclude(wp => wp.DnaProcess)
                .FirstOrDefaultAsync(w => w.Id == id);
            if (workflow == null) return NotFound();
            return workflow;
        }

        // POST: api/workflows
        [HttpPost]
        public async Task<ActionResult<Workflow>> PostWorkflow(Workflow workflow)
        {
            _context.Workflows.Add(workflow);
            await _context.SaveChangesAsync();  // Save to get Id
            return CreatedAtAction(nameof(GetWorkflow), new { id = workflow.Id }, workflow);
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

        private bool WorkflowExists(int id) => _context.Workflows.Any(e => e.Id == id);
    }
}