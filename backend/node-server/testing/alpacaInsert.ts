import axios from "axios";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const ALPACA_API_KEY = process.env.ALPACA_API_KEY!;
const ALPACA_SECRET_KEY = process.env.ALPACA_SECRET_KEY!;

const STOCKS = ["AAPL", "NVDA", "TSLA"];

const ALPACA_URL = "https://data.alpaca.markets/v2/stocks";

interface AlpacaBar {
    t: string;
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
    vw?: number;
    n?: number;
}

interface AlpacaResponse {
    bars: AlpacaBar[];
    next_page_token: string | null;
}

// Get last 6 months
function getDateRange() {
    const end = new Date();

    const start = new Date();
    start.setMonth(start.getMonth() - 6);

    return {
        start: start.toISOString(),
        end: end.toISOString(),
    };
}

// Get stock ID from stocks table
async function getStockId(symbol: string): Promise<number> {
    const result = await pool.query(
        `
    SELECT id
    FROM stocks
    WHERE symbol = $1
    `,
        [symbol]
    );

    if (result.rows.length === 0) {
        throw new Error(`Stock ${symbol} not found in stocks table`);
    }

    return result.rows[0].id;
}

// Fetch one page from Alpaca
async function fetchBars(
    symbol: string,
    start: string,
    end: string,
    pageToken?: string
): Promise<AlpacaResponse> {
    const response = await axios.get(
        `${ALPACA_URL}/${symbol}/bars`,
        {
            params: {
                timeframe: "1Min",
                start,
                end,
                limit: 10000,
                feed: "iex",
                ...(pageToken && {
                    page_token: pageToken,
                }),
            },

            headers: {
                "APCA-API-KEY-ID": ALPACA_API_KEY,
                "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
            },
        }
    );

    return response.data;
}

// Insert candles into candles_data
async function insertCandles(
    stockId: number,
    bars: AlpacaBar[]
) {
    if (bars.length === 0) {
        return;
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        for (const bar of bars) {
            await client.query(
                `
        INSERT INTO candles_data (
          stock_id,
          candle_time,
          open,
          high,
          low,
          close,
          volume,
          vwap,
          trade_count
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (stock_id, candle_time)
        DO NOTHING
        `,
                [
                    stockId,
                    bar.t,
                    bar.o,
                    bar.h,
                    bar.l,
                    bar.c,
                    bar.v,
                    bar.vw ?? null,
                    bar.n ?? null,
                ]
            );
        }

        await client.query("COMMIT");

        console.log(
            `Inserted ${bars.length} candles`
        );
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

// Download one stock
async function downloadStock(symbol: string) {
    console.log(`\nDownloading ${symbol}...`);

    const stockId = await getStockId(symbol);

    console.log(`Stock ID: ${stockId}`);

    const { start, end } = getDateRange();

    let pageToken: string | undefined;
    let totalCandles = 0;

    while (true) {
        const data = await fetchBars(
            symbol,
            start,
            end,
            pageToken
        );

        const bars = data.bars ?? [];

        console.log(
            `${symbol}: received ${bars.length} candles`
        );

        if (bars.length > 0) {
            await insertCandles(stockId, bars);

            totalCandles += bars.length;
        }

        pageToken = data.next_page_token ?? undefined;

        if (!pageToken) {
            break;
        }
    }

    console.log(
        `Finished ${symbol}: ${totalCandles} candles`
    );
}

// Main
async function main() {
    try {
        console.log("Starting historical data download...");

        for (const symbol of STOCKS) {
            await downloadStock(symbol);
        }

        console.log("\nAll stocks completed.");
    } catch (error: any) {
        console.error(
            "Error:",
            error.response?.data || error.message
        );
    } finally {
        await pool.end();
    }
}

main();