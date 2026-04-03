# Tools Reference

## Meta Tools

### `about`

Get server metadata: name, version, coverage, data sources, and links.

**Parameters:** None

**Returns:** Server name, version, jurisdiction list, data source names, tool count, homepage/repository links.

---

### `list_sources`

List all data sources with authority, URL, license, and freshness info.

**Parameters:** None

**Returns:** Array of data sources, each with `name`, `authority`, `official_url`, `retrieval_method`, `update_frequency`, `license`, `coverage`, `last_retrieved`.

---

### `check_data_freshness`

Check when data was last ingested, staleness status, and how to trigger a refresh.

**Parameters:** None

**Returns:** `status` (fresh/stale/unknown), `last_ingest`, `days_since_ingest`, `staleness_threshold_days`, `refresh_command`.

---

## Domain Tools

### `search_environmental_rules`

Full-text search across all environmental compliance data: NVZ rules, storage requirements, buffer strips, abstraction, pollution prevention, EIA screening.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Free-text search query |
| `topic` | string | No | Filter by topic (nvz, storage, buffer_strips, abstraction, pollution, eia) |
| `jurisdiction` | string | No | ISO 3166-1 alpha-2 code (default: GB) |
| `limit` | number | No | Max results (default: 20, max: 50) |

**Example:** `{ "query": "slurry spreading closed period" }`

---

### `check_nvz_rules`

Check Nitrate Vulnerable Zone rules for a farming activity. Returns closed periods, nitrogen limits, and conditions. Tells you whether an activity is allowed in a given season.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `activity` | string | Yes | Farming activity (e.g. spreading slurry, applying fertiliser, storing manure) |
| `season` | string | No | Month or season to check (e.g. November, March, winter) |
| `soil_type` | string | No | Soil type (e.g. sandy, shallow, clay, all other) |
| `jurisdiction` | string | No | ISO 3166-1 alpha-2 code (default: GB) |

**Returns:** Matching NVZ rules with closed periods, conditions, and regulation references. If `season` is provided, includes `allowed` (boolean) and `status_note`.

**Example:** `{ "activity": "spreading slurry", "season": "November", "soil_type": "sandy" }`

---

### `get_spreading_windows`

Get open and closed spreading periods for a manure type on a land type. Returns a clear calendar of when spreading is permitted in NVZ areas.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `manure_type` | string | Yes | Manure type (e.g. slurry, poultry manure, farmyard manure, manufactured fertiliser) |
| `land_type` | string | Yes | Land type (e.g. arable, grassland, sandy, shallow) |
| `nvz` | boolean | No | Whether the land is in an NVZ (default: true) |
| `jurisdiction` | string | No | ISO 3166-1 alpha-2 code (default: GB) |

**Returns:** Spreading windows with closed period dates, open period descriptions, and conditions.

**Example:** `{ "manure_type": "slurry", "land_type": "sandy" }`

---

### `get_storage_requirements`

Get SSAFO storage requirements for a material (slurry, silage, fuel oil, etc.). Returns capacity, construction standards, and separation distances.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `material` | string | Yes | Material to store (e.g. slurry, silage, fuel oil, pesticide, sheep dip, farmyard manure) |
| `volume` | string | No | Planned storage volume (for context) |
| `jurisdiction` | string | No | ISO 3166-1 alpha-2 code (default: GB) |

**Returns:** Storage requirements including minimum capacity, construction standard, separation distance, and inspection frequency.

**Example:** `{ "material": "slurry" }`

---

### `check_buffer_strip_rules`

Check buffer strip requirements for watercourses. Returns minimum widths, conditions, and SFI payment rates.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `watercourse_type` | string | No | Watercourse type (e.g. main river, ordinary watercourse, lake, ditch) |
| `activity` | string | No | Activity near watercourse (e.g. spreading, cultivating) |
| `jurisdiction` | string | No | ISO 3166-1 alpha-2 code (default: GB) |

**Returns:** Buffer strip rules with minimum widths, conditions, and scheme payment info. If no parameters, returns all rules.

---

### `get_abstraction_rules`

Get water abstraction licensing rules by source type and volume. Tells you whether a licence is required.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `source_type` | string | No | Water source (e.g. surface water, groundwater, tidal) |
| `volume_m3_per_day` | number | No | Planned abstraction volume in cubic metres per day |
| `jurisdiction` | string | No | ISO 3166-1 alpha-2 code (default: GB) |

**Returns:** Abstraction rules with thresholds, exemptions, and conditions. If `volume_m3_per_day` is provided, includes `licence_assessment` with a clear yes/no determination.

**Example:** `{ "source_type": "groundwater", "volume_m3_per_day": 15 }`

---

### `get_pollution_prevention`

Get pollution prevention guidance for a farming activity. Returns hazards, control measures, and regulatory requirements.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `activity` | string | Yes | Farming activity (e.g. silage making, sheep dipping, pesticide handling, fuel storage) |
| `jurisdiction` | string | No | ISO 3166-1 alpha-2 code (default: GB) |

**Returns:** Hazards, control measures, regulatory requirements, and regulation references.

**Example:** `{ "activity": "silage" }`

---

### `get_eia_screening`

Check EIA (Environmental Impact Assessment) screening thresholds for agricultural projects. Returns whether screening is required based on project type and area.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project_type` | string | Yes | Project type (e.g. uncultivated land, restructuring, irrigation, livestock, afforestation) |
| `area_ha` | number | No | Proposed project area in hectares |
| `jurisdiction` | string | No | ISO 3166-1 alpha-2 code (default: GB) |

**Returns:** EIA screening thresholds, process description, and screening assessment. If `area_ha` is provided, includes a clear assessment of whether screening is required.

**Example:** `{ "project_type": "uncultivated land", "area_ha": 3 }`
