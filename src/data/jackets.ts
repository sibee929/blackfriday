export interface KhabibiColorVariant {
  id: string;
  name: string;
  word: string;
  cartLabel: string;
  hex: string;
  backdropHex: string;
  frontImage: string;
  modelLookImage?: string;
  dyeNote: string;
}

export interface GalleryShot {
  id: string;
  label: string;
  src: string;
  colorId?: string;
}

export interface AdditionalJacketModel {
  id: string;
  code: string;
  name: string;
  leatherType: 'Lamm-Nappa' | 'Wildleder' | 'Vollrind-Nappa' | 'Rind-Wildleder';
  priceEur: number;
  compareAtEur: number;
  tagline: string;
  colors: { id: string; name: string; hex: string }[];
}

export const KHABIBI_COLORS: KhabibiColorVariant[] = [
  {
    id: 'bleu-petrol',
    name: 'Bleu Petrol',
    word: 'Bleu Petrol',
    cartLabel: 'Bleu Petrol',
    hex: '#46627F',
    backdropHex: '#8FA8BF',
    frontImage: '/assets/aistudio/CA15DAC8-4245-4F0F-981D-ED38CFB17326_e15622ac.png',
    modelLookImage: '/assets/aistudio/535414CE-F3D5-49B9-9E69-F7781E2AAD5D_4688a3f4.png',
    dyeNote: 'Tiefes Rauch-Petrol auf geschmeidigem marokkanischem Lammnappa.',
  },
  {
    id: 'bordeaux',
    name: 'Bordeaux',
    word: 'Bordeaux',
    cartLabel: 'Bordeaux',
    hex: '#57242A',
    backdropHex: '#B8848B',
    frontImage: '/assets/aistudio/70862DF6-3C79-43FE-8378-92C4BDB2DAF9_283b533a.png',
    dyeNote: 'Sattes Atelier-Bordeaux — selten im Herrenleder, markant im Winter.',
  },
  {
    id: 'olive',
    name: 'Olive',
    word: 'Olive',
    cartLabel: 'Olive',
    hex: '#4A5638',
    backdropHex: '#A0AE8C',
    frontImage: '/assets/aistudio/D6A9DB8F-33FA-4641-9933-CD24B640F274_b098b756.png',
    modelLookImage: '/assets/aistudio/72CEA19B-6D26-4FB4-802F-B0A22164C154_86b246ad.png',
    dyeNote: 'Pflanzlich nuanciertes Olivgrün mit naturweißem Shearling-Kragen.',
  },
  {
    id: 'espresso',
    name: 'Espresso',
    word: 'Espresso',
    cartLabel: 'Espresso',
    hex: '#4A2B1B',
    backdropHex: '#B3917D',
    frontImage: '/assets/aistudio/768B34DB-23B4-4E9D-A2EB-B903551FBD7E_454ba614.png',
    modelLookImage: '/assets/aistudio/4AC86B3D-7BAD-432B-9C50-EC148D7DD9BD_b25f0076.png',
    dyeNote: 'Dunkler Röstton mit feiner Natur-Narbung und Ton-in-Ton Bündchen.',
  },
  {
    id: 'black',
    name: 'Black',
    word: 'Black',
    cartLabel: 'Black',
    hex: '#1B1C1E',
    backdropHex: '#9FA5AC',
    frontImage: '/assets/aistudio/6A0BB871-0CE4-4849-8059-672DD772565D_6cd038b3.png',
    modelLookImage: '/assets/aistudio/48C16E81-9523-46FF-962B-C8AF899880D1_9ebdce3d.png',
    dyeNote: 'Seidig-mattes Tiefschwarz in vollnarbigem Lammnappa.',
  },
];

