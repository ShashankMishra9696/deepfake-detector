/* app.js - frontend logic for Deepfake Image Detector
   - supports multipart upload or base64 JSON
   - mock-server friendly
*/

const fileInput = document.getElementById('fileInput');
const dropzone = document.getElementById('dropzone');
const chooseBtn = document.getElementById('chooseBtn');
const thumb = document.getElementById('thumb');
const dzText = document.getElementById('dz-text');
const fileInfo = document.getElementById('fileInfo');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultSection = document.getElementById('resultSection');
const resultImage = document.getElementById('resultImage');
const scoreNum = document.getElementById('scoreNum');
const scoreLabel = document.getElementById('scoreLabel');
const explanation = document.getElementById('explanation');
const modelNameEl = document.getElementById('modelName');
const inferenceTimeEl = document.getElementById('inferenceTime');
const apiUrlInput = document.getElementById('apiUrl');
const apiKeyInput = document.getElementById('apiKey');
const requestMode = document.getElementById('requestMode');
const resizeSelect = document.getElementById('resizeSelect');
const qualitySelect = document.getElementById('qualitySelect');
const logEl = document.getElementById('log');
const downloadReportBtn = document.getElementById('downloadReportBtn');
const resetBtn = document.getElementById('resetBtn');

let currentFile = null;
let lastResponse = null;

function log(...args){
  const now = new Date().toLocaleTimeString();
  logEl.textContent = `${now} - ${args.join(' ')}\n` + logEl.textContent;
}

/* Drag & drop handlers */
chooseBtn.addEventListener('click', ()=> fileInput.click());
dropzone.addEventListener('click', ()=> fileInput.click());

dropzone.addEventListener('dragover', (e)=>{
  e.preventDefault();
  dropzone.classList.add('dragover');
});
dropzone.addEventListener('dragleave', (e)=> {
  dropzone.classList.remove('dragover');
});
dropzone.addEventListener('drop', (e)=>{
  e.preventDefault();
  dropzone.classList.remove('dragover');
  const f = e.dataTransfer.files && e.dataTransfer.files[0];
  if(f) handleFile(f);
});
fileInput.addEventListener('change', (e)=>{
  const f = e.target.files && e.target.files[0];
  if(f) handleFile(f);
});

function handleFile(file){
  if(!file.type.startsWith('image/')){
    alert('Please upload an image file.');
    return;
  }
  currentFile = file;
  const url = URL.createObjectURL(file);
  thumb.src = url;
  thumb.classList.remove('hidden');
  dzText.style.display = 'none';
  fileInfo.textContent = `${file.name} • ${(file.size/1024).toFixed(1)} KB • ${file.type}`;
  analyzeBtn.disabled = false;
  log('Selected file', file.name, `${(file.size/1024).toFixed(1)}KB`);
}

/* Image processing helpers */
function loadImageToCanvas(file, maxSide = 0, quality = 0.8){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.onload = ()=>{
      let w = img.width, h = img.height;
      if(maxSide > 0){
        const ratio = w > h ? (maxSide / w) : (maxSide / h);
        if(ratio < 1){
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob)=>{
        resolve({blob, width: w, height: h, dataUrl: canvas.toDataURL('image/jpeg', quality)});
      }, 'image/jpeg', quality);
    };
    img.onerror = (err)=> reject(err);
    img.src = URL.createObjectURL(file);
  });
}

/* Analyze flow */
analyzeBtn.addEventListener('click', async ()=>{
  if(!currentFile) return;
  analyzeBtn.disabled = true;
  log('Starting analysis');

  // read settings
  const endpoint = (apiUrlInput.value || '').trim() || 'http://localhost:3000/predict';
  const apiKey = (apiKeyInput.value || '').trim();
  const mode = requestMode.value; // 'multipart' or 'base64'
  const resizeVal = Number(resizeSelect.value);
  const quality = Number(qualitySelect.value);

  try {
    // optional client-side resizing / compression
    const processed = await loadImageToCanvas(currentFile, resizeVal, quality);
    resultImage.src = processed.dataUrl;

    let resp;
    const t0 = performance.now();
    if(mode === 'multipart'){
      const fd = new FormData();
      fd.append('image', processed.blob, currentFile.name || 'upload.jpg');
      // any additional metadata can be appended
      fd.append('originalFilename', currentFile.name);
      const headers = apiKey ? { 'Authorization': apiKey } : {};
      const r = await fetch(endpoint, { method: 'POST', body: fd, headers });
      resp = await r.json();
      if(!r.ok) throw new Error(resp.error || `HTTP ${r.status}`);
    } else {
      // base64 JSON payload
      const payload = {
        filename: currentFile.name,
        content_type: 'image/jpeg',
        image_base64: processed.dataUrl.split(',')[1]
      };
      const headers = {'Content-Type':'application/json'};
      if(apiKey) headers['Authorization'] = apiKey;
      const r = await fetch(endpoint, { method: 'POST', body: JSON.stringify(payload), headers });
      resp = await r.json();
      if(!r.ok) throw new Error(resp.error || `HTTP ${r.status}`);
    }
    const t1 = performance.now();

    // expected response: { model: 'model-name', prediction: {score:0.86, label:'fake', explanation: '...'}, meta: {...} }
    lastResponse = resp;
    showResult(resp, Math.round(t1 - t0));
    log('Analysis complete', `score=${(resp.prediction && resp.prediction.score) ?? 'N/A'}`);
  } catch (err){
    log('Error:', err.message || err);
    alert('Error while analyzing: ' + (err.message || err));
  } finally {
    analyzeBtn.disabled = false;
  }
});

function showResult(resp, ms){
  resultSection.classList.remove('hidden');
  document.getElementById('resultImage').src = resultImage.src;

  const pred = resp.prediction || {};
  const pct = typeof pred.score === 'number' ? Math.round(pred.score * 100) : '—';
  scoreNum.textContent = typeof pct === 'number' ? pct + '%' : pct;
  scoreLabel.textContent = (pred.label ? `${pred.label}` : 'No label');

  // color coding
  if(typeof pred.score === 'number'){
    if(pred.score >= 0.7) scoreNum.style.color = 'var(--danger)';
    else if(pred.score >= 0.4) scoreNum.style.color = 'orange';
    else scoreNum.style.color = 'var(--accent)';
  } else {
    scoreNum.style.color = 'var(--muted)';
  }

  explanation.textContent = pred.explanation || resp.explanation || 'No explanation provided by the model.';
  modelNameEl.textContent = resp.model || 'unknown';
  inferenceTimeEl.textContent = ms + ' ms';

  // prefill download
  downloadReportBtn.onclick = ()=> {
    const report = {
      timestamp: new Date().toISOString(),
      model: resp.model || null,
      inference_ms: ms,
      request: {
        original_filename: currentFile && currentFile.name,
        resize: Number(resizeSelect.value),
      },
      prediction: resp.prediction || resp
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `deepfake-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
}

resetBtn.addEventListener('click', ()=>{
  // reset UI
  currentFile = null;
  thumb.src = '';
  thumb.classList.add('hidden');
  dzText.style.display = '';
  fileInfo.textContent = '';
  analyzeBtn.disabled = true;
  resultSection.classList.add('hidden');
  log('Reset UI');
});

/* initial UI state */
(function init(){
  apiUrlInput.value = 'http://localhost:3000/predict';
  requestMode.value = 'multipart';
  resizeSelect.value = '0';
  qualitySelect.value = '0.8';
  log('UI ready');
})();
