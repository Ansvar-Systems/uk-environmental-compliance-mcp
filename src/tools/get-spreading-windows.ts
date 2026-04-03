import { buildMeta } from '../metadata.js';
import { validateJurisdiction } from '../jurisdiction.js';
import type { Database } from '../db.js';

interface SpreadingWindowArgs {
  manure_type: string;
  land_type: string;
  nvz?: boolean;
  jurisdiction?: string;
}

export function handleGetSpreadingWindows(db: Database, args: SpreadingWindowArgs) {
  const jv = validateJurisdiction(args.jurisdiction);
  if (!jv.valid) return jv.error;

  // Match on material_type for the manure type
  let sql = `SELECT * FROM nvz_rules WHERE jurisdiction = ? AND LOWER(material_type) LIKE LOWER(?)`;
  const params: unknown[] = [jv.jurisdiction, `%${args.manure_type}%`];

  // Filter by soil_type (land_type maps to soil classification)
  sql += ' AND (LOWER(soil_type) LIKE LOWER(?) OR soil_type IS NULL)';
  params.push(`%${args.land_type}%`);

  sql += ' ORDER BY closed_period_start';

  const rules = db.all<{
    id: number;
    activity: string;
    material_type: string;
    soil_type: string;
    closed_period_start: string;
    closed_period_end: string;
    max_application_rate: string;
    conditions: string;
    regulation_ref: string;
  }>(sql, params);

  if (rules.length === 0) {
    // Try broader search without land_type filter
    const broaderRules = db.all<{
      id: number;
      activity: string;
      material_type: string;
      soil_type: string;
      closed_period_start: string;
      closed_period_end: string;
      max_application_rate: string;
      conditions: string;
      regulation_ref: string;
    }>(
      `SELECT * FROM nvz_rules WHERE jurisdiction = ? AND LOWER(material_type) LIKE LOWER(?) ORDER BY closed_period_start`,
      [jv.jurisdiction, `%${args.manure_type}%`]
    );

    if (broaderRules.length === 0) {
      return {
        error: 'not_found',
        message: `No spreading window data found for manure type '${args.manure_type}'. ` +
          `Try: slurry, poultry manure, farmyard manure, manufactured fertiliser.`,
        _meta: buildMeta(),
      };
    }

    // Return all rules for the manure type when land type doesn't match
    return formatSpreadingWindows(args, broaderRules, jv.jurisdiction, true);
  }

  return formatSpreadingWindows(args, rules, jv.jurisdiction, false);
}

function formatSpreadingWindows(
  args: SpreadingWindowArgs,
  rules: Array<{
    activity: string;
    material_type: string;
    soil_type: string;
    closed_period_start: string;
    closed_period_end: string;
    max_application_rate: string;
    conditions: string;
    regulation_ref: string;
  }>,
  jurisdiction: string,
  broadMatch: boolean,
) {
  const windows = rules.map(rule => ({
    activity: rule.activity,
    material_type: rule.material_type,
    soil_type: rule.soil_type,
    closed_period: rule.closed_period_start && rule.closed_period_end
      ? { start: rule.closed_period_start, end: rule.closed_period_end }
      : null,
    open_period: rule.closed_period_start && rule.closed_period_end
      ? `Outside ${rule.closed_period_start} to ${rule.closed_period_end}`
      : 'No closed period applies (but other conditions still apply)',
    max_application_rate: rule.max_application_rate,
    conditions: rule.conditions,
    regulation_ref: rule.regulation_ref,
  }));

  return {
    manure_type: args.manure_type,
    land_type: args.land_type,
    nvz_context: args.nvz !== false
      ? 'Rules shown apply in NVZ-designated areas. Outside NVZs, Farming Rules for Water still apply.'
      : 'Showing general Farming Rules for Water (non-NVZ). NVZ closed periods do not apply.',
    jurisdiction,
    ...(broadMatch ? { note: `No exact match for land type '${args.land_type}'. Showing all rules for '${args.manure_type}'.` } : {}),
    results_count: windows.length,
    windows,
    _meta: buildMeta({
      source_url: 'https://www.gov.uk/guidance/using-nitrogen-fertilisers-in-nitrate-vulnerable-zones',
    }),
  };
}
