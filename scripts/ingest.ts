/**
 * UK Environmental Compliance MCP — Data Ingestion Script
 *
 * Sources:
 * 1. DEFRA Farming Rules for Water (SI 2018/151)
 * 2. NVZ Regulations (The Nitrate Pollution Prevention Regulations 2015 — SI 2015/668)
 * 3. SSAFO Regulations (The Water Resources (Control of Pollution) (Silage, Slurry and
 *    Agricultural Fuel Oil) (England) Regulations 2010 — SI 2010/639)
 * 4. Environment Agency pollution prevention guidance
 * 5. EIA (Agriculture) (England) (No 2) Regulations 2006
 * 6. Natural England SFI scheme documentation
 *
 * All data is extracted from official government publications. NVZ closed periods
 * and nitrogen limits are taken directly from the statutory instruments.
 *
 * Usage: npm run ingest
 */

import { createDatabase, type Database } from '../src/db.js';
import { mkdirSync, writeFileSync } from 'fs';

// ── NVZ Rules ────────────────────────────────────────────────────
// Source: The Nitrate Pollution Prevention Regulations 2015 (SI 2015/668)
// as amended, and DEFRA NVZ guidance.

interface NvzRule {
  activity: string;
  material_type: string | null;
  soil_type: string | null;
  closed_period_start: string | null;
  closed_period_end: string | null;
  max_application_rate: string | null;
  conditions: string | null;
  regulation_ref: string;
}

