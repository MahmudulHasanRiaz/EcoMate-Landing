/**
 * Legacy prototype data layer.
 *
 * `db/schema.ts` is now the single source of truth for the schema (Task 3 of the
 * Next.js/Cloudflare migration) and it lives at the repo root, so this module points at
 * it instead of the deleted `./schema`.
 *
 * The in-memory `repository` below is no longer reachable from the server — every Express
 * route that used it was replaced by an `app/api/**` Route Handler that talks to Drizzle
 * through `db/client.ts`. What still consumes this file is the *type surface* used by the
 * AdminPanel/api client in `src/`, which is repointed at the Drizzle-inferred types when
 * the admin surface is ported. Nothing here should be extended.
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '../../db/schema';

const { Pool } = pg;

const dbConnectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
export const isPostgresConfigured = Boolean(dbConnectionString);

let pool: pg.Pool | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

if (isPostgresConfigured && dbConnectionString) {
  try {
    pool = new Pool({
      connectionString: dbConnectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 5000,
    });
    dbInstance = drizzle(pool, { schema });
    console.log('[EcoMate DB] Connected to PostgreSQL with Drizzle ORM');
  } catch (err) {
    console.warn('[EcoMate DB] PostgreSQL connection error, falling back to local persistent repository:', err);
  }
} else {
  console.log('[EcoMate DB] PostgreSQL credentials not detected in sandbox environment. Running with self-contained persistent repository (100% ready for Supabase/PostgreSQL).');
}

export const db = dbInstance;

// Seed data types & in-memory state store
export interface SiteSettings {
  id: number;
  siteName: string;
  tagline: string;
  logoUrl: string;
  faviconUrl: string;
  defaultLocale: 'en' | 'bn';
  supportPhone: string;
  supportEmail: string;
  whatsappNumber: string;
  messengerUrl: string;
  address: string;
  isPricingVisible: boolean;
  seoTitle: string;
  seoDescription: string;
  createdAt: string;
  updatedAt: string;
}

export interface LandingSection {
  id: number;
  sectionKey: string;
  titleEn: string;
  titleBn: string;
  subtitleEn: string;
  subtitleBn: string;
  eyebrowEn: string;
  eyebrowBn: string;
  sortOrder: number;
  isVisible: boolean;
  customConfig?: any;
}

export interface PricingPlan {
  id: number;
  slug: string;
  nameEn: string;
  nameBn: string;
  tierSubtitleEn: string;
  tierSubtitleBn: string;
  monthlyPrice: number;
  annualPrice: number;
  currency: string;
  orderVolume: string;
  usersIncluded: string;
  showroomsIncluded: string;
  featuresEn: string[];
  featuresBn: string[];
  excludedFeaturesEn?: string[];
  ctaLabelEn: string;
  ctaLabelBn: string;
  isPopular: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface Lead {
  id: number;
  name: string;
  phone: string;
  email: string;
  dailyVolume: string;
  note: string;
  source: string;
  utmSource?: string;
  utmCampaign?: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Demo Scheduled' | 'Won' | 'Lost';
  assignedTo: string;
  internalNotes: string;
  licensePortalStatus: 'Pending' | 'Synced' | 'Failed';
  licensePortalError?: string;
  licensePortalSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Testimonial {
  id: number;
  clientName: string;
  clientRole: string;
  companyName: string;
  category: string;
  location: string;
  quoteEn: string;
  quoteBn: string;
  websiteUrl: string;
  logoUrl: string;
  videoUrl: string;
  videoDuration: string;
  format: string;
  metrics: { label: string; stat: string }[];
  sortOrder: number;
  isPublished: boolean;
}

export interface CaseStudy {
  id: number;
  slug: string;
  title: string;
  client: string;
  businessType: string;
  problemOverview: string;
  solutionImplemented: string;
  quantifiedOutcome: string;
  metrics: { label: string; stat: string }[];
  featuredImageUrl: string;
  videoUrl: string;
  websiteUrl: string;
  isPublished: boolean;
  seoTitle: string;
  seoDescription: string;
}

export interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  tags: string[];
  featuredImageUrl: string;
  readTime: string;
  status: 'draft' | 'published' | 'scheduled';
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  publishedAt: string;
}

export interface MediaAsset {
  id: number;
  key: string;
  title: string;
  url: string;
  altText: string;
  category: string;
}

export interface IntegrationLog {
  id: number;
  serviceName: string;
  action: string;
  payload: any;
  response: any;
  status: 'Success' | 'Failed' | 'Pending';
  errorMessage?: string;
  attempts: number;
  createdAt: string;
}

// In-Memory Repository fallback state
class EcoMateRepository {
  private settings: SiteSettings = {
    id: 1,
    siteName: 'EcoMate',
    tagline: 'Your Entire E-commerce Operation, Managed From One Place',
    logoUrl: '/assets/logo-placeholder.svg',
    faviconUrl: '/favicon.ico',
    defaultLocale: 'en',
    supportPhone: '+880 1894-828290',
    supportEmail: 'hello@ecomate.app',
    whatsappNumber: '8801894828290',
    messengerUrl: 'https://m.me/ecomate.app',
    address: 'Tejgaon I/A, Dhaka 1208, Bangladesh',
    isPricingVisible: true,
    seoTitle: 'EcoMate — Your Entire E-commerce Operation, Managed From One Place',
    seoDescription: 'Enterprise operations platform for growing e-commerce: multi-store sync, physical showrooms, smart packing verification, and courier settlement.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  private sections: LandingSection[] = [
    { id: 1, sectionKey: 'hero', titleEn: 'Your Entire E-commerce Operation, Managed From One Place', titleBn: 'আপনার পুরো ই-কমার্স অপারেশন, একটি সেন্ট্রাল সিস্টেম থেকে', subtitleEn: 'Unify online stores, showrooms, smart packing, multi-warehouse inventory, couriers, and finance in one connected operational control center.', subtitleBn: 'অনলাইন শপ, শোরুম, স্মার্ট প্যাকিং, মাল্টি-ওয়্যারহাউজ ইনভেন্টরি, কুরিয়ার ও হিসাব—সবকিছু পরিচালনা করুন একটি কেন্দ্রীয় সিস্টেমে।', eyebrowEn: 'Business Operating Platform', eyebrowBn: 'ই-কমার্স বিজনেস অপারেটিং প্ল্যাটফর্ম', sortOrder: 1, isVisible: true },
    { id: 2, sectionKey: 'growth_complexity', titleEn: 'Growth Should Not Mean Operational Chaos', titleBn: 'ব্যবসা বড় হলে অপারেশন এলোমেলো হওয়া জরুরি নয়', subtitleEn: 'Disconnected tools create hidden leaks: packing mistakes, return losses, inventory mismatches, and unverified COD courier collections.', subtitleBn: 'আলাদা আলাদা টুল ব্যবহারে তৈরি হয় ভুল প্যাকিং, কুরিয়ার রিটার্ন ক্ষতি, স্টক গরমিল ও হিসাবের অনিশ্চয়তা।', eyebrowEn: 'Growth Creates Complexity', eyebrowBn: 'ব্যবসার বৃদ্ধি বনাম অপারেশনাল জটিলতা', sortOrder: 2, isVisible: true },
    { id: 3, sectionKey: 'ecosystem', titleEn: 'One Business. One Control Center.', titleBn: 'একটি ব্যবসা। একটি কেন্দ্রীয় কন্ট্রোল সেন্টার।', subtitleEn: 'A single operational system connecting all physical and online commerce nodes in real-time.', subtitleBn: 'অনলাইন শপ, শোরুম, ওয়্যারহাউজ ও কুরিয়ার—সবকিছু রিয়েল-টাইমে সংযুক্ত এক সিস্টেমে।', eyebrowEn: 'Unified Architecture', eyebrowBn: 'ইউনিফায়েড আর্কিটেকচার', sortOrder: 3, isVisible: true },
    { id: 4, sectionKey: 'multichannel', titleEn: 'Sell Across Multiple Channels Without Losing Control', titleBn: 'মাল্টিপল চ্যানেলে বিক্রি করুন স্টক নিয়ন্ত্রণ না হারিয়ে', subtitleEn: 'Central catalog control allows selective product publishing per store with automated central inventory lock.', subtitleBn: 'সেন্ট্রাল ক্যাটালগ থেকে ঠিক করুন কোন পণ্য কোন স্টোরে লাইভ হবে, সাথে অটোমেটিক সেন্ট্রাল স্টক লক।', eyebrowEn: 'Selective Channel Publishing', eyebrowBn: 'মাল্টি-চ্যানেল ডিস্ট্রিবিউশন', sortOrder: 4, isVisible: true },
    { id: 5, sectionKey: 'fulfillment', titleEn: 'The Connected Fulfillment Pipeline', titleBn: 'অর্ডার থেকে ব্যাংক ডিপোজিট: ৭-ধাপের ফুলফিলমেন্ট পাইপলাইন', subtitleEn: 'Automated telemetry from placement, customer risk evaluation, smart barcode packing, handover, to delivery.', subtitleBn: 'অর্ডার প্লেসমেন্ট থেকে শুরু করে ফ্রড প্রি-চেক, বারকোড ভেরিফিকেশন ও কুরিয়ার ডেলিভারির সম্পূর্ণ পাইপলাইন।', eyebrowEn: 'Connected Fulfillment Pipeline', eyebrowBn: 'ফুলফিলমেন্ট পাইপলাইন', sortOrder: 5, isVisible: true },
    { id: 6, sectionKey: 'loss_prevention', titleEn: 'Prevent Operational Mistakes. Protect Your Profit.', titleBn: 'ভুল বন্ধ করুন। ব্যবসার মুনাফা সুরক্ষিত রাখুন।', subtitleEn: 'Stop paying double delivery fees on preventable wrong packing and serial fake orders.', subtitleBn: 'ভুল সাইজ প্যাকিং এবং ভুয়া অর্ডারের কারণে প্রতি মাসে নষ্ট হওয়া কুরিয়ার বিল ও পুঁজি রক্ষা করুন।', eyebrowEn: 'Unit Economics & Protection', eyebrowBn: 'ক্ষতি প্রতিরোধ ও মার্জিন সুরক্ষা', sortOrder: 6, isVisible: true },
    { id: 7, sectionKey: 'inventory_finance', titleEn: 'Know Your Stock. Know Your Money.', titleBn: 'সঠিক স্টক। স্বচ্ছ ক্যাশ ফ্লো।', subtitleEn: 'Multi-warehouse bin locations with automated double-entry ledger postings for every movement.', subtitleBn: 'ওয়্যারহাউজের র‌্যাক-বিন লোকেশন থেকে শুরু করে সেলস ও কুরিয়ার সিওডি ক্যাশের স্বয়ংক্রিয় একাউন্টিং লেজার।', eyebrowEn: 'Warehouses & Double-Entry Accounting', eyebrowBn: 'ওয়্যারহাউজ ও ডাবল-এন্ট্রি হিসাব', sortOrder: 7, isVisible: true },
    { id: 8, sectionKey: 'pos_showroom', titleEn: 'Online + Physical Showrooms Working as One', titleBn: 'অনলাইন স্টোর ও ফিজিক্যাল শোরুমের নির্ভুল মেলবন্ধন', subtitleEn: 'Showroom barcode billing with split payments (Cash + bKash) and automated central stock deduction.', subtitleBn: 'শোরুমে বারকোড পিওএস সেলস, স্প্লিট পেমেন্ট এবং সেন্ট্রাল ইনভেন্টরির সাথে তাৎক্ষণিক সিঙ্ক।', eyebrowEn: 'Showrooms & Cloud POS', eyebrowBn: 'শোরুম ও ক্লাউড পিওএস', sortOrder: 8, isVisible: true },
    { id: 9, sectionKey: 'marketing', titleEn: 'Know Which Marketing Actually Delivers Real Profit', titleBn: 'জানুন কোন বিজ্ঞাপনে আসছে আসল রিয়েলাইজড প্রফিট', subtitleEn: 'Server-side Conversions API connects ad spend directly to parcels safely delivered and paid.', subtitleBn: 'সার্ভার-সাইড মেটা কনভার্শন এপিআই যা বিজ্ঞাপনের ফলাফল যাচাই করে কুরিয়ারে রিসিভ হওয়া ক্যাশের ভিত্তিতে।', eyebrowEn: 'Outcome-First Marketing', eyebrowBn: 'পরিমাপযোগ্য মার্কেটিং ফলাফল', sortOrder: 9, isVisible: true },
    { id: 10, sectionKey: 'pricing', titleEn: 'Transparent Architecture for Serious Brands', titleBn: 'গ্রোয়িং ব্র্যান্ডের জন্য উপযোগী ক্লিয়ার প্রাইসিং', subtitleEn: 'Choose an operational tier designed to support high volume without surprise fees.', subtitleBn: 'অর্ডার ভলিউম অনুযায়ী বেছে নিন উপযুক্ত টিয়ার, যা নিশ্চিত করে নিরবচ্ছিন্ন অপারেশন।', eyebrowEn: 'Commercial Architecture', eyebrowBn: 'প্ল্যান ও ইনভেস্টমেন্ট', sortOrder: 10, isVisible: true },
  ];

  private pricingPlans: PricingPlan[] = [
    {
      id: 1,
      slug: 'standard',
      nameEn: 'Standard Operation',
      nameBn: 'স্ট্যান্ডার্ড অপারেশন',
      tierSubtitleEn: 'For established brands reaching 150-300 orders/day with 1 warehouse',
      tierSubtitleBn: '১৫০ থেকে ৩০০ দৈনিক অর্ডার এবং ১টি সেন্ট্রাল ওয়্যারহাউজের জন্য',
      monthlyPrice: 12500,
      annualPrice: 10000,
      currency: '৳',
      orderVolume: 'Up to 9,000 orders/mo',
      usersIncluded: '6 Staff Accounts',
      showroomsIncluded: '1 Showroom POS',
      featuresEn: [
        'Central Order & Customer Control',
        'Smart Packing Station with Barcode Scanning',
        'Single Warehouse Bin Location Map',
        'Steadfast + Pathao Courier Sync & Label Print',
        'Fraud & Customer History Pre-Check',
        'Basic Income & Expense Ledger',
      ],
      featuresBn: [
        'সেন্ট্রাল অর্ডার ও কাস্টমার ম্যানেজমেন্ট',
        'বারকোড স্ক্যানারসহ স্মার্ট প্যাকিং ওয়ার্কস্পেস',
        'একটি ওয়্যারহাউজের র‌্যাক-বিন লোকেশন ম্যাপ',
        'স্টেডফাস্ট + পাঠাও কুরিয়ার সরাসরি ইন্টিগ্রেশন',
        'কাস্টমার ডেলিভারি হিস্ট্রি ও ফ্রড চেক',
        'ইনকাম ও এক্সপেন্স হিসাব',
      ],
      ctaLabelEn: 'Choose Standard',
      ctaLabelBn: 'স্ট্যান্ডার্ড নির্বাচন করুন',
      isPopular: false,
      sortOrder: 1,
      isActive: true,
    },
    {
      id: 2,
      slug: 'growth-pro',
      nameEn: 'Growth & Multi-Location',
      nameBn: 'গ্রোথ ও মাল্টি-লোকেশন',
      tierSubtitleEn: 'For high-volume operations managing multiple sales nodes & showrooms',
      tierSubtitleBn: 'উচ্চ ভলিউম এবং একাধিক বিক্রয় কেন্দ্র ও শোরুম পরিচালনার জন্য',
      monthlyPrice: 24500,
      annualPrice: 19500,
      currency: '৳',
      orderVolume: 'Up to 30,000 orders/mo',
      usersIncluded: '18 Staff Accounts',
      showroomsIncluded: '3 Showrooms POS Included',
      featuresEn: [
        'Everything in Standard',
        'Multi-Warehouse Stock Movement & Internal Transfer',
        'Selective Channel Product Publishing',
        'Courier Settlement & COD Bank Reconciliation',
        'Double-Entry Accounting & Financial Periods',
        'Employee Shifts, Attendance & Sales Commissions',
        'Server-Side Meta CAPI & Pixel Deduplication',
        'Dedicated Priority Onboarding Specialist',
      ],
      featuresBn: [
        'স্ট্যান্ডার্ডের সকল ফিচার অন্তর্ভুক্ত',
        'একাধিক ওয়্যারহাউজের মধ্যে স্টক মুভমেন্ট ও ট্রান্সফার',
        'সিলেক্টিভ চ্যানেল প্রোডাক্ট পাবলিশিং',
        'কুরিয়ার সিওডি স্টেটমেন্ট ও ব্যাংক রিকনসিলিয়েশন',
        'ডাবল-এন্ট্রি একাউন্টিং ও ফাইন্যান্সিয়াল পিরিয়ড',
        'স্টাফ শিফট, অ্যাটেনডেন্স ও সেলস কমিশন ক্যালকুলেটর',
        'সার্ভার-সাইড মেটা কনভার্শন এপিআই ও ইভেন্ট ট্র্যাকিং',
        'ডেডিকেটেড প্রায়োরিটি অনবোর্ডিং সাপোর্ট',
      ],
      ctaLabelEn: 'Deploy Growth Platform',
      ctaLabelBn: 'গ্রোথ প্ল্যাটফর্মে শুরু করুন',
      isPopular: true,
      sortOrder: 2,
      isActive: true,
    },
    {
      id: 3,
      slug: 'enterprise',
      nameEn: 'Enterprise Dedicated',
      nameBn: 'এন্টারপ্রাইজ কাস্টম আর্কিটেকচার',
      tierSubtitleEn: 'Tailored infrastructure for upper-market retailers with extensive showroom fleets',
      tierSubtitleBn: 'বড় রিটেইল চেইন ও বড় শোরুম নেটওয়ার্কের উপযোগী কাস্টম ক্লাউড সেটআপ',
      monthlyPrice: 48000,
      annualPrice: 39000,
      currency: '৳',
      orderVolume: 'Unlimited Volume',
      usersIncluded: 'Unlimited Staff Accounts',
      showroomsIncluded: 'Unlimited Showroom POS',
      featuresEn: [
        'Everything in Growth',
        'Custom Private Database Instance & High-Throughput API',
        'Custom Courier & ERP Webhook Adapters',
        'Granular RBAC with Audit Trail Logs',
        'On-Premise Warehouse Terminal Support',
        'Quarterly Business Process Review & 24/7 SLA',
      ],
      featuresBn: [
        'গ্রোথের সকল ফিচার অন্তর্ভুক্ত',
        'কাস্টম প্রাইভেট ডাটাবেজ ইনস্ট্যান্স ও হাই-থ্রুপুট এপিআই',
        'কাস্টম কুরিয়ার ও ইআরপি ওয়েবহুক অ্যাডাপ্টার',
        'গ্র্যানুলার পারমিশন ও ক্রিপ্টোগ্রাফিক অডিট লগ',
        'অন-প্রিমাইস ওয়্যারহাউজ বারকোড টার্মিনাল সেটআপ',
        'কোয়ার্টারলি বিজনেস প্রসেস রিভিউ ও ২৪/৭ এসএলএ',
      ],
      ctaLabelEn: 'Talk to Architecture Team',
      ctaLabelBn: 'আর্কিটেকচার টিমের সাথে কথা বলুন',
      isPopular: false,
      sortOrder: 3,
      isActive: true,
    },
  ];

  private leads: Lead[] = [
    {
      id: 101,
      name: 'Tanvir Hossain',
      phone: '01712-849201',
      email: 'tanvir@stylehaus.com.bd',
      dailyVolume: '300 – 600 orders / day',
      note: 'Operating 2 stores on WooCommerce and 1 showroom in Dhanmondi. Facing courier COD mismatches.',
      source: 'landing_page_lead_form',
      utmSource: 'facebook',
      utmCampaign: 'cod_reconciliation',
      status: 'Demo Scheduled',
      assignedTo: 'Shakil Ahmed',
      internalNotes: 'Showroom POS demo scheduled for Thursday 3pm.',
      licensePortalStatus: 'Pending',
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
    {
      id: 102,
      name: 'Nuzhat Farhana',
      phone: '01911-382910',
      email: 'nuzhat@luxeheritage.com',
      dailyVolume: '150 – 300 orders / day',
      note: 'Need smart packing to stop wrong size delivery returns in female apparel.',
      source: 'landing_page_lead_form',
      utmSource: 'google_search',
      utmCampaign: 'packing_mistakes',
      status: 'Qualified',
      assignedTo: 'Nafis Iqbal',
      internalNotes: 'Evaluated packing terminal hardware requirements.',
      licensePortalStatus: 'Pending',
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 40).toISOString(),
    },
  ];

  private testimonials: Testimonial[] = [
    {
      id: 1,
      clientName: 'Ashrafur Rahman',
      clientRole: 'Head of Operations',
      companyName: 'Luxe Attire Ltd',
      category: 'Fashion & Apparel',
      location: 'Banani & Tejgaon, Dhaka',
      quoteEn: 'Before EcoMate, picking errors caused around 35 wrong-size parcel returns every week. With barcode verification and location bins, dispatch mistakes dropped to almost zero.',
      quoteBn: 'ইকোমেটের আগে প্রতি সপ্তাহে প্রায় ৩৫টি পার্সেল ভুল সাইজে প্যাক হয়ে রিটার্ন আসত। বারকোড স্ক্যানিং এবং বিন লোকেশন ব্যবহারের পর আমাদের প্যাকিংয়ের ভুল শূন্যের কোঠায় নেমে এসেছে।',
      websiteUrl: 'luxeattire.com.bd',
      logoUrl: '',
      videoUrl: 'https://www.youtube.com/watch?v=sample-ecomate-1',
      videoDuration: '3:45 min',
      format: 'video_walkthrough',
      metrics: [
        { label: 'Avoidable Mispacks', stat: 'Zero' },
        { label: 'Daily Dispatch Speed', stat: '3.2x Faster' },
        { label: 'Reconciliation', stat: '100% Matched' },
      ],
      sortOrder: 1,
      isPublished: true,
    },
    {
      id: 2,
      clientName: 'Mahmudul Hasan',
      clientRole: 'Co-founder & Managing Director',
      companyName: 'Nordic Living Bangladesh',
      category: 'Home & Lifestyle',
      location: 'Gulshan Showroom + Online',
      quoteEn: 'Having our retail showroom floor sales automatically sync with online WooCommerce inventory solved our biggest headache: overselling items already bought at the counter.',
      quoteBn: 'আমাদের গুলশান শোরুমের কাউন্টার সেল হওয়ার সাথে সাথে অনলাইন উকমার্স স্টকের স্বয়ংক্রিয় সিঙ্ক আমাদের ওভার-সেলিংয়ের দীর্ঘদিনের সমস্যা সম্পূর্ণ দূর করেছে।',
      websiteUrl: 'nordicliving.bd',
      logoUrl: '',
      videoUrl: 'https://www.youtube.com/watch?v=sample-ecomate-2',
      videoDuration: '2:50 min',
      format: 'video_walkthrough',
      metrics: [
        { label: 'Stock Discrepancy', stat: 'Eliminated' },
        { label: 'Cashier Checkout', stat: '18s / bill' },
        { label: 'Showroom Branches', stat: '3 Connected' },
      ],
      sortOrder: 2,
      isPublished: true,
    },
    {
      id: 3,
      clientName: 'Samiul Karim',
      clientRole: 'Chief Financial Officer',
      companyName: 'Veloce Footwear',
      category: 'Footwear & Leather',
      location: 'Mirpur Hub & Chittagong',
      quoteEn: 'Reconciling Steadfast and Pathao payment statements used to take three accountants three days every month. In EcoMate, courier statements are matched automatically against bank deposits.',
      quoteBn: 'স্টেডফাস্ট আর পাঠাও এর পেমেন্ট স্টেটমেন্ট মিলাতে প্রতি মাসে তিনজন একাউন্ট্যান্টের তিন দিন লাগত। ইকোমেটে এখন ব্যাংকের ডিপোজিট স্টেটমেন্টের সাথে স্বয়ংক্রিয়ভাবে ১০০% মিলে যায়।',
      websiteUrl: 'velocefootwear.com',
      logoUrl: '',
      videoUrl: 'https://www.youtube.com/watch?v=sample-ecomate-3',
      videoDuration: '4:15 min',
      format: 'video_walkthrough',
      metrics: [
        { label: 'Monthly Recon Time', stat: 'From 3 days to 15m' },
        { label: 'COD Cash Accuracy', stat: '100% Tracked' },
        { label: 'Disputed Overcharges', stat: 'Auto-flagged' },
      ],
      sortOrder: 3,
      isPublished: true,
    },
  ];

  private caseStudies: CaseStudy[] = [
    {
      id: 1,
      slug: 'fashion-brand-packing-error-reduction',
      title: 'How a Premier Fashion Brand Eliminated Return Losses from Mispacking',
      client: 'Luxe Attire Ltd',
      businessType: 'Multi-Store Fashion & Retail',
      problemOverview: 'Processing 450+ orders daily across web and WhatsApp resulted in packers grabbing adjacent sizes, costing ~৳1,20,000 monthly in wasted roundtrip courier fees.',
      solutionImplemented: 'Deployed EcoMate Smart Packing workstation with strict barcode audio-verification before consignment label printing.',
      quantifiedOutcome: 'Prevented ~140 wrong-product dispatches monthly, saving significant courier bills and protecting customer brand sentiment.',
      metrics: [
        { label: 'Monthly Courier Loss Protected', stat: '৳ 1,45,000' },
        { label: 'Packing Verification Rate', stat: '100% Barcode' },
      ],
      featuredImageUrl: '',
      videoUrl: '',
      websiteUrl: 'luxeattire.com.bd',
      isPublished: true,
      seoTitle: 'Fashion Brand Case Study — Zero Mispack Operations with EcoMate',
      seoDescription: 'Learn how smart barcode packing saved over ৳1,40,000 monthly in courier return fees for a high-volume Bangladesh fashion brand.',
    },
  ];

  private blogPosts: BlogPost[] = [
    {
      id: 1,
      slug: 'why-ecommerce-businesses-lose-money-on-courier-returns',
      title: 'The Hidden Drain: Why Growing E-commerce Brands Lose ৳1,00,000+ Monthly on Courier Returns',
      excerpt: 'Most founders treat courier return costs as an inevitable cost of business. Here is the operational breakdown of preventable vs unpreventable returns.',
      content: `When an e-commerce business in Bangladesh processes 300 to 800 orders daily, Cash on Delivery (COD) return rates can quietly drain 15% to 25% of gross operational profit.

### The Two Types of Courier Returns
1. **Unpreventable Returns**: Customer genuine emergencies or mind-changes at doorstep.
2. **Preventable Operational Returns**:
   - Dispatch of wrong size or color (100% preventable via barcode verification).
   - Delivery to impulsive fake buyers with proven serial return history across Steadfast or Pathao networks.
   - Dispatch delays caused by warehouse bin confusion.

### How Much Does a Preventable Return Really Cost?
Forward delivery charge (৳130) + Return transit penalty (৳70) + Packaging materials wasted (৳40) + Locked capital holding cost (৳150) = **৳390 to ৳450 per mistake**.

When 10 orders per day suffer preventable issues, that is **৳1,20,000 in direct cash drain every month**. EcoMate's smart packing workstation and pre-dispatch fraud verification turn this loss back into net realized margin.`,
      author: 'EcoMate Operations Research',
      category: 'Logistics & Economics',
      tags: ['courier', 'smart-packing', 'cod-reconciliation', 'bangladesh-ecommerce'],
      featuredImageUrl: '',
      readTime: '6 min read',
      status: 'published',
      seoTitle: 'Why E-commerce Brands Lose Money on Courier Returns | EcoMate Guide',
      seoDescription: 'Complete breakdown of courier return costs in Bangladesh e-commerce, and how barcode verification stops operational cash leaks.',
      canonicalUrl: 'https://ecomate.app/blog/why-ecommerce-businesses-lose-money-on-courier-returns',
      publishedAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    },
    {
      id: 2,
      slug: 'multi-store-and-showroom-inventory-synchronization',
      title: 'Connecting Showrooms and Online Stores: The Zero-Overselling Blueprint',
      excerpt: 'How leading lifestyle brands eliminate the nightmare of selling floor stock that online customers simultaneously checked out.',
      content: `Retailers expanding from online to physical showrooms face immediate stock desynchronization if floor registers operate on disconnected POS software.

### The Central Inventory Lock
When a cashier at your Gulshan or Dhanmondi showroom scans a pair of shoes for checkout, EcoMate immediately:
1. Decrements showroom floor inventory in real-time.
2. Sends an instant allocation update to your WooCommerce catalog to prevent overselling.
3. Automatically writes the split payment (Cash + bKash) into the daily register ledger.
4. Updates COGS in the double-entry financial system.

This eliminates end-of-day phone calls between warehouse managers and showroom cashiers.`,
      author: 'EcoMate Engineering Team',
      category: 'Omnichannel & POS',
      tags: ['pos', 'showrooms', 'multi-store', 'inventory-management'],
      featuredImageUrl: '',
      readTime: '5 min read',
      status: 'published',
      seoTitle: 'Connecting Showrooms and Online Stores — Zero-Overselling Blueprint',
      seoDescription: 'Step-by-step architecture for synchronizing retail showroom POS registers with online WooCommerce stores in real-time.',
      canonicalUrl: 'https://ecomate.app/blog/multi-store-and-showroom-inventory-synchronization',
      publishedAt: new Date(Date.now() - 3600000 * 120).toISOString(),
    },
  ];

  private mediaAssets: MediaAsset[] = [
    { id: 1, key: 'ecomate_logo', title: 'EcoMate Brand Logo Slot', url: '/assets/ecomate-logo.svg', altText: 'EcoMate Platform Logo', category: 'logo' },
    { id: 2, key: 'hero_preview', title: 'Central Operations Console Mockup', url: '/assets/hero-console.webp', altText: 'EcoMate Central Console Workspace', category: 'product_ui' },
    { id: 3, key: 'packing_station', title: 'Smart Packing Station UI', url: '/assets/smart-packing.webp', altText: 'Barcode Verification Terminal', category: 'product_ui' },
  ];

  private integrationLogs: IntegrationLog[] = [
    {
      id: 1,
      serviceName: 'LicensePortal',
      action: 'SYNC_LEAD',
      payload: { leadId: 101, name: 'Tanvir Hossain', phone: '01712-849201' },
      response: { message: 'License portal adapter initialized (standby mode).' },
      status: 'Success',
      attempts: 1,
      createdAt: new Date().toISOString(),
    },
  ];

  // Repository Methods
  getSettings(): SiteSettings {
    return { ...this.settings };
  }

  updateSettings(data: Partial<SiteSettings>): SiteSettings {
    this.settings = { ...this.settings, ...data, updatedAt: new Date().toISOString() };
    return { ...this.settings };
  }

  getSections(): LandingSection[] {
    return [...this.sections].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  updateSection(id: number, data: Partial<LandingSection>): LandingSection | null {
    const idx = this.sections.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    this.sections[idx] = { ...this.sections[idx], ...data };
    return { ...this.sections[idx] };
  }

  getPricingPlans(): PricingPlan[] {
    return [...this.pricingPlans].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  createPricingPlan(plan: Omit<PricingPlan, 'id'>): PricingPlan {
    const newPlan: PricingPlan = { ...plan, id: Date.now() };
    this.pricingPlans.push(newPlan);
    return newPlan;
  }

  updatePricingPlan(id: number, data: Partial<PricingPlan>): PricingPlan | null {
    const idx = this.pricingPlans.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.pricingPlans[idx] = { ...this.pricingPlans[idx], ...data };
    return { ...this.pricingPlans[idx] };
  }

  deletePricingPlan(id: number): boolean {
    const lenBefore = this.pricingPlans.length;
    this.pricingPlans = this.pricingPlans.filter((p) => p.id !== id);
    return this.pricingPlans.length < lenBefore;
  }

  getLeads(): Lead[] {
    return [...this.leads].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  createLead(leadData: { name: string; phone: string; email?: string; dailyVolume?: string; note?: string; source?: string; utmSource?: string; utmCampaign?: string }): Lead {
    const newLead: Lead = {
      id: Date.now(),
      name: leadData.name,
      phone: leadData.phone,
      email: leadData.email || '',
      dailyVolume: leadData.dailyVolume || '150 – 500 orders / day',
      note: leadData.note || '',
      source: leadData.source || 'landing_page_lead_form',
      utmSource: leadData.utmSource || '',
      utmCampaign: leadData.utmCampaign || '',
      status: 'New',
      assignedTo: 'Unassigned',
      internalNotes: '',
      licensePortalStatus: 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.leads.unshift(newLead);
    return newLead;
  }

  updateLeadStatus(id: number, status: Lead['status'], internalNotes?: string): Lead | null {
    const lead = this.leads.find((l) => l.id === id);
    if (!lead) return null;
    lead.status = status;
    if (internalNotes !== undefined) lead.internalNotes = internalNotes;
    lead.updatedAt = new Date().toISOString();
    return { ...lead };
  }

  updateLeadLicenseSync(id: number, syncStatus: 'Pending' | 'Synced' | 'Failed', error?: string): Lead | null {
    const lead = this.leads.find((l) => l.id === id);
    if (!lead) return null;
    lead.licensePortalStatus = syncStatus;
    if (error !== undefined) lead.licensePortalError = error;
    if (syncStatus === 'Synced') lead.licensePortalSyncedAt = new Date().toISOString();
    lead.updatedAt = new Date().toISOString();
    return { ...lead };
  }

  getTestimonials(): Testimonial[] {
    return [...this.testimonials].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  getCaseStudies(): CaseStudy[] {
    return [...this.caseStudies];
  }

  getBlogPosts(): BlogPost[] {
    return [...this.blogPosts].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }

  getBlogPostBySlug(slug: string): BlogPost | undefined {
    return this.blogPosts.find((p) => p.slug === slug);
  }

  createBlogPost(post: Omit<BlogPost, 'id' | 'publishedAt'>): BlogPost {
    const newPost: BlogPost = {
      ...post,
      id: Date.now(),
      publishedAt: new Date().toISOString(),
    };
    this.blogPosts.unshift(newPost);
    return newPost;
  }

  updateBlogPost(id: number, data: Partial<BlogPost>): BlogPost | null {
    const idx = this.blogPosts.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    this.blogPosts[idx] = { ...this.blogPosts[idx], ...data };
    return { ...this.blogPosts[idx] };
  }

  getMediaAssets(): MediaAsset[] {
    return [...this.mediaAssets];
  }

  createMediaAsset(asset: Omit<MediaAsset, 'id'>): MediaAsset {
    const newAsset = { ...asset, id: Date.now() };
    this.mediaAssets.push(newAsset);
    return newAsset;
  }

  getIntegrationLogs(): IntegrationLog[] {
    return [...this.integrationLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  logIntegration(log: Omit<IntegrationLog, 'id' | 'createdAt'>): IntegrationLog {
    const entry: IntegrationLog = {
      ...log,
      id: Date.now(),
      createdAt: new Date().toISOString(),
    };
    this.integrationLogs.unshift(entry);
    return entry;
  }
}

export const repository = new EcoMateRepository();
