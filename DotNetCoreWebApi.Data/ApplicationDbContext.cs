using DotNetCoreWebApi.Models;
using Microsoft.EntityFrameworkCore;

namespace DotNetCoreWebApi.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<DnaProcess> DnaProcesses { get; set; }
    //public DbSet<Workflow> Workflows { get; set; }
    //public DbSet<WorkflowProcess> WorkflowProcesses { get; set; }
    //public DbSet<WorkflowGroup> WorkflowGroups { get; set; }
    //public DbSet<Worksheet> Worksheets { get; set; }
    //public DbSet<WorksheetWorkflowGroup> WorksheetWorkflowGroups { get; set; }
    //public DbSet<Amplification> Amplifications { get; set; }
    //public DbSet<Extraction> Extractions { get; set; }
    //public DbSet<Quantification> Quantifications { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        // Configure entity properties and relationships here if needed
        modelBuilder.Entity<DnaProcess>().HasData(
            new DnaProcess { Id = 1, Name = "Extraction", CreatedBy = 1 },
            new DnaProcess { Id = 2, Name = "Amplification", CreatedBy = 1 },
            new DnaProcess { Id = 3, Name = "Quantification", CreatedBy = 1 }
        );
        
        // Add configurations for other entities similarly
    }
}
