import { buildMeta } from '../metadata.js';
import { validateJurisdiction } from '../jurisdiction.js';
import type { Database } from '../db.js';

interface NvzArgs {
  activity: string;
  season?: string;
  soil_type?: string;
  jurisdiction?: string;
}

export function handleCheckNvzRules(db: Database, args: NvzArgs) {
  const jv = validateJurisdiction(args.jurisdiction);
  if (!jv.valid) return jv.error;

  let sql = `SELECT * FROM nvz_rules WHERE jurisdiction = ? AND LOWER(activity) LIKE LOWER(?)`;
  const params: unknown[] = [jv.jurisdiction, `%${args.activity}%`];

  if (args.soil_type) {
    sql += ' AND (LOWER(soil_type) LIKE LOWER(?) OR soil_type IS NULL)';
    params.push(`%${args.soil_type}%`);
  }

  sql += ' ORDER BY id';

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

  // If season is provided, annotate each rule with whether the activity is currently allowed
  const annotatedRules = rules.map(rule => {
    let allowed: boolean | null = null;
    let status_note: string | null = null;

    if (args.season && rule.closed_period_start && rule.closed_period_end) {
      const monthMap: Record<string, number> = {
        jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
        jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
      };
      const seasonLower = args.season.toLowerCase().slice(0, 3);
      const currentMonth = monthMap[seasonLower];

      if (currentMonth) {
        const startMonth = parseInt(rule.closed_period_start.split('-')[1] || rule.closed_period_start.split(' ')[1] || '0');
        const endMonth = parseInt(rule.closed_period_end.split('-')[1] || rule.closed_period_end.split(' ')[1] || '0');

        // Parse dates like "Oct 1" or "01-10"
        const startParts = rule.closed_period_start.match(/(\w+)\s+(\d+)/);
        const endParts = rule.closed_period_end.match(/(\w+)\s+(\d+)/);

        if (startParts && endParts) {
          const sMonth = monthMap[startParts[1].toLowerCase().slice(0, 3)] ?? startMonth;
          const eMonth = monthMap[endParts[1].toLowerCase().slice(0, 3)] ?? endMonth;

          if (sMonth <= eMonth) {
            // Closed period within same year (e.g., Aug-Dec)
            allowed = currentMonth < sMonth || currentMonth > eMonth;
          } else {
            // Closed period wraps around year end (e.g., Oct-Jan)
            allowed = currentMonth > eMonth && currentMonth < sMonth;
          }

          if (!allowed) {
            status_note = `This activity is within the NVZ closed period (${rule.closed_period_start} to ${rule.closed_period_end}). Spreading is prohibited.`;
          } else {
            status_note = `Outside closed period. Activity is permitted subject to other conditions.`;
          }
        }
      }
    }

    return {
      activity: rule.activity,
      material_type: rule.material_type,
      soil_type: rule.soil_type,
      closed_period_start: rule.closed_period_start,
      closed_period_end: rule.closed_period_end,
      max_application_rate: rule.max_application_rate,
      conditions: rule.conditions,
      regulation_ref: rule.regulation_ref,
      ...(allowed !== null ? { allowed, status_note } : {}),
    };
  });

  if (annotatedRules.length === 0) {
    return {
      error: 'not_found',
      message: `No NVZ rules found for activity '${args.activity}'` +
        (args.soil_type ? ` on soil type '${args.soil_type}'` : '') + '.',
      _meta: buildMeta(),
    };
  }

  return {
    activity: args.activity,
    jurisdiction: jv.jurisdiction,
    results_count: annotatedRules.length,
    rules: annotatedRules,
    _meta: buildMeta({
      source_url: 'https://www.gov.uk/guidance/using-nitrogen-fertilisers-in-nitrate-vulnerable-zones',
    }),
  };
}
