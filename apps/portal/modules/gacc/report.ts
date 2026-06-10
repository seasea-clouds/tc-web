import { checkGacc, type GaccInput, CATEGORY_LABELS } from "./rules";
import type { ComplianceReport } from "../shared/types";

export type { ComplianceReport };

export function generateGaccReport(input: GaccInput, locale?: string): Omit<ComplianceReport, "id" | "generatedAt"> {
  const result = checkGacc(input, locale);

  return {
    module: "GACC Food Registration",
    productInfo: {
      name: input.productName,
      category: CATEGORY_LABELS[input.category] || input.category,
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
