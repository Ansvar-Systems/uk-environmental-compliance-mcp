import { buildMeta } from '../metadata.js';
import { validateJurisdiction } from '../jurisdiction.js';
import type { Database } from '../db.js';

interface BufferStripArgs {
  watercourse_type?: string;
  activity?: string;
  jurisdiction?: string;
}

export function handleCheckBufferStripRules(db: Database, args: BufferStripArgs) {
  const jv = validateJurisdiction(args.jurisdiction);
  if (!jv.valid) return jv.error;

  let sql = 'SELECT * FROM buffer_strip_rules WHERE jurisdiction = ?';
  const params: unknown[] = [jv.jurisdiction];

  if (args.watercourse_type) {
    sql += ' AND LOWER(watercourse_type) LIKE LOWER(?)';
    params.push(`%${args.watercourse_type}%`);
  }

  if (args.activity) {
    sql += ' AND (LOWER(activity) LIKE LOWER(?) OR activity IS NULL)';
    params.push(`%${args.activity}%`);
  }

  sql += ' ORDER BY min_width_m DESC';

  const results = db.all<{
    id: number;
    watercourse_type: string;
    activity: string;
    min_width_m: number;
    conditions: string;
    scheme_payment: string;
    regulation_ref: string;
  }>(sql, params);

  if (results.length === 0) {
    // Return all buffer strip rules if no specific match
    const allRules = db.all<{
      id: number;
      watercourse_type: string;
      activity: string;
      min_width_m: number;
      conditions: string;
      scheme_payment: string;
      regulation_ref: string;
    }>(
      'SELECT * FROM buffer_strip_rules WHERE jurisdiction = ? ORDER BY min_width_m DESC',
      [jv.jurisdiction]
    );

    return {
      note: args.watercourse_type
        ? `No specific rules for '${args.watercourse_type}'. Showing all buffer strip rules.`
        : 'Showing all buffer strip rules.',
      jurisdiction: jv.jurisdiction,
      results_count: allRules.length,
      rules: allRules.map(formatRule),
      _meta: buildMeta(),
    };
  }

  return {
    watercourse_type: args.watercourse_type ?? 'all',
    jurisdiction: jv.jurisdiction,
    results_count: results.length,
    rules: results.map(formatRule),
    _meta: buildMeta({
      source_url: 'https://www.gov.uk/guidance/rules-for-farmers-and-land-managers-to-prevent-water-pollution',
    }),
  };
}

function formatRule(r: {
  watercourse_type: string;
  activity: string;
  min_width_m: number;
  conditions: string;
  scheme_payment: string;
  regulation_ref: string;
}) {
  return {
    watercourse_type: r.watercourse_type,
    activity: r.activity,
    min_width_m: r.min_width_m,
    conditions: r.conditions,
    ...(r.scheme_payment ? { scheme_payment: r.scheme_payment } : {}),
    regulation_ref: r.regulation_ref,
  };
}
