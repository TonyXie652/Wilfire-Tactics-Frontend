import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

type Library = {
  name: string;
  version: string;
  license: string;
  url: string;
  description: string;
};

const libraries: Library[] = [
  {
    name: "React",
    version: "19.2.0",
    license: "MIT",
    url: "https://react.dev",
    description: "A JavaScript library for building user interfaces.",
  },
  {
    name: "React DOM",
    version: "19.2.0",
    license: "MIT",
    url: "https://react.dev",
    description: "React package for working with the DOM.",
  },
  {
    name: "React Router DOM",
    version: "7.13.1",
    license: "MIT",
    url: "https://reactrouter.com",
    description: "Declarative routing for React web applications.",
  },
  {
    name: "Mapbox GL JS",
    version: "3.19.1",
    license: "BSD-3-Clause",
    url: "https://docs.mapbox.com/mapbox-gl-js",
    description: "Interactive, customizable vector maps for the web.",
  },
  {
    name: "deck.gl",
    version: "9.2.10",
    license: "MIT",
    url: "https://deck.gl",
    description:
      "WebGL-powered framework for visual exploratory data analysis of large datasets.",
  },
  {
    name: "luma.gl",
    version: "9.2.6",
    license: "MIT",
    url: "https://luma.gl",
    description: "High-performance WebGL2 rendering framework used by deck.gl.",
  },
  {
    name: "Framer Motion",
    version: "12.35.1",
    license: "MIT",
    url: "https://www.framer.com/motion",
    description:
      "A production-ready motion library for React with declarative animations.",
  },
  {
    name: "Lucide React",
    version: "0.577.0",
    license: "ISC",
    url: "https://lucide.dev",
    description:
      "Beautiful & consistent icon toolkit for React, forked from Feather Icons.",
  },
  {
    name: "React Map GL",
    version: "8.1.0",
    license: "MIT",
    url: "https://visgl.github.io/react-map-gl",
    description: "React wrapper for Mapbox GL JS and compatible map libraries.",
  },
  {
    name: "Vite",
    version: "7.3.1",
    license: "MIT",
    url: "https://vite.dev",
    description:
      "Next-generation frontend tooling for fast development and optimized builds.",
  },
  {
    name: "TypeScript",
    version: "5.9.3",
    license: "Apache-2.0",
    url: "https://www.typescriptlang.org",
    description:
      "A strongly typed programming language that builds on JavaScript.",
  },
  {
    name: "ESLint",
    version: "9.39.1",
    license: "MIT",
    url: "https://eslint.org",
    description:
      "A pluggable linting utility for JavaScript and TypeScript.",
  },
];

export default function CitationPage() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        width: "100vw",
        minHeight: "100vh",
        backgroundColor: "#0a0a0f",
        color: "#e0e0e0",
        fontFamily: "system-ui, -apple-system, sans-serif",
        overflow: "auto",
      }}
    >
      {/* Background gradient */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(59,130,246,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(139,92,246,0.06) 0%, transparent 50%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "900px",
          margin: "0 auto",
          padding: "48px 24px 64px",
        }}
      >
        {/* Back button */}
        <button
          onClick={() => navigate("/")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            padding: "8px 16px",
            color: "#aaa",
            cursor: "pointer",
            fontSize: "13px",
            marginBottom: "32px",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(59,130,246,0.5)";
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            e.currentTarget.style.color = "#aaa";
          }}
        >
          <ArrowLeft size={16} />
          Back to Home
        </button>

        {/* Header */}
        <h1
          style={{
            fontSize: "32px",
            fontWeight: "700",
            marginBottom: "8px",
            background: "linear-gradient(135deg, #60a5fa, #a78bfa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-0.5px",
          }}
        >
          Citations & Acknowledgements
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "#888",
            marginBottom: "40px",
            lineHeight: "1.6",
          }}
        >
          This project is built upon the following open-source libraries and
          tools. We gratefully acknowledge the contributions of their respective
          authors and communities.
        </p>

        {/* Library grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "16px",
          }}
        >
          {libraries.map((lib) => (
            <a
              key={lib.name}
              href={lib.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "20px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "12px",
                textDecoration: "none",
                color: "inherit",
                transition: "all 0.25s ease",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(96,165,250,0.4)";
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 8px 24px rgba(0,0,0,0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "16px",
                    fontWeight: "600",
                    color: "#f0f0f0",
                  }}
                >
                  {lib.name}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    fontFamily: "monospace",
                    color: "#60a5fa",
                    background: "rgba(96,165,250,0.1)",
                    padding: "2px 8px",
                    borderRadius: "4px",
                  }}
                >
                  v{lib.version}
                </span>
              </div>

              <p
                style={{
                  fontSize: "13px",
                  color: "#999",
                  lineHeight: "1.5",
                  margin: "0 0 12px",
                  flex: 1,
                }}
              >
                {lib.description}
              </p>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: "#666",
                    background: "rgba(255,255,255,0.05)",
                    padding: "2px 8px",
                    borderRadius: "4px",
                  }}
                >
                  {lib.license}
                </span>
                <span style={{ fontSize: "11px", color: "#555" }}>
                  {new URL(lib.url).hostname}
                </span>
              </div>
            </a>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "48px",
            paddingTop: "24px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "12px", color: "#555", lineHeight: "1.8" }}>
            Wildfire Tactics — an interactive wildfire evacuation simulation
            system.
            <br />
            Built with open-source technologies. All trademarks belong to their
            respective owners.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
