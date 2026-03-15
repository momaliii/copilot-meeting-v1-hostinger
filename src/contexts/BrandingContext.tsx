import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Branding = {
  siteName: string;
  siteDescription: string;
  themeColor: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  meetingDetailsDesignV2: boolean;
};

const DEFAULTS: Branding = {
  siteName: 'Meeting Copilot',
  siteDescription: 'Record, transcribe, and analyze meetings with AI',
  themeColor: '#4f46e5',
  logoUrl: null,
  faviconUrl: null,
  meetingDetailsDesignV2: false,
};

const BrandingContext = createContext<Branding>(DEFAULTS);

export function useBranding() {
  return useContext(BrandingContext);
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding>(DEFAULTS);

  useEffect(() => {
    fetch('/api/public/branding')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setBranding({
            siteName: data.site_name || DEFAULTS.siteName,
            siteDescription: data.site_description || DEFAULTS.siteDescription,
            themeColor: data.theme_color || DEFAULTS.themeColor,
            logoUrl: data.logo_url || null,
            faviconUrl: data.favicon_url || null,
            meetingDetailsDesignV2: data.meeting_details_design_v2 === '1' || data.meeting_details_design_v2 === 'true',
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.title = branding.siteName;
  }, [branding.siteName]);

  useEffect(() => {
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', branding.siteDescription);
  }, [branding.siteDescription]);

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', branding.themeColor);
  }, [branding.themeColor]);

  useEffect(() => {
    let link = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (branding.faviconUrl) {
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = branding.faviconUrl;
    } else if (link) {
      link.remove();
    }
  }, [branding.faviconUrl]);

  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
}
