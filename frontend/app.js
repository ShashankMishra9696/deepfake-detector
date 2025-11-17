// /* app.js - frontend logic for Deepfake Image Detector
//    - supports multipart upload or base64 JSON
//    - mock-server friendly
// */

// const fileInput = document.getElementById('fileInput');
// const dropzone = document.getElementById('dropzone');
// const chooseBtn = document.getElementById('chooseBtn');
// const thumb = document.getElementById('thumb');
// const dzText = document.getElementById('dz-text');
// const fileInfo = document.getElementById('fileInfo');
// const analyzeBtn = document.getElementById('analyzeBtn');
// const resultSection = document.getElementById('resultSection');
// const resultImage = document.getElementById('resultImage');
// const scoreNum = document.getElementById('scoreNum');
// const scoreLabel = document.getElementById('scoreLabel');
// const explanation = document.getElementById('explanation');
// const modelNameEl = document.getElementById('modelName');
// const inferenceTimeEl = document.getElementById('inferenceTime');
// const apiUrlInput = document.getElementById('apiUrl');
// const apiKeyInput = document.getElementById('apiKey');
// const requestMode = document.getElementById('requestMode');
// const resizeSelect = document.getElementById('resizeSelect');
// const qualitySelect = document.getElementById('qualitySelect');
// const logEl = document.getElementById('log');
// const downloadReportBtn = document.getElementById('downloadReportBtn');
// const resetBtn = document.getElementById('resetBtn');

// let currentFile = null;
// let lastResponse = null;

// function log(...args){
//   const now = new Date().toLocaleTimeString();
//   logEl.textContent = `${now} - ${args.join(' ')}\n` + logEl.textContent;
// }

// /* Drag & drop handlers */
// chooseBtn.addEventListener('click', ()=> fileInput.click());
// dropzone.addEventListener('click', ()=> fileInput.click());

// dropzone.addEventListener('dragover', (e)=>{
//   e.preventDefault();
//   dropzone.classList.add('dragover');
// });
// dropzone.addEventListener('dragleave', (e)=> {
//   dropzone.classList.remove('dragover');
// });
// dropzone.addEventListener('drop', (e)=>{
//   e.preventDefault();
//   dropzone.classList.remove('dragover');
//   const f = e.dataTransfer.files && e.dataTransfer.files[0];
//   if(f) handleFile(f);
// });
// fileInput.addEventListener('change', (e)=>{
//   const f = e.target.files && e.target.files[0];
//   if(f) handleFile(f);
// });

// function handleFile(file){
//   if(!file.type.startsWith('image/')){
//     alert('Please upload an image file.');
//     return;
//   }
//   currentFile = file;
//   const url = URL.createObjectURL(file);
//   thumb.src = url;
//   thumb.classList.remove('hidden');
//   dzText.style.display = 'none';
//   fileInfo.textContent = `${file.name} • ${(file.size/1024).toFixed(1)} KB • ${file.type}`;
//   analyzeBtn.disabled = false;
//   log('Selected file', file.name, `${(file.size/1024).toFixed(1)}KB`);
// }

// /* Image processing helpers */
// function loadImageToCanvas(file, maxSide = 0, quality = 0.8){
//   return new Promise((resolve, reject)=>{
//     const img = new Image();
//     img.onload = ()=>{
//       let w = img.width, h = img.height;
//       if(maxSide > 0){
//         const ratio = w > h ? (maxSide / w) : (maxSide / h);
//         if(ratio < 1){
//           w = Math.round(w * ratio);
//           h = Math.round(h * ratio);
//         }
//       }
//       const canvas = document.createElement('canvas');
//       canvas.width = w;
//       canvas.height = h;
//       const ctx = canvas.getContext('2d');
//       ctx.drawImage(img, 0, 0, w, h);
//       canvas.toBlob((blob)=>{
//         resolve({blob, width: w, height: h, dataUrl: canvas.toDataURL('image/jpeg', quality)});
//       }, 'image/jpeg', quality);
//     };
//     img.onerror = (err)=> reject(err);
//     img.src = URL.createObjectURL(file);
//   });
// }

// /* Analyze flow */
// analyzeBtn.addEventListener('click', async ()=>{
//   if(!currentFile) return;
//   analyzeBtn.disabled = true;
//   log('Starting analysis');

//   // read settings
//   const endpoint = (apiUrlInput.value || '').trim() || 'http://localhost:3000/predict';
//   const apiKey = (apiKeyInput.value || '').trim();
//   const mode = requestMode.value; // 'multipart' or 'base64'
//   const resizeVal = Number(resizeSelect.value);
//   const quality = Number(qualitySelect.value);

