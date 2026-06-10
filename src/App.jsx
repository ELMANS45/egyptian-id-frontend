import { useState, useRef, useEffect } from "react";
import "./App.css";

const API_URL = "https://elmans45-egyptian-id-backend.hf.space";

function checkMobile() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0 ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

const FIELD_LABELS = {
  national_id: "National ID", date_of_birth: "Date of Birth", age: "Age",
  gender: "Gender", birth_governorate: "Governorate", first_name: "First Name",
  last_name: "Last Name", address: "Address", religion: "Religion",
  marital_status: "Marital Status", profession: "Profession", serial: "Serial Number",
};
const FIELD_ORDER = Object.keys(FIELD_LABELS);

// ─── STEP 1: Upload ───────────────────────────────────────────────────────────
function StepUpload({ onDone }) {
  const mobile = checkMobile();
  const [frontFile, setFrontFile]     = useState(null);
  const [backFile, setBackFile]       = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview]   = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);

  const frontUploadRef = useRef();
  const backUploadRef  = useRef();
  const frontCamRef    = useRef();
  const backCamRef     = useRef();

  function handleFile(e, side) {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (side === "front") { setFrontFile(file); setFrontPreview(url); }
    else                  { setBackFile(file);  setBackPreview(url);  }
  }

  async function handleSubmit() {
    if (!frontFile || !backFile) { setError("Please provide both front and back images."); return; }
    setError(null);
    setLoading(true);
    const form = new FormData();
    form.append("front", frontFile);
    form.append("back",  backFile);
    try {
      const res  = await fetch(`${API_URL}/process`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Server error");
      if (!data.success) throw new Error("Processing failed");
      onDone(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const sides = [
    { side: "front", label: "Front Side", uploadRef: frontUploadRef, camRef: frontCamRef, preview: frontPreview },
    { side: "back",  label: "Back Side",  uploadRef: backUploadRef,  camRef: backCamRef,  preview: backPreview  },
  ];

  return (
    <div className="step">
      <div className="step-header">
        <span className="step-num">1</span>
        <h2>Upload ID Card</h2>
      </div>

      <div className="upload-grid">
        {sides.map(({ side, label, uploadRef, camRef, preview }) => (
          <div key={side} className={`upload-card ${preview ? "has-preview" : ""}`}>
            <input ref={uploadRef} type="file" accept="image/*"
              style={{ display: "none" }} onChange={(e) => handleFile(e, side)} />
            {mobile && (
              <input ref={camRef} type="file" accept="image/*" capture="environment"
                style={{ display: "none" }} onChange={(e) => handleFile(e, side)} />
            )}
            {preview ? (
              <>
                <img src={preview} alt={label} className="preview-img" />
                <div className="preview-overlay">
                  <button className="reshot-btn" onClick={() => uploadRef.current.click()}>📁 Change</button>
                  {mobile && <button className="reshot-btn" onClick={() => camRef.current.click()}>📷 Retake</button>}
                </div>
                <div className="preview-badge">✓ {label} ready</div>
              </>
            ) : (
              <div className="upload-placeholder">
                <span className="upload-icon">🪪</span>
                <span className="upload-label">{label}</span>
                <div className="upload-options">
                  <button className="opt-btn" onClick={() => uploadRef.current.click()}>📁 Upload</button>
                  {mobile && <button className="opt-btn" onClick={() => camRef.current.click()}>📷 Camera</button>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {error && <div className="error-box">⚠️ {error}</div>}

      <button className={`submit-btn ${loading ? "loading" : ""}`} onClick={handleSubmit} disabled={loading}>
        {loading ? <><span className="spinner" /> Processing ID…</> : "Extract Information →"}
      </button>
    </div>
  );
}

// ─── STEP 2: Review & Confirm ─────────────────────────────────────────────────
function StepReview({ data, onConfirm, onRetry }) {
  const [fields, setFields] = useState({ ...data.fields });
  const [editing, setEditing] = useState(null);

  function handleChange(key, val) {
    setFields(f => ({ ...f, [key]: val }));
  }

  const missing = FIELD_ORDER.filter(k => !fields[k]);

  return (
    <div className="step">
      <div className="step-header">
        <span className="step-num">2</span>
        <h2>Review Information</h2>
      </div>

      <p className="step-hint">Please verify the extracted information is correct. You can edit any field by clicking on it.</p>

      {missing.length > 0 && (
        <div className="warn-box">
          ⚠️ Could not extract: {missing.map(k => FIELD_LABELS[k]).join(", ")}. You can fill them in manually or retry.
        </div>
      )}

      <div className="review-grid">
        {/* Face */}
        <div className="face-card">
          {data.face_image
            ? <img src={`data:image/jpeg;base64,${data.face_image}`} alt="ID Face" className="face-img" />
            : <div className="no-face">No face detected</div>}
          <p className="face-label">ID Photo</p>
        </div>

        {/* Fields */}
        <div className="fields-card">
          <div className="fields-list">
            {FIELD_ORDER.map(key => (
              <div className="field-row" key={key}>
                <span className="field-label">{FIELD_LABELS[key]}</span>
                {editing === key ? (
                  <input
                    className="field-input"
                    value={fields[key] || ""}
                    onChange={e => handleChange(key, e.target.value)}
                    onBlur={() => setEditing(null)}
                    autoFocus
                  />
                ) : (
                  <span
                    className={`field-value editable ${!fields[key] ? "empty" : ""}`}
                    onClick={() => setEditing(key)}
                  >
                    {fields[key] || "— tap to fill —"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="action-row">
        <button className="retry-btn" onClick={onRetry}>← Scan Again</button>
        <button className="confirm-btn" onClick={() => onConfirm(fields, data.face_image)}>
          Information is Correct →
        </button>
      </div>
    </div>
  );
}

// ─── STEP 3: Face Match ───────────────────────────────────────────────────────
function StepFaceMatch({ fields, idFaceB64, onDone, onRetry }) {
  const mobile = checkMobile();

  const [selfieFile, setSelfieFile]     = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);

  // Webcam (desktop)
  const [camOpen, setCamOpen]   = useState(false);
  const [camReady, setCamReady] = useState(false);
  const videoRef  = useRef();
  const streamRef = useRef();

  const selfieUploadRef = useRef();
  const selfieCamRef    = useRef();

  function handleSelfieFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setSelfieFile(file);
    setSelfiePreview(URL.createObjectURL(file));
  }

  async function openWebcam() {
    setCamOpen(true);
    setCamReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
      streamRef.current = stream;
    } catch {
      setCamOpen(false);
      setError("Camera access denied.");
    }
  }

  useEffect(() => {
    if (camOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      setCamReady(true);
    }
  }, [camOpen]);

  function closeWebcam() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCamOpen(false);
    setCamReady(false);
  }

  function captureWebcam() {
    const video  = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
      setSelfieFile(file);
      setSelfiePreview(URL.createObjectURL(blob));
      closeWebcam();
    }, "image/jpeg", 0.95);
  }

  async function handleMatch() {
    if (!selfieFile) { setError("Please take or upload a selfie first."); return; }
    setError(null);
    setLoading(true);

    // Convert base64 id face back to file
    const idFaceBlob = await fetch(`data:image/jpeg;base64,${idFaceB64}`).then(r => r.blob());
    const idFaceFile = new File([idFaceBlob], "id_face.jpg", { type: "image/jpeg" });

    const form = new FormData();
    form.append("selfie",  selfieFile);
    form.append("id_face", idFaceFile);

    try {
      const res  = await fetch(`${API_URL}/verify-face`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Server error");
      onDone(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="step">
      <div className="step-header">
        <span className="step-num">3</span>
        <h2>Face Verification</h2>
      </div>

      <p className="step-hint">
        {mobile ? "Take a selfie to verify your identity." : "Use your webcam or upload a photo to verify your identity."}
      </p>

      <div className="selfie-area">
        {/* ID face reference */}
        <div className="face-ref">
          <img src={`data:image/jpeg;base64,${idFaceB64}`} alt="ID Face" className="face-ref-img" />
          <p className="face-label">ID Photo</p>
        </div>

        <div className="vs-divider">VS</div>

        {/* Selfie */}
        <div className="face-ref">
          {selfiePreview
            ? <img src={selfiePreview} alt="Selfie" className="face-ref-img" />
            : <div className="selfie-placeholder">📷</div>}
          <p className="face-label">Your Selfie</p>
        </div>
      </div>

      {/* Inputs */}
      <input ref={selfieUploadRef} type="file" accept="image/*"
        style={{ display: "none" }} onChange={handleSelfieFile} />
      {mobile && (
        <input ref={selfieCamRef} type="file" accept="image/*" capture="user"
          style={{ display: "none" }} onChange={handleSelfieFile} />
      )}

      <div className="selfie-btns">
        {mobile ? (
          <>
            <button className="opt-btn" onClick={() => selfieCamRef.current.click()}>📷 Take Selfie</button>
            <button className="opt-btn" onClick={() => selfieUploadRef.current.click()}>📁 Upload Photo</button>
          </>
        ) : (
          <>
            <button className="opt-btn" onClick={openWebcam}>📷 Use Webcam</button>
            <button className="opt-btn" onClick={() => selfieUploadRef.current.click()}>📁 Upload Photo</button>
          </>
        )}
      </div>

      {error && <div className="error-box">⚠️ {error}</div>}

      <div className="action-row">
        <button className="retry-btn" onClick={onRetry}>← Go Back</button>
        <button className={`submit-btn ${loading ? "loading" : ""}`} onClick={handleMatch} disabled={loading || !selfieFile}>
          {loading ? <><span className="spinner" /> Verifying…</> : "Verify Identity →"}
        </button>
      </div>

      {/* Webcam Modal - desktop */}
      {camOpen && (
        <div className="cam-overlay" onClick={closeWebcam}>
          <div className="cam-modal" onClick={e => e.stopPropagation()}>
            <div className="cam-header">
              <span>📷 Take Selfie</span>
              <button className="cam-close" onClick={closeWebcam}>✕</button>
            </div>
            <div className="cam-video-wrap">
              <video ref={videoRef} autoPlay playsInline className="cam-video"
                onLoadedMetadata={() => setCamReady(true)} />
              {!camReady && <div className="cam-loading">Starting camera…</div>}
            </div>
            <div className="cam-footer">
              <button className="capture-btn" onClick={captureWebcam} disabled={!camReady}>📸 Capture</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── STEP 4: Final Result ─────────────────────────────────────────────────────
function StepResult({ fields, matchData, idFaceB64, selfieB64, onReset }) {
  const matched = matchData.final_match;

  return (
    <div className="step">
      <div className="step-header">
        <span className="step-num">4</span>
        <h2>Verification Result</h2>
      </div>

      {/* Match banner */}
      <div className={`match-banner ${matched ? "match-yes" : "match-no"}`}>
        <span className="match-icon">{matched ? "✅" : "❌"}</span>
        <div>
          <div className="match-title">{matched ? "Identity Verified" : "Identity Not Matched"}</div>
          <div className="match-sub">Average similarity: {matchData.avg_similarity}%</div>
        </div>
      </div>

      {/* Face comparison */}
      <div className="selfie-area">
        <div className="face-ref">
          <img src={`data:image/jpeg;base64,${idFaceB64}`} alt="ID Face" className="face-ref-img" />
          <p className="face-label">ID Photo</p>
        </div>
        <div className="vs-divider">{matched ? "✓" : "✗"}</div>
        <div className="face-ref">
          {selfieB64
            ? <img src={selfieB64} alt="Selfie" className="face-ref-img" />
            : <div className="selfie-placeholder">📷</div>}
          <p className="face-label">Selfie</p>
        </div>
      </div>

      {/* Model details */}
      <div className="models-row">
        {matchData.models.map(m => (
          <div key={m.model} className={`model-card ${m.verified ? "model-yes" : "model-no"}`}>
            <div className="model-name">{m.model}</div>
            {m.error
              ? <div className="model-err">No face detected</div>
              : <>
                  <div className="model-sim">{m.similarity}%</div>
                  <div className="model-verdict">{m.verified ? "Match" : "No Match"}</div>
                </>}
          </div>
        ))}
      </div>

      {/* All fields */}
      <div className="fields-card" style={{ marginTop: 16 }}>
        <h2>ID Information</h2>
        <div className="fields-list">
          {FIELD_ORDER.filter(k => fields[k]).map(key => (
            <div className="field-row" key={key}>
              <span className="field-label">{FIELD_LABELS[key]}</span>
              <span className="field-value">{String(fields[key])}</span>
            </div>
          ))}
        </div>
      </div>

      <button className="reset-btn" onClick={onReset}>← Verify Another Person</button>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [step, setStep]         = useState(1);
  const [ocrData, setOcrData]   = useState(null);
  const [confirmedFields, setConfirmedFields] = useState(null);
  const [idFaceB64, setIdFaceB64] = useState(null);
  const [matchData, setMatchData] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);

  function handleOcrDone(data) {
    setOcrData(data);
    setStep(2);
  }

  function handleConfirm(fields, faceB64) {
    setConfirmedFields(fields);
    setIdFaceB64(faceB64);
    setStep(3);
  }

  function handleMatchDone(data, selfieUrl) {
    setMatchData(data);
    setSelfiePreview(selfieUrl);
    setStep(4);
  }

  function reset() {
    setStep(1); setOcrData(null);
    setConfirmedFields(null); setIdFaceB64(null);
    setMatchData(null); setSelfiePreview(null);
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <span className="logo-mark">🪪</span>
          <div>
            <h1>Egyptian ID Reader</h1>
            <p>OCR · Verify · Match</p>
          </div>
          <div className="step-pills">
            {[1,2,3,4].map(n => (
              <div key={n} className={`step-pill ${step === n ? "active" : ""} ${step > n ? "done" : ""}`}>{n}</div>
            ))}
          </div>
        </div>
      </header>

      <main className="main">
        {step === 1 && <StepUpload onDone={handleOcrDone} />}
        {step === 2 && <StepReview data={ocrData} onConfirm={handleConfirm} onRetry={() => setStep(1)} />}
        {step === 3 && (
          <StepFaceMatch
            fields={confirmedFields}
            idFaceB64={idFaceB64}
            onDone={(data) => handleMatchDone(data)}
            onRetry={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <StepResult
            fields={confirmedFields}
            matchData={matchData}
            idFaceB64={idFaceB64}
            selfieB64={selfiePreview}
            onReset={reset}
          />
        )}
      </main>
    </div>
  );
}
