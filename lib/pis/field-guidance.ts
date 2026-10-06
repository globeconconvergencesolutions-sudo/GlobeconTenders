/** One sentence per market field, drawn from the taxonomy's typical requirements. Guidance only. */
export const FIELD_GUIDANCE: Record<string, string> = {
  "ict-and-software":
    "Buyers often ask for custom software, web or mobile applications, and enterprise systems.",
  "data-analytics-and-ai":
    "Buyers often ask for analytics, dashboards, data engineering, and artificial intelligence.",
  "cybersecurity-and-digital-risk":
    "Buyers often ask for security assessments, penetration tests, and vulnerability reviews.",
  "ict-infrastructure-and-cloud":
    "Buyers often ask for cloud hosting, servers, storage, and managed infrastructure.",
  telecommunications:
    "Buyers often ask for internet connectivity, broadband, and office telephone systems.",
  "digital-transformation-and-e-government":
    "Buyers often ask for digitization, e-government platforms, and digital service delivery.",
  "public-finance-and-social-protection-systems":
    "Buyers often ask for public-finance systems, budgeting tools, and social-protection registries.",
  "research-surveys-and-evaluation":
    "Buyers often ask for baseline studies, impact evaluations, and market research.",
  "monitoring-evaluation-and-learning":
    "Buyers often ask for results frameworks, performance monitoring, and evaluation services.",
  "management-and-business-consultancy":
    "Buyers often ask for strategy, organizational development, and process improvement.",
  "finance-accounting-and-audit":
    "Buyers often ask for external or internal audit, financial management, and accounting.",
  "legal-and-regulatory":
    "Buyers often ask for legal advice, contract review, drafting, and regulatory compliance.",
  "construction-and-building-works":
    "Buyers often ask for building works, renovation, maintenance, and roofing.",
  "roads-civil-works-and-infrastructure":
    "Buyers often ask for road construction, rehabilitation, bridges, and drainage.",
  "water-sanitation-and-wash":
    "Buyers often ask for boreholes, water supply, treatment, and storage.",
  "electrical-mechanical-and-engineering":
    "Buyers often ask for electrical installation, mechanical works, and plumbing.",
  "energy-and-renewable-energy":
    "Buyers often ask for solar systems, storage, and inverters.",
  "agriculture-and-agribusiness":
    "Buyers often ask for farm inputs, seeds, fertilizer, and machinery.",
  "healthcare-and-medical":
    "Buyers often ask for medical equipment, consumables, and laboratory supplies.",
  "education-and-training":
    "Buyers often ask for training, capacity building, and curriculum development.",
  "transport-logistics-and-fleet":
    "Buyers often ask for vehicle supply, hire, and fleet services.",
  "travel-hospitality-and-events":
    "Buyers often ask for travel, air tickets, hotels, and conference facilities.",
  "office-furniture-and-general-supplies":
    "Buyers often ask for stationery, computers, printers, and office furniture.",
  "security-safety-and-emergency":
    "Buyers often ask for guarding, CCTV, access control, and alarms.",
  "cleaning-facilities-and-property-services":
    "Buyers often ask for cleaning, fumigation, laundry, and grounds maintenance.",
  "marketing-communications-and-creative":
    "Buyers often ask for digital marketing, advertising, and public relations.",
  "environment-climate-and-natural-resources":
    "Buyers often ask for environmental assessments, audits, and climate advisory.",
  "engineering-architecture-and-surveying":
    "Buyers often ask for architectural design, structural design, and engineering consultancy.",
  "manufacturing-and-industrial-services":
    "Buyers often ask for industrial equipment, production machinery, and factory maintenance.",
  "procurement-supply-chain-and-outsourcing":
    "Buyers often ask for procurement advisory, inventory, and warehouse management.",
  "human-resources-and-professional-services":
    "Buyers often ask for recruitment, HR consultancy, and job evaluation.",
  "printing-publishing-and-records":
    "Buyers often ask for bulk printing, manuals, publications, and forms.",
  "telecommunications-media-and-av":
    "Buyers often ask for public-address systems, audio, video, and broadcast equipment.",
  "food-nutrition-and-household-commodities":
    "Buyers often ask for food supply, fresh produce, cereals, and household commodities.",
  "fuels-chemicals-and-industrial-consumables":
    "Buyers often ask for fuel, lubricants, industrial gases, and chemicals.",
  "insurance-and-risk-services":
    "Buyers often ask for general, medical, motor, and property insurance.",
  "development-ngo-and-humanitarian-services":
    "Buyers often ask for community development, livelihoods, and social-inclusion programmes.",
  "specialized-technical-services":
    "Buyers often ask for equipment calibration, inspection, testing, and asset tagging.",
};

export function guidanceForField(slug: string): string {
  return (
    FIELD_GUIDANCE[slug] ??
    "Buyers in this field publish invitations for a defined kind of work. Add it only if your firm does that work."
  );
}
