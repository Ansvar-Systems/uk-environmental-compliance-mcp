#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { createDatabase } from './db.js';
import { handleAbout } from './tools/about.js';
import { handleListSources } from './tools/list-sources.js';
import { handleCheckFreshness } from './tools/check-freshness.js';
import { handleSearchEnvironmentalRules } from './tools/search-environmental-rules.js';
import { handleCheckNvzRules } from './tools/check-nvz-rules.js';
import { handleGetSpreadingWindows } from './tools/get-spreading-windows.js';
import { handleGetStorageRequirements } from './tools/get-storage-requirements.js';
import { handleCheckBufferStripRules } from './tools/check-buffer-strip-rules.js';
import { handleGetAbstractionRules } from './tools/get-abstraction-rules.js';
import { handleGetPollutionPrevention } from './tools/get-pollution-prevention.js';
import { handleGetEiaScreening } from './tools/get-eia-screening.js';

const SERVER_NAME = 'uk-environmental-compliance-mcp';
const SERVER_VERSION = '0.1.0';

const TOOLS = [
  {
    name: 'about',
    description: 'Get server metadata: name, version, coverage, data sources, and links.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'list_sources',
    description: 'List all data sources with authority, URL, license, and freshness info.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'check_data_freshness',
    description: 'Check when data was last ingested, staleness status, and how to trigger a refresh.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'search_environmental_rules',
    description: 'Full-text search across all environmental compliance data: NVZ rules, storage requirements, buffer strips, abstraction, pollution prevention, EIA screening.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Free-text search query' },
        topic: { type: 'string', description: 'Filter by topic (e.g. nvz, storage, buffer_strips, abstraction, pollution, eia)' },
        jurisdiction: { type: 'string', description: 'ISO 3166-1 alpha-2 code (default: GB)' },
        limit: { type: 'number', description: 'Max results (default: 20, max: 50)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'check_nvz_rules',
    description: 'Check Nitrate Vulnerable Zone rules for a farming activity. Returns closed periods, nitrogen limits, and conditions. Tells you clearly whether an activity is allowed in a given season.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        activity: { type: 'string', description: 'Farming activity (e.g. spreading slurry, applying fertiliser, storing manure)' },
        season: { type: 'string', description: 'Month or season to check (e.g. November, March, winter)' },
        soil_type: { type: 'string', description: 'Soil type (e.g. sandy, shallow, clay, all other)' },
        jurisdiction: { type: 'string', description: 'ISO 3166-1 alpha-2 code (default: GB)' },
      },
      required: ['activity'],
    },
  },
  {
    name: 'get_spreading_windows',
    description: 'Get open and closed spreading periods for a manure type on a land type. Returns a clear calendar of when spreading is permitted in NVZ areas.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        manure_type: { type: 'string', description: 'Manure type (e.g. slurry, poultry manure, farmyard manure, manufactured fertiliser)' },
        land_type: { type: 'string', description: 'Land type (e.g. arable, grassland, sandy, shallow)' },
        nvz: { type: 'boolean', description: 'Whether the land is in an NVZ (default: true)' },
        jurisdiction: { type: 'string', description: 'ISO 3166-1 alpha-2 code (default: GB)' },
      },
      required: ['manure_type', 'land_type'],
    },
  },
  {
    name: 'get_storage_requirements',
    description: 'Get SSAFO storage requirements for a material (slurry, silage, fuel oil, etc.). Returns capacity, construction standards, and separation distances.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        material: { type: 'string', description: 'Material to store (e.g. slurry, silage, fuel oil, pesticide, sheep dip, farmyard manure)' },
        volume: { type: 'string', description: 'Planned storage volume (for context)' },
        jurisdiction: { type: 'string', description: 'ISO 3166-1 alpha-2 code (default: GB)' },
      },
      required: ['material'],
    },
  },
  {
    name: 'check_buffer_strip_rules',
    description: 'Check buffer strip requirements for watercourses. Returns minimum widths, conditions, and SFI payment rates.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        watercourse_type: { type: 'string', description: 'Watercourse type (e.g. main river, ordinary watercourse, lake, ditch)' },
        activity: { type: 'string', description: 'Activity near watercourse (e.g. spreading, cultivating)' },
        jurisdiction: { type: 'string', description: 'ISO 3166-1 alpha-2 code (default: GB)' },
      },
    },
  },
  {
    name: 'get_abstraction_rules',
    description: 'Get water abstraction licensing rules by source type and volume. Tells you whether a licence is required.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        source_type: { type: 'string', description: 'Water source (e.g. surface water, groundwater, tidal)' },
        volume_m3_per_day: { type: 'number', description: 'Planned abstraction volume in cubic metres per day' },
        jurisdiction: { type: 'string', description: 'ISO 3166-1 alpha-2 code (default: GB)' },
      },
    },
  },
  {
    name: 'get_pollution_prevention',
    description: 'Get pollution prevention guidance for a farming activity. Returns hazards, control measures, and regulatory requirements.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        activity: { type: 'string', description: 'Farming activity (e.g. silage making, sheep dipping, pesticide handling, fuel storage)' },
        jurisdiction: { type: 'string', description: 'ISO 3166-1 alpha-2 code (default: GB)' },
      },
      required: ['activity'],
    },
  },
  {
    name: 'get_eia_screening',
    description: 'Check EIA (Environmental Impact Assessment) screening thresholds for agricultural projects. Returns whether screening is required based on project type and area.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_type: { type: 'string', description: 'Project type (e.g. uncultivated land, restructuring, irrigation, livestock, afforestation)' },
        area_ha: { type: 'number', description: 'Proposed project area in hectares' },
        jurisdiction: { type: 'string', description: 'ISO 3166-1 alpha-2 code (default: GB)' },
      },
      required: ['project_type'],
    },
  },
];

