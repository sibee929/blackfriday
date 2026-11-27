export interface ColorOption {
  id: string;
  name: string;
  hex: string;
  image: string;
}

export interface JacketProduct {
  id: string; // matches Shopify CSV handle
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

/**
 * Optimiert Shopify-CDN-Bilder für extrem schnelle Ladezeiten in Produktgalerien,
 * während lokale `/assets/...` Pfade direkt unverändert geladen werden.
 */
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
    id: 'khabibi',
    code: '01',
    name: 'Model Khabibi',
    subtitle: 'Lamm-Nappa Aviator mit Shearling-Kragen',
    leatherType: 'Lamm-Nappa',
    priceEur: 177,
    compareAtEur: 354,
    madPrice: 1950,
    tagline: 'Unser Bestseller in seltenen Atelier-Farben mit abnehmbarem Lammfell-Kragen.',
    description:
      'Gefertigt in Marrakesch aus butterweichem 100 % Natur-Lammnappa. Mit cremigem Shearling-Kragen und wärmendem Steppfutter — perfekt für den deutschen Winter.',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    isHeroFeatured: true,
    stockTotal: 631,
    active: true,
    tags: ['exclusive', 'high_margin', 'leather', 'bestseller'],
    colors: [
      {
        id: 'bleu-petrol',
        name: 'Bleu Petrol',
        hex: '#46627F',
        image: '/assets/aistudio/CA15DAC8-4245-4F0F-981D-ED38CFB17326_e15622ac.png',
      },
      {
        id: 'bordeaux',
        name: 'Bordeaux',
        hex: '#57242A',
        image: '/assets/aistudio/70862DF6-3C79-43FE-8378-92C4BDB2DAF9_283b533a.png',
      },
      {
        id: 'olive',
        name: 'Olive',
        hex: '#4A5638',
        image: '/assets/aistudio/D6A9DB8F-33FA-4641-9933-CD24B640F274_b098b756.png',
      },
      {
        id: 'espresso',
        name: 'Espresso',
        hex: '#4A2B1B',
        image: '/assets/aistudio/768B34DB-23B4-4E9D-A2EB-B903551FBD7E_454ba614.png',
      },
      {
        id: 'black',
        name: 'Black',
        hex: '#1B1C1E',
        image: '/assets/aistudio/6A0BB871-0CE4-4849-8059-672DD772565D_6cd038b3.png',
      },
      {
        id: 'taupe',
        name: 'Taupe',
        hex: '#8C7B6E',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/B3220D18-54A8-48D8-A1DA-46DD4091715E.png?v=1792245350',
      },
      {
        id: 'camel',
        name: 'Camel',
        hex: '#A87444',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/Braune_Leder-Bomberjacke_mit_Sherpa-Kragen.png?v=1792258370',
      },
    ],
    gallery: [
          '/assets/aistudio/CA15DAC8-4245-4F0F-981D-ED38CFB17326_e15622ac.png',
          '/assets/aistudio/70862DF6-3C79-43FE-8378-92C4BDB2DAF9_283b533a.png',
          '/assets/aistudio/D6A9DB8F-33FA-4641-9933-CD24B640F274_b098b756.png',
          '/assets/aistudio/768B34DB-23B4-4E9D-A2EB-B903551FBD7E_454ba614.png',
          '/assets/aistudio/6A0BB871-0CE4-4849-8059-672DD772565D_6cd038b3.png',
          '/assets/aistudio/576CBEC6-887A-4A50-8082-308419608474_bc2c4463.png',
          '/assets/aistudio/0028C2A9-E31A-4E2C-A60A-A57339D68D91_acaca684.png',
          '/assets/aistudio/16ACE6C1-515A-4CED-B427-3F970319CB83_e90db936.png',
          '/assets/aistudio/F9DB9E57-2C83-4E40-AC51-30D031A473B6_f3876e7d.png',
          '/assets/aistudio/535414CE-F3D5-49B9-9E69-F7781E2AAD5D_4688a3f4.png',
          '/assets/aistudio/72CEA19B-6D26-4FB4-802F-B0A22164C154_86b246ad.png',
          '/assets/aistudio/4AC86B3D-7BAD-432B-9C50-EC148D7DD9BD_b25f0076.png',
          '/assets/aistudio/48C16E81-9523-46FF-962B-C8AF899880D1_9ebdce3d.png',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/B756FCD7-69BE-4461-9161-299C75896CFC.png?v=1793116193',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/03E850BF-61DD-43F2-84A1-4754A2BFCCD9.png?v=1793116193',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/B3220D18-54A8-48D8-A1DA-46DD4091715E.png?v=1792245350',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/65E1824E-D86D-4DC9-AD87-CA1AF438F41C.jpg?v=1764704945',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/5CF73EDF-0AA8-4EC2-B51F-591796B0C003.png?v=1791721907',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/Gemini_Generated_Image_utg7avutg7avutg7.png?v=1765151863',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/Braune_Leder-Bomberjacke_mit_Sherpa-Kragen.png?v=1792258370',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/E4F0ABFB-8267-43CF-97C5-7E995F859965.jpg?v=1765151863',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/14B3B404-B2D9-411E-8543-175F3F57443F.png?v=1791724371',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/37E25C87-9ECC-46AD-8E48-BE63E81B9CB6.jpg?v=1765151863',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/336F4713-1CCE-44E1-B41C-110CEBC910EB.png?v=1791721633',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/FDC31BFC-A2A9-4D06-B27F-600B4AF3F5A0.jpg?v=1765151863',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/54DDDF76-25EB-4C4F-BE8A-15C6056D2E4E.png?v=1791724371',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/686785A1-C9BD-4062-AACE-939795646997.jpg?v=1765151863',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/8F6D7071-662A-428A-9E62-A4AD362C11AD.jpg?v=1765151863',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/MRKSHI_AD_KHABIB_05_Olive_Street_Cafe_4x5_c3c29524-88e7-45be-866e-d231c9d05c9e.png?v=1793004847'
    ],
  },
  {
    id: 'la-veste-de-cuir-badboy',
    code: '02',
    name: 'Model Badboy',
    subtitle: 'Trucker-Schnitt in 16 seltenen Farben',
    leatherType: 'Lamm-Nappa',
    priceEur: 177,
    compareAtEur: 354,
    madPrice: 1700,
    tagline: 'Unser Farb-Champion: 16 außergewöhnliche Lamm-Nappa-Nuancen von Majorelle bis Mint.',
    description:
      'Moderne Trucker-Silhouette mit klassischem Kragen, Metallknöpfen und zwei Brusttaschen. Statt nur Schwarz und Braun in 16 handgefärbten Tönen verfügbar.',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    stockTotal: 9484,
    active: true,
    tags: ['cuir', 'homme', 'marocain', 'rare-colors'],
    colors: [
      {
        id: 'blue-majorelle',
        name: 'Blue Majorelle',
        hex: '#1D4ED8',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/CAF30BE0-0A80-45A9-84CC-4358DA8D285C.png?v=1769256871',
      },
      {
        id: 'rouge-hermes',
        name: 'Rouge Hermès',
        hex: '#B8332A',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/veste_en_cuir_veritable_rouge.png?v=1790750006',
      },
      {
        id: 'blue-petrol',
        name: 'Blue Petrol',
        hex: '#365C6E',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/7F1AB622-D8D1-4823-8FC3-5D881EBB5523.png?v=1770229026',
      },
      {
        id: 'olive',
        name: 'Olive',
        hex: '#4F5C3A',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/Gemini_Generated_Image_8znxm8znxm8znxm8.png?v=1760470507',
      },
      {
        id: 'mint',
        name: 'Mint',
        hex: '#7FB4A0',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/CEA65E18-C1ED-475F-A3A9-91C4827C193A.png?v=1777031184',
      },
      {
        id: 'jaune',
        name: 'Senf-Gelb',
        hex: '#C68D28',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/FD43D91B-4B33-4CE8-B30D-8EC5E5769300.png?v=1786448779',
      },
      {
        id: 'rouge-bordeaux',
        name: 'Bordeaux',
        hex: '#5D2329',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/68E58008-22D5-4775-81E1-69D23091BA15.png?v=1770315870',
      },
      {
        id: 'taupe',
        name: 'Taupe',
        hex: '#928378',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/CFBA8772-0063-4589-B929-8D0E2438E44C.png?v=1792500111',
      },
      {
        id: 'bleu-bebe',
        name: 'Eisblau',
        hex: '#7EA5C4',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/F2FF0D9C-75E7-4626-8899-9C74852F3671.png?v=1769256872',
      },
      {
        id: 'creme',
        name: 'Crème',
        hex: '#E2D7C5',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/cuir_homme.png?v=1772371909',
      },
      {
        id: 'vert-1',
        name: 'Smaragdgrün',
        hex: '#2F6C50',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/cuir_veste_homme.png?v=1772371955',
      },
      {
        id: 'vert',
        name: 'Waldgrün',
        hex: '#264234',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/64339638-BF81-406E-BB0A-06C4F6376BCE.png?v=1769712519',
      },
      {
        id: 'couleur-camel',
        name: 'Camel',
        hex: '#B47B46',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/6964F208-BB7F-4835-B381-98BA9B718070.png?v=1763575985',
      },
      {
        id: 'navy',
        name: 'Navy',
        hex: '#1E2C42',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/F9342511-1EE7-48F6-B3CE-B3E875F8FA20.png?v=1763575984',
      },
      {
        id: 'marron',
        name: 'Marron',
        hex: '#573624',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/Gemini_Generated_Image_9w4ak69w4ak69w4a.png?v=1763461466',
      },
      {
        id: 'noir-1',
        name: 'Schwarz',
        hex: '#1A1B1E',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/Gemini_Generated_Image_1hoomg1hoomg1hoo_1__imgupscaler.ai_v1_Fast__2K.png?v=1764706646',
      },
    ],
    gallery: [
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/CFBA8772-0063-4589-B929-8D0E2438E44C.png?v=1792500111',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/veste_en_cuir_veritable_couleurs_rares.png?v=1790753385',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/Gemini_Generated_Image_1hoomg1hoomg1hoo_1__imgupscaler.ai_v1_Fast__2K.png?v=1764706646',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/blouson_en_cuir_veritable_couleurs_de_luxe.png?v=1790753555',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/FD43D91B-4B33-4CE8-B30D-8EC5E5769300.png?v=1786448779',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/blouson_en_cuir_veritable_vert_clair.png?v=1790753555',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/Gemini_Generated_Image_8znxm8znxm8znxm8.png?v=1760470507',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/veste_en_cuir_veritable_de_luxe_couleurs_rares.png?v=1790753385',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/veste_en_cuir_veritable_rouge.png?v=1790750006',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/blouson_en_cuir_veritable_bleu_style_denim.png?v=1790753385',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/7F1AB622-D8D1-4823-8FC3-5D881EBB5523.png?v=1770229026',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/veste_en_cuir_veritable_des_leaders.png?v=1790753383',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/cuir_veste_homme.png?v=1772371955',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/veste_en_cuir_veritable_rouge_style_unique.png?v=1790753385',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/68E58008-22D5-4775-81E1-69D23091BA15.png?v=1770315870',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/jacket_en_cuir_veritable_marron.png?v=1790753384',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/CAF30BE0-0A80-45A9-84CC-4358DA8D285C.png?v=1769256871',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/jacket_en_cuir_veritable_noir_businessman.png?v=1790753385',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/CEA65E18-C1ED-475F-A3A9-91C4827C193A.png?v=1777031184',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/blouson_en_cuir_veritable_jaune_moutard.png?v=1790753385',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/Gemini_Generated_Image_9w4ak69w4ak69w4a.png?v=1763461466',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/veste_en_cuir_veritable_bleu_majorelle.png?v=1790753385',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/F2FF0D9C-75E7-4626-8899-9C74852F3671.png?v=1769256872',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/veste_en_cuir_veritable_de_luxe_pour_homme.png?v=1790753385',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/6964F208-BB7F-4835-B381-98BA9B718070.png?v=1763575985',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/veste_en_cuir_veritable_jaune_de_luxe.png?v=1790753385',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/cuir_homme.png?v=1772371909',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/veste_en_cuir_veritable_cadeau.png?v=1790753555',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/F9342511-1EE7-48F6-B3CE-B3E875F8FA20.png?v=1763575984',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/64339638-BF81-406E-BB0A-06C4F6376BCE.png?v=1769712519',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/Gemini_Generated_Image_mexi11mexi11mexi.png?v=1763461466',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/7457D7E8-85B9-4638-8DA3-761EBE54879C.png?v=1763575984',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/rn-image_picker_lib_temp_bb5dd745-9454-4faa-9aba-3aded659f20b.png?v=1763461466',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/Gemini_Generated_Image_7l54a67l54a67l54_imgupscaler.ai_v1_Fast__2K.png?v=1763461466',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/Gemini_Generated_Image_crc0x5crc0x5crc0_imgupscaler.ai_v1_Fast__2K.png?v=1763461466',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/Gemini_Generated_Image_dk3ob5dk3ob5dk3o_1__imgupscaler.ai_v1_Fast__2K.png?v=1772372262',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/Gemini_Generated_Image_893k4g893k4g893k.png?v=1760470507'
    ],
  },
  {
    id: 'la-veste-de-cuir-racer',
    code: '03',
    name: 'Model Racer',
    subtitle: 'Moto-Lederjacke im Vintage-Finish',
    leatherType: 'Vollrind-Nappa',
    priceEur: 177,
    compareAtEur: 354,
    madPrice: 1800,
    tagline: 'Schmaler Stehkragen-Racer in 6 ausdrucksstarken Vintage-Farbtönen.',
    description:
      'Inspiriert von klassischen Café-Racer-Silhouetten. Markante Schulternähte und gewachstes Naturleder mit charaktervoller Struktur.',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    stockTotal: 819,
    active: true,
    tags: ['moto', 'vintage', 'leather'],
    colors: [
      {
        id: 'rouge-bordeaux',
        name: 'Bordeaux',
        hex: '#5D2329',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/ChatGPT_Image_Feb_11_2026_02_56_47_PM.png?v=1770818355',
      },
      {
        id: 'navy',
        name: 'Navy',
        hex: '#20324A',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/58C910F3-B820-4DBD-921A-B5B18132AFF9.png?v=1770818355',
      },
      {
        id: 'couleur-camel',
        name: 'Camel',
        hex: '#B37B48',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/A961D1EF-EB0D-440F-B151-74D98D6F786D.png?v=1770818355',
      },
      {
        id: 'white',
        name: 'Elfenbein-Weiß',
        hex: '#EBE8E1',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/65246718-C4EE-404A-AD3B-AE60AAB4E4E2.png?v=1770389359',
      },
      {
        id: 'marron',
        name: 'Kastanie',
        hex: '#673B23',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/C48C869A-A808-4E76-96CD-051BC2D413A3.jpg?v=1770818355',
      },
      {
        id: 'noir',
        name: 'Schwarz',
        hex: '#191A1C',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/B81A82C4-459E-45A8-8981-839CA62C85C1.png?v=1770388239',
      },
    ],
    gallery: [
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/65246718-C4EE-404A-AD3B-AE60AAB4E4E2.png?v=1770389359',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/B81A82C4-459E-45A8-8981-839CA62C85C1.png?v=1770388239',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/19F125E9-143E-48AE-94F4-BBB72E6C03D3.png?v=1770388239',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/A961D1EF-EB0D-440F-B151-74D98D6F786D.png?v=1770818355',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/374178ED-2EE2-4F03-BACC-5AA0FD1C35A3.png?v=1770388239',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/58C910F3-B820-4DBD-921A-B5B18132AFF9.png?v=1770818355',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/ChatGPT_Image_Feb_11_2026_02_56_47_PM.png?v=1770818355',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/C48C869A-A808-4E76-96CD-051BC2D413A3.jpg?v=1770818355',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/4365CFF0-5C28-4DD5-B38F-E80CF7B5CC28.png?v=1770818355',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/3C78022A-52F5-4B20-A364-E638510EC9DE.png?v=1770818355',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/98562BA0-328D-43CD-BB17-697B864C2518.png?v=1790861909',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/36A32790-E231-4627-BFB5-3643DCB4ED15.png?v=1790861910',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/B5EF885A-768B-4DDE-AA5B-42874FCBF646.png?v=1790861909',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/10DCD3AD-4874-4103-881A-80E7B303EFE9.png?v=1790861909',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/C23F2C4C-375F-40C3-9AB7-4965E6B58D43.png?v=1790861910',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/B83B4F1F-C8E5-4882-A6B4-D2B9609F9BB6.png?v=1790861909'
    ],
  },
  {
    id: 'veste-en-cuir-d-agneau-pour-homme-marvis',
    code: '04',
    name: 'Model Marvis',
    subtitle: 'Minimalistische Lamm-Nappa Jacke',
    leatherType: 'Lamm-Nappa',
    priceEur: 177,
    compareAtEur: 354,
    madPrice: 1400,
    tagline: 'Klare Linie in 100 % reinem marokkanischem Lamm-Nappa — alle Farben 177 €.',
    description:
      'Zeitloser, reduzierter Schnitt für Business und Alltag. Leichtes Tragegefühl ab dem ersten Tag — ideal unter dem Mantel oder solo im Übergang.',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    stockTotal: 783,
    active: true,
    tags: ['cuir', 'homme', 'marocain'],
    colors: [
      {
        id: 'navy',
        name: 'Navy',
        hex: '#22334D',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/IMG_6734_imgupscaler.ai_v1_Fast__2K.png?v=1760444498',
      },
      {
        id: 'couleur-camel',
        name: 'Camel',
        hex: '#B87C44',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/IMG_6735_imgupscaler.ai_v1_Fast__2K.png?v=1760445565',
      },
      {
        id: 'marron',
        name: 'Marron',
        hex: '#593722',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/IMG_6736_imgupscaler.ai_v1_Fast__2K.png?v=1760445535',
      },
      {
        id: 'noir',
        name: 'Schwarz',
        hex: '#18191B',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/IMG_6725_imgupscaler.ai_v1_Fast__2K.png?v=1760444998',
      },
    ],
    gallery: [
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/IMG_6725_imgupscaler.ai_v1_Fast__2K.png?v=1760444998',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/IMG_6727_imgupscaler.ai_v1_Fast__2K.png?v=1760445424',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/IMG_6736_imgupscaler.ai_v1_Fast__2K.png?v=1760445535',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/IMG_6726_imgupscaler.ai_v1_Fast__2K.png?v=1760445452',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/IMG_6735_imgupscaler.ai_v1_Fast__2K.png?v=1760445565',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/IMG_6728_imgupscaler.ai_v1_Fast__2K.png?v=1760444498',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/IMG_6734_imgupscaler.ai_v1_Fast__2K.png?v=1760444498',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/IMG_6738.png?v=1760444498',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/IMG_6737_imgupscaler.ai_v1_Fast__2K.png?v=1760444498',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/IMG_6733_imgupscaler.ai_v1_Fast__2K.png?v=1760445496',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/IMG_6729_imgupscaler.ai_v1_Fast__2K.png?v=1760444498',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/IMG_6730_imgupscaler.ai_v1_Fast__2K.png?v=1760444498',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/Cuirhommemarvis__imgupscaler.ai_v1_Fast__2K.png?v=1760444498'
    ],
  },
  {
    id: 'airmare-g-1-blouson-aviateur-en-cuir-marron',
    code: '05',
    name: 'Model Airmare G-1',
    subtitle: 'Fliegerblouson aus Lamm-Nappa',
    leatherType: 'Lamm-Nappa',
    priceEur: 177,
    compareAtEur: 354,
    madPrice: 1800,
    tagline: 'Authentische G-1 Piloten-Silhouette mit elastischem Bund & Fellkragen.',
    description:
      'Markanter Aviator-Schnitt aus vollnarbigem Lammnappa. Verbindet historischen Piloten-Look mit moderner Passform und weichem Kragen.',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    stockTotal: 156,
    active: true,
    tags: ['exclusive', 'aviator', 'luxury'],
    colors: [
      {
        id: 'marron',
        name: 'Röst-Braun',
        hex: '#5A3420',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/veste-cuir-nappa-marron-homme-mrkshi-col-fourrure.webp_4b5f183c-2a81-4fda-9e15-80593646664d.jpg?v=1794765363',
      },
      {
        id: 'noir-1',
        name: 'Tiefschwarz',
        hex: '#191A1C',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/veste-cuir-nappa-noir-homme-mrkshi-col-fourrure.webp_7cc40a11-0585-4989-8d42-3160143b2782.png?v=1794765313',
      },
    ],
    gallery: [
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/veste-cuir-nappa-marron-homme-mrkshi-col-fourrure.webp_4b5f183c-2a81-4fda-9e15-80593646664d.jpg?v=1794765363',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/Veste_en_cuir_Nappa_noir_pour_homme_MRKSHI_col_en_fourrure_marron_zipp_e_et_poches_rabat_vue_de_face..png?v=1794765518',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/veste-cuir-nappa-noir-homme-mrkshi-col-fourrure.webp_7cc40a11-0585-4989-8d42-3160143b2782.png?v=1794765313',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/Veste_en_cuir_Nappa_marron_aviator.png?v=1794765559',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/Veste_en_cuir_Nappa_noir_pour_homme_MRKSHI_col_en_fourrure_noire_fermeture_zipp_e_et_poches_rabat_vue_de_face..png?v=1794765385',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/Veste_en_cuir_Nappa_noir.png?v=1794765408',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/Veste_en_cuir_Nappa_noir_pour_homme_MRKSHI_col_en_fourrure_noire_fermeture_et_poches_rabat_vue_de_face..png?v=1794765428',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/Veste_en_cuir_Nappa_noir_pour_homme_MRKSHI_col_en_fourrure_vue_de_face..png?v=1794765447',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/Veste_en_cuir_Nappa_noir_pour_homme_MRKSHI_col_en_noire_fermeture_zipp_e_et_poches_rabat_vue_de_face..png?v=1794765464',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/63DC932D-C5D0-4506-8C53-990C41B2AC53.png?v=1794765218',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/E919441D-CBE2-43B4-825A-E7153ADCD0D4.png?v=1794765219'
    ],
  },
  {
    id: 'veste-en-cuir-dusty-pour-homme',
    code: '06',
    name: 'Model Dusty',
    subtitle: 'Slim-Fit Patina Naturleder',
    leatherType: 'Vollrind-Nappa',
    priceEur: 177,
    compareAtEur: 354,
    madPrice: 1840,
    tagline: 'Schlanker Schnitt mit edlem Dusty-Matteffekt in Anthrazit-Braun.',
    description:
      'Für Männer, die einen körpernahen, modernen Sitz bevorzugen. 100 % Naturleder mit charakteristischer handveredelter Dusty-Patina.',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    stockTotal: 123,
    active: true,
    tags: ['exclusive', 'high_margin', 'leather', 'luxury'],
    colors: [
      {
        id: 'dusty-anthrazit',
        name: 'Dusty Anthrazit',
        hex: '#464341',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/image_96185164-c227-48de-a10b-eabbf0bddc8a.png?v=1762623151',
      },
    ],
    gallery: [
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/image_96185164-c227-48de-a10b-eabbf0bddc8a.png?v=1762623151',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/8A24B291-81A0-468A-9274-AD46B7B49DC3.png?v=1762624514',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/unnamed_11.jpg?v=1762624451',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/Gemini_Generated_Image_rhki7arhki7arhki_1.png?v=1762624451',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/ChatGPT_Image_8._Nov._2025_18_08_00.png?v=1762624451',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/ChatGPT_Image_8._Nov._2025_18_18_24.png?v=1762624451',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/Gemini_Generated_Image_ggvm1cggvm1cggvm.png?v=1762624451'
    ],
  },
  {
    id: 'noha-veste-en-cuir-homme-effet-dusty-noir-avec-pigments-gris-100-cuir-veritable',
    code: '07',
    name: 'Model Noha',
    subtitle: 'Dusty Schwarz mit Graupigmenten',
    leatherType: 'Lamm-Nappa',
    priceEur: 177,
    compareAtEur: 354,
    madPrice: 1890,
    tagline: 'Schwarzes Nappa veredelt mit feinen grauen Hand-Pigmenten.',
    description:
      'Jede Jacke ein Unikat: Tiefschwarzes marokkanisches Naturleder wird von Hand leicht mit grauen Pigmenten patiniert.',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    stockTotal: 126,
    active: true,
    tags: ['exclusive', 'high_margin', 'leather', 'luxury'],
    colors: [
      {
        id: 'dusty-grau',
        name: 'Dusty Schwarz-Grau',
        hex: '#313336',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/ChatGPT_Image_Dec_2_2025_05_53_27_PM.png?v=1764703102',
      },
    ],
    gallery: [
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/ChatGPT_Image_Dec_2_2025_05_53_27_PM.png?v=1764703102',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/Gemini_Generated_Image_ms2iqgms2iqgms2i.png?v=1764695375',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/Gemini_Generated_Image_89rz4h89rz4h89rz.png?v=1764695375',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/Veste_en_cuir_homme_effet_Dusty.png?v=1764695261'
    ],
  },
  {
    id: 'cristian-blouson-homme-en-daim-elegant-sportif-100-cuir-veritable',
    code: '08',
    name: 'Model Cristian',
    subtitle: 'Samtiges Natur-Wildleder Blouson',
    leatherType: 'Wildleder',
    priceEur: 177,
    compareAtEur: 354,
    madPrice: 1800,
    tagline: 'Sportlich-eleganter Bomber aus 100 % geschmeidigem Echt-Wildleder.',
    description:
      'Weiches Veloursleder in sportlichem Blouson-Schnitt. Leicht, atmungsaktiv und perfekt kombinierbar zum Pullover oder Hemd.',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    stockTotal: 33,
    active: true,
    tags: ['exclusive', 'suede', 'wildleder', 'luxury'],
    colors: [
      {
        id: 'wildleder-marine',
        name: 'Wildleder Schiefer',
        hex: '#465463',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/016F486C-D799-46E1-99A3-3DDCC89F8F39.jpg?v=1764701144',
      },
    ],
    gallery: [
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/016F486C-D799-46E1-99A3-3DDCC89F8F39.jpg?v=1764701144',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/02FEF89A-0B2A-4F81-AD19-EFC0B6EDE775.jpg?v=1764700489',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/1BE7E55C-0C2C-4D8E-BCE7-E36F33B2FB84.webp?v=1764700489',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/F70D3D2E-4142-43B2-B77F-F4E7B439A459.webp?v=1764700489'
    ],
  },
  {
    id: 'doudoune-en-cuir-dagneau-bleu-marine',
    code: '09',
    name: 'Model PUFFER',
    subtitle: 'Gesteppte Lamm-Nappa Daunenjacke · YKK-Zip',
    leatherType: 'Lamm-Nappa',
    priceEur: 177,
    compareAtEur: 354,
    madPrice: 1940,
    tagline: 'Winter-Statement: Warm wattierte Lamm-Nappa Daunenjacke in 6 seltenen Atelier-Farben.',
    description:
      'Die MRKSHI PUFFER vereint butterweiches 100 % Lamm-Nappa mit voluminöser Winter-Wattierung, Stehkragen, zwei YKK-Reißverschluss-Außentaschen und sicherer Brust-Innentasche — entwickelt für eiskalte Tage in Deutschland.',
    sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
    stockTotal: 723,
    active: true,
    tags: ['cuir', 'homme', 'marocain', 'puffer', 'winter', 'rare-colors'],
    colors: [
      {
        id: 'couleur-camel',
        name: 'Tabak Camel',
        hex: '#9C6B3B',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/MRKSHITabacLederjackeinleichtaufgehelltemTabakbraun.png?v=1794477862',
      },
      {
        id: 'olive',
        name: 'Edles Oliv',
        hex: '#4B563A',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/MRKSHINappa-JackeinedlemOliv.png?v=1794477862',
      },
      {
        id: 'marron',
        name: 'Marron Braun',
        hex: '#5C3422',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/MRKSHINappa-JackeinMarron.png?v=1794477862',
      },
      {
        id: 'navy',
        name: 'Mitternachtsblau',
        hex: '#1B2A44',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/MitternachtsblaueNappa-Lederjacke_Frontansicht.png?v=1794477862',
      },
      {
        id: 'noir',
        name: 'Tiefschwarz',
        hex: '#151515',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/QuiltedLeatherJacketwithMRKSHILabel.png?v=1794477862',
      },
      {
        id: 'rouge-bordeaux',
        name: 'Bordeaux',
        hex: '#661A26',
        image:
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/BordeauxroteMRKSHINappa-Lederjacke.png?v=1794477862',
      },
    ],
    gallery: [
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/MRKSHITabacLederjackeinleichtaufgehelltemTabakbraun.png?v=1794477862',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/QuiltedLeatherJacketwithMRKSHILabel.png?v=1794477862',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/MRKSHINappa-LederjackeinRuckansicht.png?v=1794477862',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/EspressofarbeneNappa-LederjackeimSeitenprofil.png?v=1794477862',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/OffeneMRKSHINappa-DaunenjackemitBurgunderfutter.png?v=1794477862',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/BordeauxroteMRKSHINappa-Lederjacke.png?v=1794477862',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/MRKSHINappa-JackeinedlemOliv.png?v=1794477862',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/MitternachtsblaueNappa-Lederjacke_Frontansicht.png?v=1794477862',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/MRKSHINappa-JackeinMarron.png?v=1794477862',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/BordeauxroteNappa-LederjackeinRuckansicht-2.png?v=1794477862',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/BordeauxroteNappalederjackeimStudioportrat-1.png?v=1794477862',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/Bordeaux-Nappa-JackeimDreiviertelprofil-3.png?v=1794477863',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/MRKSHITabacLederjackeinleichtaufgehelltemTabakbraun-hier-alles-biler-uznd-bleib-excakt-bei-dem.jpg?v=1794477861',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/MRKSHINappa-JackeinedlemOliv-mach-ein-bild-von-der-olive-jacke-in-der-hotelreze.jpg?v=1794477861',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/MRKSHINappa-JackeinMarron-kannst-du-jetzt-bitte-aber-bilder-in-luxus-restaur.jpg?v=1794477861',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/image_20261112_105535.jpg?v=1794477861',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/Mitternachtsblaue_Nappa-Lederjacke_Frontansicht-kannst-du-jetzt-bitte-aber-bilder-in-luxus-restaur.jpg?v=1794477861',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/image_20261112_105528.jpg?v=1794477861',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/image_20261112_105529.jpg?v=1794477861',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/image_20261112_105343.jpg?v=1794477861',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/image_20261112_105333_1.jpg?v=1794477861',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/image_20261112_105107.jpg?v=1794477861',
          'https://cdn.shopify.com/s/files/1/0915/4769/7537/files/MRKSHINappa-JackeinedlemOliv-hier-alles-biler-uznd-bleib-excakt-bei-dem-model.jpg?v=1794477861'
    ],
  },
];
