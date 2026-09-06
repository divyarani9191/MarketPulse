import { useState, useEffect } from "react";
import "./App.css";

const availableStocks = [
  {
    symbol: "NVDA",
    name: "NVIDIA",
    exchange: "NASDAQ",
    price: 188.2,
    change: 4.44,
    logo: "N",
    logoClass: "nvidia",
  },
  {
    symbol: "TSLA",
    name: "Tesla",
    exchange: "NASDAQ",
    price: 341.2,
    change: -3.12,
    logo: "T",
    logoClass: "tesla",
  },
  {
    symbol: "AAPL",
    name: "Apple",
    exchange: "NASDAQ",
    price: 232.1,
    change: 0.42,
    logo: "A",
    logoClass: "apple",
  },
  {
    symbol: "MSFT",
    name: "Microsoft",
    exchange: "NASDAQ",
    price: 505.6,
    change: 0.31,
    logo: "M",
    logoClass: "microsoft",
  },
  {
    symbol: "AMZN",
    name: "Amazon",
    exchange: "NASDAQ",
    price: 231.4,
    change: -0.18,
    logo: "A",
    logoClass: "amazon",
  },
  {
    symbol: "GOOGL",
    name: "Alphabet",
    exchange: "NASDAQ",
    price: 201.8,
    change: 1.72,
    logo: "G",
    logoClass: "google",
  },
];

