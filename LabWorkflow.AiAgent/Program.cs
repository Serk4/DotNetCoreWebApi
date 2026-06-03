using DotNetCoreWebApi.Data;
using LabWorkflow.AiAgent.Workers;
using Microsoft.EntityFrameworkCore;
using Microsoft.SemanticKernel;

var host = Host.CreateDefaultBuilder(args)
    .ConfigureServices((ctx, services) =>
    {
        // ── Database ──────────────────────────────────────────────────────────
        // Prefer DATABASE_URL (Render.com convention); fall back to appsettings.
        var connectionString = BuildConnectionString(ctx.Configuration);

        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseNpgsql(connectionString),
            ServiceLifetime.Scoped);

        // ── Semantic Kernel ───────────────────────────────────────────────────
        var openAiSection = ctx.Configuration.GetSection("AiAgent:OpenAI");
        var apiKey  = openAiSection["ApiKey"]  ?? throw new InvalidOperationException("AiAgent:OpenAI:ApiKey is required.");
        var modelId = openAiSection["ModelId"] ?? "gpt-4o";

        // AddKernel registers Kernel as a singleton and wires it into DI.
        // AddOpenAIChatCompletion registers IChatCompletionService used by
        // InvokePromptAsync under the hood.
        services.AddKernel()
                .AddOpenAIChatCompletion(modelId, apiKey);

        // ── Background worker ─────────────────────────────────────────────────
        services.AddHostedService<ComplianceAuditorWorker>();
    })
    .Build();

await host.RunAsync();

// ── Helpers ───────────────────────────────────────────────────────────────────

static string BuildConnectionString(IConfiguration config)
{
    var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
    if (!string.IsNullOrWhiteSpace(databaseUrl))
        return ConvertDatabaseUrl(databaseUrl);

    var cs = config.GetConnectionString("DefaultConnection");
    if (!string.IsNullOrWhiteSpace(cs))
        return cs;

    throw new InvalidOperationException(
        "No database connection configured. " +
        "Set DATABASE_URL or ConnectionStrings:DefaultConnection in appsettings.json.");
}

static string ConvertDatabaseUrl(string url)
{
    var uri      = new Uri(url);
    var userInfo = uri.UserInfo.Split(':');
    if (userInfo.Length < 2)
        throw new InvalidOperationException(
            $"DATABASE_URL is malformed: expected 'postgres://user:Password@host/db' format.");
    return $"Host={uri.Host};Port={uri.Port};Database={uri.AbsolutePath.TrimStart('/')};Username={userInfo[0]};Password={userInfo[1]};SSL Mode=Require;Trust Server Certificate=true";
}

