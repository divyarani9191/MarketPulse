const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const https = require("https");
const Watchlist = require("./models/Watchlist");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 5000;

// ==========================================
// Middleware
// ==========================================

app.use(cors());
app.use(express.json());

// ==========================================
// MongoDB Connection
// ==========================================

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(
        `🚀 MarketPulse backend running on http://localhost:${PORT}`
      );
    });
  })
  .catch((error) => {
    console.error("❌ MongoDB connection failed:");
    console.error(error.message);
  });

// ==========================================
// Health Check
// ==========================================

app.get("/", (req, res) => {
  res.json({
    message: "MarketPulse API is running 🚀",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    service: "MarketPulse Backend",
  });
});

// ==========================================
// GET ALL WATCHLIST STOCKS
// ==========================================

app.get("/api/watchlist", async (req, res) => {
  try {
    const stocks = await Watchlist.find().sort({
      createdAt: 1,
    });

    res.json(stocks);
  } catch (error) {
    console.error(
      "❌ Error fetching watchlist:",
      error.message
    );

    res.status(500).json({
      message: "Failed to fetch watchlist",
    });
  }
});

// ==========================================
// ADD STOCK TO WATCHLIST
// ==========================================

app.post("/api/watchlist", async (req, res) => {
  try {
    const {
      symbol,
      name,
      exchange,
      price,
      change,
      logo,
      logoClass,
    } = req.body;

    const existingStock = await Watchlist.findOne({
      symbol: symbol.toUpperCase(),
    });

    if (existingStock) {
      return res.status(409).json({
        message: "Stock already exists in watchlist",
      });
    }

    const stock = await Watchlist.create({
      symbol,
      name,
      exchange,
      price,
      change,
      logo,
      logoClass,

      // No previous visit when stock is first added
      previousPrice: null,
      previousChange: null,
      lastCheckedAt: null,

      // Market has not been refreshed yet
      marketUpdatedAt: null,
      marketDataStale: true,
    });

    res.status(201).json(stock);
  } catch (error) {
    console.error(
      "❌ Error adding stock:",
      error.message
    );

    res.status(500).json({
      message: "Failed to add stock",
    });
  }
});

// ==========================================
// REMOVE STOCK FROM WATCHLIST
// ==========================================

app.delete("/api/watchlist/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;

    const deletedStock = await Watchlist.findOneAndDelete({
      symbol: symbol.toUpperCase(),
    });

    if (!deletedStock) {
      return res.status(404).json({
        message: "Stock not found",
      });
    }

    res.json({
      message: "Stock removed successfully",
      stock: deletedStock,
    });
  } catch (error) {
    console.error(
      "❌ Error removing stock:",
      error.message
    );

    res.status(500).json({
      message: "Failed to remove stock",
    });
  }
});

// ==========================================
// MARK STOCK AS CHECKED
// ==========================================
//
// This means:
// Current price → becomes previousPrice
// Current change → becomes previousChange
// lastCheckedAt → current time
//
// IMPORTANT:
// Market refresh does NOT modify these values.
// ==========================================

app.post("/api/watchlist/:symbol/check", async (req, res) => {
  try {
    const { symbol } = req.params;

    const stock = await Watchlist.findOne({
      symbol: symbol.toUpperCase(),
    });

    if (!stock) {
      return res.status(404).json({
        message: "Stock not found",
      });
    }

    // Save current market values as user's last checked snapshot
    stock.previousPrice = stock.price;
    stock.previousChange = stock.change;
    stock.lastCheckedAt = new Date();

    await stock.save();

    res.json({
      message: "Stock snapshot saved successfully",
      stock,
    });
  } catch (error) {
    console.error(
      "❌ Error saving stock snapshot:",
      error.message
    );

    res.status(500).json({
      message: "Failed to save stock snapshot",
    });
  }
});

// ==========================================
// ANALYZE STOCK CHANGE
// ==========================================

