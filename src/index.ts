// src/index.ts
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

// full absolute path to your .env
const envPath = "/Users/wesleylu/Desktop/ALPACA-MCP/.env";

// debug output so you can see where it’s looking
console.error("Loading .env from:", envPath, "exists?", fs.existsSync(envPath));

// now load it
dotenv.config({ path: envPath });



import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { symbol, z } from "zod";
import { createClient } from "@alpacahq/typescript-sdk";

import { existsSync, readFileSync } from "fs";




const Env = z.object({
  ALPACA_PAPER_KEY: z.string().min(1),
  ALPACA_PAPER_SECRET: z.string().min(1),
});
const { ALPACA_PAPER_KEY, ALPACA_PAPER_SECRET} = Env.parse(process.env);

const client = createClient({
  key:    ALPACA_PAPER_KEY,
  secret: ALPACA_PAPER_SECRET,
})

// Create server instance
const server = new McpServer({
  name: "alpaca",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {}, 
  },
});

// Resource 


// Tool

server.tool(
  "get-alpaca-account",              // name
  "Fetches your Alpaca account",   // description
  async (extra) => {
    const acct = await client.getAccount();
    return {
      content: [
        {
          type: "text", 
          text: JSON.stringify(acct, null, 2)   // serialize to JSON
        }
      ]
    };
  }
);

type CreateOrderOpts = Parameters<typeof client.createOrder>[0];
server.tool(
  "alpaca-createOrder",
  {
    symbol:        z.string().describe("Ticker symbol, e.g. AAPL"),
    qty:           z.number().describe("Number of shares"),
    side:          z.enum(["buy", "sell"]),
    type:          z.enum(["market", "limit", "stop", "stop_limit"]),
    time_in_force: z.enum(["day", "gtc", "ioc", "fok"]),
    limit_price:   z.number().optional().describe("Required if type is limit"),
  },                                  // ← this is a ZodRawShape
  async (args, extra) => {
    // (Optionally) Validate/parse
    const payload = {
      symbol:        args.symbol.toUpperCase(),
      qty:           args.qty,
      side:          args.side,
      type:          args.type,
      time_in_force: args.time_in_force,
      ...(args.type === "limit" && args.limit_price != null
        ? { limit_price: args.limit_price }
        : {}),
    } as CreateOrderOpts;

    const order = await client.createOrder(payload);

    return {
      content: [
        {
          type: "text" as const,
          text: `Order placed! ${order.side.toUpperCase()} ${order.qty} ${order.symbol} @ ${order.filled_avg_price ?? order.limit_price ?? "market"}\n\n` +
                JSON.stringify(order, null, 2),
        },
      ],
    };
  }
);

type GetOrderOpt  = Parameters<typeof client.getOrder>[0];
// Get single order by ID
server.tool(
  "alpaca-getOrder",
  {
    order_id: z.string().describe("The unique ID of the Alpaca order"),
  },
  async (args, extra) => {
    // args is { order_id: string }
    const payload: GetOrderOpt = {
      order_id: args.order_id,
    };

    const order = await client.getOrder(payload);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(order, null, 2),
        },
      ],
    };
  }
);

// List orders with optional status, limit, and sort direction
const getOrdersSchema = z
  .object({
    status: z
      .enum(["open", "closed", "all"])
      .optional()
      .describe("Filter by order status (open, closed, or all)"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe("Max number of orders to retrieve"),
    direction: z
      .enum(["asc", "desc"])
      .optional()
      .describe("Sort direction: ascending or descending"),
  })
  .describe("Retrieves a list of your Alpaca orders");
type GetOrdersOpts = z.infer<typeof getOrdersSchema>;
server.tool(
  "alpaca-getOrders",
  {
    status: z
      .enum(["open", "closed", "all"])
      .optional()
      .describe("Filter by order status (open, closed, or all)"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .optional()
      .describe("Max number of orders to retrieve"),
    direction: z
      .enum(["asc", "desc"])
      .optional()
      .describe("Sort direction: ascending or descending"),
  },
  async (args) => {
    const payload = args as GetOrdersOpts;
    const orders = await (client.getOrders as unknown as (opts: any) => Promise<any[]>)(
      payload
    );
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(orders, null, 2),
        },
      ],
    };
  }
);


