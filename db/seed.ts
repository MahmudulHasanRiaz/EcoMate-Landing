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
import { and, eq, isNull, sql } from 'drizzle-orm';
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
        supportEmail: 'hello@ecomate.bd',
        whatsappNumber: '8801894828290',
        messengerUrl: 'https://m.me/ecomate.bd',
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
    // 3. Pricing plans — 3 rows, keyed by the unique `slug`.
    //
    // v3 (fix/landing-redesign-v3): values match the reference mockup
    // (`draft/Main.dc.html` §12): order-volume tiers with two features per
    // plan. Slugs are display-agnostic (no code references them).
    // ---------------------------------------------------------------------------------
    await tx
      .insert(schema.pricingPlansTable)
      .values([
        {
          slug: 'growth',
          nameEn: 'Growth',
          nameBn: 'Growth',
          tierSubtitleEn: '',
          tierSubtitleBn: '',
          monthlyPrice: 6800,
          annualPrice: 6800,
          currency: '৳',
          orderVolume: '10,000 orders/mo',
          usersIncluded: '',
          showroomsIncluded: '',
          featuresEn: [
            'Barcode packing',
            'Courier reconciliation',
          ],
          featuresBn: [
            'বারকোড প্যাকিং',
            'কুরিয়ার রিকনসিলিয়েশন',
          ],
          ctaLabelEn: 'Get started',
          ctaLabelBn: 'শুরু করুন',
          isPopular: true,
          sortOrder: 1,
          isActive: true,
        },
        {
          slug: 'scaling',
          nameEn: 'Scaling',
          nameBn: 'Scaling',
          tierSubtitleEn: '',
          tierSubtitleBn: '',
          monthlyPrice: 12400,
          annualPrice: 12400,
          currency: '৳',
          orderVolume: '40,000 orders/mo',
          usersIncluded: '',
          showroomsIncluded: '',
          featuresEn: [
            'Multi-showroom POS',
            'Meta/TikTok server-side',
          ],
          featuresBn: [
            'মাল্টি-শোরুম POS',
            'Meta/TikTok সার্ভার-সাইড',
          ],
          ctaLabelEn: 'Get started',
          ctaLabelBn: 'শুরু করুন',
          isPopular: true,
          sortOrder: 2,
          isActive: true,
        },
        {
          slug: 'enterprise',
          nameEn: 'Enterprise',
          nameBn: 'Enterprise',
          tierSubtitleEn: '',
          tierSubtitleBn: '',
          monthlyPrice: 22400,
          annualPrice: 22400,
          currency: '৳',
          orderVolume: 'Unlimited orders',
          usersIncluded: '',
          showroomsIncluded: '',
          featuresEn: [
            'Custom integrations',
            'Dedicated support',
          ],
          featuresBn: [
            'কাস্টম ইন্টিগ্রেশন',
            'ডেডিকেটেড সাপোর্ট',
          ],
          ctaLabelEn: 'Talk to us',
          ctaLabelBn: 'কথা বলুন',
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
    //
    // v3 (fix/landing-redesign-v3): short sample stories matching the reference
    // mockup (`draft/Main.dc.html` §11), which labels them sample content to be
    // replaced with real stories via Admin → Testimonials.
    // ---------------------------------------------------------------------------------
    const existingTestimonial = await tx
      .select({ id: schema.testimonialsTable.id })
      .from(schema.testimonialsTable)
      .limit(1);

    if (existingTestimonial.length === 0) {
      await tx.insert(schema.testimonialsTable).values([
        {
          clientName: 'Aranya Apparel',
          clientRole: 'Founder · Fashion',
          companyName: 'Aranya Apparel',
          category: 'Fashion',
          location: 'Dhaka',
          quoteEn:
            'Our packing table no longer argues about which size went out.',
          quoteBn:
            'আমাদের প্যাকিং টেবিলে এখন আর কোন সাইজ গেল তা নিয়ে তর্ক হয় না।',
          websiteUrl: 'aranya-apparel.example',
          logoUrl: '',
          videoUrl: '',
          videoDuration: '02:41',
          videoProvider: 'youtube',
          format: 'text',
          metrics: [],
          sortOrder: 1,
          isPublished: true,
        },
        {
          clientName: 'Meghna Home & Living',
          clientRole: 'Operations Manager · Home',
          companyName: 'Meghna Home & Living',
          category: 'Home',
          location: 'Dhaka',
          quoteEn:
            'Seeing online and showroom stock in one place is our biggest relief.',
          quoteBn:
            'অনলাইন আর শোরুমের স্টক এক জায়গায় দেখতে পাওয়াটাই আমাদের সবচেয়ে বড় স্বস্তি।',
          websiteUrl: 'meghna-living.example',
          logoUrl: '',
          videoUrl: '',
          videoDuration: '02:41',
          videoProvider: 'youtube',
          format: 'text',
          metrics: [],
          sortOrder: 2,
          isPublished: true,
        },
        {
          clientName: 'Tarango Electronics',
          clientRole: 'Head of E-commerce · Electronics',
          companyName: 'Tarango Electronics',
          category: 'Electronics',
          location: 'Nationwide',
          quoteEn:
            'Courier reconciliation is no longer a month-end worry.',
          quoteBn:
            'কুরিয়ারের হিসাব মেলানো এখন আর মাসের শেষের দুশ্চিন্তা না।',
          websiteUrl: 'tarango.example',
          logoUrl: '',
          videoUrl: '',
          videoDuration: '02:41',
          videoProvider: 'youtube',
          format: 'text',
          metrics: [],
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
    // 7a. Blog categories & subcategories (Hierarchical taxonomy)
    // ---------------------------------------------------------------------------------
    const rootCategories = [
      {
        name: 'Logistics & Courier Intelligence',
        nameBn: 'লজিস্টিকস ও কুরিয়ার ইন্টেলিজেন্স',
        slug: 'logistics-courier',
        description: 'Courier performance analytics, return rate reduction, and cash-on-delivery reconciliation across Steadfast, Pathao, and RedX.',
        descriptionBn: 'স্টিডফাস্ট, পাঠাও ও রেডএক্সের পারফরম্যান্স অ্যানালিটিক্স, রিটার্ন রেট কমানো এবং সিওডি রিকনসিলিয়েশন।',
        parentId: null,
        sortOrder: 1,
      },
      {
        name: 'Operations & Fulfillment',
        nameBn: 'অপারেশনস ও ফুলফিলমেন্ট',
        slug: 'operations-fulfillment',
        description: 'Warehouse bin mapping, smart barcode packing workstations, and zero-mispack dispatch operations.',
        descriptionBn: 'ওয়্যারহাউস বিন ম্যাপিং, স্মার্ট বারকোড প্যাকিং ও জিরো-মিসপ্যাক ডেলিভারি অপারেশন।',
        parentId: null,
        sortOrder: 2,
      },
      {
        name: 'Omnichannel & POS',
        nameBn: 'অমনিচ্যানেল ও পিওএস',
        slug: 'omnichannel-pos',
        description: 'Synchronizing retail showroom POS checkout counters with online WooCommerce stores with real-time central stock lock.',
        descriptionBn: 'রিটেল শোরুম পিওএস কাউন্টার এবং অনলাইন উকমার্স স্টোরের রিয়েল-টাইম সেন্ট্রাল স্টক লক।',
        parentId: null,
        sortOrder: 3,
      },
      {
        name: 'Finance & Reconciliation',
        nameBn: 'ফাইন্যান্স ও রিকনসিলিয়েশন',
        slug: 'finance-reconciliation',
        description: 'Automated COD bank statement matching, courier billing audits, and realized cash accounting.',
        descriptionBn: 'অটোমেটেড সিওডি ব্যাংক স্টেটমেন্ট ম্যাচিং, কুরিয়ার বিলিং অডিট এবং রিয়ালাইজড ক্যাশ অ্যাকাউন্টিং।',
        parentId: null,
        sortOrder: 4,
      },
    ];

    const categoryIdBySlug = new Map<string, number>();

    for (const cat of rootCategories) {
      const existing = await tx
        .select({ id: schema.blogCategoriesTable.id })
        .from(schema.blogCategoriesTable)
        .where(eq(schema.blogCategoriesTable.slug, cat.slug))
        .limit(1);

      if (existing.length > 0) {
        categoryIdBySlug.set(cat.slug, existing[0].id);
        await tx
          .update(schema.blogCategoriesTable)
          .set({
            name: cat.name,
            nameBn: cat.nameBn,
            description: cat.description,
            descriptionBn: cat.descriptionBn,
            sortOrder: cat.sortOrder,
            updatedAt: new Date(),
          })
          .where(eq(schema.blogCategoriesTable.id, existing[0].id));
      } else {
        const [inserted] = await tx
          .insert(schema.blogCategoriesTable)
          .values(cat)
          .returning({ id: schema.blogCategoriesTable.id });
        if (inserted) {
          categoryIdBySlug.set(cat.slug, inserted.id);
        }
      }
    }

    const subCategories = [
      {
        name: 'Courier Fraud & Return Defense',
        nameBn: 'কুরিয়ার ফ্রড ও রিটার্ন প্রতিরোধ',
        slug: 'courier-fraud-defense',
        description: 'Pre-dispatch buyer verification, delivery scoring, and fake order blacklisting.',
        descriptionBn: 'প্রি-ডিসপ্যাচ বায়ার ভেরিফিকেশন, ডেলিভারি স্কোরিং এবং ফেক অর্ডার ব্ল্যাকলিস্টিং।',
        parentSlug: 'logistics-courier',
        sortOrder: 1,
      },
      {
        name: 'Smart Packing & Dispatch',
        nameBn: 'স্মার্ট প্যাকিং ও ডিসপ্যাচ',
        slug: 'smart-packing-dispatch',
        description: 'Barcode verification scans, digital bin picking, and automated courier manifest generation.',
        descriptionBn: 'বারকোড ভেরিফিকেশন স্ক্যান, ডিজিটাল বিন পিকিং এবং অটোমেটেড কুরিয়ার ম্যানিফেস্ট।',
        parentSlug: 'operations-fulfillment',
        sortOrder: 2,
      },
    ];

    for (const sub of subCategories) {
      const parentId = categoryIdBySlug.get(sub.parentSlug) ?? null;
      const existing = await tx
        .select({ id: schema.blogCategoriesTable.id })
        .from(schema.blogCategoriesTable)
        .where(eq(schema.blogCategoriesTable.slug, sub.slug))
        .limit(1);

      if (existing.length > 0) {
        categoryIdBySlug.set(sub.slug, existing[0].id);
        await tx
          .update(schema.blogCategoriesTable)
          .set({
            name: sub.name,
            nameBn: sub.nameBn,
            description: sub.description,
            descriptionBn: sub.descriptionBn,
            parentId,
            sortOrder: sub.sortOrder,
            updatedAt: new Date(),
          })
          .where(eq(schema.blogCategoriesTable.id, existing[0].id));
      } else {
        const [inserted] = await tx
          .insert(schema.blogCategoriesTable)
          .values({
            name: sub.name,
            nameBn: sub.nameBn,
            slug: sub.slug,
            description: sub.description,
            descriptionBn: sub.descriptionBn,
            parentId,
            sortOrder: sub.sortOrder,
          })
          .returning({ id: schema.blogCategoriesTable.id });
        if (inserted) {
          categoryIdBySlug.set(sub.slug, inserted.id);
        }
      }
    }

    // ---------------------------------------------------------------------------------
    // 7b. Blog tags (Taxonomy for search and discovery)
    // ---------------------------------------------------------------------------------
    const blogTags = [
      { name: 'Smart Packing', nameBn: 'স্মার্ট প্যাকিং', slug: 'smart-packing', description: 'Barcode-driven packing station workflows', descriptionBn: 'বারকোড-চালিত প্যাকিং স্টেশন ওয়ার্কফ্লো' },
      { name: 'Courier Returns', nameBn: 'কুরিয়ার রিটার্ন', slug: 'courier-returns', description: 'Preventing COD parcel delivery failures', descriptionBn: 'ক্যাশ অন ডেলিভারি পার্সেল ব্যর্থতা প্রতিরোধ' },
      { name: 'COD Reconciliation', nameBn: 'সিওডি রিকনসিলিয়েশন', slug: 'cod-reconciliation', description: 'Automated parcel-level bank matching', descriptionBn: 'অটোমেটেড পার্সেল ব্যাংক হিসাব মেলানো' },
      { name: 'Showroom POS', nameBn: 'শোরুম পিওএস', slug: 'showroom-pos', description: 'Retail physical store checkout counters', descriptionBn: 'রিটেল শোরুম ক্যাশ কাউন্টার' },
      { name: 'Inventory Sync', nameBn: 'ইনভেন্টরি সিঙ্ক', slug: 'inventory-sync', description: 'Real-time multi-channel inventory lock', descriptionBn: 'রিয়েল-টাইম মাল্টি-চ্যানেল স্টক লক' },
      { name: 'Fraud Defense', nameBn: 'ফ্রড ডিফেন্স', slug: 'fraud-defense', description: 'Serial fake buyer blacklisting & score checks', descriptionBn: 'ভুয়া ক্রেতা ব্ল্যাকলিস্টিং ও স্কোর চেক' },
      { name: 'Bangladesh E-commerce', nameBn: 'বাংলাদেশ ই-কমার্স', slug: 'bangladesh-ecommerce', description: 'Operating models tailored for Bangladeshi businesses', descriptionBn: 'বাংলাদেশি ব্যবসার উপযোগী অপারেটিং মডেল' },
      { name: 'Loss Prevention', nameBn: 'ক্ষতি প্রতিরোধ', slug: 'loss-prevention', description: 'Stop profit leaks from operational errors', descriptionBn: 'অপারেশনাল ভুলের কারণে ক্ষতি রোধ' },
      { name: 'Logistics Automation', nameBn: 'লজিস্টিকস অটোমেশন', slug: 'logistics-automation', description: 'Auto-booking, label printing, and tracking', descriptionBn: 'অটো-বুকিং, লেবেল প্রিন্টিং ও ট্র্যাকিং' },
      { name: 'Warehouse Management', nameBn: 'ওয়্যারহাউস ম্যানেজমেন্ট', slug: 'warehouse-management', description: 'Bin mapping, stock audits, and COGS tracking', descriptionBn: 'বিন ম্যাপিং, স্টক অডিট ও ইনভেন্টরি ট্র্যাকিং' },
    ];

    for (const tag of blogTags) {
      const existing = await tx
        .select({ id: schema.blogTagsTable.id })
        .from(schema.blogTagsTable)
        .where(eq(schema.blogTagsTable.slug, tag.slug))
        .limit(1);

      if (existing.length === 0) {
        await tx.insert(schema.blogTagsTable).values(tag);
      } else {
        await tx
          .update(schema.blogTagsTable)
          .set({ name: tag.name, nameBn: tag.nameBn, description: tag.description, descriptionBn: tag.descriptionBn })
          .where(eq(schema.blogTagsTable.id, existing[0].id));
      }
    }

    // ---------------------------------------------------------------------------------
    // 7c. Blog posts — 6 varied posts covering all media combinations:
    //     1. Thumbnail image only + writeup
    //     2. Thumbnail image + image gallery + writeup
    //     3. Video only (no thumbnail image) + writeup
    //     4. Thumbnail image + video embed + writeup
    //     5. Thumbnail image + video embed + image gallery + writeup (full multimedia suite)
    //     6. Thumbnail image + deep analytical guide + writeup
    // ---------------------------------------------------------------------------------
    const blogPosts = [
      {
        slug: 'why-ecommerce-businesses-lose-money-on-courier-returns',
        title:
          'The Hidden Drain: Why Growing E-commerce Brands Lose ৳1,00,000+ Monthly on Courier Returns',
        titleBn: 'কুরিয়ার রিটার্নের নীরব ক্ষতি: কেন প্রতি মাসে ১,০০,০০০+ টাকা অপচয় হয় এবং তা বন্ধের উপায়',
        excerpt:
          'Most founders treat courier return costs as an inevitable cost of business. Here is the operational breakdown of preventable vs unpreventable returns in Bangladesh.',
        excerptBn: 'অধিকাংশ ই-কমার্স উদ্যোক্তা কুরিয়ার রিটার্নকে ব্যবসার সাধারণ ক্ষতি হিসেবে মেনে নেন। জেনে নিন প্রতিরোধযোগ্য বনাম অপরিহার্য রিটার্নের নিখুঁত হিসাব ও সমাধান।',
        content: `When an e-commerce business in Bangladesh processes 300 to 800 orders daily, Cash on Delivery (COD) return rates can quietly drain 15% to 25% of gross operational profit.

### The Two Types of Courier Returns
1. **Unpreventable Returns**: Customer genuine emergencies, travel, or change of mind at doorstep.
2. **Preventable Operational Returns**:
   - Dispatch of wrong size or color (100% preventable via barcode verification).
   - Delivery to impulsive fake buyers with proven serial return history across Steadfast or Pathao networks.
   - Dispatch delays caused by warehouse bin confusion.

### How Much Does a Preventable Return Really Cost?
- Forward delivery charge: **৳130**
- Return transit penalty: **৳70**
- Packaging materials wasted: **৳40**
- Locked capital holding cost: **৳150**
- **Total Direct Loss:** **৳390 to ৳450 per mistake**

When 10 orders per day suffer preventable issues, that is **৳1,20,000 in direct cash drain every month**. EcoMate's smart packing workstation and pre-dispatch fraud verification turn this loss back into net realized margin.`,
        contentBn: `বাংলাদেশে একটি ই-কমার্স প্রতিষ্ঠান যখন দৈনিক ৩০০ থেকে ৮০০ অর্ডার প্রসেস করে, তখন ক্যাশ অন ডেলিভারি (COD) রিটার্নের কারণে গ্রস প্রফিটের ১৫% থেকে ২৫% হারিয়ে যেতে পারে।

### কুরিয়ার রিটার্নের দুটি প্রধান ধরন
১. **অপরিহার্য রিটার্ন (Unpreventable Returns)**: গ্রাহকের জরুরি কোনো সমস্যা, ভ্রমণ, বা দরজায় পৌঁছে সিদ্ধান্ত পরিবর্তন।
২. **প্রতিরোধযোগ্য অপারেশনাল রিটার্ন (Preventable Operational Returns)**:
   - ভুল সাইজ বা রঙের পণ্য ডেলিভারি দেওয়া (বারকোড ভেরিফিকেশনের মাধ্যমে ১০০% প্রতিরোধযোগ্য)।
   - ভুয়া ও ফেক বায়ারদের কাছে পার্সেল পাঠানো যাদের অতীতে একাধিকবার রিটার্নের রেকর্ড রয়েছে।
   - ওয়্যারহাউস বিনের বিভ্রান্তির কারণে ডিসপ্যাচে অনাকাঙ্ক্ষিত দেরি হওয়া।

### একটি প্রতিরোধযোগ্য রিটার্নে প্রকৃতপক্ষে কত টাকা ক্ষতি হয়?
- ফরওয়ার্ড ডেলিভারি চার্জ: **৳১৩০**
- রিটার্ন ট্রানজিট চার্জ: **৳৭০**
- প্যাকেজিং ম্যাটেরিয়াল ও ব্যাগের ক্ষতি: **৳৪০**
- আটকে থাকা ক্যাপিটাল ও ইনভেন্টরি কস্ট: **৳১৫০**
- **মোট প্রত্যক্ষ ক্ষতি:** **প্রতি ভুলের জন্য ৳৩৯০ থেকে ৳৪৫০**

যদি প্রতিদিন গড়ে ১০টি অর্ডারেও এই প্রতিরোধযোগ্য সমস্যা হয়, তবে মাসে **১,২০,০০০ টাকারও বেশি নগদ ক্যাশ ক্ষতি** হয়। EcoMate-এর স্মার্ট প্যাকিং ওয়ার্কস্টেশন ও প্রি-ডিসপ্যাচ ফ্রড ভেরিফিকেশন এই ক্ষতি বন্ধ করে নেট প্রফিট নিশ্চিত করে।`,
        author: 'EcoMate Operations Research',
        category: 'Logistics & Courier Intelligence',
        categoryId: categoryIdBySlug.get('courier-fraud-defense') ?? categoryIdBySlug.get('logistics-courier') ?? null,
        tags: ['courier-returns', 'cod-reconciliation', 'bangladesh-ecommerce', 'loss-prevention'],
        featuredImageUrl:
          'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
        videoUrl: '',
        galleryUrls: [],
        readTime: '6 min read',
        status: 'published',
        seoTitle: 'Why E-commerce Brands Lose Money on Courier Returns | EcoMate Guide',
        seoTitleBn: 'কুরিয়ার রিটার্ন ক্ষতি রোধের উপায় | EcoMate ই-কমার্স গাইড',
        seoDescription:
          'Complete breakdown of courier return costs in Bangladesh e-commerce, and how barcode verification stops operational cash leaks.',
        seoDescriptionBn: 'বাংলাদেশে ই-কমার্স ব্যবসায় কুরিয়ার রিটার্ন কেন হয় এবং বারকোড ভেরিফিকেশন ও স্মার্ট প্যাকিং দিয়ে কীভাবে এই নগদ অপচয় বন্ধ করবেন।',
        canonicalUrl:
          'https://ecomate.bd/blog/why-ecommerce-businesses-lose-money-on-courier-returns',
        publishedAt: new Date(Date.now() - HOUR * 72),
      },
      {
        slug: 'inside-modern-high-volume-dispatch-station-bin-maps',
        title:
          'Inside the Modern High-Volume Dispatch Station: Bin Maps, Barcode Verification, and Zero-Mispack Flow',
        titleBn: 'হাই-ভলিউম ডিসপ্যাচ স্টেশনের অভ্যন্তরীণ রূপ: বিন ম্যাপিং, বারকোড ভেরিফিকেশন ও জিরো-মিসপ্যাক পদ্ধতি',
        excerpt:
          'How top fashion and electronics brands in Dhaka process 1,200+ parcels daily with zero picking mistakes using structured bin maps and barcode lock stations.',
        excerptBn: 'ঢাকায় শীর্ষ ফ্যাশন ও গ্যাজেট ব্র্যান্ডগুলো কীভাবে বিন ম্যাপিং এবং বারকোড লক ব্যবহার করে প্রতিদিন ১,২০০+ পার্সেল কোনো ধরনের প্যাকিং ভুল ছাড়াই ডেলিভারি করে।',
        content: `In a high-paced fulfillment warehouse handling 1,000+ parcels a day, chaos is the default state unless every physical movement is governed by software.

### The Problem With Paper Picklists
Traditional Bangladeshi e-commerce warehouses hand pickers long paper sheets. Pickers wander through rows of unmapped racks, search for sizes by eye, and bring piles to the packing table. 

This results in:
- Up to 8% mispack rate (wrong color, wrong SKU, or missing bonus gift).
- Packers wasting 45 seconds per parcel trying to read handwriting.
- Frequent inventory discrepancies between physical shelves and online stock.

### The Three Pillars of a Zero-Mispack Dispatch Station

#### 1. Digital Bin Mapping (A-Z Racks with Numbered Bins)
Every single item has a home. When a product is received, it is scanned into a bin (e.g., \`Bin B-04-A\`). When an order is released for batch picking, the mobile app creates the shortest walking path through the warehouse.

#### 2. The Barcode Scan Lock
At the packing station, no shipping label can be printed until the packer physically scans:
1. The invoice barcode.
2. The exact barcode on each item inside the box.

If a picker mistakenly brought an "L" instead of an "M", the terminal buzzes with a red alert and locks the label printer. It is physically impossible to pack the wrong item.

#### 3. Instant Courier Manifest Handover
Once the parcel is sealed, EcoMate auto-generates the manifest for Steadfast, Pathao, or RedX. The courier rider signs one consolidated digital sheet, and tracking SMS is automatically queued to the customer.`,
        contentBn: `দৈনিক ১,০০০+ পার্সেল হ্যান্ডেল করা একটি ব্যস্ত ওয়্যারহাউসে সঠিক সফটওয়্যার ও প্রসেস না থাকলে চরম বিশৃঙ্খলা সৃষ্টি হওয়া স্বাভাবিক।

### কাগজের পিকলিস্ট ব্যবহারের সমস্যা
ঐতিহ্যবাহী ওয়্যারহাউসে পিকারদের হাতে লম্বা কাগজের শিট ধরিয়ে দেওয়া হয়। পিকাররা এলোমেলো তাকের মাঝে ঘুরে বেড়ায়, খালি চোখে সাইজ খোঁজে এবং প্যাকিং টেবিলে এনে স্তূপ করে।

এর ফলে:
- ৮% পর্যন্ত মিসপ্যাক বা ভুল প্যাকিংয়ের হার (ভুল রঙ, ভুল সাইজ বা বোনাস আইটেম বাদ পড়া)।
- হাতের লেখা বুঝতে গিয়ে প্যাকাররা প্রতি পার্সেলে অতিরিক্ত ৪৫ সেকেন্ড সময় নষ্ট করে।
- ফিজিক্যাল শেলফ এবং অনলাইন স্টকের মধ্যে অমিল তৈরি হয়।

### জিরো-মিসপ্যাক ডিসপ্যাচ স্টেশনের তিনটি স্তম্ভ

#### ১. ডিজিটাল বিন ম্যাপিং (Numbered Bins)
প্রতিটি পণ্যের জন্য নির্দিষ্ট বিন বরাদ্দ থাকে (যেমন: \`Bin B-04-A\`)। ব্যাচ পিকিংয়ের সময় মোবাইল অ্যাপ ওয়্যারহাউসের সবচেয়ে ছোট হাঁটার পথ নির্দেশ করে।

#### ২. বারকোড স্ক্যান লক সিস্টেম
প্যাকিং স্টেশনে কোনো প্রিন্টার শিপিং লেবেল প্রিন্ট করতে পারবে না যতক্ষণ না প্যাকার স্ক্যান করে:
১. ইনভয়েসের বারকোড।
২. বক্সের ভেতরের প্রতিটি পণ্যের আসল বারকোড।

যদি পিকার ভুলবশত "M" এর বদলে "L" সাইজ নিয়ে আসে, সিস্টেম সাথে সাথে লাল সতর্কবার্তা দিয়ে প্রিন্টার লক করে দেয়। ফলে ভুল পণ্য প্যাক করা অসম্ভব।

#### ৩. তাৎক্ষণিক কুরিয়ার ম্যানিফেস্ট হ্যান্ডওভার
পার্সেল সিল হওয়ার সাথে সাথে স্টিডফাস্ট, পাঠাও বা রেডএক্সের ডিজিটাল ম্যানিফেস্ট স্বয়ংক্রিয়ভাবে তৈরি হয় এবং গ্রাহকের কাছে ট্র্যাকিং এসএমএস চলে যায়।`,
        author: 'EcoMate Fulfillment Team',
        category: 'Operations & Fulfillment',
        categoryId: categoryIdBySlug.get('smart-packing-dispatch') ?? categoryIdBySlug.get('operations-fulfillment') ?? null,
        tags: ['smart-packing', 'warehouse-management', 'loss-prevention', 'bangladesh-ecommerce'],
        featuredImageUrl:
          'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1200&q=80',
        videoUrl: '',
        galleryUrls: [
          'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=1200&q=80',
        ],
        readTime: '7 min read',
        status: 'published',
        seoTitle: 'Inside High-Volume E-commerce Dispatch Stations | EcoMate Operational Guide',
        seoTitleBn: 'আধুনিক ওয়্যারহাউস ডিসপ্যাচ স্টেশন ও বিন ম্যাপিং গাইড | EcoMate',
        seoDescription:
          'Explore the architecture of modern packing stations with bin mapping, barcode scan locks, and automated courier manifest generation.',
        seoDescriptionBn: 'ডিজিটাল বিন ম্যাপিং, বারকোড স্ক্যান লক এবং অটোমেটেড কুরিয়ার ম্যানিফেস্টের মাধ্যমে জিরো-মিসপ্যাক ডেলিভারি নিশ্চিত করার কৌশল।',
        canonicalUrl:
          'https://ecomate.bd/blog/inside-modern-high-volume-dispatch-station-bin-maps',
        publishedAt: new Date(Date.now() - HOUR * 48),
      },
      {
        slug: 'automated-cod-courier-reconciliation-video-walkthrough',
        title: 'Video Walkthrough: Automated COD Courier Reconciliation vs. Bank Deposits',
        titleBn: 'ভিডিও ওয়াকথ্রু: অটোমেটেড কুরিয়ার COD রিকনসিলিয়েশন বনাম ব্যাংক ডিপোজিট অডিট',
        excerpt:
          'Stop spending 3 days every month manually matching courier spreadsheets with bank statements. Watch how parcel-level reconciliation identifies hidden deductions instantly.',
        excerptBn: 'কুরিয়ার স্প্রেডশিট আর ব্যাংক স্টেটমেন্ট মেলাতে প্রতি মাসে ৩ দিন সময় নষ্ট বন্ধ করুন। দেখুন কীভাবে পার্সেল-লেভেল রিকনসিলিয়েশন সকল গোপন চার্জ বের করে আনে।',
        content: `Reconciling courier Cash on Delivery (COD) payments against bank deposits is notoriously one of the most painful tasks in Bangladeshi e-commerce.

### The Hidden Deductions in Courier Statements
Couriers provide weekly payout statements containing thousands of transactions. Buried inside these statements are:
- Weight discrepancies (where a 0.5kg parcel was billed as 1.5kg).
- COD collection commissions (typically 1%).
- Return handling charges.
- Delayed payment cycles where money remains floating for days.

### How Manual Excel Checking Fails
Most merchants rely on junior accountants manually cross-checking Excel sheets against bank SMS alerts. This process:
- Takes 2 to 4 full workdays every single month.
- Misses subtle weight overcharges that silently cost ৳20,000 to ৳50,000 monthly.
- Leaves unverified parcels in limbo when couriers report them as "delivered" but the cash never arrives in the bank account.

### Automated Parcel-by-Parcel Reconciliation
EcoMate ingests the courier statement CSV directly or pulls transaction logs via courier API, comparing every parcel against its recorded consignment:
1. **Immediate Discrepancy Flagging**: Any parcel with unexpected weight charges is highlighted for dispute.
2. **Bank Statement Matching**: Matches courier payout batch IDs against actual bank deposits.
3. **Automated Ledger Posting**: Credits Cash-in-Transit and debits Bank Accounts with zero manual data entry.`,
        contentBn: `কুরিয়ার ক্যাশ অন ডেলিভারি (COD) পেমেন্ট ব্যাংক ডিপোজিটের সাথে মেলানো বাংলাদেশের ই-কমার্স উদ্যোক্তাদের অন্যতম বড় জটিলতা।

### কুরিয়ার স্টেটমেন্টে লুকানো বাড়তি চার্জ
কুরিয়ারগুলো সাপ্তাহিক পেআউট স্টেটমেন্ট দেয় যাতে হাজার হাজার লেনদেন থাকে। এই স্টেটমেন্টের ভেতরে প্রায়ই থাকে:
- ওজনের গরমিল (০.৫ কেজি পার্সেলকে ১.৫ কেজি হিসেবে বিল করা)।
- সিওডি কালেকশন কমিশন (সাধারণত ১%)।
- রিটার্ন হ্যান্ডলিং চার্জ।
- দীর্ঘ পেমেন্ট সাইকেল যেখানে টাকা দিনের পর দিন আটকে থাকে।

### এক্সেল দিয়ে ম্যানুয়ালি মেলানোর সীমাবদ্ধতা
- প্রতি মাসে ২ থেকে ৪ কর্মদিবস সময় নষ্ট হয়।
- ছোটখাটো ওজনের বাড়তি চার্জ নজরে আসে না যা মাসে ২০,০০০ থেকে ৫০,০০০ টাকা ক্ষতি করে।
- যে পার্সেলগুলো কুরিয়ার ডেলিভার্ড দেখিয়েছে অথচ ব্যাংকে টাকা ঢোকেনি, সেগুলো শনাক্ত করা যায় না।

### স্বয়ংক্রিয় পার্সেল-বাই-পার্সেল রিকনসিলিয়েশন
EcoMate সরাসরি কুরিয়ার স্টেটমেন্ট বা API ডেটা টেনে নিয়ে প্রতিটি পার্সেল অডিট করে:
১. **তাৎক্ষণিক অমিল শনাক্তকরণ**: বাড়তি ওজনের চার্জ থাকা পার্সেলগুলো ডিসপিউটের জন্য চিহ্নিত হয়।
২. **ব্যাংক স্টেটমেন্ট ম্যাচিং**: কুরিয়ার পেআউট ব্যাচ আইডির সাথে ব্যাংকে জমা হওয়া টাকার সঠিক মিল নিশ্চিত করে।
৩. **অটোমেটেড লেজার পোস্টিং**: কোনো ম্যানুয়াল এন্ট্রি ছাড়াই ক্যাশ-ইন-ট্রানজিট এবং ব্যাংক অ্যাকাউন্ট আপডেট হয়।`,
        author: 'EcoMate Finance Systems',
        category: 'Finance & Reconciliation',
        categoryId: categoryIdBySlug.get('finance-reconciliation') ?? null,
        tags: ['cod-reconciliation', 'finance-reconciliation', 'bangladesh-ecommerce', 'logistics-automation'],
        featuredImageUrl: '',
        videoUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
        galleryUrls: [],
        readTime: '4 min watch & read',
        status: 'published',
        seoTitle: 'Automated COD Courier Reconciliation Walkthrough | EcoMate Video',
        seoTitleBn: 'অটোমেটেড কুরিয়ার সিওডি রিকনসিলিয়েশন ভিডিও গাইড | EcoMate',
        seoDescription:
          'Watch how automated courier reconciliation reconciles Steadfast, Pathao, and RedX statements against bank deposits in under 15 minutes.',
        seoDescriptionBn: 'স্টিডফাস্ট, পাঠাও ও রেডএক্সের স্টেটমেন্ট মাত্র ১৫ মিনিটে ব্যাংক ডিপোজিটের সাথে নিখুঁতভাবে মেলানোর ভিডিও ওয়াকথ্রু।',
        canonicalUrl:
          'https://ecomate.bd/blog/automated-cod-courier-reconciliation-video-walkthrough',
        publishedAt: new Date(Date.now() - HOUR * 36),
      },
      {
        slug: 'multi-store-and-showroom-inventory-synchronization',
        title: 'Connecting Showrooms and Online Stores: The Zero-Overselling Blueprint',
        titleBn: 'শোরুম এবং অনলাইন শপের সংযোগ: ওভারসেলিং বন্ধের আধুনিক ব্লুপ্রিন্ট',
        excerpt:
          'How leading lifestyle brands eliminate the nightmare of selling floor stock that online customers simultaneously checked out.',
        excerptBn: 'কীভাবে শীর্ষস্থানীয় লাইফস্টাইল ব্র্যান্ডগুলো ডিসকানেক্টেড স্টক সমস্যার অবসান ঘটিয়ে একই সাথে শোরুম এবং অনলাইনে সঠিক স্টক বিক্রি নিশ্চিত করে।',
        content: `Retailers expanding from online to physical showrooms face immediate stock desynchronization if floor registers operate on disconnected POS software.

### The Double-Selling Crisis
Imagine this common scenario:
- Your last premium leather jacket (Size XL) is displayed on the mannequin in your Banani showroom.
- At 3:15 PM, an online customer orders that exact jacket on your website.
- At 3:20 PM, a walk-in customer in Banani buys the jacket and pays at the counter.

When your warehouse team goes to pack the online order, the jacket is gone. You are forced to call the customer, apologize, issue a refund, or cancel the order. This damages brand reputation and wastes customer acquisition cost.

### The Real-Time Central Inventory Lock
EcoMate bridges the gap between showroom POS terminals and online sales channels:
1. **Millisecond Stock Reservation**: The moment an item barcode is scanned at the showroom cash counter, central stock is decremented immediately across WooCommerce, Shopify, and marketplace feeds.
2. **Cross-Branch Stock Visibility**: If a customer in Dhanmondi asks for a size not on the floor, the cashier sees instantly that 2 units exist in Banani and 5 in the Tejgaon central warehouse.
3. **Split Payment Processing**: Native support for Cash, bKash, and Card payments in a single transaction with automatic daily register reconciliation.`,
        contentBn: `অনলাইন থেকে ফিজিক্যাল শোরুমে ব্যবসা সম্প্রসারণকারী ব্র্যান্ডগুলো তাৎক্ষণিক স্টক অমিলের মুখোমুখি হয় যদি শোরুমের পিওএস সফটওয়্যার কেন্দ্রীয় সিস্টেমের সাথে যুক্ত না থাকে।

### ডাবল-সেলিং সংকট
এই সাধারণ দৃশ্যটি কল্পনা করুন:
- আপনার প্রিমিয়াম লেদার জ্যাকেটের (Size XL) শেষ ইউনিটটি বনানী শোরুমের ম্যানিকুইনে ডিসপ্লে করা আছে।
- দুপুর ৩:১৫ মিনিটে একজন অনলাইন ক্রেতা আপনার ওয়েবসাইটে অর্ডার করেন।
- দুপুর ৩:২০ মিনিটে বনানী শোরুমের এক ক্রেতা এসে ক্যাশ কাউন্টারে দাম পরিশোধ করে জ্যাকেটটি নিয়ে যান।

অনলাইন অর্ডারটি প্যাক করতে গিয়ে ওয়্যারহাউস টিম দেখে পণ্য নেই! বাধ্য হয়ে গ্রাহককে ফোন করে ক্ষমা চাইতে হয় বা অর্ডার বাতিল করতে হয়।

### রিয়েল-টাইম সেন্ট্রাল ইনভেন্টরি লক
EcoMate শোরুমের পিওএস টার্মিনাল এবং অনলাইন বিক্রয় চ্যানেলের মধ্যে সংযোগ তৈরি করে:
১. **মিলিসেকেন্ড স্টক রিজার্ভেশন**: শোরুম কাউন্টারে বারকোড স্ক্যান হওয়া মাত্রই উকমার্স বা শপিফাইয়ে কেন্দ্রীয় স্টক কমে যায়।
২. **ক্রস-ব্রাঞ্চ স্টক ভিজিবিলিটি**: ধানমন্ডি শোরুমের কাস্টমার যে সাইজ চাচ্ছে তা না থাকলে ক্যাশিয়ার সাথে সাথে দেখতে পায় বনানীতে ২টি ও তেজগাঁও সেন্ট্রাল ওয়্যারহাউসে ৫টি ইউনিট রয়েছে।
৩. **স্প্লিট পেমেন্ট প্রসেসিং**: এক লেনদেনেই ক্যাশ, বিকাশ এবং কার্ড পেমেন্টের সুবিধা এবং দিনের শেষে অটোমেটেড রেজিস্টার মেলানো।`,
        author: 'EcoMate Engineering Team',
        category: 'Omnichannel & POS',
        categoryId: categoryIdBySlug.get('omnichannel-pos') ?? null,
        tags: ['showroom-pos', 'inventory-sync', 'bangladesh-ecommerce', 'omnichannel-pos'],
        featuredImageUrl:
          'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
        videoUrl: 'https://www.youtube.com/watch?v=7wtfhZwyrcc',
        galleryUrls: [],
        readTime: '5 min read',
        status: 'published',
        seoTitle: 'Connecting Showrooms and Online Stores — Zero-Overselling Blueprint',
        seoTitleBn: 'শোরুম ও অনলাইন ইনভেন্টরি সিনক্রোনাইজেশন ব্লুপ্রিন্ট | EcoMate',
        seoDescription:
          'Step-by-step architecture for synchronizing retail showroom POS registers with online WooCommerce stores in real-time.',
        seoDescriptionBn: 'রিটেল শোরুমের পিওএস এবং অনলাইন ই-কমার্স স্টোরের ইনভেন্টরি রিয়েল-টাইমে মেলানোর বিস্তারিত প্রযুক্তিগত আর্কিটেকচার।',
        canonicalUrl:
          'https://ecomate.bd/blog/multi-store-and-showroom-inventory-synchronization',
        publishedAt: new Date(Date.now() - HOUR * 120),
      },
      {
        slug: 'complete-ecommerce-fulfillment-blueprint-order-to-cash',
        title:
          'The Complete Order-to-Cash Blueprint: Scaled Fulfillment Architecture for 500+ Orders Daily',
        titleBn: 'অর্ডার-টু-ক্যাশ পূর্ণাঙ্গ ব্লুপ্রিন্ট: দৈনিক ৫০০+ অর্ডারের স্বয়ংক্রিয় ফুলফিলমেন্ট সিস্টেম',
        excerpt:
          'From pre-dispatch customer risk checks to automated courier manifest generation and bank reconciliation — the complete step-by-step operational pipeline.',
        excerptBn: 'অর্ডার নেওয়ার পর রিস্ক স্কোরিং থেকে শুরু করে বারকোড প্যাকিং, স্বয়ংক্রিয় কুরিয়ার রাউটিং এবং ব্যাংক রিকনসিলিয়েশন — ধাপে ধাপে সম্পূর্ণ অপারেশনাল গাইড।',
        content: `Processing 500+ orders a day requires more than just marketing spend; it requires an airtight operational system that connects advertising spend directly to verified cash in the bank.

### Step 1: Pre-Dispatch Buyer Verification & Risk Scoring
Not every order placed on Cash on Delivery should be shipped blindly. EcoMate calculates an instant Delivery Success Score based on nationwide delivery histories:
- **Score > 85%**: Auto-approved for instant priority packing.
- **Score 50% - 85%**: Flagged for confirmation call or WhatsApp OTP verification.
- **Score < 50%**: Requires partial advance delivery fee payment via bKash to protect capital.

### Step 2: Intelligent Multi-Courier Routing
Instead of relying on a single courier, EcoMate dynamically routes parcels:
- Fastest metropolitan delivery (Same-day Dhaka) -> Routed to Pathao.
- Highest national delivery success rate for rural districts -> Routed to Steadfast.
- Bulky and heavy freight -> Routed to specialized line-haul carriers.

### Step 3: Barcode-Verified Assembly & Weighing
Every parcel passes through an inspection scale. Barcode scan confirms correct SKUs, while integrated digital scale records exact gross weight before label generation. This prevents courier weight disputes before they can happen.

### Step 4: Live Telemetry & Automated SMS Delivery Alerts
Customers receive automated branded SMS notifications at key milestones:
1. Parcel dispatched with live tracking URL.
2. Parcel out for delivery with rider contact details.
3. Automated delivery confirmation.

### Step 5: Post-Delivery COD Bank Reconciliation
When the courier remits funds, every consignment is automatically matched to the bank deposit statement down to the last taka.`,
        contentBn: `প্রতিদিন ৫০০+ অর্ডার সফলভাবে ডেলিভারি ও ক্যাশ কালেকশন করার জন্য প্রয়োজন একটি নিখুঁত অপারেশনাল ফ্রেমওয়ার্ক।

### ধাপ ১: প্রি-ডিসপ্যাচ বায়ার ভেরিফিকেশন ও রিস্ক স্কোরিং
ক্যাশ অন ডেলিভারিতে আসা প্রতিটি অর্ডার অন্ধভাবে পাঠানো উচিত নয়। EcoMate দেশব্যাপী ইতিহাস বিশ্লেষণ করে সাকসেস স্কোর প্রদান করে:
- **স্কোর > ৮৫%**: স্বয়ংক্রিয়ভাবে অনুমোদিত ও প্রায়োরিটি প্যাকিং।
- **স্কোর ৫০% - ৮৫%**: কনফার্মেশন কল বা হোয়াটসঅ্যাপ ওটিপি দিয়ে ভেরিফিকেশন।
- **স্কোর < ৫০%**: ডেলিভারি চার্জ বিকাশ অগ্রিম নেওয়ার নির্দেশনা।

### ধাপ ২: ইন্টেলিজেন্ট মাল্টি-কুরিয়ার রাউটিং
একটি কুরিয়ারের ওপর নির্ভরশীল না হয়ে EcoMate স্মার্টলি রুট করে:
- দ্রুততম মেট্রোপলিটন ডেলিভারি (ঢাকার মধ্যে সেম-ডে) -> পাঠাও।
- প্রত্যন্ত জেলাগুলোতে সর্বোচ্চ সফলতার হার -> স্টিডফাস্ট।
- ভারী ও বড় পার্সেল -> বিশেষায়িত কার্গো লাইন।

### ধাপ ৩: বারকোড-যাচাইকৃত প্যাকিং ও ওজন রেকর্ড
প্রতিটি পার্সেল ডিজিটাল স্কেলের ওপর দিয়ে যায়। বারকোড সঠিক পণ্য নিশ্চিত করে এবং ওজন রেকর্ড হয়, যা কুরিয়ারের অতিরিক্ত ওজন চার্জের দাবি আটকে দেয়।

### ধাপ ৪: অটোমেটেড এসএমএস ট্র্যাকিং অ্যালার্ট
১. পার্সেল বের হওয়ার পর লাইভ ট্র্যাকিং লিংকসহ এসএমএস।
২. ডেলিভারি রাইডারের কন্টাক্টসহ ডেলিভারির দিনে এসএমএস।
৩. ডেলিভারি সফল হওয়ার পর ধন্যবাদ বার্তা।

### ধাপ ৫: ডেলিভারি পরবর্তী ব্যাংক অডিট
কুরিয়ার পেমেন্ট দেওয়ার সাথে সাথে প্রতিটি অর্ডার ব্যাংকে জমা টাকার সাথে পাই টু পাই মিলে যায়।`,
        author: 'EcoMate Architecture Group',
        category: 'Operations & Fulfillment',
        categoryId: categoryIdBySlug.get('operations-fulfillment') ?? null,
        tags: ['logistics-automation', 'smart-packing', 'cod-reconciliation', 'bangladesh-ecommerce', 'loss-prevention'],
        featuredImageUrl:
          'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=1200&q=80',
        videoUrl: 'https://www.youtube.com/watch?v=L_LUpnjgPso',
        galleryUrls: [
          'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=1200&q=80',
        ],
        readTime: '9 min deep dive',
        status: 'published',
        seoTitle: 'The Complete E-commerce Fulfillment Pipeline | EcoMate Master Guide',
        seoTitleBn: 'ই-কমার্স ফুলফিলমেন্ট পূর্ণাঙ্গ মাস্টার গাইড | EcoMate',
        seoDescription:
          'Master the 7-step fulfillment architecture designed for scaling Bangladeshi brands: fraud screening, barcode packing, auto-routing, and bank audit.',
        seoDescriptionBn: 'দৈনিক ৫০০+ অর্ডার ডেলিভারি করা ব্র্যান্ডগুলোর জন্য ৭-ধাপের ফ্রড স্ক্রিনিং, বারকোড প্যাকিং, অটো-রাউটিং ও ব্যাংক অডিট ব্লুপ্রিন্ট।',
        canonicalUrl:
          'https://ecomate.bd/blog/complete-ecommerce-fulfillment-blueprint-order-to-cash',
        publishedAt: new Date(Date.now() - HOUR * 24),
      },
      {
        slug: 'stop-burning-ad-budget-server-side-meta-capi-bangladesh',
        title:
          'Stop Scaling Ads on Phantom Clicks: Why Server-Side Meta CAPI and Realized ROAS Matter',
        titleBn: 'অদৃশ্য ক্লিকে বিজ্ঞাপনের বাজেট অপচয় বন্ধ করুন: মেটা সার্ভার-সাইড CAPI ও রিয়ালাইজড ROAS',
        excerpt:
          'Browser pixel drops up to 35% of events due to iOS restrictions and network timeouts in Bangladesh. Learn how server-side Conversions API matches ad spend to actual delivered cash.',
        excerptBn: 'ব্রাউজার পিক্সেল আইওএস বিধিনিষেধ ও নেটওয়ার্ক সমস্যার কারণে ৩৫% পর্যন্ত ইভেন্ট মিস করে। জানুন কীভাবে সার্ভার-সাইড কনভার্সন এপিআই প্রকৃত ডেলিভারি করা টাকার হিসাব দেয়।',
        content: `Most Bangladeshi e-commerce founders look at their Meta Ads Manager and celebrate a reported ROAS of 6.5x. But when they check their bank account at the end of the month, the net profit simply is not there.

### The Illusion of Browser Pixel Tracking
Browser-based Meta pixels face severe data loss:
- iOS 14.5+ App Tracking Transparency and Safari ITP block browser cookies.
- Ad blockers drop between 20% and 35% of conversion events.
- Spotty mobile network connections in Bangladesh cause frontend tracking scripts to timeout before the "Thank You" page finishes loading.

More importantly: **The browser pixel counts every "Order Placed" button click as a purchase**, regardless of whether the buyer ever receives the parcel or pays for it.

### What Happens With High Return Rates?
If you generate 100 orders with a browser ROAS of 6x:
- 25 orders are fake or refused at the door.
- 5 orders are returned due to wrong sizes.
- **Result**: You paid ad spend on 100 orders, but only collected cash on 70. Your real cash ROAS is drastically lower than what Facebook reports.

### The Power of Meta Conversions API (CAPI) Tied to Delivered Cash
EcoMate implements server-side Conversions API paired with courier delivery telemetry:
1. **Deduplicated Server Events**: Events are sent directly from the server with persistent event IDs, completely bypassing ad-blockers and browser drop-offs.
2. **Delivered Parcel Optimization**: You can train your ad algorithms to optimize for actual delivered and collected parcels, rather than empty clicks.
3. **Net Cash Realized ROAS**: View accurate marketing dashboards showing exact ad spend matched against net money deposited in your bank.`,
        contentBn: `অধিকাংশ বাংলাদেশি ই-কমার্স উদ্যোক্তা মেটা অ্যাডস ম্যানেজারে ৬.৫x ROAS দেখে খুশি হন। কিন্তু মাস শেষে ব্যাংক অ্যাকাউন্টে কাঙ্ক্ষিত প্রফিট খুঁজে পান না।

### ব্রাউজার পিক্সেল ট্র্যাকিংয়ের বিভ্রম
ব্রাউজার-ভিত্তিক মেটা পিক্সেল ব্যাপক ডেটা লসের শিকার হয়:
- iOS 14.5+ অ্যাপ ট্র্যাকিং ট্রান্সপারেন্সি এবং সাফারির আইটিপি ব্রাউজার কুকি ব্লক করে।
- অ্যাড ব্লকার ২০% থেকে ৩৫% কনভার্সন ইভেন্ট আটকে দেয়।
- বাংলাদেশের নেটওয়ার্কের কারণে থ্যাঙ্ক ইউ পেজ লোড হওয়ার আগেই স্ক্রিপ্ট টাইমআউট হয়ে যায়।

সবচেয়ে বড় কথা: **ব্রাউজার পিক্সেল যেকোনো "অর্ডার প্লেস" বাটনে ক্লিক করলেই পারচেজ ধরে নেয়**, গ্রাহক পার্সেল গ্রহণ করল নাকি প্রত্যাখ্যান করল তা দেখে না।

### হাই রিটার্ন রেটের ফল কী হয়?
যদি আপনি ৬x ব্রাউজার ROAS দিয়ে ১০০টি অর্ডার পান:
- ২৫টি অর্ডার ভুয়া বা দরজায় কাস্টমার রিসিভ করে না।
- ৫টি অর্ডার সাইজ না মেলায় রিটার্ন আসে।
- **ফলাফল**: আপনি ১০০টি অর্ডারের জন্য বিজ্ঞাপন খরচ দিলেন, কিন্তু নগদ টাকা পেলেন মাত্র ৭০টিতে। আপনার বাস্তব ক্যাশ ROAS ফেসবুকের রিপোর্টের চেয়ে অনেক কম!

### মেটা কনভার্সন এপিআই (CAPI) এর শক্তি
EcoMate সার্ভার-সাইড কনভার্সন এপিআই-এর সাথে কুরিয়ার ডেলিভারির সমন্বয় করে:
১. **ডিডুপ্লিকেটেড সার্ভার ইভেন্টস**: সরাসরি সার্ভার থেকে ইউনিক আইডি দিয়ে ইভেন্ট পাঠানো হয় যা কোনো অ্যাড ব্লকার ড্রপ করতে পারে না।
২. **ডেলিভার্ড পার্সেল অপ্টিমাইজেশন**: আপনি শুধু আসল ডেলিভারি হওয়া ও টাকা পাওয়া পার্সেলে বিজ্ঞাপন অপ্টিমাইজ করতে পারবেন।
৩. **নেট ক্যাশ রিয়ালাইজড ROAS**: সঠিক ড্যাশবোর্ডে দেখুন বিজ্ঞাপনে কত খরচ হলো আর বাস্তবে ব্যাংকে কত টাকা লাভ জমা হলো।`,
        author: 'EcoMate Growth Analytics',
        category: 'Logistics & Courier Intelligence',
        categoryId: categoryIdBySlug.get('logistics-courier') ?? null,
        tags: ['fraud-defense', 'logistics-automation', 'bangladesh-ecommerce', 'loss-prevention'],
        featuredImageUrl:
          'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
        videoUrl: '',
        galleryUrls: [],
        readTime: '8 min read',
        status: 'published',
        seoTitle: 'Meta Conversions API (CAPI) for Bangladesh E-commerce | EcoMate Guide',
        seoTitleBn: 'মেটা কনভার্সন এপিআই (CAPI) ই-কমার্স গাইড | EcoMate',
        seoDescription:
          'How server-side Meta Conversions API connected with courier delivery reconciliation eliminates ad budget waste and reports true cash ROAS.',
        seoDescriptionBn: 'সার্ভার-সাইড মেটা CAPI কীভাবে বিজ্ঞাপনের অপচয় রোধ করে এবং ডেলিভারি করা ক্যাশ অনুযায়ী সঠিক ROAS রিপোর্ট করে।',
        canonicalUrl:
          'https://ecomate.bd/blog/stop-burning-ad-budget-server-side-meta-capi-bangladesh',
        publishedAt: new Date(Date.now() - HOUR * 12),
      },
    ];

    for (const post of blogPosts) {
      const existing = await tx
        .select({ id: schema.blogPostsTable.id })
        .from(schema.blogPostsTable)
        .where(
          and(
            eq(schema.blogPostsTable.slug, post.slug),
            isNull(schema.blogPostsTable.deletedAt),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        await tx
          .update(schema.blogPostsTable)
          .set({
            ...post,
            updatedAt: new Date(),
          })
          .where(eq(schema.blogPostsTable.id, existing[0].id));
      } else {
        await tx.insert(schema.blogPostsTable).values(post);
      }
    }

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
              body: 'Reach us anytime: WhatsApp +880 1894-828290, phone +880 1894-828290, email hello@ecomate.bd, address Tejgaon I/A, Dhaka 1208. Write in to view, correct or delete your data — we verify and act.',
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
              body: 'যেকোনো অনুরোধে: WhatsApp +880 1894-828290, ফোন +880 1894-828290, ইমেইল hello@ecomate.bd, ঠিকানা Tejgaon I/A, Dhaka 1208। আপনার তথ্য দেখতে, সংশোধন বা মুছে ফেলতে লিখুন — আমরা যাচাই করে ব্যবস্থা নেব।',
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
              body: 'Questions or disputes: WhatsApp +880 1894-828290, phone +880 1894-828290, email hello@ecomate.bd.',
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
              body: 'প্রশ্ন বা বিরোধে: WhatsApp +880 1894-828290, ফোন +880 1894-828290, ইমেইল hello@ecomate.bd।',
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
