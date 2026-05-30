import { checkCrossborder, type CrossborderInput, CATEGORY_LABELS } from "./rules";

export interface ComplianceReport {
  id: string;
  module: string;
  generatedAt: string;
  productInfo: { name: string; category: string; originCountry?: string };
  result: any;
  nextSteps: string[];
}

export function generateCrossborderReport(input: CrossborderInput): Omit<ComplianceReport, "id" | "generatedAt"> {
  const result = checkCrossborder(input);
  return {
    module: "Cross-border E-commerce",
    productInfo: { name: input.productName, category: CATEGORY_LABELS[input.category] },
    result,
    nextSteps: [
      "Contact SinoTrade Compliance for a detailed compliance assessment",
      "Complete platform merchant registration and compliance review",
      "Set up bonded warehouse logistics and three-document matching",
      "Configure product listings with compliant Chinese content",
      "Launch store and optimize for Chinese consumer preferences",
    ],
  };
}
