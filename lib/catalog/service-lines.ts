export type CatalogServiceLine = {
  name: string;
  slug: string;
  keywords: string[];
};

/**
 * Globecon tech / consulting service lines.
 * Prefer multi-word phrases; avoid short tokens that false-match (LAN, API, SAP as substrings).
 * Word-boundary matching still applies in lib/matching.
 */
export const GLOBECON_SERVICE_LINES: CatalogServiceLine[] = [
  {
    name: "Business Process Mapping",
    slug: "business-process-mapping",
    keywords: [
      "business process",
      "process mapping",
      "process reengineering",
      "process redesign",
      "workflow automation",
      "BPMN",
    ],
  },
  {
    name: "System Integration",
    slug: "system-integration",
    keywords: [
      "system integration",
      "systems integration",
      "middleware",
      "REST API",
      "API integration",
      "API gateway",
      "interoperability",
      "enterprise integration",
    ],
  },
  {
    name: "Data Migration",
    slug: "data-migration",
    keywords: [
      "data migration",
      "ETL",
      "legacy system",
      "data transfer",
      "data conversion",
    ],
  },
  {
    name: "Training & Capacity Building",
    slug: "training-capacity-building",
    keywords: [
      "capacity building",
      "technical training",
      "IT training",
      "systems training",
      "end-user training",
      "digital skills training",
      "training workshop",
    ],
  },
  {
    name: "ERP Implementation",
    slug: "erp-implementation",
    keywords: [
      "ERP",
      "enterprise resource planning",
      "SAP",
      "Odoo",
      "Microsoft Dynamics",
      "Dynamics 365",
    ],
  },
  {
    name: "Digital Transformation",
    slug: "digital-transformation",
    keywords: [
      "digital transformation",
      "digitization",
      "digitalization",
      "digital modernisation",
      "digital modernization",
    ],
  },
  {
    name: "IT Infrastructure & Cloud",
    slug: "it-infrastructure-cloud",
    keywords: [
      "IT infrastructure",
      "cloud computing",
      "cloud hosting",
      "cloud migration",
      "data center",
      "data centre",
      "server infrastructure",
      "AWS",
      "Azure",
      "Google Cloud",
    ],
  },
  {
    name: "Custom Software Development",
    slug: "custom-software-development",
    keywords: [
      "software development",
      "application development",
      "custom software",
      "web application",
      "software engineering",
      "mobile application",
    ],
  },
  {
    name: "Project Management Office (PMO)",
    slug: "project-management-office",
    keywords: [
      "project management office",
      "PMO",
      "programme management",
      "program management",
      "portfolio management",
      "project management consultancy",
    ],
  },
  {
    name: "Organisational Change Management",
    slug: "organisational-change-management",
    keywords: [
      "change management",
      "organizational change",
      "organisational change",
      "stakeholder engagement",
    ],
  },
  {
    name: "Business Intelligence & Analytics",
    slug: "business-intelligence-analytics",
    keywords: [
      "business intelligence",
      "data analytics",
      "Power BI",
      "data dashboard",
      "BI reporting",
      "management information system",
    ],
  },
  {
    name: "Cybersecurity & Information Security",
    slug: "cybersecurity-information-security",
    keywords: [
      "cybersecurity",
      "cyber security",
      "information security",
      "security audit",
      "ISO 27001",
      "penetration testing",
    ],
  },
  {
    name: "Network Infrastructure Design",
    slug: "network-infrastructure-design",
    keywords: [
      "network design",
      "network infrastructure",
      "local area network",
      "wide area network",
      "SD-WAN",
      "SD WAN",
      "fiber optic",
      "fibre optic",
      "network routing",
    ],
  },
  {
    name: "Database Design & Administration",
    slug: "database-design-administration",
    keywords: [
      "database administration",
      "database design",
      "DBA",
      "PostgreSQL",
      "SQL Server",
      "Oracle database",
      "data warehouse",
    ],
  },
  {
    name: "Technical Support & Maintenance",
    slug: "technical-support-maintenance",
    keywords: [
      "IT support",
      "technical support",
      "helpdesk",
      "help desk",
      "service desk",
      "system maintenance",
      "application support",
      "SLA",
    ],
  },
  {
    name: "Procurement Systems & Advisory",
    slug: "procurement-contract-advisory",
    keywords: [
      "procurement advisory",
      "procurement consulting",
      "e-procurement system",
      "eprocurement system",
      "procurement information system",
      "contract management system",
      "vendor management system",
    ],
  },
  {
    name: "Monitoring, Evaluation & Learning (MEL)",
    slug: "monitoring-evaluation-learning",
    keywords: [
      "monitoring and evaluation",
      "M&E",
      "MEL framework",
      "impact assessment",
      "results framework",
    ],
  },
];

/** HR template department slugs — must not be active on procurement orgs. */
export const HR_DEPARTMENT_SLUGS = [
  "engineering",
  "operations",
  "finance",
  "human-resources",
  "sales-marketing",
] as const;
