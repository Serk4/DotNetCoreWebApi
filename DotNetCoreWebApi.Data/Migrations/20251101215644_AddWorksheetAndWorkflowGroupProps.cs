using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DotNetCoreWebApi.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddWorksheetAndWorkflowGroupProps : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "StartAt",
                table: "Worksheets",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "Worksheets",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "RunName",
                table: "WorkflowGroups",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");

            migrationBuilder.UpdateData(
                table: "WorkflowGroups",
                keyColumn: "Id",
                keyValue: 1,
                column: "RunName",
                value: "Default Run");

            migrationBuilder.UpdateData(
                table: "Worksheets",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "StartAt", "Status" },
                values: new object[] { new DateTime(2025, 10, 17, 0, 0, 0, 0, DateTimeKind.Unspecified), 2 });

            migrationBuilder.UpdateData(
                table: "Worksheets",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "StartAt", "Status" },
                values: new object[] { new DateTime(2025, 10, 17, 0, 0, 0, 0, DateTimeKind.Unspecified), 2 });

            migrationBuilder.UpdateData(
                table: "Worksheets",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "StartAt", "Status" },
                values: new object[] { new DateTime(2025, 10, 17, 0, 0, 0, 0, DateTimeKind.Unspecified), 2 });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StartAt",
                table: "Worksheets");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Worksheets");

            migrationBuilder.DropColumn(
                name: "RunName",
                table: "WorkflowGroups");
        }
    }
}
