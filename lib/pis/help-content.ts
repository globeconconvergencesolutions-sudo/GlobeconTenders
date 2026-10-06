export type HelpSectionId =
  | "why"
  | "tenders"
  | "watchlists"
  | "fields"
  | "sources"
  | "market"
  | "company"
  | "evidence"
  | "qualification"
  | "gaps"
  | "pipeline"
  | "alerts"
  | "review";

export type HelpGuide = {
  id: HelpSectionId;
  title: string;
  summary: string;
  href?: string;
  steps: { title: string; body: string }[];
};

export type HelpFaq = {
  id: string;
  question: string;
  answer: string;
  sectionId: HelpSectionId;
  tags: string[];
};

export const WHY_THIS_SYSTEM = {
  title: "Start here",
  tagline:
    "A tender is a public invitation to bid. This workspace collects those invitations, compares them with your company, and keeps the ones you decide to work on.",
  pillars: [
    {
      title: "Tenders is the list",
      body: "Open Tenders to see invitations from the websites this workspace already reads. Each row is called a notice. The heading on that page is Latest tenders.",
    },
    {
      title: "A keyword match is a word count",
      body: "The number on a card is a Keyword match: 10 points for each whole word that appears in both the notice and your chosen topics. It is not advice to bid. Not assessed means nobody has compared the notice with your company yet.",
    },
    {
      title: "A missing certificate is only missing proof",
      body: "Evidence is where you upload a certificate or paste a link. If you have not added it yet, a comparison says the proof is missing. That does not mean your firm cannot do the work.",
    },
    {
      title: "Pipeline is the work you accept",
      body: "Discovered means the notice is on your list and nobody has taken it on. After that, a person chooses a stage, a colleague, and your own deadline. The official closing date stays on the notice.",
    },
  ],
};

export const GETTING_STARTED: { title: string; body: string; href: string }[] = [
  {
    title: "Choose your markets",
    body: "After you register, the first screen asks what work you want to see. Pick one or more of the 38 fields, such as roads, healthcare, or software. Human resources is a market for firms that sell recruitment or HR services. Tenders then follows those fields. Globecon starts on Globecon Core instead of that screen.",
    href: "/setup",
  },
  {
    title: "Describe the company",
    body: "Write your legal name and a few sentences about the work you do. When an invitation asks for experience, people, or a certificate, it is compared with what you saved here. Until the name and the description exist, the result says Insufficient information. The closed line on that page, about what buyers often ask for, is a prompt. It is not a saved record.",
    href: "/company",
  },
  {
    title: "Add proof",
    body: "Upload a certificate, or paste a link to one, so a buyer can see you have it. If the file is not here yet, a comparison says the proof is missing. That does not mean your firm cannot do the work. Certificates that expire in the next 30 days are listed at the top. A Viewer sees Internal records only.",
    href: "/evidence",
  },
  {
    title: "Compare one invitation with your company",
    body: "Open a title on Tenders. The first section is Qualification. Choose Compare with your company. That lines the invitation up with what you saved on Company. If the invitation text cannot be read, there is no result yet.",
    href: "/",
  },
  {
    title: "See what is missing, then take the work on",
    body: "Gaps lists what that comparison could not match. Pipeline is where you accept the work. The first column, Discovered, means nobody has taken it on yet. Open a card to choose a stage.",
    href: "/pipeline",
  },
];

