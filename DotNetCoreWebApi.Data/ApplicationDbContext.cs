using DotNetCoreWebApi.Models;
using Microsoft.EntityFrameworkCore;

namespace DotNetCoreWebApi.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<DnaProcess> DnaProcesses { get; set; }
    public DbSet<Workflow> Workflows { get; set; }
    public DbSet<WorkflowProcess> WorkflowProcesses { get; set; }
    public DbSet<WorkflowGroup> WorkflowGroups { get; set; }
    public DbSet<Worksheet> Worksheets { get; set; }
    public DbSet<WorksheetWorkflowGroup> WorksheetWorkflowGroups { get; set; }
    public DbSet<Amplification> Amplifications { get; set; }
    public DbSet<Extraction> Extractions { get; set; }
    public DbSet<Quantification> Quantifications { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Uniqueness for junctions
        modelBuilder.Entity<WorkflowProcess>()
            .HasIndex(wp => new { wp.WorkflowId, wp.DnaProcessId })
            .IsUnique();

        modelBuilder.Entity<WorksheetWorkflowGroup>()
            .HasIndex(wwg => new { wwg.WorksheetId, wwg.WorkflowGroupId })
            .IsUnique();

        // Explicit FK config to prevent cascade cycles (key fix)
        modelBuilder.Entity<WorksheetWorkflowGroup>()
            .HasOne(wwg => wwg.Worksheet)
            .WithMany(w => w.WorksheetWorkflowGroups)
            .HasForeignKey(wwg => wwg.WorksheetId)
            .OnDelete(DeleteBehavior.NoAction);

        modelBuilder.Entity<WorksheetWorkflowGroup>()
            .HasOne(wwg => wwg.WorkflowGroup)
            .WithMany(wg => wg.WorksheetWorkflowGroups)
            .HasForeignKey(wwg => wwg.WorkflowGroupId)
            .OnDelete(DeleteBehavior.NoAction);

        // Optional: Apply NoAction to step tables if they cascade to Worksheet
        modelBuilder.Entity<Extraction>()
            .HasOne(e => e.Worksheet)
            .WithMany(w => w.Extractions)
            .HasForeignKey(e => e.WorksheetId)
            .OnDelete(DeleteBehavior.NoAction);

        modelBuilder.Entity<Amplification>()
            .HasOne(a => a.Worksheet)
            .WithMany(w => w.Amplifications)
            .HasForeignKey(a => a.WorksheetId)
            .OnDelete(DeleteBehavior.NoAction);

        modelBuilder.Entity<Quantification>()
            .HasOne(q => q.Worksheet)
            .WithMany(w => w.Quantifications)
            .HasForeignKey(q => q.WorksheetId)
            .OnDelete(DeleteBehavior.NoAction);

        // NoAction for Worksheets FKs to break User → DnaProcess → Worksheet and User → AnalystId paths
        modelBuilder.Entity<Worksheet>()
            .HasOne(w => w.DnaProcess)
            .WithMany(dp => dp.Worksheets)
            .HasForeignKey(w => w.DnaProcessId)
            .OnDelete(DeleteBehavior.NoAction);

        modelBuilder.Entity<Worksheet>()
            .HasOne(w => w.Analyst)
            .WithMany(u => u.AnalystWorksheets)
            .HasForeignKey(w => w.AnalystId)
            .OnDelete(DeleteBehavior.NoAction);

        // Seed data
        modelBuilder.Entity<User>().HasData(
            new User { Id = 1, UserName = "admin", Email = "admin@example.com", UserType = UserType.Admin },
            new User { Id = 2, UserName = "tech1", Email = "tech1@example.com", UserType = UserType.Technician },
            new User { Id = 3, UserName = "tech2", Email = "tech2@example.com", UserType = UserType.Technician },
            new User { Id = 4, UserName = "analyst1", Email = "analyst1@example.com", UserType = UserType.Analyst }
        );

        modelBuilder.Entity<DnaProcess>().HasData(
            new DnaProcess { Id = 1, Name = "Extraction", CreatedBy = 1 },
            new DnaProcess { Id = 2, Name = "Amplification", CreatedBy = 1 },
            new DnaProcess { Id = 3, Name = "Quantification", CreatedBy = 1 }
        );

        modelBuilder.Entity<Workflow>().HasData(
            new Workflow { Id = 1, Name = "Default Workflow", CreatedBy = 1 }
        );

        modelBuilder.Entity<WorkflowProcess>().HasData(
            new WorkflowProcess { Id = 1, WorkflowId = 1, DnaProcessId = 1, ProcessOrder = 1 },
            new WorkflowProcess { Id = 2, WorkflowId = 1, DnaProcessId = 2, ProcessOrder = 2 },
            new WorkflowProcess { Id = 3, WorkflowId = 1, DnaProcessId = 3, ProcessOrder = 3 }
        );

        modelBuilder.Entity<WorkflowGroup>().HasData(
            new WorkflowGroup { Id = 1, WorkflowId = 1 }
        );

        modelBuilder.Entity<Worksheet>().HasData(
            new Worksheet { Id = 1, Name = "Process 1 Worksheet", AnalystId = 4, DnaProcessId = 1 },
            new Worksheet { Id = 2, Name = "Process 2 Worksheet", AnalystId = 4, DnaProcessId = 2 },
            new Worksheet { Id = 3, Name = "Process 3 Worksheet", AnalystId = 4, DnaProcessId = 3 }
        );

        modelBuilder.Entity<WorksheetWorkflowGroup>().HasData(
            new WorksheetWorkflowGroup { Id = 1, WorksheetId = 1, WorkflowGroupId = 1, StepOrder = 1 },
            new WorksheetWorkflowGroup { Id = 2, WorksheetId = 2, WorkflowGroupId = 1, StepOrder = 2 },
            new WorksheetWorkflowGroup { Id = 3, WorksheetId = 3, WorkflowGroupId = 1, StepOrder = 3 }
        );

        modelBuilder.Entity<Extraction>().HasData(
            new Extraction { Id = 1, WorksheetId = 1, Prop1 = 2, Prop2 = 4 }
        );

        modelBuilder.Entity<Amplification>().HasData(
            new Amplification { Id = 1, WorksheetId = 2, Prop1 = 5, Prop2 = 10 }
        );

        modelBuilder.Entity<Quantification>().HasData(
            new Quantification { Id = 1, WorksheetId = 3, Prop1 = 15, Prop2 = 20 }
        );
    }
}
