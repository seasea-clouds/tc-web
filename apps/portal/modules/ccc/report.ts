import { checkCcc, type CccInput, CATEGORY_LABELS } from "./rules";

export interface ComplianceReport {
  id: string;
  module: string;
  generatedAt: string;
  productInfo: { name: string; category: string; originCountry?: string };
  result: any;
  nextSteps: string[];
}

export function generateCccReport(input: CccInput): Omit<ComplianceReport, "id" | "generatedAt"> {
  const result = checkCcc(input);
  return {
    module: "CCC Certification",
    productInfo: { name: input.productName, category: CATEGORY_LABELS[input.category] },
    result,
    nextSteps: [
      "Contact SinoTrade Compliance for a detailed compliance assessment",
      "Submit product samples to CNCA-accredited testing laboratory",
      "Prepare factory inspection documentation and quality manuals",
      "Complete CCC application with designated certification body",
      "Arrange ongoing compliance and annual surveillance audits",
    ],
  };
}
