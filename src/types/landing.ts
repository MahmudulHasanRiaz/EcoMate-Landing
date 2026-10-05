export type Locale = 'en' | 'bn';
export type Theme = 'light' | 'dark';

export interface NavItem {
  label: string;
  href: string;
}

export interface MetricItem {
  label: string;
  value: string;
  subtext?: string;
  trend?: string;
}

export interface ProblemItem {
  id: string;
  title: string;
  consequence: string;
  financialImpact: string;
  solution: string;
  module: string;
}

export interface PipelineStep {
  stepNumber: string;
  title: string;
  description: string;
  highlight: string;
  realFeature: string;
}

export interface InventoryStep {
  phase: string;
  title: string;
  detail: string;
  outcome: string;
}

export interface PosFeature {
  title: string;
  desc: string;
  detail: string;
}

export interface MarketingFeature {
  platform: string;
  type: string;
  benefit: string;
}

export interface CaseStudy {
  id: string;
  businessName: string;
  category: string;
  location: string;
  founderName: string;
  role: string;
  website: string;
  quote: string;
  metrics: {
    stat: string;
    label: string;
  }[];
  challenge: string;
  solution: string;
  videoDuration?: string;
  videoTitle?: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  tierSubtitle: string;
  monthlyPrice: number;
  annualPrice: number;
  currency: string;
  orderVolume: string;
  usersIncluded: string;
  showroomsIncluded: string;
  popular?: boolean;
  features: string[];
  ctaLabel: string;
}

export interface ShowcaseModule {
  id: string;
  name: string;
  shortDesc: string;
  problemSolved: string;
  keyCapability: string;
  badge?: string;
}

export interface LandingContent {
  header: {
    nav: NavItem[];
    ctaBookDemo: string;
    ctaTalkSales: string;
  };
  hero: {
    badge: string;
    headlinePart1: string;
    headlineHighlight: string;
    headlinePart2: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
    contactOptions: {
      whatsappText: string;
      messengerText: string;
      callText: string;
    };
    trustProof: {
      stat1: string;
      stat1Label: string;
      stat2: string;
      stat2Label: string;
      stat3: string;
      stat3Label: string;
    };
  };
  complexity: {
    eyebrow: string;
    heading: string;
    subheading: string;
    frictionTitle: string;
    controlledTitle: string;
    problems: ProblemItem[];
  };
  ecosystem: {
    eyebrow: string;
    heading: string;
    subheading: string;
    centerNodeTitle: string;
    nodes: {
      id: string;
      title: string;
      subtitle: string;
      iconName: string;
      items: string[];
    }[];
  };
  multiChannel: {
    eyebrow: string;
    heading: string;
    subheading: string;
    channels: {
      name: string;
      type: string;
      status: 'active' | 'roadmap';
      description: string;
    }[];
  };
  fulfillment: {
    eyebrow: string;
    heading: string;
    subheading: string;
    pipeline: PipelineStep[];
  };
  lossPrevention: {
    eyebrow: string;
    heading: string;
    subheading: string;
    packingStory: {
      mistakeHeading: string;
      mistakeCost: string;
      solutionHeading: string;
      solutionDetail: string;
    };
    fraudStory: {
      fakeOrderHeading: string;
      fakeOrderCost: string;
      solutionHeading: string;
      solutionDetail: string;
    };
    calculator: {
      title: string;
      ordersPerDayLabel: string;
      errorRateLabel: string;
      estimatedLossLabel: string;
      savedWithEcoMateLabel: string;
    };
  };
  inventoryFinance: {
    eyebrow: string;
    heading: string;
    subheading: string;
    steps: InventoryStep[];
    financeHighlights: string[];
  };
  posShowroom: {
    eyebrow: string;
    heading: string;
    subheading: string;
    features: PosFeature[];
  };
  marketing: {
    eyebrow: string;
    heading: string;
    subheading: string;
    features: MarketingFeature[];
    attributionQuote: string;
  };
  team: {
    eyebrow: string;
    heading: string;
    subheading: string;
    roles: {
      role: string;
      responsibilities: string;
      accessControl: string;
    }[];
  };
  analytics: {
    eyebrow: string;
    heading: string;
    subheading: string;
    metrics: MetricItem[];
  };
  proof: {
    eyebrow: string;
    heading: string;
    subheading: string;
    caseStudies: CaseStudy[];
  };
  productShowcase: {
    eyebrow: string;
    heading: string;
    subheading: string;
    modules: ShowcaseModule[];
  };
  pricing: {
    eyebrow: string;
    heading: string;
    subheading: string;
    visiblePricing: {
      monthlyToggle: string;
      annualToggle: string;
      discountBadge: string;
      plans: PricingPlan[];
    };
    hiddenPricing: {
      heading: string;
      subheading: string;
      ctaLabel: string;
      points: string[];
    };
  };
  leadForm: {
    eyebrow: string;
    heading: string;
    subheading: string;
    nameLabel: string;
    namePlaceholder: string;
    phoneLabel: string;
    phonePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    volumeLabel: string;
    volumeOptions: string[];
    noteLabel: string;
    notePlaceholder: string;
    submitCta: string;
    submittingText: string;
    successHeading: string;
    successMessage: string;
    privacyNote: string;
  };
  footer: {
    tagline: string;
    linksTitle: string;
    operationsTitle: string;
    contactTitle: string;
    phone: string;
    email: string;
    address: string;
    copyright: string;
  };
}
