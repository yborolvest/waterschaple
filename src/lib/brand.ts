/** NL: Branding-kleuren en assets / EN: Brand colors and asset paths */

export const BRAND_DARK_BG = '#154273';
export const BRAND_LIGHT_BG = '#eef2f7';

export interface BrandAssetSet {
  svg: string;
  png: string;
  png2x: string;
  width: number;
  height: number;
}

export const BRAND_ASSETS = {
  logo: {
    light: {
      svg: '/logo.svg',
      png: '/logo.png',
      png2x: '/logo@2x.png',
      width: 353,
      height: 249,
    },
    dark: {
      svg: '/logo-white.svg',
      png: '/logo-white.png',
      png2x: '/logo-white@2x.png',
      width: 353,
      height: 249,
    },
  },
  mark: {
    light: {
      svg: '/favicon.svg',
      png: '/favicon.png',
      png2x: '/favicon@2x.png',
      width: 256,
      height: 256,
    },
    dark: {
      svg: '/favicon-white.svg',
      png: '/favicon-white.png',
      png2x: '/favicon-white@2x.png',
      width: 256,
      height: 256,
    },
  },
} as const satisfies Record<string, Record<'light' | 'dark', BrandAssetSet>>;

export function getBrandAssets(variant: 'logo' | 'mark', theme: 'light' | 'dark'): BrandAssetSet {
  return BRAND_ASSETS[variant][theme];
}
