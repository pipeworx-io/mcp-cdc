# CDC — Centers for Disease Control and Prevention

The CDC's data products: disease surveillance (notifiable conditions, FluView), vital statistics (births, deaths), behavioral risk factors (BRFSS), environmental health, social determinants of health. The authoritative US public-health data. Free, no auth (some datasets require a free token for higher volume).

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1683+ live data sources.

## Why this matters for AI agents

For US public-health questions — disease incidence, mortality rates, behavioral risk factors, environmental exposures — CDC is canonical. Government-grade methodology, transparent data documentation. Pair with [WHO Global Health Observatory](/docs/reference/who-gho) for international comparisons.

Common flows:

- **Notifiable diseases.** Weekly counts by state, condition (TB, salmonella, measles, etc.).
- **Mortality stats.** Death counts by cause, demographic, geography. NVSS data going back decades.
- **BRFSS.** Behavioral Risk Factor Surveillance System — state-level prevalence of smoking, obesity, diabetes, mental health, etc.
- **Flu / respiratory virus surveillance.** Weekly FluView, plus COVID-era respiratory illness reporting.
- **Wastewater surveillance (NWSS).** Weekly national or state SARS-CoV-2/flu/RSV viral activity level from sewershed sampling — the leading indicator ahead of case/hospitalization data, and the only way to answer "what's the current trend in wastewater levels?" `wastewater_national_trend` / `wastewater_state_trend` do this directly; don't route this question to `search_datasets`, whose full-text search on "wastewater"/"nwss" returns unrelated pollen/filovirus datasets instead.

## Auth

Most CDC datasets are open via Socrata's data.cdc.gov platform; free, lightly rate-limited. For sustained volume, get a free Socrata app token. Pass via `_apiKey`.

## Datasets worth knowing

| Dataset | Cadence | Use |
|---|---|---|
| **NVSS Mortality** | Annual / monthly | Death counts and rates by cause/age/sex/race/state |
| **FluView** | Weekly | Flu activity surveillance |
| **NNDSS** (National Notifiable Disease Surveillance) | Weekly | Reportable diseases by state |
| **BRFSS** | Annual | State-level risk-factor prevalence |
| **YRBSS** (Youth Risk Behavior) | Biennial | Adolescent health behaviors |
| **NHANES** | Continuous | Examination + lab data, smaller representative sample |

For "what's the rate of X in state Y?" most answers come from NVSS (mortality) or BRFSS (risk factors).

### NWSS wastewater viral activity level

`wastewater_national_trend` and `wastewater_state_trend` read `atcp-73re` ("CDC
Wastewater Viral Activity Level for SARS-CoV-2, Influenza A and RSV"), published
weekly on Fridays from ~800+ sewershed sites. It's site-level (one row per site per
pathogen per week, each with a 5-level category — Very Low/Low/Moderate/High/Very
High), so there is no ready-made national or state figure: both tools compute a
population-weighted mean of the category rank (1..5) across every reporting site
for the grain requested, plus a week-over-week trend (`rising`/`declining`/`stable`,
±0.15 threshold on the weighted score). `pathogen` accepts loose aliases (`covid`,
`flu`, `rsv`); `state` accepts postal abbreviations (`CA`) as well as full names.

CDC previously published two "NWSS Public ..." datasets (`g653-rqe2`,
`2ew6-ywp6`) with a national percentile metric; both stopped updating in Aug
2026 and are now dead ends — CDC replaced them with the per-pathogen raw
qPCR datasets (`j9g8-acpt` SARS-CoV-2, `ymmh-divb` Influenza A, `45cq-cw4i`
RSV) and the classified `atcp-73re` these tools use. Verify before assuming
otherwise: `curl 'https://data.cdc.gov/resource/atcp-73re.json?$select=max(week_end)'`.

## Common pitfalls

- **Suppression for small counts.** CDC suppresses cells with <10 deaths or low denominators to protect privacy. The dataset returns null/asterisk; don't treat as zero.
- **Crude vs age-adjusted rates.** Mortality rates per 100k are usually reported as both. Age-adjusted are comparable across populations with different age structures; crude aren't.
- **Race/ethnicity handling.** CDC race categories shifted post-2003 (multi-race added). Time-series across the break needs care.
- **State of residence vs occurrence.** Mortality data reports both. Most analyses want residence (where the person lived); some want occurrence (where the death certificate was filed). Read the metadata.
- **Pandemic-era anomalies.** 2020-2022 mortality data has classification issues (COVID coding, excess-mortality interpretation). Long-term trends should annotate the disruption.
- **Real-time CDC data is delayed.** Weekly FluView ~1-2 week lag. Monthly notifiable diseases ~1 month. NVSS mortality ~6-12 month lag. Plan agent flows accordingly.

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "cdc": {
      "url": "https://gateway.pipeworx.io/cdc/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/cdc/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1683+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/cdc_search_datasets \
  -H 'Content-Type: application/json' \
  -d '{"query":"covid cases"}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/cdc_search_datasets`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.

## Standalone (no gateway account)

This package also runs as a local stdio MCP server — no Pipeworx account, no
gateway round-trip:

```json
{
  "mcpServers": {
    "cdc": {
      "command": "npx",
      "args": ["-y", "@pipeworx/mcp-cdc"]
    }
  }
}
```

Or run it directly to confirm it starts:

```bash
npx -y @pipeworx/mcp-cdc
```

It speaks MCP over stdin/stdout and answers `initialize`/`tools/list`/`tools/call`
for **only** this pack's tools — none of the shared meta-tools the gateway
connection above adds. Same source, same tools, no ask_pipeworx routing.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Cdc data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