const NVZ_RULES: NvzRule[] = [
  // Slurry closed periods — SI 2015/668 Schedule 1
  {
    activity: 'Spreading slurry',
    material_type: 'slurry',
    soil_type: 'sandy or shallow',
    closed_period_start: 'Sep 1',
    closed_period_end: 'Dec 31',
    max_application_rate: null,
    conditions: 'Applies to grassland on sandy or shallow soils in NVZ. No spreading during closed period.',
    regulation_ref: 'SI 2015/668 Schedule 1, Part 1',
  },
  {
    activity: 'Spreading slurry',
    material_type: 'slurry',
    soil_type: 'sandy or shallow',
    closed_period_start: 'Oct 1',
    closed_period_end: 'Jan 31',
    max_application_rate: null,
    conditions: 'Applies to arable land on sandy or shallow soils in NVZ. No spreading during closed period.',
    regulation_ref: 'SI 2015/668 Schedule 1, Part 1',
  },
  {
    activity: 'Spreading slurry',
    material_type: 'slurry',
    soil_type: 'all other soils',
    closed_period_start: 'Oct 15',
    closed_period_end: 'Jan 31',
    max_application_rate: null,
    conditions: 'Applies to all other soil types (not sandy or shallow) in NVZ. No spreading during closed period.',
    regulation_ref: 'SI 2015/668 Schedule 1, Part 1',
  },
  // Poultry manure closed periods — SI 2015/668 Schedule 1
  {
    activity: 'Spreading poultry manure',
    material_type: 'poultry manure',
    soil_type: 'sandy or shallow',
    closed_period_start: 'Aug 1',
    closed_period_end: 'Dec 31',
    max_application_rate: null,
    conditions: 'Applies to grassland on sandy or shallow soils in NVZ. Poultry manure includes litter from broiler and turkey units.',
    regulation_ref: 'SI 2015/668 Schedule 1, Part 1',
  },
  {
    activity: 'Spreading poultry manure',
    material_type: 'poultry manure',
    soil_type: 'sandy or shallow',
    closed_period_start: 'Aug 1',
    closed_period_end: 'Dec 31',
    max_application_rate: null,
    conditions: 'Applies to arable land on sandy or shallow soils in NVZ.',
    regulation_ref: 'SI 2015/668 Schedule 1, Part 1',
  },
  {
    activity: 'Spreading poultry manure',
    material_type: 'poultry manure',
    soil_type: 'all other soils',
    closed_period_start: 'Oct 1',
    closed_period_end: 'Dec 31',
    max_application_rate: null,
    conditions: 'Applies to all other soil types (not sandy or shallow) in NVZ.',
    regulation_ref: 'SI 2015/668 Schedule 1, Part 1',
  },
  // Manufactured fertiliser closed periods — SI 2015/668 Schedule 1
  {
    activity: 'Applying manufactured fertiliser',
    material_type: 'manufactured fertiliser',
    soil_type: 'sandy or shallow',
    closed_period_start: 'Sep 1',
    closed_period_end: 'Jan 15',
    max_application_rate: null,
    conditions: 'Applies to grassland on sandy or shallow soils in NVZ.',
    regulation_ref: 'SI 2015/668 Schedule 1, Part 2',
  },
  {
    activity: 'Applying manufactured fertiliser',
    material_type: 'manufactured fertiliser',
    soil_type: 'sandy or shallow',
    closed_period_start: 'Sep 1',
    closed_period_end: 'Jan 15',
    max_application_rate: null,
    conditions: 'Applies to arable land on sandy or shallow soils in NVZ.',
    regulation_ref: 'SI 2015/668 Schedule 1, Part 2',
  },
  {
    activity: 'Applying manufactured fertiliser',
    material_type: 'manufactured fertiliser',
    soil_type: 'all other soils',
    closed_period_start: 'Sep 15',
    closed_period_end: 'Jan 15',
    max_application_rate: null,
    conditions: 'Applies to grassland on all other soil types in NVZ.',
    regulation_ref: 'SI 2015/668 Schedule 1, Part 2',
  },
  {
    activity: 'Applying manufactured fertiliser',
    material_type: 'manufactured fertiliser',
    soil_type: 'all other soils',
    closed_period_start: 'Sep 15',
    closed_period_end: 'Jan 15',
    max_application_rate: null,
    conditions: 'Applies to arable land on all other soil types in NVZ.',
    regulation_ref: 'SI 2015/668 Schedule 1, Part 2',
  },
  // Nitrogen limits — SI 2015/668 Regulation 10
  {
    activity: 'Nitrogen limit from organic sources',
    material_type: null,
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: '170 kg N/ha/year from organic manure',
    conditions: 'Farm average. Organic manure includes slurry, farmyard manure, poultry manure, sewage sludge, compost. Calculated as farm-level N loading.',
    regulation_ref: 'SI 2015/668 Regulation 10(1)',
  },
  {
    activity: 'Total nitrogen limit',
    material_type: null,
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: '250 kg N/ha/year total (organic + manufactured)',
    conditions: 'Whole farm average. Crop N requirement must be calculated. Nmax limits apply per crop. Field-level limits vary by crop demand.',
    regulation_ref: 'SI 2015/668 Regulation 10 & Schedule 2',
  },
  // Spreading method requirements — DEFRA Clean Air Strategy / NVZ guidance
  {
    activity: 'Slurry spreading method',
    material_type: 'slurry',
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: null,
    conditions: 'From 2025, slurry on grassland in NVZs must use low-emission spreading equipment (trailing shoe, trailing hose, or shallow injection). Broadcast spreading (splash plate) is being phased out. Applies to holdings spreading more than 150 kg organic N from slurry.',
    regulation_ref: 'DEFRA Farming Rules for Water & Clean Air Strategy 2019',
  },
  // Proximity rules — SI 2015/668 Regulation 8
  {
    activity: 'Spreading near surface water',
    material_type: null,
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: null,
    conditions: 'No organic manure or manufactured fertiliser within 2m of surface water. Precision spreading equipment can reduce to 2m; otherwise 10m from surface water for organic manure. 50m from springs, wells, and boreholes.',
    regulation_ref: 'SI 2015/668 Regulation 8; Farming Rules for Water Regulation 4',
  },
  // Condition rules — SI 2015/668 Regulation 7
  {
    activity: 'Spreading on waterlogged ground',
    material_type: null,
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: null,
    conditions: 'No spreading of organic manure or manufactured fertiliser on waterlogged, flooded, frozen, or snow-covered ground. Risk of run-off to watercourses.',
    regulation_ref: 'SI 2015/668 Regulation 7; Farming Rules for Water Regulation 4',
  },
  // Slope rule — SI 2015/668 Regulation 8
  {
    activity: 'Spreading on steep slopes',
    material_type: null,
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: null,
    conditions: 'No organic manure within 50m of surface water on slopes exceeding 12 degrees. On slopes of less than 12 degrees, no spreading within 10m of surface water (6m with precision equipment).',
    regulation_ref: 'SI 2015/668 Regulation 8(3)',
  },
  // FYM-specific rule
  {
    activity: 'Spreading farmyard manure',
    material_type: 'farmyard manure',
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: '250 kg total N/ha per application',
    conditions: 'FYM can be spread outside closed periods. Must be incorporated within 24 hours on bare soil or stubble. No closed period for FYM on grassland (unlike slurry), but the organic N limit of 170 kg N/ha still applies.',
    regulation_ref: 'SI 2015/668 Regulation 7 & Schedule 1',
  },
  // Organic manure N loading plan — SI 2015/668 Regulation 9
  {
    activity: 'Organic manure N loading plan',
    material_type: null,
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: null,
    conditions: 'In NVZs, must calculate total nitrogen content of all organic manure produced on the holding and any imported. Records must include: type of manure, N content (from standard tables or analysis), date and quantity applied, field reference, crop grown. Records kept for a minimum of 5 years and available for EA inspection.',
    regulation_ref: 'SI 2015/668 Regulation 9; DEFRA NVZ Guidance',
  },
  // Nmax limits by crop — SI 2015/668 Schedule 2
  {
    activity: 'Nmax limit — winter wheat',
    material_type: null,
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: '220 kg N/ha',
    conditions: 'Maximum total nitrogen (organic + manufactured) that may be applied to winter wheat in NVZ. Applies at field level. Based on expected yield and soil nitrogen supply. Includes all sources: manufactured fertiliser, organic manure (at crop-available fraction), and mineralisation.',
    regulation_ref: 'SI 2015/668 Schedule 2, Table 2',
  },
  {
    activity: 'Nmax limit — winter barley',
    material_type: null,
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: '180 kg N/ha',
    conditions: 'Maximum total nitrogen for winter barley in NVZ. Field-level limit. Adjusted for soil type, previous cropping, and organic manure applications.',
    regulation_ref: 'SI 2015/668 Schedule 2, Table 2',
  },
  {
    activity: 'Nmax limit — spring barley',
    material_type: null,
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: '150 kg N/ha',
    conditions: 'Maximum total nitrogen for spring barley in NVZ. Field-level limit.',
    regulation_ref: 'SI 2015/668 Schedule 2, Table 2',
  },
  {
    activity: 'Nmax limit — grass (cut)',
    material_type: null,
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: '300 kg N/ha',
    conditions: 'Maximum total nitrogen for cut grass (silage/hay) in NVZ. Higher limit reflects greater N offtake by cut grass compared to grazed. Applies at field level.',
    regulation_ref: 'SI 2015/668 Schedule 2, Table 2',
  },
  {
    activity: 'Nmax limit — grass (grazed)',
    material_type: null,
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: '250 kg N/ha',
    conditions: 'Maximum total nitrogen for grazed grassland in NVZ. Lower than cut grass because grazing livestock return N in dung and urine. Includes N deposited by livestock during grazing.',
    regulation_ref: 'SI 2015/668 Schedule 2, Table 2',
  },
  {
    activity: 'Nmax limit — potatoes',
    material_type: null,
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: '270 kg N/ha',
    conditions: 'Maximum total nitrogen for potatoes in NVZ. Includes all sources. Potato crops have high N demand but residual N after harvest can contribute to leaching risk.',
    regulation_ref: 'SI 2015/668 Schedule 2, Table 2',
  },
  {
    activity: 'Nmax limit — sugar beet',
    material_type: null,
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: '120 kg N/ha',
    conditions: 'Maximum total nitrogen for sugar beet in NVZ. Low Nmax reflects the crop\'s lower N demand and the risk of excess N reducing sugar content.',
    regulation_ref: 'SI 2015/668 Schedule 2, Table 2',
  },
  {
    activity: 'Nmax limit — oilseed rape',
    material_type: null,
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: '250 kg N/ha',
    conditions: 'Maximum total nitrogen for oilseed rape (winter and spring) in NVZ. Field-level limit. Autumn N applications for establishment should be included in the total.',
    regulation_ref: 'SI 2015/668 Schedule 2, Table 2',
  },
  // Precision farming Nmax exemption — SI 2015/668 Regulation 10(3)
  {
    activity: 'Precision farming Nmax exemption',
    material_type: null,
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: null,
    conditions: 'Farmers may apply above Nmax limits if justified by soil analysis, tissue testing, or crop-specific data showing higher N demand. Must keep records of the evidence (soil N tests, tissue analysis, expected yield data) for 5 years. The excess application must be proportionate to demonstrated crop requirement.',
    regulation_ref: 'SI 2015/668 Regulation 10(3); DEFRA NVZ Guidance',
  },
  // Pre-application risk assessment — Farming Rules for Water Regulation 4
  {
    activity: 'Pre-application risk assessment',
    material_type: null,
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: null,
    conditions: 'Before each application of organic manure or manufactured fertiliser, a risk assessment must consider: weather forecast (no rain within 24-48 hours), soil conditions (moisture, compaction, frost), slope and proximity to watercourses, and ground conditions (waterlogged, frozen, snow-covered). No formal form is required but records of the assessment must be available.',
    regulation_ref: 'Farming Rules for Water SI 2018/151 Regulation 4; SI 2015/668 Regulation 7',
  },
  // Autumn organic manure limits — SI 2015/668 Regulation 11
  {
    activity: 'Autumn organic manure application limits',
    material_type: 'slurry',
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: '250 kg N/ha (slurry); 125 kg N/ha (poultry manure)',
    conditions: 'Between 1 August and 31 October, organic manure applications to arable land must not exceed 250 kg total N/ha for slurry and 125 kg total N/ha for poultry manure. These limits apply per application, not cumulatively. Purpose: reduce autumn leaching risk.',
    regulation_ref: 'SI 2015/668 Regulation 11; DEFRA NVZ Guidance',
  },
  // Planned N application records — SI 2015/668 Regulation 9(2)
  {
    activity: 'Planned N application records',
    material_type: null,
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: null,
    conditions: 'Planned nitrogen applications must be recorded before spreading begins. Records include: field reference, crop, planned N rate, source (organic/manufactured), expected date. Records must be kept for 5 years. Actual applications must also be recorded within 1 week of spreading.',
    regulation_ref: 'SI 2015/668 Regulation 9(2); DEFRA NVZ Guidance',
  },
  // Livestock manure N production — SI 2015/668 Schedule 3 (standard values)
  {
    activity: 'Livestock manure N production — dairy cow',
    material_type: null,
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: '85 kg N/year per dairy cow',
    conditions: 'Standard N excretion value for a dairy cow (annual average, including time housed and at grazing). Used to calculate whole-farm organic N loading against the 170 kg N/ha limit. Actual excretion varies with yield and diet — use standard table values for NVZ compliance unless farm-specific data submitted to EA.',
    regulation_ref: 'SI 2015/668 Schedule 3, Table 1; DEFRA NVZ Guidance (standard values)',
  },
  {
    activity: 'Livestock manure N production — suckler cow',
    material_type: null,
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: '65 kg N/year per suckler cow',
    conditions: 'Standard N excretion for a beef suckler cow. Includes calf at foot to weaning.',
    regulation_ref: 'SI 2015/668 Schedule 3, Table 1',
  },
  {
    activity: 'Livestock manure N production — store cattle',
    material_type: null,
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: '35 kg N/year per store cattle beast',
    conditions: 'Standard N excretion for store cattle (growing/finishing beef animals).',
    regulation_ref: 'SI 2015/668 Schedule 3, Table 1',
  },
  {
    activity: 'Livestock manure N production — breeding ewe',
    material_type: null,
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: '13 kg N/year per breeding ewe',
    conditions: 'Standard N excretion for a breeding ewe including lamb(s) to weaning.',
    regulation_ref: 'SI 2015/668 Schedule 3, Table 1',
  },
  {
    activity: 'Livestock manure N production — fattening pig',
    material_type: null,
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: '11 kg N/year per fattening pig place',
    conditions: 'Standard N excretion for a fattening pig place (per production cycle, annualised). Excludes breeding sows which have a separate value.',
    regulation_ref: 'SI 2015/668 Schedule 3, Table 1',
  },
  {
    activity: 'Livestock manure N production — layer hen',
    material_type: null,
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: '0.8 kg N/year per layer hen',
    conditions: 'Standard N excretion for a laying hen (in-lay period). Poultry manure has high N concentration and is subject to stricter closed periods than slurry.',
    regulation_ref: 'SI 2015/668 Schedule 3, Table 1',
  },
  // Spreading equipment standards — DEFRA Clean Air Strategy 2019 / NVZ guidance
  {
    activity: 'Spreading equipment standards (from 2025)',
    material_type: 'slurry',
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: null,
    conditions: 'From 2025, slurry spreading in NVZs using splash plate (broadcast) is banned for holdings spreading >150 kg organic N from slurry. Mandatory equipment: trailing shoe, dribble bar (trailing hose), or shallow injection. Reduces ammonia emissions by 30-90% compared to splash plate. Applies to grassland and arable in NVZs.',
    regulation_ref: 'DEFRA Clean Air Strategy 2019; SI 2015/668 as amended; Reduction and Prevention of Agricultural Diffuse Pollution (England) Regulations 2018',
  },
  // NVZ designation review cycle — SI 2015/668 Regulation 3
  {
    activity: 'NVZ designation review cycle',
    material_type: null,
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: null,
    conditions: 'NVZ boundaries are reviewed every 4 years based on water quality monitoring data. Current designations date from 2024. Next review expected 2028. Farmers whose land enters or leaves an NVZ are notified by DEFRA. NVZ maps are published on the gov.uk MAGIC mapping system.',
    regulation_ref: 'SI 2015/668 Regulation 3; Nitrates Directive 91/676/EEC Article 3',
  },
  // Grassland derogation — SI 2015/668 Regulation 10(4)
  {
    activity: 'Grassland derogation (250 kg organic N/ha)',
    material_type: null,
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: '250 kg organic N/ha/year (derogation limit)',
    conditions: 'Holdings with 80% or more grassland may apply to the Environment Agency for a derogation allowing up to 250 kg organic N/ha/year (instead of the standard 170 kg). Conditions: must submit an annual fertilisation plan, maintain grassland percentage, keep detailed records, and comply with all other NVZ rules. Application must be renewed annually.',
    regulation_ref: 'SI 2015/668 Regulation 10(4); Nitrates Directive 91/676/EEC; Commission Decision 2020/1073',
  },
  // Farming Rules for Water — SI 2018/151
  {
    activity: 'Farming Rules for Water — Rule 1: Plan applications',
    material_type: null,
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: null,
    conditions: 'Soil testing must be carried out at least every 5 years to determine nutrient status (pH, P, K, Mg). Organic manure and manufactured fertiliser applications must be planned to match crop demand, accounting for nutrients already in the soil and from previous organic applications. Over-application is a regulatory offence.',
    regulation_ref: 'Farming Rules for Water SI 2018/151 Regulation 4(1)',
  },
  {
    activity: 'Farming Rules for Water — Rule 2: Protect against diffuse pollution',
    material_type: null,
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: null,
    conditions: 'Cultivated land must be managed to prevent soil and organic matter from entering surface water or groundwater. Do not leave bare soil over winter if there is a run-off risk — establish cover crops, stubble, or green manure. Avoid cultivating waterlogged ground. Maintain field drainage to avoid surface ponding.',
    regulation_ref: 'Farming Rules for Water SI 2018/151 Regulation 4(2)',
  },
  {
    activity: 'Farming Rules for Water — Rule 3: Manage livestock near water',
    material_type: null,
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: null,
    conditions: 'Livestock must not be allowed to damage (poach) the banks and beds of watercourses. Where animals have access to watercourses, provide alternative drinking points (troughs). Fence stock out of watercourses where poaching risk is high. Avoid overwintering livestock on saturated land adjacent to watercourses.',
    regulation_ref: 'Farming Rules for Water SI 2018/151 Regulation 4(3)',
  },
  {
    activity: 'Farming Rules for Water — Rule 4: Manage soil condition',
    material_type: null,
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: null,
    conditions: 'Take all reasonable steps to maintain soil structure and prevent compaction. Avoid trafficking wet soils with heavy machinery. Use low ground-pressure tyres or tracked vehicles where appropriate. Subsoil if compaction pans are identified. Maintain soil organic matter through crop rotations, cover cropping, and organic amendments.',
    regulation_ref: 'Farming Rules for Water SI 2018/151 Regulation 4(4)',
  },
  {
    activity: 'Farming Rules for Water — Rule 5: Prevent erosion and runoff',
    material_type: null,
    soil_type: null,
    closed_period_start: null,
    closed_period_end: null,
    max_application_rate: null,
    conditions: 'Take all reasonable steps to prevent erosion and run-off from agricultural land. On sloping land, consider: contour cultivation, across-slope tramlines, cover crops, beetle banks, buffer strips. Do not cultivate land adjacent to watercourses if erosion risk is high. On light soils, avoid leaving land bare after harvest where wind erosion risk exists.',
    regulation_ref: 'Farming Rules for Water SI 2018/151 Regulation 4(5)',
  },
];

