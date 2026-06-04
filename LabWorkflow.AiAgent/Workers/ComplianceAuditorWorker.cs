using DotNetCoreWebApi.Data;
using DotNetCoreWebApi.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.SemanticKernel;
using System.Text;

namespace LabWorkflow.AiAgent.Workers;

/// <summary>
/// Background service that periodically audits recently updated Worksheets
/// for compliance violations, out-of-bounds metrics, and SOP adherence using
/// Microsoft Semantic Kernel and a Groq language model.
/// </summary>
public sealed class ComplianceAuditorWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly Kernel               _kernel;
    private readonly ILogger<ComplianceAuditorWorker> _logger;
    private readonly TimeSpan             _pollingInterval;
    private readonly TimeSpan             _lookbackWindow;

    public ComplianceAuditorWorker(
        IServiceScopeFactory scopeFactory,
        Kernel               kernel,
        ILogger<ComplianceAuditorWorker> logger,
        IConfiguration configuration)
    {
        _scopeFactory    = scopeFactory;
        _kernel          = kernel;
        _logger          = logger;

        var agentSection = configuration.GetSection("AiAgent");
        _pollingInterval = TimeSpan.FromSeconds(
            agentSection.GetValue<int>("PollingIntervalSeconds", 60));
        _lookbackWindow  = TimeSpan.FromHours(
            agentSection.GetValue<int>("LookbackHours", 24));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "ComplianceAuditorWorker started. Polling every {Interval}s, looking back {Hours}h.",
            _pollingInterval.TotalSeconds, _lookbackWindow.TotalHours);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await AuditRecentWorksheetsAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // Log and continue – a transient error should not stop the service.
                _logger.LogError(ex, "Unhandled exception during compliance audit cycle.");
            }

            await Task.Delay(_pollingInterval, stoppingToken);
        }

        _logger.LogInformation("ComplianceAuditorWorker is stopping.");
    }

    // ── Core audit loop ────────────────────────────────────────────────────────

    private async Task AuditRecentWorksheetsAsync(CancellationToken ct)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var cutoff = DateTime.UtcNow - _lookbackWindow;

        // Fetch worksheets that are InProgress or were recently started/completed.
        var worksheets = await db.Worksheets
            .AsNoTracking()
            .Where(w => w.Status == WorksheetStatus.InProgress
                     || (w.StartAt != null && w.StartAt >= cutoff))
            .Include(w => w.Analyst)
            .Include(w => w.DnaProcess)
            .Include(w => w.Extractions)
            .Include(w => w.Amplifications)
            .Include(w => w.Quantifications)
            .OrderBy(w => w.StartAt)
            .ToListAsync(ct);

        if (worksheets.Count == 0)
        {
            _logger.LogDebug("No worksheets to audit in the current window.");
            return;
        }

        _logger.LogInformation("Auditing {Count} worksheet(s).", worksheets.Count);

        foreach (var worksheet in worksheets)
        {
            if (ct.IsCancellationRequested) break;
            await AuditWorksheetAsync(worksheet, ct);
        }
    }

    private async Task AuditWorksheetAsync(Worksheet worksheet, CancellationToken ct)
    {
        var prompt = BuildAuditPrompt(worksheet);

        _logger.LogDebug(
            "Invoking AI audit for Worksheet #{Id} ({Name}) – DnaProcess: {Process}.",
            worksheet.Id, worksheet.Name, worksheet.DnaProcess?.Name ?? "Unknown");

        var result = await _kernel.InvokePromptAsync(prompt, cancellationToken: ct);
        var verdict = result.ToString();

        _logger.LogInformation(
            "[COMPLIANCE AUDIT] Worksheet #{Id} ({Name}) | Process: {Process} | Analyst: {Analyst} | Verdict: {Verdict}",
            worksheet.Id,
            worksheet.Name,
            worksheet.DnaProcess?.Name ?? "N/A",
            worksheet.Analyst?.UserName ?? "N/A",
            verdict);
    }

    // ── Prompt construction ────────────────────────────────────────────────────

    private static string BuildAuditPrompt(Worksheet worksheet)
    {
        var sb = new StringBuilder();

        sb.AppendLine("You are a LIMS Compliance & Automation Auditor for a forensic DNA laboratory.");
        sb.AppendLine("Your role is to act as an automated QA officer.");
        sb.AppendLine("Review the following lab worksheet data and determine whether it contains:");
        sb.AppendLine("  1. Human input errors (e.g., missing required values, impossible numeric entries).");
        sb.AppendLine("  2. Out-of-bounds metrics (values outside acceptable forensic SOP ranges).");
        sb.AppendLine("  3. Standard Operating Procedure (SOP) violations (e.g., steps performed out of order,");
        sb.AppendLine("     incorrect DnaProcess assigned, analyst mismatch).");
        sb.AppendLine();
        sb.AppendLine("--- WORKSHEET METADATA ---");
        sb.AppendLine($"Worksheet ID   : {worksheet.Id}");
        sb.AppendLine($"Worksheet Name : {worksheet.Name}");
        sb.AppendLine($"Status         : {worksheet.Status}");
        sb.AppendLine($"Started At     : {worksheet.StartAt?.ToString("o") ?? "Not started"}");
        sb.AppendLine($"Analyst        : {worksheet.Analyst?.UserName ?? "Unknown"} (ID {worksheet.AnalystId})");
        sb.AppendLine($"Analyst Role   : {worksheet.Analyst?.UserType.ToString() ?? "Unknown"}");
        sb.AppendLine($"DnaProcess     : {worksheet.DnaProcess?.Name ?? "Unknown"} (ID {worksheet.DnaProcessId})");
        sb.AppendLine();

        AppendProcessData(sb, worksheet);

        sb.AppendLine();
        sb.AppendLine("--- INSTRUCTIONS ---");
        sb.AppendLine("Respond with a structured compliance verdict:");
        sb.AppendLine("  STATUS  : COMPLIANT | NON-COMPLIANT | NEEDS-REVIEW");
        sb.AppendLine("  ISSUES  : A concise bullet list of any problems found (or 'None' if compliant).");
        sb.AppendLine("  ACTION  : Recommended corrective action (or 'None required').");

        return sb.ToString();
    }

    private static void AppendProcessData(StringBuilder sb, Worksheet worksheet)
    {
        var processName = worksheet.DnaProcess?.Name ?? string.Empty;

        switch (processName)
        {
            case "Extraction":
                sb.AppendLine("--- EXTRACTION RECORDS ---");
                if (worksheet.Extractions.Count == 0)
                {
                    sb.AppendLine("WARNING: No extraction records found for an Extraction worksheet.");
                }
                else
                {
                    foreach (var e in worksheet.Extractions)
                        sb.AppendLine($"  Extraction #{e.Id}: Prop1={e.Prop1}, Prop2={e.Prop2}");
                }
                break;

            case "Amplification":
                sb.AppendLine("--- AMPLIFICATION RECORDS ---");
                if (worksheet.Amplifications.Count == 0)
                {
                    sb.AppendLine("WARNING: No amplification records found for an Amplification worksheet.");
                }
                else
                {
                    foreach (var a in worksheet.Amplifications)
                        sb.AppendLine($"  Amplification #{a.Id}: Prop1={a.Prop1}, Prop2={a.Prop2}");
                }
                break;

            case "Quantification":
                sb.AppendLine("--- QUANTIFICATION RECORDS ---");
                if (worksheet.Quantifications.Count == 0)
                {
                    sb.AppendLine("WARNING: No quantification records found for a Quantification worksheet.");
                }
                else
                {
                    foreach (var q in worksheet.Quantifications)
                        sb.AppendLine($"  Quantification #{q.Id}: Prop1={q.Prop1}, Prop2={q.Prop2}");
                }
                break;

            default:
                sb.AppendLine($"--- PROCESS DATA (Unknown process type: '{processName}') ---");
                sb.AppendLine($"  Extractions     : {worksheet.Extractions.Count} record(s)");
                sb.AppendLine($"  Amplifications  : {worksheet.Amplifications.Count} record(s)");
                sb.AppendLine($"  Quantifications : {worksheet.Quantifications.Count} record(s)");
                break;
        }
    }
}
