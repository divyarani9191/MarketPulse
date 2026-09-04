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
  // MongoDB se watchlist load hogi
  const [watchlist, setWatchlist] = useState([]);

  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Load watchlist from MongoDB when page opens
  useEffect(() => {
    fetch("http://localhost:5000/api/watchlist")
      .then((response) => response.json())
      .then((data) => {
        setWatchlist(data);
      })
      .catch((error) => {
        console.error("Error loading watchlist:", error);
      });
  }, []);

  const searchResults = availableStocks.filter((stock) => {
    const query = search.toLowerCase();

    return (
      stock.name.toLowerCase().includes(query) ||
      stock.symbol.toLowerCase().includes(query)
    );
  });

  // TEMPORARY: Add functionality will be connected to MongoDB in next step
  const addStock = async (stock) => {
  const alreadyAdded = watchlist.some(
    (item) => item.symbol === stock.symbol
  );

  if (alreadyAdded) {
    return;
  }

  try {
    const response = await fetch(
      "http://localhost:5000/api/watchlist",
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

    // Add the MongoDB saved stock to React state
    setWatchlist((prev) => [...prev, data]);

    setSearch("");
    setShowSearch(false);

    console.log("✅ Stock added to MongoDB:", data);
  } catch (error) {
    console.error("❌ Error adding stock:", error);
  }
};

  const removeStock = async (symbol) => {
  try {
    const response = await fetch(
      `http://localhost:5000/api/watchlist/${symbol}`,
      {
        method: "DELETE",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Failed to remove stock:", data.message);
      return;
    }

    // Remove from React state after successful MongoDB deletion
    setWatchlist((prev) =>
      prev.filter((stock) => stock.symbol !== symbol)
    );

    console.log("✅ Stock removed from MongoDB:", data);
  } catch (error) {
    console.error("❌ Error removing stock:", error);
  }
};

  const attentionStocks = watchlist.filter(
    (stock) => Math.abs(stock.change) >= 3
  );

  const stableStocks = watchlist.filter(
    (stock) => Math.abs(stock.change) < 3
  );

  return (
    <div className="app">

      {/* Navbar */}
      <nav className="navbar">

        <div className="logo">
          <span className="logo-icon">◉</span>
          <span>MarketPulse</span>
        </div>

        <div className="nav-right">

          <span className="market-status">
            <span className="status-dot"></span>
            Market Open
          </span>

          <div className="profile">D</div>

        </div>

      </nav>

      {/* Main */}
      <main className="main-content">

        {/* Header */}
        <section className="page-header">

          <div>

            <p className="eyebrow">
              YOUR MARKET DASHBOARD
            </p>

            <h1>
              Good afternoon 👋
            </h1>

            <p className="subtitle">
              See what changed in your watchlist since your last visit.
            </p>

          </div>

          <button
            className="add-button"
            onClick={() => setShowSearch(!showSearch)}
          >
            + Add Stock
          </button>

        </section>

        {/* Search Box */}
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
                          {alreadyAdded ? "Added ✓" : "Add"}
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

          <div className="summary-card">

            <p>Total Stocks</p>

            <h2>{watchlist.length}</h2>

            <span>Your watchlist</span>

          </div>

          <div className="summary-card attention">

            <p>Needs Attention</p>

            <h2>{attentionStocks.length}</h2>

            <span>Significant changes</span>

          </div>

          <div className="summary-card">

            <p>Last Updated</p>

            <h2>2m</h2>

            <span>Just now</span>

          </div>

        </section>

        {/* Attention */}
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

                <div className="stock-price">

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

                </div>

                <div className="change-info">

                  <span
                    className={
                      stock.change >= 0
                        ? "change-icon"
                        : "change-icon down"
                    }
                  >
                    {stock.change >= 0 ? "↑" : "↓"}
                  </span>

                  <div>

                    <strong>Significant change</strong>

                    <p>
                      {stock.change >= 0 ? "Up " : "Down "}
                      {Math.abs(stock.change)}% since your last visit
                    </p>

                  </div>

                </div>

                <div className="attention-score">

                  <span>Attention</span>

                  <strong>
                    {Math.min(
                      100,
                      Math.round(Math.abs(stock.change) * 20)
                    )}
                  </strong>

                </div>

              </div>

            ))}

          </section>
        )}

        {/* Watchlist */}
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

                  </div>

                  <button
                    className="remove-button"
                    onClick={() => removeStock(stock.symbol)}
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