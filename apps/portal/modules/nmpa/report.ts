import { checkCosmetics, type CosmeticsInput, CATEGORY_LABELS } from "./rules";

export interface ComplianceReport {
  id: string;
  module: string;
  generatedAt: string;
  productInfo: { name: string; category: string; originCountry?: string };
  result: any;
  nextSteps: string[];
}

export function generateCosmeticsReport(input: CosmeticsInput): Omit<ComplianceReport, "id" | "generatedAt"> {
  const result = checkCosmetics(input);
  return {
    module: "Cosmetics Filing (NMPA)",
    productInfo: { name: input.productName, category: CATEGORY_LABELS[input.category] },
    result,
    nextSteps: [
      "Contact SinoTrade Compliance for a detailed compliance assessment",
      "Designate a Chinese responsible person (境内责任人)",
      "Complete safety assessment report per NMPA 2021 guidelines",
      "Coordinate testing at NMPA-designated laboratory",
      "File NMPA notification (备案) or registration (注册) application",
    ],
  };
}