// Replace order
type ReplaceOrderOpts = Parameters<typeof client.replaceOrder>[0];
server.tool(
  "alpaca-replaceOrder",
  {
    order_id:   z.string().describe("The unique ID of the Alpaca order to replace"),
    qty:        z.number().optional().describe("New quantity of shares"),
    limit_price:z.number().optional().describe("New limit price, required for updating a limit order"),
  },
  async (args) => {
    // build up only the fields the user passed
    const payload: ReplaceOrderOpts = {
      order_id: args.order_id,
      ...(args.qty        != null ? { qty: args.qty } : {}),
      ...(args.limit_price!= null ? { limit_price: args.limit_price } : {}),
    };

    const replaced = await client.replaceOrder(payload);

    return {
      content: [
        {
          type: "text" as const,
          text:
            `Replaced order ${replaced.id} — ${replaced.side.toUpperCase()} ${replaced.qty} @ ${
              replaced.filled_avg_price ?? replaced.limit_price ?? "market"
            }\n\n` +
            JSON.stringify(replaced, null, 2),
        },
      ],
    };
  }
);

type CancelOrderOpts = Parameters<typeof client.cancelOrder>[0];
server.tool(
  "alpaca-cancelOrder",
  {
    order_id: z.string().describe("The unique ID of the Alpaca order to cancel"),
  },
  async(args) => {
    const payload: CancelOrderOpts = {order_id: args.order_id};
    const cancelled = await client.cancelOrder(payload);
    return {
      content: [
        {
          type: "text" as const,
          text: `Order ${cancelled.id} canceled successfully.\n\n` +
            JSON.stringify(cancelled, null, 2),
        },
      ],
    };
  }
);

// Cancel all orders
server.tool(
  "alpaca-cancelOrders",
  {},
  async () => {
    // Alpaca returns an array of orders that were canceled
    const raw = await client.cancelOrders();
    const cancelledAll = Array.isArray(raw) ? raw : [raw];
    return {
      content: [
        {
          type: "text" as const,
          text:
            `Canceled ${cancelledAll.length} order(s).\n\n` +
            JSON.stringify(cancelledAll, null, 2),
        },
      ],
    };
  }
);

