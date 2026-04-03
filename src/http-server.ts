import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { randomUUID } from 'crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { createDatabase, type Database } from './db.js';
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
const PORT = parseInt(process.env.PORT ?? '3000', 10);

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
    description: 'Check Nitrate Vulnerable Zone rules for a farming activity. Returns closed periods, nitrogen limits, and conditions.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        activity: { type: 'string', description: 'Farming activity (e.g. spreading slurry, applying fertiliser)' },
        season: { type: 'string', description: 'Month or season to check (e.g. November, March)' },
        soil_type: { type: 'string', description: 'Soil type (e.g. sandy, shallow, clay)' },
        jurisdiction: { type: 'string', description: 'ISO 3166-1 alpha-2 code (default: GB)' },
      },
      required: ['activity'],
    },
  },
  {
    name: 'get_spreading_windows',
    description: 'Get open and closed spreading periods for a manure type on a land type.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        manure_type: { type: 'string', description: 'Manure type (e.g. slurry, poultry manure, manufactured fertiliser)' },
        land_type: { type: 'string', description: 'Land type (e.g. arable, grassland, sandy, shallow)' },
        nvz: { type: 'boolean', description: 'Whether the land is in an NVZ (default: true)' },
        jurisdiction: { type: 'string', description: 'ISO 3166-1 alpha-2 code (default: GB)' },
      },
      required: ['manure_type', 'land_type'],
    },
  },
  {
    name: 'get_storage_requirements',
    description: 'Get SSAFO storage requirements for a material.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        material: { type: 'string', description: 'Material to store (e.g. slurry, silage, fuel oil)' },
        volume: { type: 'string', description: 'Planned storage volume (for context)' },
        jurisdiction: { type: 'string', description: 'ISO 3166-1 alpha-2 code (default: GB)' },
      },
      required: ['material'],
    },
  },
  {
    name: 'check_buffer_strip_rules',
    description: 'Check buffer strip requirements for watercourses.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        watercourse_type: { type: 'string', description: 'Watercourse type (e.g. main river, ordinary watercourse)' },
        activity: { type: 'string', description: 'Activity near watercourse' },
        jurisdiction: { type: 'string', description: 'ISO 3166-1 alpha-2 code (default: GB)' },
      },
    },
  },
  {
    name: 'get_abstraction_rules',
    description: 'Get water abstraction licensing rules by source type and volume.',
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
    description: 'Get pollution prevention guidance for a farming activity.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        activity: { type: 'string', description: 'Farming activity (e.g. silage making, sheep dipping)' },
        jurisdiction: { type: 'string', description: 'ISO 3166-1 alpha-2 code (default: GB)' },
      },
      required: ['activity'],
    },
  },
  {
    name: 'get_eia_screening',
    description: 'Check EIA screening thresholds for agricultural projects.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_type: { type: 'string', description: 'Project type (e.g. uncultivated land, livestock, irrigation)' },
        area_ha: { type: 'number', description: 'Proposed project area in hectares' },
        jurisdiction: { type: 'string', description: 'ISO 3166-1 alpha-2 code (default: GB)' },
      },
      required: ['project_type'],
    },
  },
];

function textResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function errorResult(message: string) {
  return { content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }], isError: true };
}

function registerTools(server: Server, db: Database): void {
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
}

const db = createDatabase();
const sessions = new Map<string, { transport: StreamableHTTPServerTransport; server: Server }>();

function createMcpServer(): Server {
  const mcpServer = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } }
  );
  registerTools(mcpServer, db);
  return mcpServer;
}

async function handleMCPRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)!;
    await session.transport.handleRequest(req, res);
    return;
  }

  if (req.method === 'GET' || req.method === 'DELETE') {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid or missing session ID' }));
    return;
  }

  const mcpServer = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  await mcpServer.connect(transport);

  transport.onclose = () => {
    if (transport.sessionId) {
      sessions.delete(transport.sessionId);
    }
    mcpServer.close().catch(() => {});
  };

  await transport.handleRequest(req, res);

  if (transport.sessionId) {
    sessions.set(transport.sessionId, { transport, server: mcpServer });
  }
}

const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);

  if (url.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', server: SERVER_NAME, version: SERVER_VERSION }));
    return;
  }

  if (url.pathname === '/mcp' || url.pathname === '/') {
    try {
      await handleMCPRequest(req, res);
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }));
      }
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

httpServer.listen(PORT, () => {
  console.log(`${SERVER_NAME} v${SERVER_VERSION} listening on port ${PORT}`);
});