export const KHABIBI_DETAIL_SHOTS: GalleryShot[] = [
  {
    id: 'detail-open',
    label: 'Innenfutter',
    src: '/assets/aistudio/576CBEC6-887A-4A50-8082-308419608474_bc2c4463.png',
  },
  {
    id: 'detail-side',
    label: 'Seitenprofil',
    src: '/assets/aistudio/0028C2A9-E31A-4E2C-A60A-A57339D68D91_acaca684.png',
  },
  {
    id: 'detail-back',
    label: 'Rückenansicht',
    src: '/assets/aistudio/16ACE6C1-515A-4CED-B427-3F970319CB83_e90db936.png',
  },
  {
    id: 'detail-macro',
    label: 'Detail-Makro',
    src: '/assets/aistudio/F9DB9E57-2C83-4E40-AC51-30D031A473B6_f3876e7d.png',
  },
];

export const ADDITIONAL_MODELS: AdditionalJacketModel[] = [
  {
    id: 'majorelle-wildleder-racer',
    code: '02',
    name: 'Model Majorelle',
    leatherType: 'Wildleder',
    priceEur: 169,
    compareAtEur: 319,
    tagline: 'Schmaler Stehkragen-Racer aus samtigem Natur-Velours.',
    colors: [
      { id: 'petrol', name: 'Bleu Petrol', hex: '#2F5963' },
      { id: 'ocker', name: 'Sahara-Ocker', hex: '#A87433' },
      { id: 'salbei', name: 'Salbeigrün', hex: '#6F7E6A' },
      { id: 'black', name: 'Black', hex: '#1B1C1E' },
    ],
  },
  {
    id: 'fes-nappa-overshirt',
    code: '03',
    name: 'Model Fès',
    leatherType: 'Lamm-Nappa',
    priceEur: 159,
    compareAtEur: 289,
    tagline: 'Leichtes Leder-Overshirt für Business & Layering.',
    colors: [
      { id: 'terracotta', name: 'Terracotta', hex: '#8F4531' },
      { id: 'sandstein', name: 'Sandstein', hex: '#B9A38A' },
      { id: 'olive', name: 'Olive', hex: '#4A5638' },
      { id: 'graphit', name: 'Graphit', hex: '#43484F' },
    ],
  },
  {
    id: 'tanger-rindleder-fieldjacket',
    code: '04',
    name: 'Model Tanger',
    leatherType: 'Vollrind-Nappa',
    priceEur: 177,
    compareAtEur: 359,
    tagline: 'Markantes Vier-Taschen-Fieldjacket aus robustem Rindleder.',
    colors: [
      { id: 'bordeaux', name: 'Bordeaux', hex: '#57242A' },
      { id: 'waldgruen', name: 'Waldgrün', hex: '#2B4232' },
      { id: 'cognac', name: 'Kastanie', hex: '#7E4B28' },
      { id: 'marine', name: 'Nachtblau', hex: '#223045' },
    ],
  },
  {
    id: 'essaouira-suede-blouson',
    code: '05',
    name: 'Model Essaouira',
    leatherType: 'Rind-Wildleder',
    priceEur: 165,
    compareAtEur: 309,
    tagline: 'Entspannter Blouson-Schnitt in kühlen Küsten-Nuancen.',
    colors: [
      { id: 'atlantik', name: 'Atlantik-Blau', hex: '#5C7080' },
      { id: 'taupe', name: 'Sand-Taupe', hex: '#937C63' },
      { id: 'khaki', name: 'Wüsten-Khaki', hex: '#7A7459' },
      { id: 'tabak', name: 'Tabak', hex: '#6C4A33' },
    ],
  },
  {
    id: 'rif-vintage-pilot',
    code: '06',
    name: 'Model Rif',
    leatherType: 'Vollrind-Nappa',
    priceEur: 177,
    compareAtEur: 349,
    tagline: 'Gewachstes Natur-Rindleder mit abnehmbarem Kragen.',
    colors: [
      { id: 'tannengruen', name: 'Tannengrün', hex: '#283F33' },
      { id: 'rostrot', name: 'Rostrot', hex: '#783628' },
      { id: 'espresso', name: 'Espresso', hex: '#4A2B1B' },
      { id: 'marine', name: 'Tief-Marine', hex: '#1E2C40' },
    ],
  },
  {
    id: 'casablanca-minimal-biker',
    code: '07',
    name: 'Model Casablanca',
    leatherType: 'Lamm-Nappa',
    priceEur: 177,
    compareAtEur: 339,
    tagline: 'Clean-geschnittene Bikerjacke ohne auffällige Schnallen.',
    colors: [
      { id: 'schiefer', name: 'Schieferblau', hex: '#3B4E64' },
      { id: 'bordeaux', name: 'Bordeaux', hex: '#57242A' },
      { id: 'olive', name: 'Olive', hex: '#4A5638' },
      { id: 'black', name: 'Black', hex: '#1B1C1E' },
    ],
  },
];

