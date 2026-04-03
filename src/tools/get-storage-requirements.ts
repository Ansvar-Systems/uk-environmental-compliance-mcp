import { buildMeta } from '../metadata.js';
import { validateJurisdiction } from '../jurisdiction.js';
import type { Database } from '../db.js';

interface StorageArgs {
  material: string;
  volume?: string;
  jurisdiction?: string;
}

export function handleGetStorageRequirements(db: Database, args: StorageArgs) {
  const jv = validateJurisdiction(args.jurisdiction);
  if (!jv.valid) return jv.error;

  const results = db.all<{
    id: number;
    material: string;
    min_capacity_months: number;
    construction_standard: string;
    separation_distance_m: number;
    inspection_frequency: string;
    regulation_ref: string;
  }>(
    `SELECT * FROM storage_requirements WHERE jurisdiction = ? AND LOWER(material) LIKE LOWER(?) ORDER BY material`,
    [jv.jurisdiction, `%${args.material}%`]
  );

  if (results.length === 0) {
    return {
      error: 'not_found',
      message: `No storage requirements found for material '${args.material}'. ` +
        `Try: slurry, silage, farmyard manure, fuel oil, pesticide, sheep dip.`,
      _meta: buildMeta(),
    };
  }

  return {
    material: args.material,
    jurisdiction: jv.jurisdiction,
    results_count: results.length,
    requirements: results.map(r => ({
      material: r.material,
      min_capacity_months: r.min_capacity_months,
      construction_standard: r.construction_standard,
      separation_distance_m: r.separation_distance_m,
      inspection_frequency: r.inspection_frequency,
      regulation_ref: r.regulation_ref,
    })),
    _meta: buildMeta({
      source_url: 'https://www.gov.uk/guidance/storing-silage-slurry-and-agricultural-fuel-oil',
    }),
  };
}
