import React, { useRef } from 'react';
import { Upload, X, Building, CheckSquare, Square, ShieldCheck } from 'lucide-react';
import { SOLARITHM_LOGO_SVG } from '../../lib/defaultAssets';

interface BrandingTabProps {
  clientLogoDataUrl: string | null;
  solarithmLogoDataUrl: string | null;
  showClientLogo: boolean;
  showSolarithmBranding: boolean;
  onUploadClientLogo: (file: File) => void;
  onClearClientLogo: () => void;
  onUploadSolarithmLogo: (file: File) => void;
  onClearSolarithmLogo: () => void;
  onToggleShowClientLogo: (val: boolean) => void;
  onToggleShowSolarithmBranding: (val: boolean) => void;
}

export const BrandingTab: React.FC<BrandingTabProps> = ({
  clientLogoDataUrl,
  solarithmLogoDataUrl,
  showClientLogo,
  showSolarithmBranding,
  onUploadClientLogo,
  onClearClientLogo,
  onUploadSolarithmLogo,
  onClearSolarithmLogo,
  onToggleShowClientLogo,
  onToggleShowSolarithmBranding,
}) => {
  const clientInputRef = useRef<HTMLInputElement>(null);
  const solarithmInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6 text-xs">
      {/* 1. Client Branding */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px] font-mono">
            Client Company Logo
          </h4>
          <span className="text-[10px] text-zinc-400 font-mono">Top-Right in PDF</span>
        </div>

        {clientLogoDataUrl ? (
          <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#141416] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 truncate">
              <div className="w-16 h-10 bg-white rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center p-1 overflow-hidden">
                <img
                  src={clientLogoDataUrl}
                  alt="Client Logo"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                Active Client Emblem
              </span>
            </div>
            <button
              type="button"
              onClick={onClearClientLogo}
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 cursor-pointer"
              title="Remove logo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => clientInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-[#D4AF37] rounded-xl p-5 text-center cursor-pointer transition-colors bg-zinc-50/50 dark:bg-[#141416]/50 flex flex-col items-center justify-center gap-2"
          >
            <input
              ref={clientInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  onUploadClientLogo(f);
                  e.target.value = '';
                }
              }}
            />
            <div className="w-9 h-9 rounded-lg bg-[rgba(212,175,55,0.15)] flex items-center justify-center text-[#D4AF37]">
              <Upload className="w-4 h-4" />
            </div>
            <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">
              Upload Client Logo
            </span>
          </div>
        )}

        <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showClientLogo}
            onChange={(e) => onToggleShowClientLogo(e.target.checked)}
            className="w-3.5 h-3.5 accent-[#D4AF37] cursor-pointer"
          />
          <span>Include Client logo in PDF output</span>
        </label>
      </div>

      {/* 2. Solarithm Brand Header */}
      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px] font-mono">
            Solarithm Engineering Logo
          </h4>
          <span className="text-[10px] text-zinc-400 font-mono">Top-Left in PDF</span>
        </div>

        <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#141416] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 truncate">
            <div className="w-16 h-10 bg-white rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center p-1 overflow-hidden">
              {solarithmLogoDataUrl ? (
                <img
                  src={solarithmLogoDataUrl}
                  alt="Custom Solarithm Logo"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div
                  className="w-full h-full"
                  dangerouslySetInnerHTML={{ __html: SOLARITHM_LOGO_SVG }}
                />
              )}
            </div>
            <div>
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block truncate">
                {solarithmLogoDataUrl ? 'Custom Solarithm Asset' : 'Official Solarithm Emblem'}
              </span>
              <span className="text-[10px] text-[#D4AF37] font-mono font-medium">
                Design &amp; Engineering Vector
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {solarithmLogoDataUrl && (
              <button
                type="button"
                onClick={onClearSolarithmLogo}
                className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 cursor-pointer"
                title="Reset to default official emblem"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => solarithmInputRef.current?.click()}
              className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 hover:text-[#D4AF37] underline cursor-pointer"
            >
              Change
            </button>
            <input
              ref={solarithmInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  onUploadSolarithmLogo(f);
                  e.target.value = '';
                }
              }}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showSolarithmBranding}
            onChange={(e) => onToggleShowSolarithmBranding(e.target.checked)}
            className="w-3.5 h-3.5 accent-[#D4AF37] cursor-pointer"
          />
          <span>Include SOLARITHM branding in PDF header</span>
        </label>
      </div>
    </div>
  );
};
