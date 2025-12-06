(function(){
    'use strict';

// BUG 1 -> good clip, bad shadows
// or
// BUG 2 -> good color, bad clip


// TODO DEBUGGING:
// ---

function debug_drawDotsEyelids(ctx, currEyelids) {
  ctx.fillStyle = '#FF0000';
  
  if(currEyelids.left){
    for (const pt of currEyelids.left) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if(currEyelids.right){    
    for (const pt of currEyelids.right) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
     
// TODO - there are 10 dots on the left eye and 9 on the right eye 
// and the order is not very good at the right eye - check why

// TODO - look at the right eye its not perfect like the eye, fix it by changing the  RIGHT_EYE_LOWER
function debug_drawEyelids(ctx, currEyes, currEyelids) {
  
  if (currEyes.left && currEyelids.left) {
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(currEyelids.left[0].x, currEyelids.left[0].y);
  
    for (let i = 1; i < currEyelids.left.length; i++) {
      ctx.lineTo(currEyelids.left[i].x, currEyelids.left[i].y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  
    if (currEyes.right && currEyelids.right) {
    ctx.strokeStyle = '#00fff2ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(currEyelids.right[0].x, currEyelids.right[0].y);
  
    for (let i = 1; i < currEyelids.right.length; i++) {
      ctx.lineTo(currEyelids.right[i].x, currEyelids.right[i].y);
    }
    ctx.closePath();
    ctx.stroke();
  }

debug_drawDotsEyelids(ctx, currEyelids);
}


// debug: draw all landmarks (dots + optional index labels)
function debug_drawAllLandmarks(ctx, landmarks, { showIndex = false, color = 'red', size = 2 } = {}) {
    if (!landmarks || !landmarks.length) return;
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.font = '10px sans-serif';
    for (let i = 0; i < landmarks.length; i++) {
        const p = landmarks[i];
        // convert normalized coords -> canvas coords
        const x = Math.round(p.x * canvas.width);
        const y = Math.round(p.y * canvas.height);
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        if (showIndex) {
            // small offset so number doesn't overlap the dot
            ctx.fillText(String(i), x + size + 1, y - size - 1);
        }
    }
    ctx.restore();
}

// debug: print landmark list to console (useful to export)
function debug_logLandmarks(landmarks) {
    if (!landmarks) return;
    const pts = landmarks.map((p, i) => ({ i, x: p.x * canvas.width, y: p.y * canvas.height, z: p.z }));
    console.table(pts);
}


// debug: return array of indices whose projected position is within px radius of a center landmark
function debug_getLandmarksNear(landmarks, centerIdx, pxRadius = 40){
    if (!landmarks || !landmarks[centerIdx]) return [];
    const cx = landmarks[centerIdx].x * canvas.width;
    const cy = landmarks[centerIdx].y * canvas.height;
    const out = [];
    for (let i = 0; i < landmarks.length; i++){
        const p = landmarks[i];
        const x = p.x * canvas.width, y = p.y * canvas.height;
        const d = Math.hypot(x - cx, y - cy);
        if (d <= pxRadius) out.push(i);
    }
    return out;
}

// debug: draw small numbered dots for a list of indices
function debug_drawIndices(ctx, landmarks, indices, { color = 'cyan', size = 2 } = {}){
    if (!landmarks || !indices || !indices.length) return;
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.font = '10px sans-serif';
    for (const i of indices){
        const p = landmarks[i];
        const x = Math.round(p.x * canvas.width);
        const y = Math.round(p.y * canvas.height);
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI*2);
        ctx.fill();
        ctx.fillText(String(i), x + size + 1, y - size - 1);
    }
    ctx.restore();
}

// helper that returns a union of predefined eye indices (upper+lower+iris ring)
function debug_getKnownEyeIndices(side = 'left'){
    if (side === 'left') return Array.from(new Set([].concat(LEFT_EYE_UPPER, LEFT_EYE_LOWER, LEFT_IRIS_RING, [LEFT_IRIS_CENTER])));
    return Array.from(new Set([].concat(RIGHT_EYE_UPPER, RIGHT_EYE_LOWER, RIGHT_IRIS_RING, [RIGHT_IRIS_CENTER])));
}

// LIST OF ALL THE DOTS THAT ARE IN THE RIGHT EYE

// debug helpers: list & draw every landmark that belongs to the right eye
const DEBUG_SHOW_RIGHT_EYE = true;

function debug_pointInPoly(point, poly){
    // ray-casting / winding test
    if (!poly || !poly.length) return false;
    let x = point.x, y = point.y, inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i].x, yi = poly[i].y;
        const xj = poly[j].x, yj = poly[j].y;
        const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi + 0.0000001) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function debug_getRightEyeLandmarkLists(landmarks, radiusPx = 48){
    if (!landmarks || !landmarks.length) return null;
    // Known sets from constants in file
    const known = Array.from(new Set([].concat(RIGHT_EYE_UPPER, RIGHT_EYE_LOWER, RIGHT_IRIS_RING, [RIGHT_IRIS_CENTER])));
    // compute center in canvas coords
    const centerPt = landmarks[RIGHT_IRIS_CENTER] ? { x: landmarks[RIGHT_IRIS_CENTER].x * canvas.width, y: landmarks[RIGHT_IRIS_CENTER].y * canvas.height } : null;
    // build eyelid polygon in canvas coords
    const eyelidPoly = buildEyeClip(landmarks, RIGHT_EYE_UPPER, RIGHT_EYE_LOWER);
    const nearCenter = [];
    const insideEyelid = [];
    const coords = {};
    for (let i = 0; i < landmarks.length; i++){
        const p = landmarks[i];
        if (!p) continue;
        const cx = p.x * canvas.width, cy = p.y * canvas.height;
        coords[i] = { x: cx, y: cy, z: p.z };
        if (centerPt){
            const d = Math.hypot(cx - centerPt.x, cy - centerPt.y);
            if (d <= radiusPx) nearCenter.push(i);
        }
        if (eyelidPoly && eyelidPoly.length){
            if (debug_pointInPoly({x:cx,y:cy}, eyelidPoly)) insideEyelid.push(i);
        }
    }
    return { known, nearCenter, insideEyelid, coords, centerPt, eyelidPoly };
}

function debug_drawRightEyeLandmarks(ctx, lists, { showIndex=true } = {}){
    if (!lists) return;
    // draw known set (orange)
    debug_drawIndices(ctx, Object.keys(lists.coords).map(k => ({x: lists.coords[k].x/canvas.width, y: lists.coords[k].y/canvas.height})), []); // noop to keep helper available
    // draw categories
    const draw = (indices, color, size=3) => {
        ctx.save();
        ctx.fillStyle = color; ctx.strokeStyle = color; ctx.font = '12px monospace';
        for (const i of indices){
            const p = lists.coords[i];
            if (!p) continue;
            ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, Math.PI*2); ctx.fill();
            if (showIndex) ctx.fillText(String(i), p.x + size + 1, p.y - size - 2);
        }
        ctx.restore();
    };

    // more left eye landmark - [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7]
    // more tight eye landmark - [463, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382, 362]
    
    // known (orange)
    // draw(lists.known, '#ff9900', 3);
   
    // draw([386, 374, 263, 362], '#c800ffff', 4); // right eye
    // draw([159, 145, 33, 133], '#c800ffff', 4); // left eye

    // optional: outline eyelid polygon
    if (lists.eyelidPoly && lists.eyelidPoly.length){
        ctx.save();
        ctx.strokeStyle = '#66ff66'; ctx.lineWidth = 1; ctx.beginPath();
        ctx.moveTo(lists.eyelidPoly[0].x, lists.eyelidPoly[0].y);
        for (let i=1;i<lists.eyelidPoly.length;i++) ctx.lineTo(lists.eyelidPoly[i].x, lists.eyelidPoly[i].y);
        ctx.closePath(); ctx.stroke(); ctx.restore();
    }
}



// ---


    const video = document.getElementById('efw-video');
    const canvas = document.getElementById('efw-canvas'); 
    const ctx = canvas.getContext('2d', { alpha: false });
    const statusEl = document.getElementById('efw-status');

    const btnStartCenter = document.getElementById('efw-start-center');
    const btnStop  = document.getElementById('efw-stop');
    const colorInp = document.getElementById('efw-color');
    const alphaInp = document.getElementById('efw-alpha');
    const alphaVal = document.getElementById('efw-alpha-val');

    // Floating button + control over opening/closing the color panel
    const fabBtn = document.getElementById('efw-fab');
    const wrapEl = document.querySelector('.efw-video-wrap');
    const pal = document.getElementById('efw-palette');
    const btnCapture = document.getElementById('efw-capture');
   
   // Start Color Tag
    const colorTag = document.getElementById('efw-color-tag');

    // clamp value to range
    function clamp(v, min, max){ return v < min ? min : (v > max ? max : v); }
    
    // hex string from RGB
    function hexToRgb(hex){
      if (!hex) return {r: 183, g: 164, b: 157};
      let h = hex.trim().replace('#','');
      if (h.length === 3) h = h.split('').map(c => c + c).join('');
      const num = parseInt(h, 16);
      if (Number.isNaN(num)) return {r: 183, g: 164, b: 157};
      return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
    }

    function rgbToHex(r,g,b){
      const toHex = (n)=> clamp(Math.round(n),0,255).toString(16).padStart(2,'0');
      return '#' + toHex(r) + toHex(g) + toHex(b);
    }

    // returns darker hex color
    function darkenHex(hex, amount){
      const {r,g,b} = hexToRgb(hex);
      return rgbToHex(r*(1-amount), g*(1-amount), b*(1-amount));
    }

    function setWrapBgFromColor(hex){
      if (!wrapEl) return;
      const c1 = darkenHex(hex, 0.40);
      const c2 = darkenHex(hex, 0.70);
      wrapEl.style.background = `linear-gradient(135deg, ${c2}, ${c1})`;
    }

    // UI helper for color chips and palette text
    function getSelectedChip(){
      const active = document.querySelector('.efw-chip.active');
      if (active) return active;
      const chips = document.querySelectorAll('.efw-chip');
      const val = (colorInp.value||'').toLowerCase();
      for (const ch of chips){ if ((ch.dataset.color||'').toLowerCase() === val) return ch; }
      return null;
    }

    // UI helper for color chips and palette text
    function updateColorTag(){
      if (!colorTag) return;
      const chip = getSelectedChip();
      const name = (chip && (chip.getAttribute('title') || (chip.textContent||'').trim())) || (colorInp.value||'');
      colorTag.textContent = name;
    }

    // הפעלה ראשונית לפי ברירת המחדל
    setWrapBgFromColor(colorInp.value);
    updateColorTag();
    
   // End Color Tag

    if (fabBtn && wrapEl && pal){
      fabBtn.addEventListener('click', ()=>{
        const isOpen = wrapEl.classList.toggle('palette-open');
        fabBtn.setAttribute('aria-expanded', String(isOpen));
        pal.setAttribute('aria-hidden', String(!isOpen));
      });
    }


    
    // Fixed to normal mixing mode
    const blendMode = 'source-over';

    let running = false;
    let stream = null;
    let faceMesh = null;
    let animationId = null;
    let currentEyes = { left: null, right: null };
    let currentEyelids = { left: null, right: null };
    
    // BUG - this is for the bug when the hand in front of eye doesn't remove color filter 
    // let leftIrisDetected = false;
    // let rightIrisDetected = false;

    const REALISM = {
      SIZE_MULTIPLIER: 0.92,
      MIN_RADIUS: 6,
      MAX_RADIUS: 36,
      IRIS_SHRINK: 0.90,
      RING_MARGIN: 0.92,
      PUPIL_RATIO: 0.32,
      LIMBAL_WIDTH: 0.18, // Control the limbal ring (dark ring around the iris)
      LIMBAL_ALPHA: 0.55, // Control the limbal ring (dark ring around the iris)
      // LIMBAL_ALPHA: 0.25, 
      HIGHLIGHT_ALPHA: 0.35, // Light reflection on the cornea
      HIGHLIGHT_OFFSET: 0.28, // Light reflection on the cornea
      FIBER_COUNT: 36, 
      FIBER_ALPHA: 0.14, // Affect iris texture contrast
      // FIBER_ALPHA: 0.08,
      FIBER_INNER: 0.28,
      FIBER_OUTER: 0.95,
      EDGE_DARKEN: 0.25, // Darkens the outer edge of the iris
      // EDGE_DARKEN: 0.08,
      INNER_GLOW: 0.20, // Adds a subtle bright ring inside the iris
      SMOOTHING: 0.35,
      CENTER_BLEND: 0.6, // Controls how the pupil blends with the iris
      CENTER_Y_OFFSET: -0.06, // Slightly shifts the iris center
      FIBER_JITTER: 0.06,
      FIBER_LIGHT_ALPHA: 0.06, // Affect iris texture contrast
      FIBER_CLEAR_COUNT: 0,
      FIBER_CLEAR_ALPHA: 0,
      FIBER_CLEAR_THICKNESS: 0.5,
      FIBER_CLEAR_INNER: 0.20,
      FIBER_CLEAR_OUTER: 0.97,
      BAND_COUNT: 4,
      BAND_ALPHA: 0.06, // Adds concentric darker bands
      FILL_BOOST_ALPHA: 0.12
    };

    const EYELID_MASK = {
      ENABLED: true,
      CLIP_STRENGTH: 0.55,
      // CLIP_STRENGTH: 0.7,
      BLUR_PX: 1.4
    };

    // // More sensitive (disappears quickly)
    // const BLINK = { T0: 0.14, T1: 0.22 }; // Ramp: below T0 turns off, between T0 and T1 fades, above T1 full
  
    // Medium sensitive
    const BLINK = { T0: 0.10, T1: 0.18 }; // Ramp: below T0 turns off, between T0 and T1 fades, above T1 full

    // // Less sensitive (stays longer)
    // const BLINK = { T0: 0.05, T1: 0.10 }; // Ramp: below T0 turns off, between T0 and T1 fades, above T1 full

    const noiseCanvas = document.createElement('canvas');
    const noiseCtx = noiseCanvas.getContext('2d');

    noiseCanvas.width = 64;
    noiseCanvas.height = 64;
    
    // TODO - check without this function
    // populates noiseCanvas with low-alpha gray noise used subtly in iris texture
    // (function buildNoise(){
    //   const img = noiseCtx.createImageData(noiseCanvas.width, noiseCanvas.height);
    //   for (let i=0; i<img.data.length; i+=4){
    //     const v = 120 + Math.floor(Math.random()*16);
    //     img.data[i] = v; img.data[i+1] = v; img.data[i+2] = v; img.data[i+3] = 10;
    //   }
    //   noiseCtx.putImageData(img, 0, 0);
    // })();


    // TODO - here are some shadows. check if the shadows are created here
    // CHECK MORE OPTIONS THAT CREATE THE SHADOWS AND COMMENT THEM TO CHECK IF ITS WORKING
    

    // shadows & lighting
    const eyeColorLayer = document.createElement('canvas');
    // iris color
    const eyeColorCtx = eyeColorLayer.getContext('2d');
    // visible area mask
    const eyeShadeLayer = document.createElement('canvas');
    // combines all of them
    const eyeShadeCtx = eyeShadeLayer.getContext('2d');
    
    // ensure eyeColorLayer and eyeShadeLayer have size S and clear them
    function ensureEyeLayersSize(size){
      const s = Math.max(16, Math.ceil(size));
      if (eyeColorLayer.width !== s || eyeColorLayer.height !== s){ eyeColorLayer.width = s; eyeColorLayer.height = s; }
      if (eyeShadeLayer.width !== s || eyeShadeLayer.height !== s){ eyeShadeLayer.width = s; eyeShadeLayer.height = s; }
      eyeColorCtx.clearRect(0,0,s,s);
      eyeShadeCtx.clearRect(0,0,s,s);
    }

    // Base circular mask for eye color
    const eyeMaskLayer = document.createElement('canvas'); // Creates a canvas element to store the base iris mask (white circle representing the eye boundary)
    // Draws + clips the main mask
    const eyeMaskCtx = eyeMaskLayer.getContext('2d'); // Gets the 2D drawing context for the eyeMaskLayer to draw on it

    // Blurred copy of main mask
    const eyeMaskFeather = document.createElement('canvas'); // Creates a canvas for a blurred/feathered version of the iris mask for smooth edges
    // Blurs the main mask
    const eyeMaskFeatherCtx = eyeMaskFeather.getContext('2d'); // Gets the 2D drawing context for the eyeMaskFeather to apply blur effects

    // Eyelid cutout (white with transparent hole)
    const eyeCutLayer = document.createElement('canvas'); // Creates a canvas to store the eyelid shape that will be subtracted/cut from the iris
    // Draws and erases eyelid shape
    const eyeCutCtx = eyeCutLayer.getContext('2d'); // Gets the 2D drawing context for the eyeCutLayer to draw the eyelid polygon

    // Blurred eyelid mask
    const eyeCutFeather = document.createElement('canvas'); // Creates a canvas for a blurred version of the eyelid cutout for smooth transitions
    // Blurs eyelid mask edges
    const eyeCutFeatherCtx = eyeCutFeather.getContext('2d'); // Gets the 2D drawing context for the eyeCutFeather to apply blur effects to the eyelid mask

    // ensure mask/cut/feather canvases are sized and cleared
    function ensureMaskSize(size){
      const s = Math.max(16, Math.ceil(size));
      if (eyeMaskLayer.width !== s || eyeMaskLayer.height !== s){ eyeMaskLayer.width = s; eyeMaskLayer.height = s; }
      if (eyeMaskFeather.width !== s || eyeMaskFeather.height !== s){ eyeMaskFeather.width = s; eyeMaskFeather.height = s; }
      if (eyeCutLayer.width !== s || eyeCutLayer.height !== s){ eyeCutLayer.width = s; eyeCutLayer.height = s; }
      if (eyeCutFeather.width !== s || eyeCutFeather.height !== s){ eyeCutFeather.width = s; eyeCutFeather.height = s; }
      eyeMaskCtx.clearRect(0,0,s,s);
      eyeMaskFeatherCtx.clearRect(0,0,s,s);
      eyeCutCtx.clearRect(0,0,s,s);
      eyeCutFeatherCtx.clearRect(0,0,s,s);
    }

    const testCtx = document.createElement('canvas').getContext('2d');
    // detection for common compositing operations
    const BLEND_SUPPORT = {};

    ['multiply','screen','overlay','color','source-over','lighter'].forEach(m=>{
      try{ testCtx.globalCompositeOperation = m; BLEND_SUPPORT[m] = (testCtx.globalCompositeOperation === m); }
      catch(_){ BLEND_SUPPORT[m] = false; }
    });
    
    // pick a supported fallback for a requested blend mode
    function resolveBlendMode(requested){
      if (BLEND_SUPPORT[requested]) return requested;
      if (requested === 'color') return BLEND_SUPPORT['multiply'] ? 'multiply' : 'source-over';
      if (requested === 'overlay') return BLEND_SUPPORT['multiply'] ? 'multiply' : 'source-over';
      if (requested === 'screen') return BLEND_SUPPORT['lighter'] ? 'lighter' : 'source-over';
      return 'source-over';
    }

    // Landmark index constants to compute centers, radii, eyelid polygons
    const LEFT_IRIS_RING = [468,469,470,471];
    const LEFT_IRIS_CENTER = 472;
    const RIGHT_IRIS_RING = [473,474,475,476];
    const RIGHT_IRIS_CENTER = 477;
    const LEFT_EYE_UPPER = [159,158,157,173,133];
    const LEFT_EYE_LOWER = [145,144,163,7,33];
    const RIGHT_EYE_UPPER = [386,385,384,398,362]; 
    const RIGHT_EYE_LOWER = [374,373,390,249,263]; 

    // const RIGHT_EYE_LOWER = [374,381,380,374,263]; 
    
    // const RIGHT_EYE_UPPER = [386,385,384,398,263];
    // const RIGHT_EYE_LOWER = [374,380,381,382,362];



    // Show message to the user:
    // show status text and style
    function setStatus(msg, isOk = null) {
      statusEl.textContent = msg || '';
      statusEl.className = 'efw-status efw-small';
      if (isOk === true)  statusEl.className += ' efw-status-ok';
      if (isOk === false) statusEl.className += ' efw-status-bad';
    }
    // show animated loading text
    function setLoadingStatus(msg) {
      statusEl.innerHTML = msg + ' <span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span>';
      statusEl.className = 'efw-status efw-small';
    }
    // returns true if page is HTTPS or localhost
    function isSecureContext() {
      return location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    }

    // set main canvas to video size
    function updateCanvasSize() {
      const w = video.videoWidth || 640;
      const h = video.videoHeight || 480;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
      }
    }

    // simple pseudo-random helpers
    function fract(x){ return x - Math.floor(x); }
    function prand(seed){ return fract(Math.sin(seed*12.9898)*43758.5453); }

    // Blink/openness helpers:

    // Euclidean distance between points
    function dist(a,b){ return Math.hypot(a.x - b.x, a.y - b.y); }
    // canvas coords helper
    function pt(L,i){ return { x: L[i].x * canvas.width, y: L[i].y * canvas.height }; }
    // clamp between 0 and 1
    function clamp01(x){ return x < 0 ? 0 : (x > 1 ? 1 : x); }

    // Eye geometry & smoothing:

    // returns normalized openness = vertical distance / horizontal distance
    function eyeOpenness(L, upIdx, lowIdx, leftIdx, rightIdx) {
      const up = L[upIdx], low = L[lowIdx], l = L[leftIdx], r = L[rightIdx];
      if (!up || !low || !l || !r) return 1;
      return clamp01(dist(pt(L, upIdx), pt(L, lowIdx)) / Math.max(1, dist(pt(L, leftIdx), pt(L, rightIdx))));
    }

    // ease between a and b
    function smoothstep(a,b,x){ const t = Math.max(0, Math.min(1, (x - a)/(b - a))); return t*t*(3-2*t); }

    function calculateEyeCenter(landmarks, ringIndices, centerIdx) {
      const W = canvas.width, H = canvas.height;
      if (Number.isInteger(centerIdx) && landmarks[centerIdx]) {
        return { x: landmarks[centerIdx].x * W, y: landmarks[centerIdx].y * H };
      }
      let sumX = 0, sumY = 0, n = 0;
      for (const idx of ringIndices) {
        const p = landmarks[idx]; if (!p) continue;
        sumX += p.x * W; sumY += p.y * H; n++;
      }
      return { x: sumX / Math.max(1,n), y: sumY / Math.max(1,n) };
    }

    // average distance from ring points to center
    function calculateEyeRadius(center, landmarks, ringIndices) {
      let total = 0, n = 0, minD = Infinity;
      for (const idx of ringIndices) {
        const p = landmarks[idx]; if (!p) continue;
        const px = p.x * canvas.width, py = p.y * canvas.height;
        const d = Math.hypot(px - center.x, py - center.y);
        total += d; n++; if (d < minD) minD = d;
      }
      const avgRadius = total / Math.max(1,n);
      const safeByRing = isFinite(minD) ? (minD * REALISM.RING_MARGIN) : avgRadius;
      const base = Math.min(avgRadius * REALISM.SIZE_MULTIPLIER, safeByRing);
      return Math.max(REALISM.MIN_RADIUS, Math.min(REALISM.MAX_RADIUS, base));
    }

    // nudge center towards iris ring centroid and apply vertical offset (REALISM.CENTER_Y_OFFSET)
    function biasEyeCenter(centerRaw, radius, ringIndices, landmarks){
      let ax=0, ay=0, n=0;
      for (const idx of ringIndices){
        const p = landmarks[idx]; if (!p) continue;
        ax += p.x * canvas.width; ay += p.y * canvas.height; n++;
      }
      if (n>0){
        const avg = { x: ax/n, y: ay/n };
        const t = Math.max(0, Math.min(1, REALISM.CENTER_BLEND));
        centerRaw = { x: centerRaw.x + (avg.x - centerRaw.x)*t, y: centerRaw.y + (avg.y - centerRaw.y)*t };
      }
      const dy = (REALISM.CENTER_Y_OFFSET||0) * (radius||0);
      return { x: centerRaw.x, y: centerRaw.y + dy };
    }

    // convert landmark indices array to canvas-coordinate points
    function ptsFromIndices(landmarks, indices){
      const W = canvas.width, H = canvas.height;
      const pts = [];
      for (const i of indices){
        const p = landmarks[i];
        if (p) pts.push({x: p.x*W, y: p.y*H});
      }
      return pts;
    }
    
    // builds combined polygon (upper + reversed lower)
    function buildEyeClip(landmarks, upperIdx, lowerIdx){
      const up = ptsFromIndices(landmarks, upperIdx);
      const low = ptsFromIndices(landmarks, lowerIdx);
      if (up.length < 2 || low.length < 2) return null;
       return up.concat(low); 
    }

    // decide whether a detected center is left or right eye by comparing to currentEyes centers
    function getEyeSide(center){
      if (!currentEyes.left && !currentEyes.right) return null;
      const dl = currentEyes.left ? Math.hypot(center.x-currentEyes.left.center.x, center.y-currentEyes.left.center.y) : Infinity;
      const dr = currentEyes.right? Math.hypot(center.x-currentEyes.right.center.x, center.y-currentEyes.right.center.y) : Infinity;
      return (dl <= dr) ? 'left' : 'right';
    }

    // blend eyelid polygon points across frames
    function smoothPoly(prev, next){
      if (!next) return null;
      if (!prev) return next;
      const t = 1 - REALISM.SMOOTHING;
      const m = Math.min(prev.length, next.length);
      const out = [];
      for (let i=0; i<m; i++){
        const a = prev[i], b = next[i];
        out.push({ x: a.x + (b.x - a.x)*t, y: a.y + (b.y - a.y)*t });
      }
      for (let i=m; i<next.length; i++) out.push(next[i]);
      return out;
    }

    // TODO - check here for bug ("paintEye & drawShading")
    // - make the iris as is is and not always round
   
   // Main routine that composes everything and draws the resulting
   // colored iris onto the main canvas at given center:
   // calculates r (shrunk iris radius) and S (working size),
   // ensures layers sized,
   // builds mask (circular + eyelid cut via buildEyelidMask),
   // draws the color into eyeColorLayer (drawColor),
   // uses destination-in compositing to apply mask to eyeColorLayer and eyeShadeLayer,
   
   // on main ctx: set composite operations and draw the image layers:
   // eyeColorLayer (base), then screen blend of eyeColorLayer
   // for fill boost, then overlay blend of eyeShadeLayer for shading.
   // Note: lots of commented experimental code for shading, fibers,
   // highlights—currently most shading is commented out; this is
   // where the shadows may originate depending on which parts are enabled.

    function paintEye(center, radius, color, alpha, blendMode) {
      if (!center || !radius || radius < 3) return;
      const r = Math.max(REALISM.MIN_RADIUS, Math.min(REALISM.MAX_RADIUS, radius * REALISM.IRIS_SHRINK));
      const S = Math.ceil(r*2 + 4);
      ensureEyeLayersSize(S);

      const sideForMask = getEyeSide(center);
      const lidPoly = sideForMask && currentEyelids[sideForMask] ? currentEyelids[sideForMask] : null;
     
      ensureMaskSize(S);

// the eyeMaskCtx.globalCompositeOperation = ''

// source-over
// destination-over
// clear
// copy
// 
// destination-in
// destination-out
// source-in
// source-out
// destination-atop
// source-atop

    // eyeMaskLayer eyeMaskCtx eyeMaskFeather eyeMaskFeatherCtx eyeCutLayer eyeCutCtx eyeCutFeather eyeCutFeatherCtx

      // clear flow used in current buildMask
      // 1. Create eyeCutLayer: fill white full-rect, then destination-out the eyelid polygon so eyelid area becomes transparent (makes a cutout)
      // 2.Blur that cut in eyeCutFeather (eyeCutFeatherCtx.filter blur)
      // 3. Draw the feathered cut onto eyeMaskCtx with globalCompositeOperation = 'destination-out' to subtract the eyelid area from the main mask. This is the step that both clips and creates soft edges
      // commented parts show experiments with globalAlpha to control clip strength

      function buildEyelidMask(ctx, lidPoly, center, S){

        // 1️⃣  Create eyelid cut mask (no shadows)    
          eyeCutCtx.save();
          // eyeCutCtx.clearRect(0,0,S,S);
          eyeCutCtx.translate(S/2, S/2);
      
      // `````
      // TODO - The problem is here

          // White background — this defines the area that will be clipped out (square)
          eyeCutCtx.fillStyle = 'rgba(255,255,255,1)';
          eyeCutCtx.fillRect(-S/2, -S/2, S, S);

          // Subtract the eyelid polygon area (cutout)
          eyeCutCtx.globalCompositeOperation = 'destination-out';
          // eyeCutCtx.globalCompositeOperation = 'destination-in';

          eyeCutCtx.beginPath();
          eyeCutCtx.moveTo(lidPoly[0].x - center.x, lidPoly[0].y - center.y);
         
          for (let i=1;i<lidPoly.length;i++){
            const p = lidPoly[i];
            eyeCutCtx.lineTo(p.x - center.x, p.y - center.y);
          }
          eyeCutCtx.closePath();
          eyeCutCtx.fill();

      // `````
          eyeCutCtx.restore();

          // 2️⃣ Light feather (very subtle blur just for soft edges)
          eyeCutFeatherCtx.save();
          eyeCutFeatherCtx.clearRect(0,0,S,S);
          
          // making 2 shadows 
          try { eyeCutFeatherCtx.filter = `blur(${EYELID_MASK.BLUR_PX}px)`; } catch(_) {}

          // // TODO if I delete this so no shadow, but no clip...
          eyeCutFeatherCtx.drawImage(eyeCutLayer, 0, 0);
          try { eyeCutFeatherCtx.filter = 'none'; } catch(_) {}
          eyeCutFeatherCtx.restore();


          // 3️⃣ Apply to the mask — this part clips the color filter
          eyeMaskCtx.save();
          eyeMaskCtx.globalCompositeOperation = 'destination-out';
          // eyeMaskCtx.globalCompositeOperation = 'destination-in';


     
          // ↓ Control clip strength here (1 = full clip, 0 = none) // 1 - 0.5 - 0.9
          // eyeMaskCtx.globalAlpha = Math.max(0, Math.min(1, EYELID_MASK.CLIP_STRENGTH)); 
 
          
          eyeMaskCtx.drawImage(eyeCutFeather, 0, 0);
          eyeMaskCtx.restore();
      }

      
      // Draw source into ctx with blur filter for feathered mask
      function applyFeather(ctx, sourceCanvas, blurPx, S) {        
        ctx.save();
        // ctx.clearRect(0, 0, S, S);
        // try { ctx.filter = `blur(${blurPx}px)`; } catch (_) {}
        ctx.drawImage(sourceCanvas, 0, 0);
        try { ctx.filter = 'none'; } catch (_) {}
        ctx.restore();
      }


/*
Step	Purpose
1	    Create base circular mask
2	    If eyelid active, build a cut shape
3	    Erase that shape from mask
4	    Blur the edges for realism
5	    Apply to main eye mask with adjustable strength
6	    Feather the final result
*/

      // TODO - at the end when I finish compress the files like in vit - minifite 

      // constructs the final iris mask that combines circular base and eyelid cut if enabled
      // 1. draw circular base into eyeMaskCtx
      // 2. if eyelid mask enabled and lidPoly exists, call buildEyelidMask (which creates a cut and subtracts it)
      // 3. feather the eyeMaskLayer into eyeMaskFeather


      // בין פריים לפריים תרשום איזה פיל עשית בקודם
      // about clear rect 
      // make it not to make always as a circle
      // the problem is in the mask
      // change the polygon 

      // draw something else instead of CIRCLE

      // comment code that don't have an effect

      // TODOs:
      // - comment code that don't have an effect 
      // - understand where I get the dots in the code
      // - draw not as a circle but as it should be in the  

      (function buildMask(){

        // TODO - check each line and do try and error
        // until you will have a color with clip

        // control the code, if you want to draw a specific dots 
        // (when I do X then Y happens)
        
        // always change one thing and check (Never multiple) 

        // Create a circular white mask base
          eyeMaskCtx.save();
          eyeMaskCtx.clearRect(0,0,S,S);
          eyeMaskCtx.translate(S/2, S/2);
          eyeMaskCtx.beginPath();

          // create a circular base mask
          eyeMaskCtx.arc(0, 0, r, 0, 2 * Math.PI); // make it circle
          // eyeMaskCtx.fillStyle = '#fff';
          eyeMaskCtx.fill();
          
          eyeMaskCtx.restore();


        // Check if eyelid masking should happen
          if (EYELID_MASK.ENABLED && lidPoly && lidPoly.length >= 3){

            // the shadows are creating here
            buildEyelidMask(eyeCutCtx, lidPoly, center, S)

            }
          // Apply final feathering to the mask itself
          applyFeather(eyeMaskFeatherCtx, eyeMaskLayer, 1.2, S);

      })();



      
  
      // draw the color into eyeColorCtx
      (function drawColor(){

      // eyeColorCtx:
      // clip to circle, set globalAlpha = alpha, fill with selected color
      // punch pupil hole via destination-out with radius r * PUPIL_RATIO
     
        const cx = eyeColorCtx;
        cx.save();
        cx.clearRect(0,0,S,S);
        cx.translate(S/2, S/2);
       
        // Clip circle
        cx.beginPath(); cx.arc(0,0,r,0,Math.PI*2); cx.closePath(); cx.clip();
        cx.globalCompositeOperation = 'source-over';
        cx.globalAlpha = Math.min(1, alpha);
        cx.fillStyle = color;
        cx.fillRect(-r, -r, r*2, r*2);

        // Punch hole for pupil
        cx.globalCompositeOperation = 'destination-out';
        cx.globalAlpha = 1;
        cx.beginPath(); cx.arc(0,0, Math.max(2, r*REALISM.PUPIL_RATIO), 0, Math.PI*2);
        cx.fill();
        
        cx.restore();
      })();

      // After drawColor, apply eyeMaskFeather to both eyeColorCtx and eyeShadeCtx by setting
      // globalCompositeOperation = 'destination-in' and drawImage(eyeMaskFeather).
      // This ensures color & shade appear only inside the feathered mask

      // Apply the masks
      eyeColorCtx.globalCompositeOperation = 'destination-in'; // Both the color and the shading will appear only within the eye shape.
      eyeColorCtx.drawImage(eyeMaskFeather, 0, 0);
      eyeShadeCtx.globalCompositeOperation = 'destination-in';
      eyeShadeCtx.drawImage(eyeMaskFeather, 0, 0);

      ctx.save();


      // Draw the iris filter layers
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = resolveBlendMode(blendMode);
      ctx.drawImage(eyeColorLayer, center.x - S/2, center.y - S/2);

      ctx.globalCompositeOperation = resolveBlendMode('screen');
      ctx.globalAlpha = REALISM.FILL_BOOST_ALPHA * alpha;
      ctx.drawImage(eyeColorLayer, center.x - S/2, center.y - S/2);

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = resolveBlendMode('overlay');
      ctx.drawImage(eyeShadeLayer, center.x - S/2, center.y - S/2);
      ctx.restore();
    }

    // Get the face points from the video and calculate the eye position in each frame
    function onFaceMeshResults(results) {

      // Explanation:
      // if no face landmarks: reset currentEyes and return.
      // compute openL/openR via eyeOpenness,
      // build eyelid polygons for left/right via buildEyeClip and smooth them,
      // compute left/right iris centers and radii,
      // bias centers, build next states for left/right (center, radius, open),
      // smooth into currentEyes.left/right (so the overlay is not jumpy).

      // If no faces are found, reset the eye state and exit the function
      if (!results.multiFaceLandmarks || !results.multiFaceLandmarks.length) {
        currentEyes = { left: null, right: null };
        return;
      }

      const landmarks = results.multiFaceLandmarks[0];
      // TODO - delete debug functions
    // debug_drawAllLandmarks draws dots + indices on the main canvas
    // debug_drawAllLandmarks(ctx, landmarks, { showIndex: true, color: '#ff0000', size: 2 });

    // debug_logLandmarks(landmarks); // uncomment to print coordinates to console
      // debug_drawIndices(ctx, landmarks, RIGHT_EYE_LOWER);
      // debug_getKnownEyeIndices();

    // BUG - this is for the bug when the hand in front of eye doesn't remove color filter 
    // Check if iris landmarks are detected (not occluded)
    // leftIrisDetected = landmarks[LEFT_IRIS_CENTER] && landmarks[LEFT_IRIS_CENTER].z > -0.2;
    // rightIrisDetected = landmarks[RIGHT_IRIS_CENTER] && landmarks[RIGHT_IRIS_CENTER].z > -0.2;

      if (DEBUG_SHOW_RIGHT_EYE) {
        const lists = debug_getRightEyeLandmarkLists(landmarks, 48); // adjust radiusPx if needed
        if (lists) {
          // // print a compact table of indices + coords
          // const out = [];
          // for (const i of (new Set([].concat(lists.known, lists.nearCenter, lists.insideEyelid)))) {
          //   if (!lists.coords[i]) continue;
          //   out.push({ index: i, x: Math.round(lists.coords[i].x), y: Math.round(lists.coords[i].y), z: lists.coords[i].z,
          //              nearCenter: lists.nearCenter.includes(i), insideEyelid: lists.insideEyelid.includes(i), known: lists.known.includes(i) });
          // }
          // console.table(out);
          // // draw on canvas (visual)
          // debug_drawRightEyeLandmarks(ctx, lists, { showIndex: true });
        }
        // console.table(lists.nearCenter)
      }
           
     const leftUpIdx = LEFT_EYE_UPPER[0];
     const leftLowIdx = LEFT_EYE_LOWER[0];
     const leftLeftIdx = LEFT_EYE_LOWER[LEFT_EYE_LOWER.length -1];
     const leftRightIdx = LEFT_EYE_UPPER[LEFT_EYE_UPPER.length -1];
     
     const rightUpIdx = RIGHT_EYE_UPPER[0];
     const rightLowIdx = RIGHT_EYE_LOWER[0];
     const rightLeftIdx = RIGHT_EYE_LOWER[RIGHT_EYE_LOWER.length -1];
     const rightRightIdx = RIGHT_EYE_UPPER[RIGHT_EYE_UPPER.length -1];

      // Calculate how open the eyes are
      const openL = eyeOpenness(landmarks, leftUpIdx, leftLowIdx, leftLeftIdx, leftRightIdx);
      const openR = eyeOpenness(landmarks, rightUpIdx, rightLowIdx, rightLeftIdx, rightRightIdx);
      //            eyeOpenness(L, upIdx, lowIdx, leftIdx, rightIdx)
      
      // const openR = eyeOpenness(landmarks, rightUpIdx, rightLowIdx, rightLeftIdx, rightRightIdx);

      const leftRawPoly  = buildEyeClip(landmarks, LEFT_EYE_UPPER, LEFT_EYE_LOWER);
      const rightRawPoly = buildEyeClip(landmarks, RIGHT_EYE_UPPER, RIGHT_EYE_LOWER);
      currentEyelids.left  = smoothPoly(currentEyelids.left,  leftRawPoly);
      currentEyelids.right = smoothPoly(currentEyelids.right, rightRawPoly);

      const lerp = (a,b,t)=> a + (b-a)*t;

      // Calculate the center and radius of the iris in both eyes
      const leftCenterRaw  = calculateEyeCenter(landmarks, LEFT_IRIS_RING, LEFT_IRIS_CENTER);
      const leftRadiusRaw  = calculateEyeRadius(leftCenterRaw, landmarks, LEFT_IRIS_RING);
      const rightCenterRaw = calculateEyeCenter(landmarks, RIGHT_IRIS_RING, RIGHT_IRIS_CENTER);
      const rightRadiusRaw = calculateEyeRadius(rightCenterRaw, landmarks, RIGHT_IRIS_RING);

      // smooth per-eye center/radius/open values using REALISM.SMOOTHING
      function smooth(prev, next){
        if (!prev) return next;
        const t = 1 - REALISM.SMOOTHING;
        return {
          center: { x: lerp(prev.center.x, next.center.x, t), y: lerp(prev.center.y, next.center.y, t) },
          radius: lerp(prev.radius, next.radius, t),
          open:   clamp01((prev.open ?? next.open ?? 0) + ((next.open ?? 0) - (prev.open ?? 0)) * t)
        };
      }

      // Correct the center position with a function that also takes into account slight tilts of the eye
      const leftCenter = biasEyeCenter(leftCenterRaw, leftRadiusRaw, LEFT_IRIS_RING, landmarks);
      const rightCenter = biasEyeCenter(rightCenterRaw, rightRadiusRaw, RIGHT_IRIS_RING, landmarks);

      // Create the new values ​​(for the current prime) of each eye: center, radius, opening size
      const leftNext  = { center: leftCenter,  radius: leftRadiusRaw,  open: openL };
      const rightNext = { center: rightCenter, radius: rightRadiusRaw, open: openR };

      currentEyes = {
        left:  currentEyes.left  ? smooth(currentEyes.left,  leftNext)  : leftNext,
        right: currentEyes.right ? smooth(currentEyes.right, rightNext) : rightNext
      };
    }

    // Handles video frames
    async function processVideoFrame() {

    // Explanation:
    // 1. returns early if not running or video not ready, otherwise draws current video frame to canvas.
    // 2. sends the video frame to faceMesh.send({image: video})
    // (FaceMesh will call onFaceMeshResults asynchronously).
    // 3. reads color & alpha from UI, calculates blink gates per
    // eye using smoothstep and BLINK thresholds, multiplies
    // alpha by gate to fade when closing.
    // 4. calls paintEye for left/right if alpha>threshold and eye data present.
    // 5. requests next animation frame while running.

      if (!running || !video.videoWidth || !video.videoHeight) {
        if (running) animationId = requestAnimationFrame(processVideoFrame);
        return;
      }

      // Preparing the canvas and drawing the video on it
      updateCanvasSize();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Sending the frame to the FaceMesh model
      if (faceMesh) {
        try { await faceMesh.send({ image: video }); } catch (_) {}
      }

      // Retrieve color and transparency settings
      const alpha = parseInt(alphaInp.value, 10) / 100;
      const color = colorInp.value;

      // Check eye condition and draw them
      if (alpha > 0 && currentEyes) {

        // Calculate how long each eye is open
        const gateL = currentEyes.left  ? smoothstep(BLINK.T0, BLINK.T1, (currentEyes.left.open  ?? 0))  : 0;
        const gateR = currentEyes.right ? smoothstep(BLINK.T0, BLINK.T1, (currentEyes.right.open ?? 0)) : 0;

        // Generate customized transparency
        const alphaL = alpha * gateL;
        const alphaR = alpha * gateR;

        // Draws a color/effect on the pupil
        if (alphaL > 0.01 && currentEyes.left ){
         paintEye(currentEyes.left.center,  currentEyes.left.radius,  color, alphaL, blendMode);
        }

        if (alphaR > 0.01 && currentEyes.right ){
          paintEye(currentEyes.right.center, currentEyes.right.radius, color, alphaR, blendMode);
        }

        // BUG - this is for the bug when the hand in front of eye doesn't remove color filter 

        // if (alphaL > 0.01 && currentEyes.left && leftIrisDetected){
        //  paintEye(currentEyes.left.center,  currentEyes.left.radius,  color, alphaL, blendMode);
        // }
        
        // if (alphaR > 0.01 && currentEyes.right && rightIrisDetected){
        //   paintEye(currentEyes.right.center, currentEyes.right.radius, color, alphaR, blendMode);
        // }
        // debug_drawEyelids(ctx, currentEyes, currentEyelids)

        
//         if (currentEyes.left && currentEyelids.left) {
//   ctx.strokeStyle = '#00FF00';
//   ctx.lineWidth = 1;
//   ctx.beginPath();
//   ctx.moveTo(currentEyelids.left[0].x, currentEyelids.left[0].y);
//   for (let i = 1; i < currentEyelids.left.length; i++) {
//     ctx.lineTo(currentEyelids.left[i].x, currentEyelids.left[i].y);
//   }
//   ctx.closePath();
//   ctx.stroke();
// }

// ctx.fillStyle = '#FF0000';
// for (const pt of currentEyelids.left) {
//   ctx.beginPath();
//   ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
//   ctx.fill();
// }
      }

      if (running) animationId = requestAnimationFrame(processVideoFrame);

      
    }

    // Loads and prepares the face recognition model
    async function initializeFaceMesh() {
      // Explanation:
      // 1. verifies FaceMesh exists, creates new FaceMesh with
      // locateFile pointing to CDN, sets options (maxNumFaces,
      // refineLandmarks, confidence thresholds), attaches
      // onResults handler, and initialize if available.
      // 2. returns true if successful, otherwise sets error status.

      try {
        setLoadingStatus('מאתחל זיהוי פנים');

        // If the directory does not exist, throws an error
        if (typeof FaceMesh === 'undefined') throw new Error('MediaPipe FaceMesh לא נטען');

        // Creates FaceMesh, and tells it where to load the necessary files (CDN)
        faceMesh = new FaceMesh({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });

        faceMesh.setOptions({
          maxNumFaces: 1, // Recognizes the face of one person
          refineLandmarks: true, // Higher accuracy (including pupils and lips)
          minDetectionConfidence: 0.5, // Minimum confidence threshold for detection
          minTrackingConfidence: 0.5 // Minimum confidence threshold for face tracking
        });

        faceMesh.onResults(onFaceMeshResults);
        if (typeof faceMesh.initialize === 'function') await faceMesh.initialize();

        return true;
      } catch (error) {
        setStatus('שגיאה באתחול זיהוי פנים: ' + (error.message || error), false);
        return false;
      }
    }

    async function startCamera() {
      // Explanation:
      // 1. checks secure context and getUserMedia support,
      // 2. calls getUserMedia with ideal width/height/framerate, facingMode: 'user',
      // 3. attaches stream to video, awaits video.ready, calls initializeFaceMesh, sets running = true, updates UI classes and buttons, starts processVideoFrame loop.
      // 4. error handling: stops tracks and reports messages.
      try {
        // Security testing and support
        if (!isSecureContext()) { setStatus('דרוש HTTPS או localhost לגישה למצלמה', false); return; }
        if (!navigator.mediaDevices?.getUserMedia) { setStatus('הדפדפן לא תומך בגישה למצלמה', false); return; }

        // Update status and prepare buttons
        btnStartCenter.disabled = true;
        setLoadingStatus('מבקש גישה למצלמה');

        // Request access to the camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user', // Front camera (selfie)
            // Ideal quality and frame settings
            width:  { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            frameRate: { ideal: 30, max: 60 }
          },
          audio: false
        }
      );

        // Connecting the video to the browser
        video.srcObject = stream;
        await new Promise((resolve, reject) => {
          video.onloadedmetadata = resolve;
          video.onerror = reject;
          setTimeout(() => reject(new Error('Timeout loading video')), 10000);
        });
        await video.play();

        // Make sure the video is loaded and the camera is working
        const ok = await initializeFaceMesh();
        if (!ok) throw new Error('Failed to initialize FaceMesh');

        running = true;

        // Show that the camera is working
        wrapEl.classList.add('camera-running');
        btnStop.disabled = false;

        setStatus('המצלמה פועלת - זיהוי פנים פעיל', true);
        processVideoFrame();

      } catch (error) {
        let msg = 'שגיאה בהפעלת המצלמה: ';
        if (error.name === 'NotAllowedError') msg += 'הרשאה נדחתה - יש לאפשר גישה למצלמה';
        else if (error.name === 'NotFoundError') msg += 'מצלמה לא נמצאה במכשיר';
        else if (error.name === 'NotReadableError') msg += 'המצלמה בשימוש או לא זמינה';
        else msg += (error.message || 'שגיאה לא ידועה');

        setStatus(msg, false);
        btnStartCenter.disabled = false;
        if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
        running = false;
      }
    }

    // Turns off the camera, stops drawing loops, clears the canvas and UI
    function stopCamera() {
      // Explanation:
      // 1. stops loop, stops stream tracks, clears video.srcObject, resets currentEyes and canvas, updates UI and status.

      try {
        running = false; // Indicates that the system is no longer running
        if (animationId) { cancelAnimationFrame(animationId); animationId = null; }
        if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
        video.srcObject = null; // Clears the video source
        currentEyes = { left: null, right: null }; // Resets eye information (no longer recognized)
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Removes classics indicating that the camera is active or the palette is open
        wrapEl.classList.remove('camera-running');
        wrapEl.classList.remove('palette-open');
        btnStartCenter.disabled = false;
        btnStop.disabled = true;
        
        setStatus('לחץ על "הפעל מצלמה" להתחלה');
      } catch (_) {}
    }


   // UI bindings:

   // Buttons: btnStartCenter -> startCamera, btnStop -> stopCamera.
   // colorInp input -> updates palette background and tag, removes active chips.
   // chips click -> sets colorInp, activates chip, closes palette.
   // alphaInp input -> updates displayed alpha value.
   // btnCapture -> snapshotAndDownload: exports canvas to PNG and triggers download.


    btnStartCenter.addEventListener('click', startCamera); 
    btnStop.addEventListener('click', stopCamera);
    colorInp.addEventListener('input', () => {
      document.querySelectorAll('.efw-chip').forEach(c => c.classList.remove('active'));
      setWrapBgFromColor(colorInp.value);
      updateColorTag();
    });

    document.querySelectorAll('.efw-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        colorInp.value = chip.dataset.color;
        document.querySelectorAll('.efw-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        setWrapBgFromColor(colorInp.value);
        updateColorTag();

        // Automatically close the panel after selecting a color
        if (wrapEl && fabBtn && pal){
          wrapEl.classList.remove('palette-open');
          fabBtn.setAttribute('aria-expanded','false');
          pal.setAttribute('aria-hidden','true');
        }
      });
    });
    
    // Changes the text that displays the transparency value according to the slider 
    alphaInp.addEventListener('input', () => { alphaVal.textContent = alphaInp.value; });
 
    
    //  Start updated UI 
  
    function snapshotAndDownload(){
      try{
        const pad = (n)=> String(n).padStart(2,'0');
        const d = new Date();
        const fname = `eye-filter-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.png`;
        if (canvas.toBlob){
          canvas.toBlob((blob)=>{
            if(!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = fname; document.body.appendChild(a);
            a.click();
            setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 0);
          }, 'image/png');
        } else {
          const url = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = url; a.download = fname; document.body.appendChild(a);
          a.click(); a.remove();
        }
      }catch(err){
        setStatus('שגיאה בצילום/הורדה', false);
      }
    }
    if (btnCapture){ btnCapture.addEventListener('click', snapshotAndDownload); }
 //  End updated UI  

  })();