/**
 * Cloudflare Pages Functions 兼容的 PDF 生成器
 * 使用 pdf-lib（纯 JS，无 Node.js 原生依赖）
 *
 * 替代 @react-pdf/renderer（需要 Node.js 运行时，在 workerd 中不可用）
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface CfPdfReportData {
  reportId: string;
  module: string;
  generatedAt: string;
  productInfo: {
    name: string;
    category: string;
    hsCode?: string;
    originCountry: string;
  };
  result: {
    requiresRegistration: boolean;
    isHighRisk: boolean;
    riskCategory: string;
    summary: string;
    requiredDocuments: string[];
  };
  nextSteps: string[];
}

/** 使用 pdf-lib 生成合规报告 PDF */
export async function generateCfReportPdf(data: CfPdfReportData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.106, 0.212, 0.365);   // #1B365D
  const gold = rgb(0.831, 0.686, 0.216);    // #D4AF37
  const gray = rgb(0.4, 0.4, 0.4);
  const dark = rgb(0.2, 0.2, 0.2);
  const light = rgb(0.957, 0.965, 0.976);   // #F4F6F9
  const white = rgb(1, 1, 1);

  let y = 800;
  const margin = 50;
  const line = (fontSize = 10) => fontSize + 4;
  const maxWidth = 495;

  // ── Header ──────────────────────────────────────────────────────
  page.drawRectangle({
    x: 0, y: y + 20, width: 595.28, height: 50,
    color: navy,
  });
  page.drawText("China Compliance Report", {
    x: margin, y: y + 38, size: 14, font: bold, color: white,
  });
  page.drawText(data.module, {
    x: margin, y: y + 22, size: 8, font, color: rgb(0.8, 0.8, 0.8),
  });
  page.drawText(`Report #${data.reportId}`, {
    x: 430, y: y + 38, size: 8, font, color: rgb(0.8, 0.8, 0.8),
  });
  page.drawText(data.generatedAt, {
    x: 430, y: y + 22, size: 8, font, color: rgb(0.8, 0.8, 0.8),
  });
  y -= 50;

  // ── Product Information ─────────────────────────────────────────
  y -= 10;
  page.drawText("PRODUCT INFORMATION", {
    x: margin, y, size: 9, font: bold, color: gray,
  });
  y -= line(9);

  page.drawRectangle({
    x: margin, y: y - 55, width: maxWidth, height: 55,
    color: light,
  });
  y -= 8;

  const infoLines = [
    `Product: ${data.productInfo.name}`,
    `Category: ${data.productInfo.category}`,
    data.productInfo.hsCode ? `HS Code: ${data.productInfo.hsCode}` : null,
    `Origin: ${data.productInfo.originCountry}`,
  ].filter(Boolean) as string[];

  for (const info of infoLines) {
    page.drawText(info, { x: margin + 8, y, size: 9, font, color: dark });
    y -= 16;
  }
  y -= 14;

  // ── Assessment Result ───────────────────────────────────────────
  y -= 10;
  page.drawText("ASSESSMENT RESULT", {
    x: margin, y, size: 9, font: bold, color: gray,
  });
  y -= line(9);

  const isHigh = data.result.requiresRegistration;
  const boxColor = isHigh ? rgb(1, 0.98, 0.922) : rgb(0.941, 0.992, 0.953);
  const borderColor = isHigh ? rgb(0.988, 0.827, 0.302) : rgb(0.733, 0.969, 0.816);

  // Measure summary text height
  const sumLines = data.result.summary ? Math.ceil(data.result.summary.length / 70) : 1;
  const boxHeight = 30 + sumLines * 14;

  page.drawRectangle({
    x: margin, y: y - boxHeight, width: maxWidth, height: boxHeight,
    color: boxColor,
    borderColor,
    borderWidth: 1,
  });
  y -= 12;

  const resultTitle = isHigh
    ? "GACC Registration Required"
    : "No GACC Registration Required";
  page.drawText(resultTitle, {
    x: margin + 8, y, size: 11, font: bold, color: isHigh ? rgb(0.78, 0.44, 0) : rgb(0.13, 0.55, 0.13),
  });
  y -= 18;

  if (data.result.summary) {
    // Word wrap summary
    const words = data.result.summary.split(" ");
    let lineText = "";
    for (const word of words) {
      const test = lineText ? lineText + " " + word : word;
      if (test.length > 70) {
        page.drawText(lineText, { x: margin + 8, y, size: 8, font, color: dark });
        y -= 13;
        lineText = word;
      } else {
        lineText = test;
      }
    }
    if (lineText) {
      page.drawText(lineText, { x: margin + 8, y, size: 8, font, color: dark });
    }
  }
  y -= boxHeight - 30 - sumLines * 14 + 10;

  // ── Required Documents ──────────────────────────────────────────
  y -= 14;
  page.drawText("REQUIRED DOCUMENTS", {
    x: margin, y, size: 9, font: bold, color: gray,
  });
  y -= line(9);

  if (data.result.requiredDocuments.length > 0) {
    for (const reqDoc of data.result.requiredDocuments.slice(0, 10)) {
      // Check if we need a new page
      if (y < 60) {
        // Add a new page
        const newPage = doc.addPage([595.28, 841.89]);
        y = 800;
      }
      page.drawText(`☐  ${reqDoc}`, { x: margin + 4, y, size: 9, font, color: dark });
      y -= 16;
    }
    if (data.result.requiredDocuments.length > 10) {
      page.drawText(`+ ${data.result.requiredDocuments.length - 10} more...`, {
        x: margin + 4, y, size: 8, font, color: gray,
      });
      y -= 16;
    }
  }

  // ── Next Steps ──────────────────────────────────────────────────
  y -= 14;
  page.drawText("NEXT STEPS", {
    x: margin, y, size: 9, font: bold, color: gray,
  });
  y -= line(9);

  if (data.nextSteps.length > 0) {
    for (let i = 0; i < data.nextSteps.length; i++) {
      if (y < 60) {
        const newPage = doc.addPage([595.28, 841.89]);
        y = 800;
      }
      page.drawText(`${i + 1}. ${data.nextSteps[i]}`, {
        x: margin + 4, y, size: 9, font, color: dark,
      });
      y -= 16;
    }
  }

  // ── CTA ─────────────────────────────────────────────────────────
  y -= 20;
  if (y < 120) {
    const newPage = doc.addPage([595.28, 841.89]);
    y = 780;
  }
  page.drawRectangle({
    x: margin, y: y - 70, width: maxWidth, height: 70,
    color: navy,
  });
  y -= 14;
  page.drawText("Need Professional Help?", {
    x: margin + 20, y, size: 12, font: bold, color: gold,
  });
  y -= 18;
  page.drawText("Our compliance experts can provide a tailored market-entry plan.", {
    x: margin + 20, y, size: 9, font, color: white,
  });
  y -= 16;
  page.drawText("david@sinotradecompliance.com | sinotradecompliance.com", {
    x: margin + 20, y, size: 8, font, color: rgb(0.7, 0.7, 0.7),
  });

  // ── Footer ──────────────────────────────────────────────────────
  page.drawLine({
    start: { x: margin, y: 40 },
    end: { x: 545, y: 40 },
    color: rgb(0.9, 0.9, 0.9),
    thickness: 1,
  });
  page.drawText("SinoTrade Compliance — Jing'an District, Shanghai, China", {
    x: margin, y: 28, size: 7, font, color: gray,
  });
  page.drawText("david@sinotradecompliance.com | sinotradecompliance.com", {
    x: margin, y: 18, size: 7, font, color: gray,
  });

  return doc.save();
}

/** 生成 PDF 并返回 base64 */
export async function generateCfReportPdfBase64(data: CfPdfReportData): Promise<string> {
  const pdfBytes = await generateCfReportPdf(data);
  return btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));
}

/** 生成 PDF 并返回 ArrayBuffer */
export async function generateCfReportPdfBuffer(data: CfPdfReportData): Promise<ArrayBuffer> {
  const pdfBytes = await generateCfReportPdf(data);
  return pdfBytes.buffer as ArrayBuffer;
}
