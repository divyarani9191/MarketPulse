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