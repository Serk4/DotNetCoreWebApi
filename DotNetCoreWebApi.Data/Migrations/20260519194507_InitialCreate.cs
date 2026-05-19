using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace DotNetCoreWebApi.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    UserType = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DnaProcesses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    CreatedBy = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DnaProcesses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DnaProcesses_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Workflows",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    CreatedBy = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Workflows", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Workflows_Users_CreatedBy",
                        column: x => x.CreatedBy,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Worksheets",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    AnalystId = table.Column<int>(type: "integer", nullable: false),
                    DnaProcessId = table.Column<int>(type: "integer", nullable: false),
                    StartAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Worksheets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Worksheets_DnaProcesses_DnaProcessId",
                        column: x => x.DnaProcessId,
                        principalTable: "DnaProcesses",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Worksheets_Users_AnalystId",
                        column: x => x.AnalystId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "WorkflowGroups",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    WorkflowId = table.Column<int>(type: "integer", nullable: false),
                    RunName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkflowGroups", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkflowGroups_Workflows_WorkflowId",
                        column: x => x.WorkflowId,
                        principalTable: "Workflows",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WorkflowProcesses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    WorkflowId = table.Column<int>(type: "integer", nullable: false),
                    DnaProcessId = table.Column<int>(type: "integer", nullable: false),
                    ProcessOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkflowProcesses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkflowProcesses_DnaProcesses_DnaProcessId",
                        column: x => x.DnaProcessId,
                        principalTable: "DnaProcesses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_WorkflowProcesses_Workflows_WorkflowId",
                        column: x => x.WorkflowId,
                        principalTable: "Workflows",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Amplifications",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    WorksheetId = table.Column<int>(type: "integer", nullable: false),
                    Prop1 = table.Column<int>(type: "integer", nullable: false),
                    Prop2 = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Amplifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Amplifications_Worksheets_WorksheetId",
                        column: x => x.WorksheetId,
                        principalTable: "Worksheets",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Extractions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    WorksheetId = table.Column<int>(type: "integer", nullable: false),
                    Prop1 = table.Column<int>(type: "integer", nullable: false),
                    Prop2 = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Extractions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Extractions_Worksheets_WorksheetId",
                        column: x => x.WorksheetId,
                        principalTable: "Worksheets",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Quantifications",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    WorksheetId = table.Column<int>(type: "integer", nullable: false),
                    Prop1 = table.Column<int>(type: "integer", nullable: false),
                    Prop2 = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Quantifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Quantifications_Worksheets_WorksheetId",
                        column: x => x.WorksheetId,
                        principalTable: "Worksheets",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "WorksheetWorkflowGroups",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    WorksheetId = table.Column<int>(type: "integer", nullable: false),
                    WorkflowGroupId = table.Column<int>(type: "integer", nullable: false),
                    StepOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorksheetWorkflowGroups", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorksheetWorkflowGroups_WorkflowGroups_WorkflowGroupId",
                        column: x => x.WorkflowGroupId,
                        principalTable: "WorkflowGroups",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_WorksheetWorkflowGroups_Worksheets_WorksheetId",
                        column: x => x.WorksheetId,
                        principalTable: "Worksheets",
                        principalColumn: "Id");
                });

            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "Id", "Email", "UserName", "UserType" },
                values: new object[,]
                {
                    { 1, "admin@example.com", "admin", 0 },
                    { 2, "tech1@example.com", "tech1", 1 },
                    { 3, "tech2@example.com", "tech2", 1 },
                    { 4, "analyst1@example.com", "analyst1", 2 }
                });

            migrationBuilder.InsertData(
                table: "DnaProcesses",
                columns: new[] { "Id", "CreatedBy", "Name" },
                values: new object[,]
                {
                    { 1, 1, "Extraction" },
                    { 2, 1, "Amplification" },
                    { 3, 1, "Quantification" }
                });

            migrationBuilder.InsertData(
                table: "Workflows",
                columns: new[] { "Id", "CreatedBy", "Name" },
                values: new object[] { 1, 1, "Default Workflow" });

            migrationBuilder.InsertData(
                table: "WorkflowGroups",
                columns: new[] { "Id", "RunName", "WorkflowId" },
                values: new object[] { 1, "Default Run", 1 });

            migrationBuilder.InsertData(
                table: "WorkflowProcesses",
                columns: new[] { "Id", "DnaProcessId", "ProcessOrder", "WorkflowId" },
                values: new object[,]
                {
                    { 1, 1, 1, 1 },
                    { 2, 2, 2, 1 },
                    { 3, 3, 3, 1 }
                });

            migrationBuilder.InsertData(
                table: "Worksheets",
                columns: new[] { "Id", "AnalystId", "DnaProcessId", "Name", "StartAt", "Status" },
                values: new object[,]
                {
                    { 1, 4, 1, "Process 1 Worksheet", new DateTime(2025, 10, 17, 0, 0, 0, 0, DateTimeKind.Utc), 2 },
                    { 2, 4, 2, "Process 2 Worksheet", new DateTime(2025, 10, 17, 0, 0, 0, 0, DateTimeKind.Utc), 2 },
                    { 3, 4, 3, "Process 3 Worksheet", new DateTime(2025, 10, 17, 0, 0, 0, 0, DateTimeKind.Utc), 2 }
                });

            migrationBuilder.InsertData(
                table: "Amplifications",
                columns: new[] { "Id", "Prop1", "Prop2", "WorksheetId" },
                values: new object[] { 1, 5, 10, 2 });

            migrationBuilder.InsertData(
                table: "Extractions",
                columns: new[] { "Id", "Prop1", "Prop2", "WorksheetId" },
                values: new object[] { 1, 2, 4, 1 });

            migrationBuilder.InsertData(
                table: "Quantifications",
                columns: new[] { "Id", "Prop1", "Prop2", "WorksheetId" },
                values: new object[] { 1, 15, 20, 3 });

            migrationBuilder.InsertData(
                table: "WorksheetWorkflowGroups",
                columns: new[] { "Id", "StepOrder", "WorkflowGroupId", "WorksheetId" },
                values: new object[,]
                {
                    { 1, 1, 1, 1 },
                    { 2, 2, 1, 2 },
                    { 3, 3, 1, 3 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Amplifications_WorksheetId",
                table: "Amplifications",
                column: "WorksheetId");

            migrationBuilder.CreateIndex(
                name: "IX_DnaProcesses_CreatedBy",
                table: "DnaProcesses",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Extractions_WorksheetId",
                table: "Extractions",
                column: "WorksheetId");

            migrationBuilder.CreateIndex(
                name: "IX_Quantifications_WorksheetId",
                table: "Quantifications",
                column: "WorksheetId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkflowGroups_WorkflowId",
                table: "WorkflowGroups",
                column: "WorkflowId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkflowProcesses_DnaProcessId",
                table: "WorkflowProcesses",
                column: "DnaProcessId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkflowProcesses_WorkflowId_DnaProcessId",
                table: "WorkflowProcesses",
                columns: new[] { "WorkflowId", "DnaProcessId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Workflows_CreatedBy",
                table: "Workflows",
                column: "CreatedBy");

            migrationBuilder.CreateIndex(
                name: "IX_Worksheets_AnalystId",
                table: "Worksheets",
                column: "AnalystId");

            migrationBuilder.CreateIndex(
                name: "IX_Worksheets_DnaProcessId",
                table: "Worksheets",
                column: "DnaProcessId");

            migrationBuilder.CreateIndex(
                name: "IX_WorksheetWorkflowGroups_WorkflowGroupId",
                table: "WorksheetWorkflowGroups",
                column: "WorkflowGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_WorksheetWorkflowGroups_WorksheetId_WorkflowGroupId",
                table: "WorksheetWorkflowGroups",
                columns: new[] { "WorksheetId", "WorkflowGroupId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Amplifications");

            migrationBuilder.DropTable(
                name: "Extractions");

            migrationBuilder.DropTable(
                name: "Quantifications");

            migrationBuilder.DropTable(
                name: "WorkflowProcesses");

            migrationBuilder.DropTable(
                name: "WorksheetWorkflowGroups");

            migrationBuilder.DropTable(
                name: "WorkflowGroups");

            migrationBuilder.DropTable(
                name: "Worksheets");

            migrationBuilder.DropTable(
                name: "Workflows");

            migrationBuilder.DropTable(
                name: "DnaProcesses");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