const SearchArgsSchema = z.object({
  query: z.string(),
  topic: z.string().optional(),
  jurisdiction: z.string().optional(),
  limit: z.number().optional(),
});

const NvzArgsSchema = z.object({
  activity: z.string(),
  season: z.string().optional(),
  soil_type: z.string().optional(),
  jurisdiction: z.string().optional(),
});

const SpreadingWindowArgsSchema = z.object({
  manure_type: z.string(),
  land_type: z.string(),
  nvz: z.boolean().optional(),
  jurisdiction: z.string().optional(),
});

const StorageArgsSchema = z.object({
  material: z.string(),
  volume: z.string().optional(),
  jurisdiction: z.string().optional(),
});

const BufferStripArgsSchema = z.object({
  watercourse_type: z.string().optional(),
  activity: z.string().optional(),
  jurisdiction: z.string().optional(),
});

const AbstractionArgsSchema = z.object({
  source_type: z.string().optional(),
  volume_m3_per_day: z.number().optional(),
  jurisdiction: z.string().optional(),
});

const PollutionPreventionArgsSchema = z.object({
  activity: z.string(),
  jurisdiction: z.string().optional(),
});

const EiaArgsSchema = z.object({
  project_type: z.string(),
  area_ha: z.number().optional(),
  jurisdiction: z.string().optional(),
});

function textResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function errorResult(message: string) {
  return { content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }], isError: true };
}

const db = createDatabase();

const server = new Server(
  { name: SERVER_NAME, version: SERVER_VERSION },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      case 'about':
        return textResult(handleAbout());
      case 'list_sources':
        return textResult(handleListSources(db));
      case 'check_data_freshness':
        return textResult(handleCheckFreshness(db));
      case 'search_environmental_rules':
        return textResult(handleSearchEnvironmentalRules(db, SearchArgsSchema.parse(args)));
      case 'check_nvz_rules':
        return textResult(handleCheckNvzRules(db, NvzArgsSchema.parse(args)));
      case 'get_spreading_windows':
        return textResult(handleGetSpreadingWindows(db, SpreadingWindowArgsSchema.parse(args)));
      case 'get_storage_requirements':
        return textResult(handleGetStorageRequirements(db, StorageArgsSchema.parse(args)));
      case 'check_buffer_strip_rules':
        return textResult(handleCheckBufferStripRules(db, BufferStripArgsSchema.parse(args)));
      case 'get_abstraction_rules':
        return textResult(handleGetAbstractionRules(db, AbstractionArgsSchema.parse(args)));
      case 'get_pollution_prevention':
        return textResult(handleGetPollutionPrevention(db, PollutionPreventionArgsSchema.parse(args)));
      case 'get_eia_screening':
        return textResult(handleGetEiaScreening(db, EiaArgsSchema.parse(args)));
      default:
        return errorResult(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return errorResult(err instanceof Error ? err.message : String(err));
  }
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err.message}\n`);
  process.exit(1);
});
