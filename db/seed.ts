/**
 * One-time seed for the Postgres schema in `db/schema.ts`.
 *
 * Rows are the prototype's in-memory repository seed (`src/db/index.ts:186-534`) moved
 * verbatim into SQL, so the migrated app serves exactly what the Vite prototype served.
 *
 * Run with the direct (port 5432) connection string, never the pooled Hyperdrive one:
 *   DIRECT_URL="postgresql://..." npm run db:seed
 *
 * This script uses its own `postgres-js` client instead of `db/client.ts` because it runs
 * in plain Node (via `tsx`), outside any Cloudflare request context, and because a seed
 * want a single connection with `prepare:false` (transaction-pooler safe).
 *
 * Every insert is idempotent (guarded by an existence check or `ON CONFLICT DO NOTHING`)
 * and the whole seed runs in one transaction: a half-seeded database is worse than an
 * empty one, because it looks populated.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from './schema';
import { landingContent } from '../src/data/landingContent';

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '';

if (!url) {
  console.error('[seed] DIRECT_URL (or DATABASE_URL) must be set. See .env.example.');
  process.exit(1);
}

const client = postgres(url, { prepare: false, max: 1 });
const db = drizzle(client, { schema });

const HOUR = 3_600_000;

async function main() {
  await db.transaction(async (tx) => {
    // ---------------------------------------------------------------------------------
    // 1. Site settings — singleton row (the API reads/updates `WHERE id = 1`)
    // ---------------------------------------------------------------------------------
    const existingSettings = await tx
      .select({ id: schema.siteSettingsTable.id })
      .from(schema.siteSettingsTable)
      .limit(1);

    if (existingSettings.length === 0) {
      await tx.insert(schema.siteSettingsTable).values({
        siteName: 'EcoMate',
        tagline: 'Your Entire E-commerce Operation, Managed From One Place',
        defaultLocale: 'en',
        supportPhone: '+880 1894-828290',
        supportEmail: 'hello@ecomate.app',
        whatsappNumber: '8801894828290',
        messengerUrl: 'https://m.me/ecomate.app',
        address: 'Tejgaon I/A, Dhaka 1208, Bangladesh',
        isPricingVisible: true,
      });
    }

    // ---------------------------------------------------------------------------------
    // 2. Landing sections — 10 rows, keyed by the unique `section_key`
    // ---------------------------------------------------------------------------------
    await tx
      .insert(schema.landingSectionsTable)
      .values([
        {
          sectionKey: 'hero',
          titleEn: 'Your Entire E-commerce Operation, Managed From One Place',
          titleBn: 'আপনার পুরো ই-কমার্স অপারেশন, একটি সেন্ট্রাল সিস্টেম থেকে',
          subtitleEn:
            'Unify online stores, showrooms, smart packing, multi-warehouse inventory, couriers, and finance in one connected operational control center.',
          subtitleBn:
            'অনলাইন শপ, শোরুম, স্মার্ট প্যাকিং, মাল্টি-ওয়্যারহাউজ ইনভেন্টরি, কুরিয়ার ও হিসাব—সবকিছু পরিচালনা করুন একটি কেন্দ্রীয় সিস্টেমে।',
          eyebrowEn: 'Business Operating Platform',
          eyebrowBn: 'ই-কমার্স বিজনেস অপারেটিং প্ল্যাটফর্ম',
          sortOrder: 1,
          isVisible: true,
        },
        {
          sectionKey: 'growth_complexity',
          titleEn: 'Growth Should Not Mean Operational Chaos',
          titleBn: 'ব্যবসা বড় হলে অপারেশন এলোমেলো হওয়া জরুরি নয়',
          subtitleEn:
            'Disconnected tools create hidden leaks: packing mistakes, return losses, inventory mismatches, and unverified COD courier collections.',
          subtitleBn:
            'আলাদা আলাদা টুল ব্যবহারে তৈরি হয় ভুল প্যাকিং, কুরিয়ার রিটার্ন ক্ষতি, স্টক গরমিল ও হিসাবের অনিশ্চয়তা।',
          eyebrowEn: 'Growth Creates Complexity',
          eyebrowBn: 'ব্যবসার বৃদ্ধি বনাম অপারেশনাল জটিলতা',
          sortOrder: 2,
          isVisible: true,
        },
        {
          sectionKey: 'ecosystem',
          titleEn: 'One Business. One Control Center.',
          titleBn: 'একটি ব্যবসা। একটি কেন্দ্রীয় কন্ট্রোল সেন্টার।',
          subtitleEn:
            'A single operational system connecting all physical and online commerce nodes in real-time.',
          subtitleBn:
            'অনলাইন শপ, শোরুম, ওয়্যারহাউজ ও কুরিয়ার—সবকিছু রিয়েল-টাইমে সংযুক্ত এক সিস্টেমে।',
          eyebrowEn: 'Unified Architecture',
          eyebrowBn: 'ইউনিফায়েড আর্কিটেকচার',
          sortOrder: 3,
          isVisible: true,
        },
        {
          sectionKey: 'multichannel',
          titleEn: 'Sell Across Multiple Channels Without Losing Control',
          titleBn: 'মাল্টিপল চ্যানেলে বিক্রি করুন স্টক নিয়ন্ত্রণ না হারিয়ে',
          subtitleEn:
            'Central catalog control allows selective product publishing per store with automated central inventory lock.',
          subtitleBn:
            'সেন্ট্রাল ক্যাটালগ থেকে ঠিক করুন কোন পণ্য কোন স্টোরে লাইভ হবে, সাথে অটোমেটিক সেন্ট্রাল স্টক লক।',
          eyebrowEn: 'Selective Channel Publishing',
          eyebrowBn: 'মাল্টি-চ্যানেল ডিস্ট্রিবিউশন',
          sortOrder: 4,
          isVisible: true,
        },
        {
          sectionKey: 'fulfillment',
          titleEn: 'The Connected Fulfillment Pipeline',
          titleBn: 'অর্ডার থেকে ব্যাংক ডিপোজিট: ৭-ধাপের ফুলফিলমেন্ট পাইপলাইন',
          subtitleEn:
            'Automated telemetry from placement, customer risk evaluation, smart barcode packing, handover, to delivery.',
          subtitleBn:
            'অর্ডার প্লেসমেন্ট থেকে শুরু করে ফ্রড প্রি-চেক, বারকোড ভেরিফিকেশন ও কুরিয়ার ডেলিভারির সম্পূর্ণ পাইপলাইন।',
          eyebrowEn: 'Connected Fulfillment Pipeline',
          eyebrowBn: 'ফুলফিলমেন্ট পাইপলাইন',
          sortOrder: 5,
          isVisible: true,
        },
        {
          sectionKey: 'loss_prevention',
          titleEn: 'Prevent Operational Mistakes. Protect Your Profit.',
          titleBn: 'ভুল বন্ধ করুন। ব্যবসার মুনাফা সুরক্ষিত রাখুন।',
          subtitleEn:
            'Stop paying double delivery fees on preventable wrong packing and serial fake orders.',
          subtitleBn:
            'ভুল সাইজ প্যাকিং এবং ভুয়া অর্ডারের কারণে প্রতি মাসে নষ্ট হওয়া কুরিয়ার বিল ও পুঁজি রক্ষা করুন।',
          eyebrowEn: 'Unit Economics & Protection',
          eyebrowBn: 'ক্ষতি প্রতিরোধ ও মার্জিন সুরক্ষা',
          sortOrder: 6,
          isVisible: true,
        },
        {
          sectionKey: 'inventory_finance',
          titleEn: 'Know Your Stock. Know Your Money.',
          titleBn: 'সঠিক স্টক। স্বচ্ছ ক্যাশ ফ্লো।',
          subtitleEn:
            'Multi-warehouse bin locations with automated double-entry ledger postings for every movement.',
          subtitleBn:
            'ওয়্যারহাউজের র‌্যাক-বিন লোকেশন থেকে শুরু করে সেলস ও কুরিয়ার সিওডি ক্যাশের স্বয়ংক্রিয় একাউন্টিং লেজার।',
          eyebrowEn: 'Warehouses & Double-Entry Accounting',
          eyebrowBn: 'ওয়্যারহাউজ ও ডাবল-এন্ট্রি হিসাব',
          sortOrder: 7,
          isVisible: true,
        },
        {
          sectionKey: 'pos_showroom',
          titleEn: 'Online + Physical Showrooms Working as One',
          titleBn: 'অনলাইন স্টোর ও ফিজিক্যাল শোরুমের নির্ভুল মেলবন্ধন',
          subtitleEn:
            'Showroom barcode billing with split payments (Cash + bKash) and automated central stock deduction.',
          subtitleBn:
            'শোরুমে বারকোড পিওএস সেলস, স্প্লিট পেমেন্ট এবং সেন্ট্রাল ইনভেন্টরির সাথে তাৎক্ষণিক সিঙ্ক।',
          eyebrowEn: 'Showrooms & Cloud POS',
          eyebrowBn: 'শোরুম ও ক্লাউড পিওএস',
          sortOrder: 8,
          isVisible: true,
        },
        {
          sectionKey: 'marketing',
          titleEn: 'Know Which Marketing Actually Delivers Real Profit',
          titleBn: 'জানুন কোন বিজ্ঞাপনে আসছে আসল রিয়েলাইজড প্রফিট',
          subtitleEn:
            'Server-side Conversions API connects ad spend directly to parcels safely delivered and paid.',
          subtitleBn:
            'সার্ভার-সাইড মেটা কনভার্শন এপিআই যা বিজ্ঞাপনের ফলাফল যাচাই করে কুরিয়ারে রিসিভ হওয়া ক্যাশের ভিত্তিতে।',
          eyebrowEn: 'Outcome-First Marketing',
          eyebrowBn: 'পরিমাপযোগ্য মার্কেটিং ফলাফল',
          sortOrder: 9,
          isVisible: true,
        },
        {
          sectionKey: 'pricing',
          titleEn: 'Transparent Architecture for Serious Brands',
          titleBn: 'গ্রোয়িং ব্র্যান্ডের জন্য উপযোগী ক্লিয়ার প্রাইসিং',
          subtitleEn:
            'Choose an operational tier designed to support high volume without surprise fees.',
          subtitleBn:
            'অর্ডার ভলিউম অনুযায়ী বেছে নিন উপযুক্ত টিয়ার, যা নিশ্চিত করে নিরবচ্ছিন্ন অপারেশন।',
          eyebrowEn: 'Commercial Architecture',
          eyebrowBn: 'প্ল্যান ও ইনভেস্টমেন্ট',
          sortOrder: 10,
          isVisible: true,
        },
      ])
      .onConflictDoNothing();

    // ---------------------------------------------------------------------------------
    // 3. Pricing plans — 3 rows, keyed by the unique `slug`
    // ---------------------------------------------------------------------------------
    await tx
      .insert(schema.pricingPlansTable)
      .values([
        {
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
          slug: 'enterprise',
          nameEn: 'Enterprise Dedicated',
          nameBn: 'এন্টারপ্রাইজ কাস্টম আর্কিটেকচার',
          tierSubtitleEn:
            'Tailored infrastructure for upper-market retailers with extensive showroom fleets',
          tierSubtitleBn:
            'বড় রিটেইল চেইন ও বড় শোরুম নেটওয়ার্কের উপযোগী কাস্টম ক্লাউড সেটআপ',
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
      ])
      .onConflictDoNothing();

    // ---------------------------------------------------------------------------------
    // 4. Leads — 2 demo rows. Explicit ids keep the integration-log payload honest, so
    //    the sequence is advanced afterwards to avoid a primary-key collision on the
    //    first real lead submitted through the API.
    // ---------------------------------------------------------------------------------
    const existingLead = await tx
      .select({ id: schema.leadsTable.id })
      .from(schema.leadsTable)
      .limit(1);

    if (existingLead.length === 0) {
      await tx.insert(schema.leadsTable).values([
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
          createdAt: new Date(Date.now() - HOUR * 24),
          updatedAt: new Date(Date.now() - HOUR * 12),
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
          createdAt: new Date(Date.now() - HOUR * 48),
          updatedAt: new Date(Date.now() - HOUR * 40),
        },
      ]);

      await tx.execute(
        sql`SELECT setval(pg_get_serial_sequence('leads', 'id'), (SELECT MAX(id) FROM leads))`,
      );
    }

    // ---------------------------------------------------------------------------------
    // 5. Testimonials — 3 rows (no natural key: guarded by an existence check)
    // ---------------------------------------------------------------------------------
    const existingTestimonial = await tx
      .select({ id: schema.testimonialsTable.id })
      .from(schema.testimonialsTable)
      .limit(1);

    if (existingTestimonial.length === 0) {
      await tx.insert(schema.testimonialsTable).values([
        {
          clientName: 'Ashrafur Rahman',
          clientRole: 'Head of Operations',
          companyName: 'Luxe Attire Ltd',
          category: 'Fashion & Apparel',
          location: 'Banani & Tejgaon, Dhaka',
          quoteEn:
            'Before EcoMate, picking errors caused around 35 wrong-size parcel returns every week. With barcode verification and location bins, dispatch mistakes dropped to almost zero.',
          quoteBn:
            'ইকোমেটের আগে প্রতি সপ্তাহে প্রায় ৩৫টি পার্সেল ভুল সাইজে প্যাক হয়ে রিটার্ন আসত। বারকোড স্ক্যানিং এবং বিন লোকেশন ব্যবহারের পর আমাদের প্যাকিংয়ের ভুল শূন্যের কোঠায় নেমে এসেছে।',
          websiteUrl: 'luxeattire.com.bd',
          logoUrl: '',
          videoUrl: 'https://www.youtube.com/watch?v=sample-ecomate-1',
          videoDuration: '3:45 min',
          videoProvider: 'youtube',
          format: 'video_standard',
          metrics: [
            { label: 'Avoidable Mispacks', stat: 'Zero' },
            { label: 'Daily Dispatch Speed', stat: '3.2x Faster' },
            { label: 'Reconciliation', stat: '100% Matched' },
          ],
          sortOrder: 1,
          isPublished: true,
        },
        {
          clientName: 'Mahmudul Hasan',
          clientRole: 'Co-founder & Managing Director',
          companyName: 'Nordic Living Bangladesh',
          category: 'Home & Lifestyle',
          location: 'Gulshan Showroom + Online',
          quoteEn:
            'Having our retail showroom floor sales automatically sync with online WooCommerce inventory solved our biggest headache: overselling items already bought at the counter.',
          quoteBn:
            'আমাদের গুলশান শোরুমের কাউন্টার সেল হওয়ার সাথে সাথে অনলাইন উকমার্স স্টকের স্বয়ংক্রিয় সিঙ্ক আমাদের ওভার-সেলিংয়ের দীর্ঘদিনের সমস্যা সম্পূর্ণ দূর করেছে।',
          websiteUrl: 'nordicliving.bd',
          logoUrl: '',
          videoUrl: 'https://www.youtube.com/watch?v=sample-ecomate-2',
          videoDuration: '2:50 min',
          videoProvider: 'youtube',
          format: 'video_standard',
          metrics: [
            { label: 'Stock Discrepancy', stat: 'Eliminated' },
            { label: 'Cashier Checkout', stat: '18s / bill' },
            { label: 'Showroom Branches', stat: '3 Connected' },
          ],
          sortOrder: 2,
          isPublished: true,
        },
        {
          clientName: 'Samiul Karim',
          clientRole: 'Chief Financial Officer',
          companyName: 'Veloce Footwear',
          category: 'Footwear & Leather',
          location: 'Mirpur Hub & Chittagong',
          quoteEn:
            'Reconciling Steadfast and Pathao payment statements used to take three accountants three days every month. In EcoMate, courier statements are matched automatically against bank deposits.',
          quoteBn:
            'স্টেডফাস্ট আর পাঠাও এর পেমেন্ট স্টেটমেন্ট মিলাতে প্রতি মাসে তিনজন একাউন্ট্যান্টের তিন দিন লাগত। ইকোমেটে এখন ব্যাংকের ডিপোজিট স্টেটমেন্টের সাথে স্বয়ংক্রিয়ভাবে ১০০% মিলে যায়।',
          websiteUrl: 'velocefootwear.com',
          logoUrl: '',
          videoUrl: 'https://www.youtube.com/watch?v=sample-ecomate-3',
          videoDuration: '4:15 min',
          videoProvider: 'youtube',
          format: 'video_standard',
          metrics: [
            { label: 'Monthly Recon Time', stat: 'From 3 days to 15m' },
            { label: 'COD Cash Accuracy', stat: '100% Tracked' },
            { label: 'Disputed Overcharges', stat: 'Auto-flagged' },
          ],
          sortOrder: 3,
          isPublished: true,
        },
      ]);
    }

    // ---------------------------------------------------------------------------------
    // 6. Case studies — 1 row, keyed by the unique `slug`
    // ---------------------------------------------------------------------------------
    await tx
      .insert(schema.caseStudiesTable)
      .values({
        slug: 'fashion-brand-packing-error-reduction',
        title: 'How a Premier Fashion Brand Eliminated Return Losses from Mispacking',
        client: 'Luxe Attire Ltd',
        businessType: 'Multi-Store Fashion & Retail',
        problemOverview:
          'Processing 450+ orders daily across web and WhatsApp resulted in packers grabbing adjacent sizes, costing ~৳1,20,000 monthly in wasted roundtrip courier fees.',
        solutionImplemented:
          'Deployed EcoMate Smart Packing workstation with strict barcode audio-verification before consignment label printing.',
        quantifiedOutcome:
          'Prevented ~140 wrong-product dispatches monthly, saving significant courier bills and protecting customer brand sentiment.',
        metrics: [
          { label: 'Monthly Courier Loss Protected', stat: '৳ 1,45,000' },
          { label: 'Packing Verification Rate', stat: '100% Barcode' },
        ],
        featuredImageUrl: '',
        videoUrl: '',
        websiteUrl: 'luxeattire.com.bd',
        isPublished: true,
        seoTitle: 'Fashion Brand Case Study — Zero Mispack Operations with EcoMate',
        seoDescription:
          'Learn how smart barcode packing saved over ৳1,40,000 monthly in courier return fees for a high-volume Bangladesh fashion brand.',
      })
      .onConflictDoNothing();

    // ---------------------------------------------------------------------------------
    // 7. Blog posts — 2 rows, keyed by the (partial) unique live `slug`
    // ---------------------------------------------------------------------------------
    await tx
      .insert(schema.blogPostsTable)
      .values([
        {
          slug: 'why-ecommerce-businesses-lose-money-on-courier-returns',
          title:
            'The Hidden Drain: Why Growing E-commerce Brands Lose ৳1,00,000+ Monthly on Courier Returns',
          excerpt:
            'Most founders treat courier return costs as an inevitable cost of business. Here is the operational breakdown of preventable vs unpreventable returns.',
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
          seoDescription:
            'Complete breakdown of courier return costs in Bangladesh e-commerce, and how barcode verification stops operational cash leaks.',
          canonicalUrl:
            'https://ecomate.bd/blog/why-ecommerce-businesses-lose-money-on-courier-returns',
          publishedAt: new Date(Date.now() - HOUR * 72),
        },
        {
          slug: 'multi-store-and-showroom-inventory-synchronization',
          title: 'Connecting Showrooms and Online Stores: The Zero-Overselling Blueprint',
          excerpt:
            'How leading lifestyle brands eliminate the nightmare of selling floor stock that online customers simultaneously checked out.',
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
          seoDescription:
            'Step-by-step architecture for synchronizing retail showroom POS registers with online WooCommerce stores in real-time.',
          canonicalUrl:
            'https://ecomate.bd/blog/multi-store-and-showroom-inventory-synchronization',
          publishedAt: new Date(Date.now() - HOUR * 120),
        },
      ])
      .onConflictDoNothing();

    // ---------------------------------------------------------------------------------
    // 8. Media assets — 3 rows, keyed by the unique `key`
    // ---------------------------------------------------------------------------------
    await tx
      .insert(schema.mediaAssetsTable)
      .values([
        {
          key: 'ecomate_logo',
          title: 'EcoMate Brand Logo Slot',
          url: '/assets/ecomate-logo.svg',
          altText: 'EcoMate Platform Logo',
          category: 'logo',
        },
        {
          key: 'hero_preview',
          title: 'Central Operations Console Mockup',
          url: '/assets/hero-console.webp',
          altText: 'EcoMate Central Console Workspace',
          category: 'product_ui',
        },
        {
          key: 'packing_station',
          title: 'Smart Packing Station UI',
          url: '/assets/smart-packing.webp',
          altText: 'Barcode Verification Terminal',
          category: 'product_ui',
        },
      ])
      .onConflictDoNothing();

    // ---------------------------------------------------------------------------------
    // 9. Integration logs — 1 row (audit of the standby License Portal dispatch)
    // ---------------------------------------------------------------------------------
    const existingLog = await tx
      .select({ id: schema.integrationLogsTable.id })
      .from(schema.integrationLogsTable)
      .limit(1);

    if (existingLog.length === 0) {
      await tx.insert(schema.integrationLogsTable).values({
        serviceName: 'LicensePortal',
        action: 'SYNC_LEAD',
        payload: { leadId: 101, name: 'Tanvir Hossain', phone: '01712-849201' },
        response: { message: 'License portal adapter initialized (standby mode).' },
        status: 'Success',
        attempts: 1,
      });
    }

    // ---------------------------------------------------------------------------------
    // 10. Landing content — one row per top-level section key per locale (18 × 2 here),
    //     seeded from the same static object the page falls back to. Idempotent on the
    //     (section_key, locale) unique index, so re-running the seed never duplicates or
    //     overwrites an admin edit.
    // ---------------------------------------------------------------------------------
    for (const locale of ['en', 'bn'] as const) {
      // `LandingContent`'s sections are interface types, which do not carry an implicit
      // index signature; widening once is what makes the key/value iteration typecheck.
      const sections = landingContent[locale] as unknown as Record<string, unknown>;
      for (const [sectionKey, content] of Object.entries(sections)) {
        await tx
          .insert(schema.landingContentTable)
          .values({ sectionKey, locale, content, status: 'published' })
          .onConflictDoNothing();
      }
    }

    // ---------------------------------------------------------------------------------
    // 10b. Legal pages (Task 20 §6) — `legal.privacy` / `legal.terms` per locale.
    //     CMS-editable like every other `landing_content` row; the pages fall back to
    //     `lib/legal.ts` when a row is missing, so keep the two in sync. Copy below is
    //     honest and generic-but-accurate for the actual implementation (lead fields,
    //     consent-gated Pixel/CAPI, 180-day retention, WhatsApp/phone/email contact).
    // ---------------------------------------------------------------------------------
    const legalDocs: { sectionKey: string; locale: 'en' | 'bn'; content: unknown }[] = [
      {
        sectionKey: 'legal.privacy',
        locale: 'en',
        content: {
          title: 'Privacy Policy',
          updated: '2026-10-06',
          intro:
            'This policy explains what personal data EcoMate (“we”) collects, why, and how long we keep it. We collect only what a demo request and follow-up need.',
          sections: [
            {
              heading: 'What we collect',
              body: 'Name, phone number, optional email, daily order volume, your note, source/UTM parameters, IP address, browser user-agent, and the consent record (whether given, when, which policy version). Technical values: _fbp/_fbc cookie values and one event_id — stored only when you accept tracking.',
            },
            {
              heading: 'Consent and tracking',
              body: 'Meta Pixel (browser) and the Conversions API (server) run only after you choose “Accept all”. With “Essential only”, the pixel never loads, no PageView/Lead event fires, and the server skips the CAPI dispatch (recorded as Skipped). The lead-form checkbox is contact consent; tracking consent comes separately from the banner.',
            },
            {
              heading: 'Use and retention',
              body: 'Data is used to answer demo requests, for sales follow-up and operational contact. Lead PII is automatically anonymised after 180 days (live commercial records in Won/Qualified excluded). Expired sessions and credentials are deleted.',
            },
            {
              heading: 'Contact and deletion requests',
              body: 'Reach us anytime: WhatsApp +880 1894-828290, phone +880 1894-828290, email hello@ecomate.app, address Tejgaon I/A, Dhaka 1208. Write in to view, correct or delete your data — we verify and act.',
            },
          ],
        },
      },
      {
        sectionKey: 'legal.privacy',
        locale: 'bn',
        content: {
          title: 'গোপনীয়তা নীতি',
          updated: '2026-10-06',
          intro:
            'EcoMate (“আমরা”) আপনার ব্যক্তিগত তথ্য কীভাবে সংগ্রহ, ব্যবহার ও সংরক্ষণ করে তা এই নীতিতে ব্যাখ্যা করা হয়েছে। আমরা শুধু ডেমো অনুরোধ ও যোগাযোগের জন্য যতটুকু প্রয়োজন ততটুকুই সংগ্রহ করি।',
          sections: [
            {
              heading: 'আমরা কী সংগ্রহ করি',
              body: 'নাম, ফোন নম্বর, ঐচ্ছিক ইমেইল, দৈনিক অর্ডার ভলিউম, আপনার লেখা নোট, উৎস/UTM প্যারামিটার, IP ঠিকানা, ব্রাউজার user-agent, এবং সম্মতির রেকর্ড (সম্মতি দেওয়া হয়েছে কিনা, কখন, কোন নীতি সংস্করণে)। প্রযুক্তিগতভাবে: _fbp/_fbc কুকি মান ও একটি event_id — তবে শুধু ট্র্যাকিংয়ে সম্মতি দিলে।',
            },
            {
              heading: 'সম্মতি ও ট্র্যাকিং',
              body: 'Meta Pixel (ব্রাউজার) ও Conversions API (সার্ভার) শুধু “Accept all” বাছলে চলে। “Essential only” বাছলে পিক্সেল লোড হয় না, PageView/Lead ইভেন্ট পাঠানো হয় না, এবং সার্ভার CAPI ডিসপ্যাচ বাদ দেয় (Skipped হিসেবে রেকর্ড হয়)। লিড ফর্মের চেকবক্স যোগাযোগের সম্মতি; ট্র্যাকিংয়ের সম্মতি ব্যানার থেকে আলাদাভাবে নেওয়া হয়।',
            },
            {
              heading: 'ব্যবহার ও সংরক্ষণ',
              body: 'তথ্য ব্যবহার হয় ডেমো অনুরোধের জবাব, বিক্রয় ফলো-আপ ও অপারেশনাল যোগাযোগে। লিড PII ১৮০ দিন পর স্বয়ংক্রিয়ভাবে anonymise করা হয় (Won/Qualified অবস্থার বাণিজ্যিক রেকর্ড বাদে)। সেশন কুকি ও মেয়াদোত্তীর্ণ প্রমাণপত্র মুছে ফেলা হয়।',
            },
            {
              heading: 'যোগাযোগ ও ডেটা মুছে ফেলা',
              body: 'যেকোনো অনুরোধে: WhatsApp +880 1894-828290, ফোন +880 1894-828290, ইমেইল hello@ecomate.app, ঠিকানা Tejgaon I/A, Dhaka 1208। আপনার তথ্য দেখতে, সংশোধন বা মুছে ফেলতে লিখুন — আমরা যাচাই করে ব্যবস্থা নেব।',
            },
          ],
        },
      },
      {
        sectionKey: 'legal.terms',
        locale: 'en',
        content: {
          title: 'Terms of Service',
          updated: '2026-10-06',
          intro:
            'These are the terms for using this site and sending a demo request. Submitting the form means you agree to them.',
          sections: [
            {
              heading: 'Service',
              body: 'EcoMate provides information about its e-commerce operations platform and a channel to request a demo. Site content is general introduction; pricing, features and availability may change.',
            },
            {
              heading: 'Acceptable use',
              body: 'No false data, no other person’s data, no spam or abusive submissions. Rate limits and human verification (Turnstile) guard against automated abuse.',
            },
            {
              heading: 'Privacy and consent',
              body: 'Personal data is handled under the Privacy Policy. Contact requires the form consent; tracking needs the separate banner consent. No PII is stored and no Meta event is sent without consent.',
            },
            {
              heading: 'Contact',
              body: 'Questions or disputes: WhatsApp +880 1894-828290, phone +880 1894-828290, email hello@ecomate.app.',
            },
          ],
        },
      },
      {
        sectionKey: 'legal.terms',
        locale: 'bn',
        content: {
          title: 'সেবার শর্তাবলী',
          updated: '2026-10-06',
          intro:
            'এই সাইট ব্যবহার ও ডেমো অনুরোধ পাঠানোর শর্ত নিচে দেওয়া হলো। ফর্ম পাঠিয়ে আপনি এই শর্তে সম্মত হন।',
          sections: [
            {
              heading: 'সেবা',
              body: 'EcoMate ই-কমার্স অপারেশন প্ল্যাটফর্মের তথ্য ও ডেমো অনুরোধের মাধ্যম সরবরাহ করে। সাইটের তথ্য সাধারণ পরিচিতির জন্য; মূল্য, ফিচার ও প্রাপ্যতা পরিবর্তন হতে পারে।',
            },
            {
              heading: 'গ্রহণযোগ্য ব্যবহার',
              body: 'ভুয়া তথ্য, অন্যের তথ্য, স্প্যাম বা অপব্যবহারমূলক জমা নিষেধ। স্বয়ংক্রিয় অপব্যবহার রোধে হার-সীমা ও মানব-যাচাই (Turnstile) চলে।',
            },
            {
              heading: 'গোপনীয়তা ও সম্মতি',
              body: 'ব্যক্তিগত তথ্যের ব্যবহার গোপনীয়তা নীতি অনুযায়ী হয়। যোগাযোগের জন্য ফর্মে সম্মতি আবশ্যক; ট্র্যাকিংয়ের জন্য ব্যানারে আলাদা সম্মতি লাগে। সম্মতি ছাড়া PII সংরক্ষণ বা Meta-তে ইভেন্ট পাঠানো হয় না।',
            },
            {
              heading: 'যোগাযোগ',
              body: 'প্রশ্ন বা বিরোধে: WhatsApp +880 1894-828290, ফোন +880 1894-828290, ইমেইল hello@ecomate.app।',
            },
          ],
        },
      },
    ];
    for (const doc of legalDocs) {
      await tx
        .insert(schema.landingContentTable)
        .values({ sectionKey: doc.sectionKey, locale: doc.locale, content: doc.content, status: 'published' })
        .onConflictDoNothing();
    }

    // ---------------------------------------------------------------------------------
    // 11. Social links — the four platforms the prototype footer advertised. Empty URLs
    //     are legitimate (`url` defaults to ''): the row exists so an admin fills it in,
    //     and `is_visible` decides whether it renders.
    // ---------------------------------------------------------------------------------
    await tx
      .insert(schema.socialLinksTable)
      .values([
        { platform: 'facebook', url: '', sortOrder: 1, isVisible: true },
        { platform: 'youtube', url: '', sortOrder: 2, isVisible: true },
        { platform: 'linkedin', url: '', sortOrder: 3, isVisible: true },
        { platform: 'tiktok', url: '', sortOrder: 4, isVisible: false },
      ])
      .onConflictDoNothing();
  });

  console.log('[seed] EcoMate seed complete.');
}

main()
  .catch((error: unknown) => {
    console.error('[seed] failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end({ timeout: 5 });
  });