type GetPositionOpts = Parameters<typeof client.getPosition>[0];
server.tool(
  "alpaca-getPosition",
  {
    symbol_or_asset_id: z
      .string()
      .describe("Either the ticker symbol (e.g. AAPL) or the Alpaca asset ID"),
  },
  async (args) => {
    const payload: GetPositionOpts = {
      symbol_or_asset_id: args.symbol_or_asset_id,
    };
    const pos = await client.getPosition(payload);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(pos, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "alpaca-getPositions",
  {}, // no inputs
  async () => {
    const all = await client.getPositions();
    // ensure it's an array for .length safety
    const positions = Array.isArray(all) ? all : [all];
    return {
      content: [
        {
          type: "text" as const,
          text:
            `Fetched ${positions.length} position(s).\n\n` +
            JSON.stringify(positions, null, 2),
        },
      ],
    };
  }
);

// Close a specific position by symbol or asset ID
type ClosePositionOpts = Parameters<typeof client.closePosition>[0];
server.tool(
  "alpaca-closePosition",
  {
    symbol_or_asset_id: z
      .string()
      .describe("Either the ticker symbol (e.g. AAPL) or the Alpaca asset ID"),
  },
  async (args) => {
    const payload: ClosePositionOpts = {
      symbol_or_asset_id: args.symbol_or_asset_id,
    };
    const closed = await client.closePosition(payload);
    return {
      content: [
        {
          type: "text" as const,
          text:
            `Closed position for ${args.symbol_or_asset_id}.\n\n` +
            JSON.stringify(closed, null, 2),
        },
      ],
    };
  }
);

// Close all positions
server.tool(
  "alpaca-closePositions",
  {}, // no parameters
  async () => {
    const raw = await client.closePositions();
    // normalize to array so you can report a count
    const closedAll = Array.isArray(raw) ? raw : [raw];
    return {
      content: [
        {
          type: "text" as const,
          text:
            `Closed ${closedAll.length} position(s).\n\n` +
            JSON.stringify(closedAll, null, 2),
        },
      ],
    };
  }
);

// Exercise an options contract
type ExerciseOptionOpts = Parameters<typeof client.exerciseOption>[0];
server.tool(
  "alpaca-exerciseOption",
  {
    symbol_or_contract_id: z
      .string()
      .describe("Either the option symbol (e.g. AAPL230616C00150000) or contract ID"),
  },
  async (args) => {
    const payload: ExerciseOptionOpts = {
      symbol_or_contract_id: args.symbol_or_contract_id,
    };
    const result = await client.exerciseOption(payload);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Watchlists
type GetWatchlistOpts = Parameters<typeof client.getWatchlist>[0];
server.tool(
  "alpaca-getWatchlist",
  {
    watchlist_id: z.string().describe("The unique ID of the watchlist to fetch"),
  },
  async (args) => {
    const payload: GetWatchlistOpts = { watchlist_id: args.watchlist_id };
    const wl = await client.getWatchlist(payload);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(wl, null, 2) }],
    };
  }
);

server.tool(
  "alpaca-getWatchlists",
  {}, // no inputs
  async () => {
    const raw = await client.getWatchlists();
    const all = Array.isArray(raw) ? raw : [raw];
    return {
      content: [
        {
          type: "text" as const,
          text:
            `Fetched ${all.length} watchlist(s).\n\n` +
            JSON.stringify(all, null, 2),
        },
      ],
    };
  }
);

type CreateWatchlistOpts = Parameters<typeof client.createWatchlist>[0];
server.tool(
  "alpaca-createWatchlist",
  {
    name: z.string().describe("Name for the new watchlist"),
    symbols: z
      .array(z.string())
      .describe("Array of ticker symbols to include"),
  },
  async (args) => {
    const payload: CreateWatchlistOpts = {
      name: args.name,
      symbols: args.symbols,
    };
    const created = await client.createWatchlist(payload);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(created, null, 2),
        },
      ],
    };
  }
);

// 1) Re‑import the UpdateWatchlistOptions type
type UpdateWatchlistOpts = Parameters<typeof client.updateWatchlist>[0];

// 2) Change your tool to require both name and symbols
server.tool(
  "alpaca-updateWatchlist",
  {
    watchlist_id: z
      .string()
      .describe("The ID of the watchlist to update"),
    name: z
      .string()
      .describe("New name for the watchlist"),
    symbols: z
      .array(z.string())
      .describe("Updated array of ticker symbols"),
  },
  async (args) => {
    // now both name and symbols are guaranteed to be strings/array
    const payload: UpdateWatchlistOpts = {
      watchlist_id: args.watchlist_id,
      name:         args.name,
      symbols:      args.symbols,
    };
    const updated = await client.updateWatchlist(payload);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(updated, null, 2),
        },
      ],
    };
  }
);


type DeleteWatchlistOpts = Parameters<typeof client.deleteWatchlist>[0];
server.tool(
  "alpaca-deleteWatchlist",
  {
    watchlist_id: z.string().describe("The ID of the watchlist to delete"),
  },
  async (args) => {
    const payload: DeleteWatchlistOpts = { watchlist_id: args.watchlist_id };
    const deleted = await client.deleteWatchlist(payload);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(deleted, null, 2),
        },
      ],
    };
  }
);

