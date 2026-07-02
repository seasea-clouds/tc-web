#!/usr/bin/env python3
"""
P1b: Add missing en.json Check namespace keys for all modules.

Extracts all t("key") calls from rules.ts files, checks if they exist
in en.json Check namespace, and adds reasonable English text for any
that are completely missing (not at top-level, not in Check namespace).

Uses a mapping dict for contextual accuracy, plus auto-generation
from snake_case key names as fallback.
"""

import json, re, os, glob, sys

LOCALE_FILE = "apps/portal/messages/en.json"

# === Manual mapping for keys that need contextual English ===
# Format: key => English text
MANUAL_MAP = {
    # NMPA
    "nmpaExecutiveSummary": "Executive Summary",
    "nmpaDetailedTimeline": "Detailed Timeline",
    "nmpaCompetitiveAnalysis": "Competitive Analysis",
    "nmpaViability": "NMPA registration is feasible with proper documentation and qualified Chinese responsible person.",
    "nmpaLabGuide": "Testing must be conducted at an NMPA-designated laboratory.",
    "nmpaChannel_standard_name": "Standard Registration",
    "nmpaChannel_standard_desc_full": "Full NMPA registration pathway for special cosmetics requiring safety review and approval by NMPA.",
    "nmpaChannel_standard_desc_normal": "Standard NMPA notification pathway for ordinary cosmetics.",
    "nmpaChannel_standard_adv1": "Full legal market access for sales across all channels in China",
    "nmpaChannel_cbec_name": "Cross-Border E-Commerce",
    "nmpaChannel_cbec_desc": "Sell via CBEC channels without NMPA registration, using overseas warehouse fulfillment.",
    "nmpaChannel_cbec_adv1": "No NMPA registration required",
    "nmpaChannel_cbec_dis1": "Cannot sell through domestic retail channels",
    "nmpaChannel_cbec_dis2": "Limited to personal use quantities per order",
    "nmpaCost_safety_item": "Safety Assessment Fee",
    "nmpaCost_safety_notes": "Toxicological and safety evaluation by qualified third-party",
    "nmpaCost_testing_item": "Lab Testing Fee",
    "nmpaCost_testing_notes": "Microbiological, chemical, and stability testing at NMPA-designated lab",
    "nmpaCost_translation_item": "Translation Fee",
    "nmpaCost_translation_notes": "Chinese translation of all product documentation and labels",
    "nmpaCost_formula_item": "Formula Review Fee",
    "nmpaCost_formula_notes": "Ingredient compliance check against ICSC and CSAR catalogs",
    "nmpaCost_label_item": "Label Review Fee",
    "nmpaCost_label_notes": "Chinese label compliance review against GB 5296.3 and CSAR requirements",
    "nmpaCost_service_item": "Service Fee",
    "nmpaCost_service_notes": "End-to-end filing/registration management by SinoTrade",
    "nmpaMarket_trend": "Growing demand for functional and natural cosmetics in China",
    "nmpaMarket_driver1": "Rising middle-class spending on premium personal care",
    "nmpaMarket_driver2": "Increasing preference for imported brands with clean labels",
    "nmpaMarket_barrier1": "Strict NMPA ingredient and labeling requirements",
    "nmpaMarket_barrier2": "Intense competition from established local brands",
    "nmpaMarket_perception": "Foreign cosmetics perceived as higher quality, especially from France, Japan, and Korea",
    "nmpaMarket_recoHigh": "Full NMPA registration recommended due to regulatory requirements",
    "nmpaMarket_recoLow": "CBEC pilot is a viable entry strategy",
    "nmpaTimeline_formulaReview_name": "Formula Review",
    "nmpaTimeline_formulaReview_desc": "Review product formulation for compliance with ICSC catalogue and CSAR requirements",
    "nmpaTimeline_safetyAssess_name": "Safety Assessment",
    "nmpaTimeline_safetyAssess_desc": "Conduct safety assessment with certified toxicologist",
    "nmpaTimeline_labTest_name": "Lab Testing",
    "nmpaTimeline_labTest_desc": "Microbiological, chemical, and stability testing at NMPA-designated lab",
    "nmpaTimeline_dossier_name": "Dossier Preparation",
    "nmpaTimeline_dossier_desc": "Compile and translate all required documents for submission",
    "nmpaTimeline_submit_name": "NMPA Submission & Review",
    "nmpaTimeline_submit_desc": "Submit dossier to NMPA, respond to queries, and obtain filing certificate",
    "nmpaTimeline_post_name": "Post-Approval Obligations",
    "nmpaTimeline_post_desc": "Ongoing compliance, adverse event reporting, and renewal management",
    "nmpaPost_production_item": "Production & Quality Monitoring",
    "nmpaPost_production_frequency": "Ongoing",
    "nmpaPost_production_desc": "Maintain consistent product quality and GMP compliance",
    "nmpaPost_formulaChange_item": "Formula Change Notification",
    "nmpaPost_formulaChange_frequency": "As needed",
    "nmpaPost_formulaChange_desc": "Notify NMPA of any ingredient or formulation changes",
    "nmpaPost_labelUpdate_item": "Label Update Compliance",
    "nmpaPost_labelUpdate_frequency": "Ongoing",
    "nmpaPost_labelUpdate_desc": "Keep labels compliant with evolving GB standards",
    "nmpaPost_renewal_item": "Filing Renewal",
    "nmpaPost_renewal_frequency": "Every 4 years",
    "nmpaPost_renewal_desc": "Renew cosmetics filing before expiration",
    "nmpaHorizon_labelRev_topic": "Label Regulation Revision",
    "nmpaHorizon_labelRev_impact": "Moderate",
    "nmpaHorizon_labelRev_timeframe": "2-3 years",
    "nmpaHorizon_labelRev_desc": "CSAR label requirements may be updated to align with international standards",
    "nmpaHorizon_specialList_topic": "Special Ingredients List Update",
    "nmpaHorizon_specialList_impact": "High",
    "nmpaHorizon_specialList_timeframe": "1-2 years",
    "nmpaHorizon_specialList_desc": "NMPA may expand the catalogue of prohibited and restricted substances",
    "nmpaHorizon_animalTest_topic": "Animal Testing Alternatives",
    "nmpaHorizon_animalTest_impact": "Medium",
    "nmpaHorizon_animalTest_timeframe": "3-5 years",
    "nmpaHorizon_animalTest_desc": "China is gradually accepting alternative methods to animal testing",
    "nmpaProfile_skincare_riskReason": "Multiple ingredients require safety assessment and testing",
    "nmpaProfile_haircare_riskReason": "Formaldehyde releasers and other restricted substances must be verified",
    "nmpaProfile_oralcare_riskReason": "Fluoride content limits and microbial standards apply",
    "nmpaProfile_babycare_riskReason": "Stricter safety thresholds for infant and children products",
    "nmpaProfile_makeup_riskReason": "Colorant restrictions and heavy metal limits apply",
    "nmpaProfile_fragrance_riskReason": "Allergen labeling and restricted fragrance ingredients",
    "nmpaProfile_suncare_riskReason": "SPF claims require specific testing protocols",
    "nmpaProfile_deodorant_riskReason": "Antimicrobial active ingredients subject to additional review",
    "nmpaRiskDim_babycare_riskNote": "Baby and children cosmetics face stricter safety thresholds and additional testing requirements under CSAR.",
    "nmpaRiskDim_haircare_riskNote": "Hair care products containing formaldehyde releasers or specific preservatives require detailed documentation.",
    "nmpaRiskDim_makeup_riskNote": "Color cosmetics must comply with restricted colorant lists and heavy metal limits.",
    "nmpaRiskDim_fragrance_riskNote": "Fragrance products must list all allergens and comply with restricted fragrance ingredient lists.",
    "nmpaRiskDim_suncare_riskNote": "Sunscreen and UV protection products require specific SPF testing protocols and active ingredient approval.",
    "nmpaRiskDim_skincare_riskNote": "Skincare products for sensitive skin categories require additional safety documentation.",
    "nmpaRiskDim_oralcare_riskNote": "Oral care products are subject to fluoride content limits and microbial standards.",
    "nmpaRiskDim_deodorant_riskNote": "Deodorants with antimicrobial claims require additional NMPA review and testing.",
    "nmpaRiskDim_general_riskNote": "Standard cosmetics require basic safety assessment and ingredient compliance.",
    "nmpaRiskDim_babycare_mit_key": "Engage toxicologist early for safety assessment",
    "nmpaRiskDim_haircare_mit_key": "Verify all preservatives against ICSC catalogue",
    "nmpaRiskDim_makeup_mit_key": "Pre-check colorants against permitted cosmetic colorant list",
    "nmpaRiskDim_fragrance_mit_key": "Use IFRA-compliant fragrance formulations",
    "nmpaRiskDim_suncare_mit_key": "Prepare for specific SPF testing at NMPA-lab",
    "nmpaRiskDim_skincare_mit_key": "Prepare ingredient justification for sensitive-skin claims",
    "nmpaRiskDim_oralcare_mit_key": "Verify fluoride content against GB standards",
    "nmpaRiskDim_deodorant_mit_key": "Prepare antimicrobial efficacy data",
    "nmpaRiskDim_general_mit_key": "Standard compliance documentation package",
    "nmpaRiskDim_babycare_detail": "Develop comprehensive safety dossier with pediatric toxicology specialist",
    "nmpaRiskDim_haircare_detail": "Create detailed preservative usage justification with concentration levels",
    "nmpaRiskDim_makeup_detail": "Compile full colorant compliance report with batch certificates",
    "nmpaRiskDim_fragrance_detail": "Prepare complete IFRA compliance certificate and allergen declaration",
    "nmpaRiskDim_suncare_detail": "Arrange SPF testing protocol and secure NMPA-designated lab booking",
    "nmpaRiskDim_skincare_detail": "Prepare ingredient-specific safety justifications for sensitive skin claims",
    "nmpaRiskDim_oralcare_detail": "Prepare fluoride level verification report with GB standard cross-reference",
    "nmpaRiskDim_deodorant_detail": "Prepare antimicrobial efficacy study reports",
    "nmpaRiskDim_general_detail": "Prepare standard safety assessment report package",

    # CCC
    "cccExecutiveSummary": "Executive Summary",
    "cccDetailedTimeline": "Detailed Timeline",
    "cccCompetitiveAnalysis": "Competitive Analysis",
    "cccChannel_standard_name": "Standard CCC Certification",
    "cccChannel_standard_desc_full": "Full CCC certification pathway through CNCA-accredited bodies for mandatory products",
    "cccChannel_standard_desc_normal": "Standard CCC certification for products under China Compulsory Certification system",
    "cccChannel_standard_adv1": "Legal market access to all sales channels in China",
    "cccChannel_cbec_name": "Cross-Border E-Commerce",
    "cccChannel_cbec_desc": "Use CBEC to test market demand before committing to full CCC certification",
    "cccChannel_cbec_adv1": "No CCC certification required for CBEC channel",
    "cccChannel_cbec_dis1": "Cannot sell through domestic retail channels",
    "cccChannel_cbec_dis2": "Product categories limited by CBEC positive list",
    "cccCost_testing_item": "Type Testing Fee",
    "cccCost_testing_notes": "Testing at CNCA-accredited laboratory per product category",
    "cccCost_factoryInsp_item": "Factory Inspection Fee",
    "cccCost_factoryInsp_notes": "On-site QMS audit by CNCA-accredited auditor",
    "cccCost_certFee_item": "Certification Fee",
    "cccCost_certFee_notes": "CCC certification issuance and registration with CNCA",
    "cccCost_cbConv_item": "CB Report Conversion Fee",
    "cccCost_cbConv_notes": "Conversion of existing IEC CB test report to CCC standards",
    "cccCost_manualTrans_item": "Translation & Documentation Fee",
    "cccCost_manualTrans_notes": "Chinese translation of technical manuals, diagrams, and specifications",
    "cccCost_service_item": "Service Fee",
    "cccCost_service_notes": "End-to-end certification management by SinoTrade",
    "cccCost_annualFollowup_item": "Annual Follow-up Fee",
    "cccCost_annualFollowup_notes": "Annual factory surveillance and certification maintenance",
    "cccHorizon_iot_topic": "IoT Product Regulations",
    "cccHorizon_iot_impact": "High",
    "cccHorizon_iot_timeframe": "2-3 years",
    "cccHorizon_iot_desc": "New cybersecurity requirements for connected devices may expand CCC scope",
    "cccHorizon_gbRev_topic": "GB Standard Revision Cycle",
    "cccHorizon_gbRev_impact": "Medium",
    "cccHorizon_gbRev_timeframe": "1-2 years",
    "cccHorizon_gbRev_desc": "Several GB standards are under revision affecting testing parameters",
    "cccHorizon_cbDigital_topic": "Digital CB Reports",
    "cccHorizon_cbDigital_impact": "Low",
    "cccHorizon_cbDigital_timeframe": "3-5 years",
    "cccHorizon_cbDigital_desc": "IECEE is phasing in digital CB reports to streamline international certification",
    "cccMarket_trend": "Growing demand for certified electronic products in China",
    "cccMarket_driver1": "Technology upgrade cycle driving replacement demand",
    "cccMarket_driver2": "Rising standards for product safety and energy efficiency",
    "cccMarket_barrier1": "Complex certification process with varying timelines",
    "cccMarket_barrier2": "Factory inspection requirements can be resource-intensive",
    "cccMarket_perception": "CCC certification is a quality mark trusted by Chinese consumers",
    "cccMarket_recoHigh": "Full CCC certification is mandatory for products on the CCC catalogue",
    "cccMarket_recoLow": "Consider CBEC entry if product category permits",
    "cccTimeline_preAssess_name": "Pre-Assessment",
    "cccTimeline_preAssess_desc": "Pre-assessment of product against applicable GB standards and CCC requirements",
    "cccTimeline_typeTest_name": "Type Testing",
    "cccTimeline_typeTest_desc": "Product testing at CNCA-accredited laboratory for safety and EMC",
    "cccTimeline_factoryInsp_name": "Factory Inspection",
    "cccTimeline_factoryInsp_desc": "On-site factory QMS audit by CNCA-certified inspectors",
    "cccTimeline_certReview_name": "Certification Review",
    "cccTimeline_certReview_desc": "CNCA review of test reports and factory inspection results",
    "cccTimeline_certMark_name": "Certification & Marking",
    "cccTimeline_certMark_desc": "Issuance of CCC certificate and authorization to use CCC mark",
    "cccTimeline_annual_name": "Annual Surveillance",
    "cccTimeline_annual_desc": "Annual factory follow-up inspection and testing verification",
    "cccPost_annualInsp_item": "Annual Factory Inspection",
    "cccPost_annualInsp_frequency": "Annually",
    "cccPost_annualInsp_desc": "Annual factory surveillance inspection by certification body",
    "cccPost_changeNotice_item": "Change Notification",
    "cccPost_changeNotice_frequency": "As needed",
    "cccPost_changeNotice_desc": "Notify certification body of any product or process changes",
    "cccPost_renewal_item": "Certificate Renewal",
    "cccPost_renewal_frequency": "Every 5 years",
    "cccPost_renewal_desc": "Full renewal of CCC certification every 5 years",
    "cccPost_surveillance_item": "Market Surveillance",
    "cccPost_surveillance_frequency": "Ongoing",
    "cccPost_surveillance_desc": "SAMR market sampling and testing to verify ongoing compliance",
    "cccProfile_electronics_riskReason": "EMC compliance and safety testing required for all electronic products",
    "cccProfile_homeAppliance_riskReason": "Multiple GB standards for safety and energy efficiency apply",
    "cccProfile_itEquipment_riskReason": "Safety, EMC, and SRRC wireless certification required",
    "cccProfile_lighting_riskReason": "Photobiological safety and energy efficiency labeling required",
    "cccProfile_toy_riskReason": "GB 6675 safety standards with strict mechanical and chemical testing",
    "cccProfile_medical_riskReason": "NMPA medical device registration required in addition to CCC",
    "cccRiskDim_electronics_riskNote": "Electronic products require comprehensive EMC and safety testing for both conducted and radiated emissions.",
    "cccRiskDim_homeAppliance_riskNote": "Home appliances must comply with product-specific safety standards and energy efficiency labeling requirements.",
    "cccRiskDim_itEquipment_riskNote": "IT and telecom equipment requires additional SRRC wireless type approval for radio functions.",
    "cccRiskDim_lighting_riskNote": "Lighting products must meet photobiological safety standards and energy efficiency tier requirements.",
    "cccRiskDim_toy_riskNote": "Toys must comply with GB 6675 series covering mechanical, flammability, and chemical migration limits.",
    "cccRiskDim_medical_riskNote": "Medical devices under CCC require additional NMPA registration and QMS certification (ISO 13485).",
    "cccRiskDim_general_riskNote": "General CCC products require standard testing and factory inspection.",
    "cccRiskDim_electronics_mit_key": "Pre-scan EMC pre-compliance before type testing",
    "cccRiskDim_homeAppliance_mit_key": "Check GB standards version applicability before design",
    "cccRiskDim_itEquipment_mit_key": "Coordinate wireless approval timeline with CCC testing",
    "cccRiskDim_lighting_mit_key": "Pre-calculate energy efficiency class before submission",
    "cccRiskDim_toy_mit_key": "Engage lab early for GB 6675 chemical migration pre-testing",
    "cccRiskDim_medical_mit_key": "Plan dual NMPA + CCC registration timeline carefully",
    "cccRiskDim_general_mit_key": "Complete pre-assessment questionnaire before submission",
    "cccRiskDim_electronics_detail": "Conduct EMC pre-scan and review conducted/radiated emission limits per GB standards",
    "cccRiskDim_homeAppliance_detail": "Verify product against latest applicable GB standard version and energy class requirements",
    "cccRiskDim_itEquipment_detail": "Submit SRRC wireless approval parallel to CCC testing to reduce timeline",
    "cccRiskDim_lighting_detail": "Calculate LED efficacy and color rendering to ensure meets minimum GB tier",
    "cccRiskDim_toy_detail": "Arrange GB 6675 chemical migration pre-testing with candidate materials list",
    "cccRiskDim_medical_detail": "Map out dual NMPA registration and CCC certification pathways with timeline",
    "cccRiskDim_general_detail": "Complete product compliance pre-check and documentation gap analysis",
}

