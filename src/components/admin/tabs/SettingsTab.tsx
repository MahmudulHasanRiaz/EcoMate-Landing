import { RotateCcw, Save } from 'lucide-react';
import type { SiteSettings } from '../../../types/api';
import type { FieldErrors } from '../fieldErrors';
import { FieldError } from '../ui';
import { ImagePickerField } from '../ImagePickerField';
import { Card, GhostButton, PrimaryButton } from '../ui';

export interface SettingsTabProps {
  settings: SiteSettings;
  onSettingsChange: React.Dispatch<React.SetStateAction<SiteSettings | null>>;
  settingsErrors: FieldErrors;
  purging: null | 'all' | 'landing';
  onConfirmScopeChange: (scope: 'all' | 'landing') => void;
  onSaveSettings: (e: React.FormEvent) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onSettingsChange,
  settingsErrors,
  purging,
  onConfirmScopeChange,
  onSaveSettings,
}) => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
  <div>
    <h2 className="text-xl sm:text-2xl font-bold text-[#14171c] dark:text-[#ededf3]">System Settings & Brand Identity</h2>
    <p className="text-xs sm:text-sm text-[#667085] dark:text-[#8e8ea4] mt-0.5">
      Global contact numbers, WhatsApp target, default locale, and meta parameters.
    </p>
  </div>

  <form onSubmit={onSaveSettings} className="p-6 bg-white dark:bg-[#111118] border border-[#e4e7ec] dark:border-[#232331] rounded-[10px] space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
      <div>
        <label htmlFor="settings-siteName" className="block text-[#1f242b] dark:text-[#e2e2ec] font-semibold mb-1">Brand Site Name</label>
        <input
          id="settings-siteName"
          type="text"
          value={settings.siteName}
          onChange={(e) => onSettingsChange({ ...settings, siteName: e.target.value })}
          aria-describedby={settingsErrors.siteName ? 'settings-siteName-error' : undefined}
          className="w-full px-3 min-h-[34px] py-1.5 rounded-md bg-white dark:bg-[#12121a] border border-[#d5d9e0] dark:border-[#2a2a3a] text-[#1f242b] dark:text-[#e2e2ec] text-[13.5px] font-semibold"
        />
        <FieldError id="settings-siteName-error" message={settingsErrors.siteName} />
      </div>

      <div>
        <label htmlFor="settings-defaultLocale" className="block text-[#1f242b] dark:text-[#e2e2ec] font-semibold mb-1">Default Locale</label>
        <select
          id="settings-defaultLocale"
          value={settings.defaultLocale}
          onChange={(e) => onSettingsChange({ ...settings, defaultLocale: e.target.value as unknown as SiteSettings['defaultLocale'] })}
          aria-describedby={settingsErrors.defaultLocale ? 'settings-defaultLocale-error' : undefined}
          className="w-full px-3 min-h-[34px] py-1.5 rounded-md bg-white dark:bg-[#12121a] border border-[#d5d9e0] dark:border-[#2a2a3a] text-[#1f242b] dark:text-[#e2e2ec] text-[13.5px] font-medium"
        >
          <option value="en">English (Default)</option>
          <option value="bn">Bangla (বাংলা)</option>
        </select>
        <FieldError id="settings-defaultLocale-error" message={settingsErrors.defaultLocale} />
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
      <ImagePickerField
        id="settings-logoUrl"
        label="Header Logo"
        value={settings.logoUrl}
        onChange={(url) => onSettingsChange({ ...settings, logoUrl: url })}
        error={settingsErrors.logoUrl}
        placeholder="Choose Header Logo"
        helperText="Logo used in header navigation & footer (leave empty for built-in EcoMate mark)."
        modalTitle="Select Header Logo"
      />

      <ImagePickerField
        id="settings-faviconUrl"
        label="Favicon"
        value={settings.faviconUrl}
        onChange={(url) => onSettingsChange({ ...settings, faviconUrl: url })}
        error={settingsErrors.faviconUrl}
        aspectRatio="square"
        placeholder="Choose Favicon"
        helperText="Browser tab icon (leave empty for default favicon)."
        modalTitle="Select Favicon"
      />
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
      <div>
        <label htmlFor="settings-supportPhone" className="block text-[#1f242b] dark:text-[#e2e2ec] font-semibold mb-1">Support Phone</label>
        <input
          id="settings-supportPhone"
          type="text"
          value={settings.supportPhone}
          onChange={(e) => onSettingsChange({ ...settings, supportPhone: e.target.value })}
          aria-describedby={settingsErrors.supportPhone ? 'settings-supportPhone-error' : undefined}
          className="w-full px-3 min-h-[34px] py-1.5 rounded-md bg-white dark:bg-[#12121a] border border-[#d5d9e0] dark:border-[#2a2a3a] text-[#1f242b] dark:text-[#e2e2ec] text-[13.5px] font-mono"
        />
        <FieldError id="settings-supportPhone-error" message={settingsErrors.supportPhone} />
      </div>

      <div>
        <label htmlFor="settings-whatsappNumber" className="block text-[#1f242b] dark:text-[#e2e2ec] font-semibold mb-1">WhatsApp Number (e.g. 8801894828290)</label>
        <input
          id="settings-whatsappNumber"
          type="text"
          value={settings.whatsappNumber}
          onChange={(e) => onSettingsChange({ ...settings, whatsappNumber: e.target.value })}
          aria-describedby={settingsErrors.whatsappNumber ? 'settings-whatsappNumber-error' : undefined}
          className="w-full px-3 min-h-[34px] py-1.5 rounded-md bg-white dark:bg-[#12121a] border border-[#d5d9e0] dark:border-[#2a2a3a] text-[#1f242b] dark:text-[#e2e2ec] text-[13.5px] font-mono"
        />
        <FieldError id="settings-whatsappNumber-error" message={settingsErrors.whatsappNumber} />
      </div>
    </div>

    <div className="text-xs">
      <label htmlFor="settings-address" className="block text-[#1f242b] dark:text-[#e2e2ec] font-semibold mb-1">Corporate Physical Address</label>
      <input
        id="settings-address"
        type="text"
        value={settings.address}
        onChange={(e) => onSettingsChange({ ...settings, address: e.target.value })}
        aria-describedby={settingsErrors.address ? 'settings-address-error' : undefined}
        className="w-full px-3 min-h-[34px] py-1.5 rounded-md bg-white dark:bg-[#12121a] border border-[#d5d9e0] dark:border-[#2a2a3a] text-[#1f242b] dark:text-[#e2e2ec] text-[13.5px]"
      />
      <FieldError id="settings-address-error" message={settingsErrors.address} />
    </div>

    <div className="text-xs">
      <label htmlFor="settings-seoTitle" className="block text-[#1f242b] dark:text-[#e2e2ec] font-semibold mb-1">Global SEO Title</label>
      <input
        id="settings-seoTitle"
        type="text"
        value={settings.seoTitle}
        onChange={(e) => onSettingsChange({ ...settings, seoTitle: e.target.value })}
        aria-describedby={settingsErrors.seoTitle ? 'settings-seoTitle-error' : undefined}
        className="w-full px-3 min-h-[34px] py-1.5 rounded-md bg-white dark:bg-[#12121a] border border-[#d5d9e0] dark:border-[#2a2a3a] text-[#1f242b] dark:text-[#e2e2ec] text-[13.5px]"
      />
      <FieldError id="settings-seoTitle-error" message={settingsErrors.seoTitle} />
    </div>

    <div className="text-xs">
      <label htmlFor="settings-seoDescription" className="block text-[#1f242b] dark:text-[#e2e2ec] font-semibold mb-1">Global Meta Description</label>
      <textarea
        id="settings-seoDescription"
        rows={2}
        value={settings.seoDescription}
        onChange={(e) => onSettingsChange({ ...settings, seoDescription: e.target.value })}
        aria-describedby={settingsErrors.seoDescription ? 'settings-seoDescription-error' : undefined}
        className="w-full px-3 min-h-[34px] py-1.5 rounded-md bg-white dark:bg-[#12121a] border border-[#d5d9e0] dark:border-[#2a2a3a] text-[#1f242b] dark:text-[#e2e2ec] text-[13.5px] resize-none"
      />
        <FieldError id="settings-seoDescription-error" message={settingsErrors.seoDescription} />
      </div>

    <div className="p-4 rounded-[10px] border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 space-y-2">
      <label htmlFor="settings-seoIndexing" className="text-xs font-bold text-[#14171c] dark:text-[#ededf3] flex items-center gap-2 cursor-pointer">
        <input
          id="settings-seoIndexing"
          type="checkbox"
          checked={settings?.seoIndexingEnabled ?? false}
          onChange={(e) => settings && onSettingsChange({ ...settings, seoIndexingEnabled: e.target.checked })}
          className="h-4 w-4 accent-[#0f766e]"
        />
        <span>Search engine indexing</span>
      </label>
      <p className="text-[11px] text-[#667085] dark:text-[#8e8ea4]">
        OFF থাকলে Google কোনো পেজ index করবে না (robots + sitemap + meta + header সব বন্ধ)।
        ON করলে পুরো সাইট index শুরু হবে। Save চাপলে কার্যকর হবে।
      </p>
    </div>

      <div className="pt-2 border-t border-[#eceef1] dark:border-[#1e1e2a]">
        <h3 className="font-bold text-sm text-[#14171c] dark:text-[#ededf3]">Meta Conversions API mode (H-1)</h3>
        <p className="text-[11px] text-[#667085] dark:text-[#8e8ea4] mt-0.5 mb-3">
          Instant sends the full Lead event on submit. Validated sends a lightweight instant event on submit and the full Lead only when a lead reaches the trigger status. Applies to consented visitors only.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label htmlFor="settings-metaCapiMode" className="block text-[#1f242b] dark:text-[#e2e2ec] font-semibold mb-1">CAPI mode</label>
            <select
              id="settings-metaCapiMode"
              value={settings.metaCapiMode ?? 'instant'}
              onChange={(e) => onSettingsChange({ ...settings, metaCapiMode: e.target.value as SiteSettings['metaCapiMode'] })}
              aria-describedby={settingsErrors.metaCapiMode ? 'settings-metaCapiMode-error' : undefined}
              className="w-full px-3 min-h-[34px] py-1.5 rounded-md bg-white dark:bg-[#12121a] border border-[#d5d9e0] dark:border-[#2a2a3a] text-[#1f242b] dark:text-[#e2e2ec] text-[13.5px]"
            >
              <option value="instant">Instant — full Lead on submit</option>
              <option value="validated">Validated — full Lead on trigger status</option>
            </select>
            <FieldError id="settings-metaCapiMode-error" message={settingsErrors.metaCapiMode} />
          </div>
          <div>
            <label htmlFor="settings-metaLeadStatusTrigger" className="block text-[#1f242b] dark:text-[#e2e2ec] font-semibold mb-1">Trigger status (validated mode)</label>
            <select
              id="settings-metaLeadStatusTrigger"
              value={settings.metaLeadStatusTrigger ?? ''}
              onChange={(e) => onSettingsChange({ ...settings, metaLeadStatusTrigger: e.target.value })}
              aria-describedby={settingsErrors.metaLeadStatusTrigger ? 'settings-metaLeadStatusTrigger-error' : undefined}
              className="w-full px-3 min-h-[34px] py-1.5 rounded-md bg-white dark:bg-[#12121a] border border-[#d5d9e0] dark:border-[#2a2a3a] text-[#1f242b] dark:text-[#e2e2ec] text-[13.5px]"
            >
              <option value="">Not configured (instant events only)</option>
              {(['New', 'Contacted', 'Qualified', 'Demo Scheduled', 'Won', 'Lost'] as const).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <FieldError id="settings-metaLeadStatusTrigger-error" message={settingsErrors.metaLeadStatusTrigger} />
          </div>
          <div>
            <label htmlFor="settings-metaInstantEventName" className="block text-[#1f242b] dark:text-[#e2e2ec] font-semibold mb-1">Instant event name</label>
            <input
              id="settings-metaInstantEventName"
              type="text"
              value={settings.metaInstantEventName ?? 'LeadInitiated'}
              onChange={(e) => onSettingsChange({ ...settings, metaInstantEventName: e.target.value })}
              aria-describedby={settingsErrors.metaInstantEventName ? 'settings-metaInstantEventName-error' : undefined}
              className="w-full px-3 min-h-[34px] py-1.5 rounded-md bg-white dark:bg-[#12121a] border border-[#d5d9e0] dark:border-[#2a2a3a] text-[#1f242b] dark:text-[#e2e2ec] text-[13.5px] font-mono"
            />
            <FieldError id="settings-metaInstantEventName-error" message={settingsErrors.metaInstantEventName} />
          </div>
        </div>
      </div>

    <div className="pt-2 flex justify-end">
      <PrimaryButton type="submit">
        <Save className="h-4 w-4" />
        <span>Save Site Settings</span>
      </PrimaryButton>
    </div>
  </form>

  <Card className="p-6 space-y-3">
    <h3 className="text-sm font-bold text-[#14171c] dark:text-[#ededf3]">Cache</h3>
    <p className="text-[11px] text-[#667085] dark:text-[#8e8ea4]">
      Purge করলে সব cached content expire হবে — পরের ভিজিটে fresh DB read হবে।
    </p>
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={purging !== null}
        onClick={() => onConfirmScopeChange('all')}
        className="min-h-[34px] px-3 rounded-md bg-red-600 hover:bg-red-700 text-white text-[13.5px] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-wait"
      >
        {purging === 'all' ? 'Purging…' : 'Purge all cache'}
      </button>
      <GhostButton
        type="button"
        title="শুধু landing shell (content, menus, branding, pricing)"
        disabled={purging !== null}
        onClick={() => onConfirmScopeChange('landing')}
      >
        <RotateCcw className="h-4 w-4" />
        <span>{purging === 'landing' ? 'Purging…' : 'Landing only'}</span>
      </GhostButton>
    </div>
  </Card>

    </div>
  );
};