function App() {
  const [watchlist, setWatchlist] = useState([]);
  const [loadingMarket, setLoadingMarket] = useState(false);
  const [marketError, setMarketError] = useState("");
  const [analysis, setAnalysis] = useState({});

  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const currentHour = new Date().getHours();

  let greeting;

  if (currentHour >= 5 && currentHour < 12) {
    greeting = "Good morning 🌅";
  } else if (currentHour >= 12 && currentHour < 17) {
    greeting = "Good afternoon ☀️";
  } else {
    greeting = "Good evening 🌙";
  }

  // Load watchlist from MongoDB
  useEffect(() => {
    fetch("https://marketpulse-7ngo.onrender.com/api/watchlist")
      .then((response) => response.json())
      .then((data) => {
        setWatchlist(data);

        if (data.length > 0) {
          loadAnalysis(data);
        }
      })
      .catch((error) => {
        console.error("Error loading watchlist:", error);
      });
  }, []);

  // Search stocks
  const searchResults = availableStocks.filter((stock) => {
    const query = search.toLowerCase();

    return (
      stock.name.toLowerCase().includes(query) ||
      stock.symbol.toLowerCase().includes(query)
    );
  });

  // Add stock
  const addStock = async (stock) => {
    const alreadyAdded = watchlist.some(
      (item) => item.symbol === stock.symbol
    );

    if (alreadyAdded) {
      return;
    }

    try {
      const response = await fetch(
        "https://marketpulse-7ngo.onrender.com/api/watchlist",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(stock),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Failed to add stock:", data.message);
        return;
      }

      setWatchlist((prev) => [...prev, data]);

      setSearch("");
      setShowSearch(false);

      console.log("✅ Stock added to MongoDB:", data);
    } catch (error) {
      console.error("❌ Error adding stock:", error);
    }
  };

  // Remove stock
  const removeStock = async (symbol) => {
    try {
      const response = await fetch(
        `https://marketpulse-7ngo.onrender.com/api/watchlist/${symbol}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("Failed to remove stock:", data.message);
        return;
      }

      setWatchlist((prev) =>
        prev.filter((stock) => stock.symbol !== symbol)
      );

      setAnalysis((prev) => {
        const updated = { ...prev };
        delete updated[symbol];
        return updated;
      });

      console.log("✅ Stock removed from MongoDB:", data);
    } catch (error) {
      console.error("❌ Error removing stock:", error);
    }
  };

  // Load analysis for all stocks
  const loadAnalysis = async (stocks) => {
    try {
      const results = {};

      for (const stock of stocks) {
        const response = await fetch(
          `https://marketpulse-7ngo.onrender.com/api/watchlist/${stock.symbol}/analysis`
        );

        const data = await response.json();

        if (response.ok) {
          results[stock.symbol] = data;
        }
      }

      setAnalysis(results);
    } catch (error) {
      console.error("❌ Error loading analysis:", error);

      setMarketError(
        "Unable to update market data. Showing your last known data."
      );
    }
  };

  // Refresh market data from Finnhub
  const refreshMarket = async () => {
  if (watchlist.length === 0) {
    return;
  }

  setLoadingMarket(true);
  setMarketError("");

  try {
    const refreshResults = await Promise.all(
      watchlist.map(async (stock) => {
        try {
          const response = await fetch(
            `https://marketpulse-7ngo.onrender.com/api/watchlist/${stock.symbol}/refresh`,
            {
              method: "POST",
            }
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data.message || `Failed to refresh ${stock.symbol}`
            );
          }

          return data;
        } catch (error) {
          console.error(
            `❌ Failed to refresh ${stock.symbol}:`,
            error.message
          );

          // Keep the old stock data if one stock fails
          return {
            stock,
            error: true,
          };
        }
      })
    );

    // Keep successful updates + old data for failed stocks
    const updatedStocks = refreshResults.map(
      (result) => result.stock
    );

    setWatchlist(updatedStocks);

    // Check whether any stock failed
    const failedStocks = refreshResults.filter(
      (result) => result.error
    );

    if (failedStocks.length > 0) {
      setMarketError(
        "Unable to update some market data. Showing your last known data."
      );
    }

    // Load analysis for all stocks
    const analysisResults = await Promise.all(
      updatedStocks.map(async (stock) => {
        try {
          const response = await fetch(
            `https://marketpulse-7ngo.onrender.com/api/watchlist/${stock.symbol}/analysis`
          );

          if (!response.ok) {
            return null;
          }

          return await response.json();
        } catch (error) {
          console.error(
            `❌ Analysis failed for ${stock.symbol}:`,
            error.message
          );

          return null;
        }
      })
    );

    const analysisMap = {};

    analysisResults.forEach((result) => {
      if (result) {
        analysisMap[result.symbol] = result;
      }
    });

    setAnalysis(analysisMap);
  } catch (error) {
    console.error("❌ Market refresh failed:", error);

    setMarketError(
      "Unable to update market data. Showing your last known data."
    );
  } finally {
    setLoadingMarket(false);
  }
};

  // Mark current prices as user's last checked snapshot
  const saveLastCheck = async (stocks) => {
    if (stocks.length === 0) {
      return;
    }

    try {
      await Promise.all(
        stocks.map(async (stock) => {
          const response = await fetch(
            `https://marketpulse-7ngo.onrender.com/api/watchlist/${stock.symbol}/check`,
            {
              method: "POST",
            }
          );

          if (!response.ok) {
            throw new Error(
              `Failed to save check for ${stock.symbol}`
            );
          }

          return response.json();
        })
      );

      // Reload watchlist
      const response = await fetch(
        "https://marketpulse-7ngo.onrender.com/api/watchlist"
      );

      if (response.ok) {
        const updatedStocks = await response.json();

        setWatchlist(updatedStocks);

        // Reload analysis
        await loadAnalysis(updatedStocks);
      }

      console.log("✅ All stocks marked as checked");
    } catch (error) {
      console.error("❌ Error saving last check:", error);
    }
  };

  // Stocks needing attention
  const attentionStocks = watchlist.filter(
    (stock) =>
      analysis[stock.symbol]?.meaningfulChange === true
  );

  // Stable stocks
  const stableStocks = watchlist.filter(
    (stock) =>
      analysis[stock.symbol]?.meaningfulChange !== true
  );

  // Find latest checked stock
  const getLatestCheckedStock = () => {
    const checkedStocks = watchlist.filter(
      (stock) => stock.lastCheckedAt
    );

    if (checkedStocks.length === 0) {
      return null;
    }

    return checkedStocks.reduce((latest, stock) =>
      new Date(stock.lastCheckedAt) >
      new Date(latest.lastCheckedAt)
        ? stock
        : latest
    );
  };

  // Format last checked time
  function getLastUpdatedText() {
  if (!watchlist.length) return "Not yet";

  const latest = watchlist
    .filter(stock => stock.lastCheckedAt || stock.marketUpdatedAt)
    .sort((a, b) => {
      const dateA = new Date(a.lastCheckedAt || a.marketUpdatedAt);
      const dateB = new Date(b.lastCheckedAt || b.marketUpdatedAt);
      return dateB - dateA;
    })[0];

  if (!latest) return "Not yet";

  const date = new Date(
    latest.lastCheckedAt || latest.marketUpdatedAt
  );

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

  const lastUpdated = getLastUpdatedText();

  return (
    <div className="app">

      {/* Navbar */}
      <nav className="navbar">

        <div className="logo">
          <span className="logo-icon">↗</span>
          <span>MarketPulse</span>
        </div>

        <div className="nav-right">

          <span className="market-status">
            <span className="status-dot"></span>
             Live Market Data
          </span>

          <div className="profile">D</div>

        </div>

      </nav>

      {/* Main */}
      <main className="main-content">

        {/* Error message */}
        {marketError && (
          <div className="market-error">
            ⚠ {marketError}
          </div>
        )}

        {/* Header */}
        <section className="page-header">

          <div>

            <p className="eyebrow">
              YOUR MARKET DASHBOARD
            </p>

            <h1>
              {greeting}
            </h1>

            <p className="subtitle">
              See what changed in your watchlist since your last visit.
            </p>

          </div>

          <div className="header-buttons">

            <button
              className="refresh-button"
              onClick={refreshMarket}
              disabled={
                loadingMarket || watchlist.length === 0
              }
            >
              {loadingMarket
                ? "↻ Refreshing..."
                : "↻ Refresh Market"}
            </button>

            <button
              className="check-button"
              onClick={() => saveLastCheck(watchlist)}
              disabled={watchlist.length === 0}
            >
              ✓ Mark as Checked
            </button>

            <button
              className="add-button"
              onClick={() => setShowSearch(!showSearch)}
            >
              + Add Stock
            </button>

          </div>

        </section>

        {/* Search */}
        {showSearch && (
          <section className="search-section">

            <div className="search-box">

              <span className="search-icon">⌕</span>

              <input
                type="text"
                placeholder="Search by company name or symbol..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />

              <button
                className="close-search"
                onClick={() => {
                  setShowSearch(false);
                  setSearch("");
                }}
              >
                ×
              </button>

            </div>

            {search.length > 0 && (
              <div className="search-results">

                {searchResults.length > 0 ? (

                  searchResults.map((stock) => {

                    const alreadyAdded = watchlist.some(
                      (item) => item.symbol === stock.symbol
                    );

                    return (
                      <div
                        className="search-result"
                        key={stock.symbol}
                      >

                        <div className="stock-main">

                          <div
                            className={`stock-logo ${stock.logoClass}`}
                          >
                            {stock.logo}
                          </div>

                          <div>

                            <h3>{stock.name}</h3>

                            <span className="symbol">
                              {stock.symbol} · {stock.exchange}
                            </span>

                          </div>

                        </div>

                        <button
                          className={
                            alreadyAdded
                              ? "added-button"
                              : "result-add-button"
                          }
                          disabled={alreadyAdded}
                          onClick={() => addStock(stock)}
                        >
                          {alreadyAdded
                            ? "Added ✓"
                            : "Add"}
                        </button>

                      </div>
                    );
                  })

                ) : (

                  <div className="no-results">
                    No stocks found.
                  </div>

                )}

              </div>
            )}

          </section>
        )}

        {/* Summary */}
        <section className="summary-grid">

          {/* TOTAL STOCKS */}
          <div className="summary-card">

            <p>Total Stocks</p>

            <h2>{watchlist.length}</h2>

            <span>Your watchlist</span>

          </div>

          {/* NEEDS ATTENTION */}
          <div className="summary-card attention">

            <p>Needs Attention</p>

            <h2>{attentionStocks.length}</h2>

            <span>Significant changes</span>

          </div>

          {/* LAST UPDATED */}
          <div className="summary-card">

            <p>Last Updated</p>

            <h2>{lastUpdated.time}</h2>

            <span>{lastUpdated.symbol}</span>

          </div>

        </section>

        {/* NEEDS ATTENTION */}
        {attentionStocks.length > 0 && (

          <section className="section">

            <div className="section-heading">

              <div>

                <h2>Needs your attention</h2>

                <p>
                  Stocks that changed meaningfully since your last visit.
                </p>

              </div>

              <span className="count-badge">
                {attentionStocks.length}
              </span>

            </div>

            {attentionStocks.map((stock) => (

              <div
                className="stock-card attention-card"
                key={stock.symbol}
              >

                {/* Stock information */}
                <div className="stock-main">

                  <div
                    className={`stock-logo ${stock.logoClass}`}
                  >
                    {stock.logo}
                  </div>

                  <div>

                    <h3>{stock.name}</h3>

                    <span className="symbol">
                      {stock.symbol} · {stock.exchange}
                    </span>

                  </div>

                </div>

                {/* Price */}
                <div className="stock-price">

                  <strong>
                    ${Number(stock.price).toFixed(2)}
                  </strong>

                  <span
                    className={
                      stock.change >= 0
                        ? "positive"
                        : "negative"
                    }
                  >
                    {stock.change >= 0 ? "+" : ""}
                    {stock.change}%
                  </span>

                </div>

                {/* Change information */}
                <div className="change-info">

                  <span
                    className={
                      analysis[stock.symbol]?.direction === "up"
                        ? "change-icon"
                        : "change-icon down"
                    }
                  >
                    {analysis[stock.symbol]?.direction === "up"
                      ? "↑"
                      : "↓"}
                  </span>

                  <div>

                    <strong>
                      Significant change
                    </strong>

                    <p>

                      {analysis[stock.symbol]?.direction === "up"
                        ? "Up "
                        : "Down "}

                      {Math.abs(
                        analysis[stock.symbol]
                          ?.priceChangePercent ??
                          stock.change
                      ).toFixed(2)}

                      % since your last check

                    </p>

                  </div>

                </div>

                {/* Attention score */}
                <div className="attention-score">

                  <span>Attention</span>

                  <strong>
                    {Math.min(
                      100,
                      Math.round(
                        Math.abs(
                          analysis[stock.symbol]
                            ?.priceChangePercent ??
                            stock.change
                        ) * 20
                      )
                    )}
                  </strong>

                </div>

              </div>

            ))}

          </section>
        )}

        {/* WATCHLIST */}
        {/* Market Data Status */}
{watchlist.some((stock) => stock.marketDataStale) && (
  <div className="market-stale-warning">
    ⚠ Some market data may be delayed or unavailable.
  </div>
)}
        <section className="section">

          <div className="section-heading">

            <div>

              <h2>Your watchlist</h2>

              <p>
                Other stocks you're tracking.
              </p>

            </div>

          </div>

          {stableStocks.length > 0 ? (

            <div className="watchlist-grid">

              {stableStocks.map((stock) => (

                <div
                  className="mini-stock-card"
                  key={stock.symbol}
                >

                  <div
                    className={`stock-logo ${stock.logoClass}`}
                  >
                    {stock.logo}
                  </div>

                  <div className="mini-info">

                    <h3>{stock.name}</h3>

                    <span>{stock.symbol}</span>

                  </div>

                  <div className="mini-price">

  <strong>
    ${stock.price.toFixed(2)}
  </strong>

  <span
    className={
      stock.change >= 0
        ? "positive"
        : "negative"
    }
  >
    {stock.change >= 0 ? "+" : ""}
    {stock.change}%
  </span>

  {stock.marketUpdatedAt && (
    <small className="market-updated">
      Updated{" "}
      {new Date(stock.marketUpdatedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </small>
  )}

</div>

                  <button
                    className="remove-button"
                    onClick={() =>
                      removeStock(stock.symbol)
                    }
                    title="Remove from watchlist"
                  >
                    ×
                  </button>

                </div>

              ))}

            </div>

          ) : (

            <div className="empty-state">

              <h3>Your watchlist is empty</h3>

              <p>
                Add a stock to start tracking the market.
              </p>

            </div>

          )}

        </section>

      </main>

    </div>
  );
}

export default App;