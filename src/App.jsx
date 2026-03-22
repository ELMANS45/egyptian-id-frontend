import { useState, useRef } from "react";
import "./App.css";

const API_URL = "https://elmans45-egyptian-id-backend.hf.space";

export default function App() {
  const [frontFile, setFrontFile]   = useState(null);
  const [backFile, setBackFile]     = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview]   = useState(null);
  const [result, setResult]         = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  const frontRef = useRef();
  const backRef  = useRef();

  function handleFile(e, side) {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (side === "front") { setFrontFile(file); setFrontPreview(url); }
    else                  { setBackFile(file);  setBackPreview(url);  }
  }

  async function handleSubmit() {
    if (!frontFile || !backFile) {
      setError("Please upload both front and back images.");
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);

    const form = new FormData();
    form.append("front", frontFile);
    form.append("back",  backFile);

    try {
      const res  = await fetch(`${API_URL}/process`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Server error");
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFrontFile(null); setBackFile(null);
    setFrontPreview(null); setBackPreview(null);
    setResult(null); setError(null);
  }

  const fields = result?.fields || {};

  const FIELD_LABELS = {
    national_id:       "National ID",
    date_of_birth:     "Date of Birth",
    age:               "Age",
    gender:            "Gender",
    birth_governorate: "Governorate",
    first_name:        "First Name",
    last_name:         "Last Name",
    address:           "Address",
    religion:          "Religion",
    marital_status:    "Marital Status",
    profession:        "Profession",
    serial:            "Serial Number",
  };

  const FIELD_ORDER = Object.keys(FIELD_LABELS);

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <span className="logo-mark">🪪</span>
          <div>
            <h1>Egyptian ID Reader</h1>
            <p>Upload front &amp; back — get all fields instantly</p>
          </div>
        </div>
      </header>

      <main className="main">
        {!result ? (
          <>
            {/* Upload Area */}
            <div className="upload-grid">
              {[
                { side: "front", label: "Front Side", ref: frontRef, preview: frontPreview, file: frontFile },
                { side: "back",  label: "Back Side",  ref: backRef,  preview: backPreview,  file: backFile  },
              ].map(({ side, label, ref, preview, file }) => (
                <div
                  key={side}
                  className={`upload-card ${preview ? "has-preview" : ""}`}
                  onClick={() => ref.current.click()}
                >
                  <input
                    ref={ref}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => handleFile(e, side)}
                  />
                  {preview ? (
                    <>
                      <img src={preview} alt={label} className="preview-img" />
                      <div className="preview-badge">✓ {file.name}</div>
                    </>
                  ) : (
                    <div className="upload-placeholder">
                      <span className="upload-icon">{side === "front" ? "📤" : "📤"}</span>
                      <span className="upload-label">{label}</span>
                      <span className="upload-hint">Click to upload</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {error && <div className="error-box">⚠️ {error}</div>}

            <button
              className={`submit-btn ${loading ? "loading" : ""}`}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <><span className="spinner" /> Processing…</>
              ) : (
                "Extract ID Information →"
              )}
            </button>
          </>
        ) : (
          <>
            {/* Results */}
            <div className="results-grid">
              {/* Face */}
              <div className="face-card">
                {result.face_image ? (
                  <img
                    src={`data:image/jpeg;base64,${result.face_image}`}
                    alt="ID Face"
                    className="face-img"
                  />
                ) : (
                  <div className="no-face">No face detected</div>
                )}
                <p className="face-label">ID Photo</p>
              </div>

              {/* Fields */}
              <div className="fields-card">
                <h2>Extracted Information</h2>
                <div className="fields-list">
                  {FIELD_ORDER.filter(k => fields[k] !== undefined).map(key => (
                    <div className="field-row" key={key}>
                      <span className="field-label">{FIELD_LABELS[key]}</span>
                      <span className="field-value">{String(fields[key])}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="stats-bar">
              <span>Front rotation: {result.stats.front_rotation}°</span>
              <span>Back rotation: {result.stats.back_rotation}°</span>
              <span>Back tilt: {result.stats.back_tilt}°</span>
              <span>ID: {result.stats.detected_id || "—"}</span>
            </div>

            <button className="reset-btn" onClick={reset}>← Scan Another Card</button>
          </>
        )}
      </main>
    </div>
  );
}
