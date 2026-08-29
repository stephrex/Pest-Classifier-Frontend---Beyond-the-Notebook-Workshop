import { useEffect, useMemo, useState } from 'react';
import { predictOnDevice } from './onDeviceInference';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(
  /\/$/,
  ''
);

function formatPercent(value) {
  return `${(value * 100).toFixed(2)}%`;
}

export default function App() {
  const [mode, setMode] = useState('api');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [timings, setTimings] = useState({ api: null, onDevice: null });

  const topEntries = useMemo(() => {
    if (!result?.top_k) return [];
    return Object.entries(result.top_k);
  }, [result]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0];
    setError('');
    setResult(null);

    if (!selected) {
      setFile(null);
      setPreviewUrl('');
      return;
    }

    if (!selected.type.startsWith('image/')) {
      setError('Please upload an image file (jpg, png, etc).');
      setFile(null);
      setPreviewUrl('');
      return;
    }

    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setResult(null);

    if (!file) {
      setError('Please select an image before prediction.');
      return;
    }

    try {
      setLoading(true);
      const startedAt = performance.now();
      let payload;

      if (mode === 'onDevice') {
        payload = await predictOnDevice(file);
      } else {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${API_URL}/predict`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const responseBody = await response.json().catch(() => ({}));
          throw new Error(responseBody.detail || 'Prediction request failed.');
        }

        payload = await response.json();
      }

      const elapsedMs = performance.now() - startedAt;
      setResult(payload);
      setTimings((current) => ({ ...current, [mode]: elapsedMs }));
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrap">
      <div className="grain" />
      <main className="container">
        <header className="hero">
          <p className="eyebrow">Model to API Workshop</p>
          <h1>Pest Classifier Live Demo</h1>
          <p>
            Upload a crop image and compare cloud API inference with prediction
            performed directly in your browser.
          </p>
        </header>

        <section className="card uploader-card">
          <form onSubmit={handleSubmit}>
            <div className="mode-control" aria-label="Inference mode">
              <button
                type="button"
                className={mode === 'api' ? 'mode-option active' : 'mode-option'}
                aria-pressed={mode === 'api'}
                onClick={() => {
                  setMode('api');
                  setResult(null);
                  setError('');
                }}
              >
                API
              </button>
              <button
                type="button"
                className={
                  mode === 'onDevice' ? 'mode-option active' : 'mode-option'
                }
                aria-pressed={mode === 'onDevice'}
                onClick={() => {
                  setMode('onDevice');
                  setResult(null);
                  setError('');
                }}
              >
                On-device
              </button>
            </div>

            <label htmlFor="image" className="upload-input-label">
              Choose an image
            </label>
            <input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />

            <button type="submit" disabled={loading}>
              {loading
                ? 'Running Prediction...'
                : `Predict with ${mode === 'api' ? 'API' : 'On-device'}`}
            </button>
          </form>

          {previewUrl && (
            <div className="preview-wrap">
              <img src={previewUrl} alt="Uploaded preview" className="preview" />
            </div>
          )}

          {error && <p className="error">{error}</p>}
        </section>

        {result && (
          <section className="card results-card">
            <h2>Prediction Result</h2>
            <p className="lead">
              <strong>{result.prediction}</strong> with confidence{' '}
              <strong>{formatPercent(result.confidence)}</strong>
            </p>
            <p className="result-meta">
              {mode === 'api' ? 'API round trip' : 'On-device inference'}:{' '}
              <strong>{timings[mode]?.toFixed(0)} ms</strong>
            </p>

            <div className="topk">
              {topEntries.map(([label, score]) => (
                <div key={label} className="topk-row">
                  <span>{label}</span>
                  <span>{formatPercent(score)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {(timings.api !== null || timings.onDevice !== null) && (
          <section className="timing-band" aria-label="Last prediction times">
            <span>Last prediction</span>
            <strong>
              API {timings.api === null ? '—' : `${timings.api.toFixed(0)} ms`}
            </strong>
            <strong>
              On-device{' '}
              {timings.onDevice === null
                ? '—'
                : `${timings.onDevice.toFixed(0)} ms`}
            </strong>
          </section>
        )}

        {result?.wikipedia_summary && (
          <section className="card wiki-card">
            <h2>About {result.wikipedia_title || result.prediction}</h2>
            <p>{result.wikipedia_summary}</p>
            {result.wikipedia_url && (
              <a href={result.wikipedia_url} target="_blank" rel="noreferrer">
                Read full article on Wikipedia
              </a>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
