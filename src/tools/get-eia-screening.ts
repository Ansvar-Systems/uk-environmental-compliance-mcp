import { buildMeta } from '../metadata.js';
import { validateJurisdiction } from '../jurisdiction.js';
import type { Database } from '../db.js';

interface EiaArgs {
  project_type: string;
  area_ha?: number;
  jurisdiction?: string;
}

export function handleGetEiaScreening(db: Database, args: EiaArgs) {
  const jv = validateJurisdiction(args.jurisdiction);
  if (!jv.valid) return jv.error;

  const results = db.all<{
    id: number;
    project_type: string;
    threshold_area_ha: number;
    threshold_other: string;
    screening_required: number;
    process: string;
  }>(
    `SELECT * FROM eia_screening WHERE jurisdiction = ? AND LOWER(project_type) LIKE LOWER(?) ORDER BY project_type`,
    [jv.jurisdiction, `%${args.project_type}%`]
  );

  if (results.length === 0) {
    return {
      error: 'not_found',
      message: `No EIA screening data found for project type '${args.project_type}'. ` +
        `Try: uncultivated land, restructuring, irrigation, livestock, afforestation.`,
      _meta: buildMeta(),
    };
  }

  const annotatedResults = results.map(r => {
    let screening_assessment: string | null = null;

    if (args.area_ha !== undefined && r.threshold_area_ha) {
      if (args.area_ha >= r.threshold_area_ha) {
        screening_assessment = `At ${args.area_ha} ha, this meets or exceeds the ${r.threshold_area_ha} ha threshold. EIA screening is required.`;
      } else {
        screening_assessment = `At ${args.area_ha} ha, this is below the ${r.threshold_area_ha} ha threshold. EIA screening is unlikely to be needed, but check with the local authority if the site is in a sensitive area.`;
      }
    }

    return {
      project_type: r.project_type,
      threshold_area_ha: r.threshold_area_ha,
      threshold_other: r.threshold_other,
      screening_required: r.screening_required === 1,
      process: r.process,
      ...(screening_assessment ? { screening_assessment } : {}),
    };
  });

  return {
    project_type: args.project_type,
    ...(args.area_ha !== undefined ? { proposed_area_ha: args.area_ha } : {}),
    jurisdiction: jv.jurisdiction,
    results_count: annotatedResults.length,
    screenings: annotatedResults,
    _meta: buildMeta({
      source_url: 'https://www.gov.uk/guidance/environmental-impact-assessments-for-agriculture',
    }),
  };
}
