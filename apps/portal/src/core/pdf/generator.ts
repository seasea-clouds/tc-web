import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReportPdfDocument } from "./template";
import type { PdfReportData } from "./template";

/** Generate a report PDF buffer from report data */
export async function generateReportPdf(data: PdfReportData): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(ReportPdfDocument as any, data as any);
  const result = await renderToBuffer(element);
  return Buffer.from(result as Uint8Array);
}

/** Generate PDF and return as base64 */
export async function generateReportPdfBase64(data: PdfReportData): Promise<string> {
  const buffer = await generateReportPdf(data);
  return buffer.toString("base64");
}
