export interface District {
  name: string;
  region: string;
}

export interface Region {
  name: string;
  districts: District[];
}

// Special regions for subtransmission
export const SUBTRANSMISSION_REGIONS = [
  'SUBTRANSMISSION ACCRA',
  'SUBTRANSMISSION ASHANTI'
] as const;

// Regular regions
export const REGIONS = [
  'ACCRA EAST REGION',
  'ACCRA WEST REGION',
  'ASHANTI EAST REGION',
  'ASHANTI WEST REGION',
  'ASHANTI SOUTH REGION',
  'CENTRAL REGION',
  'EASTERN REGION',
  'TEMA REGION',
  'VOLTA REGION',
  'WESTERN REGION'
] as const;

// All regions including subtransmission
export const ALL_REGIONS = [...SUBTRANSMISSION_REGIONS, ...REGIONS] as const;

// Districts data
export const DISTRICTS: District[] = [
  // Subtransmission Accra
  { name: 'SUBSTATION MAINTENANCE', region: 'SUBTRANSMISSION ACCRA' },
  { name: 'CONTROL OPERATIONS', region: 'SUBTRANSMISSION ACCRA' },
  { name: 'NETWORK MAINTENANCE', region: 'SUBTRANSMISSION ACCRA' },
  { name: 'PROTECTION MAINTENANCE', region: 'SUBTRANSMISSION ACCRA' },
  
  // Subtransmission Ashanti
  { name: 'SUBSTATION MAINTENANCE', region: 'SUBTRANSMISSION ASHANTI' },
  { name: 'CONTROL OPERATIONS', region: 'SUBTRANSMISSION ASHANTI' },
  { name: 'NETWORK MAINTENANCE', region: 'SUBTRANSMISSION ASHANTI' },
  { name: 'PROTECTION MAINTENANCE', region: 'SUBTRANSMISSION ASHANTI' },
  
  // Accra East Region
  { name: 'ADENTA', region: 'ACCRA EAST REGION' },
  { name: 'DODOWA', region: 'ACCRA EAST REGION' },
  { name: 'KWABENYA', region: 'ACCRA EAST REGION' },
  { name: 'LEGON', region: 'ACCRA EAST REGION' },
  { name: 'MAKOLA', region: 'ACCRA EAST REGION' },
  { name: 'AKWAPIM MAMPONG', region: 'ACCRA EAST REGION' },
  { name: 'ROMAN RIDGE', region: 'ACCRA EAST REGION' },
  { name: 'TESHIE', region: 'ACCRA EAST REGION' },
  
  // Accra West Region
  { name: 'ABLEKUMA', region: 'ACCRA WEST REGION' },
  { name: 'ACHIMOTA', region: 'ACCRA WEST REGION' },
  { name: 'AMASAMAN', region: 'ACCRA WEST REGION' },
  { name: 'BORTIANOR', region: 'ACCRA WEST REGION' },
  { name: 'DANSOMAN', region: 'ACCRA WEST REGION' },
  { name: 'KANESHIE', region: 'ACCRA WEST REGION' },
  { name: 'KORLE-BU', region: 'ACCRA WEST REGION' },
  { name: 'NSAWAM', region: 'ACCRA WEST REGION' },
  
  // Ashanti East Region
  { name: 'AYIGYA', region: 'ASHANTI EAST REGION' },
  { name: 'EFFIDUASE', region: 'ASHANTI EAST REGION' },
  { name: 'EJISU', region: 'ASHANTI EAST REGION' },
  { name: 'KONONGO', region: 'ASHANTI EAST REGION' },
  { name: 'KWABRE', region: 'ASHANTI EAST REGION' },
  { name: 'MAMPONG', region: 'ASHANTI EAST REGION' },
  { name: 'MANHYIA', region: 'ASHANTI EAST REGION' },
  
  // Ashanti West Region
  { name: 'ABUAKWA', region: 'ASHANTI WEST REGION' },
  { name: 'ADUM', region: 'ASHANTI WEST REGION' },
  { name: 'AHINSAN', region: 'ASHANTI WEST REGION' },
  { name: 'BIBIANI', region: 'ASHANTI WEST REGION' },
  { name: 'DANYAME', region: 'ASHANTI WEST REGION' },
  { name: 'KOKOBEN', region: 'ASHANTI WEST REGION' },
  { name: 'SUAME', region: 'ASHANTI WEST REGION' },
  { name: 'OFFINSO', region: 'ASHANTI WEST REGION' },
  
  // Ashanti South Region
  { name: 'ASOKWA', region: 'ASHANTI SOUTH REGION' },
  { name: 'BEKWAI', region: 'ASHANTI SOUTH REGION' },
  { name: 'DUNKWA', region: 'ASHANTI SOUTH REGION' },
  { name: 'MANSO NKWANTA', region: 'ASHANTI SOUTH REGION' },
  { name: 'NEW EDUBIASE', region: 'ASHANTI SOUTH REGION' },
  { name: 'OBUASI', region: 'ASHANTI SOUTH REGION' },
  
  // Central Region
  { name: 'AGONA SWEDRU', region: 'CENTRAL REGION' },
  { name: 'AJUMAKO', region: 'CENTRAL REGION' },
  { name: 'ASSIN FOSO', region: 'CENTRAL REGION' },
  { name: 'BREMAN ASIKUMA', region: 'CENTRAL REGION' },
  { name: 'CAPE COAST', region: 'CENTRAL REGION' },
  { name: 'KASOA NORTH', region: 'CENTRAL REGION' },
  { name: 'KASOA SOUTH', region: 'CENTRAL REGION' },
  { name: 'SALTPOND', region: 'CENTRAL REGION' },
  { name: 'TWIFO PRASO', region: 'CENTRAL REGION' },
  { name: 'WINNEBA', region: 'CENTRAL REGION' },
  
  // Eastern Region
  { name: 'AKIM ODA', region: 'EASTERN REGION' },
  { name: 'AKIM TAFO', region: 'EASTERN REGION' },
  { name: 'AKWATIA', region: 'EASTERN REGION' },
  { name: 'ASAMANKESE', region: 'EASTERN REGION' },
  { name: 'BEGORO', region: 'EASTERN REGION' },
  { name: 'DONKORKROM', region: 'EASTERN REGION' },
  { name: 'KADE', region: 'EASTERN REGION' },
  { name: 'KIBI', region: 'EASTERN REGION' },
  { name: 'KOFORIDUA', region: 'EASTERN REGION' },
  { name: 'MPRAESO', region: 'EASTERN REGION' },
  { name: 'NEW ABIREM', region: 'EASTERN REGION' },
  { name: 'NKAWKAW', region: 'EASTERN REGION' },
  { name: 'SUHUM', region: 'EASTERN REGION' },
  { name: 'ASESEWA', region: 'EASTERN REGION' },
  
  // Tema Region
  { name: 'ADA', region: 'TEMA REGION' },
  { name: 'AFIENYA', region: 'TEMA REGION' },
  { name: 'ASHAIMAN', region: 'TEMA REGION' },
  { name: 'JUAPONG', region: 'TEMA REGION' },
  { name: 'KROBO', region: 'TEMA REGION' },
  { name: 'NUNGUA', region: 'TEMA REGION' },
  { name: 'PRAMPRAM', region: 'TEMA REGION' },
  { name: 'TEMA NORTH', region: 'TEMA REGION' },
  { name: 'TEMA SOUTH', region: 'TEMA REGION' },
  
  // Volta Region
  { name: 'AKATSI', region: 'VOLTA REGION' },
  { name: 'DAMBAI', region: 'VOLTA REGION' },
  { name: 'DENU', region: 'VOLTA REGION' },
  { name: 'HO', region: 'VOLTA REGION' },
  { name: 'HOHOE', region: 'VOLTA REGION' },
  { name: 'JASIKAN', region: 'VOLTA REGION' },
  { name: 'KETA', region: 'VOLTA REGION' },
  { name: 'KPANDU', region: 'VOLTA REGION' },
  { name: 'KPEVE', region: 'VOLTA REGION' },
  { name: 'NKWANTA', region: 'VOLTA REGION' },
  { name: 'SOGAKOPE', region: 'VOLTA REGION' },
  
  // Western Region
  { name: 'AGONA', region: 'WESTERN REGION' },
  { name: 'ASANKRAGUA', region: 'WESTERN REGION' },
  { name: 'AXIM', region: 'WESTERN REGION' },
  { name: 'BOGOSO', region: 'WESTERN REGION' },
  { name: 'ENCHI', region: 'WESTERN REGION' },
  { name: 'HALF ASSINI', region: 'WESTERN REGION' },
  { name: 'SEFWI WIAWSO', region: 'WESTERN REGION' },
  { name: 'JUABESO', region: 'WESTERN REGION' },
  { name: 'SEKONDI', region: 'WESTERN REGION' },
  { name: 'TAKORADI', region: 'WESTERN REGION' },
  { name: 'TARKWA', region: 'WESTERN REGION' }
];

// Helper functions
export const getDistrictsByRegion = (region: string): District[] => {
  return DISTRICTS.filter(district => district.region === region);
};

export const getRegionsByType = (includeSubtransmission: boolean = true): readonly string[] => {
  return includeSubtransmission ? ALL_REGIONS : REGIONS;
};

export const isSubtransmissionRegion = (region: string): boolean => {
  return SUBTRANSMISSION_REGIONS.includes(region as typeof SUBTRANSMISSION_REGIONS[number]);
}; 