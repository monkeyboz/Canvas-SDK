// app.js — Main thread orchestration for Pixel Convergence Studio (external worker)

const logEl = document.getElementById('log');
const heatmapTimeline = document.getElementById('heatmapTimeline');
const heatmapContainer = document.getElementById('heatmapContainer');
const displayCanvas = document.getElementById('display');
const displayCtx = displayCanvas.getContext('2d');
const thumbsEl = document.getElementById('thumbs');
const simListEl = document.getElementById('simList');
const heatmapInfo = document.getElementById('heatmapInfo');
const dictListEl = document.getElementById('dictList');

let images = []; // {index,width,height,buffer,thumbUrl}
let stepData = {}; // blockSize -> [{index,imageData}]
let convergenceData = []; // [{block, sims:[{index,sim}], avg}]
let finalFramesByIndex = {};
let workers = [];
let processing = false;
let lastClickedBlock = null;
let dictAggregate = {}; // aggregated across images for selected step

function log(msg){ const line = document.createElement('div'); line.textContent = `${new Date().toLocaleTimeString()} — ${msg}`; logEl.appendChild(line); logEl.scrollTop = logEl.scrollHeight; console.log(msg); }

// Build worker instances from worker.js
function createWorkers(count){ terminateWorkers(); workers = []; for (let i=0;i<count;i++){ const w = new Worker('worker.js'); w.onmessage = handleWorkerMessage; w.onerror = e=>log('Worker error: '+e.message); workers.push(w); } log('Created '+workers.length+' workers'); }
function terminateWorkers(){ for (const w of workers) w.terminate(); workers = []; }

function handleWorkerMessage(e){ const data = e.data; if (data.type === 'FRAME'){ const {blockSize, results, dict} = data; if (!stepData[blockSize]) stepData[blockSize] = []; for (const r of results){ const imgData = new ImageData(new Uint8ClampedArray(r.buffer), r.width, r.height); stepData[blockSize].push({index:r.index,imageData:imgData}); if (blockSize === 1) finalFramesByIndex[r.index] = imgData; }
    // merge dictionaries per step (dict is per-worker aggregated) — combine into simple counts
    if (dict){ if (!stepData[blockSize].dict) stepData[blockSize].dict = {}; for (const sig in dict){ stepData[blockSize].dict[sig] = (stepData[blockSize].dict[sig] || 0) + dict[sig]; } }
    log(`Received block ${blockSize} (${results.length} images)`);
    updateConvergenceAndDraw(); }
  if (data.type === 'ERROR') log('Worker error: '+data.message); }

// Image upload
document.getElementById('imageInput').onchange = async (e) => {
  images = []; stepData = {}; convergenceData = []; finalFramesByIndex = {};
  thumbsEl.innerHTML = ''; dictListEl.innerHTML = ''; simListEl.innerHTML = ''; heatmapTimeline.innerHTML = '';
  const files = Array.from(e.target.files).slice(0,20);
  for (let i=0;i<files.length;i++){
    const f = files[i]; const dataUrl = await fileToDataURL(f);
    const img = await createImageBitmapFromDataURL(dataUrl);
    const c = document.createElement('canvas'); c.width=512; c.height=512; const ctx = c.getContext('2d'); ctx.fillStyle='#000'; ctx.fillRect(0,0,512,512);
    const ar = img.width/img.height; let dw=512, dh=512, dx=0, dy=0; if (ar>1){ dh=512; dw=Math.round(512*ar); dx=Math.round((512-dw)/2); } else { dw=512; dh=Math.round(512/ar); dy=Math.round((512-dh)/2); }
    ctx.drawImage(img, dx, dy, dw, dh); const id = ctx.getImageData(0,0,512,512);
    images.push({index:i,width:512,height:512,buffer:id.data.buffer,thumbUrl:dataUrl});
    const t = document.createElement('div'); t.className='thumb'; const im = document.createElement('img'); im.src = dataUrl; const badge = document.createElement('div'); badge.className='sel'; badge.textContent='—'; t.appendChild(im); t.appendChild(badge);
    t.onclick = ()=>{ currentPreviewIndex = i; drawPreviewFromLatest(i); }
    thumbsEl.appendChild(t);
    log('Loaded '+f.name);
  }
  log(`Loaded ${images.length} images`);
}