export const EU_SIZES = ['S (46)', 'M (48)', 'L (50)', 'XL (52)', '2XL (54)', '3XL (56)'] as const;

const preloaded = new Set<string>();
const cutoutCache = new Map<string, string>();

export function preloadGalleryImages(urls: string[]): void {
  if (typeof window === 'undefined') return;
  for (const url of urls) {
    if (!url || preloaded.has(url)) continue;
    preloaded.add(url);
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    if (typeof img.decode === 'function') {
      img.decode().catch(() => {});
    }
  }
}

export function getAllKhabibiUrls(): string[] {
  const urls = new Set<string>();
  for (const c of KHABIBI_COLORS) {
    urls.add(c.frontImage);
    if (c.modelLookImage) urls.add(c.modelLookImage);
  }
  for (const d of KHABIBI_DETAIL_SHOTS) {
    urls.add(d.src);
  }
  return Array.from(urls);
}

/**
 * Flood-fills pure white studio background connected to the outer edges of a front packshot
 * into full transparency so the jacket & cream shearling collar sit crisply over any colored backdrop
 * and giant white typography without tinting the collar.
 */
export async function createTransparentCutout(src: string): Promise<string> {
  if (typeof window === 'undefined') return src;
  const cached = cutoutCache.get(src);
  if (cached) return cached;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      try {
        const maxDim = 960;
        const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(src);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);

        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        const visited = new Uint8Array(w * h);
        const queue = new Int32Array(w * h);
        let head = 0;
        let tail = 0;

        const isStudioBg = (idx: number): boolean => {
          const p = idx * 4;
          const r = data[p];
          const g = data[p + 1];
          const b = data[p + 2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          return r >= 238 && g >= 238 && b >= 238 && max - min <= 16;
        };

        const pushIfBg = (x: number, y: number) => {
          if (x < 0 || x >= w || y < 0 || y >= h) return;
          const idx = y * w + x;
          if (visited[idx]) return;
          if (isStudioBg(idx)) {
            visited[idx] = 1;
            queue[tail++] = idx;
          }
        };

        // Seed outer perimeter
        for (let x = 0; x < w; x++) {
          pushIfBg(x, 0);
          pushIfBg(x, h - 1);
        }
        for (let y = 0; y < h; y++) {
          pushIfBg(0, y);
          pushIfBg(w - 1, y);
        }

        while (head < tail) {
          const idx = queue[head++];
          const p = idx * 4;
          data[p + 3] = 0;

          const x = idx % w;
          const y = (idx - x) / w;
          pushIfBg(x + 1, y);
          pushIfBg(x - 1, y);
          pushIfBg(x, y + 1);
          pushIfBg(x, y - 1);
        }

        // 1px anti-aliased edge feather on boundary pixels adjacent to cleared background
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = y * w + x;
            if (visited[idx]) continue;
            if (
              visited[idx - 1] ||
              visited[idx + 1] ||
              visited[idx - w] ||
              visited[idx + w]
            ) {
              const p = idx * 4;
              const lum = (data[p] + data[p + 1] + data[p + 2]) / 3;
              if (lum > 225) {
                const alphaFactor = Math.max(0, Math.min(1, (250 - lum) / 28));
                data[p + 3] = Math.round(data[p + 3] * alphaFactor);
              }
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(src);
              return;
            }
            const url = URL.createObjectURL(blob);
            cutoutCache.set(src, url);
            resolve(url);
          },
          'image/png'
        );
      } catch {
        resolve(src);
      }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}
