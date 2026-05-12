// services/export.service.ts
import ExcelJS from "exceljs";
import type {
  ExportServiceData,
  PLSectionData,
  ItemSectionData,
} from "../types/export.types.ts";

/**
 * ExportService
 * Handles generation of Excel reports with 4 sheets:
 * 1. Entries - metadata and sections list
 * 2. PL-Entries - performance level data by section
 * 3. Item-Entries - item analysis by section
 * 4. Summary - summary statistics
 */
export class ExportService {
  /**
   * Generate Excel workbook with all report data
   */
  static async generateExcelReport(
    data: ExportServiceData
  ): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "GradeLens";
    workbook.created = new Date();
    workbook.modified = new Date();

    // Create all 4 sheets
    await this.createEntriesSheet(workbook, data);
    await this.createPLEntriesSheet(workbook, data);
    await this.createItemEntriesSheet(workbook, data);
    await this.createSummarySheet(workbook, data);

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  /**
   * Sheet 1: Entries - Report metadata and sections list
   */
  private static async createEntriesSheet(
    workbook: ExcelJS.Workbook,
    data: ExportServiceData
  ): Promise<void> {
    const sheet = workbook.addWorksheet("Entries");
    const { metadata } = data;

    // Title
    sheet.mergeCells("A1:B1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = "Report Information";
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: "center" };

    // Report details
    let row = 3;
    sheet.getCell(`A${row}`).value = "Grade:";
    sheet.getCell(`B${row}`).value = metadata.grade_name;
    sheet.getCell(`A${row}`).font = { bold: true };

    row++;
    sheet.getCell(`A${row}`).value = "Class:";
    sheet.getCell(`B${row}`).value = metadata.class_name;
    sheet.getCell(`A${row}`).font = { bold: true };

    row++;
    sheet.getCell(`A${row}`).value = "Exam:";
    sheet.getCell(`B${row}`).value = metadata.exam_name;
    sheet.getCell(`A${row}`).font = { bold: true };

    row++;
    sheet.getCell(`A${row}`).value = "Academic Year:";
    sheet.getCell(`B${row}`).value = metadata.academic_year || "N/A";
    sheet.getCell(`A${row}`).font = { bold: true };

    row++;
    sheet.getCell(`A${row}`).value = "Exported At:";
    sheet.getCell(`B${row}`).value = metadata.exported_at.toLocaleString();
    sheet.getCell(`A${row}`).font = { bold: true };

    // Sections list
    row += 2;
    sheet.mergeCells(`A${row}:B${row}`);
    const sectionsTitle = sheet.getCell(`A${row}`);
    sectionsTitle.value = "Sections Included";
    sectionsTitle.font = { bold: true, size: 12 };

    row++;
    sheet.getCell(`A${row}`).value = "Section ID";
    sheet.getCell(`B${row}`).value = "Section Name";
    sheet.getRow(row).font = { bold: true };

    for (const section of data.plData.sections) {
      row++;
      sheet.getCell(`A${row}`).value = section.section_id;
      sheet.getCell(`B${row}`).value = section.section_name;
    }

    // Auto-fit columns
    sheet.getColumn("A").width = 20;
    sheet.getColumn("B").width = 40;
  }

  /**
   * Sheet 2: PL-Entries - Performance Level data
   */
  private static async createPLEntriesSheet(
    workbook: ExcelJS.Workbook,
    data: ExportServiceData
  ): Promise<void> {
    const sheet = workbook.addWorksheet("PL-Entries");
    const { plData } = data;

    // Build headers
    const headers = ["Score"];
    const sections = plData.sections;
    const overall = plData.overall;

    // Add section columns (f and fx for each)
    for (const section of sections) {
      headers.push(`${section.section_name} (f)`);
      headers.push(`${section.section_name} (fx)`);
    }

    // Add overall columns if available
    if (overall) {
      headers.push("Overall (f)");
      headers.push("Overall (fx)");
    }

    // Write headers
    sheet.addRow(headers);
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD3D3D3" },
    };

