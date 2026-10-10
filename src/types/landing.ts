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
    /** v3 floating pill: sign-in link label. */
    signInLabel: string;
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
  /** Redesign v2: stats bar under the hero. Values are display strings (CMS-owned). */
  statsBar: {
    items: {
      value: string;
      label: string;
      trend: string;
    }[];
    note: string;
  };
  /** Redesign v2: trusted-by logo strip. Names stay Latin in both locales. */
  trustedBy: {
    eyebrow: string;
    heading: string;
    brands: {
      name: string;
      detail: string;
    }[];
    note: string;
  };
  /** Redesign v2: packing workspace interactive scan demo. Identifiers stay Latin. */
  packingWorkspace: {
    eyebrow: string;
    heading: string;
    subheading: string;
    orderLabel: string;
    items: {
      sku: string;
      name: string;
    }[];
    scanButton: string;
    scanningText: string;
    resetButton: string;
    progressLabel: string;
    successHeading: string;
    successBody: string;
    mismatchHeading: string;
    mismatchBody: string;
    blockedBadge: string;
    verifiedBadge: string;
    demoNote: string;
  };
  /** Redesign v2: revenue protection policy toggles. Amounts are display strings. */
  revenueProtection: {
    eyebrow: string;
    heading: string;
    subheading: string;
    policies: {
      id: string;
      title: string;
      detail: string;
      monthlySavings: string;
    }[];
    totalLabel: string;
    totalNote: string;
    enabledBadge: string;
    disabledBadge: string;
  };
  /** Redesign v2: logistics automation courier booking demo. Fees stay Latin digits. */
  logisticsAutomation: {
    eyebrow: string;
    heading: string;
    subheading: string;
    couriers: {
      id: string;
      name: string;
      fee: string;
      eta: string;
      successRate: string;
    }[];
    selectLabel: string;
    bookButton: string;
    bookedHeading: string;
    bookedBody: string;
    resetButton: string;
    demoNote: string;
  };
  /** Redesign v2: ad budget defense CAPI mode selector. Event names stay Latin. */
  adBudgetDefense: {
    eyebrow: string;
    heading: string;
    subheading: string;
    modes: {
      id: string;
      title: string;
      description: string;
      matchQuality: string;
      events: string[];
    }[];
    recommendBadge: string;
    dedupNote: string;
  };
  /** Redesign v2: multi-store & showroom toggle switches demo. */
  storeSwitches: {
    eyebrow: string;
    heading: string;
    subheading: string;
    stores: {
      id: string;
      name: string;
      meta: string;
    }[];
    syncedBadge: string;
    pausedBadge: string;
    syncNote: string;
    allSyncedMessage: string;
  };
  /** Redesign v2: getting started, 3 steps. */
  gettingStarted: {
    eyebrow: string;
    heading: string;
    subheading: string;
    steps: {
      stepNumber: string;
      title: string;
      detail: string;
    }[];
    ctaLabel: string;
  };
  /** v3: hero console tabs (KPI rows per tab), trust strip, platform note. */
  heroTabs: {
    tabs: {
      id: string;
      label: string;
      rows: {
        label: string;
        value: string;
        highlight: boolean;
      }[];
    }[];
    trustedTitle: string;
    brands: string[];
    platformNote: string;
    sampleNote: string;
  };
  /** v3: fragmented reality before/after (mockup §01). */
  fragmented: {
    index: string;
    eyebrow: string;
    heading: string;
    subheading: string;
    beforeTitle: string;
    beforeItems: string[];
    afterTitle: string;
    afterItems: string[];
  };
  /** v3: packing terminal scan demo (mockup §02). States derive from order. */
  packingTerminal: {
    index: string;
    eyebrow: string;
    heading: string;
    subheading: string;
    terminalTitle: string;
    orderLabel: string;
    orderId: string;
    items: {
      sku: string;
      name: string;
    }[];
    waitingLabel: string;
    matchedLabel: string;
    wrongLabel: string;
    boxSealLabel: string;
    lockedLabel: string;
    unlockedLabel: string;
    scanCorrectLabel: string;
    scanWrongLabel: string;
    sampleNote: string;
    features: string[];
    demoCta: string;
  };
  /** v3: revenue protection ledger + policy radios (mockup §03). */
  revenueLedger: {
    index: string;
    eyebrow: string;
    heading: string;
    subheading: string;
    ledgerTitle: string;
    phoneLabel: string;
    phone: string;
    totalsLabel: string;
    totals: {
      total: string;
      delivered: string;
      returned: string;
    };
    couriers: {
      id: string;
      name: string;
      delivered: string;
      returned: string;
      rateNote: string;
    }[];
    deliveredLabel: string;
    returnedLabel: string;
    policyTitle: string;
    policies: {
      id: string;
      label: string;
    }[];
    policyNote: string;
  };
  /** v3: logistics automation (mockup §04). */
  logistics: {
    index: string;
    eyebrow: string;
    heading: string;
    subheading: string;
    couriers: {
      id: string;
      name: string;
    }[];
    bulkTitle: string;
    selectedCount: string;
    selectedLabel: string;
    pushLabel: string;
    mixLabel: string;
    mixValue: string;
    streamTitle: string;
    streamRows: {
      time: string;
      ref: string;
      courier: string;
      status: string;
    }[];
    sampleNote: string;
  };
  /** v3: ad budget defense CAPI modes + attribution (mockup §05). */
  adDefense: {
    index: string;
    eyebrow: string;
    heading: string;
    subheading: string;
    modes: {
      id: string;
      title: string;
      description: string;
      detail: string;
      recommended: boolean;
    }[];
    recommendBadge: string;
    attributionTitle: string;
    attributionRows: {
      label: string;
      value: string;
    }[];
    demoCta: string;
  };
  /** v3: multi-store switches + why-different (mockup §06). */
  storefront: {
    index: string;
    eyebrow: string;
    heading: string;
    subheading: string;
    switchHint: string;
    catalogTitle: string;
    catalogSku: string;
    catalogUnits: string;
    stores: {
      id: string;
      name: string;
    }[];
    offLabel: string;
    publishedLabel: string;
    whyTitle: string;
    whyItems: string[];
  };
  /** v3: omnichannel warehouse + POS (mockup §07). */
  omnichannel: {
    index: string;
    eyebrow: string;
    heading: string;
    subheading: string;
    warehouseTitle: string;
    warehousePath: string[];
    warehouseRows: string[];
    posTitle: string;
    posRows: string[];
    demoCta: string;
  };
  /** v3: financial clarity profit breakdown + payments (mockup §08). */
  profitClarity: {
    index: string;
    eyebrow: string;
    heading: string;
    subheading: string;
    orderLabel: string;
    orderId: string;
    rows: {
      label: string;
      value: string;
      tone: 'in' | 'out' | 'net';
    }[];
    sampleNote: string;
    paymentsTitle: string;
    paymentsRows: string[];
    demoCta: string;
  };
  /** v3: team operations (mockup §09). */
  teamOps: {
    index: string;
    eyebrow: string;
    heading: string;
    subheading: string;
    features: string[];
    timelineTitle: string;
    timeline: {
      time: string;
      text: string;
    }[];
  };
  /** v3: infrastructure & tracking (mockup §10). */
  infraTrack: {
    index: string;
    eyebrow: string;
    heading: string;
    subheading: string;
    features: string[];
    trackingTitle: string;
    orderLabel: string;
    orderId: string;
    statusLabel: string;
    statusValue: string;
    trackingNote: string;
  };
  /** v3: pricing volume-tier selector. `planIndex` is positional so the mapping
   * survives both DB plans and the static fallback regardless of slugs. */
  volumeTiers: {
    label: string;
    tiers: {
      id: string;
      label: string;
      planIndex: number;
    }[];
  };
  /** v3: dock (mobile) + FAB (desktop) contact actions. URLs are CMS data. */
  dock: {
    helpLabel: string;
    demoLabel: string;
    demoUrl: string;
    /** Phone number for the `tel:` call action (digits, may start with `+`). */
    callNumber: string;
    callLabel: string;
    /** WhatsApp target: bare digits become a `wa.me` link, full URLs pass through. */
    whatsapp: string;
    whatsappLabel: string;
    messengerUrl: string;
    messengerLabel: string;
    /** Main FAB toggle announcement (e.g. Contact / যোগাযোগ). */
    fabLabel: string;
  };
  /** v3 polish: walkthrough pitch column (form strings stay in `leadForm`). */
  walkthrough: {
    bullets: string[];
    trustNote: string;
  };
  /** v3 polish: featured video. Empty `youtubeUrl` renders the placeholder stub. */
  videoSection: {
    youtubeUrl: string;
  };
}
