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
