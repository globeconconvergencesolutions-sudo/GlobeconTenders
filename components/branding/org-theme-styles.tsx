import type { ResolvedBranding } from "@/lib/branding/resolve";
import { hexToHslChannels } from "@/lib/branding/colors";

type OrgThemeStylesProps = {
  branding: ResolvedBranding;
};

export function OrgThemeStyles({ branding }: OrgThemeStylesProps) {
  const primary = hexToHslChannels(branding.primaryColor);
  const accent = hexToHslChannels(branding.accentColor);

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `:root{--primary:${primary};--ring:${primary};--accent:${accent};}`,
      }}
    />
  );
}
