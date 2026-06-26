interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * CDC MCP — wraps CDC open data via Socrata API (data.cdc.gov)
 *
 * Free, no authentication required. Access CDC public health datasets
 * including COVID-19 data, disease surveillance, and health statistics.
 *
 * Tools:
 * - search_datasets: search CDC datasets by keyword
 * - get_dataset: get rows from a specific CDC dataset by ID
 */


const BASE_URL = 'https://data.cdc.gov';

async function socrataGet(url: string, params?: Record<string, string>): Promise<unknown> {
  const u = new URL(url);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      u.searchParams.set(k, v);
    }
  }

  const res = await fetch(u.toString(), {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CDC/Socrata API error (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}

const tools: McpToolExport['tools'] = [
  {
    name: 'search_datasets',
    description:
      'Search CDC public health datasets by keyword. Returns dataset names, descriptions, IDs, and update dates. Example: search_datasets("influenza surveillance").',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search keywords (e.g., "covid cases", "influenza", "vaccination rates", "mortality")',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_dataset',
    description:
      'Fetch up to 1000 rows from a CDC Socrata dataset by its four-by-four dataset ID (e.g., "9mfq-cb36"). Returns row array with all columns plus column names extracted from the first row. Use search_datasets first to find the dataset ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Socrata dataset ID in four-by-four format (e.g., "9mfq-cb36")',
        },
        limit: {
          type: 'number',
          description: 'Number of rows to return (default 50, max 1000)',
        },
      },
      required: ['id'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'search_datasets':
      return searchDatasets(args.query as string);
    case 'get_dataset':
      return getDataset(args.id as string, (args.limit as number) ?? 50);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function searchDatasets(query: string) {
  const data = (await socrataGet(`${BASE_URL}/api/views.json`, {
    q: query,
    limit: '20',
  })) as Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    createdAt: number;
    viewLastModified: number;
    columns: Array<{ name: string }>;
  }>;

  return {
    count: (data ?? []).length,
    datasets: (data ?? []).map((d) => ({
      id: d.id,
      name: d.name ?? null,
      description: d.description ? d.description.slice(0, 300) : null,
      category: d.category ?? null,
      modified_at: d.viewLastModified
        ? new Date(d.viewLastModified * 1000).toISOString()
        : null,
      columns: (d.columns ?? []).slice(0, 15).map((c) => c.name),
    })),
  };
}

async function getDataset(id: string, limit: number) {
  const clampedLimit = Math.min(Math.max(1, limit), 1000);
  const data = (await socrataGet(`${BASE_URL}/resource/${encodeURIComponent(id)}.json`, {
    $limit: String(clampedLimit),
  })) as Record<string, unknown>[];

  // Get column names from first row
  const columns = data.length > 0 ? Object.keys(data[0]!) : [];

  return {
    dataset_id: id,
    row_count: data.length,
    columns,
    rows: data,
  };
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
