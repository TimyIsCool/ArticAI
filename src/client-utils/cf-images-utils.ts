import { env } from '~/env/client.mjs';

// from options available in CF Flexible variants:
// https://developers.cloudflare.com/images/cloudflare-images/transform/flexible-variants/
export type EdgeUrlProps = {
  src: string;
  name?: string | null;
  width?: number | undefined;
  height?: number | undefined;
  fit?: 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
  anim?: boolean;
  blur?: number; // 0-250
  quality?: number; // 0-100
  gravity?: 'auto' | 'side' | 'left' | 'right' | 'top' | 'bottom';
  metadata?: 'keep' | 'copyright' | 'none';
  background?: string;
  gamma?: number;
};

export function getEdgeUrl(src: string, { name, ...variantParams }: Omit<EdgeUrlProps, 'src'>) {
  if (!src || src.startsWith('http') || src.startsWith('blob')) return src;

  const params = Object.entries(variantParams)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`)
    .join(',');

  return [env.NEXT_PUBLIC_IMAGE_LOCATION, src, params.toString(), name ?? src].join('/');
}
