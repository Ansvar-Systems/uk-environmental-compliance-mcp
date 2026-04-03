# Coverage

## What Is Included

- **NVZ rules**: Closed periods for slurry, poultry manure, FYM, and manufactured fertiliser by soil type. Nitrogen application limits (170 kg organic N/ha, 250 kg total N/ha). Spreading method requirements, proximity rules, slope rules, and condition restrictions.
- **Storage requirements**: SSAFO standards for slurry, silage effluent, FYM field heaps, agricultural fuel oil, pesticides, and sheep dip. Construction standards, capacity requirements, separation distances, and inspection frequencies.
- **Buffer strip rules**: Minimum buffer widths for main rivers, ordinary watercourses, and lakes. Organic manure and manufactured fertiliser buffers. SFI payment rates for SW3 buffer strip actions. Hedgerow buffer requirements.
- **Water abstraction**: Licensing thresholds for surface water, groundwater, spray irrigation, and tidal water. Exemption criteria and conditions.
- **Pollution prevention**: Guidance for silage making, sheep dipping, pesticide handling, fuel storage, slurry management, fertiliser storage, agricultural waste burning, and land drainage.
- **EIA screening**: Thresholds for uncultivated land conversion, rural restructuring, new irrigation, intensive livestock units, afforestation, and water management projects.

## Jurisdictions

| Code | Country | Status |
|------|---------|--------|
| GB | Great Britain (England focus) | Supported |

## What Is NOT Included

- **Wales-specific rules** -- Wales has separate NVZ and water quality rules under NRW
- **Scotland-specific rules** -- Scotland has separate NVZ rules under SEPA
- **Northern Ireland** -- NI follows separate DAERA guidance
- **Detailed Nmax tables** -- Individual crop nitrogen limits (Nmax) are not yet fully tabulated
- **Real-time NVZ maps** -- This server does not include spatial data; use DEFRA Magic Map
- **Permit applications** -- This is reference data, not an application tool
- **Waste management** -- Agricultural waste exemptions are only partially covered
- **Cross-compliance** -- GAEC and SMR conditions are only referenced where relevant to environmental rules
- **Countryside Stewardship** -- Only SFI buffer strip payments are included

## Known Gaps

1. NVZ closed period dates vary slightly between grassland and arable for the same material/soil combination -- the data captures this but queries may need refinement
2. EIA screening thresholds are indicative -- Natural England makes the actual screening decision
3. Abstraction licensing is undergoing reform (Abstraction Reform) which may change thresholds
4. SFI payment rates are updated annually by DEFRA

## Data Freshness

Run `check_data_freshness` to see when data was last updated. The ingestion pipeline runs on a monthly schedule; manual triggers available via `gh workflow run ingest.yml`.
