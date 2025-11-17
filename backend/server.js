// // backend/server.js
// const express = require('express');
// const multer = require('multer');
// const bodyParser = require('body-parser');
// const cors = require('cors');

// const app = express();
// const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';
// app.use(cors({
//   origin: FRONTEND_ORIGIN === '*' ? true : FRONTEND_ORIGIN,
//   methods: ['GET','POST','OPTIONS'],
//   allowedHeaders: ['Content-Type','Authorization']
// }));

// app.use(bodyParser.json({ limit: '30mb' }));
// app.use(bodyParser.urlencoded({ extended: true }));

// app.get('/', (req, res) => res.type('text').send('Deepfake backend is running. Use POST /predict'));
// app.get('/health', (req, res) => res.json({ ok: true, env: process.env.NODE_ENV || 'development', timestamp: Date.now() }));

// app.post('/predict', upload.single('image'), async (req, res) => {
//   // --- LOGGING ADDED HERE ---
//   console.log('>>> /predict hit - headers:', {
//     length: req.headers['content-length'],
//     type: req.headers['content-type'],
//     ip: req.ip
//   });
//   console.log('>>> /predict - file present?', !!req.file, 'body keys:', Object.keys(req.body || {}));
//   // --------------------------

//   try {
//     let imageBuffer = null;
//     let filename = 'upload.jpg';

//     if (req.file && req.file.buffer) {
//       imageBuffer = req.file.buffer;
//       filename = req.file.originalname || filename;
//     } else if (req.body && req.body.image_base64) {
//       const b64 = req.body.image_base64.replace(/^data:image\/\w+;base64,/, '');
//       imageBuffer = Buffer.from(b64, 'base64');
//       filename = req.body.filename || filename;
//     } else {
//       return res.status(400).json({ error: 'No image received. Send multipart "image" or JSON "image_base64".' });
//     }

//     // MOCK inference — replace with your model call
//     const now = Date.now();
//     const pseudo = (imageBuffer.length % 97 + (now % 1000) / 1000) / 100.0;
//     const score = Math.min(Math.max(pseudo, 0), 1);
//     const label = score > 0.6 ? 'deepfake' : (score > 0.35 ? 'suspicious' : 'real');

//     return res.json({
//       model: process.env.MODEL_NAME || 'mock-deepfake-v1',
//       prediction: {
//         score: score,
//         label: label,
//         explanation: `Mock: bytes=${imageBuffer.length}, score≈${score.toFixed(3)}`
//       },
//       meta: { received_bytes: imageBuffer.length }
//     });
//   } catch (err) {
//     console.error('Predict error:', err);
//     return res.status(500).json({ error: 'Server error', detail: String(err) });
//   }
// });

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`Backend listening on port ${PORT}`));


// ------------------------------

// server.js
const path = require('path');
const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config(); // load .env in development

const app = express();

// multer in-memory for quick prototyping
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

// FRONTEND_ORIGIN: if set to '*' or unset, allow any origin (useful for quick tests).
// For production set FRONTEND_ORIGIN to your deployed frontend URL.
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';
app.use(cors({
  origin: FRONTEND_ORIGIN === '*' ? true : FRONTEND_ORIGIN,
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

// parse JSON bodies up to 30MB (for base64 payloads)
app.use(bodyParser.json({ limit: '30mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Serve frontend static files from "public" (create this dir and place index.html, app.js, style.css)
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Basic health
app.get('/health', (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || 'development', timestamp: Date.now() });
});

// Root: serve index.html (enable single-page usage)
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// POST /predict: receives either multipart/form-data with "image" file
// or application/json with `image_base64`.
app.post('/predict', upload.single('image'), async (req, res) => {
  console.log('>>> /predict hit - headers:', {
    length: req.headers['content-length'],
    type: req.headers['content-type'],
    ip: req.ip
  });
  console.log('>>> /predict - file present?', !!req.file, 'body keys:', Object.keys(req.body || {}));

  try {
    let imageBuffer = null;
    let filename = 'upload.jpg';

    if (req.file && req.file.buffer) {
      imageBuffer = req.file.buffer;
      filename = req.file.originalname || filename;
    } else if (req.body && req.body.image_base64) {
      const b64 = req.body.image_base64.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(b64, 'base64');
      filename = req.body.filename || filename;
    } else {
      return res.status(400).json({ error: 'No image received. Send multipart "image" or JSON "image_base64".' });
    }

    // -------------------------
    // PLACEHOLDER: model call goes here.
    // Example: call external model provider, local ML service, etc.
    // If you need to call a 3rd-party provider that needs an API key,
    // keep the key as an environment variable (process.env.YOUR_KEY) and
    // call it from the server (never from frontend).
    // -------------------------

    // MOCK inference (replace with the real model inference):
    const now = Date.now();
    const pseudo = (imageBuffer.length % 97 + (now % 1000) / 1000) / 100.0;
    const score = Math.min(Math.max(pseudo, 0), 1);
    const label = score > 0.6 ? 'deepfake' : (score > 0.35 ? 'suspicious' : 'real');

    return res.json({
      model: process.env.MODEL_NAME || 'mock-deepfake-v1',
      prediction: {
        score: score,
        label: label,
        explanation: `Mock: bytes=${imageBuffer.length}, score≈${score.toFixed(3)}`
      },
      meta: { received_bytes: imageBuffer.length, filename }
    });
  } catch (err) {
    console.error('Predict error:', err);
    return res.status(500).json({ error: 'Server error', detail: String(err) });
  }
});

// Graceful port setup
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => console.log(`Backend listening on port ${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`));
