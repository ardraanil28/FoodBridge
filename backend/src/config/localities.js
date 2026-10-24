/**
 * Fixed Kerala District and Area locality rules.
 * No free-text localities allowed.
 * - Same area: best locality score.
 * - Same district, different area: acceptable, lower score, flagged "requires travel".
 * - Different district: excluded from automatic matching.
 */

export const KERALA_LOCALITIES = {
  Ernakulam: [
    'Kakkanad',
    'Edappally',
    'Kaloor',
    'Fort Kochi',
    'Aluva',
    'MG Road',
    'Vyttila',
    'Palarivattom'
  ],
  Thiruvananthapuram: [
    'Kazhakkoottam',
    'Technopark',
    'Kowdiar',
    'Palayam',
    'Thampanoor',
    'Pattom',
    'Vellayambalam',
    'Sreekaryam'
  ],
  Kozhikode: [
    'Mananchira',
    'Mavoor Road',
    'Palayam Kozhikode',
    'Beach Road',
    'Medical College',
    'Nadakkavu',
    'Feroke'
  ],
  Thrissur: [
    'Swaraj Round',
    'Ayyanthole',
    'Mannuthy',
    'Ollur',
    'Kuriachira',
    'Puzhakkal'
  ],
  Kollam: [
    'Chinnakada',
    'Asramam',
    'Kadavoor',
    'Tangasseri',
    'Kavanad'
  ],
  Alappuzha: [
    'Boat Jetty',
    'Mullakkal',
    'Beach Road Alappuzha',
    'Kalarcode',
    'Ambalapuzha'
  ],
  Kottayam: [
    'Baker Junction',
    'Collectorate',
    'Nagampadam',
    'Kanjikuzhy',
    'Manarcad'
  ],
  Palakkad: [
    'Fort Maidan',
    'Olavakkode',
    'Chandranagar',
    'Kanjikode'
  ],
  Malappuram: [
    'Down Hill',
    'Up Hill',
    'Manjeri',
    'Perinthalmanna'
  ],
  Kannur: [
    'Thavakkara',
    'Payyambalam',
    'South Bazar',
    'Talap'
  ],
  Kasaragod: [
    'Vidyanagar',
    'Karanakkad',
    'Kanhangad',
    'Nileshwar'
  ],
  Idukki: [
    'Thodupuzha',
    'Munnar',
    'Kattappana',
    'Painavu'
  ],
  Pathanamthitta: [
    'Ring Road',
    'Aban Junction',
    'Adoor',
    'Thiruvalla'
  ],
  Wayanad: [
    'Kalpetta',
    'Sulthan Bathery',
    'Mananthavady',
    'Vythiri'
  ]
};

export const DISTRICTS = Object.keys(KERALA_LOCALITIES);

/**
 * Validates if district and area exist in the canonical Kerala list.
 */
export function isValidLocality(district, area) {
  if (!district || !area) return false;
  const areas = KERALA_LOCALITIES[district];
  if (!areas) return false;
  return areas.includes(area);
}

/**
 * Compares two localities according to section 5 rules.
 * @returns {{ compatible: boolean, type: 'same_area' | 'same_district' | 'different_district', requiresTravel: boolean, label: string }}
 */
export function compareLocalities(locA, locB) {
  if (!locA || !locB || !locA.district || !locB.district) {
    return { compatible: false, type: 'different_district', requiresTravel: false, label: 'Unknown locality' };
  }

  if (locA.district !== locB.district) {
    return {
      compatible: false,
      type: 'different_district',
      requiresTravel: true,
      label: 'Different district (excluded)'
    };
  }

  if (locA.area === locB.area) {
    return {
      compatible: true,
      type: 'same_area',
      requiresTravel: false,
      label: 'Same area'
    };
  }

  return {
    compatible: true,
    type: 'same_district',
    requiresTravel: true,
    label: 'Same district (requires travel)'
  };
}