    // Get max score from first section
    const maxScore =
      sections.length > 0
        ? Math.max(...sections[0].distribution.map((d) => d.score))
        : 0;

    // Build distribution rows
    for (let score = maxScore; score >= 0; score--) {
      const row: (number | string)[] = [score];

      // Add section data
      for (const section of sections) {
        const dist = section.distribution.find((d) => d.score === score) || {
          f: 0,
          fx: 0,
        };
        row.push(dist.f);
        row.push(dist.fx);
      }

      // Add overall data
      if (overall) {
        const dist = overall.distribution.find((d) => d.score === score) || {
          f: 0,
          fx: 0,
        };
        row.push(dist.f);
        row.push(dist.fx);
      }

      sheet.addRow(row);
    }

    // Add footer rows for statistics
    const dataRowCount = sheet.rowCount;

    // Total row
    const totalRow: (number | string)[] = ["TOTAL"];
    for (const section of sections) {
      totalRow.push(section.stats.total_f);
      totalRow.push(section.stats.total_fx);
    }
    if (overall) {
      totalRow.push(overall.stats.total_f);
      totalRow.push(overall.stats.total_fx);
    }
    sheet.addRow(totalRow);
    sheet.getRow(dataRowCount + 1).font = { bold: true };

    // Mean row
    const meanRow: (number | string)[] = ["MEAN"];
    for (const section of sections) {
      meanRow.push(section.stats.mean.toFixed(2));
      meanRow.push("");
    }
    if (overall) {
      meanRow.push(overall.stats.mean.toFixed(2));
      meanRow.push("");
    }
    sheet.addRow(meanRow);
    sheet.getRow(dataRowCount + 2).font = { bold: true };

    // PL row
    const plRow: (number | string)[] = ["PL"];
    for (const section of sections) {
      plRow.push(section.stats.pl.toFixed(2));
      plRow.push("");
    }
    if (overall) {
      plRow.push(overall.stats.pl.toFixed(2));
      plRow.push("");
    }
    sheet.addRow(plRow);
    sheet.getRow(dataRowCount + 3).font = { bold: true };

    // MPS row
    const mpsRow: (number | string)[] = ["MPS"];
    for (const section of sections) {
      mpsRow.push(section.stats.mps.toFixed(2));
      mpsRow.push("");
    }
    if (overall) {
      mpsRow.push(overall.stats.mps.toFixed(2));
      mpsRow.push("");
    }
    sheet.addRow(mpsRow);
    sheet.getRow(dataRowCount + 4).font = { bold: true };

