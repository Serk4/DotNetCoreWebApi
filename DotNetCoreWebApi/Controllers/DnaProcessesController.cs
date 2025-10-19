using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DotNetCoreWebApi.Data;
using DotNetCoreWebApi.Models;

namespace DotNetCoreWebApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DnaProcessesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public DnaProcessesController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/dnaprocesses (fixed: projection)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetDnaProcesses()
        {
            var processes = await _context.DnaProcesses
                .Select(dp => new
                {
                    dp.Id,
                    dp.Name,
                    CreatedByUser = new { dp.CreatedByUser.Id, dp.CreatedByUser.UserName }  // Scalar only
                })
                .ToListAsync();

            return Ok(processes);
        }

        // GET: api/dnaprocesses/5 (fixed: projection)
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetDnaProcess(int id)
        {
            var dnaProcess = await _context.DnaProcesses
                .Where(dp => dp.Id == id)
                .Select(dp => new
                {
                    dp.Id,
                    dp.Name,
                    CreatedByUser = new { dp.CreatedByUser.Id, dp.CreatedByUser.UserName }
                })
                .FirstOrDefaultAsync();

            if (dnaProcess == null) return NotFound();
            return Ok(dnaProcess);
        }

        // POST: api/dnaprocesses
        [HttpPost]
        public async Task<ActionResult<DnaProcess>> PostDnaProcess(DnaProcess dnaProcess)
        {
            _context.DnaProcesses.Add(dnaProcess);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetDnaProcess), new { id = dnaProcess.Id }, dnaProcess);
        }

        // PUT: api/dnaprocesses/5
        [HttpPut("{id}")]
        public async Task<ActionResult<DnaProcess>> PutDnaProcess(int id, DnaProcess dnaProcess)
        {
            if (id != dnaProcess.Id) return BadRequest();

            _context.Entry(dnaProcess).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!DnaProcessExists(id)) return NotFound();
                throw;
            }

            return NoContent();
        }

        // DELETE: api/dnaprocesses/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDnaProcess(int id)
        {
            var dnaProcess = await _context.DnaProcesses.FindAsync(id);
            if (dnaProcess == null) return NotFound();
            _context.DnaProcesses.Remove(dnaProcess);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        private bool DnaProcessExists(int id) => _context.DnaProcesses.Any(e => e.Id == id);
    }
}
