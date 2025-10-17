using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DotNetCoreWebApi.Data;
using DotNetCoreWebApi.Models;

namespace DotNetCoreWebApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WorkflowGroupsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public WorkflowGroupsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/workflowgroups/1/report - Full ordered report for a group
        [HttpGet("{id}/report")]
        public async Task<ActionResult<IEnumerable<object>>> GetGroupReport(int id)
        {
            var report = await _context.WorksheetWorkflowGroups
                .Where(wwg => wwg.WorkflowGroupId == id)
                .Include(wwg => wwg.Worksheet)
                    .ThenInclude(ws => ws.DnaProcess)
                .Include(wwg => wwg.WorkflowGroup)
                    .ThenInclude(wg => wg.Workflow)
                .OrderBy(wwg => wwg.StepOrder)
                .Select(wwg => new
                {
                    WorkflowName = wwg.WorkflowGroup.Workflow.Name,
                    StepOrder = wwg.StepOrder,
                    ProcessName = wwg.Worksheet.DnaProcess.Name,
                    WorksheetName = wwg.Worksheet.Name,
                    AnalystName = wwg.Worksheet.Analyst.UserName
                    // Add props: e.g., wwg.Worksheet.Extractions.FirstOrDefault()?.Prop1
                })
                .ToListAsync();

            if (!report.Any()) return NotFound();

            return Ok(report);
        }
    }
}