export const HELP_GUIDES: HelpGuide[] = [
  {
    id: "tenders",
    title: "Tenders",
    summary: "The list of invitations. The heading is Latest tenders. Under the list, two buttons choose what you see: Watchlist and Explore other markets.",
    href: "/",
    steps: [
      {
        title: "Watchlist, or Explore other markets",
        body: "Watchlist shows invitations that match the topics on your watchlist. The button includes the watchlist name, for example Watchlist: Globecon Core. Explore other markets shows invitations outside those topics. Edit watchlist opens the page where you add or remove topics.",
      },
      {
        title: "Keyword match and Not assessed",
        body: "Keyword match is the number on the card. It counts matching words. Not assessed means nobody has compared this invitation with your company. Assessed means that comparison exists. Open the title to read it.",
      },
    ],
  },
  {
    id: "watchlists",
    title: "Watchlists",
    summary: "The topics that decide which invitations Tenders shows. You choose them on the first screen, then add or remove service lines here.",
    href: "/watchlists",
    steps: [
      {
        title: "Globecon Core",
        body: "A new workspace chooses its fields on the first screen. That becomes the active watchlist. Globecon Core is the starting set for the Globecon workspace only, not for every firm. Repair restores that starting set only while the watchlist is still named Globecon Core.",
      },
      {
        title: "Search, then add",
        body: "Search for a topic, tick the lines you want, and save. Tenders then uses that watchlist.",
      },
    ],
  },
  {
    id: "fields",
    title: "Fields",
    summary: "The full catalog of topics, grouped into fields such as health or roads. Open More in the sidebar, then Fields.",
    href: "/fields",
    steps: [
      {
        title: "Search for a field",
        body: "With the search box empty, you see fields already on your watchlist. Type a word, such as health, to open the rest of the catalog.",
      },
      {
        title: "Add a line",
        body: "Tick a line to add that topic to the watchlist. Tenders uses the selection the next time you look at Watchlist.",
      },
    ],
  },
  {
    id: "sources",
    title: "Sources",
    summary: "The websites this workspace already knows how to read. Open More in the sidebar, then Sources. A source is one of those websites.",
    href: "/sources/health",
    steps: [
      {
        title: "Read the card",
        body: "Each card says which web address we read, and which address we leave alone. Some invitations sit on a site’s home page, some under /tenders/, and some in a news feed. A careers page stays separate from a tender list.",
      },
      {
        title: "Add a candidate",
        body: "Add a candidate saves a name and a web address, and leaves it switched off. An administrator can later attach it to a website we already know how to read. Saving a candidate does not search the open web.",
      },
    ],
  },
  {
    id: "market",
    title: "Market",
    summary: "Counts from invitations already saved here. Open More, then Market. It does not claim to cover every tender in the world.",
    href: "/market",
    steps: [
      {
        title: "What the sources did not send",
        body: "The first section is What the sources did not send. It counts saved invitations that have no buyer and no value. A blank means the website did not include that fact. It is not a guess and it is not zero.",
      },
      {
        title: "Possible later demand",
        body: "Possible later demand lists a buyer and a topic that have appeared together more than once in saved invitations. Those rows are history. They are not new tenders, and they do not appear on Tenders.",
      },
    ],
  },
  {
    id: "company",
    title: "Company",
    summary: "Your firm’s answers. When an invitation asks for experience, people, or a certificate, it is compared with this page.",
    href: "/company",
    steps: [
      {
        title: "Five short steps",
        body: "The page opens on the first step that is still empty: the firm, what you do, past work, people, then certificates. Only that step is on screen. Continue moves you on even if you leave a step empty. A legal name and a short description are needed before an invitation can be compared.",
      },
      {
        title: "Verification",
        body: "A new project, person, or certificate stays Self-declared until someone marks it Verified. A person with the Viewer role can read the page and cannot edit it.",
      },
    ],
  },
  {
    id: "evidence",
    title: "Evidence",
    summary: "The certificates and links that back up what you wrote on Company. Upload a file, or paste a link. If it is missing, a comparison says the proof is missing. That does not mean your firm cannot do the work.",
    href: "/evidence",
    steps: [
      {
        title: "Expiring within 30 days",
        body: "That section is at the top of the page. If nothing is listed, no saved document expires in the next 30 days.",
      },
      {
        title: "File or link",
        body: "Upload a file, or paste a link if the file already lives somewhere else. A Viewer sees records marked Internal. Records marked Restricted or Finance stay hidden from a Viewer.",
      },
    ],
  },
  {
    id: "qualification",
    title: "Qualification",
    summary: "The comparison between a notice and your company. It is step 3. The list of past comparisons is here. The comparison itself is on the notice.",
    href: "/qualification",
    steps: [
      {
        title: "On this page",
        body: "Assessed lists invitations that already have a result. Each row shows Method and Scan. Not assessed lists watchlist invitations that have no result and no score.",
      },
      {
        title: "On the notice",
        body: "Open a title from Tenders. Qualification is the first section, and the button is Compare with your company. After a comparison that can read the invitation, each requirement appears on its own card: what was asked, whether it is mandatory, whether you meet it, where it was read, and whether the proof is on file.",
      },
      {
        title: "When the scan is Incomplete",
        body: "Incomplete means the invitation text was too short to read, so there is no result. Open Official notice on the page. A longer description, or a document this workspace can read, lets the next comparison continue.",
      },
    ],
  },
  {
    id: "gaps",
    title: "Gaps",
    summary: "What the latest comparison could not match. This page stays empty until you compare an invitation with your company.",
    href: "/gaps",
    steps: [
      {
        title: "After a comparison",
        body: "An evidence gap means the profile or the file does not document that requirement. A confirmed gap means a mandatory requirement was marked Does not meet. An empty page means nothing has been recorded yet.",
      },
    ],
  },
  {
    id: "pipeline",
    title: "Pipeline",
    summary: "The board for invitations someone has decided to work. The column names here are the same names on the board.",
    href: "/pipeline",
    steps: [
      {
        title: "Discovered",
        body: "Discovered means not accepted yet. These cards are watchlist invitations waiting for a person to take them on. Open a card and choose a later stage to accept it.",
      },
      {
        title: "The other stages",
        body: "After Discovered, the columns are Reviewing, Qualification check, Shortlisted, Bid or no bid, Preparing, Submitted, Awarded, Unsuccessful, Cancelled, and Archived. Open a card to set the stage, the person responsible, your own deadline, notes, and tasks. The activity list records each change. The official closing date stays on the notice.",
      },
    ],
  },
  {
    id: "alerts",
    title: "Alerts",
    summary: "Five groups of things to look at, limited to your watchlist. Email is a different page.",
    href: "/alerts",
    steps: [
      {
        title: "The five groups",
        body: "The groups are Closing soon, New in the watchlist, Keyword match, Deadline changed, and Evidence expiring. Keyword match means the word count is 30 or higher. It is not a qualification result.",
      },
      {
        title: "Email settings",
        body: "Email settings opens the page where each person turns email on or off. Marking an alert Read on this page does not change that email.",
      },
    ],
  },
  {
    id: "review",
    title: "Review",
    summary: "A person decides whether two saved invitations look like the same piece of work. Open More, then Review.",
    href: "/review",
    steps: [
      {
        title: "Confirm or dismiss",
        body: "Confirm keeps both invitations and links them. Dismiss hides that suggestion. Neither button deletes an invitation, and nothing is merged by itself.",
      },
      {
        title: "An empty page",
        body: "An empty page means no pair has been suggested from the invitations saved here. It does not mean duplicates were removed.",
      },
    ],
  },
];