// ── Storage Requirements ─────────────────────────────────────────
// Source: SSAFO Regulations SI 2010/639, Environment Agency guidance

interface StorageReq {
  material: string;
  min_capacity_months: number | null;
  construction_standard: string;
  separation_distance_m: number | null;
  inspection_frequency: string;
  regulation_ref: string;
}

const STORAGE_REQUIREMENTS: StorageReq[] = [
  {
    material: 'Slurry',
    min_capacity_months: 6,
    construction_standard: 'Concrete or steel tank, above or below ground. Must be impermeable. Channels and reception pits must also be impermeable. New stores must comply with BS 5502 Part 50. SSAFO notification to EA required 14 days before construction.',
    separation_distance_m: 10,
    inspection_frequency: 'Weekly visual check for leaks and structural damage. Annual professional inspection recommended.',
    regulation_ref: 'SI 2010/639 (SSAFO); SI 2015/668 Regulation 14 (NVZ 6-month capacity)',
  },
  {
    material: 'Silage effluent',
    min_capacity_months: null,
    construction_standard: 'Sealed silo base with effluent collection system. Impermeable channels to collection tank. Silos must have minimum 450mm walls or kerbs. Effluent tank capacity: minimum 20 litres per tonne of silage storage capacity for field clamps. SSAFO notification required.',
    separation_distance_m: 10,
    inspection_frequency: 'Check effluent tank before and during silage season. Empty as needed.',
    regulation_ref: 'SI 2010/639 Part 2 (Silage)',
  },
  {
    material: 'Farmyard manure (FYM) — temporary field heap',
    min_capacity_months: null,
    construction_standard: 'Temporary field heap permitted for maximum 12 months. Must not be in the same place within 2 years. Do not site on land that is waterlogged, within 50m of a spring/well/borehole, within 10m of surface water, or on a slope where run-off could enter a watercourse.',
    separation_distance_m: 10,
    inspection_frequency: 'Monitor for run-off during wet weather. Cover if practical to reduce leaching.',
    regulation_ref: 'SI 2015/668 Regulation 12; DEFRA NVZ Guidance',
  },
  {
    material: 'Agricultural fuel oil',
    min_capacity_months: null,
    construction_standard: 'Fixed tank on impermeable base with secondary containment (bund) of at least 110% of tank capacity. Bund must be impermeable (concrete, masonry, or proprietary system). Fill pipe and vent within bund. Sight gauge must not leak. Mobile bowsers are exempt from bunding but must be on an impermeable surface when stored.',
    separation_distance_m: 10,
    inspection_frequency: 'Annual inspection. Check tank, pipework, bund, and overfill protection. Report spillages to EA immediately.',
    regulation_ref: 'SI 2010/639 Part 4 (Agricultural Fuel Oil); Oil Storage Regulations 2001',
  },
  {
    material: 'Pesticides',
    min_capacity_months: null,
    construction_standard: 'Locked, dedicated store with impermeable floor and bund capable of holding 110% of the largest container. Separate from other chemicals, seeds, and feed. Adequate ventilation. Warning signs displayed. COSHH assessment required.',
    separation_distance_m: null,
    inspection_frequency: 'Regular stock checks. Annual review of stored products. Dispose of out-of-date products via approved waste carrier.',
    regulation_ref: 'Control of Pesticides Regulations 1986; COSHH 2002; HSE Guidance',
  },
  {
    material: 'Sheep dip (used)',
    min_capacity_months: null,
    construction_standard: 'Spent dip is hazardous waste. Must be stored in a sealed, labelled container on an impermeable surface. No discharge to watercourse, drain, or soakaway. Licensed disposal only via approved waste carrier (organophosphate or synthetic pyrethroid). Some farmers use reed-bed treatment under EA permit.',
    separation_distance_m: null,
    inspection_frequency: 'After each dipping session. Ensure no leaks from storage containers.',
    regulation_ref: 'Environmental Permitting Regulations 2016; Hazardous Waste Regulations 2005; Groundwater Regulations',
  },
  // New slurry store construction standards — SSAFO 2010
  {
    material: 'Slurry (new store construction)',
    min_capacity_months: 6,
    construction_standard: 'New slurry stores must comply with SSAFO 2010 (SI 2010/639) construction standards. Concrete to BS 8110 (structural concrete) or BS 8007 (liquid-retaining structures). Steel components to BS 5502 Part 50. Impermeable lining required. Must withstand 1.3x design load. EA must be notified 14 days before construction starts. Design life minimum 20 years.',
    separation_distance_m: 10,
    inspection_frequency: 'Weekly visual check for leaks, cracks, or structural damage. Annual professional structural inspection. First inspection within 6 months of commissioning.',
    regulation_ref: 'SI 2010/639 (SSAFO) Part 3; BS 8110; BS 5502 Part 50',
  },
  // Pre-1991 stores
  {
    material: 'Slurry (pre-1991 existing store)',
    min_capacity_months: null,
    construction_standard: 'Stores built before March 1991 are not required to meet SSAFO 2010 construction standards, BUT must not cause pollution. If the EA determines that an existing store is causing or is likely to cause pollution, the farmer must repair or replace it within a timeframe set by the EA. Enforcement action can be taken under the Environmental Permitting Regulations.',
    separation_distance_m: null,
    inspection_frequency: 'Regular inspection for signs of leakage, cracking, or structural deterioration. Immediate action required if pollution is identified.',
    regulation_ref: 'SI 2010/639 Regulation 3 (exemption for existing stores); Environmental Permitting Regulations 2016',
  },
  // Temporary field heap of FYM — expanded
  {
    material: 'Farmyard manure — temporary field heap (NVZ)',
    min_capacity_months: null,
    construction_standard: 'Temporary field heaps in NVZ: must NOT be within 50m of a spring, well, or borehole; must NOT be within 10m of surface water; must NOT be sited in the same field location within 2 consecutive years; must NOT be placed on land prone to flooding or waterlogging; maximum storage duration 12 months. No base is required but run-off must not reach watercourses.',
    separation_distance_m: 50,
    inspection_frequency: 'Monitor for run-off during wet weather. Move heap if leachate is visible. Cover heap with sheeting if practical to reduce nutrient leaching.',
    regulation_ref: 'SI 2015/668 Regulation 12; DEFRA NVZ Guidance',
  },
  // Digestate from anaerobic digestion
  {
    material: 'Digestate (anaerobic digestion)',
    min_capacity_months: 6,
    construction_standard: 'Digestate (whole, separated liquor, or separated fibre) from anaerobic digestion is classified the same as slurry for storage and spreading purposes if derived from agricultural waste. Must be stored in SSAFO-compliant tanks with 6 months minimum capacity in NVZs. Digestate from non-agricultural inputs may require Environmental Permit as waste.',
    separation_distance_m: 10,
    inspection_frequency: 'Weekly visual check. Same regime as slurry storage. Gas safety monitoring also required for AD plant.',
    regulation_ref: 'SI 2010/639 (SSAFO); SI 2015/668 (NVZ); PAS 110 (quality protocol for digestate); Environmental Permitting Regulations 2016',
  },
  // Dirty water (yard washings)
  {
    material: 'Dirty water (yard washings)',
    min_capacity_months: null,
    construction_standard: 'Dirty water (lightly contaminated yard washings, milking parlour washings) must be kept separate from slurry where possible. Can be irrigated to land at a rate not exceeding 5mm per hour and not exceeding 50 m3/ha per application. Must not be applied within 10m of a watercourse or 50m of a spring/borehole. Clean roof water must be separated from dirty water systems to reduce storage volume.',
    separation_distance_m: 50,
    inspection_frequency: 'Regular checks of separator valves, diverter systems, and irrigation equipment. Ensure clean and dirty water systems remain separated.',
    regulation_ref: 'SI 2010/639; DEFRA COGAP; Farming Rules for Water SI 2018/151',
  },
];

