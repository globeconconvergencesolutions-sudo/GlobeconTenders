export const SEED_SOURCES = [
  { name: "World Bank", slug: "world-bank", color: "#2563eb", enabled: true },
  { name: "Tender Yetu", slug: "tender-yetu", color: "#f97316", enabled: true },
] as const;

type SeedTender = {
  referenceId: string;
  title: string;
  category: string;
  deadline: string;
  sourceSlug: string;
};

export const SEED_TENDERS: SeedTender[] = [
  {
    referenceId: "40112888",
    title:
      "Disclosable Version of the ISR - El Salvador Geothermal Energy for Sustainable and Inclusive Development - P506109 - Sequence No : 3",
    category: "Development",
    deadline: "2026-07-26",
    sourceSlug: "world-bank",
  },
  {
    referenceId: "40112709",
    title:
      "Disclosable Restructuring Paper - Ethiopia- Expressway Development Support Project - P148850",
    category: "Development",
    deadline: "2026-07-26",
    sourceSlug: "world-bank",
  },
  {
    referenceId: "40112892",
    title:
      "Environmental and Social Commitment Plan (ESCP) - Congo Democratic Republic of - Preparation in relation to DECIDE Project (Development of Statistical Capacity to Improve Decision Making) - P516861",
    category: "Development",
    deadline: "2026-07-26",
    sourceSlug: "world-bank",
  },
  {
    referenceId: "40112641",
    title:
      "Congo, Republic of - WESTERN AND CENTRAL AFRICA- P505271- Poultry and Aquaculture Development Project - Procurement Plan",
    category: "Development",
    deadline: "2026-07-26",
    sourceSlug: "world-bank",
  },
  {
    referenceId: "40112646",
    title:
      "Guinea - WESTERN AND CENTRAL AFRICA- P164184- Guinea Commercial Agriculture Development Project - Procurement Plan",
    category: "Development",
    deadline: "2026-07-26",
    sourceSlug: "world-bank",
  },
  {
    referenceId: "40112988",
    title:
      "Disclosable Version of the ISR - Mauritania Agriculture Development and Innovation Support Project - P168847 - Sequence No : 7",
    category: "Development",
    deadline: "2026-07-27",
    sourceSlug: "world-bank",
  },
  {
    referenceId: "40112982",
    title:
      "Disclosable Version of the ISR - The Second Resilience Development Policy Operation - P511758 - Sequence No : 1",
    category: "Development",
    deadline: "2026-07-27",
    sourceSlug: "world-bank",
  },
  {
    referenceId: "40113002",
    title:
      "Sri Lanka - SOUTH ASIA- P514086- Sri Lanka Ports and Logistics Development Program - Procurement Plan",
    category: "Development",
    deadline: "2026-07-27",
    sourceSlug: "world-bank",
  },
  {
    referenceId: "40113060",
    title:
      "Disclosable Version of the ISR - Dominica Disaster Risk Management Development Policy Financing with a Catastrophe Deferred Drawdown Option - P177807 - Sequence No : 3",
    category: "Development",
    deadline: "2026-07-28",
    sourceSlug: "world-bank",
  },
  {
    referenceId: "40113212",
    title:
      "Zambia - EASTERN AND SOUTHERN AFRICA- P507971- Transforming Landscapes for Resilience and Development in Zambia II - Procurement Plan",
    category: "Development",
    deadline: "2026-07-29",
    sourceSlug: "world-bank",
  },
  {
    referenceId: "40113431",
    title:
      "Official Documents- Amendment No. 1 to the Administration Agreement with the Asian Development Bank for TF073938.pdf",
    category: "Development",
    deadline: "2026-07-29",
    sourceSlug: "world-bank",
  },
  {
    referenceId: "40113175",
    title:
      "Disclosable Version of the ISR - Water Supply and Sanitation Development Project - P155087 - Sequence No : 20",
    category: "Development",
    deadline: "2026-07-29",
    sourceSlug: "world-bank",
  },
  {
    referenceId: "40113678",
    title:
      "Does Informal Competition Reduce Firm-Provided Worker Training among Formal Manufacturing SMEs in Sub-Saharan Africa ?",
    category: "User & Technical Training",
    deadline: "2026-07-29",
    sourceSlug: "world-bank",
  },
  {
    referenceId: "40113428",
    title:
      "Environmental and Social Commitment Plan (ESCP) - Jamaica Hurricane Melissa Reconstruction Implementation Support Project - P515022",
    category: "Implementation Support",
    deadline: "2026-07-29",
    sourceSlug: "world-bank",
  },
  {
    referenceId: "40113549",
    title: "Tajikistan - Rural Economy Development Project",
    category: "Development",
    deadline: "2026-07-30",
    sourceSlug: "world-bank",
  },
  {
    referenceId: "40114061",
    title:
      "Assessing the Impact of Renewable versus Fossil Fuels Energy on Economic Growth : A Meta-Analysis of the Elasticity across Development Stages",
    category: "Development",
    deadline: "2026-07-30",
    sourceSlug: "world-bank",
  },
  {
    referenceId: "40115126",
    title:
      "Philippines - EAST ASIA AND PACIFIC- P180379- Philippine Rural Development Project Scale-up - Procurement Plan",
    category: "Development",
    deadline: "2026-08-02",
    sourceSlug: "world-bank",
  },
  {
    referenceId: "40115161",
    title:
      "Congo, Democratic Republic of - EASTERN AND SOUTHERN AFRICA- P506815- DRC Transport and Connectivity Development Project - Procurement Plan",
    category: "Development",
    deadline: "2026-08-02",
    sourceSlug: "world-bank",
  },
];
