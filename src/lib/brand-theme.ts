import { BRAND_ASSETS, BRAND_DARK_BG, BRAND_LIGHT_BG } from './brand';
import type { Theme } from './theme';

export function applyBrandAssets(theme: Theme): void {
  if (typeof document === 'undefined') return;

  const mark = BRAND_ASSETS.mark[theme];
  const themeColor = theme === 'dark' ? BRAND_DARK_BG : BRAND_LIGHT_BG;

  for (const el of document.querySelectorAll<HTMLLinkElement>('link[data-brand-icon]')) {
    const kind = el.dataset.brandIcon;
    if (kind === 'svg') el.href = mark.svg;
    if (kind === 'png') el.href = mark.png;
    if (kind === 'apple') el.href = mark.png2x;
  }

  const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (themeMeta) themeMeta.content = themeColor;
}
