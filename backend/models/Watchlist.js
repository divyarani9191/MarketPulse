const mongoose = require("mongoose");

const watchlistSchema = new mongoose.Schema(
  {
    symbol: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },

    name: {
      type: String,
      required: true,
    },

    exchange: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    change: {
  type: Number,
  required: true,
},

previousPrice: {
  type: Number,
  default: null,
},

previousChange: {
  type: Number,
  default: null,
},

lastCheckedAt: {
  type: Date,
  default: null,
},

marketUpdatedAt: {
  type: Date,
  default: null,
},

marketDataStale: {
  type: Boolean,
  default: false,
},

logo: {
      type: String,
      required: true,
    },

    logoClass: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Watchlist", watchlistSchema);