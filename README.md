# CDC — Centers for Disease Control and Prevention

The CDC's data products: disease surveillance (notifiable conditions, FluView), vital statistics (births, deaths), behavioral risk factors (BRFSS), environmental health, social determinants of health. The authoritative US public-health data. Free, no auth (some datasets require a free token for higher volume).

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1476+ live data sources.

## Why this matters for AI agents

For US public-health questions — disease incidence, mortality rates, behavioral risk factors, environmental exposures — CDC is canonical. Government-grade methodology, transparent data documentation. Pair with [WHO Global Health Observatory](/docs/reference/who-gho) for international comparisons.

Common flows:

- **Notifiable diseases.** Weekly counts by state, condition (TB, salmonella, measles, etc.).
- **Mortality stats.** Death counts by cause, demographic, geography. NVSS data going back decades.
- **BRFSS.** Behavioral Risk Factor Surveillance System — state-level prevalence of smoking, obesity, diabetes, mental health, etc.
- **Flu / respiratory virus surveillance.** Weekly FluView, plus COVID-era respiratory illness reporting.

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

Both URLs reach the same gateway and the same 1476+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

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

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/cdc_search_datasets \
  -H 'Content-Type: application/json' \
  -d '{"query":"covid cases"}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/cdc_search_datasets`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.
