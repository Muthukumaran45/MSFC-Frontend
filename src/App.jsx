import React, { useEffect, useState } from "react";
import "./App.css";

const API_BASE = "http://localhost:8000";

const STATUS_LABEL = {
  success: "OK",
  no_results: "NO RESULTS",
  timeout: "TIMEOUT",
  error: "ERROR",
  bad_response: "BAD RESPONSE",
};

const VERDICT_LABEL = {
  agreement: "AGREEMENT",
  conflict: "CONFLICT",
  insufficient: "INSUFFICIENT",
};

function StatusPill({ status }) {
  const cls = status === "success" ? "ok" : "fail";
  return (
    <span className={`pill pill--${cls}`}>
      {STATUS_LABEL[status] || status?.toUpperCase() || "UNKNOWN"}
    </span>
  );
}

function SourceCard({ name, result }) {
  if (!result) return null;

  const isWiki = name === "wikipedia";
  const title = isWiki ? "Wikipedia" : "Local knowledge base";

  let bodyText = null;
  if (result.status === "success") {
    if (isWiki && result.candidates?.length) {
      bodyText = result.candidates[0].content;
    } else if (result.content) {
      bodyText = result.content;
    }
  } else {
    bodyText = result.error || "No data returned.";
  }

  return (
    <div className="source-card">
      <div className="source-card__head">
        <span className="source-card__name">{title}</span>
        <StatusPill status={result.status} />
      </div>
      {result.note && <div className="source-card__note">{result.note}</div>}
      {bodyText && <p className="source-card__body">{bodyText}</p>}
    </div>
  );
}

export default function App() {
  const [question, setQuestion] = useState("");
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [simulateWikiFailure, setSimulateWikiFailure] = useState(false);
  const [simulateConflict, setSimulateConflict] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);


  useEffect(() => {
    fetch(`${API_BASE}/suggested-questions`)
      .then((res) => (res.ok ? res.json() : { questions: [] }))
      .then((data) => setSuggestedQuestions(data.questions || []))
      .catch(() => setSuggestedQuestions([]));
  }, []);

  async function runQuestion(q) {
    if (!q.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q.trim(),
          simulate_wiki_failure: simulateWikiFailure,
          simulate_conflict: simulateConflict,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server responded ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(
        err.message?.includes("fetch")
          ? "Could not reach the backend. Is `uvicorn server:app --reload --port 8000` running?"
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    runQuestion(question);
  }

  function handleSuggestionClick(q) {
    setQuestion(q);
  }

  const verdict = result?.analysis?.verdict;

  return (
    <div className="page">
      <header className="masthead">
        <h1 className="masthead__title">Multi-Source Fact Checker</h1>
      
      </header>

      <form className="query-card" onSubmit={handleSubmit}>
        <label className="field-label" htmlFor="question">
          Question
        </label>
        <input
          id="question"
          className="query-input"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a factual question…"
        />

        {suggestedQuestions.length > 0 && (
          <div className="suggested-questions">
            {suggestedQuestions.map((q) => (
              <button
                key={q}
                type="button"
                className="suggested-questions__chip"
                onClick={() => handleSuggestionClick(q)}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="toggles">
          <button
            type="button"
            className={`toggle ${simulateWikiFailure ? "toggle--on" : ""}`}
            onClick={() => setSimulateWikiFailure((v) => !v)}
            aria-pressed={simulateWikiFailure}
          >
            <span className="toggle__switch" />
            <span className="toggle__text">
              Simulate Wikipedia outage
              <span className="toggle__hint">SIMULATE_WIKI_FAILURE</span>
            </span>
          </button>

          <button
            type="button"
            className={`toggle ${simulateConflict ? "toggle--on" : ""}`}
            onClick={() => setSimulateConflict((v) => !v)}
            aria-pressed={simulateConflict}
          >
            <span className="toggle__switch" />
            <span className="toggle__text">
              Simulate conflicting local data
              <span className="toggle__hint">simulate_conflict</span>
            </span>
          </button>
        </div>

        <button className="submit-btn" type="submit" disabled={loading}>
          {loading ? "Investigating…" : "Ask the agent"}
        </button>
      </form>

      {error && <div className="error-banner">{error}</div>}

      {result && (
        <section className="results">
         

          <div className="source-grid">
            {Object.entries(result.source_results || {}).map(([name, r]) => (
              <SourceCard key={name} name={name} result={r} />
            ))}
          </div>

          {result.analysis && (
            <div className={`verdict-card verdict-card--${verdict}`}>
              <div className="stamp">{VERDICT_LABEL[verdict] || verdict}</div>
              <div className="verdict-card__row">
                <span className="verdict-card__label">Confidence</span>
                <span className="verdict-card__value">
                  {result.analysis.confidence}
                </span>
              </div>
              <div className="verdict-card__row verdict-card__row--answer">
                <span className="verdict-card__label">Answer</span>
                <span className="verdict-card__value verdict-card__value--big">
                  {result.analysis.answer}
                </span>
              </div>
              <div className="verdict-card__row">
                <span className="verdict-card__label">Why</span>
                <span className="verdict-card__value">
                  {result.analysis.explanation}
                </span>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}