//   try {
//     // optional client-side resizing / compression
//     const processed = await loadImageToCanvas(currentFile, resizeVal, quality);
//     resultImage.src = processed.dataUrl;

//     let resp;
//     const t0 = performance.now();
//     if(mode === 'multipart'){
//       const fd = new FormData();
//       fd.append('image', processed.blob, currentFile.name || 'upload.jpg');
//       // any additional metadata can be appended
//       fd.append('originalFilename', currentFile.name);
//       const headers = apiKey ? { 'Authorization': apiKey } : {};
//       const r = await fetch(endpoint, { method: 'POST', body: fd, headers });
//       resp = await r.json();
//       if(!r.ok) throw new Error(resp.error || `HTTP ${r.status}`);
//     } else {
//       // base64 JSON payload
//       const payload = {
//         filename: currentFile.name,
//         content_type: 'image/jpeg',
//         image_base64: processed.dataUrl.split(',')[1]
//       };
//       const headers = {'Content-Type':'application/json'};
//       if(apiKey) headers['Authorization'] = apiKey;
//       const r = await fetch(endpoint, { method: 'POST', body: JSON.stringify(payload), headers });
//       resp = await r.json();
//       if(!r.ok) throw new Error(resp.error || `HTTP ${r.status}`);
//     }
//     const t1 = performance.now();

//     // expected response: { model: 'model-name', prediction: {score:0.86, label:'fake', explanation: '...'}, meta: {...} }
//     lastResponse = resp;
//     showResult(resp, Math.round(t1 - t0));
//     log('Analysis complete', `score=${(resp.prediction && resp.prediction.score) ?? 'N/A'}`);
//   } catch (err){
//     log('Error:', err.message || err);
//     alert('Error while analyzing: ' + (err.message || err));
//   } finally {
//     analyzeBtn.disabled = false;
//   }
// });

// function showResult(resp, ms){
//   resultSection.classList.remove('hidden');
//   document.getElementById('resultImage').src = resultImage.src;

//   const pred = resp.prediction || {};
//   const pct = typeof pred.score === 'number' ? Math.round(pred.score * 100) : '—';
//   scoreNum.textContent = typeof pct === 'number' ? pct + '%' : pct;
//   scoreLabel.textContent = (pred.label ? `${pred.label}` : 'No label');

//   // color coding
//   if(typeof pred.score === 'number'){
//     if(pred.score >= 0.7) scoreNum.style.color = 'var(--danger)';
//     else if(pred.score >= 0.4) scoreNum.style.color = 'orange';
//     else scoreNum.style.color = 'var(--accent)';
//   } else {
//     scoreNum.style.color = 'var(--muted)';
//   }

//   explanation.textContent = pred.explanation || resp.explanation || 'No explanation provided by the model.';
//   modelNameEl.textContent = resp.model || 'unknown';
//   inferenceTimeEl.textContent = ms + ' ms';

//   // prefill download
//   downloadReportBtn.onclick = ()=> {
//     const report = {
//       timestamp: new Date().toISOString(),
//       model: resp.model || null,
//       inference_ms: ms,
//       request: {
//         original_filename: currentFile && currentFile.name,
//         resize: Number(resizeSelect.value),
//       },
//       prediction: resp.prediction || resp
//     };
//     const blob = new Blob([JSON.stringify(report, null, 2)], {type: 'application/json'});
//     const a = document.createElement('a');
//     a.href = URL.createObjectURL(blob);
//     a.download = `deepfake-report-${Date.now()}.json`;
//     document.body.appendChild(a);
//     a.click();
//     a.remove();
//   };
// }

// resetBtn.addEventListener('click', ()=>{
//   // reset UI
//   currentFile = null;
//   thumb.src = '';
//   thumb.classList.add('hidden');
//   dzText.style.display = '';
//   fileInfo.textContent = '';
//   analyzeBtn.disabled = true;
//   resultSection.classList.add('hidden');
//   log('Reset UI');
// });

// // /* initial UI state */
// // (function init(){
// //   apiUrlInput.value = 'http://localhost:3000/predict';
// //   requestMode.value = 'multipart';
// //   resizeSelect.value = '0';
// //   qualitySelect.value = '0.8';
// //   log('UI ready');
// // })();


// /* initial UI state */
// (function init(){
//   // use a relative endpoint so the UI works when served from the same origin
//   apiUrlInput.value = '/predict';
//   requestMode.value = 'multipart';
//   resizeSelect.value = '0';
//   qualitySelect.value = '0.8';
//   log('UI ready');
// })();


