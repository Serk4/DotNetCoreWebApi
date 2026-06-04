using DotNetCoreWebApi.Data;
using LabWorkflow.AiAgent.Workers;
using Microsoft.EntityFrameworkCore;
using Microsoft.SemanticKernel;
using OpenAI;
using System.ClientModel;

var host = Host.CreateDefaultBuilder(args)
    .ConfigureServices((ctx, services) =>
    {
        // ── Database ──────────────────────────────────────────────────────────
        // Prefer DATABASE_URL (Render.com convention); fall back to appsettings.
        var connectionString = BuildConnectionString(ctx.Configuration);

        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseNpgsql(connectionString),
            ServiceLifetime.Scoped);

        // ── Semantic Kernel (Groq) ────────────────────────────────────────────
        // Groq exposes an OpenAI-compatible API, so we reuse the SK OpenAI
        // connector — no additional NuGet package required.
        // On Render.com, set AIAGENT__GROQ__APIKEY as an environment variable.
        var groqSection = ctx.Configuration.GetSection("AiAgent:Groq");
        var apiKey  = groqSection["ApiKey"]  ?? throw new InvalidOperationException("AiAgent:Groq:ApiKey is required.");
        var modelId = groqSection["ModelId"] ?? "llama-3.1-8b-instant";

        var groqClient = new OpenAIClient(
            new ApiKeyCredential(apiKey),
            new OpenAIClientOptions { Endpoint = new Uri("https://api.groq.com/openai/v1") });

        // AddKernel registers Kernel as a singleton and wires it into DI.
        // AddOpenAIChatCompletion registers IChatCompletionService used by
        // InvokePromptAsync under the hood.
        services.AddKernel()
                .AddOpenAIChatCompletion(modelId, groqClient);

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
            $"DATABASE_URL is malformed: expected 'postgres://user:password@host/db' format.");
    return $"Host={uri.Host};Port={uri.Port};Database={uri.AbsolutePath.TrimStart('/')};Username={userInfo[0]};Password={userInfo[1]};SSL Mode=Require;Trust Server Certificate=true";
}

