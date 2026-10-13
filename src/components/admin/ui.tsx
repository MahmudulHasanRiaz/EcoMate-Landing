import React from 'react';

/** Card shell: artifact `.cd` — white/#111118, 10px radius. */
export const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <section className={`bg-white dark:bg-[#111118] border border-[#e4e7ec] dark:border-[#232331] rounded-[10px] ${className}`}>
    {children}
  </section>
);

/** Card header row: artifact `.ch` — title left, action right. */
export const CardHeader: React.FC<{ title: string; action?: React.ReactNode }> = ({ title, action }) => (
  <div className="flex justify-between items-center gap-3 px-5 py-4 border-b border-[#eceef1] dark:border-[#1e1e2a]">
    <h2 className="m-0 text-[15px] font-semibold">{title}</h2>
    {action}
  </div>
);

/** Primary teal button: artifact `.bt.pr`. */
export const PrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', ...rest }) => (
  <button
    {...rest}
    className={`inline-flex items-center gap-2 min-h-[34px] px-3 rounded-md border bg-[#0f766e] border-[#0f766e] text-white dark:text-white text-[13.5px] font-medium cursor-pointer transition-colors hover:bg-[#115e59] hover:border-[#115e59] disabled:opacity-50 disabled:cursor-wait ${className}`}
  />
);

/** Ghost bordered button: artifact `.bt`. */
export const GhostButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', ...rest }) => (
  <button
    {...rest}
    className={`inline-flex items-center gap-2 min-h-[34px] px-3 rounded-md border border-[#d5d9e0] dark:border-[#2a2a3a] bg-white dark:bg-[#12121a] text-[#1f242b] dark:text-[#e2e2ec] text-[13.5px] font-medium cursor-pointer transition-colors hover:bg-[#f1f3f5] dark:hover:bg-[#1a1a26] disabled:opacity-50 disabled:cursor-wait ${className}`}
  />
);

/** Square icon button: artifact `.ib`. */
export const IconButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }> = ({
  label,
  className = '',
  ...rest
}) => (
  <button
    {...rest}
    type="button"
    title={label}
    aria-label={label}
    className={`inline-flex items-center justify-center w-8 h-8 rounded-md border border-[#d5d9e0] dark:border-[#2a2a3a] bg-white dark:bg-[#12121a] text-[#444b57] dark:text-[#b9b9cc] cursor-pointer transition-colors hover:bg-[#f1f3f5] dark:hover:bg-[#1c1c2c] ${className}`}
  />
);

/** Mono tag: artifact `.tg`. Tone teal default; `amber` for pending states, `red` for failed, `slate` for skipped. */
export const Tag: React.FC<{ tone?: 'teal' | 'amber' | 'red' | 'slate'; children: React.ReactNode }> = ({ tone = 'teal', children }) => (
  <span
    className={
      tone === 'amber'
        ? 'inline-flex font-mono text-[11.5px] font-medium text-[#b45309] dark:text-[#fbbf24] bg-[#b45309]/[.08] dark:bg-[#fbbf24]/[.1] border border-[#b45309]/25 dark:border-[#fbbf24]/25 rounded-[5px] px-2 py-[1px]'
        : tone === 'red'
          ? 'inline-flex text-[11.5px] font-medium text-[#b91c1c] dark:text-[#fca5a5] bg-[#dc2626]/[.08] dark:bg-[#f87171]/[.1] border border-[#dc2626]/25 dark:border-[#f87171]/25 rounded-[5px] px-2 py-[1px]'
          : tone === 'slate'
            ? 'inline-flex text-[11.5px] font-medium text-[#566070] dark:text-[#a2a2b6] bg-[#f1f3f5] dark:bg-[#1c1c2c] border border-[#e6e8ec] dark:border-[#2a2a3a] rounded-[5px] px-2 py-[1px]'
            : 'text-[12px] font-medium text-teal-700 dark:text-teal-300 bg-[#e6f2f0] dark:bg-[#12302e] border border-[#bfdcd7] dark:border-[#1f4f4a] rounded-[5px] px-2 py-[1px]'
    }
  >
    {children}
  </span>
);

/** Initials avatar: artifact `.av`. */
export const Avatar: React.FC<{ initials: string; size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  initials,
  size = 'md',
  className = '',
}) => {
  const sizes = {
    sm: 'w-[22px] h-[22px] text-[10px] rounded-md',
    md: 'w-9 h-9 text-[12.5px] rounded-lg',
    lg: 'w-11 h-11 text-sm rounded-[10px]',
  } as const;
  return (
    <span
      aria-hidden="true"
      className={`grid place-items-center font-semibold flex-none bg-[#e6f2f0] dark:bg-[#12302e] border border-[#bfdcd7] dark:border-[#1f4f4a] text-teal-700 dark:text-teal-300 ${sizes[size]} ${className}`}
    >
      {initials}
    </span>
  );
};

/** Confirm dialog: artifact `.dlg` — controlled open, same confirm-then-act flow as `window.confirm` call sites. */
export const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}> = ({ open, title, body, confirmLabel, pending, onConfirm, onClose }) => {
  React.useEffect(() => {
    if (!open || pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, pending, onClose]);
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40 cursor-pointer" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label={title} className="fixed z-[61] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] max-w-[calc(100vw-32px)] bg-white dark:bg-[#14141c] border border-[#e4e7ec] dark:border-[#2a2a3a] rounded-[10px] p-5">
        <h3 className="m-0 text-base font-semibold">{title}</h3>
        <p className="mt-1 text-[13.5px] text-[#566070] dark:text-[#a2a2b6]">{body}</p>
        <div className="flex justify-end gap-2 mt-[18px]">
          <GhostButton type="button" disabled={pending} onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton type="button" disabled={pending} onClick={onConfirm}>
            {pending ? 'Working…' : confirmLabel}
          </PrimaryButton>
        </div>
      </div>
    </>
  );
};

/** Empty state: artifact `.be`/`.emp`. */
export const EmptyState: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="p-12 text-center text-[12.5px] text-[#5f6978] dark:text-[#9a9ab0]">{children}</div>
);

/** Stat cell for KPI strips: artifact `.kp` (value + label + optional sub + link). */
export const StatCell: React.FC<{ label: string; value: React.ReactNode; sub?: React.ReactNode }> = ({
  label,
  value,
  sub,
}) => (
  <div className="bg-white dark:bg-[#111118] px-5 py-[18px] flex flex-col gap-2">
    <div className="text-[13px] text-[#566070] dark:text-[#a2a2b6]">{label}</div>
    <div className="text-[28px] font-semibold tracking-[-0.02em] leading-[1.15]">{value}</div>
    {sub ? <div className="text-[13px] text-[#566070] dark:text-[#a2a2b6]">{sub}</div> : null}
  </div>
);

/** Inline validation message rendered against its input (Task 17 §5). Exported for the form islands. */
export const FieldError: React.FC<{ id: string; message?: string }> = ({ id, message }) => {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-[11px] font-medium text-rose-700 dark:text-rose-300">
      {message}
    </p>
  );
};
