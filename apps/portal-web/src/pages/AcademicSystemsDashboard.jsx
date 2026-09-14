import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAcademicSystemsSummary,
  updateAcademicScope,
} from "../api/services";
import "./PortalSurface.css";

function valueOf(response) {
  return response?.data || response || {};
}

function formatCount(value, label) {
  const count = Number(value || 0);
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

export default function AcademicSystemsDashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [scopeForm, setScopeForm] = useState({ sessionId: "", termId: "" });

  const sessions = useMemo(() => summary?.sessions || summary?.academicSessions || [], [summary]);
  const terms = useMemo(() => summary?.terms || [], [summary]);
  const visibleTerms = useMemo(() => {
    const sessionId = scopeForm.sessionId || summary?.activeSession?.id || "";
    return terms.filter((term) => String(term.sessionId) === String(sessionId));
  }, [terms, scopeForm.sessionId, summary]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = valueOf(await getAcademicSystemsSummary());
      setSummary(payload);
      setScopeForm({
        sessionId: payload?.activeSession?.id || "",
        termId: payload?.activeTerm?.id || "",
      });
    } catch (err) {
      setError(err?.response?.data?.message || "Academic systems could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleScopeSave = async (event) => {
    event.preventDefault();
    if (!scopeForm.sessionId || !scopeForm.termId) {
      setError("Select both academic session and term before saving.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateAcademicScope(scopeForm);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "The active academic scope could not be updated.");
    } finally {
      setSaving(false);
    }
  };

  const activeClasses = summary?.activeClasses || [];
  const earlyYears = activeClasses.filter((item) => item.academicSystem === "BRITISH_EYFS");
  const nigerian = activeClasses.filter((item) => item.academicSystem === "NIGERIAN_AMES");

  return (
    <div className="portal-surface-page academic-systems-page">
      <div className="portal-surface-shell">
        <section className="portal-surface-hero">
          <div className="portal-surface-hero-copy">
            <div className="portal-surface-kicker">Academic Systems</div>
            <h1 className="portal-surface-title">Central academic architecture</h1>
            <p className="portal-surface-subtitle">
              Manage the approved AMES class structure, active academic scope, and Early Years/Nigerian academic boundaries from one place.
            </p>
          </div>
          <div className="portal-surface-actions">
            <Link className="portal-surface-action secondary" to="/portal">Portal Home</Link>
            <button className="portal-surface-action primary" type="button" onClick={load} disabled={loading}>
              {loading ? "Refreshing" : "Refresh"}
            </button>
          </div>
        </section>

        {error ? <div className="portal-surface-empty academic-alert">{error}</div> : null}

        <section className="academic-scope-panel">
          <div>
            <div className="portal-surface-kicker">Active Scope</div>
            <h2 className="portal-surface-featured-title">
              {summary?.activeSession?.sessionName || "No session selected"} / {summary?.activeTerm?.termName || "No term selected"}
            </h2>
            <p className="portal-surface-subtitle">
              This scope is shared by finance, LMS, admissions mirrors, reports, and other academic modules that depend on the current session and term.
            </p>
          </div>

          <form className="academic-scope-form" onSubmit={handleScopeSave}>
            <select
              value={scopeForm.sessionId}
              onChange={(event) => setScopeForm((prev) => ({ ...prev, sessionId: event.target.value, termId: "" }))}
              aria-label="Academic session"
            >
              <option value="">Select session</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>{session.sessionName}</option>
              ))}
            </select>
            <select
              value={scopeForm.termId}
              onChange={(event) => setScopeForm((prev) => ({ ...prev, termId: event.target.value }))}
              aria-label="Academic term"
            >
              <option value="">Select term</option>
              {visibleTerms.map((term) => (
                <option key={term.id} value={term.id}>{term.termName}</option>
              ))}
            </select>
            <button type="submit" disabled={saving}>{saving ? "Saving" : "Save Scope"}</button>
          </form>
        </section>

        <section className="academic-system-grid">
          {(summary?.systems || []).map((system) => (
            <article className="academic-system-card" key={system.code}>
              <div className="portal-surface-kicker">{system.code}</div>
              <h2>{system.name}</h2>
              <p>{system.description}</p>
              <div className="academic-system-facts">
                <span>{system.curriculumFramework}</span>
                <span>{system.assessmentFramework}</span>
                <span>{system.reportFramework}</span>
              </div>
              <div className="academic-system-counts">
                <strong>{formatCount(system.activeClassCount, "class")}</strong>
                <strong>{formatCount(system.studentCount, "student")}</strong>
              </div>
              <a className="academic-config-link" href="#academic-class-structure">View Configuration</a>
            </article>
          ))}
        </section>

        <section className="academic-class-panel" id="academic-class-structure">
          <div className="academic-panel-heading">
            <div>
              <div className="portal-surface-kicker">Approved Current Classes</div>
              <h2>Active AMES class structure</h2>
            </div>
          </div>
          {loading ? (
            <div className="portal-surface-empty">Loading academic class structure...</div>
          ) : (
            <div className="academic-class-columns">
              <div>
                <h3>Early Years / British EYFS</h3>
                {earlyYears.map((item) => (
                  <div className="academic-class-row" key={item.id}>
                    <strong>{item.name}</strong>
                    <span>{item.curriculumFramework} / {item.assessmentFramework}</span>
                  </div>
                ))}
              </div>
              <div>
                <h3>Main School / Nigerian</h3>
                {nigerian.map((item) => (
                  <div className="academic-class-row" key={item.id}>
                    <strong>{item.name}</strong>
                    <span>{item.section} / {item.assessmentFramework}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="academic-class-panel">
          <div className="academic-panel-heading">
            <div>
              <div className="portal-surface-kicker">Legacy Protection</div>
              <h2>Historical class mappings</h2>
            </div>
          </div>
          <div className="academic-legacy-table">
            <div className="academic-legacy-head">
              <span>Legacy Class</span>
              <span>Status</span>
              <span>Target</span>
              <span>References</span>
            </div>
            {(summary?.legacyClasses || []).map((item) => {
              const refs = item.referenceCounts || {};
              return (
                <div className="academic-legacy-row" key={item.id}>
                  <strong>{item.name}</strong>
                  <span>{item.legacyStatus || "historical"}</span>
                  <span>{item.legacyTargetClassName || "Admin review required"}</span>
                  <span>{formatCount(refs.students, "student")}, {formatCount(refs.financeFees, "fee row")}, {formatCount(refs.invoices, "invoice")}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