// ── Buffer Strip Rules ───────────────────────────────────────────
// Source: Farming Rules for Water SI 2018/151, NVZ Regulations, SFI scheme

interface BufferStripRule {
  watercourse_type: string;
  activity: string | null;
  min_width_m: number;
  conditions: string;
  scheme_payment: string | null;
  regulation_ref: string;
}

const BUFFER_STRIP_RULES: BufferStripRule[] = [
  {
    watercourse_type: 'Main river',
    activity: 'Spreading organic manure',
    min_width_m: 10,
    conditions: 'No organic manure within 10m of a main river (6m with precision spreading equipment). Applies in all areas, not just NVZs. Farming Rules for Water require that soil and organic matter are not allowed to enter surface water.',
    scheme_payment: null,
    regulation_ref: 'Farming Rules for Water SI 2018/151 Regulation 4; SI 2015/668 Regulation 8',
  },
  {
    watercourse_type: 'Main river',
    activity: 'Applying manufactured fertiliser',
    min_width_m: 2,
    conditions: 'No manufactured fertiliser within 2m of surface water. COGAP (Code of Good Agricultural Practice) recommends wider buffers where practical.',
    scheme_payment: null,
    regulation_ref: 'Farming Rules for Water SI 2018/151 Regulation 4',
  },
  {
    watercourse_type: 'Ordinary watercourse',
    activity: 'Spreading organic manure',
    min_width_m: 10,
    conditions: 'No organic manure within 10m (6m with precision equipment). Ordinary watercourses include ditches connected to rivers.',
    scheme_payment: null,
    regulation_ref: 'Farming Rules for Water SI 2018/151 Regulation 4',
  },
  {
    watercourse_type: 'Ordinary watercourse',
    activity: 'Applying manufactured fertiliser',
    min_width_m: 2,
    conditions: 'No manufactured fertiliser within 2m of any surface water.',
    scheme_payment: null,
    regulation_ref: 'Farming Rules for Water SI 2018/151 Regulation 4',
  },
  {
    watercourse_type: 'Lake or reservoir',
    activity: 'Spreading organic manure in NVZ',
    min_width_m: 6,
    conditions: 'Minimum 6m buffer for organic manure in NVZ areas. 50m exclusion zone around any spring, well, or borehole used for water supply.',
    scheme_payment: null,
    regulation_ref: 'SI 2015/668 Regulation 8; Farming Rules for Water',
  },
  {
    watercourse_type: 'Any surface water',
    activity: 'SFI buffer strip (4-6m)',
    min_width_m: 4,
    conditions: 'SFI action SW3: 4-6m grass buffer strips along watercourses. Must be maintained as grass, not cultivated. No fertiliser or pesticides applied to the buffer strip.',
    scheme_payment: 'SW3: up to 451 GBP/ha/year (2024 SFI rates)',
    regulation_ref: 'SFI 2024 Handbook — SW3 Manage buffer strips next to a watercourse',
  },
  {
    watercourse_type: 'Any surface water',
    activity: 'SFI enhanced buffer strip (10-12m)',
    min_width_m: 10,
    conditions: 'SFI action SW3 enhanced: 10-12m grass buffer strips for additional environmental benefit. Wider buffers reduce sediment and nutrient run-off more effectively.',
    scheme_payment: 'SW3 enhanced: up to 451 GBP/ha/year (2024 SFI rates)',
    regulation_ref: 'SFI 2024 Handbook — SW3',
  },
  {
    watercourse_type: 'Hedgerow',
    activity: 'Cultivation or spraying',
    min_width_m: 1,
    conditions: 'Minimum 1m from the centre of the hedge. Cross-compliance (GAEC 7a) requires hedgerow buffers. No cultivation or application of fertilisers or pesticides within this strip.',
    scheme_payment: null,
    regulation_ref: 'Cross-compliance GAEC 7a; Hedgerow Regulations 1997',
  },
  // Organic manure NVZ buffer — SI 2015/668 Regulation 8
  {
    watercourse_type: 'Any surface water (NVZ)',
    activity: 'Spreading organic manure in NVZ',
    min_width_m: 10,
    conditions: 'In NVZs, no organic manure within 10m of surface water (reduced to 6m with precision spreading equipment such as trailing shoe or dribble bar). 50m exclusion zone around any spring, well, or borehole regardless of precision equipment.',
    scheme_payment: null,
    regulation_ref: 'SI 2015/668 Regulation 8(1) and (2)',
  },
  // Manufactured fertiliser buffer
  {
    watercourse_type: 'Any surface water',
    activity: 'Applying manufactured fertiliser',
    min_width_m: 2,
    conditions: 'No manufactured fertiliser within 2m of any surface water. Applies everywhere, not just NVZs. Fertiliser spreader must be calibrated and adjusted to prevent drift into the buffer zone.',
    scheme_payment: null,
    regulation_ref: 'Farming Rules for Water SI 2018/151 Regulation 4; COGAP',
  },
  // Pesticide LERAP buffers
  {
    watercourse_type: 'Any surface water',
    activity: 'Pesticide application (LERAP)',
    min_width_m: 1,
    conditions: 'LERAP (Local Environmental Risk Assessment for Pesticides) determines buffer width: Category A products require a fixed 5m buffer (no reduction possible). Category B products allow risk assessment to reduce default buffer from 5m down to 1m based on nozzle type and watercourse width. Maximum buffer can be up to 30m depending on product label. LERAP records must be kept for 3 years.',
    scheme_payment: null,
    regulation_ref: 'Plant Protection Products (Sustainable Use) Regulations 2012; LERAP Guidance (CRD)',
  },
  // SFI SW1 and SW2 (expanded buffer strip actions)
  {
    watercourse_type: 'Any watercourse',
    activity: 'SFI SW1 (4m grass buffer strip)',
    min_width_m: 4,
    conditions: 'SFI action SW1: establish and maintain a 4m grass buffer strip along a watercourse. Must be along a qualifying watercourse. No fertiliser, manure, or pesticides on the strip. Maintain as grass — do not cultivate, plough, or reseed without agreement.',
    scheme_payment: 'SW1: 451 GBP/ha/year (2024 SFI rates)',
    regulation_ref: 'SFI 2024 Handbook — SW1',
  },
  {
    watercourse_type: 'Any watercourse',
    activity: 'SFI SW2 (6m enhanced buffer strip)',
    min_width_m: 6,
    conditions: 'SFI action SW2: establish and maintain a 6m enhanced buffer strip along a watercourse. Wider strip provides greater interception of sediment and nutrients. Same management rules as SW1 — no inputs, maintained as grass.',
    scheme_payment: 'SW2: 492 GBP/ha/year (2024 SFI rates)',
    regulation_ref: 'SFI 2024 Handbook — SW2',
  },
];

