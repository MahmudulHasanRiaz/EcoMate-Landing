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
    /** Secondary WhatsApp CTA label next to the primary demo button. */
    whatsappCta: string;
    trustProof: {
      stat1: string;
      stat1Label: string;
      stat2: string;
      stat2Label: string;
      stat3: string;
      stat3Label: string;
    };
    /** Live console-deck chrome (M-32). Demo identifiers (order/SKU/phone/brand names)
     * stay Latin in both locales — only descriptive chrome is translated. */
    console: {
      busLive: string;
      nodesConnected: string;
      nodeWebTitle: string;
      nodePosTitle: string;
      nodeWarehouseTitle: string;
      nodeWarehouseSub: string;
      nodeCourierTitle: string;
      demoBadge: string;
      tabOverview: string;
      tabPacking: string;
      tabCourier: string;
      tabPos: string;
      kpiOrdersSub: string;
      kpiScanBadge: string;
      kpiBlockedValue: string;
      kpiBlockedSub: string;
      kpiCodToday: string;
      kpiCodSub: string;
      velocityTitle: string;
      velocitySub: string;
      liveStream: string;
      legendPacked: string;
      legendHandover: string;
      legendNote: string;
      channelsTitle: string;
      channelsSynced: string;
      channelWooSub: string;
      channelPosSub: string;
      channelHubSub: string;
      liveBadge: string;
      inventoryLock: string;
      zeroOversell: string;
      packingStatus: string;
      packingVerified: string;
      invoiceTotal: string;
      scanFeedback: string;
      scanFeedbackSub: string;
      consignment: string;
      printLabel: string;
      courierCheckTitle: string;
      courierCheckSub: string;
      trustBadge: string;
      totalDeliveries: string;
      receivedOk: string;
      deliverySuccess: string;
      safeDispatch: string;
      suspiciousTitle: string;
      highReturnRisk: string;
      pastOrders: string;
      returnedRefused: string;
      successRate: string;
      serialReturner: string;
      posRegister: string;
      posConnected: string;
      splitPayment: string;
      deductionTitle: string;
      deductionIntro: string;
      deductionStock: string;
      deductionOnline: string;
      deductionLedger: string;
      zeroDesync: string;
    };
  };
  complexity: {
    eyebrow: string;
    heading: string;
    subheading: string;
    frictionTitle: string;
    controlledTitle: string;
    problems: ProblemItem[];
    /** Before/after diagram chrome + deep-dive card labels (M-33). */
    diagram: {
      frictionBadge: string;
      chaos1Title: string;
      chaos1Sub: string;
      chaosConnector1: string;
      chaos2Title: string;
      chaos2Sub: string;
      chaosConnector2: string;
      chaos3Title: string;
      chaos3Sub: string;
      syncBadge: string;
      control1Title: string;
      control1Sub: string;
      controlConnector1: string;
      control2Title: string;
      control2Sub: string;
      controlConnector2: string;
      control3Title: string;
      control3Sub: string;
      modulePrefix: string;
      leakBadge: string;
      consequenceTitle: string;
      impactPrefix: string;
      solutionTitle: string;
      deepDiveNote: string;
      demoCta: string;
    };
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
    /** Pillar-card chrome around the (already localized) node data. */
    chrome: {
      centerTagline: string;
      pillarPrefix: string;
      integratedBadge: string;
      itemNote: string;
      connectBody: string;
      walkthroughCta: string;
    };
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
    /** Allocation-engine diagram chrome (M-37). SKU/brand identifiers stay Latin. */
    engine: {
      engineEyebrow: string;
      masterSku: string;
      lockBadge: string;
      ch1Name: string;
      ch1Status: string;
      ch1Alloc: string;
      ch1Note: string;
      ch1Price: string;
      ch2Name: string;
      ch2Status: string;
      ch2Alloc: string;
      ch2Note: string;
      ch2Price: string;
      ch3Name: string;
      ch3Status: string;
      ch3Alloc: string;
      ch3Note: string;
      ch3Alert: string;
      guardrailStrong: string;
      guardrailRest: string;
      guarantee: string;
      roadmapActive: string;
      connectedEngine: string;
      roadmapBadge: string;
      productionBadge: string;
    };
  };
  fulfillment: {
    eyebrow: string;
    heading: string;
    subheading: string;
    pipeline: PipelineStep[];
    /** Verification-sequence diagram + telemetry panel chrome. Identifiers stay Latin. */
    snapshot: {
      seqTitle: string;
      scannerBadge: string;
      stagePrefix: string;
      s1Title: string;
      s1Sub: string;
      s1Status: string;
      s2Title: string;
      s2Sub: string;
      s2Status: string;
      s3Title: string;
      s3Sub: string;
      s3Status: string;
      s4Title: string;
      s4Sub: string;
      s4Status: string;
      s5Title: string;
      s5Sub: string;
      s5Status: string;
      stepPrefix: string;
      stepOf: string;
      outcomePrefix: string;
      telemetryTitle: string;
      telemetryConnected: string;
      scanTitle: string;
      scanVerified: string;
      scanSku: string;
      scanAudio: string;
      labelGen: string;
      unlocked: string;
      fraudTitle: string;
      fraudBody: string;
      fraudResult: string;
      reconTitle: string;
      reconBody: string;
      reconResult: string;
      intelTitle: string;
      intelBody: string;
      engineNote: string;
      nextStep: string;
    };
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
      intro: string;
      roiBadge: string;
      ordersUnit: string;
      scaleMin: string;
      scaleMid: string;
      scaleHigh: string;
      scaleMax: string;
      monthlyVolumeLabel: string;
      monthlyVolumeUnit: string;
      avoidableLabel: string;
      avoidableUnit: string;
      avgLossLabel: string;
      avgLossNote: string;
      lossNote: string;
      savedNote: string;
      stripTitle: string;
      stripSub: string;
      stripCta: string;
    };
    /** Scenario matrix + narrative chrome (M-35). Demo names/numbers stay Latin. */
    scenarios: {
      telemetryBadge: string;
      aTitle: string;
      aScore: string;
      aCustomer: string;
      aLine1: string;
      aLine2: string;
      aDecision: string;
      bTitle: string;
      bScore: string;
      bCustomer: string;
      bLine1: string;
      bLine2: string;
      bDecision: string;
    };
    narratives: {
      leakEyebrow: string;
      chainTitle: string;
      chain1: string;
      chain2: string;
      chain3: string;
      chain4: string;
      outcome1: string;
      drainEyebrow: string;
      costTitle: string;
      cost1: string;
      cost2: string;
      cost3: string;
      cost4: string;
      outcome2: string;
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
    /** Live-billing-flow demo chrome (M-38). Identifiers stay Latin. */
    demo: {
      billingTitle: string;
      terminalBadge: string;
      stepPrefix: string;
      s1Speed: string;
      s1Title: string;
      s1Body: string;
      s1Demo: string;
      s2Speed: string;
      s2Title: string;
      s2Body: string;
      s2Demo: string;
      s3Speed: string;
      s3Title: string;
      s3Body: string;
      s3Demo: string;
      telemetryEyebrow: string;
      telemetryTitle: string;
      telemetryBody: string;
      posCta: string;
    };
  };
  marketing: {
    eyebrow: string;
    heading: string;
    subheading: string;
    features: MarketingFeature[];
    attributionQuote: string;
    /** Tracking-architecture diagram chrome (M-36). */
    stages: {
      archTitle: string;
      archBadge: string;
      stagePrefix: string;
      s1Title: string;
      s1Sub: string;
      s1Note: string;
      s2Title: string;
      s2Sub: string;
      s2Note: string;
      s3Title: string;
      s3Sub: string;
      s3Note: string;
      s4Title: string;
      s4Sub: string;
      s4Note: string;
      connectedBadge: string;
      dedupLabel: string;
      emqMatch: string;
      calloutBody: string;
    };
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
    /** Role-card + HR-bar chrome (M-39). */
    labels: {
      rolePrefix: string;
      responsibilities: string;
      boundary: string;
      audited: string;
      hr1Title: string;
      hr1Body: string;
      hr2Title: string;
      hr2Body: string;
      hr3Title: string;
      hr3Body: string;
    };
  };
  analytics: {
    eyebrow: string;
    heading: string;
    subheading: string;
    metrics: MetricItem[];
    /** Attribution + courier-matrix panel chrome (M-34). Demo numbers stay Latin. */
    panels: {
      verifiedBadge: string;
      attrEyebrow: string;
      attrTitle: string;
      attrBody: string;
      channelWoo: string;
      channelWooVol: string;
      channelGulshan: string;
      channelGulshanVol: string;
      channelDhanmondi: string;
      channelDhanmondiVol: string;
      matrixTitle: string;
      matrixCohort: string;
      courierStat1: string;
      courierStat2: string;
      courierStat3: string;
      matrixNote: string;
    };
  };
  proof: {
    eyebrow: string;
    heading: string;
    subheading: string;
    caseStudies: CaseStudy[];
    /** Card chrome around the (already localized) case-study bodies (M-40). */
    chrome: {
      featuredBadge: string;
      operatingSince: string;
      watchInterview: string;
      metricsTitle: string;
      liveWebsite: string;
      visitLabel: string;
      watchCaseStudy: string;
    };
  };
  productShowcase: {
    eyebrow: string;
    heading: string;
    subheading: string;
    modules: ShowcaseModule[];
  };
  faq: {
    eyebrow: string;
    heading: string;
    subheading: string;
    items: {
      question: string;
      answer: string;
    }[];
    /** Support CTAs (M-43). */
    whatsappCta: string;
    salesCall: string;
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
      /** Card chrome (M-41). */
      labels: {
        annualBadgeShort: string;
        popularBadge: string;
        perMonth: string;
        volumeLabel: string;
        staffLabel: string;
        posLabel: string;
        capabilitiesTitle: string;
      };
    };
    hiddenPricing: {
      heading: string;
      subheading: string;
      ctaLabel: string;
      points: string[];
      consultEyebrow: string;
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
    /** Consent checkbox copy (Task 13): legally required, unticked by default. */
    consentLabel: string;
    /** Default volume when the admin-configured options are too short (M-42). */
    volumeFallback: string;
    /** Direct-contact channel cards + resubmit link (M-41). */
    channels: {
      title: string;
      waTitle: string;
      waSub: string;
      messengerTitle: string;
      messengerSub: string;
      phoneTitle: string;
      phoneHours: string;
      resubmit: string;
    };
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
    /** Capabilities column (M-44) — per-locale anchors, no dead `#tour` links. */
    capabilities: NavItem[];
    /** Fallback when the DB footer menu is empty (M-44/M-45) — per-locale. */
    defaultPlatformLinks: NavItem[];
    privacyLabel: string;
    termsLabel: string;
  };
  /** Tracking-consent banner copy (H-18): per-locale, never hardcoded English. */
  consent: {
    title: string;
    descriptionPrefix: string;
    privacyPolicyLabel: string;
    descriptionSuffix: string;
    acceptAll: string;
    essentialOnly: string;
  };
}
