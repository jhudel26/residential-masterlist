import ExcelJS from "exceljs";
import { Homeowner } from "@/types/database";
import { formatDate } from "./utils";

export async function exportHomeownersToExcel(
  homeowners: Homeowner[],
  filenamePrefix = "St_Joseph_Village_6_Phase_4_Homeowners"
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "St. Joseph Village 6 Phase 4 HOA";
  workbook.lastModifiedBy = "HOA Masterlist System";
  workbook.created = new Date();
  workbook.modified = new Date();

  // --- SHEET 1: Homeowners Masterlist ---
  const sheet1 = workbook.addWorksheet("Homeowners Masterlist", {
    views: [{ showGridLines: true }],
  });

  // Title Row
  sheet1.mergeCells("A1:L1");
  const titleCell = sheet1.getCell("A1");
  titleCell.value = "ST. JOSEPH VILLAGE 6 PHASE 4 — HOMEOWNERS ASSOCIATION";
  titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F382A" }, // HOA Emerald Green
  };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet1.getRow(1).height = 32;

  // Subtitle Row
  sheet1.mergeCells("A2:L2");
  const subCell = sheet1.getCell("A2");
  subCell.value = `Official Homeowners Masterlist Registry (Exported: ${new Date().toLocaleDateString(
    "en-US",
    { dateStyle: "long" }
  )})`;
  subCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF2D705D" } };
  subCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet1.getRow(2).height = 20;

  // Empty spacer row
  sheet1.getRow(3).height = 10;

  // Header Row
  const headers = [
    "Full Name",
    "Ownership Type",
    "Gender",
    "Birthdate",
    "Age",
    "Address / Block & Lot",
    "Household Count",
    "Contact Mobile",
    "Contact Email",
    "Pet Count",
    "General Assembly Proxy",
    "Status",
  ];

  const headerRow = sheet1.getRow(4);
  headerRow.values = headers;
  headerRow.height = 26;

  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF07162C" }, // Deep Navy
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "medium", color: { argb: "FF0D9488" } }, // Teal Accent
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });

  // Data Rows
  homeowners.forEach((ho, index) => {
    const rowNumber = index + 5;
    const row = sheet1.getRow(rowNumber);

    row.values = [
      ho.full_name,
      ho.ownership_type,
      ho.gender || "—",
      ho.birthdate ? formatDate(ho.birthdate) : "—",
      ho.age ?? "—",
      ho.address,
      ho.household_count,
      ho.contact_mobile || "—",
      ho.contact_email || "—",
      ho.pet_count || 0,
      ho.ga_proxy_name ? `${ho.ga_proxy_name} (${ho.ga_proxy_relationship || "Proxy"})` : "None",
      ho.status,
    ];

    row.height = 22;

    const isEven = index % 2 === 0;
    row.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 9.5 };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      if (!isEven) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      }

      // Center certain columns (e.g. Ownership, Gender, Birthdate, Age, Household Count, Pet Count, Status)
      if ([2, 3, 4, 5, 7, 10, 12].includes(colNumber)) {
        cell.alignment = { horizontal: "center", vertical: "middle" };
      } else {
        cell.alignment = { horizontal: "left", vertical: "middle" };
      }

      // Status styling
      if (colNumber === 12) {
        cell.font = {
          name: "Arial",
          size: 9.5,
          bold: true,
          color: { argb: ho.status === "Active" ? "FF166534" : "FF991B1B" },
        };
      }
    });
  });

  // Set column widths
  sheet1.columns = [
    { width: 28 }, // Full Name
    { width: 16 }, // Ownership Type
    { width: 12 }, // Gender
    { width: 15 }, // Birthdate
    { width: 10 }, // Age
    { width: 38 }, // Address
    { width: 16 }, // Household Count
    { width: 18 }, // Mobile
    { width: 28 }, // Email
    { width: 12 }, // Pets
    { width: 32 }, // GA Proxy
    { width: 12 }, // Status
  ];

  // --- SHEET 2: Household Members Registry ---
  const sheet2 = workbook.addWorksheet("Household Members", {
    views: [{ showGridLines: true }],
  });

  sheet2.mergeCells("A1:E1");
  const hmTitleCell = sheet2.getCell("A1");
  hmTitleCell.value = "HOUSEHOLD MEMBERS REGISTRY — ST. JOSEPH VILLAGE 6 PHASE 4";
  hmTitleCell.font = { name: "Arial", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
  hmTitleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F382A" },
  };
  hmTitleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet2.getRow(1).height = 28;

  const hmHeaders = [
    "Head of Household (Homeowner)",
    "Address",
    "Member Name",
    "Relationship to Head",
    "Homeowner Status",
  ];

  const hmHeaderRow = sheet2.getRow(3);
  hmHeaderRow.values = hmHeaders;
  hmHeaderRow.height = 24;

  hmHeaderRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F1E36" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  let hmRowIndex = 4;
  homeowners.forEach((ho) => {
    if (ho.household_members && ho.household_members.length > 0) {
      ho.household_members.forEach((member) => {
        const row = sheet2.getRow(hmRowIndex);
        row.values = [
          ho.full_name,
          ho.address,
          member.member_name,
          member.relationship,
          ho.status,
        ];
        row.height = 20;
        row.eachCell((cell, colIndex) => {
          cell.font = { name: "Arial", size: 9.5 };
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };
          if (colIndex === 4 || colIndex === 5) {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }
        });
        hmRowIndex++;
      });
    }
  });

  sheet2.columns = [
    { width: 28 },
    { width: 38 },
    { width: 26 },
    { width: 20 },
    { width: 16 },
  ];

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const timestamp = new Date().toISOString().slice(0, 10);
  const fullFilename = `${filenamePrefix}_${timestamp}.xlsx`;

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fullFilename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}
