# UK Environmental Compliance MCP

[![CI](https://github.com/Ansvar-Systems/uk-environmental-compliance-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Ansvar-Systems/uk-environmental-compliance-mcp/actions/workflows/ci.yml)
[![GHCR](https://github.com/Ansvar-Systems/uk-environmental-compliance-mcp/actions/workflows/ghcr-build.yml/badge.svg)](https://github.com/Ansvar-Systems/uk-environmental-compliance-mcp/actions/workflows/ghcr-build.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

UK environmental farming compliance via the [Model Context Protocol](https://modelcontextprotocol.io). Query NVZ rules, spreading windows, SSAFO storage requirements, buffer strips, water abstraction licensing, pollution prevention guidance, and EIA screening thresholds -- all from your AI assistant.

Part of [Ansvar Open Agriculture](https://ansvar.eu/open-agriculture).

## Why This Exists

Farmers need to comply with NVZ regulations, Farming Rules for Water, SSAFO storage standards, and EIA screening requirements. These rules are spread across multiple statutory instruments, DEFRA guidance documents, and Environment Agency publications. This MCP server makes them all queryable in one place.

## Quick Start

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "uk-environmental-compliance": {
      "command": "npx",
      "args": ["-y", "@ansvar/uk-environmental-compliance-mcp"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add uk-environmental-compliance npx @ansvar/uk-environmental-compliance-mcp
```

### Streamable HTTP (remote)

```
https://mcp.ansvar.eu/uk-environmental-compliance/mcp
```

### Docker (self-hosted)

```bash
docker run -p 3000:3000 ghcr.io/ansvar-systems/uk-environmental-compliance-mcp:latest
```

### npm (stdio)

```bash
npx @ansvar/uk-environmental-compliance-mcp
```

## Example Queries

Ask your AI assistant:

- "Can I spread slurry in November on sandy soil in an NVZ?"
- "What are the storage requirements for slurry under SSAFO?"
- "How wide must my buffer strip be next to a main river?"
- "Do I need a water abstraction licence for 15 m3/day from a borehole?"
- "What pollution prevention measures do I need for silage making?"
- "Does converting 3 ha of heathland need EIA screening?"
- "What are the NVZ closed periods for poultry manure?"
- "What SFI payment can I get for buffer strips?"

## Stats

| Metric | Value |
|--------|-------|
| Tools | 11 (3 meta + 8 domain) |
| Jurisdiction | GB |
| Data sources | DEFRA, NVZ Regs, SSAFO, Environment Agency, Natural England SFI |
| License (data) | Open Government Licence v3 |
| License (code) | Apache-2.0 |
| Transport | stdio + Streamable HTTP |

## Tools

| Tool | Description |
|------|-------------|
| `about` | Server metadata and links |
| `list_sources` | Data sources with freshness info |
| `check_data_freshness` | Staleness status and refresh command |
| `search_environmental_rules` | FTS5 search across all environmental compliance data |
| `check_nvz_rules` | NVZ rules for an activity, with season-aware status |
| `get_spreading_windows` | Open/closed spreading calendar by manure and land type |
| `get_storage_requirements` | SSAFO storage standards by material |
| `check_buffer_strip_rules` | Buffer strip widths, conditions, and SFI payments |
| `get_abstraction_rules` | Water abstraction licensing by source and volume |
| `get_pollution_prevention` | Pollution prevention guidance by activity |
| `get_eia_screening` | EIA screening thresholds by project type and area |

See [TOOLS.md](TOOLS.md) for full parameter documentation.

## Security Scanning

This repository runs 6 security checks on every push:

- **CodeQL** -- static analysis for JavaScript/TypeScript
- **Gitleaks** -- secret detection across full history
- **Dependency review** -- via Dependabot
- **Container scanning** -- via GHCR build pipeline

See [SECURITY.md](SECURITY.md) for reporting policy.

## Disclaimer

This tool provides reference data for informational purposes only. It is not legal or professional environmental advice. NVZ designations change -- always verify your NVZ status on the DEFRA Magic Map. See [DISCLAIMER.md](DISCLAIMER.md).

## Contributing

Issues and pull requests welcome. For security vulnerabilities, email security@ansvar.eu (do not open a public issue).

## License

Apache-2.0. Data sourced under Open Government Licence v3.
