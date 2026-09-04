const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Watchlist = require("./models/Watchlist");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
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

// Health check
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
// Get all watchlist stocks
app.get("/api/watchlist", async (req, res) => {
  try {
    const stocks = await Watchlist.find().sort({ createdAt: 1 });

    res.json(stocks);
  } catch (error) {
    console.error("Error fetching watchlist:", error.message);

    res.status(500).json({
      message: "Failed to fetch watchlist",
    });
  }
});
// Add stock to watchlist
app.post("/api/watchlist", async (req, res) => {
  try {
    const { symbol, name, exchange, price, change, logo, logoClass } =
      req.body;

    const existingStock = await Watchlist.findOne({ symbol });

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
    });

    res.status(201).json(stock);
  } catch (error) {
    console.error("Error adding stock:", error.message);

    res.status(500).json({
      message: "Failed to add stock",
    });
  }
});
// Remove stock from watchlist
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
    console.error("Error removing stock:", error.message);

    res.status(500).json({
      message: "Failed to remove stock",
    });
  }
});
// Save current stock data as the user's last checked snapshot
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

    // Save the current values as the previous snapshot
    stock.previousPrice = stock.price;
    stock.previousChange = stock.change;
    stock.lastCheckedAt = new Date();

    await stock.save();

    res.json({
      message: "Stock snapshot saved successfully",
      stock,
    });
  } catch (error) {
    console.error("Error saving stock snapshot:", error.message);

    res.status(500).json({
      message: "Failed to save stock snapshot",
    });
  }
});
// Analyze whether a stock has meaningfully changed
app.get("/api/watchlist/:symbol/analysis", async (req, res) => {
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

    // If there is no previous snapshot yet
    if (stock.previousPrice === null) {
      return res.json({
        symbol: stock.symbol,
        hasPreviousSnapshot: false,
        meaningfulChange: false,
        message: "No previous visit data available yet.",
      });
    }

    const priceDifference = stock.price - stock.previousPrice;

    const priceChangePercent =
      (priceDifference / stock.previousPrice) * 100;

    const meaningfulChange =
      Math.abs(priceChangePercent) >= 3;

    let direction = "stable";

    if (priceChangePercent > 0) {
      direction = "up";
    } else if (priceChangePercent < 0) {
      direction = "down";
    }

    res.json({
      symbol: stock.symbol,
      currentPrice: stock.price,
      previousPrice: stock.previousPrice,
      priceDifference: Number(priceDifference.toFixed(2)),
      priceChangePercent: Number(priceChangePercent.toFixed(2)),
      direction,
      meaningfulChange,
      lastCheckedAt: stock.lastCheckedAt,
      message: meaningfulChange
        ? `${stock.symbol} has changed meaningfully since your last check.`
        : `${stock.symbol} has not changed significantly since your last check.`,
    });
  } catch (error) {
    console.error("Error analyzing stock:", error.message);

    res.status(500).json({
      message: "Failed to analyze stock",
    });
  }
});
// Demo market refresh
// Simulates a new market price so we can test
// "meaningful change since last check".
app.post("/api/watchlist/:symbol/refresh", async (req, res) => {
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

    // Keep current price as the previous price
    stock.previousPrice = stock.price;
    stock.previousChange = stock.change;

    // Simulate a market movement between -5% and +5%
    const movement = (Math.random() * 10 - 5) / 100;

    const newPrice = stock.price * (1 + movement);

    // Calculate percentage movement
    const newChange = movement * 100;

    stock.price = Number(newPrice.toFixed(2));
    stock.change = Number(newChange.toFixed(2));

    stock.lastCheckedAt = new Date();

    await stock.save();

    res.json({
      message: "Market data refreshed successfully",
      stock,
    });
  } catch (error) {
    console.error("Error refreshing market data:", error.message);

    res.status(500).json({
      message: "Failed to refresh market data",
    });
  }
});