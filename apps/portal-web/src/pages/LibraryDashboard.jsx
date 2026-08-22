import { useEffect, useMemo, useState } from "react";
import { addBook, getBooks } from "../api/services";
import { useAuth } from "../auth/AuthContext";
import "./PortalAdminModule.css";

const FALLBACK_STRUCTURE = [
  { section: "Early Years Library", subcategories: ["Creche", "Nursery 1", "Nursery 2", "Reception"] },
  { section: "Basic School Library", subcategories: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6"] },
  { section: "Junior Secondary Library", subcategories: ["JSS1", "JSS2", "JSS3"] },
  { section: "Senior Secondary Library", subcategories: ["SS1", "SS2", "SS3"] },
  { section: "Video Learning", subcategories: [] },
  { section: "Digital Books", subcategories: [] },
  { section: "Past Questions", subcategories: [] },
  { section: "Teacher Resources", subcategories: [] },
  { section: "Research & Reference", subcategories: [] },
];

const RESOURCE_TYPES = ["Ebook", "Video", "Past Question", "Teacher Resource", "Reference", "Curriculum"];

function normalizeResource(item) {
  return {
    id: item?.id || `${item?.section || ""}-${item?.title || item?.name || ""}`,
    title: String(item?.title || item?.name || "").trim(),
    section: String(item?.section || "Digital Books").trim() || "Digital Books",
    subcategory: String(item?.subcategory || "").trim(),
    type: String(item?.type || "Ebook").trim() || "Ebook",
    description: String(item?.description || "").trim(),
    url: String(item?.url || "").trim(),
    createdAt: String(item?.createdAt || ""),
  };
}

export default function LibraryDashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [structure, setStructure] = useState(FALLBACK_STRUCTURE);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [section, setSection] = useState(FALLBACK_STRUCTURE[0].section);
  const [subcategory, setSubcategory] = useState("");
  const [type, setType] = useState(RESOURCE_TYPES[0]);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");

  const selectedSection = useMemo(
    () => structure.find((item) => item.section === section) || structure[0],
    [structure, section]
  );

  const groupedResources = useMemo(() => {
    const map = new Map();
    for (const item of resources) {
      const key = `${item.section}__${item.subcategory || "__general"}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return map;
  }, [resources]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await getBooks();
      const payload = res?.data;

      if (Array.isArray(payload)) {
        setStructure(FALLBACK_STRUCTURE);
        setResources(payload.map(normalizeResource));
      } else {
        setStructure(Array.isArray(payload?.structure) ? payload.structure : FALLBACK_STRUCTURE);
        setResources(Array.isArray(payload?.resources) ? payload.resources.map(normalizeResource) : []);
      }

      setError("");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load E-library resources");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selectedSection) return;
    if (!selectedSection.subcategories?.length) {
      setSubcategory("");
      return;
    }
    if (!selectedSection.subcategories.includes(subcategory)) {
      setSubcategory(selectedSection.subcategories[0]);
    }
  }, [selectedSection, subcategory]);

  const createResource = async () => {
    if (!isAdmin) return;
    if (!title.trim()) return;

    try {
      setLoading(true);
      await addBook({
        title: title.trim(),
        section,
        subcategory: selectedSection?.subcategories?.length ? subcategory : "",
        type,
        url: url.trim(),
        description: description.trim(),
      });

      setTitle("");
      setUrl("");
      setDescription("");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to add resource");
      setLoading(false);
    }
  };

  return (
    <div className="admin-module-page library-module">
      <div className="admin-module-shell">
        <section className="admin-module-hero">
          <div>
            <div className="admin-module-kicker">Digital Learning</div>
            <h1>E-Library</h1>
            <p>Browse books, lesson materials, digital references, and shared learning resources organised for Angel Montessori classes and school-wide use.</p>
          </div>
          <div className="admin-module-actions">
            <button type="button" onClick={load} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh Library"}
            </button>
          </div>
        </section>

        {error ? <div className="admin-alert error">{error}</div> : null}
        {loading ? <div className="admin-alert">Loading E-library resources...</div> : null}

        <section className="admin-stat-grid" aria-label="Library overview">
          <article className="admin-stat-card"><span>Learning Sections</span><strong>{structure.length}</strong><small>Library areas available</small></article>
          <article className="admin-stat-card"><span>Total Resources</span><strong>{resources.length}</strong><small>Digital entries currently saved</small></article>
          <article className="admin-stat-card"><span>Resource Types</span><strong>{RESOURCE_TYPES.length}</strong><small>Books, videos, references and more</small></article>
          <article className="admin-stat-card"><span>Admin Access</span><strong>{isAdmin ? "Yes" : "No"}</strong><small>{isAdmin ? "You can add resources" : "Viewing mode only"}</small></article>
        </section>

        <section className="admin-two-column">
          <article className="admin-card">
            <div className="admin-card-header">
              <div>
                <span className="admin-section-tag">Structure</span>
                <h2>Learning Sections</h2>
              </div>
              <p>Resources are grouped by school level, digital format, and teacher support category.</p>
            </div>

            <div className="library-section-list">
              {structure.map((item) => (
                <article key={item.section} className="library-section-chip">
                  <strong>{item.section}</strong>
                  {item.subcategories?.length ? (
                    <span>{item.subcategories.join(", ")}</span>
                  ) : (
                    <span>General resources</span>
                  )}
                </article>
              ))}
            </div>
          </article>

          {isAdmin ? (
            <article className="admin-card">
              <div className="admin-card-header">
                <div>
                  <span className="admin-section-tag">Catalogue</span>
                  <h2>Add Learning Resource</h2>
                </div>
                <p>Add books, videos, past questions, teacher resources, and reference links.</p>
              </div>

              <div className="admin-form-grid">
                <label className="admin-field admin-form-span">
                  Resource Title
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Resource title" />
                </label>

                <label className="admin-field">
                  Section
                  <select value={section} onChange={(e) => setSection(e.target.value)}>
                    {structure.map((item) => (
                      <option key={item.section} value={item.section}>{item.section}</option>
                    ))}
                  </select>
                </label>

                {selectedSection?.subcategories?.length ? (
                  <label className="admin-field">
                    Subcategory
                    <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
                      {selectedSection.subcategories.map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <label className="admin-field">
                  Resource Type
                  <select value={type} onChange={(e) => setType(e.target.value)}>
                    {RESOURCE_TYPES.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label className="admin-field admin-form-span">
                  Resource URL
                  <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Resource URL (optional)" />
                </label>

                <label className="admin-field admin-form-span">
                  Description
                  <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
                </label>
              </div>

              <div className="admin-form-actions">
                <button type="button" onClick={createResource} disabled={loading || !title.trim()}>Add Resource</button>
                <button type="button" className="secondary" onClick={load} disabled={loading}>{loading ? "Loading..." : "Refresh"}</button>
              </div>
            </article>
          ) : (
            <article className="admin-card">
              <div className="admin-card-header">
                <div>
                  <span className="admin-section-tag">Access</span>
                  <h2>Resource Access</h2>
                </div>
                <p>Browse materials by class and resource type below. Adding new library resources is restricted to school admin accounts.</p>
              </div>
              <div className="admin-form-actions">
                <button type="button" onClick={load} disabled={loading}>{loading ? "Loading..." : "Refresh"}</button>
              </div>
            </article>
          )}
        </section>

        <section className="admin-card">
          <div className="admin-card-header">
            <div>
              <span className="admin-section-tag">Catalogue</span>
              <h2>Library Resources</h2>
            </div>
            <p>Open linked resources directly, or review saved local catalogue entries.</p>
          </div>

          <div className="library-catalogue">
            {structure.map((item) => {
              const generalKey = `${item.section}____general`;
              const generalItems = groupedResources.get(generalKey) || [];

              return (
                <article key={item.section} className="library-category-card">
                  <div className="library-category-head">
                    <h3>{item.section}</h3>
                    <span>{item.subcategories?.length ? `${item.subcategories.length} groups` : `${generalItems.length} resources`}</span>
                  </div>

                  {item.subcategories?.length ? (
                    <div className="library-subcategory-grid">
                      {item.subcategories.map((sub) => {
                        const key = `${item.section}__${sub}`;
                        const subItems = groupedResources.get(key) || [];
                        return (
                          <section key={sub} className="library-subcategory-card">
                            <strong>{sub}</strong>
                            {subItems.length === 0 ? <p>No resources added yet.</p> : null}
                            {subItems.map((resource) => (
                              <div key={resource.id} className="library-resource-item">
                                <strong>{resource.title}</strong>
                                <span>{resource.type}</span>
                                {resource.description ? <p>{resource.description}</p> : null}
                                {resource.url ? (
                                  <a href={resource.url} target="_blank" rel="noreferrer">Open Resource</a>
                                ) : (
                                  <em>Saved local resource entry</em>
                                )}
                              </div>
                            ))}
                          </section>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="library-subcategory-card">
                      {generalItems.length === 0 ? <p>No resources added yet.</p> : null}
                      {generalItems.map((resource) => (
                        <div key={resource.id} className="library-resource-item">
                          <strong>{resource.title}</strong>
                          <span>{resource.type}</span>
                          {resource.description ? <p>{resource.description}</p> : null}
                          {resource.url ? (
                            <a href={resource.url} target="_blank" rel="noreferrer">Open Resource</a>
                          ) : (
                            <em>Saved local resource entry</em>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

