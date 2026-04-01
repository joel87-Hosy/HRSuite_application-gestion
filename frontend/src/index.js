import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import reportWebVitals from "./reportWebVitals";

// Handle DOM errors caused by browser extensions (Kaspersky, Grammarly, etc.)
window.addEventListener("error", (event) => {
  if (
    event.message &&
    (event.message.includes("removeChild") ||
      event.message.includes("is not a child"))
  ) {
    event.preventDefault();
    window.location.reload();
  }
});

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error("App error:", error, info);
    // Auto-reload on DOM errors caused by extensions
    if (error.message && error.message.includes("removeChild")) {
      setTimeout(() => window.location.reload(), 1000);
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            gap: 16,
            fontFamily: "sans-serif",
          }}
        >
          <h2>Une erreur est survenue</h2>
          <p style={{ color: "#666" }}>Veuillez rafraîchir la page</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 24px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            Rafraîchir
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);

reportWebVitals();
