using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DotNetCoreWebApi.Models
{
    public class User
    {
        public int Id { get; set; }

        [Required, MaxLength(255)]
        public string UserName { get; set; } = string.Empty;

        [MaxLength(255)]
        public string? Email { get; set; }
        [Required]
        public UserType UserType { get; set; }

        public ICollection<DnaProcess> CreatedDnaProcesses { get; set; } = new List<DnaProcess>();
        public ICollection<Workflow> CreatedWorkflows { get; set; } = new List<Workflow>();
        public ICollection<Worksheet> AnalystWorksheets { get; set; } = new List<Worksheet>();
    }

    public enum UserType
    {
        Admin,
        Technician,
        Analyst
    }

    public class DnaProcess
    {
        public int Id { get; set; }

        [Required, MaxLength(255)]
        public string Name { get; set; } = string.Empty;

        public int CreatedBy { get; set; }
        [ForeignKey(nameof(CreatedBy))]
        public User CreatedByUser { get; set; } = null!;

        public ICollection<WorkflowProcess> WorkflowProcesses { get; set; } = new List<WorkflowProcess>();
        public ICollection<Worksheet> Worksheets { get; set; } = new List<Worksheet>();
    }

    public class Workflow
    {
        public int Id { get; set; }

        [Required, MaxLength(255)]
        public string Name { get; set; } = string.Empty;

        public int CreatedBy { get; set; }
        [ForeignKey(nameof(CreatedBy))]
        public User CreatedByUser { get; set; } = null!;

        public ICollection<WorkflowGroup> WorkflowGroups { get; set; } = new List<WorkflowGroup>();
        public ICollection<WorkflowProcess> WorkflowProcesses { get; set; } = new List<WorkflowProcess>();
    }

    public class WorkflowProcess
    {
        public int Id { get; set; }

        public int WorkflowId { get; set; }
        [ForeignKey(nameof(WorkflowId))]
        public Workflow Workflow { get; set; } = null!;

        public int DnaProcessId { get; set; }
        [ForeignKey(nameof(DnaProcessId))]
        public DnaProcess DnaProcess { get; set; } = null!;

        public int ProcessOrder { get; set; }
    }

    public class WorkflowGroup
    {
        public int Id { get; set; }

        public int WorkflowId { get; set; }
        [ForeignKey(nameof(WorkflowId))]
        public Workflow Workflow { get; set; } = null!;

        public ICollection<WorksheetWorkflowGroup> WorksheetWorkflowGroups { get; set; } = new List<WorksheetWorkflowGroup>();
    }

    public class Worksheet
    {
        public int Id { get; set; }

        [Required, MaxLength(255)]
        public string Name { get; set; } = string.Empty;

        public int AnalystId { get; set; }
        [ForeignKey(nameof(AnalystId))]
        public User Analyst { get; set; } = null!;

        public int DnaProcessId { get; set; }
        [ForeignKey(nameof(DnaProcessId))]
        public DnaProcess DnaProcess { get; set; } = null!;

        public ICollection<WorksheetWorkflowGroup> WorksheetWorkflowGroups { get; set; } = new List<WorksheetWorkflowGroup>();
        public ICollection<Extraction> Extractions { get; set; } = new List<Extraction>();
        public ICollection<Amplification> Amplifications { get; set; } = new List<Amplification>();
        public ICollection<Quantification> Quantifications { get; set; } = new List<Quantification>();
    }

    public class WorksheetWorkflowGroup
    {
        public int Id { get; set; }

        public int WorksheetId { get; set; }
        [ForeignKey(nameof(WorksheetId))]
        public Worksheet Worksheet { get; set; } = null!;

        public int WorkflowGroupId { get; set; }
        [ForeignKey(nameof(WorkflowGroupId))]
        public WorkflowGroup WorkflowGroup { get; set; } = null!;

        public int StepOrder { get; set; }
    }

    public class Extraction
    {
        public int Id { get; set; }

        public int WorksheetId { get; set; }
        [ForeignKey(nameof(WorksheetId))]
        public Worksheet Worksheet { get; set; } = null!;

        public int Prop1 { get; set; }
        public int Prop2 { get; set; }
    }

    public class Amplification
    {
        public int Id { get; set; }

        public int WorksheetId { get; set; }
        [ForeignKey(nameof(WorksheetId))]
        public Worksheet Worksheet { get; set; } = null!;

        public int Prop1 { get; set; }
        public int Prop2 { get; set; }
    }

    public class Quantification
    {
        public int Id { get; set; }

        public int WorksheetId { get; set; }
        [ForeignKey(nameof(WorksheetId))]
        public Worksheet Worksheet { get; set; } = null!;

        public int Prop1 { get; set; }
        public int Prop2 { get; set; }
    }
}