    // Auto-fit columns
    sheet.columns.forEach((column) => {
      if (column) column.width = 15;
    });
  }

  /**
   * Sheet 3: Item-Entries - Item analysis
   */
  private static async createItemEntriesSheet(
    workbook: ExcelJS.Workbook,
    data: ExportServiceData
  ): Promise<void> {
    const sheet = workbook.addWorksheet("Item-Entries");
    const { itemData } = data;

    // Build headers
    const headers = ["Item No."];
    const sections = itemData.sections;
    const overall = itemData.overall;

    // Add section columns (correct count for each)
    for (const section of sections) {
      headers.push(section.section_name);
    }

    // Add overall, percentage, remark, and rank columns
    if (overall) {
      headers.push("Overall");
    }
    headers.push("Percentage");
    headers.push("Remark");
    headers.push("Rank");

    // Write headers
    sheet.addRow(headers);
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD3D3D3" },
    };

    // Get total questions from first section or overall
    const totalQuestions =
      sections.length > 0
        ? sections[0].items.length
        : overall?.items.length || 0;

    // Build item rows
    for (let qNum = 1; qNum <= totalQuestions; qNum++) {
      const row: (number | string)[] = [qNum];

      // Add section data (correct count)
      for (const section of sections) {
        const item = section.items.find((i) => i.question_number === qNum);
        row.push(item?.correct_count ?? 0);
      }

      // Add overall data
      let overallPercentage = 0;
      let overallRemark = "";
      let rankLabel = "";
      if (overall) {
        const item = overall.items.find((i) => i.question_number === qNum);
        row.push(item?.correct_count ?? 0);
        overallPercentage = item?.percentage ?? 0;
        overallRemark = item?.remark ?? "";
        rankLabel = item?.rank_label ?? "";
      } else if (sections.length > 0) {
        // If no overall, compute from first section as fallback
        const item = sections[0].items.find((i) => i.question_number === qNum);
        overallPercentage = item?.percentage ?? 0;
        overallRemark = item?.remark ?? "";
        rankLabel = item?.rank_label ?? "";
      }

      row.push(`${overallPercentage.toFixed(2)}%`);
      row.push(overallRemark);
      row.push(rankLabel);

      sheet.addRow(row);
    }

    // Add footer row for total and students count
    const dataRowCount = sheet.rowCount;

    // Total correct per section
    const totalRow: (number | string)[] = ["TOTAL"];
    for (const section of sections) {
      const total = section.items.reduce(
        (sum, item) => sum + (item.correct_count || 0),
        0
      );
      totalRow.push(total);
    }
    if (overall) {
      const total = overall.items.reduce(
        (sum, item) => sum + (item.correct_count || 0),
        0
      );
      totalRow.push(total);
    }
    totalRow.push("");
    totalRow.push("");
    totalRow.push("");
    sheet.addRow(totalRow);
    sheet.getRow(dataRowCount + 1).font = { bold: true };

    // Students count row
    const studentsRow: (number | string)[] = ["STUDENTS"];
    for (const section of sections) {
      studentsRow.push(section.metadata.students_took_exam);
    }
    if (overall) {
      studentsRow.push(overall.metadata.total_students_took_exam);
    }
    studentsRow.push("");
    studentsRow.push("");
    studentsRow.push("");
    sheet.addRow(studentsRow);
    sheet.getRow(dataRowCount + 2).font = { bold: true };

    // Auto-fit columns
    sheet.columns.forEach((column) => {
      if (column) column.width = 15;
    });
  }

  /**
   * Sheet 4: Summary - Summary statistics
   */
  private static async createSummarySheet(
    workbook: ExcelJS.Workbook,
    data: ExportServiceData
  ): Promise<void> {
    const sheet = workbook.addWorksheet("Summary");
    const { summaryData } = data;

    // Headers
    const headers = [
      "Section",
      "Number of Examinees",
      "No of Items",
      "HSO",
      "LSO",
      "Total Scores of Examinees",
      "Total Students",
      "Mean",
      "PL",
      "MPS",
    ];
    sheet.addRow(headers);
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD3D3D3" },
    };

    // Section rows
    for (const section of summaryData.sections) {
      sheet.addRow([
        section.section_name,
        section.students_took_exam,
        section.number_of_items,
        section.hso.toFixed(2),
        section.lso.toFixed(2),
        section.total_scores,
        section.total_students,
        section.mean.toFixed(2),
        section.pl.toFixed(2),
        section.mps.toFixed(2),
      ]);
    }

    // Overall row (if available)
    if (summaryData.overall) {
      const overallRow = [
        "OVERALL",
        summaryData.overall.total_students_took_exam,
        summaryData.overall.number_of_items,
        summaryData.overall.hso.toFixed(2),
        summaryData.overall.lso.toFixed(2),
        summaryData.overall.total_scores,
        "",
        summaryData.overall.mean.toFixed(2),
        summaryData.overall.pl.toFixed(2),
        summaryData.overall.mps.toFixed(2),
      ];
      sheet.addRow(overallRow);
      sheet.getRow(sheet.rowCount).font = { bold: true };
    }

    // Auto-fit columns
    sheet.columns.forEach((column, idx) => {
      if (column) {
        column.width = idx === 0 ? 25 : 18;
      }
    });
  }
}