// Portfolio history
type GetPortfolioHistoryOpts = Parameters<typeof client.getPortfolioHistory>[0];
server.tool(
  "alpaca-getPortfolioHistory",
  {
    period: z
      .string()
      .describe("History period (e.g. '1D', '1W', '1M', '1Y', 'ALL')"),
    timeframe: z
      .string()
      .describe("Timeframe for granularity (e.g. '1Min', '5Min', '1D')"),
    date_end: z.string().optional().describe("ISO date to end the history"),
    extended_hours: z
      .boolean()
      .optional()
      .describe("Include extended‑hours data?"),
  },
  async (args) => {
    const payload: GetPortfolioHistoryOpts = {
      period: args.period,
      timeframe: args.timeframe,
      ...(args.date_end ? { date_end: args.date_end } : {}),
      ...(args.extended_hours != null
        ? { extended_hours: args.extended_hours }
        : {}),
    };
    const history = await client.getPortfolioHistory(payload);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(history, null, 2),
        },
      ],
    };
  }
);

// Activities
type GetActivityOpts = Parameters<typeof client.getActivity>[0];
server.tool(
  "alpaca-getActivity",
  {
    activity_type: z
      .string()
      .describe("Type of activity (e.g. 'FILL', 'ORDER_CANCEL')"),
  },
  async (args) => {
    const payload: GetActivityOpts = { activity_type: args.activity_type };
    const act = await client.getActivity(payload);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(act, null, 2) }],
    };
  }
);

server.tool(
  "alpaca-getActivities",
  {}, // no inputs
  async () => {
    const raw = await client.getActivities();
    const all = Array.isArray(raw) ? raw : [raw];
    return {
      content: [
        {
          type: "text" as const,
          text:
            `Fetched ${all.length} activity record(s).\n\n` +
            JSON.stringify(all, null, 2),
        },
      ],
    };
  }
);

// Options contracts
type GetOptionsContractOpts = Parameters<typeof client.getOptionsContract>[0];
server.tool(
  "alpaca-getOptionsContract",
  {
    symbol_or_contract_id: z
      .string()
      .describe("Underlying symbol or exact contract ID"),
  },
  async (args) => {
    const payload: GetOptionsContractOpts = {
      symbol_or_contract_id: args.symbol_or_contract_id,
    };
    const oc = await client.getOptionsContract(payload);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(oc, null, 2) }],
    };
  }
);

type GetOptionsContractsOpts = Parameters<
  typeof client.getOptionsContracts
>[0];

server.tool(
  "alpaca-getOptionsContracts",
  {
    symbol_or_contract_id: z
      .string()
      .describe("Either the option symbol (e.g. AAPL230616C00150000) or contract ID"),
    expiration_date: z
      .string()
      .optional()
      .describe("YYYY‑MM‑DD expiration filter"),
    strike_price: z
      .number()
      .optional()
      .describe("Filter by strike price"),
    option_type: z
      .enum(["call", "put"])
      .optional()
      .describe("Filter by 'call' or 'put'"),
  },
  async (args) => {
    const payload: GetOptionsContractsOpts = {
      symbol_or_contract_id: args.symbol_or_contract_id,
      ...(args.expiration_date
        ? { expiration_date: args.expiration_date }
        : {}),
      ...(args.strike_price != null ? { strike_price: args.strike_price } : {}),
      ...(args.option_type ? { option_type: args.option_type } : {}),
    };

    const list = await client.getOptionsContracts(payload);
    const all = Array.isArray(list) ? list : [list];

    return {
      content: [
        {
          type: "text" as const,
          text:
            `Found ${all.length} contract(s).\n\n` +
            JSON.stringify(all, null, 2),
        },
      ],
    };
  }
);


// Corporate actions
type GetCorporateActionOpts = Parameters<typeof client.getCorporateAction>[0];
server.tool(
  "alpaca-getCorporateAction",
  {
    id: z.string().describe("ID of the corporate action"),
  },
  async (args) => {
    const payload: GetCorporateActionOpts = { id: args.id };
    const ca = await client.getCorporateAction(payload);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(ca, null, 2) }],
    };
  }
);

type GetCorporateActionsOpts = Parameters<
  typeof client.getCorporateActions
>[0];

