import { repository, Lead } from '../db';

export interface LicensePortalLeadPayload {
  externalId: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  estimatedVolume?: string;
  source: string;
  utm?: {
    source?: string;
    campaign?: string;
  };
  submittedAt: string;
}

export interface LicensePortalResponse {
  success: boolean;
  trackingId?: string;
  message: string;
  rawResponse?: any;
}

class LicensePortalService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.LICENSE_PORTAL_API_BASE_URL || '';
    this.apiKey = process.env.LICENSE_PORTAL_API_KEY || '';
  }

  /**
   * Dispatches lead data to the external License Management Portal API.
   * If the external API is unconfigured or unreachable, it gracefully logs the failure
   * and preserves the local lead record as authoritative.
   */
  async dispatchLead(lead: Lead): Promise<LicensePortalResponse> {
    const payload: LicensePortalLeadPayload = {
      externalId: `ECOMATE-WEB-${lead.id}`,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      estimatedVolume: lead.dailyVolume,
      source: lead.source,
      utm: {
        source: lead.utmSource,
        campaign: lead.utmCampaign,
      },
      submittedAt: lead.createdAt,
    };

    // If external endpoint is not yet configured, record as queued / standby
    if (!this.baseUrl) {
      const logMessage = 'LICENSE_PORTAL_API_BASE_URL is not configured. Lead queued locally in authoritative SQL database.';
      repository.updateLeadLicenseSync(lead.id, 'Pending', logMessage);
      repository.logIntegration({
        serviceName: 'LicensePortal',
        action: 'DISPATCH_LEAD_QUEUED',
        payload,
        response: { queued: true, note: logMessage },
        status: 'Pending',
        attempts: 1,
      });

      return {
        success: true,
        trackingId: `LOCAL-QUEUE-${lead.id}`,
        message: logMessage,
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/leads/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-EcoMate-Source': 'Website-Public-Form',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const failureMessage = `License portal responded with HTTP ${response.status}: ${errorText.slice(0, 200)}`;
        
        repository.updateLeadLicenseSync(lead.id, 'Failed', failureMessage);
        repository.logIntegration({
          serviceName: 'LicensePortal',
          action: 'DISPATCH_LEAD',
          payload,
          response: { status: response.status, body: errorText },
          status: 'Failed',
          errorMessage: failureMessage,
          attempts: 1,
        });

        return {
          success: false,
          message: failureMessage,
        };
      }

      const responseData = await response.json();
      repository.updateLeadLicenseSync(lead.id, 'Synced');
      repository.logIntegration({
        serviceName: 'LicensePortal',
        action: 'DISPATCH_LEAD',
        payload,
        response: responseData,
        status: 'Success',
        attempts: 1,
      });

      return {
        success: true,
        trackingId: responseData.id || `SYNCED-${lead.id}`,
        message: 'Successfully dispatched to License Portal',
        rawResponse: responseData,
      };
    } catch (err: any) {
      const errMessage = err.message || 'Network error reaching License Portal API';
      repository.updateLeadLicenseSync(lead.id, 'Failed', errMessage);
      repository.logIntegration({
        serviceName: 'LicensePortal',
        action: 'DISPATCH_LEAD',
        payload,
        response: null,
        status: 'Failed',
        errorMessage: errMessage,
        attempts: 1,
      });

      return {
        success: false,
        message: errMessage,
      };
    }
  }

  /**
   * Allows admin to retry dispatching a previously failed or pending lead.
   */
  async retryLead(leadId: number): Promise<LicensePortalResponse> {
    const leads = repository.getLeads();
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) {
      throw new Error(`Lead #${leadId} not found`);
    }
    return this.dispatchLead(lead);
  }
}

export const licensePortalService = new LicensePortalService();