// ── Abstraction Rules ────────────────────────────────────────────
// Source: Water Resources Act 1991, Water Abstraction and Impounding Regulations 2006

interface AbstractionRule {
  source_type: string;
  threshold_m3_per_day: number;
  licence_required: boolean;
  exemptions: string;
  conditions: string;
}

const ABSTRACTION_RULES: AbstractionRule[] = [
  {
    source_type: 'Surface water (inland)',
    threshold_m3_per_day: 20,
    licence_required: true,
    exemptions: 'Exempt if less than 20 m3/day for domestic or agricultural use (not spray irrigation). Fire-fighting and certain navigation uses also exempt.',
    conditions: 'Licence application to the Environment Agency. May include conditions on timing, rate, and return flows. Hands-off flow conditions may restrict abstraction in low-flow periods. New Abstraction Reform may convert existing licences.',
  },
  {
    source_type: 'Groundwater (borehole, well, spring)',
    threshold_m3_per_day: 20,
    licence_required: true,
    exemptions: 'Exempt if less than 20 m3/day for domestic or agricultural use (not spray irrigation). Dewatering of mines and quarries has separate rules.',
    conditions: 'Licence application to the Environment Agency. Groundwater investigation consent may be needed before drilling. Source Protection Zone restrictions may apply. Abstraction must not cause environmental damage.',
  },
  {
    source_type: 'Surface water for spray irrigation',
    threshold_m3_per_day: 0,
    licence_required: true,
    exemptions: 'No small-quantity exemption for spray irrigation. All spray irrigation from surface water requires a licence regardless of volume.',
    conditions: 'Spray irrigation licences are typically time-limited and may include Section 57 (drought) restrictions. Hands-off flow conditions are common. Metering is required.',
  },
  {
    source_type: 'Tidal water',
    threshold_m3_per_day: 20,
    licence_required: true,
    exemptions: 'Exempt if less than 20 m3/day. Tidal abstraction for navigation purposes is separately regulated.',
    conditions: 'Different licensing regime from inland waters. Generally less restrictive but still requires EA licence above the threshold. Salinity considerations for agricultural use.',
  },
  // Drip/trickle irrigation exemption
  {
    source_type: 'Drip/trickle irrigation (surface or ground)',
    threshold_m3_per_day: 20,
    licence_required: true,
    exemptions: 'May be exempt from licensing if abstraction is less than 20 m3/day from surface or groundwater for drip/trickle irrigation (non-spray). However, farmers should check with the local EA office — some catchments have bespoke requirements. Trickle irrigation is NOT spray irrigation so the small-quantity exemption can apply.',
    conditions: 'Drip/trickle irrigation is classed as non-spray and therefore qualifies for the 20 m3/day domestic/agricultural exemption. Must register the exemption with the EA even if no licence is needed. If total abstraction from the source (including other uses) exceeds 20 m3/day, a licence is required.',
  },
  // Spray irrigation — no exemption
  {
    source_type: 'Spray irrigation (all sources)',
    threshold_m3_per_day: 0,
    licence_required: true,
    exemptions: 'NO small-quantity exemption for spray irrigation. All spray irrigation requires an abstraction licence regardless of the volume abstracted. This is a statutory requirement under the Water Resources Act 1991.',
    conditions: 'Spray irrigation licences are typically time-limited and may include Section 57 (drought) restrictions, hands-off flow conditions, metering requirements, and seasonal volume limits. Licence applications must demonstrate no unacceptable impact on existing abstractors or the environment. Typical processing time 3-12 months.',
  },
  // Winter abstraction licences
  {
    source_type: 'Winter abstraction (reservoir filling)',
    threshold_m3_per_day: 20,
    licence_required: true,
    exemptions: 'No special exemption for winter abstraction. Standard 20 m3/day exemption applies if not spray irrigation.',
    conditions: 'Some EA areas offer winter-only abstraction licences at reduced cost for filling on-farm reservoirs (typically November to March). Winter abstraction has lower environmental impact because river flows are generally higher. Reservoir storage can then be used for summer spray irrigation without a summer licence. EA encourages reservoir construction to reduce pressure on summer water resources.',
  },
  // Time-limited licences (post-2014)
  {
    source_type: 'All sources (new licences since 2014)',
    threshold_m3_per_day: 20,
    licence_required: true,
    exemptions: 'Standard exemptions apply as per source type.',
    conditions: 'All new abstraction licences issued since 2014 are time-limited (typically 12 years, maximum 12 years). On expiry, the licence holder must re-apply. The EA may impose new conditions or refuse renewal if environmental conditions have changed. Existing permanent licences are being progressively converted to time-limited licences through the Abstraction Reform programme.',
  },
];