server.tool(
  "alpaca-getCorporateActions",
  {
    ca_types: z
      .string()
      .describe("Comma‑separated action types (e.g. 'MERGER,CASH_DIVIDEND')"),
    since: z
      .string()
      .describe("Start date (YYYY‑MM‑DD) for filtering"),
    until: z
      .string()
      .describe("End date (YYYY‑MM‑DD) for filtering"),
  },
  async (args) => {
    // args.ca_types, args.since, args.until are all guaranteed strings now
    const payload: GetCorporateActionsOpts = {
      ca_types: args.ca_types,
      since:    args.since,
      until:    args.until,
    };
    const list = await client.getCorporateActions(payload);
    const all = Array.isArray(list) ? list : [list];

    return {
      content: [
        {
          type: "text" as const,
          text:
            `Found ${all.length} corporate action(s).\n\n` +
            JSON.stringify(all, null, 2),
        },
      ],
    };
  }
);


server.tool(
  "alpaca-getStocksCorporateActions",
  {
    symbols: z
      .string()
      .describe("Comma‑separated symbols (e.g. 'AAPL,TSLA')"),
    types: z
      .string()
      .describe("Comma‑separated action types (e.g. 'cash_dividends')"),
  },
  async (args) => {
    const raw = await client.getStocksCorporateActions({
      symbols: args.symbols,
      types: args.types,
    });
    const all = Array.isArray(raw) ? raw : [raw];
    return {
      content: [
        {
          type: "text" as const,
          text:
            `Found ${all.length} stock corporate action(s).\n\n` +
            JSON.stringify(all, null, 2),
        },
      ],
    };
  }
);

