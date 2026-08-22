import { useEffect, useMemo, useState } from "react";
import { addBook, getBooks } from "../api/services";
import { useAuth } from "../auth/AuthContext";

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
    <div style={{ padding: 20 }}>
      <h2>E-Library</h2>
      <p style={{ color: "#475569", marginTop: 0 }}>Browse books, lesson materials, digital references, and shared learning resources organised for Angel Montessori classes and school-wide use.</p>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 12, marginBottom: 14 }}>
        <div style={{ border: "1px solid #d7e3f2", borderRadius: 10, padding: 12, background: "#fff" }}>
          <h3 style={{ marginTop: 0 }}>Learning Sections</h3>
          {structure.map((item) => (
            <div key={item.section} style={{ marginBottom: 8 }}>
              <strong>{item.section}</strong>
              {item.subcategories?.length ? (
                <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                  {item.subcategories.map((sub) => (
                    <li key={sub}>{sub}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: "6px 0 0", color: "#64748b" }}>General resources</p>
              )}
            </div>
          ))}
        </div>

        {isAdmin ? (
          <div style={{ border: "1px solid #d7e3f2", borderRadius: 10, padding: 12, background: "#fff" }}>
            <h3 style={{ marginTop: 0 }}>Add Learning Resource</h3>
            <div style={{ display: "grid", gap: 8 }}>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Resource title" />

              <select value={section} onChange={(e) => setSection(e.target.value)}>
                {structure.map((item) => (
                  <option key={item.section} value={item.section}>{item.section}</option>
                ))}
              </select>

              {selectedSection?.subcategories?.length ? (
                <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
                  {selectedSection.subcategories.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              ) : null}

              <select value={type} onChange={(e) => setType(e.target.value)}>
                {RESOURCE_TYPES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>

              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Resource URL (optional)" />
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
              />

              <div>
                <button onClick={createResource} disabled={loading || !title.trim()}>
                  Add Resource
                </button>
                <button onClick={load} disabled={loading} style={{ marginLeft: 8 }}>
                  {loading ? "Loading..." : "Refresh"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ border: "1px solid #d7e3f2", borderRadius: 10, padding: 12, background: "#fff" }}>
            <h3 style={{ marginTop: 0 }}>Resource Access</h3>
            <p style={{ margin: 0, color: "#475569" }}>
              Browse materials by class and resource type below. Adding new library resources is restricted to school admin accounts.
            </p>
            <button onClick={load} disabled={loading} style={{ marginTop: 8 }}>
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {structure.map((item) => {
          const generalKey = `${item.section}____general`;
          const generalItems = groupedResources.get(generalKey) || [];

          return (
            <div key={item.section} style={{ border: "1px solid #d7e3f2", borderRadius: 10, padding: 12, background: "#fff" }}>
              <h3 style={{ marginTop: 0 }}>{item.section}</h3>

              {item.subcategories?.length ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {item.subcategories.map((sub) => {
                    const key = `${item.section}__${sub}`;
                    const subItems = groupedResources.get(key) || [];
                    return (
                      <div key={sub} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 10, background: "#f8fafc" }}>
                        <strong>{sub}</strong>
                        {subItems.length === 0 ? <p style={{ margin: "6px 0 0" }}>No resources added yet.</p> : null}
                        {subItems.map((resource) => (
                          <div key={resource.id} style={{ marginTop: 8 }}>
                            <strong>{resource.title}</strong>
                            <p style={{ margin: "3px 0", color: "#334155" }}>{resource.type}</p>
                            {resource.description ? <p style={{ margin: "3px 0" }}>{resource.description}</p> : null}
                            {resource.url ? (
                              <a href={resource.url} target="_blank" rel="noreferrer">
                                Open Resource
                              </a>
                            ) : (
                              <p style={{ margin: "3px 0", color: "#64748b" }}>Saved local resource entry</p>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div>
                  {generalItems.length === 0 ? <p>No resources added yet.</p> : null}
                  {generalItems.map((resource) => (
                    <div key={resource.id} style={{ borderTop: "1px dashed #d7e3f2", paddingTop: 8, marginTop: 8 }}>
                      <strong>{resource.title}</strong>
                      <p style={{ margin: "3px 0", color: "#334155" }}>{resource.type}</p>
                      {resource.description ? <p style={{ margin: "3px 0" }}>{resource.description}</p> : null}
                      {resource.url ? (
                        <a href={resource.url} target="_blank" rel="noreferrer">
                          Open Resource
                        </a>
                      ) : (
                        <p style={{ margin: "3px 0", color: "#64748b" }}>Saved local resource entry</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

