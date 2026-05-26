const API = "https://brainforge-api.richard-brown-miami.workers.dev"

function App() {
  const [status, setStatus] = React.useState(null)
  const [tab, setTab] = React.useState("status")

  React.useEffect(() => {
    const fetchStatus = () => {
      fetch(API + "/api/status")
        .then((r) => r.json())
        .then(setStatus)
        .catch(() => {})
    }
    fetchStatus()
    const i = setInterval(fetchStatus, 5000)
    return () => clearInterval(i)
  }, [])

  const btnStyle = (active) => ({
    padding: "6px 16px",
    background: active ? "var(--accent)" : "var(--bg3)",
    color: active ? "#000" : "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: "0.8rem",
    fontWeight: 600,
  })

  const cardStyle = {
    background: "var(--bg2)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 24,
  }

  const gridItemStyle = {
    background: "var(--bg3)",
    borderRadius: 8,
    padding: 16,
    textAlign: "center",
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--bg2)",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--accent)" }}>
            DevForge
          </h1>
          <p style={{ fontSize: "0.75rem", color: "var(--text2)", marginTop: 2 }}>
            Autonomous AI Agent
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setTab("status")} style={btnStyle(tab === "status")}>
            Agent Loop
          </button>
          <button onClick={() => setTab("apk")} style={btnStyle(tab === "apk")}>
            APK Builder
          </button>
        </div>
      </header>
      <main
        style={{
          flex: 1,
          maxWidth: 800,
          margin: "0 auto",
          width: "100%",
          padding: "24px 16px",
        }}
      >
        {tab === "status" ? (
          <div style={cardStyle}>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 16 }}>
              Agent Loop Status
            </h2>
            {status ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={gridItemStyle}>
                  <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--accent)" }}>
                    {status.hopCount || 0}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text2)" }}>Hops</div>
                </div>
                <div style={gridItemStyle}>
                  <div
                    style={{
                      fontSize: "1.2rem",
                      fontWeight: 600,
                      color: status.loopState === "running" ? "var(--accent)" : "#facc15",
                    }}
                  >
                    {status.loopState || "idle"}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text2)" }}>State</div>
                </div>
                <div style={{ ...gridItemStyle, textAlign: "left" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text2)" }}>Neurons</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>
                    {(status.totalNeuronsUsed || 0).toLocaleString()}
                  </div>
                </div>
                <div style={{ ...gridItemStyle, textAlign: "left" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text2)" }}>Memory Lines</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>
                    {status.memoryLineCount || 0}
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ color: "var(--text2)" }}>Loading status...</p>
            )}
            <div style={{ marginTop: 16 }}>
              <a
                href={API + "/agent-loop"}
                target="_blank"
                style={{ color: "var(--accent)", fontSize: "0.85rem" }}
              >
                Open full Agent Loop UI &rarr;
              </a>
            </div>
          </div>
        ) : (
          <div style={cardStyle}>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 16 }}>APK Builder</h2>
            <p style={{ color: "var(--text2)", fontSize: "0.85rem", marginBottom: 16 }}>
              Build Android APKs from the DevForge agent.
            </p>
            <a
              href={API + "/apk-builder"}
              target="_blank"
              style={{ color: "var(--accent)", fontSize: "0.85rem" }}
            >
              Open APK Builder &rarr;
            </a>
          </div>
        )}
      </main>
    </div>
  )
}
