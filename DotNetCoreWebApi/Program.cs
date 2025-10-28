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
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddCors(options => {
    options.AddDefaultPolicy(policy => policy
        .AllowAnyOrigin()  // Or .WithOrigins("http://localhost:3000") for security
        .AllowAnyMethod()
        .AllowAnyHeader());
});

var app = builder.Build();

// Configure the HTTP request pipeline.
// Pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();  // Serves the JSON spec
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "DNA Workflow API v1"));  // UI
}

app.UseHttpsRedirection();
app.UseCors();  // Enable CORS
app.UseAuthorization();
app.MapControllers();  // Maps routes like /api/workflowgroups

// Serve single-page React app if built files are present in wwwroot
// (Copy the React build output into DotNetCoreWebApi/wwwroot)
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapFallbackToFile("index.html");

app.Run();
