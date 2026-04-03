export interface Meta {
  disclaimer: string;
  data_age: string;
  source_url: string;
  copyright: string;
  server: string;
  version: string;
}

const DISCLAIMER =
  'This server provides general guidance based on DEFRA and Environment Agency publications. ' +
  'It does not constitute legal advice. NVZ designations change — always verify your NVZ status ' +
  'on the DEFRA Magic Map. Consult the Environment Agency for site-specific requirements.';

export function buildMeta(overrides?: Partial<Meta>): Meta {
  return {
    disclaimer: DISCLAIMER,
    data_age: overrides?.data_age ?? 'unknown',
    source_url: overrides?.source_url ?? 'https://www.gov.uk/guidance/rules-for-farmers-and-land-managers-to-prevent-water-pollution',
    copyright: 'Data sourced from DEFRA and Environment Agency publications under Open Government Licence v3.0. Server: Apache-2.0 Ansvar Systems.',
    server: 'uk-environmental-compliance-mcp',
    version: '0.1.0',
    ...overrides,
  };
}
