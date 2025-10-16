using System.ComponentModel.DataAnnotations;

namespace DotNetCoreWebApi.Models;

public class DnaProcess
{
    public int Id { get; set; }
    [Required]
    public string Name { get; set; } = string.Empty;
    [Required]
    public int CreatedBy { get; set; }
}