def snake_to_title(s):
    """Convert snake_case key to human-readable title."""
    # Strip common prefixes
    parts = s.split("_")
    
    # Remove module prefix if present (first part)
    known_prefixes = {'nmpa', 'ccc', 'gacc', 'label', 'cb', 'tm', 'crossborder'}
    start = 1 if parts[0] in known_prefixes else 0
    
    # Process remaining parts
    result_parts = []
    for p in parts[start:]:
        if p in ('item', 'fee', 'name', 'desc', 'notes', 'key', 'detail'):
            continue
        if p == 'riskReason':
            result_parts.append('Risk Reason')
        elif p == 'riskNote':
            result_parts.append('Risk Note')
        elif p == 'mit_key':
            result_parts.append('Mitigation:')
        elif p == 'detail':
            result_parts.append('Detail')
        else:
            result_parts.append(p.replace('_', ' ').title())
    
    return ' '.join(result_parts) if result_parts else s


def main():
    with open(LOCALE_FILE, 'r', encoding='utf-8') as f:
        en = json.load(f)
    
    if 'Check' not in en:
        en['Check'] = {}
    
    check_keys = set(en['Check'].keys())
    top_keys = set(en.keys())
    
    module_files = sorted(glob.glob('apps/portal/modules/*/rules.ts'))
    added = 0
    
    for mf in module_files:
        mod_name = os.path.basename(os.path.dirname(mf))
        with open(mf) as f:
            content = f.read()
        
        keys = re.findall(r"""t\(['\\"]([a-zA-Z_][a-zA-Z0-9_]*)['\\"]\)""", content)
        unique_keys = sorted(set(keys))
        
        for k in unique_keys:
            if k in check_keys or k in top_keys:
                continue  # Already exists somewhere
            
            if k in MANUAL_MAP:
                en['Check'][k] = MANUAL_MAP[k]
                added += 1
            else:
                # Auto-generate from key name
                en['Check'][k] = snake_to_title(k)
                added += 1
    
    # Write updated en.json
    with open(LOCALE_FILE, 'w', encoding='utf-8') as f:
        json.dump(en, f, ensure_ascii=False, indent=2)
        f.write('\n')
    
    print(f"✅ Added {added} missing keys to en.json Check namespace")
    print(f"Manual: {sum(1 for k, v in MANUAL_MAP.items() if k in check_keys or k in en.get('Check', {}))}")
    
    # Summary per module
    for mf in module_files:
        mod_name = os.path.basename(os.path.dirname(mf))
        with open(mf) as f:
            content = f.read()
        keys = re.findall(r"""t\(['\\"]([a-zA-Z_][a-zA-Z0-9_]*)['\\"]\)""", content)
        unique_keys = sorted(set(keys))
        
        with open(LOCALE_FILE) as f:
            en = json.load(f)
        check_keys = set(en.get('Check', {}).keys())
        
        still_missing = [k for k in unique_keys if k not in check_keys and k not in top_keys]
        print(f"  {mod_name}: {len(unique_keys)} total, {len(still_missing)} still missing after fix")
    
    return added

if __name__ == "__main__":
    main()
