import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#333",
  },
  header: {
    borderBottom: "1 solid #1B365D",
    paddingBottom: 10,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  headerLeft: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1B365D",
  },
  headerRight: {
    fontSize: 8,
    color: "#999",
    textAlign: "right",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#999",
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 1,
  },
  infoBox: {
    backgroundColor: "#F4F6F9",
    padding: 10,
    borderRadius: 4,
    fontSize: 9,
    lineHeight: 1.6,
  },
  resultBoxHigh: {
    padding: 12,
    borderRadius: 4,
    backgroundColor: "#FFFBEB",
    border: "1 solid #FCD34D",
  },
  resultBoxLow: {
    padding: 12,
    borderRadius: 4,
    backgroundColor: "#F0FDF4",
    border: "1 solid #BBF7D0",
  },
  resultTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 4,
  },
  resultText: {
    fontSize: 9,
    color: "#666",
    lineHeight: 1.5,
  },
  docItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 3,
    fontSize: 9,
  },
  checkbox: {
    width: 10,
    height: 10,
    border: "1 solid #ccc",
    borderRadius: 2,
    marginRight: 6,
    marginTop: 2,
  },
  ctaBox: {
    backgroundColor: "#1B365D",
    padding: 16,
    borderRadius: 4,
    alignItems: "center",
    marginTop: 10,
  },
  ctaTitle: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 4,
  },
  ctaText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 9,
    textAlign: "center",
  },
  footer: {
    borderTop: "1 solid #eee",
    paddingTop: 8,
    marginTop: 20,
    textAlign: "center",
    fontSize: 7,
    color: "#999",
  },
});

export interface PdfReportData {
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

export function ReportPdfDocument(data: PdfReportData) {
  const isHigh = data.result.requiresRegistration;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerLeft}>China Compliance Report</Text>
            <Text style={{ fontSize: 8, color: "#666" }}>{data.module}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text>Report #{data.reportId}</Text>
            <Text>{data.generatedAt}</Text>
          </View>
        </View>

        {/* Product Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product Information</Text>
          <View style={styles.infoBox}>
            <Text>Product: {data.productInfo.name}</Text>
            <Text>Category: {data.productInfo.category}</Text>
            {data.productInfo.hsCode && <Text>HS Code: {data.productInfo.hsCode}</Text>}
            <Text>Origin: {data.productInfo.originCountry}</Text>
          </View>
        </View>

        {/* Result */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assessment Result</Text>
          <View style={isHigh ? styles.resultBoxHigh : styles.resultBoxLow}>
            <Text style={styles.resultTitle}>
              {isHigh
                ? "GACC Registration Required"
                : "No GACC Registration Required"}
            </Text>
            <Text style={styles.resultText}>{data.result.summary}</Text>
          </View>
        </View>

        {/* Documents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Required Documents</Text>
          {data.result.requiredDocuments.map((doc, i) => (
            <View key={i} style={styles.docItem}>
              <View style={styles.checkbox} />
              <Text style={{ flex: 1 }}>{doc}</Text>
            </View>
          ))}
        </View>

        {/* Next Steps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Next Steps</Text>
          {data.nextSteps.map((step, i) => (
            <Text key={i} style={{ fontSize: 9, marginBottom: 3 }}>
              {i + 1}. {step}
            </Text>
          ))}
        </View>

        {/* CTA */}
        <View style={styles.section}>
          <View style={styles.ctaBox}>
            <Text style={styles.ctaTitle}>Get a Custom Quote</Text>
            <Text style={styles.ctaText}>
              Our compliance experts will provide a tailored plan for your product.
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 8, marginTop: 6 }}>
              david@sinotradecompliance.com | sinotradecompliance.com
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>SinoTrade Compliance — Jing'an District, Shanghai, China</Text>
          <Text>david@sinotradecompliance.com | sinotradecompliance.com</Text>
        </View>
      </Page>
    </Document>
  );
}
