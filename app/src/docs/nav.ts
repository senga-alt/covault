export type DocsNavItem = {
  slug: string;
  title: string;
  description?: string;
};

export type DocsNavSection = {
  label: string;
  items: DocsNavItem[];
};

export const DOCS_NAV: DocsNavSection[] = [
  {
    label: "Get started",
    items: [
      { slug: "", title: "Introduction", description: "What Covault is and why it cannot go insolvent" },
      { slug: "quickstart", title: "Quickstart", description: "Wallet, testnet funds, and your first option" },
    ],
  },
  {
    label: "Concepts",
    items: [
      { slug: "lifecycle", title: "The lifecycle", description: "Create, write, trade, settle, claim - in depth" },
      { slug: "settlement", title: "Settlement", description: "The DIA oracle, cross-rates, and freshness" },
      { slug: "fees", title: "Fees", description: "What using Covault costs" },
    ],
  },
  {
    label: "Reference",
    items: [
      { slug: "contract", title: "Contracts", description: "Addresses and public functions" },
      { slug: "errors", title: "Error codes", description: "Every error, in plain language" },
    ],
  },
];

export const ALL_DOCS: DocsNavItem[] = DOCS_NAV.flatMap((s) => s.items);

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export const numeralFor = (slug: string): string =>
  ROMAN[ALL_DOCS.findIndex((i) => i.slug === slug)] ?? "";

export const sectionFor = (slug: string): string =>
  DOCS_NAV.find((s) => s.items.some((i) => i.slug === slug))?.label ?? "";

export function getDocsSiblings(slug: string) {
  const idx = ALL_DOCS.findIndex((i) => i.slug === slug);
  return {
    prev: idx > 0 ? ALL_DOCS[idx - 1] : null,
    next: idx >= 0 && idx < ALL_DOCS.length - 1 ? ALL_DOCS[idx + 1] : null,
  };
}