// ── Pollution Prevention ─────────────────────────────────────────
// Source: Environment Agency guidance, DEFRA Farming Rules for Water, COGAP

interface PollutionPrevention {
  activity: string;
  hazards: string;
  control_measures: string;
  regulatory_requirements: string;
  regulation_ref: string;
}

const POLLUTION_PREVENTION: PollutionPrevention[] = [
  {
    activity: 'Silage making',
    hazards: 'Silage effluent is 200 times more polluting than raw sewage (BOD ~60,000 mg/l). Can deoxygenate watercourses and cause fish kills.',
    control_measures: 'Sealed silo base, effluent collection channels and tank. Ensure silage clamp walls are at least 450mm high. Cover silage to reduce effluent production. Wilting grass to 25-30% DM reduces effluent volume by over 80%. Monitor effluent tank levels during silage season.',
    regulatory_requirements: 'SSAFO compliant silo and effluent system. 14 days notice to EA before construction. Effluent must not enter any watercourse, drain, or groundwater.',
    regulation_ref: 'SI 2010/639 Part 2; Farming Rules for Water',
  },
  {
    activity: 'Sheep dipping',
    hazards: 'Organophosphate (OP) and synthetic pyrethroid (SP) dips are toxic to aquatic life at very low concentrations. Spent dip is classified as hazardous waste.',
    control_measures: 'Use a dedicated dipping area on impermeable ground, away from watercourses. Collect all drainings from dipped sheep. Allow sheep to drain fully before release to pasture. Do not dip near watercourses, drains, boreholes, or porous ground.',
    regulatory_requirements: 'Hazardous waste registration. Disposal via licensed waste carrier only. Keep records of dip use and disposal for 3 years. Report any spillage to the EA immediately.',
    regulation_ref: 'Environmental Permitting Regulations 2016; Hazardous Waste Regulations 2005; Groundwater Directive',
  },
  {
    activity: 'Pesticide handling and spraying',
    hazards: 'Pesticide contamination of watercourses from drift, run-off, or washdown water. Point-source pollution from filling, mixing, and cleaning sprayers.',
    control_measures: 'Triple-rinse containers and add rinsate to spray tank. Use a biobed or bioberm for sprayer washdown. Fill sprayers from mains water or bowser (not watercourse). Maintain 6m no-spray buffer next to watercourses. Use LERAP (Local Environment Risk Assessment for Pesticides) for products near water.',
    regulatory_requirements: 'PA1/PA2/PA6 sprayer operator certificates. Sprayer tested every 14 months (NSTS). COSHH assessment. Records of all applications (product, rate, date, field, weather). Cross-compliance SMR10.',
    regulation_ref: 'Plant Protection Products Regulation 1107/2009; Sustainable Use Directive 2009/128/EC; COSHH 2002',
  },
  {
    activity: 'Fuel storage and handling',
    hazards: 'Diesel and oil spills contaminate soil and watercourses. Single-skin tanks without bunds are a common source of agricultural pollution.',
    control_measures: 'Bunded storage (110% capacity). Impermeable base. Regular inspection of tanks, valves, and pipework. Spill kits at fuelling points. Supervised deliveries only. Lock valves when not in use. Mobile bowsers on impermeable surface when parked.',
    regulatory_requirements: 'Oil Storage Regulations 2001 for tanks over 200 litres. SSAFO regulations for agricultural fuel. Report any spillage to the EA (0800 80 70 60). Contaminated soil is controlled waste.',
    regulation_ref: 'Oil Storage Regulations 2001; SI 2010/639 Part 4; Environmental Damage Regulations 2015',
  },
  {
    activity: 'Slurry spreading and management',
    hazards: 'Slurry run-off causes eutrophication, deoxygenation, and ammonia toxicity in watercourses. Ammonia emissions contribute to air pollution and PM2.5.',
    control_measures: 'Apply at appropriate rates based on crop N demand. Use low-emission spreading (trailing shoe, shallow injection). Do not apply when rain is forecast within 24 hours or on saturated ground. Incorporate on bare land within 24 hours. Maintain buffer strips.',
    regulatory_requirements: 'NVZ closed periods apply. Maximum 170 kg N/ha from organic manure. 250 kg total N/ha. Records of all applications (date, field, type, quantity). Slurry spreading plan. 6 months storage minimum in NVZs.',
    regulation_ref: 'SI 2015/668; Farming Rules for Water SI 2018/151; Clean Air Strategy 2019',
  },
  {
    activity: 'Fertiliser storage and handling',
    hazards: 'Fertiliser run-off causes eutrophication in watercourses. Ammonium nitrate is an oxidiser and security-sensitive material.',
    control_measures: 'Store under cover on an impermeable base. Keep away from watercourses, drains, and organic materials. Ensure no run-off from storage area reaches watercourses. Clean up spillages immediately. Secure AN stores (DOJSIG requirements for ammonium nitrate over 5 tonnes).',
    regulatory_requirements: 'Farming Rules for Water: must plan fertiliser applications. NVZ: Nmax limits per crop. Records of N applications (date, amount, crop, field). Risk assessment for fertiliser storage.',
    regulation_ref: 'Farming Rules for Water SI 2018/151; SI 2015/668; COMAH for large AN stores; DOJSIG',
  },
  {
    activity: 'Agricultural waste burning',
    hazards: 'Smoke causes air pollution and nuisance. Ash can contaminate watercourses. Burning restricted materials is an offence.',
    control_measures: 'Only burn plant tissue grown on the land (straw, hedge trimmings, untreated wood). Do not burn plastics, tyres, oil, treated wood, or other waste. Keep fire well away from hedgerows, trees, and watercourses. Notify EA if burning on waste exemption.',
    regulatory_requirements: 'Environmental Permitting Regulations 2016 (waste burning). Agricultural waste exemption D7 allows burning plant tissue on the land where it was produced. Smoke nuisance actionable under Environmental Protection Act 1990. Heather and grass burning: Heather and Grass etc. Burning (England) Regulations 2021.',
    regulation_ref: 'Environmental Permitting Regulations 2016; Clean Air Act 1993; Environmental Protection Act 1990',
  },
  {
    activity: 'Land drainage',
    hazards: 'Drainage works can alter water tables, increase flood risk downstream, and mobilise pollutants from agricultural land into watercourses.',
    control_measures: 'Assess environmental impact before installing drainage. Manage outfalls to prevent erosion. Consider controlled drainage or constructed wetlands. Maintain existing drains to prevent blockage and flooding.',
    regulatory_requirements: 'Ordinary Watercourse consent from the Lead Local Flood Authority for works affecting flow in ordinary watercourses. Environmental Permit from EA for works on main rivers. Land Drainage Act 1991. Potential EIA requirement for large-scale drainage.',
    regulation_ref: 'Land Drainage Act 1991; Flood and Water Management Act 2010; Environmental Permitting Regulations 2016',
  },
  // Anaerobic digestion
  {
    activity: 'Anaerobic digestion (digestate and emissions)',
    hazards: 'Digestate run-off causes same eutrophication as slurry. CHP (combined heat and power) engines produce NOx and particulate emissions. Biogas leaks contribute to greenhouse gas emissions (methane).',
    control_measures: 'Store digestate in SSAFO-compliant tanks (same rules as slurry). Spread digestate following NVZ rules — closed periods, buffer strips, Nmax limits all apply. CHP engines must meet Medium Combustion Plant Directive (MCPD) emission limits. Monitor and maintain biogas containment to prevent methane leaks. Separate digestate into solid and liquid fractions where practical to improve application accuracy.',
    regulatory_requirements: 'Environmental Permit for the AD plant itself (from EA). Digestate from agricultural waste can be spread under farming rules; digestate from mixed waste requires PAS 110 certification. CHP engines >1 MW require MCPD registration. Odour management plan required as part of the Environmental Permit.',
    regulation_ref: 'Environmental Permitting Regulations 2016; SI 2010/639 (SSAFO); SI 2015/668 (NVZ); Medium Combustion Plant Directive 2015/2193/EU; PAS 110',
  },
  // Farm tracks near watercourses
  {
    activity: 'Farm tracks near watercourses',
    hazards: 'Surface run-off from unsurfaced or poorly maintained farm tracks carries sediment, manure, and nutrients into watercourses. A significant source of diffuse pollution in many catchments.',
    control_measures: 'Install cross-drains (water bars) every 20-30m on sloping tracks to divert water into field margins rather than watercourses. Surface tracks with crushed stone or concrete where they run alongside watercourses. Maintain drainage ditches alongside tracks. Avoid routing livestock along tracks immediately adjacent to watercourses.',
    regulatory_requirements: 'Farming Rules for Water require management of run-off from all agricultural land, including tracks and hardstandings. No specific construction standard but EA can take enforcement action if a track is causing pollution. SFI AHL4 provides payment for management of farm yard and track run-off.',
    regulation_ref: 'Farming Rules for Water SI 2018/151 Regulation 4; DEFRA COGAP',
  },
  // Livestock access to watercourses
  {
    activity: 'Livestock access to watercourses',
    hazards: 'Livestock accessing watercourses causes bank erosion (poaching), direct faecal contamination (E. coli, Cryptosporidium), and nutrient loading from dung and urine deposited in water. A major contributor to failure of Water Framework Directive water body objectives.',
    control_measures: 'Fence livestock out of watercourses where there is evidence of bank damage or water quality problems. Provide alternative drinking points (solar-powered troughs, mains-connected troughs, or piped water from boreholes). Install hardened drinking bays if watercourse access is the only water source. Manage stocking density near watercourses.',
    regulatory_requirements: 'Farming Rules for Water Rule 3 requires management of livestock near watercourses. Cross-compliance GAEC 1 requires protection of watercourses from livestock damage. EA can issue enforcement notices if livestock are causing pollution. SFI AHL3 provides payment for fencing watercourses.',
    regulation_ref: 'Farming Rules for Water SI 2018/151 Regulation 4(3); Cross-compliance GAEC 1; Water Framework Directive 2000/60/EC',
  },
  // Yard drainage separation
  {
    activity: 'Yard drainage (clean/dirty water separation)',
    hazards: 'Mixing clean roof water with contaminated yard water increases the total volume of dirty water requiring storage and disposal. Overwhelmed dirty water systems cause pollution incidents.',
    control_measures: 'Separate clean roof water from dirty yard water using dedicated guttering, downpipes, and drains. Route clean water directly to a watercourse or soakaway (with appropriate consent). Dirty water from livestock yards, silage clamps, and milking parlours should be routed to slurry storage or a dedicated dirty water system. Regularly inspect and maintain separation infrastructure.',
    regulatory_requirements: 'SSAFO regulations require that effluent collection systems are impermeable and adequately sized. NVZ rules include dirty water in the organic N loading calculation. Clean/dirty water separation is recommended in COGAP and DEFRA guidance to reduce storage costs and pollution risk.',
    regulation_ref: 'SI 2010/639 (SSAFO); SI 2015/668 (NVZ); DEFRA COGAP; Farming Rules for Water SI 2018/151',
  },
  // Poultry manure outdoor storage
  {
    activity: 'Poultry manure storage',
    hazards: 'Poultry manure has high nitrogen content (25-35 kg N/t for broiler litter) and decomposes rapidly. Uncovered outdoor storage causes ammonia emissions, nutrient leaching, and odour. Run-off from poultry manure heaps is a significant point-source pollution risk.',
    control_measures: 'Store poultry manure under cover (roofed building or weatherproof sheeting). In NVZs, outdoor storage of poultry manure without a cover is not permitted. If temporary field storage is necessary, comply with field heap rules: max 12 months, 50m from springs/boreholes, 10m from surface water, not in the same location for 2 consecutive years. Cover heaps with impermeable sheeting.',
    regulatory_requirements: 'NVZ regulations require covered storage for poultry manure. SSAFO notification to EA if constructing permanent storage. Broiler and turkey units above IPPC thresholds (40,000 places) require Environmental Permit with manure management plan. Records of manure production, storage, and disposal for 5 years.',
    regulation_ref: 'SI 2015/668 Regulation 12 & 14; SI 2010/639 (SSAFO); Environmental Permitting Regulations 2016 (IPPC); Clean Air Strategy 2019',
  },
];

