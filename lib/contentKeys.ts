/**
 * Logical group order for the Admin → Content section browser.
 *
 * Groups follow page order (header → footer), so a new CMS key lands in a
 * predictable place instead of an alphabetical pile. Legacy keys — rows that
 * older designs wrote but v3 no longer renders — are grouped separately and
 * labelled as such, so an operator never mistakes them for live copy.
 *
 * `ALL_CONTENT_KEYS` must cover every top-level key of the static fallback
 * (`src/data/landingContent.ts`); `tests/unit/contentKeys.test.ts` enforces
 * that a newly added key cannot slip through ungrouped.
 */
export interface ContentKeyGroup {
  title: string;
  keys: string[];
}

export const CONTENT_KEY_GROUPS: ContentKeyGroup[] = [
  {
    title: 'Header & hero',
    keys: ['header', 'hero', 'heroTabs'],
  },
  {
    title: 'Page sections (top to bottom)',
    keys: [
      'fragmented',
      'packingTerminal',
      'revenueLedger',
      'logistics',
      'adDefense',
      'storefront',
      'omnichannel',
      'profitClarity',
      'teamOps',
      'infraTrack',
      'gettingStarted',
      'proof',
      'pricing',
      'volumeTiers',
      'faq',
      'leadForm',
      'walkthrough',
      'footer',
      'dock',
      'videoSection',
      'consent',
    ],
  },
  {
    title: 'Legal pages',
    keys: ['legal.privacy', 'legal.terms'],
  },
  {
    title: 'Legacy sections (kept for history, not rendered)',
    keys: [
      'complexity',
      'ecosystem',
      'multiChannel',
      'fulfillment',
      'lossPrevention',
      'inventoryFinance',
      'posShowroom',
      'marketing',
      'team',
      'analytics',
      'productShowcase',
      'statsBar',
      'trustedBy',
      'packingWorkspace',
      'revenueProtection',
      'logisticsAutomation',
      'adBudgetDefense',
      'storeSwitches',
    ],
  },
];

/** Every grouped key, flattened — the browser's complete vocabulary. */
export const ALL_CONTENT_KEYS: string[] = CONTENT_KEY_GROUPS.flatMap((group) => group.keys);