// 7) News & market movers
type GetNewsOpts = Parameters<typeof client.getNews>[0];
server.tool(
  "alpaca-getNews",
  {
    symbols: z
      .string()
      .describe("Comma‑separated symbols to fetch news for"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Max number of articles"),
  },
  async (args) => {
    const payload: GetNewsOpts = { symbols: args.symbols, ...(args.limit != null ? { limit: args.limit } : {}) };
    const news = await client.getNews(payload);
    const all = Array.isArray(news) ? news : [news];
    return {
      content: [
        {
          type: "text" as const,
          text:
            `Fetched ${all.length} article(s).\n\n` +
            JSON.stringify(all, null, 2),
        },
      ],
    };
  }
);

type GetStocksMostActivesOpts = Parameters<typeof client.getStocksMostActives>[0];
server.tool(
  "alpaca-getStocksMostActives",
  {
    by: z
      .enum(["volume", "change"])
      .describe("Sort by 'volume' or 'change'"),
    top: z
      .number()
      .int()
      .min(1)
      .max(100)
      .describe("Number of top movers to fetch"),
  },
  async (args) => {
    const payload: GetStocksMostActivesOpts = { by: args.by, top: args.top };
    const list = await client.getStocksMostActives(payload);
    const all = Array.isArray(list) ? list : [list];
    return {
      content: [
        {
          type: "text" as const,
          text:
            `Top ${all.length} most active stocks.\n\n` +
            JSON.stringify(all, null, 2),
        },
      ],
    };
  }
);

type GetStocksMarketMoversOpts = Parameters<typeof client.getStocksMarketMovers>[0];
server.tool(
  "alpaca-getStocksMarketMovers",
  {
    by: z
      .enum(["volume", "change"])
      .describe("Sort by 'volume' or 'change'"),
    top: z
      .number()
      .int()
      .min(1)
      .max(100)
      .describe("Number of top movers to fetch"),
  },
  async (args) => {
    const payload: GetStocksMarketMoversOpts = { by: args.by, top: args.top };
    const list = await client.getStocksMarketMovers(payload);
    const all = Array.isArray(list) ? list : [list];
    return {
      content: [
        {
          type: "text" as const,
          text:
            `Top ${all.length} market mover stocks.\n\n` +
            JSON.stringify(all, null, 2),
        },
      ],
    };
  }
);

// Quotes, snapshots, conditions, trades
type GetStocksQuotesOpts = Parameters<typeof client.getStocksQuotes>[0];
server.tool(
  "alpaca-getStocksQuotes",
  {
    symbols: z.string().describe("Comma‑separated symbols"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(500)
      .optional()
      .describe("Max number of quotes"),
  },
  async (args) => {
    const payload: GetStocksQuotesOpts = {
      symbols: args.symbols,
      ...(args.limit != null ? { limit: args.limit } : {}),
    };
    const list = await client.getStocksQuotes(payload);
    const all = Array.isArray(list) ? list : [list];
    return {
      content: [
        {
          type: "text" as const,
          text:
            `Fetched ${all.length} quote(s).\n\n` +
            JSON.stringify(all, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "alpaca-getStocksQuotesLatest",
  {
    symbols: z
      .string()
      .describe("Comma‑separated symbols to fetch latest quotes (e.g. 'AAPL,TSLA')"),
  },
  async (args) => {
    // 2) Pass symbols into the SDK
    const raw = await client.getStocksQuotesLatest({
      symbols: args.symbols,
    });

    const all = Array.isArray(raw) ? raw : [raw];
    return {
      content: [
        {
          type: "text" as const,
          text:
            `Fetched ${all.length} latest quote(s) for ${args.symbols}.\n\n` +
            JSON.stringify(all, null, 2),
        },
      ],
    };
  }
);


server.tool(
  "alpaca-getStocksSnapshots",
  {
    symbols: z.string().describe("Comma‑separated symbols"),
  },
  async (args) => {
    const raw = await client.getStocksSnapshots({ symbols: args.symbols });
    const all = Array.isArray(raw) ? raw : [raw];
    return {
      content: [
        {
          type: "text" as const,
          text:
            `Fetched ${all.length} snapshot(s).\n\n` +
            JSON.stringify(all, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "alpaca-getStocksConditions",
  {
    tickType: z.string().describe("Type of tick (e.g. 'trades', 'quotes')"),
    tape: z.string().describe("Tape identifier (e.g. 'A', 'B', 'C')"),
  },
  async (args) => {
    const raw = await client.getStocksConditions({
      tickType: args.tickType,
      tape: args.tape,
    });
    const all = Array.isArray(raw) ? raw : [raw];
    return {
      content: [
        {
          type: "text" as const,
          text:
            `Fetched ${all.length} condition(s).\n\n` +
            JSON.stringify(all, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "alpaca-getStocksExchangeCodes",
  {}, // no inputs
  async () => {
    const raw = await client.getStocksExchangeCodes();
    const all = Array.isArray(raw) ? raw : [raw];
    return {
      content: [
        {
          type: "text" as const,
          text:
            `Fetched ${all.length} exchange code(s).\n\n` +
            JSON.stringify(all, null, 2),
        },
      ],
    };
  }
);

type GetStocksTradesOpts = Parameters<typeof client.getStocksTrades>[0];
server.tool(
  "alpaca-getStocksTrades",
  {
    symbols: z.string().describe("Comma‑separated symbols"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(500)
      .optional()
      .describe("Max number of trades"),
  },
  async (args) => {
    const payload: GetStocksTradesOpts = {
      symbols: args.symbols,
      ...(args.limit != null ? { limit: args.limit } : {}),
    };
    const list = await client.getStocksTrades(payload);
    const all = Array.isArray(list) ? list : [list];
    return {
      content: [
        {
          type: "text" as const,
          text:
            `Fetched ${all.length} trade(s).\n\n` +
            JSON.stringify(all, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "alpaca-getStocksTradesLatest",
  {
    symbols: z
      .string()
      .describe("Comma‑separated symbols to fetch latest trades for (e.g. 'AAPL,TSLA')"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(500)
      .optional()
      .describe("Max number of trades to return"),
  },
  async (args) => {
    // now we pass exactly the fields the SDK wants
    const raw = await client.getStocksTradesLatest({
      symbols: args.symbols,
      ...(args.limit != null ? { limit: args.limit } : {}),
    });

    const all = Array.isArray(raw) ? raw : [raw];
    return {
      content: [
        {
          type: "text" as const,
          text:
            `Fetched ${all.length} latest trade(s) for ${args.symbols}.\n\n` +
            JSON.stringify(all, null, 2),
        },
      ],
    };
  }
);




// Setting up Server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Alpaca MCP Server running on stdio")
}

main().catch((error) => {
  console.error("Error running main(), ", error);
  process.exit(1);
});