import { checkLabel, type LabelInput, CATEGORY_LABELS } from "./rules";

export interface ComplianceReport {
  id: string;
  module: string;
  generatedAt: string;
  productInfo: { name: string; category: string; originCountry?: string };
  result: any;
  nextSteps: string[];
}

export function generateLabelReport(input: LabelInput): Omit<ComplianceReport, "id" | "generatedAt"> {
  const result = checkLabel(input);
  return {
    module: "Chinese Label Compliance",
    productInfo: { name: input.productName, category: CATEGORY_LABELS[input.category] },
    result,
    nextSteps: [
      "Contact SinoTrade Compliance for label design and review",
      "Prepare product ingredients documentation",
      "Design Chinese label according to GB 7718",
      "Verify label with regulatory review",
      "Arrange customs clearance support",
    ],
  };
}
