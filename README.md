# Pest Classifier Demo Client

This optional React application demonstrates two deployment patterns using the same trained classifier:

- **API:** uploads the image to the independently deployed FastAPI model service.
- **On-device:** runs the optimized TFLite model directly in the browser with LiteRT.js and WASM.

Use the mode switch to compare end-to-end prediction times. The first on-device run includes downloading and compiling the runtime and model; later predictions reuse the loaded model and are faster.

## Run locally

Create `.env` from `.env.example` and point it to either the local or deployed API:

```text
VITE_API_URL=http://localhost:8000
```

Then run:

```powershell
npm install
npm run dev
```

## Use the deployed API

Change the environment variable to the Render API URL and rebuild:

```text
VITE_API_URL=https://pest-classifier-api.onrender.com
```

The browser uploads images directly to that API. This frontend can be replaced by a mobile app, another website, a script, or another backend without changing the model service.

## On-device assets

The browser mode is self-contained and does not call `/predict`:

```text
public/model.tflite
public/litert-wasm/
```

The model has a fixed `[1, 224, 224, 3]` float input and retains the original model's internal resize/rescaling behavior. Its 12 outputs use the same class order as the API.

## Docker

```powershell
docker compose up --build
```

Open `http://localhost:3000`.