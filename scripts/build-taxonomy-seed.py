"""Build lib/pis/taxonomy-seed.json from the TenderYetu workbook.

Keywords are curated. The workbook's Classification Keywords column is not
imported: sibling lines share one blob and would collapse matching.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
XLSX = Path(
    r"c:\Users\qinal\OneDrive\Desktop\qin\Companies\Globcons ltd\workmates\patrick\NewReplica\TenderYetu_Full_Tender_Fields_and_Service_Lines.xlsx"
)
OUT = ROOT / "lib" / "pis" / "taxonomy-seed.json"

# Org service-line slug -> catalog service line name. Keeps the existing
# 17-line matcher represented inside the Core watchlist.
LEGACY_BY_NAME = {
    "Custom Software Development": "custom-software-development",
    "Systems Integration": "system-integration",
    "Data Migration": "data-migration",
    "ERP / Enterprise Applications": "erp-implementation",
    "Digital Transformation Strategy": "digital-transformation",
    "Cloud Computing": "it-infrastructure-cloud",
    "Business Process Mapping": "business-process-mapping",
    "Project Management": "project-management-office",
    "Change Management": "organisational-change-management",
    "Business Intelligence": "business-intelligence-analytics",
    "Cybersecurity Assessment": "cybersecurity-information-security",
    "Network Infrastructure": "network-infrastructure-design",
    "Database Development": "database-design-administration",
    "IT Helpdesk / Managed Support": "technical-support-maintenance",
    "Procurement Systems": "procurement-contract-advisory",
    "M&E Framework Development": "monitoring-evaluation-learning",
    "Institutional Strengthening": "training-capacity-building",
}

# Trusted phrases from lib/catalog/service-lines.ts, attached to one line each.
CURATED = {
    "Custom Software Development": [
        "software development",
        "application development",
        "custom software",
        "software engineering",
    ],
    "Web Application Development": ["web application", "web app"],
    "Mobile Application Development": ["mobile application", "mobile app"],
    "ERP / Enterprise Applications": [
        "ERP",
        "enterprise resource planning",
        "SAP",
        "Odoo",
        "Microsoft Dynamics",
        "Dynamics 365",
    ],
    "Management Information Systems (MIS)": [
        "management information system",
        "MIS",
    ],
    "Systems Integration": [
        "system integration",
        "systems integration",
        "middleware",
        "REST API",
        "API integration",
        "API gateway",
        "enterprise integration",
    ],
    "Database Development": [
        "database administration",
        "database design",
        "PostgreSQL",
        "SQL Server",
        "Oracle database",
        "data warehouse",
    ],
    "Workflow Automation": ["workflow automation", "BPMN"],
    "Business Process Mapping": [
        "business process",
        "process mapping",
        "process reengineering",
        "process redesign",
    ],
    "Data Migration": [
        "data migration",
        "ETL",
        "legacy system",
        "data conversion",
    ],
    "Data Analytics": ["data analytics"],
    "Business Intelligence": [
        "business intelligence",
        "Power BI",
        "BI reporting",
    ],
    "Data Visualization & Dashboards": ["data dashboard"],
    "Artificial Intelligence / Machine Learning": [
        "artificial intelligence",
        "machine learning",
    ],
    "Generative AI Solutions": ["generative AI"],
    "AI Automation": ["AI agent"],
    "Cybersecurity Assessment": [
        "cybersecurity",
        "cyber security",
        "information security",
        "security audit",
        "ISO 27001",
    ],
    "Penetration Testing": ["penetration testing"],
    "Identity & Access Management": ["identity and access"],
    "Multi-Factor Authentication": ["multi-factor", "MFA"],
    "Cloud Computing": [
        "IT infrastructure",
        "cloud computing",
        "cloud migration",
        "AWS",
        "Azure",
        "Google Cloud",
    ],
    "Cloud Hosting": ["cloud hosting"],
    "Data Centre Services": ["data center", "data centre"],
    "Network Infrastructure": [
        "network design",
        "network infrastructure",
        "SD-WAN",
        "SD WAN",
        "network routing",
    ],
    "LAN / WAN": ["local area network", "wide area network"],
    "IT Helpdesk / Managed Support": [
        "IT support",
        "technical support",
        "helpdesk",
        "help desk",
        "service desk",
        "application support",
    ],
    "Software Maintenance & Support": ["system maintenance"],
    "Digital Transformation Strategy": [
        "digital transformation",
        "digitization",
        "digitalization",
        "digital modernisation",
        "digital modernization",
    ],
    "e-Government Platforms": ["e-government", "egovernment"],
    "Interoperability Frameworks": ["interoperability"],
    "Public Finance Management Systems": ["public finance", "budget system"],
    "Social Protection MIS": ["social registry", "cash transfer"],
    "Beneficiary Management Systems": ["beneficiary"],
    "Baseline Studies": ["baseline study", "baseline survey"],
    "Feasibility Studies": ["feasibility study", "feasibility"],
    "M&E Framework Development": [
        "monitoring and evaluation",
        "M&E",
        "MEL framework",
        "results framework",
    ],
    "Impact Evaluation": ["impact assessment"],
    "Change Management": [
        "change management",
        "organizational change",
        "organisational change",
    ],
    "Project Management": [
        "project management office",
        "PMO",
        "programme management",
        "program management",
        "project management consultancy",
    ],
    "Technical Advisory": ["technical advisory"],
    "Procurement Systems": [
        "e-procurement system",
        "eprocurement system",
        "procurement information system",
        "contract management system",
        "vendor management system",
    ],
    "Procurement Consultancy": [
        "procurement advisory",
        "procurement consulting",
    ],
    "Institutional Strengthening": [
        "capacity building",
        "technical training",
        "systems training",
        "end-user training",
        "digital skills training",
    ],
}


def slugify(value: str) -> str:
    text = re.sub(r"^\d+\.\s*", "", str(value))
    text = text.lower().replace("&", " and ")
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text


def main() -> None:
    fields_df = pd.read_excel(XLSX, sheet_name="Master Taxonomy")
    types_df = pd.read_excel(XLSX, sheet_name="Tender Types")

    fields = []
    seen_fields = set()
    for _, row in fields_df.iterrows():
        name = str(row["Market Field"]).strip()
        if name in seen_fields:
            continue
        seen_fields.add(name)
        code = int(row["Field ID"])
        fields.append(
            {
                "code": code,
                "name": re.sub(r"^\d+\.\s*", "", name),
                "slug": slugify(name),
                "sortOrder": code,
            }
        )

    used_slugs: set[str] = set()
    lines = []
    keyword_lines = 0
    for _, row in fields_df.iterrows():
        field_name = str(row["Market Field"]).strip()
        field_slug = slugify(field_name)
        line_name = str(row["Service Line"]).strip()
        base = slugify(line_name)
        line_slug = base
        if line_slug in used_slugs:
            line_slug = f"{field_slug}-{base}"
        used_slugs.add(line_slug)
        relevance = str(row["GlobeCon Relevance"]).strip().lower()
        globecon = "core" if relevance.startswith("core") else "potential"
        keywords = CURATED.get(line_name, [])
        if keywords:
            keyword_lines += 1
        lines.append(
            {
                "fieldSlug": field_slug,
                "name": line_name,
                "slug": line_slug,
                "globeconRelevance": globecon,
                "keywords": keywords,
                "legacySlug": LEGACY_BY_NAME.get(line_name),
            }
        )

    types = []
    for _, row in types_df.iterrows():
        name = str(row["Tender / Opportunity Type"]).strip()
        if not name or name.lower() == "nan":
            continue
        types.append(
            {
                "name": name,
                "slug": slugify(name),
                "meaning": str(row["Meaning"]).strip()
                if str(row["Meaning"]) != "nan"
                else "",
            }
        )

    missing_legacy = set(LEGACY_BY_NAME) - {line["name"] for line in lines}
    missing_curated = set(CURATED) - {line["name"] for line in lines}
    if missing_legacy or missing_curated:
        raise SystemExit(
            f"Unmatched names legacy={missing_legacy} curated={missing_curated}"
        )

    payload = {"fields": fields, "serviceLines": lines, "procurementTypes": types}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    core = sum(1 for line in lines if line["globeconRelevance"] == "core")
    print(
        f"fields={len(fields)} lines={len(lines)} core={core} "
        f"keyworded={keyword_lines} types={len(types)} -> {OUT}"
    )


if __name__ == "__main__":
    main()