// ── EIA Screening ────────────────────────────────────────────────
// Source: EIA (Agriculture) (England) (No 2) Regulations 2006

interface EiaScreening {
  project_type: string;
  threshold_area_ha: number | null;
  threshold_other: string | null;
  screening_required: boolean;
  process: string;
}

const EIA_SCREENING: EiaScreening[] = [
  {
    project_type: 'Uncultivated land or semi-natural areas',
    threshold_area_ha: 2,
    threshold_other: 'Applies to converting semi-natural habitat (heathland, moorland, permanent pasture not ploughed for 15+ years, wetland) to intensive agricultural use.',
    screening_required: true,
    process: 'Apply to Natural England for screening decision. If >2 ha of semi-natural habitat is to be converted, a screening opinion is required. Full EIA may be needed if significant environmental effects are likely. 28-day decision period.',
  },
  {
    project_type: 'Rural land restructuring',
    threshold_area_ha: 4,
    threshold_other: 'Applies to restructuring of rural land holdings including boundary removal, land levelling, or changing field patterns over the threshold area.',
    screening_required: true,
    process: 'Apply to Natural England for screening decision. Applies when restructuring may affect drainage, landscape character, or habitats. EIA required if significant effects on the environment are likely.',
  },
  {
    project_type: 'New irrigation system',
    threshold_area_ha: 1,
    threshold_other: 'Applies to installation of new irrigation infrastructure. Also triggered if water source is changed or abstraction volume increases.',
    screening_required: true,
    process: 'Apply to Natural England for screening decision. Consider water resource impacts, habitat effects, and cumulative impact with other abstractions in the catchment.',
  },
  {
    project_type: 'Intensive livestock unit',
    threshold_area_ha: null,
    threshold_other: 'New units exceeding: 40,000 poultry places, 2,000 pig places (>30 kg), or 750 sow places. Below thresholds: check if in sensitive area (SSSI, SAC, SPA).',
    screening_required: true,
    process: 'Above IPPC thresholds, an Environmental Permit is required from the EA (separate from EIA). Below IPPC thresholds but in a sensitive area, a screening opinion from Natural England may still be required.',
  },
  {
    project_type: 'Afforestation',
    threshold_area_ha: null,
    threshold_other: 'Varies by sensitivity of the location. In England, the EIA (Forestry) Regulations 1999 apply. Screening typically needed for woodland creation over 5 ha or in sensitive areas.',
    screening_required: true,
    process: 'Apply to the Forestry Commission for screening. Screening considers landscape sensitivity, habitats, archaeology, hydrology, and cumulative effects. Full EIA required if significant effects are likely.',
  },
  {
    project_type: 'Water management for agriculture',
    threshold_area_ha: null,
    threshold_other: 'Large-scale drainage or flood defence works for agricultural purposes that may affect water levels, habitats, or downstream flood risk.',
    screening_required: true,
    process: 'Screening by Natural England or EA depending on the nature of the works. May require Environmental Permit and/or planning permission. Large schemes may need full EIA.',
  },
];

