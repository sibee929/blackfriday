export interface ColorOption {
  id: string;
  name: string;
  hex: string;
  image: string;
  outOfStock?: boolean;
}

export interface JacketProduct {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  leatherType: 'Lamm-Nappa' | 'Wildleder' | 'Vollrind-Nappa' | 'Rind-Wildleder';
  priceEur: number;
  compareAtEur: number;
  madPrice: number;
  tagline: string;
  description: string;
  sizes: string[];
  colors: ColorOption[];
  gallery: string[];
  stockTotal: number;
  active: boolean;
  tags: string[];
  isHeroFeatured?: boolean;
}

export function optimizeProductImage(src: string, width = 720): string {
  if (!src) return '';
  if (src.startsWith('/assets/')) return src;
  if (src.includes('cdn.shopify.com')) {
    const sep = src.includes('?') ? '&' : '?';
    return `${src}${sep}width=${width}`;
  }
  return src;
}

export const INITIAL_EIGHT_PRODUCTS: JacketProduct[] = [
  {
    "id": "khabibi",
    "code": "01",
    "name": "Model Khabibi",
    "subtitle": "Lamm-Nappa Aviator mit Shearling-Kragen",
    "leatherType": "Lamm-Nappa",
    "priceEur": 177,
    "compareAtEur": 354,
    "madPrice": 1950,
    "tagline": "Unser Bestseller in seltenen Atelier-Farben mit abnehmbarem Lammfell-Kragen.",
    "description": "Gefertigt in Marrakesch aus butterweichem 100 % Natur-Lammnappa. Mit cremigem Shearling-Kragen und wärmendem Steppfutter — perfekt für den deutschen Winter.",
    "sizes": [
      "S",
      "M",
      "L",
      "XL",
      "2XL",
      "3XL"
    ],
    "isHeroFeatured": true,
    "stockTotal": 631,
    "active": true,
    "tags": [
      "exclusive",
      "high_margin",
      "leather",
      "bestseller"
    ],
    "colors": [
      {
        "id": "bleu-petrol",
        "name": "Bleu Petrol",
        "hex": "#46627F",
        "image": "/assets/aistudio/CA15DAC8-4245-4F0F-981D-ED38CFB17326_e15622ac.webp"
      },
      {
        "id": "bordeaux",
        "name": "Bordeaux",
        "hex": "#57242A",
        "image": "/assets/aistudio/70862DF6-3C79-43FE-8378-92C4BDB2DAF9_283b533a.webp"
      },
      {
        "id": "olive",
        "name": "Olive",
        "hex": "#4A5638",
        "image": "/assets/aistudio/D6A9DB8F-33FA-4641-9933-CD24B640F274_b098b756.webp"
      },
      {
        "id": "espresso",
        "name": "Espresso",
        "hex": "#4A2B1B",
        "image": "/assets/aistudio/768B34DB-23B4-4E9D-A2EB-B903551FBD7E_454ba614.webp"
      },
      {
        "id": "black",
        "name": "Black",
        "hex": "#1B1C1E",
        "image": "/assets/aistudio/6A0BB871-0CE4-4849-8059-672DD772565D_6cd038b3.webp"
      },
      {
        "id": "taupe",
        "name": "Taupe",
        "hex": "#8C7B6E",
        "image": "/assets/catalog/img_6df9d2a9ee68.webp"
      },
      {
        "id": "camel",
        "name": "Camel",
        "hex": "#A87444",
        "image": "/assets/catalog/img_1e27953132ce.webp"
      }
    ],
    "gallery": [
      "/assets/aistudio/CA15DAC8-4245-4F0F-981D-ED38CFB17326_e15622ac.webp",
      "/assets/aistudio/70862DF6-3C79-43FE-8378-92C4BDB2DAF9_283b533a.webp",
      "/assets/aistudio/D6A9DB8F-33FA-4641-9933-CD24B640F274_b098b756.webp",
      "/assets/aistudio/768B34DB-23B4-4E9D-A2EB-B903551FBD7E_454ba614.webp",
      "/assets/aistudio/6A0BB871-0CE4-4849-8059-672DD772565D_6cd038b3.webp",
      "/assets/aistudio/576CBEC6-887A-4A50-8082-308419608474_bc2c4463.webp",
      "/assets/aistudio/0028C2A9-E31A-4E2C-A60A-A57339D68D91_acaca684.webp",
      "/assets/aistudio/16ACE6C1-515A-4CED-B427-3F970319CB83_e90db936.webp",
      "/assets/aistudio/F9DB9E57-2C83-4E40-AC51-30D031A473B6_f3876e7d.webp",
      "/assets/aistudio/535414CE-F3D5-49B9-9E69-F7781E2AAD5D_4688a3f4.webp",
      "/assets/aistudio/72CEA19B-6D26-4FB4-802F-B0A22164C154_86b246ad.webp",
      "/assets/aistudio/4AC86B3D-7BAD-432B-9C50-EC148D7DD9BD_b25f0076.webp",
      "/assets/aistudio/48C16E81-9523-46FF-962B-C8AF899880D1_9ebdce3d.webp",
      "/assets/catalog/img_139990cf1701.webp",
      "/assets/catalog/img_ebe4ac385446.webp",
      "/assets/catalog/img_6df9d2a9ee68.webp",
      "/assets/catalog/img_c7fd8e91ad70.webp",
      "/assets/catalog/img_10878b8e90d1.webp",
      "/assets/catalog/img_b537602f438a.webp",
      "/assets/catalog/img_1e27953132ce.webp",
      "/assets/catalog/img_86b09ca87070.webp",
      "/assets/catalog/img_47a7f04fadba.webp",
      "/assets/catalog/img_5fa305acb59c.webp",
      "/assets/catalog/img_c96e452522a2.webp",
      "/assets/catalog/img_2c97de4009b0.webp",
      "/assets/catalog/img_70e23845f69d.webp",
      "/assets/catalog/img_ea0cd61181d7.webp",
      "/assets/catalog/img_a4a1cf4efd12.webp",
      "/assets/catalog/img_1825ca2a2def.webp"
    ]
  },
  {
    "id": "doudoune-en-cuir-dagneau-bleu-marine",
    "code": "02",
    "name": "Model PUFFER",
    "subtitle": "Gesteppte Lamm-Nappa Daunenjacke · YKK-Zip",
    "leatherType": "Lamm-Nappa",
    "priceEur": 177,
    "compareAtEur": 354,
    "madPrice": 1940,
    "tagline": "Winter-Statement: Warm wattierte Lamm-Nappa Daunenjacke in 6 seltenen Atelier-Farben.",
    "description": "Die MRKSHI PUFFER vereint butterweiches 100 % Lamm-Nappa mit voluminöser Winter-Wattierung, Stehkragen, zwei YKK-Reißverschluss-Außentaschen und sicherer Brust-Innentasche — entwickelt für eiskalte Tage in Deutschland.",
    "sizes": [
      "S",
      "M",
      "L",
      "XL",
      "2XL",
      "3XL"
    ],
    "stockTotal": 723,
    "active": true,
    "tags": [
      "cuir",
      "homme",
      "marocain",
      "puffer",
      "winter",
      "rare-colors"
    ],
    "colors": [
      {
        "id": "olive",
        "name": "Edles Oliv",
        "hex": "#4B563A",
        "image": "/assets/catalog/img_3b9bfd2ec68a.webp"
      },
      {
        "id": "marron",
        "name": "Marron Braun",
        "hex": "#5C3422",
        "image": "/assets/catalog/img_3af0f3d6cadf.webp"
      },
      {
        "id": "navy",
        "name": "Mitternachtsblau",
        "hex": "#1B2A44",
        "image": "/assets/catalog/img_324d24896307.webp"
      },
      {
        "id": "noir",
        "name": "Tiefschwarz",
        "hex": "#151515",
        "image": "/assets/catalog/img_dcb73c811436.webp"
      },
      {
        "id": "rouge-bordeaux",
        "name": "Bordeaux",
        "hex": "#661A26",
        "image": "/assets/catalog/img_b7b83d0e6e4b.webp",
        "outOfStock": true
      }
    ],
    "gallery": [
      "/assets/catalog/img_dcb73c811436.webp",
      "/assets/catalog/img_b7b83d0e6e4b.webp",
      "/assets/catalog/img_3b9bfd2ec68a.webp",
      "/assets/catalog/img_324d24896307.webp",
      "/assets/catalog/img_3af0f3d6cadf.webp",
      "/assets/catalog/img_1d6eb231404a.webp",
      "/assets/catalog/img_e12606ca15f8.webp",
      "/assets/catalog/img_6c06f9325f75.webp",
      "/assets/catalog/img_19b152f21ba2.webp",
      "/assets/catalog/img_94d4dbc2ae57.webp",
      "/assets/catalog/img_c210ffe78bf6.webp",
      "/assets/catalog/img_c9ccd4984b3b.webp",
      "/assets/catalog/img_1dea643fc852.webp",
      "/assets/catalog/img_30794a3693ca.webp",
      "/assets/catalog/img_6a802cc3fbed.webp",
      "/assets/catalog/img_6750fc5de3a5.webp",
      "/assets/catalog/img_2b6036b4aded.webp",
      "/assets/catalog/img_dc18be78ab75.webp"
    ]
  },
  {
    "id": "la-veste-de-cuir-badboy",
    "code": "03",
    "name": "Model Badboy",
    "subtitle": "Trucker-Schnitt in 16 seltenen Farben",
    "leatherType": "Lamm-Nappa",
    "priceEur": 177,
    "compareAtEur": 354,
    "madPrice": 1700,
    "tagline": "Unser Farb-Champion: 16 außergewöhnliche Lamm-Nappa-Nuancen von Majorelle bis Mint.",
    "description": "Moderne Trucker-Silhouette mit klassischem Kragen, Metallknöpfen und zwei Brusttaschen. Statt nur Schwarz und Braun in 16 handgefärbten Tönen verfügbar.",
    "sizes": [
      "S",
      "M",
      "L",
      "XL",
      "2XL",
      "3XL"
    ],
    "stockTotal": 9484,
    "active": true,
    "tags": [
      "cuir",
      "homme",
      "marocain",
      "rare-colors"
    ],
    "colors": [
      {
        "id": "blue-majorelle",
        "name": "Blue Majorelle",
        "hex": "#1D4ED8",
        "image": "/assets/catalog/img_b1a97f7dc6b9.webp"
      },
      {
        "id": "rouge-hermes",
        "name": "Rouge Hermès",
        "hex": "#B8332A",
        "image": "/assets/catalog/img_b1b6cfdd7f05.webp"
      },
      {
        "id": "blue-petrol",
        "name": "Blue Petrol",
        "hex": "#365C6E",
        "image": "/assets/catalog/img_f12bcfa08f53.webp"
      },
      {
        "id": "olive",
        "name": "Olive",
        "hex": "#4F5C3A",
        "image": "/assets/catalog/img_5d511338917a.webp"
      },
      {
        "id": "mint",
        "name": "Mint",
        "hex": "#7FB4A0",
        "image": "/assets/catalog/img_0460cc4aee61.webp"
      },
      {
        "id": "jaune",
        "name": "Senf-Gelb",
        "hex": "#C68D28",
        "image": "/assets/catalog/img_a812cecd34a3.webp"
      },
      {
        "id": "rouge-bordeaux",
        "name": "Bordeaux",
        "hex": "#5D2329",
        "image": "/assets/catalog/img_2375caa071c6.webp"
      },
      {
        "id": "taupe",
        "name": "Taupe",
        "hex": "#928378",
        "image": "/assets/catalog/img_307e3d081369.webp"
      },
      {
        "id": "bleu-bebe",
        "name": "Eisblau",
        "hex": "#7EA5C4",
        "image": "/assets/catalog/img_f9801f8e9caf.webp"
      },
      {
        "id": "creme",
        "name": "Crème",
        "hex": "#E2D7C5",
        "image": "/assets/catalog/img_616ec8ddc1ea.webp"
      },
      {
        "id": "vert-1",
        "name": "Smaragdgrün",
        "hex": "#2F6C50",
        "image": "/assets/catalog/img_48fc6e3ffadc.webp"
      },
      {
        "id": "vert",
        "name": "Waldgrün",
        "hex": "#264234",
        "image": "/assets/catalog/img_227f3225e075.webp"
      },
      {
        "id": "couleur-camel",
        "name": "Camel",
        "hex": "#B47B46",
        "image": "/assets/catalog/img_decb1b4a75cc.webp"
      },
      {
        "id": "navy",
        "name": "Navy",
        "hex": "#1E2C42",
        "image": "/assets/catalog/img_ddec2cedb543.webp"
      },
      {
        "id": "marron",
        "name": "Marron",
        "hex": "#573624",
        "image": "/assets/catalog/img_6d6f18268493.webp"
      },
      {
        "id": "noir-1",
        "name": "Schwarz",
        "hex": "#1A1B1E",
        "image": "/assets/catalog/img_e43ded9c5fcd.webp"
      }
    ],
    "gallery": [
      "/assets/catalog/img_307e3d081369.webp",
      "/assets/catalog/img_99cbb097744b.webp",
      "/assets/catalog/img_e43ded9c5fcd.webp",
      "/assets/catalog/img_012015a32e0f.webp",
      "/assets/catalog/img_a812cecd34a3.webp",
      "/assets/catalog/img_cd534b156e6f.webp",
      "/assets/catalog/img_5d511338917a.webp",
      "/assets/catalog/img_b6af40b7524e.webp",
      "/assets/catalog/img_b1b6cfdd7f05.webp",
      "/assets/catalog/img_29eb8013042d.webp",
      "/assets/catalog/img_f12bcfa08f53.webp",
      "/assets/catalog/img_3971038b7b6c.webp",
      "/assets/catalog/img_48fc6e3ffadc.webp",
      "/assets/catalog/img_c4e5bf2c35f9.webp",
      "/assets/catalog/img_2375caa071c6.webp",
      "/assets/catalog/img_83e958a7955d.webp",
      "/assets/catalog/img_b1a97f7dc6b9.webp",
      "/assets/catalog/img_ed1b7f1e7ae9.webp",
      "/assets/catalog/img_0460cc4aee61.webp",
      "/assets/catalog/img_58b6af412de1.webp",
      "/assets/catalog/img_6d6f18268493.webp",
      "/assets/catalog/img_baabca66639b.webp",
      "/assets/catalog/img_f9801f8e9caf.webp",
      "/assets/catalog/img_8e382f526540.webp",
      "/assets/catalog/img_decb1b4a75cc.webp",
      "/assets/catalog/img_89dce997108e.webp",
      "/assets/catalog/img_616ec8ddc1ea.webp",
      "/assets/catalog/img_25fe7788aaad.webp",
      "/assets/catalog/img_ddec2cedb543.webp",
      "/assets/catalog/img_227f3225e075.webp",
      "/assets/catalog/img_3449f33b06bd.webp",
      "/assets/catalog/img_d9c55bc8c7cc.webp",
      "/assets/catalog/img_dc0c82cb8b14.webp",
      "/assets/catalog/img_22d7029b9b48.webp",
      "/assets/catalog/img_cd50dda4d4a3.webp",
      "/assets/catalog/img_1a32b5964270.webp",
      "/assets/catalog/img_781cfcff60cb.webp"
    ]
  },
  {
    "id": "la-veste-de-cuir-racer",
    "code": "04",
    "name": "Model Racer",
    "subtitle": "Moto-Lederjacke im Vintage-Finish",
    "leatherType": "Vollrind-Nappa",
    "priceEur": 177,
    "compareAtEur": 354,
    "madPrice": 1800,
    "tagline": "Schmaler Stehkragen-Racer in 6 ausdrucksstarken Vintage-Farbtönen.",
    "description": "Inspiriert von klassischen Café-Racer-Silhouetten. Markante Schulternähte und gewachstes Naturleder mit charaktervoller Struktur.",
    "sizes": [
      "S",
      "M",
      "L",
      "XL",
      "2XL",
      "3XL"
    ],
    "stockTotal": 819,
    "active": true,
    "tags": [
      "moto",
      "vintage",
      "leather"
    ],
    "colors": [
      {
        "id": "rouge-bordeaux",
        "name": "Bordeaux",
        "hex": "#5D2329",
        "image": "/assets/catalog/img_88df69b9f21d.webp"
      },
      {
        "id": "navy",
        "name": "Navy",
        "hex": "#20324A",
        "image": "/assets/catalog/img_0cf455be9a3e.webp"
      },
      {
        "id": "couleur-camel",
        "name": "Camel",
        "hex": "#B37B48",
        "image": "/assets/catalog/img_15cf08bc0636.webp"
      },
      {
        "id": "white",
        "name": "Elfenbein-Weiß",
        "hex": "#EBE8E1",
        "image": "/assets/catalog/img_b422ca826098.webp"
      },
      {
        "id": "marron",
        "name": "Kastanie",
        "hex": "#673B23",
        "image": "/assets/catalog/img_7722e8420e93.webp"
      },
      {
        "id": "noir",
        "name": "Schwarz",
        "hex": "#191A1C",
        "image": "/assets/catalog/img_48679cf1a684.webp"
      }
    ],
    "gallery": [
      "/assets/catalog/img_b422ca826098.webp",
      "/assets/catalog/img_48679cf1a684.webp",
      "/assets/catalog/img_aee6f5e7baed.webp",
      "/assets/catalog/img_15cf08bc0636.webp",
      "/assets/catalog/img_b97fb306afd6.webp",
      "/assets/catalog/img_0cf455be9a3e.webp",
      "/assets/catalog/img_88df69b9f21d.webp",
      "/assets/catalog/img_7722e8420e93.webp",
      "/assets/catalog/img_385f4a363edc.webp",
      "/assets/catalog/img_24c2c48b5ced.webp",
      "/assets/catalog/img_70c57e8d6777.webp",
      "/assets/catalog/img_0576259789a9.webp",
      "/assets/catalog/img_74ca3fcde998.webp",
      "/assets/catalog/img_7293bb2a368a.webp"
    ]
  },
  {
    "id": "veste-en-cuir-d-agneau-pour-homme-marvis",
    "code": "05",
    "name": "Model Marvis",
    "subtitle": "Minimalistische Lamm-Nappa Jacke",
    "leatherType": "Lamm-Nappa",
    "priceEur": 177,
    "compareAtEur": 354,
    "madPrice": 1400,
    "tagline": "Klare Linie in 100 % reinem marokkanischem Lamm-Nappa — alle Farben 177 €.",
    "description": "Zeitloser, reduzierter Schnitt für Business und Alltag. Leichtes Tragegefühl ab dem ersten Tag — ideal unter dem Mantel oder solo im Übergang.",
    "sizes": [
      "S",
      "M",
      "L",
      "XL",
      "2XL",
      "3XL"
    ],
    "stockTotal": 783,
    "active": true,
    "tags": [
      "cuir",
      "homme",
      "marocain"
    ],
    "colors": [
      {
        "id": "navy",
        "name": "Navy",
        "hex": "#22334D",
        "image": "/assets/catalog/img_61751dcba776.webp"
      },
      {
        "id": "couleur-camel",
        "name": "Camel",
        "hex": "#B87C44",
        "image": "/assets/catalog/img_80d3de9b6637.webp"
      },
      {
        "id": "marron",
        "name": "Marron",
        "hex": "#593722",
        "image": "/assets/catalog/img_e0ff1d617d28.webp"
      },
      {
        "id": "noir",
        "name": "Schwarz",
        "hex": "#18191B",
        "image": "/assets/catalog/img_0f1cfffcf0a1.webp"
      }
    ],
    "gallery": [
      "/assets/catalog/img_0f1cfffcf0a1.webp",
      "/assets/catalog/img_905602912faa.webp",
      "/assets/catalog/img_e0ff1d617d28.webp",
      "/assets/catalog/img_7e9c6bf1b326.webp",
      "/assets/catalog/img_80d3de9b6637.webp",
      "/assets/catalog/img_99cbf9b870da.webp",
      "/assets/catalog/img_61751dcba776.webp",
      "/assets/catalog/img_aec3b8102b45.webp",
      "/assets/catalog/img_d0a485076601.webp",
      "/assets/catalog/img_9f8959b06998.webp",
      "/assets/catalog/img_7df153febc0b.webp"
    ]
  },
  {
    "id": "airmare-g-1-blouson-aviateur-en-cuir-marron",
    "code": "06",
    "name": "Model Airmare G-1",
    "subtitle": "Fliegerblouson aus Lamm-Nappa",
    "leatherType": "Lamm-Nappa",
    "priceEur": 177,
    "compareAtEur": 354,
    "madPrice": 1800,
    "tagline": "Authentische G-1 Piloten-Silhouette mit elastischem Bund & Fellkragen.",
    "description": "Markanter Aviator-Schnitt aus vollnarbigem Lammnappa. Verbindet historischen Piloten-Look mit moderner Passform und weichem Kragen.",
    "sizes": [
      "S",
      "M",
      "L",
      "XL",
      "2XL",
      "3XL"
    ],
    "stockTotal": 156,
    "active": true,
    "tags": [
      "exclusive",
      "aviator",
      "luxury"
    ],
    "colors": [
      {
        "id": "noir-1",
        "name": "Tiefschwarz",
        "hex": "#191A1C",
        "image": "/assets/catalog/img_d771662a8d23.webp"
      }
    ],
    "gallery": [
      "/assets/catalog/img_b77d03c0fb70.webp",
      "/assets/catalog/img_d771662a8d23.webp",
      "/assets/catalog/img_017a85162d7b.webp",
      "/assets/catalog/img_023d03f211b4.webp",
      "/assets/catalog/img_d84b4c3aa389.webp"
    ]
  },
  {
    "id": "veste-en-cuir-dusty-pour-homme",
    "code": "07",
    "name": "Model Dusty",
    "subtitle": "Slim-Fit Patina Naturleder",
    "leatherType": "Vollrind-Nappa",
    "priceEur": 177,
    "compareAtEur": 354,
    "madPrice": 1840,
    "tagline": "Schlanker Schnitt mit edlem Dusty-Matteffekt in Anthrazit-Braun.",
    "description": "Für Männer, die einen körpernahen, modernen Sitz bevorzugen. 100 % Naturleder mit charakteristischer handveredelter Dusty-Patina.",
    "sizes": [
      "S",
      "M",
      "L",
      "XL",
      "2XL",
      "3XL"
    ],
    "stockTotal": 123,
    "active": true,
    "tags": [
      "exclusive",
      "high_margin",
      "leather",
      "luxury"
    ],
    "colors": [
      {
        "id": "dusty-anthrazit",
        "name": "Dusty Anthrazit",
        "hex": "#464341",
        "image": "/assets/catalog/img_5701faa248fc.webp"
      }
    ],
    "gallery": [
      "/assets/catalog/img_5701faa248fc.webp",
      "/assets/catalog/img_524fc7b22782.webp"
    ]
  },
  {
    "id": "noha-veste-en-cuir-homme-effet-dusty-noir-avec-pigments-gris-100-cuir-veritable",
    "code": "08",
    "name": "Model Noha",
    "subtitle": "Dusty Schwarz mit Graupigmenten",
    "leatherType": "Lamm-Nappa",
    "priceEur": 177,
    "compareAtEur": 354,
    "madPrice": 1890,
    "tagline": "Schwarzes Nappa veredelt mit feinen grauen Hand-Pigmenten.",
    "description": "Jede Jacke ein Unikat: Tiefschwarzes marokkanisches Naturleder wird von Hand leicht mit grauen Pigmenten patiniert.",
    "sizes": [
      "S",
      "M",
      "L",
      "XL",
      "2XL",
      "3XL"
    ],
    "stockTotal": 126,
    "active": true,
    "tags": [
      "exclusive",
      "high_margin",
      "leather",
      "luxury"
    ],
    "colors": [
      {
        "id": "dusty-grau",
        "name": "Dusty Schwarz-Grau",
        "hex": "#313336",
        "image": "/assets/catalog/img_db20748519c5.webp"
      }
    ],
    "gallery": [
      "/assets/catalog/img_db20748519c5.webp",
      "/assets/catalog/img_9072c91411c9.webp",
      "/assets/catalog/img_e097a754b8e6.webp"
    ]
  },
  {
    "id": "cristian-blouson-homme-en-daim-elegant-sportif-100-cuir-veritable",
    "code": "09",
    "name": "Model Cristian",
    "subtitle": "Samtiges Natur-Wildleder Blouson",
    "leatherType": "Wildleder",
    "priceEur": 177,
    "compareAtEur": 354,
    "madPrice": 1800,
    "tagline": "Sportlich-eleganter Bomber aus 100 % geschmeidigem Echt-Wildleder.",
    "description": "Weiches Veloursleder in sportlichem Blouson-Schnitt. Leicht, atmungsaktiv und perfekt kombinierbar zum Pullover oder Hemd.",
    "sizes": [
      "S",
      "M",
      "L",
      "XL",
      "2XL",
      "3XL"
    ],
    "stockTotal": 33,
    "active": true,
    "tags": [
      "exclusive",
      "suede",
      "wildleder",
      "luxury"
    ],
    "colors": [
      {
        "id": "wildleder-marine",
        "name": "Wildleder Schiefer",
        "hex": "#465463",
        "image": "/assets/catalog/img_9933d137d62d.webp"
      }
    ],
    "gallery": [
      "/assets/catalog/img_9933d137d62d.webp"
    ]
  }
];