function fileToDataURL(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); }); }
function createImageBitmapFromDataURL(dataUrl){ return fetch(dataUrl).then(r=>r.blob()).then(b=>createImageBitmap(b)); }

// Start processing
document.getElementById('go').onclick = async () => {
  if (images.length===0) return alert('Upload images first');
  if (processing) return alert('Already processing');
  stepData = {}; convergenceData = {}; finalFramesByIndex = {};
  const start = parseInt(document.getElementById('startBlockSize').value)||64;
  const end = parseInt(document.getElementById('finalBlockSize').value)||1;
  const step = parseInt(document.getElementById('stepSize').value)||4;
  let wcount = parseInt(document.getElementById('workerCount').value)||0; if (wcount<=0) wcount = Math.max(1,(navigator.hardwareConcurrency||4)-1);
  createWorkers(Math.min(wcount, images.length));
  processing = true; document.getElementById('stop').disabled=false; document.getElementById('go').disabled=true;
  log(`Processing blocks ${start}→${end} step ${step} with ${workers.length} workers`);
  const blockSizes = []; for (let b=start;b>=end;b-=step) blockSizes.push(b); if (!blockSizes.includes(1)) blockSizes.push(1);
  for (const blockSize of blockSizes){ if (!processing) break; // distribute images across workers evenly
    const chunks = []; for (let i=0;i<workers.length;i++) chunks.push([]); images.forEach((img,idx)=>chunks[idx%workers.length].push(img));
    for (let wi=0; wi<workers.length; wi++){ const chunk = chunks[wi]; if (chunk.length===0) continue; const imgsToSend = chunk.map(c=>({index:c.index,width:c.width,height:c.height,buffer:c.buffer.slice(0)})); workers[wi].postMessage({type:'PROCESS', payload:{images:imgsToSend, options:{grayscale:document.getElementById('grayscaleCheck').checked, dither:document.getElementById('ditherCheck').checked}, blockSize}}, imgsToSend.map(i=>i.buffer)); }
    await new Promise(r=>setTimeout(r, 120)); }
  // wait briefly for final frames
  const startWait = Date.now(); while (processing){ const allGot = images.every(img=>finalFramesByIndex.hasOwnProperty(img.index)); if (allGot) break; if (Date.now()-startWait>30000) break; await new Promise(r=>setTimeout(r,120)); }
  processing=false; document.getElementById('stop').disabled=true; document.getElementById('go').disabled=false; document.getElementById('downloadPCA').style.display='inline-block';
  log('Processing finished (or timed out).');
}

// Stop
document.getElementById('stop').onclick = ()=>{ processing=false; terminateWorkers(); document.getElementById('stop').disabled=true; document.getElementById('go').disabled=false; log('Stopped'); }

// Update convergence data & draw timeline
function updateConvergenceAndDraw(){ const blocks = Object.keys(stepData).map(k=>parseInt(k)).sort((a,b)=>b-a); convergenceData = []; for (const b of blocks){ const frames = stepData[b]; const sims = frames.map(f=>{ const idx=f.index; if (!finalFramesByIndex[idx]) return {index:idx,sim:null}; const s = calculateSimilarity(f.imageData.data, finalFramesByIndex[idx].data); return {index:idx,sim:s}; }); const vals = sims.filter(s=>s.sim!==null).map(s=>s.sim); const avg = vals.length? (vals.reduce((a,b)=>a+b,0)/vals.length):null; const dict = stepData[b].dict||{}; convergenceData.push({block:b,sims,avg,dict}); }
  drawHeatmapTimeline(); drawPreviewFromLatest(0);
}

