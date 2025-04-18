<<<<<<< HEAD
# Alpaca API MCP Server
------

This MCP server provides an interface to the Alpaca trading API allowing you to trade stock, place trades, and access market information. Here is a list of "tools" it uses:

`get-alpaca-account`: Fetches your Alpaca account details.

`alpaca-createOrder`: Places a new order on Alpaca (buy/sell).

`alpaca-getOrder`: Retrieves a single order by its ID.

`alpaca-getOrders`: Lists orders with optional filters (status, limit, direction).

`alpaca-replaceOrder`: Modifies an existing order’s quantity or limit price.

`alpaca-cancelOrder`: Cancels a specific order by ID.

`alpaca-cancelOrders`: Cancels all open orders at once.

`alpaca-getPosition`: Retrieves details for a specific position.

`alpaca-getPositions`: Lists all current positions in your account.

`alpaca-closePosition`: Closes a specific position by symbol or asset ID.

`alpaca-closePositions`: Closes all open positions.

`alpaca-exerciseOption`: Exercises a specified option contract.

`alpaca-getWatchlist`: Retrieves a single watchlist by ID.

`alpaca-getWatchlists`: Lists all your watchlists.

`alpaca-createWatchlist`: Creates a new watchlist with given symbols.

`alpaca-updateWatchlist`: Updates an existing watchlist’s name and symbols.

`alpaca-deleteWatchlist`: Deletes a watchlist by ID.

`alpaca-getPortfolioHistory`: Fetches historical portfolio performance data.

`alpaca-getActivity`: Retrieves a specific account activity record.

`alpaca-getActivities`: Lists all account activity records.

`alpaca-getOptionsContract`: Retrieves details for one options contract.

`alpaca-getOptionsContracts`: Lists options contracts with filters.

`alpaca-getCorporateAction`: Retrieves a specific corporate action event.

`alpaca-getCorporateActions`: Lists corporate actions within a date range.

`alpaca-getStocksCorporateActions`: Lists corporate actions for stocks.

`alpaca-getNews`: Fetches news articles for specified symbols.

`alpaca-getStocksMostActives`: Lists the most active stocks by volume or change.

`alpaca-getStocksMarketMovers`: Lists top market movers by volume or change.

`alpaca-getStocksQuotes`: Retrieves quotes for specified symbols.

`alpaca-getStocksQuotesLatest`: Retrieves the latest quotes for symbols.

`alpaca-getStocksSnapshots`: Fetches snapshot data for symbols.

`alpaca-getStocksConditions`: Retrieves tick condition codes for trades or quotes.

`alpaca-getStocksExchangeCodes`: Lists available stock exchange codes.

`alpaca-getStocksTrades`: Retrieves trade data for specified symbols.

`alpaca-getStocksTradesLatest`: Retrieves the latest trade data for symbols.

## Installation
-----
1. Clone this repo
2. Install once using `npm install`
    - Reads the `package.json` and `package-lock.json` to install dependencies
3. For Development: `npm run dev` 
4. To ship
    1. `npm run build`
        - will execute the build script in the `package.json`
    2. `npm start`
        - launches the development server on Node.js backend

## Connecting to Claude Desktop App
-----

After running `npm run build` to build your server, you can test your MCP server using Claude as the client. 

After installing Claude for Desktop, the App configuration sits in `~/Library/Application Support/Claude/claude_desktop_config.json`. You can use the command
`code ~/Library/Application\ Support/Claude/claude_desktop_config.json` to open this file. 

Now, you want to add the following to this json file for your MCP server. 
``` Node
{
    "mcpServers": {
        "alpaca": {
            "command": "node",
            "args": [
                "/ABSOLUTE/PATH/TO/PARENT/FOLDER/alpaca/build/index.js"
            ]
        }
    }
}
```

Save the file and restart Claude for Desktop. Once you launch you should see the hammer logo with your preloaded MCP toolkit/functions. Enjoy Trading!
=======
# alpaca-mcp
[![smithery badge](https://smithery.ai/badge/@wlu03/alpaca-mcp)](https://smithery.ai/server/@wlu03/alpaca-mcp)

## Description

MCP server for Alpaca-LoRA.

## Getting Started

### Installing via Smithery

To install alpaca-mcp for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@wlu03/alpaca-mcp):

```bash
npx -y @smithery/cli install @wlu03/alpaca-mcp --client claude
```

### Setting Up

1. Clone this repository.

   ```bash
   git clone https://github.com/wlu03/alpaca-mcp.git
   ```

2. Install the dependencies.

   ```bash
   cd alpaca-mcp
   pip install -r requirements.txt
   ```

3. Run the server.

   ```bash
   python server.py
   ```

## Usage

Configure your MCP client to connect to the server on the specified port.

## Contributions

Contributions are welcome! Please fork this repository, make your changes, and open a pull request.

## License

This project is licensed under the MIT License.

## Contact

For issues, questions, and suggestions, create an issue in the repository or contact the maintainers through GitHub.
>>>>>>> 7bc2ee3f7e74ba331c377030f36651b1a565f509
