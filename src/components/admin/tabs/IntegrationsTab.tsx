import type { IntegrationLog } from '../../../types/api';
import { Card, CardHeader, Tag } from '../ui';

export interface IntegrationsTabProps {
  integrationLogs: IntegrationLog[];
}

export const IntegrationsTab: React.FC<IntegrationsTabProps> = ({ integrationLogs }) => {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#14171c] dark:text-[#ededf3]">
          External License Portal Integration Layer
        </h2>
        <p className="text-xs sm:text-sm text-[#667085] dark:text-[#8e8ea4] mt-0.5">
          Asynchronous adapter queue. Dispatches validated leads to external License Portal API while keeping local records authoritative.
        </p>
      </div>

      <div className="p-4 rounded-[10px] bg-[#e6f2f0] dark:bg-[#12302e] border border-[#bfdcd7] dark:border-[#1f4f4a] text-xs">
        <p className="font-bold text-teal-700 dark:text-teal-300">Architecture Contract Note:</p>
        <p className="mt-1 leading-relaxed text-[#1f242b] dark:text-[#e2e2ec]">
          The public marketing website and CMS are fully self-contained. The external License Management Portal is accessed strictly as an integration recipient. If the external portal is unavailable or offline, zero data is lost.
        </p>
      </div>

      {/* Logs */}
      <Card className="overflow-hidden">
        <CardHeader title="Integration Dispatch Audit Logs" />
        <div className="divide-y divide-[#eceef1] dark:divide-[#1e1e2a]">
          {integrationLogs.map((log) => (
            <div key={log.id} className="p-4 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-[#14171c] dark:text-[#ededf3]">
                  [{log.serviceName}] {log.action}
                </span>
                <Tag tone={log.status === 'Success' ? 'teal' : 'amber'}>{log.status}</Tag>
              </div>
              <p className="text-[#667085] dark:text-[#8e8ea4] text-[11px] font-mono">
                {new Date(log.createdAt).toLocaleString()} · Attempts: {log.attempts}
              </p>
              {log.errorMessage && (
                <p className="text-rose-700 dark:text-rose-300 text-[11px]">{log.errorMessage}</p>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
