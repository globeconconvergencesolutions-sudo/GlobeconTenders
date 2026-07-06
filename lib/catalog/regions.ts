export type CatalogCountry = {
  name: string;
  slug: string;
  keywords: string[];
};

export type CatalogRegion = {
  name: string;
  slug: string;
  keywords: string[];
  countries: CatalogCountry[];
};

export const GLOBECON_REGIONS: CatalogRegion[] = [
  {
    name: "East Africa",
    slug: "east-africa",
    keywords: ["EAST AFRICA", "EASTERN AFRICA", "East Africa"],
    countries: [
      { name: "Kenya", slug: "kenya", keywords: ["Kenya", "KENYA"] },
      { name: "Uganda", slug: "uganda", keywords: ["Uganda", "UGANDA"] },
      { name: "Tanzania", slug: "tanzania", keywords: ["Tanzania", "TANZANIA"] },
      { name: "Rwanda", slug: "rwanda", keywords: ["Rwanda", "RWANDA"] },
      { name: "Ethiopia", slug: "ethiopia", keywords: ["Ethiopia", "ETHIOPIA"] },
      { name: "Somalia", slug: "somalia", keywords: ["Somalia", "SOMALIA"] },
      { name: "South Sudan", slug: "south-sudan", keywords: ["South Sudan", "SOUTH SUDAN"] },
    ],
  },
  {
    name: "West & Central Africa",
    slug: "west-central-africa",
    keywords: [
      "WESTERN AND CENTRAL AFRICA",
      "WEST AFRICA",
      "CENTRAL AFRICA",
      "West Africa",
    ],
    countries: [
      { name: "Nigeria", slug: "nigeria", keywords: ["Nigeria", "NIGERIA"] },
      { name: "Ghana", slug: "ghana", keywords: ["Ghana", "GHANA"] },
      { name: "Senegal", slug: "senegal", keywords: ["Senegal", "SENEGAL"] },
      { name: "Côte d'Ivoire", slug: "cote-divoire", keywords: ["Côte d'Ivoire", "Ivory Coast", "COTE D'IVOIRE"] },
      { name: "Cameroon", slug: "cameroon", keywords: ["Cameroon", "CAMEROON"] },
      { name: "DRC", slug: "drc", keywords: ["Congo, Democratic Republic", "DRC", "Democratic Republic of Congo"] },
    ],
  },
  {
    name: "Southern Africa",
    slug: "southern-africa",
    keywords: ["EASTERN AND SOUTHERN AFRICA", "SOUTHERN AFRICA", "Southern Africa"],
    countries: [
      { name: "South Africa", slug: "south-africa", keywords: ["South Africa", "SOUTH AFRICA"] },
      { name: "Zambia", slug: "zambia", keywords: ["Zambia", "ZAMBIA"] },
      { name: "Zimbabwe", slug: "zimbabwe", keywords: ["Zimbabwe", "ZIMBABWE"] },
      { name: "Mozambique", slug: "mozambique", keywords: ["Mozambique", "MOZAMBIQUE"] },
      { name: "Malawi", slug: "malawi", keywords: ["Malawi", "MALAWI"] },
    ],
  },
  {
    name: "North Africa & Middle East",
    slug: "north-africa-middle-east",
    keywords: [
      "MID EAST",
      "NORTH AFRICA",
      "MIDDLE EAST",
      "MENA",
      "North Africa",
    ],
    countries: [
      { name: "Morocco", slug: "morocco", keywords: ["Morocco", "MOROCCO"] },
      { name: "Egypt", slug: "egypt", keywords: ["Egypt", "EGYPT"] },
      { name: "Tunisia", slug: "tunisia", keywords: ["Tunisia", "TUNISIA"] },
    ],
  },
  {
    name: "South Asia",
    slug: "south-asia",
    keywords: ["SOUTH ASIA", "South Asia"],
    countries: [
      { name: "India", slug: "india", keywords: ["India", "INDIA"] },
      { name: "Pakistan", slug: "pakistan", keywords: ["Pakistan", "PAKISTAN", "Khyber Pakhtunkhwa", "KP-"] },
      { name: "Sri Lanka", slug: "sri-lanka", keywords: ["Sri Lanka", "SRI LANKA"] },
      { name: "Bangladesh", slug: "bangladesh", keywords: ["Bangladesh", "BANGLADESH"] },
    ],
  },
  {
    name: "East Asia & Pacific",
    slug: "east-asia-pacific",
    keywords: ["EAST ASIA AND PACIFIC", "East Asia", "Pacific"],
    countries: [
      { name: "Philippines", slug: "philippines", keywords: ["Philippines", "PHILIPPINES"] },
      { name: "Indonesia", slug: "indonesia", keywords: ["Indonesia", "INDONESIA"] },
      { name: "Fiji", slug: "fiji", keywords: ["Fiji", "FIJI"] },
    ],
  },
  {
    name: "Europe & Central Asia",
    slug: "europe-central-asia",
    keywords: ["EUROPE AND CENTRAL ASIA", "Europe", "Central Asia"],
    countries: [
      { name: "Uzbekistan", slug: "uzbekistan", keywords: ["Uzbekistan", "UZBEKISTAN"] },
      { name: "Tajikistan", slug: "tajikistan", keywords: ["Tajikistan", "TAJIKISTAN"] },
    ],
  },
  {
    name: "Latin America & Caribbean",
    slug: "latin-america-caribbean",
    keywords: ["LATIN AMERICA", "CARIBBEAN", "Latin America", "Caribbean"],
    countries: [
      { name: "Jamaica", slug: "jamaica", keywords: ["Jamaica", "JAMAICA"] },
      { name: "Dominica", slug: "dominica", keywords: ["Dominica", "DOMINICA"] },
      { name: "El Salvador", slug: "el-salvador", keywords: ["El Salvador", "EL SALVADOR"] },
    ],
  },
  {
    name: "Global / Multi-region",
    slug: "global-multi-region",
    keywords: ["Global", "Multi-region", "International", "Worldwide"],
    countries: [],
  },
];
