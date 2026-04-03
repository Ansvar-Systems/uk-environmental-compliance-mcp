import { buildMeta } from '../metadata.js';
import { validateJurisdiction } from '../jurisdiction.js';
import type { Database } from '../db.js';

interface AbstractionArgs {
  source_type?: string;
  volume_m3_per_day?: number;
  jurisdiction?: string;
}

export function handleGetAbstractionRules(db: Database, args: AbstractionArgs) {
  const jv = validateJurisdiction(args.jurisdiction);
  if (!jv.valid) return jv.error;

  let sql = 'SELECT * FROM abstraction_rules WHERE jurisdiction = ?';
  const params: unknown[] = [jv.jurisdiction];

  if (args.source_type) {
    sql += ' AND LOWER(source_type) LIKE LOWER(?)';
    params.push(`%${args.source_type}%`);
  }

  sql += ' ORDER BY source_type';

  const results = db.all<{
    id: number;
    source_type: string;
    threshold_m3_per_day: number;
    licence_required: number;
    exemptions: string;
    conditions: string;
  }>(sql, params);

  if (results.length === 0) {
    return {
      error: 'not_found',
      message: `No abstraction rules found for source type '${args.source_type ?? 'all'}'. ` +
        `Try: surface water, groundwater, tidal.`,
      _meta: buildMeta(),
    };
  }

  // Annotate with licence assessment if volume is provided
  const annotatedResults = results.map(r => {
    let licence_assessment: string | null = null;

    if (args.volume_m3_per_day !== undefined) {
      if (args.volume_m3_per_day > r.threshold_m3_per_day) {
        licence_assessment = `At ${args.volume_m3_per_day} m3/day, this exceeds the ${r.threshold_m3_per_day} m3/day threshold. An abstraction licence is required.`;
      } else {
        licence_assessment = `At ${args.volume_m3_per_day} m3/day, this is within the ${r.threshold_m3_per_day} m3/day threshold. No licence required, subject to exemption conditions.`;
      }
    }

    return {
      source_type: r.source_type,
      threshold_m3_per_day: r.threshold_m3_per_day,
      licence_required: r.licence_required === 1,
      exemptions: r.exemptions,
      conditions: r.conditions,
      ...(licence_assessment ? { licence_assessment } : {}),
    };
  });

  return {
    source_type: args.source_type ?? 'all',
    ...(args.volume_m3_per_day !== undefined ? { requested_volume_m3_per_day: args.volume_m3_per_day } : {}),
    jurisdiction: jv.jurisdiction,
    results_count: annotatedResults.length,
    rules: annotatedResults,
    _meta: buildMeta({
      source_url: 'https://www.gov.uk/guidance/water-management-abstract-or-impound-water',
    }),
  };
}
