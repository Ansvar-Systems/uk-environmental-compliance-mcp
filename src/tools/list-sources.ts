import { buildMeta } from '../metadata.js';
import type { Database } from '../db.js';

interface Source {
  name: string;
  authority: string;
  official_url: string;
  retrieval_method: string;
  update_frequency: string;
  license: string;
  coverage: string;
  last_retrieved?: string;
}

export function handleListSources(db: Database): { sources: Source[]; _meta: ReturnType<typeof buildMeta> } {
  const lastIngest = db.get<{ value: string }>('SELECT value FROM db_metadata WHERE key = ?', ['last_ingest']);

  const sources: Source[] = [
    {
      name: 'DEFRA Farming Rules for Water',
      authority: 'Department for Environment, Food and Rural Affairs',
      official_url: 'https://www.gov.uk/guidance/rules-for-farmers-and-land-managers-to-prevent-water-pollution',
      retrieval_method: 'MANUAL_EXTRACT',
      update_frequency: 'as amended',
      license: 'Open Government Licence v3',
      coverage: 'Rules on nutrient management, manure and fertiliser application, soil management',
      last_retrieved: lastIngest?.value,
    },
    {
      name: 'Nitrate Vulnerable Zones Regulations (SI 2015/668)',
      authority: 'Department for Environment, Food and Rural Affairs',
      official_url: 'https://www.gov.uk/guidance/using-nitrogen-fertilisers-in-nitrate-vulnerable-zones',
      retrieval_method: 'MANUAL_EXTRACT',
      update_frequency: 'as amended (4-year NVZ review cycle)',
      license: 'Open Government Licence v3',
      coverage: 'NVZ closed periods, N limits, storage requirements, record keeping',
      last_retrieved: lastIngest?.value,
    },
    {
      name: 'SSAFO Regulations (SI 2010/639)',
      authority: 'Environment Agency',
      official_url: 'https://www.gov.uk/guidance/storing-silage-slurry-and-agricultural-fuel-oil',
      retrieval_method: 'MANUAL_EXTRACT',
      update_frequency: 'as amended',
      license: 'Open Government Licence v3',
      coverage: 'Storage standards for silage, slurry, and agricultural fuel oil',
      last_retrieved: lastIngest?.value,
    },
    {
      name: 'Environment Agency Pollution Prevention Guidance',
      authority: 'Environment Agency',
      official_url: 'https://www.gov.uk/guidance/pollution-prevention-for-businesses',
      retrieval_method: 'MANUAL_EXTRACT',
      update_frequency: 'as amended',
      license: 'Open Government Licence v3',
      coverage: 'Pollution prevention measures for farming activities',
      last_retrieved: lastIngest?.value,
    },
    {
      name: 'SFI (Sustainable Farming Incentive) Scheme',
      authority: 'Natural England / Rural Payments Agency',
      official_url: 'https://www.gov.uk/guidance/sfi-actions-for-water',
      retrieval_method: 'MANUAL_EXTRACT',
      update_frequency: 'annual (scheme updates)',
      license: 'Open Government Licence v3',
      coverage: 'Buffer strip payment rates and eligibility criteria',
      last_retrieved: lastIngest?.value,
    },
  ];

  return {
    sources,
    _meta: buildMeta({ source_url: 'https://www.gov.uk/guidance/rules-for-farmers-and-land-managers-to-prevent-water-pollution' }),
  };
}
