import { buildMeta } from '../metadata.js';
import { SUPPORTED_JURISDICTIONS } from '../jurisdiction.js';

export function handleAbout() {
  return {
    name: 'UK Environmental Compliance MCP',
    description:
      'UK environmental farming compliance data covering NVZ rules, spreading windows, SSAFO storage ' +
      'requirements, buffer strip rules, water abstraction licensing, pollution prevention guidance, ' +
      'and EIA screening thresholds. Based on DEFRA Farming Rules for Water, NVZ regulations, and ' +
      'Environment Agency guidance.',
    version: '0.1.0',
    jurisdiction: [...SUPPORTED_JURISDICTIONS],
    data_sources: [
      'DEFRA Farming Rules for Water (SI 2018/151)',
      'NVZ Regulations (SI 2015/668)',
      'SSAFO Regulations (SI 2010/639)',
      'Environment Agency Guidance',
      'Natural England SFI Scheme',
    ],
    tools_count: 11,
    links: {
      homepage: 'https://ansvar.eu/open-agriculture',
      repository: 'https://github.com/Ansvar-Systems/uk-environmental-compliance-mcp',
      mcp_network: 'https://ansvar.ai/mcp',
    },
    _meta: buildMeta(),
  };
}
