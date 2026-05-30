import { checkGacc, type GaccInput, type GaccResult, CATEGORY_LABELS } from "./rules";

export interface ComplianceReport {
  id: string;
  module: string;
  generatedAt: string;
  productInfo: {
    name: string;
    category: string;
    hsCode?: string;
    originCountry: string;
  };
  result: GaccResult;
  nextSteps: string[];
}

export function generateGaccReport(input: GaccInput): Omit<ComplianceReport, "id" | "generatedAt"> {
  const result = checkGacc(input);

  return {
    module: "GACC Food Registration",
    productInfo: {
      name: input.productName,
      category: CATEGORY_LABELS[input.category],
      hsCode: input.hsCode,
      originCountry: input.originCountry,
    },
    result,
    nextSteps: [
      "Contact SinoTrade Compliance for a detailed compliance assessment",
      "Prepare required documentation",
      "Submit GACC registration application",
      "Design compliant Chinese label (GB 7718)",
      "Arrange customs clearance support",
    ],
  };
}