app.get(
  "/api/watchlist/:symbol/analysis",
  async (req, res) => {
    try {
      const { symbol } = req.params;

      const stock = await Watchlist.findOne({
        symbol: symbol.toUpperCase(),
      });

      if (!stock) {
        return res.status(404).json({
          message: "Stock not found",
        });
      }

      // ========================================
      // No previous snapshot
      // ========================================

      if (
        stock.previousPrice === null ||
        stock.previousPrice === undefined
      ) {
        return res.json({
          symbol: stock.symbol,
          hasPreviousSnapshot: false,
          meaningfulChange: false,
          direction: "stable",
          message:
            "No previous visit data available yet.",
        });
      }

      // ========================================
      // Calculate price change
      // ========================================

      const priceDifference =
        stock.price - stock.previousPrice;

      const priceChangePercent =
        (priceDifference / stock.previousPrice) * 100;

      // ========================================
      // Meaningful change = 3% or more
      // ========================================

      const meaningfulChange =
        Math.abs(priceChangePercent) >= 3;

      // ========================================
      // Direction
      // ========================================

      let direction = "stable";

      if (priceChangePercent > 0) {
        direction = "up";
      } else if (priceChangePercent < 0) {
        direction = "down";
      }

      // ========================================
      // Stale market data
      // ========================================

      let marketDataStale = stock.marketDataStale;

      if (stock.marketUpdatedAt) {
        const now = new Date();
        const updatedAt = new Date(
          stock.marketUpdatedAt
        );

        const ageInMinutes =
          (now - updatedAt) / (1000 * 60);

        // Data older than 15 minutes = stale
        marketDataStale = ageInMinutes > 15;
      } else {
        marketDataStale = true;
      }

      res.json({
        symbol: stock.symbol,

        currentPrice: stock.price,

        previousPrice: stock.previousPrice,

        priceDifference: Number(
          priceDifference.toFixed(2)
        ),

        priceChangePercent: Number(
          priceChangePercent.toFixed(2)
        ),

        direction,

        meaningfulChange,

        lastCheckedAt: stock.lastCheckedAt,

        marketUpdatedAt: stock.marketUpdatedAt,

        marketDataStale,

        message: meaningfulChange
          ? `${stock.symbol} has changed meaningfully since your last check.`
          : `${stock.symbol} has not changed significantly since your last check.`,
      });
    } catch (error) {
      console.error(
        "❌ Error analyzing stock:",
        error.message
      );

      res.status(500).json({
        message: "Failed to analyze stock",
      });
    }
  }
);

// ==========================================
// REFRESH STOCK WITH REAL FINNHUB DATA
// ==========================================
//
// IMPORTANT:
//
// Refresh:
// ✅ Updates current price
// ✅ Updates current change
// ✅ Updates marketUpdatedAt
// ❌ Does NOT update previousPrice
// ❌ Does NOT update previousChange
// ❌ Does NOT update lastCheckedAt
//
// ==========================================

app.post(
  "/api/watchlist/:symbol/refresh",
  async (req, res) => {
    try {
      const { symbol } = req.params;

      const stock = await Watchlist.findOne({
        symbol: symbol.toUpperCase(),
      });

      if (!stock) {
        return res.status(404).json({
          message: "Stock not found",
        });
      }

      // ========================================
      // Fetch latest market data from Finnhub
      // ========================================

      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${stock.symbol}&token=${process.env.FINNHUB_API_KEY}`
      );

      if (!response.ok) {
        return res.status(502).json({
          message:
            "Market data provider is unavailable",
        });
      }

      const marketData = await response.json();

      // ========================================
      // Validate market data
      // ========================================

      if (
        !marketData ||
        typeof marketData.c !== "number"
      ) {
        return res.status(404).json({
          message: `No market data available for ${stock.symbol}`,
        });
      }

      // ========================================
      // Update ONLY current market values
      // ========================================

      stock.price = marketData.c;
      stock.change = marketData.dp;

      // ========================================
      // Save market refresh timestamp
      // ========================================

      stock.marketUpdatedAt = new Date();

      // Fresh data
      stock.marketDataStale = false;

      // ========================================
      // DO NOT TOUCH:
      //
      // stock.previousPrice
      // stock.previousChange
      // stock.lastCheckedAt
      //
      // ========================================

      await stock.save();

      // ========================================
      // Response
      // ========================================

      res.json({
        message:
          "Real market data refreshed successfully",

        stock,

        marketData: {
          price: marketData.c,

          changePercent: marketData.dp,

          previousClose: marketData.pc,

          high: marketData.h,

          low: marketData.l,

          open: marketData.o,

          providerTimestamp: marketData.t,
        },
      });
    } catch (error) {
      console.error(
        "❌ Error refreshing real market data:",
        error.message
      );

      res.status(500).json({
        message: "Failed to refresh market data",
      });
    }
  }
);

// ==========================================
// DIRECT FINNHUB MARKET TEST
// ==========================================

app.get("/api/market/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;

    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol.toUpperCase()}&token=${process.env.FINNHUB_API_KEY}`
    );

    if (!response.ok) {
      return res.status(response.status).json({
        message: "Finnhub API request failed",
      });
    }

    const data = await response.json();

    if (!data || typeof data.c !== "number") {
      return res.status(404).json({
        message: "No market data found for this symbol",
      });
    }

    res.json({
      symbol: symbol.toUpperCase(),

      price: data.c,

      changePercent: data.dp,

      previousClose: data.pc,

      high: data.h,

      low: data.l,

      open: data.o,

      providerTimestamp: data.t,
    });
  } catch (error) {
    console.error(
      "❌ Finnhub error:",
      error.message
    );

    res.status(500).json({
      message: "Unable to fetch market data",
    });
  }
});