/* app.js
   Complete client-side script for image upload + analyze.
   Features:
   - Uses relative API endpoint by default: '/predict'
   - Two upload modes: multipart (file upload) and json (base64)
   - Image resizing and quality settings
   - Defensive response parsing: shows server text when non-JSON is returned
   - Simple in-page log & preview
*/

/* ====== CONFIG / DOM ELEMENTS ====== */
const apiUrlInput    = document.getElementById('apiUrl')    || createHiddenInput('apiUrl', '/predict');
const requestMode    = document.getElementById('mode')      || createHiddenInput('mode', 'multipart'); // 'multipart' | 'base64'
const resizeSelect   = document.getElementById('resize')    || createHiddenInput('resize', '0'); // percentage or 0 for none
const qualitySelect  = document.getElementById('quality')   || createHiddenInput('quality', '0.8'); // 0..1
const fileInput      = document.getElementById('fileInput') || createHiddenInput('fileInput');
const analyzeBtn     = document.getElementById('analyzeBtn')|| createHiddenButton();
const logArea        = document.getElementById('logArea')   || createConsoleDiv();
const previewImg     = document.getElementById('preview')   || createHiddenImg();
const apiKeyInput    = document.getElementById('apiKey')    || createHiddenInput('apiKey', '');

/* Utility: create fallback DOM nodes if the HTML didn't provide them,
   so this script doesn't crash when included with a slightly different page.
*/
function createHiddenInput(id, value = '') {
  const el = document.createElement('input');
  el.type = 'hidden';
  el.id = id;
  el.value = value;
  document.body.appendChild(el);
  return el;
}
function createHiddenButton() {
  const b = document.createElement('button');
  b.id = 'analyzeBtn';
  b.style.display = 'none';
  document.body.appendChild(b);
  return b;
}
function createConsoleDiv() {
  const d = document.createElement('pre');
  d.id = 'logArea';
  d.style = 'position:fixed;right:8px;bottom:8px;max-width:320px;max-height:40vh;overflow:auto;background:#111;color:#eee;padding:8px;font-size:12px;border-radius:6px;z-index:9999';
  document.body.appendChild(d);
  return d;
}
function createHiddenImg() {
  const i = document.createElement('img');
  i.id = 'preview';
  i.style.display = 'none';
  document.body.appendChild(i);
  return i;
}

/* ====== LOGGING HELPERS ====== */
function ts(){ return new Date().toLocaleTimeString(); }
function log(...args){
  const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
  const line = `[${ts()}] ${msg}\n`;
  console.log(line);
  if(logArea) {
    logArea.textContent = line + logArea.textContent;
  }
}

/* ====== UI INITIALIZATION ====== */
(function init(){
  // Default to relative endpoint so hosted frontend + backend on same origin works
  if (!apiUrlInput.value) apiUrlInput.value = '/predict';
  else apiUrlInput.value = apiUrlInput.value || '/predict';

  // sensible defaults
  requestMode.value = requestMode.value || 'multipart';
  resizeSelect.value = resizeSelect.value || '0';
  qualitySelect.value = qualitySelect.value || '0.8';

  // hookup file input change
  fileInput.addEventListener('change', onFileSelected);
  analyzeBtn.addEventListener('click', onAnalyzeClicked);

  log('UI ready');
})();

/* ====== File handling & image processing ====== */
let currentFile = null;
let currentDataUrl = null;
let currentBlob = null;

function onFileSelected(e){
  const f = (e.target && e.target.files && e.target.files[0]) || fileInput.files && fileInput.files[0];
  if(!f) return;
  currentFile = f;
  log('Selected file', f.name, (f.size/1024).toFixed(1)+'KB');
  // show preview immediately
  const reader = new FileReader();
  reader.onload = () => {
    currentDataUrl = reader.result;
    previewImg.src = currentDataUrl;
    previewImg.style.display = 'block';
  };
  reader.readAsDataURL(f);
}

/**
 * Resize and convert to blob
 * @param {Number} maxPercent - percent (0 for no resize)
 * @param {Number} quality - 0..1
 * @returns {Promise<{blob:Blob, dataUrl:string}>}
 */
