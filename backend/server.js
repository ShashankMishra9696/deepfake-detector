// server.js - backend for Render (production-ready mock + integration points)
// Accepts multipart/form-data (field "image") or JSON { image_base64: "..." }
// Replace the mock inference section with calls to your real model (local GPU, remote API, etc.)

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bodyParser = require('body-parser');
const path = require('path');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const app = express();

// For security: Restrict CORS in production to your frontend origin(s) (set FRONTEND_ORIGIN env var)
// If FRONTEND_ORIGIN is not set, we allow all origins (useful for quick testing)
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';
app.use(cors({
  origin: FRONTEND_ORIGIN === '*' ? true : FRONTEND_ORIGIN
}));

app.use(bodyParser.json({ limit: '30mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Healthcheck
app.get('/health', (req, res) => res.json({ ok: true, timestamp: Date.now() }));

// Predict endpoint
app.post('/predict', upload.single('image'), async (req, res) => {
  try {
    let imageBuffer = null;
    let filename = null;

    if (req.file && req.file.buffer) {
      imageBuffer = req.file.buffer;
      filename = req.file.originalname || 'upload.jpg';
    } else if (req.body && req.body.image_base64) {
      const b64 = req.body.image_base64.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(b64, 'base64');
      filename = req.body.filename || 'upload.jpg';
    } else {
      return res.status(400).json({ error: 'No image received. Accepts multipart "image" or JSON "image_base64".' });
    }

    // -------------------------
    // TODO: Replace this mock inference with call to your model
    // Example integration patterns:
    //  - If your model is a local Python service: call via child_process or HTTP
    //  - If your model is remote: call your model's API with imageBuffer
    //  - If you use TorchScript/ONNX in Node, load model and infer here
    // -------------------------

    // Mock deterministic pseudo-score derived from buffer length (for demo)
    const now = Date.now();
    const pseudo = (imageBuffer.length % 97 + (now % 1000) / 1000) / 100.0;
    const score = Math.min(Math.max(pseudo, 0), 1);
    const label = score > 0.6 ? 'deepfake' : (score > 0.35 ? 'suspicious' : 'real');

    const response = {
      model: process.env.MODEL_NAME || 'mock-deepfake-v1',
      prediction: {
        score: score,
        label: label,
        explanation: `Mock heuristic: bytes=${imageBuffer.length}, score≈${score.toFixed(3)}`
      },
      meta: {
        received_bytes: imageBuffer.length
      }
    };

    return res.json(response);

  } catch (err) {
    console.error('Predict error:', err);
    return res.status(500).json({ error: 'Server error', detail: String(err) });
  }
});

// Optional: serve a small root index to confirm service is up
app.get('/', (req, res) => res.send('Deepfake backend running. Use POST /predict'));

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
