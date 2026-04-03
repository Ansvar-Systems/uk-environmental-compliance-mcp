import { createDatabase, type Database } from '../../src/db.js';

export function createSeededDatabase(dbPath: string): Database {
  const db = createDatabase(dbPath);

  // NVZ rules
  db.run(
    `INSERT INTO nvz_rules (activity, material_type, soil_type, closed_period_start, closed_period_end, max_application_rate, conditions, regulation_ref, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['Spreading slurry', 'slurry', 'sandy or shallow', 'Oct 1', 'Jan 31', null, 'Applies to arable land on sandy or shallow soils in NVZ.', 'SI 2015/668 Schedule 1, Part 1', 'GB']
  );
  db.run(
    `INSERT INTO nvz_rules (activity, material_type, soil_type, closed_period_start, closed_period_end, max_application_rate, conditions, regulation_ref, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['Spreading slurry', 'slurry', 'all other soils', 'Oct 15', 'Jan 31', null, 'Applies to all other soil types in NVZ.', 'SI 2015/668 Schedule 1, Part 1', 'GB']
  );
  db.run(
    `INSERT INTO nvz_rules (activity, material_type, soil_type, closed_period_start, closed_period_end, max_application_rate, conditions, regulation_ref, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['Spreading poultry manure', 'poultry manure', 'sandy or shallow', 'Aug 1', 'Dec 31', null, 'Applies to sandy or shallow soils in NVZ.', 'SI 2015/668 Schedule 1, Part 1', 'GB']
  );
  db.run(
    `INSERT INTO nvz_rules (activity, material_type, soil_type, closed_period_start, closed_period_end, max_application_rate, conditions, regulation_ref, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['Nitrogen limit from organic sources', null, null, null, null, '170 kg N/ha/year from organic manure', 'Farm average.', 'SI 2015/668 Regulation 10(1)', 'GB']
  );

  // Storage requirements
  db.run(
    `INSERT INTO storage_requirements (material, min_capacity_months, construction_standard, separation_distance_m, inspection_frequency, regulation_ref, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['Slurry', 6, 'Concrete or steel tank, impermeable.', 10, 'Weekly visual check.', 'SI 2010/639 (SSAFO)', 'GB']
  );
  db.run(
    `INSERT INTO storage_requirements (material, min_capacity_months, construction_standard, separation_distance_m, inspection_frequency, regulation_ref, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['Agricultural fuel oil', null, 'Bunded storage, 110% capacity.', 10, 'Annual inspection.', 'SI 2010/639 Part 4', 'GB']
  );

  // Buffer strip rules
  db.run(
    `INSERT INTO buffer_strip_rules (watercourse_type, activity, min_width_m, conditions, scheme_payment, regulation_ref, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['Main river', 'Spreading organic manure', 10, 'No organic manure within 10m.', null, 'Farming Rules for Water SI 2018/151', 'GB']
  );
  db.run(
    `INSERT INTO buffer_strip_rules (watercourse_type, activity, min_width_m, conditions, scheme_payment, regulation_ref, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['Any surface water', 'SFI buffer strip (4-6m)', 4, 'SFI action SW3.', 'SW3: up to 451 GBP/ha/year', 'SFI 2024 Handbook', 'GB']
  );

  // Abstraction rules
  db.run(
    `INSERT INTO abstraction_rules (source_type, threshold_m3_per_day, licence_required, exemptions, conditions, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ['Surface water (inland)', 20, 1, 'Exempt if less than 20 m3/day for domestic or agricultural use.', 'Licence application to the Environment Agency.', 'GB']
  );

  // Pollution prevention
  db.run(
    `INSERT INTO pollution_prevention (activity, hazards, control_measures, regulatory_requirements, regulation_ref, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ['Silage making', 'Silage effluent is 200 times more polluting than raw sewage.', 'Sealed silo base, effluent collection.', 'SSAFO compliant silo.', 'SI 2010/639 Part 2', 'GB']
  );

  // EIA screening
  db.run(
    `INSERT INTO eia_screening (project_type, threshold_area_ha, threshold_other, screening_required, process, jurisdiction)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ['Uncultivated land or semi-natural areas', 2, 'Converting semi-natural habitat.', 1, 'Apply to Natural England for screening decision.', 'GB']
  );

  // FTS5 search index
  db.run(
    `INSERT INTO search_index (title, body, topic, jurisdiction) VALUES (?, ?, ?, ?)`,
    ['NVZ: Spreading slurry (sandy or shallow)', 'Applies to arable land on sandy or shallow soils in NVZ. Closed period Oct 1 to Jan 31.', 'nvz', 'GB']
  );
  db.run(
    `INSERT INTO search_index (title, body, topic, jurisdiction) VALUES (?, ?, ?, ?)`,
    ['NVZ: Spreading slurry (all other soils)', 'Applies to all other soil types in NVZ. Closed period Oct 15 to Jan 31.', 'nvz', 'GB']
  );
  db.run(
    `INSERT INTO search_index (title, body, topic, jurisdiction) VALUES (?, ?, ?, ?)`,
    ['Storage: Slurry', 'Concrete or steel tank, impermeable. 6 months capacity. 10m from watercourse.', 'storage', 'GB']
  );
  db.run(
    `INSERT INTO search_index (title, body, topic, jurisdiction) VALUES (?, ?, ?, ?)`,
    ['Buffer strip: Main river', 'No organic manure within 10m of a main river.', 'buffer_strips', 'GB']
  );
  db.run(
    `INSERT INTO search_index (title, body, topic, jurisdiction) VALUES (?, ?, ?, ?)`,
    ['Pollution prevention: Silage making', 'Silage effluent is 200 times more polluting than raw sewage. Sealed silo base required.', 'pollution', 'GB']
  );

  // Metadata
  const today = new Date().toISOString().split('T')[0];
  db.run("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('last_ingest', ?)", [today]);

  return db;
}