function processImage(maxPercent = 0, quality = 0.8){
  return new Promise((resolve, reject) => {
    if(!currentFile && !currentDataUrl) return reject(new Error('No file selected'));
    const img = new Image();
    img.onload = async () => {
      try {
        let w = img.naturalWidth, h = img.naturalHeight;
        if(maxPercent && maxPercent > 0 && maxPercent < 100) {
          const factor = maxPercent / 100;
          w = Math.round(w * factor);
          h = Math.round(h * factor);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const mime = currentFile && currentFile.type ? currentFile.type : 'image/jpeg';
        canvas.toBlob(blob => {
          if(!blob) return reject(new Error('Failed to convert image to blob'));
          const reader = new FileReader();
          reader.onload = () => {
            resolve({ blob, dataUrl: reader.result });
          };
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(blob);
        }, mime, quality);
      } catch(err) {
        reject(err);
      }
    };
    img.onerror = (err) => reject(new Error('Invalid image file or unsupported format'));
    // load from currentDataUrl (preferred) or file via object URL
    if(currentDataUrl) img.src = currentDataUrl;
    else img.src = URL.createObjectURL(currentFile);
  });
}

/* ====== Analyze button handler ====== */
async function onAnalyzeClicked(e){
  try {
    if(!currentFile) {
      log('No file selected. Please choose an image first.');
      return;
    }
    log('Starting analysis');

    const mode = (requestMode.value || 'multipart').toLowerCase();
    const endpoint = (apiUrlInput.value || '/predict').trim();
    const resizePct = Number(resizeSelect.value || 0);
    const quality = Number(qualitySelect.value || 0.8);
    const apiKey = apiKeyInput.value && apiKeyInput.value.trim() ? apiKeyInput.value.trim() : null;

    // process image (resize + quality)
    const processed = await processImage(resizePct, quality);
    currentBlob = processed.blob;
    currentDataUrl = processed.dataUrl;

    let resp = null;

    if(mode === 'multipart'){
      // multipart/form-data upload
      const fd = new FormData();
      fd.append('image', processed.blob, currentFile.name || 'upload.jpg');
      fd.append('originalFilename', currentFile.name || '');

      const headers = {};
      if(apiKey) headers['Authorization'] = apiKey;

      log('Uploading as multipart to', endpoint);
      const r = await fetch(endpoint, { method: 'POST', body: fd, headers });

      // Defensive parse: try to parse JSON, otherwise show snippet of response text
      const text = await r.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (err) {
        throw new Error(`Server returned non-JSON response (status ${r.status}). Response text:\n${text.slice(0, 600)}`);
      }
      if(!r.ok) {
        const errmsg = parsed && parsed.error ? parsed.error : `HTTP ${r.status}`;
        throw new Error(`Server error: ${errmsg}`);
      }
      resp = parsed;
    } else {
      // JSON base64 upload
      const payload = {
        filename: currentFile.name || 'upload.jpg',
        content_type: currentFile.type || 'image/jpeg',
        image_base64: processed.dataUrl.split(',')[1] // omit data:*;base64, prefix
      };
      const headers = { 'Content-Type': 'application/json' };
      if(apiKey) headers['Authorization'] = apiKey;

      log('Uploading as JSON(base64) to', endpoint);
      const r = await fetch(endpoint, { method: 'POST', body: JSON.stringify(payload), headers });

      const text = await r.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (err) {
        throw new Error(`Server returned non-JSON response (status ${r.status}). Response text:\n${text.slice(0, 600)}`);
      }
      if(!r.ok) {
        const errmsg = parsed && parsed.error ? parsed.error : `HTTP ${r.status}`;
        throw new Error(`Server error: ${errmsg}`);
      }
      resp = parsed;
    }

    // show result
    log('Analysis result:', resp);
    // If the page has a result area, try to place JSON there
    displayResult(resp);
  } catch (err) {
    log('Error:', err.message || String(err));
    // Also show an alert (helpful during dev)
    // but avoid annoying users—only alert if running from file (fallback)
    if(window.location.protocol === 'file:') alert('Error: ' + (err.message || err));
  }
}

/* ====== result rendering helper ====== */
function displayResult(resp){
  // Try to find an element #resultArea, otherwise append to logArea
  const rEl = document.getElementById('resultArea');
  if(rEl) {
    rEl.textContent = JSON.stringify(resp, null, 2);
  } else if(logArea) {
    log('Result JSON:', resp);
  } else {
    console.log('Result:', resp);
  }
}

/* ====== Optional: allow drag & drop ====== */
document.addEventListener('dragover', e => { e.preventDefault(); });
document.addEventListener('drop', e => {
  e.preventDefault();
  if(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length){
    fileInput.files = e.dataTransfer.files;
    // trigger handler
    const ev = new Event('change');
    fileInput.dispatchEvent(ev);
  }
});

/* ====== Expose a small API for dev console ====== */
window._analyze = onAnalyzeClicked;
window._getState = () => ({ currentFile, currentDataUrl, currentBlob });

/* End of app.js */
