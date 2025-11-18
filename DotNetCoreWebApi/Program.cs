using DotNetCoreWebApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using Microsoft.Extensions.FileProviders;
using System.IO;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
   c.SwaggerDoc("v1", new() { Title = "DNA Workflow API", Version = "v1" });
});
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlite("Data Source=dnaworkflow.db"));

builder.Services.AddCors(options => {
    options.AddDefaultPolicy(policy => policy
        .AllowAnyOrigin()  // Or .WithOrigins("http://localhost:3000") for security
        .AllowAnyMethod()
        .AllowAnyHeader());
});

// Prefer serving a built client if present
var clientBuildPath = Path.Combine(builder.Environment.ContentRootPath, "client", "build");
var defaultWwwroot = Path.Combine(builder.Environment.ContentRootPath, "wwwroot");
var webRootExists = false;

// If client build exists, use it as the web root so static files are served from client/build
if (Directory.Exists(clientBuildPath))
{
    builder.WebHost.UseWebRoot(Path.Combine("client", "build"));
    webRootExists = true;
}
// Otherwise if wwwroot exists, keep default web root behavior
else if (Directory.Exists(defaultWwwroot))
{
    webRootExists = true;
}

var app = builder.Build();

// Ensure database is created and seeded
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    dbContext.Database.EnsureCreated();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();  // Serves the JSON spec
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "DNA Workflow API v1"));  // UI    
}

app.UseHttpsRedirection();
app.UseCors();  // Enable CORS
app.UseAuthorization();
app.MapControllers();  // Maps routes like /api/workflowgroups

// Only wire up static-file middleware if a web root exists (prevents warning)
if (webRootExists)
{
    app.UseDefaultFiles();
    app.UseStaticFiles();
    app.MapFallbackToFile("index.html");
}

app.Run();
