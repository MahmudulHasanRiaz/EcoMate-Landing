import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { repository, isPostgresConfigured } from './src/db';
import { licensePortalService } from './src/services/licensePortal';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory rate limiting map for public lead submissions (5 submissions per 10 minutes per IP)
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

const rateLimitLeads = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
  const now = Date.now();
  const clientRecord = rateLimitMap.get(String(ip));

  if (clientRecord && clientRecord.expiresAt > now) {
    if (clientRecord.count >= 8) {
      return res.status(429).json({ error: 'Too many requests. Please try again in a few minutes or call us directly.' });
    }
    clientRecord.count += 1;
  } else {
    rateLimitMap.set(String(ip), { count: 1, expiresAt: now + 600000 }); // 10 minutes
  }
  next();
};

// ==========================================
// 1. SITE SETTINGS & SEO API
// ==========================================
app.get('/api/settings', (req, res) => {
  try {
    const settings = repository.getSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', (req, res) => {
  try {
    const updated = repository.updateSettings(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. LANDING CMS SECTIONS API
// ==========================================
app.get('/api/sections', (req, res) => {
  try {
    const sections = repository.getSections();
    res.json(sections);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/sections/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const updated = repository.updateSection(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Section not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. PRICING CMS API
// ==========================================
app.get('/api/pricing', (req, res) => {
  try {
    const settings = repository.getSettings();
    const plans = repository.getPricingPlans();
    res.json({
      isPricingVisible: settings.isPricingVisible,
      plans,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/pricing', (req, res) => {
  try {
    const newPlan = repository.createPricingPlan(req.body);
    res.status(201).json(newPlan);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/pricing/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const updated = repository.updatePricingPlan(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Pricing plan not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/pricing/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const success = repository.deletePricingPlan(id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/pricing/toggle-mode', (req, res) => {
  try {
    const current = repository.getSettings();
    const updated = repository.updateSettings({ isPricingVisible: !current.isPricingVisible });
    res.json({ isPricingVisible: updated.isPricingVisible });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. LEADS API (Validation, Persistence & Integration Layer)
// ==========================================
app.get('/api/leads', (req, res) => {
  try {
    const leads = repository.getLeads();
    res.json(leads);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leads', rateLimitLeads, async (req, res) => {
  try {
    const { name, phone, email, dailyVolume, note, source, utmSource, utmCampaign } = req.body;

    // Strict validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!phone || typeof phone !== 'string' || phone.trim().length < 8) {
      return res.status(400).json({ error: 'A valid phone number is required' });
    }

    // 1. Persist to authoritative local SQL repository first
    const newLead = repository.createLead({
      name: name.trim(),
      phone: phone.trim(),
      email: email ? String(email).trim() : '',
      dailyVolume: dailyVolume ? String(dailyVolume) : '150 – 500 orders / day',
      note: note ? String(note).trim() : '',
      source: source || 'landing_page_lead_form',
      utmSource,
      utmCampaign,
    });

    // 2. Dispatch asynchronously to License Portal Integration Layer
    licensePortalService.dispatchLead(newLead).catch((err) => {
      console.error('[LicensePortal Async Error]', err);
    });

    res.status(201).json({
      success: true,
      leadId: newLead.id,
      message: 'Demo request registered successfully. Our operations team will reach out promptly.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/leads/:id/status', (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, internalNotes } = req.body;
    const updated = repository.updateLeadStatus(id, status, internalNotes);
    if (!updated) return res.status(404).json({ error: 'Lead not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leads/:id/sync-license', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await licensePortalService.retryLead(id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. TESTIMONIALS & CASE STUDIES API
// ==========================================
app.get('/api/testimonials', (req, res) => {
  try {
    const testimonials = repository.getTestimonials();
    res.json(testimonials);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/case-studies', (req, res) => {
  try {
    const cases = repository.getCaseStudies();
    res.json(cases);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. BLOG & SEO CONTENT API
// ==========================================
app.get('/api/blog', (req, res) => {
  try {
    const posts = repository.getBlogPosts();
    res.json(posts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/blog/:slug', (req, res) => {
  try {
    const post = repository.getBlogPostBySlug(req.params.slug);
    if (!post) return res.status(404).json({ error: 'Blog post not found' });
    res.json(post);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/blog', (req, res) => {
  try {
    const newPost = repository.createBlogPost(req.body);
    res.status(201).json(newPost);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/blog/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const updated = repository.updateBlogPost(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Blog post not found' });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7. MEDIA ASSETS & PLACEHOLDER SLOTS API
// ==========================================
app.get('/api/media', (req, res) => {
  try {
    const media = repository.getMediaAssets();
    res.json(media);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/media', (req, res) => {
  try {
    const asset = repository.createMediaAsset(req.body);
    res.status(201).json(asset);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. INTEGRATION LOGS API
// ==========================================
app.get('/api/integrations/logs', (req, res) => {
  try {
    const logs = repository.getIntegrationLogs();
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 9. SYSTEM HEALTH & DIAGNOSTICS
// ==========================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    postgresConfigured: isPostgresConfigured,
    licensePortalConfigured: Boolean(process.env.LICENSE_PORTAL_API_BASE_URL),
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 10. FRONTEND VITE INTEGRATION
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[EcoMate Platform] Full-Stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[EcoMate Platform] Server startup failed:', err);
});
