import { checkTrademark, type TrademarkInput, CATEGORY_LABELS } from "./rules";

export interface ComplianceReport {
  id: string;
  module: string;
  generatedAt: string;
  productInfo: { name: string; category: string; originCountry?: string };
  result: any;
  nextSteps: string[];
}

export function generateTrademarkReport(input: TrademarkInput): Omit<ComplianceReport, "id" | "generatedAt"> {
  const result = checkTrademark(input);
  return {
    module: "Brand Protection",
    productInfo: { name: input.productName, category: CATEGORY_LABELS[input.category] },
    result,
    nextSteps: [
      "Contact SinoTrade Compliance for a detailed compliance assessment",
      "Conduct comprehensive CNIPA trademark search in relevant classes",
      "File trademark application via direct CNIPA filing (recommended)",
      "Monitor 3-month opposition period after publication",
      "Register Customs IP recordal (海关备案) after certificate issuance",
    ],
  };
}