function drawHeatmapTimeline(){ heatmapTimeline.innerHTML = '';
  if (convergenceData.length===0) return;
  convergenceData.forEach((d,i)=>{ const div=document.createElement('div'); div.className='step-block'; const hue = d.avg===null?200:Math.max(0,Math.min(140,Math.round(d.avg*1.2))); div.style.background = d.avg===null? '#444' : `hsl(${hue},70%,45%)`; div.dataset.index=i; div.dataset.block=d.block; const lbl=document.createElement('div'); lbl.className='label'; lbl.textContent = d.block + 'px'; div.appendChild(lbl);
    div.addEventListener('click', ()=>{ highlightStep(i); lastClickedBlock=d.block; showHeatmapDetails(d); // center
      const containerRect=heatmapContainer.getBoundingClientRect(); const elRect=div.getBoundingClientRect(); heatmapContainer.scrollLeft += ((elRect.left+elRect.right)/2 - (containerRect.left+containerRect.right)/2); });
    heatmapTimeline.appendChild(div);
  }); }

function highlightStep(i){ const nodes = heatmapTimeline.querySelectorAll('.step-block'); nodes.forEach(n=>n.classList.remove('selected')); const sel = heatmapTimeline.querySelector(`.step-block[data-index="${i}"]`); if (sel) sel.classList.add('selected'); }

function showHeatmapDetails(step){ heatmapInfo.textContent = `Block: ${step.block}px — avg similarity: ${step.avg===null? '–': step.avg.toFixed(1)+'%'}`; populateInspector(step); // show dictionary if available
  dictListEl.innerHTML = '';
  const dict = step.dict || {};
  const entries = Object.entries(dict).sort((a,b)=>b[1]-a[1]).slice(0,200);
  entries.forEach(([sig,count])=>{ const div = document.createElement('div'); div.className='dict-item'; const left = document.createElement('div'); left.textContent = sig; const right = document.createElement('div'); right.textContent = count; div.appendChild(left); div.appendChild(right); dictListEl.appendChild(div); });
}

function populateInspector(step){ simListEl.innerHTML = ''; const sorted = step.sims.slice().sort((a,b)=>{ const va = a.sim===null? -1:a.sim; const vb = b.sim===null? -1:b.sim; return vb-va; }); sorted.forEach(s=>{ const row=document.createElement('div'); row.className='row'; const left=document.createElement('div'); left.textContent = `#${s.index}`; const right=document.createElement('div'); right.textContent = s.sim===null? '–' : s.sim.toFixed(1)+'%'; row.appendChild(left); row.appendChild(right); simListEl.appendChild(row); }); }

function drawPreviewFromLatest(index){ const blocks = Object.keys(stepData).map(k=>parseInt(k)).sort((a,b)=>a-b); for (const b of blocks){ const arr = stepData[b]||[]; const found = arr.find(x=>x.index===index); if (found){ displayCtx.putImageData(found.imageData,0,0); return; } } // fallback to original
  const meta = images.find(x=>x.index===index); if (meta){ const id = new ImageData(new Uint8ClampedArray(meta.buffer), meta.width, meta.height); displayCtx.putImageData(id,0,0); } }

// 4x4 dictionary export
document.getElementById('exportDict').onclick = ()=>{ const step = convergenceData.find(c=>c.block===lastClickedBlock); if (!step) return alert('Select a step first'); const obj = step.dict||{}; const blob = new Blob([JSON.stringify(obj, null, 2)], {type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download = `dict_block_${step.block}.json`; a.click(); }

// Similarity calculation
function calculateSimilarity(da, db){ let diff=0; for (let i=0;i<da.length;i+=4){ diff += Math.abs(da[i]-db[i]) + Math.abs(da[i+1]-db[i+1]) + Math.abs(da[i+2]-db[i+2]); } const max = (da.length/4) * 765; return (1 - diff/max) * 100; }

// PCA download (simple)
document.getElementById('downloadPCA').onclick = async ()=>{ alert('PCA export not implemented in this build — use previous version for full PCA.'); }

// Utility cleanup on unload
window.addEventListener('beforeunload', ()=>{ terminateWorkers(); });

// End of app.js


