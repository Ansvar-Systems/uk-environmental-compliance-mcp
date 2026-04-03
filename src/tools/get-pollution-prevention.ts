import { buildMeta } from '../metadata.js';
import { validateJurisdiction } from '../jurisdiction.js';
import type { Database } from '../db.js';

interface PollutionPreventionArgs {
  activity: string;
  jurisdiction?: string;
}

export function handleGetPollutionPrevention(db: Database, args: PollutionPreventionArgs) {
  const jv = validateJurisdiction(args.jurisdiction);
  if (!jv.valid) return jv.error;

  const results = db.all<{
    id: number;
    activity: string;
    hazards: string;
    control_measures: string;
    regulatory_requirements: string;
    regulation_ref: string;
  }>(
    `SELECT * FROM pollution_prevention WHERE jurisdiction = ? AND LOWER(activity) LIKE LOWER(?) ORDER BY activity`,
    [jv.jurisdiction, `%${args.activity}%`]
  );

  if (results.length === 0) {
    return {
      error: 'not_found',
      message: `No pollution prevention guidance found for activity '${args.activity}'. ` +
        `Try: silage, sheep dip, pesticide, fuel, slurry, fertiliser, waste burning, drainage.`,
      _meta: buildMeta(),
    };
  }

  return {
    activity: args.activity,
    jurisdiction: jv.jurisdiction,
    results_count: results.length,
    guidance: results.map(r => ({
      activity: r.activity,
      hazards: r.hazards,
      control_measures: r.control_measures,
      regulatory_requirements: r.regulatory_requirements,
      regulation_ref: r.regulation_ref,
    })),
    _meta: buildMeta({
      source_url: 'https://www.gov.uk/guidance/pollution-prevention-for-businesses',
    }),
  };
}