export const HELP_FAQS: HelpFaq[] = [
  {
    id: "score",
    question: "Why does a card say Not assessed?",
    answer:
      "Nobody has chosen Compare with your company on that invitation. The number on the card only counts matching words. Open the title to compare it.",
    sectionId: "tenders",
    tags: ["score", "not assessed", "keyword match", "compare"],
  },
  {
    id: "empty-profile",
    question: "Why does the result say Insufficient information?",
    answer:
      "Company does not yet have a legal name and a description, or the invitation has no requirements that can be read. Fill those in, add a certificate on Evidence if you have one, and compare again.",
    sectionId: "company",
    tags: ["insufficient", "profile", "company"],
  },
  {
    id: "missing-evidence",
    question: "Does a missing certificate mean we cannot do the work?",
    answer:
      "No. If the certificate is not uploaded yet, the comparison says the proof is missing. That is not the same as saying your firm cannot do the work.",
    sectionId: "evidence",
    tags: ["evidence", "missing", "unverified"],
  },
  {
    id: "watchlist-empty",
    question: "Why is the tender list empty?",
    answer:
      "Watchlist shows nothing when no topics are selected. Add topics on Watchlists, or choose Explore other markets to see invitations outside the watchlist.",
    sectionId: "watchlists",
    tags: ["watchlist", "empty", "explore", "home", "tenders"],
  },
  {
    id: "paths",
    question: "Why do sources use different web paths?",
    answer:
      "Each portal publishes in its own place. Some notices sit on the site root, some under /tenders/, some in an RSS file, and a careers list stays separate from a tender list. The source card says which path it reads.",
    sectionId: "sources",
    tags: ["sources", "path", "rss", "careers", "tenders"],
  },
  {
    id: "duplicate",
    question: "Will similar invitations combine themselves?",
    answer:
      "No. Review suggests a pair. A person chooses Confirm or Dismiss. Confirm keeps both. An empty Review page means nothing was suggested.",
    sectionId: "review",
    tags: ["duplicate", "merge", "review"],
  },
  {
    id: "email",
    question: "Does marking an alert Read stop the email?",
    answer:
      "No. The list on Alerts and the messages in Email settings are separate. Marking an item Read here leaves the email settings as they are.",
    sectionId: "alerts",
    tags: ["email", "alerts", "digest"],
  },
];

/** Longest prefix wins. */
export const HELP_SECTION_BY_PATH: { prefix: string; section: HelpSectionId }[] = [
  { prefix: "/setup", section: "watchlists" },
  { prefix: "/sources", section: "sources" },
  { prefix: "/watchlists", section: "watchlists" },
  { prefix: "/fields", section: "fields" },
  { prefix: "/market", section: "market" },
  { prefix: "/company", section: "company" },
  { prefix: "/evidence", section: "evidence" },
  { prefix: "/qualification", section: "qualification" },
  { prefix: "/gaps", section: "gaps" },
  { prefix: "/pipeline", section: "pipeline" },
  { prefix: "/alerts", section: "alerts" },
  { prefix: "/review", section: "review" },
  { prefix: "/opportunities", section: "qualification" },
  { prefix: "/", section: "tenders" },
];

export function helpSectionForPath(pathname: string): HelpSectionId {
  const match = HELP_SECTION_BY_PATH.find((item) =>
    item.prefix === "/" ? pathname === "/" : pathname === item.prefix || pathname.startsWith(`${item.prefix}/`),
  );
  return match?.section ?? "why";
}

export function helpUrl(section?: HelpSectionId): string {
  if (!section || section === "why") return "/help?section=why";
  return `/help?section=${section}`;
}