// ── Ingest ───────────────────────────────────────────────────────

function ingest(db: Database): void {
  const today = new Date().toISOString().split('T')[0];

  // Clear existing data
  db.run('DELETE FROM nvz_rules');
  db.run('DELETE FROM storage_requirements');
  db.run('DELETE FROM buffer_strip_rules');
  db.run('DELETE FROM abstraction_rules');
  db.run('DELETE FROM pollution_prevention');
  db.run('DELETE FROM eia_screening');
  db.run('DELETE FROM search_index');

  // NVZ rules
  for (const rule of NVZ_RULES) {
    db.run(
      `INSERT INTO nvz_rules (activity, material_type, soil_type, closed_period_start, closed_period_end, max_application_rate, conditions, regulation_ref, jurisdiction)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [rule.activity, rule.material_type, rule.soil_type, rule.closed_period_start, rule.closed_period_end, rule.max_application_rate, rule.conditions, rule.regulation_ref, 'GB']
    );
  }

  // Storage requirements
  for (const req of STORAGE_REQUIREMENTS) {
    db.run(
      `INSERT INTO storage_requirements (material, min_capacity_months, construction_standard, separation_distance_m, inspection_frequency, regulation_ref, jurisdiction)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.material, req.min_capacity_months, req.construction_standard, req.separation_distance_m, req.inspection_frequency, req.regulation_ref, 'GB']
    );
  }

  // Buffer strip rules
  for (const rule of BUFFER_STRIP_RULES) {
    db.run(
      `INSERT INTO buffer_strip_rules (watercourse_type, activity, min_width_m, conditions, scheme_payment, regulation_ref, jurisdiction)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [rule.watercourse_type, rule.activity, rule.min_width_m, rule.conditions, rule.scheme_payment, rule.regulation_ref, 'GB']
    );
  }

  // Abstraction rules
  for (const rule of ABSTRACTION_RULES) {
    db.run(
      `INSERT INTO abstraction_rules (source_type, threshold_m3_per_day, licence_required, exemptions, conditions, jurisdiction)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [rule.source_type, rule.threshold_m3_per_day, rule.licence_required ? 1 : 0, rule.exemptions, rule.conditions, 'GB']
    );
  }

  // Pollution prevention
  for (const pp of POLLUTION_PREVENTION) {
    db.run(
      `INSERT INTO pollution_prevention (activity, hazards, control_measures, regulatory_requirements, regulation_ref, jurisdiction)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [pp.activity, pp.hazards, pp.control_measures, pp.regulatory_requirements, pp.regulation_ref, 'GB']
    );
  }

  // EIA screening
  for (const eia of EIA_SCREENING) {
    db.run(
      `INSERT INTO eia_screening (project_type, threshold_area_ha, threshold_other, screening_required, process, jurisdiction)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [eia.project_type, eia.threshold_area_ha, eia.threshold_other, eia.screening_required ? 1 : 0, eia.process, 'GB']
    );
  }

  // Build FTS5 search index
  const ftsEntries: Array<{ title: string; body: string; topic: string }> = [];

  for (const rule of NVZ_RULES) {
    const title = `NVZ: ${rule.activity}` + (rule.soil_type ? ` (${rule.soil_type})` : '');
    const parts = [rule.conditions, rule.max_application_rate, rule.regulation_ref].filter(Boolean);
    ftsEntries.push({ title, body: parts.join('. '), topic: 'nvz' });
  }

  for (const req of STORAGE_REQUIREMENTS) {
    ftsEntries.push({
      title: `Storage: ${req.material}`,
      body: [req.construction_standard, req.inspection_frequency, req.regulation_ref].filter(Boolean).join('. '),
      topic: 'storage',
    });
  }

  for (const rule of BUFFER_STRIP_RULES) {
    ftsEntries.push({
      title: `Buffer strip: ${rule.watercourse_type} — ${rule.activity ?? 'general'}`,
      body: [rule.conditions, rule.scheme_payment, rule.regulation_ref].filter(Boolean).join('. '),
      topic: 'buffer_strips',
    });
  }

  for (const rule of ABSTRACTION_RULES) {
    ftsEntries.push({
      title: `Abstraction: ${rule.source_type}`,
      body: [rule.exemptions, rule.conditions].filter(Boolean).join('. '),
      topic: 'abstraction',
    });
  }

  for (const pp of POLLUTION_PREVENTION) {
    ftsEntries.push({
      title: `Pollution prevention: ${pp.activity}`,
      body: [pp.hazards, pp.control_measures, pp.regulatory_requirements, pp.regulation_ref].filter(Boolean).join('. '),
      topic: 'pollution',
    });
  }

  for (const eia of EIA_SCREENING) {
    ftsEntries.push({
      title: `EIA screening: ${eia.project_type}`,
      body: [eia.threshold_other, eia.process].filter(Boolean).join('. '),
      topic: 'eia',
    });
  }

  for (const entry of ftsEntries) {
    db.run(
      `INSERT INTO search_index (title, body, topic, jurisdiction) VALUES (?, ?, ?, ?)`,
      [entry.title, entry.body, entry.topic, 'GB']
    );
  }

  // Update metadata
  db.run("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('last_ingest', ?)", [today]);
  db.run("INSERT OR REPLACE INTO db_metadata (key, value) VALUES ('build_date', ?)", [today]);

  // Print summary
  const nvzCount = db.get<{ c: number }>('SELECT count(*) as c FROM nvz_rules')!.c;
  const storageCount = db.get<{ c: number }>('SELECT count(*) as c FROM storage_requirements')!.c;
  const bufferCount = db.get<{ c: number }>('SELECT count(*) as c FROM buffer_strip_rules')!.c;
  const abstractionCount = db.get<{ c: number }>('SELECT count(*) as c FROM abstraction_rules')!.c;
  const pollutionCount = db.get<{ c: number }>('SELECT count(*) as c FROM pollution_prevention')!.c;
  const eiaCount = db.get<{ c: number }>('SELECT count(*) as c FROM eia_screening')!.c;
  const ftsCount = db.get<{ c: number }>('SELECT count(*) as c FROM search_index')!.c;

  console.log('Ingestion complete:');
  console.log(`  NVZ rules: ${nvzCount}`);
  console.log(`  Storage requirements: ${storageCount}`);
  console.log(`  Buffer strip rules: ${bufferCount}`);
  console.log(`  Abstraction rules: ${abstractionCount}`);
  console.log(`  Pollution prevention: ${pollutionCount}`);
  console.log(`  EIA screening: ${eiaCount}`);
  console.log(`  FTS entries: ${ftsCount}`);
  console.log(`  Date: ${today}`);

  // Write coverage.json
  const coverage = {
    mcp_name: 'UK Environmental Compliance MCP',
    jurisdiction: 'GB',
    build_date: today,
    nvz_rules: nvzCount,
    storage_requirements: storageCount,
    buffer_strip_rules: bufferCount,
    abstraction_rules: abstractionCount,
    pollution_prevention: pollutionCount,
    eia_screening: eiaCount,
    fts_entries: ftsCount,
  };

  writeFileSync('data/coverage.json', JSON.stringify(coverage, null, 2));
  console.log('Updated data/coverage.json');

  // Write source hashes
  writeFileSync('data/.source-hashes.json', JSON.stringify({
    description: 'Content hashes for diff-based re-ingestion. Updated by scripts/ingest.ts.',
    last_updated: today,
    hashes: {},
  }, null, 2));
}

// ── Main ─────────────────────────────────────────────────────────

mkdirSync('data', { recursive: true });
const db = createDatabase('data/database.db');
ingest(db);
db.close();
