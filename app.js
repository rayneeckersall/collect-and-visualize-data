// ---------- State ----------
const state = {
  mode: "physical", // "physical" | "audio" | "compare"
  tab: "overview",
  lastFocusedChartId: "booksChart",
  zoom: {
    prefChart: 1,
    booksChart: 1,
    timelineChart: 1,
    eduChart: 1,
    ageChart: 1,
  },
  spotlight: {
    prefChart: false,
    booksChart: false,
    timelineChart: false,
    eduChart: false,
    ageChart: false,
  }
};

// ---------- Helpers ----------
const $ = (q) => document.querySelector(q);
const $$ = (q) => Array.from(document.querySelectorAll(q));

function swapImg(id, src){
  const img = document.getElementById(id);
  if (!img) return;

  img.style.transition = "opacity 150ms ease";
  img.style.opacity = "0";

  setTimeout(() => {
    img.src = src;
    img.onload = () => (img.style.opacity = "1");
  }, 150);
}

// ---------- Interactive Preference Pie ----------
const PREF_DATA = [
  { key: "Physical Book", label: "Physical Books", votes: 201 },
  { key: "Audiobook",     label: "Audiobooks",     votes: 38  },
  { key: "E-Book",        label: "E-Books",        votes: 56  },
];

function polarToCartesian(cx, cy, r, angleDeg){
  const a = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function arcPath(cx, cy, r, startAngle, endAngle){
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end   = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`,
    "Z"
  ].join(" ");
}

function getPrefAccent(mode){
  if (mode === "audio") return "#5a6ea5";
  if (mode === "physical") return "#b26a6a";
  return "rgba(31,36,48,.75)"; // compare fallback
}

function getDefaultKey(mode){
  if (mode === "audio") return "Audiobook";
  if (mode === "physical") return "Physical Book";
  return null; // compare: no default highlight
}

function renderPreferencePie(mode){
  const host = document.getElementById("prefPie");
  const tip  = document.getElementById("prefPieTip");
  if (!host || !tip) return;

  const total = PREF_DATA.reduce((s,d)=>s + d.votes, 0);
  const accent = getPrefAccent(mode);
  const defaultKey = getDefaultKey(mode);

  // Center text based on mode
  let centerMain = "Format";
  let centerSub = "hover slices";

  if (mode === "audio") {
    const d = PREF_DATA.find(x => x.key === "Audiobook");
    const pct = ((d.votes / total) * 100).toFixed(0);
    centerMain = `${pct}%`;
    centerSub = "prefer audiobooks";
  }

  if (mode === "physical") {
    const d = PREF_DATA.find(x => x.key === "Physical Book");
    const pct = ((d.votes / total) * 100).toFixed(0);
    centerMain = `${pct}%`;
    centerSub = "prefer physical";
  }

  // greys for non-highlighted slices
  const greys = ["rgba(31,36,48,.18)", "rgba(31,36,48,.28)", "rgba(31,36,48,.38)"];

  // compute angles
  let angle = 0;
  const size = 520;
  const cx = size/2, cy = size/2;
  const r = 185;

  const slicesMarkup = PREF_DATA.map((d, i) => {
    const pct = total ? (d.votes / total) * 100 : 0;
    const sweep = (pct / 100) * 360;
    const start = angle;
    const end = angle + sweep;
    angle = end;

    const isDefault = defaultKey && d.key === defaultKey;
    const fill = isDefault ? accent : greys[i % greys.length];

    return `
      <path class="pie-slice"
        data-key="${d.key}"
        data-label="${d.label}"
        data-votes="${d.votes}"
        data-pct="${pct.toFixed(1)}"
        fill="${fill}"
        d="${arcPath(cx, cy, r, start, end)}"></path>
    `;
  }).join("");

  // Build the SVG
  host.innerHTML = `
    <svg viewBox="0 0 ${size} ${size}" role="img" aria-label="Format preference pie chart">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(31,36,48,.06)"></circle>

      ${slicesMarkup}

      <!-- donut hole -->
      <circle cx="${cx}" cy="${cy}" r="88" fill="white"></circle>

      <text x="${cx}" y="${cy-6}" text-anchor="middle"
            font-size="26" font-weight="800" fill="${accent}">
        ${centerMain}
      </text>

      <text x="${cx}" y="${cy+18}" text-anchor="middle"
            font-size="13" fill="rgba(31,36,48,.55)">
        ${centerSub}
      </text>
    </svg>
  `;

  const slices = host.querySelectorAll(".pie-slice");

  function applyHighlight(activeKey){
    slices.forEach((p, i) => {
      const key = p.dataset.key;

      if (!activeKey){
        p.setAttribute("fill", greys[i % greys.length]);
        p.style.opacity = "1";
        return;
      }

      if (key === activeKey){
        p.setAttribute("fill", accent);
        p.style.opacity = "1";
      } else {
        p.setAttribute("fill", greys[i % greys.length]);
        p.style.opacity = "0.95";
      }
    });
  }

  // default highlight
  applyHighlight(defaultKey);

  // tooltip + hover highlight
  slices.forEach((p) => {
    p.addEventListener("mousemove", (e) => {
      const label = p.dataset.label;
      const votes = p.dataset.votes;
      const pct   = p.dataset.pct;

      tip.textContent = `${label}: ${votes} votes (${pct}%)`;
      tip.style.display = "block";
      tip.style.left = (e.clientX + 12) + "px";
      tip.style.top  = (e.clientY + 12) + "px";

      applyHighlight(p.dataset.key);
    });

    p.addEventListener("mouseleave", () => {
      tip.style.display = "none";
      applyHighlight(defaultKey);
    });
  });
}
function renderPreferencePieCompare(){
  const host = document.getElementById("comparePrefPie");
  const tip  = document.getElementById("comparePrefPieTip");
  if (!host || !tip) return;

  const total = PREF_DATA.reduce((s,d)=>s + d.votes, 0);

  const size = 520;
  const cx = size/2, cy = size/2;
  const r = 185;

  // Compare colors: BOTH highlighted at once
  const BLUE = "#5a6ea5";   // audiobook
  const RED  = "#b26a6a";   // physical
  const GREYS = ["rgba(31,36,48,.18)", "rgba(31,36,48,.28)", "rgba(31,36,48,.38)"];

  const fillFor = (key, i) => {
    if (key === "Audiobook") return BLUE;
    if (key === "Physical Book") return RED;
    return GREYS[i % GREYS.length]; // E-Book
  };

  // build slices
  let angle = 0;
  const slicesMarkup = PREF_DATA.map((d, i) => {
    const pct = total ? (d.votes / total) * 100 : 0;
    const sweep = (pct / 100) * 360;
    const start = angle;
    const end = angle + sweep;
    angle = end;

    return `
      <path class="pie-slice"
        data-key="${d.key}"
        data-label="${d.label}"
        data-votes="${d.votes}"
        data-pct="${pct.toFixed(1)}"
        fill="${fillFor(d.key, i)}"
        d="${arcPath(cx, cy, r, start, end)}"></path>
    `;
  }).join("");

  host.innerHTML = `
    <svg viewBox="0 0 ${size} ${size}" role="img" aria-label="Format preference comparison donut">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(31,36,48,.06)"></circle>

      ${slicesMarkup}

      <!-- donut hole -->
      <circle cx="${cx}" cy="${cy}" r="92" fill="white"></circle>

      <text x="${cx}" y="${cy-6}" text-anchor="middle"
            font-size="16" font-weight="900" fill="rgba(31,36,48,.85)">
        Format Preference
      </text>
      <text x="${cx}" y="${cy+18}" text-anchor="middle"
            font-size="12" fill="rgba(31,36,48,.55)">
        hover slices for details
      </text>
    </svg>
  `;

  const slices = host.querySelectorAll(".pie-slice");

  // Hover interaction: “pop” slice + tooltip
  slices.forEach((p) => {
    p.addEventListener("mousemove", (e) => {
      const label = p.dataset.label;
      const votes = Number(p.dataset.votes);
      const pct   = p.dataset.pct;

      // richer tooltip text
      tip.innerHTML = `${label}<br><b>${votes}</b> votes • <b>${pct}%</b>`;
      tip.style.display = "block";
      tip.style.left = (e.clientX + 12) + "px";
      tip.style.top  = (e.clientY + 12) + "px";

      // subtle emphasis on hover: add a stroke + slightly higher opacity
      slices.forEach(s => {
        s.style.opacity = (s === p) ? "1" : "0.92";
        s.style.filter = (s === p) ? "brightness(1.03)" : "none";
        s.setAttribute("stroke", (s === p) ? "rgba(31,36,48,.25)" : "transparent");
        s.setAttribute("stroke-width", (s === p) ? "2" : "0");
      });
    });

    p.addEventListener("mouseleave", () => {
      tip.style.display = "none";
      slices.forEach((s) => {
        s.style.opacity = "1";
        s.style.filter = "none";
        s.setAttribute("stroke", "transparent");
        s.setAttribute("stroke-width", "0");
      });
    });
  });
}



// ---------- Interactive Books Read Bar ----------
const BOOKS_READ_DATA = [
  { key: "Audiobook", label: "Audiobook group", value: 13.270 },
  { key: "Physical Book", label: "Physical book group", value: 18.539 },
];

function getDefaultBarKey(mode){
  if (mode === "audio") return "Audiobook";
  if (mode === "physical") return "Physical Book";
  return null;
}

function renderAgeViz(mode){
  const host = document.getElementById("ageViz");
  const tip  = document.getElementById("ageTip");
  if (!host || !tip) return;

  const accent = getPrefAccent(mode);
  const defaultKey =
    mode === "audio" ? "Audiobook" :
    mode === "physical" ? "Physical Book" :
    null;

  const greyA = "rgba(31,36,48,.22)";
  const greyB = "rgba(31,36,48,.32)";

  // scale range for the gauge
  const MIN = 18;
  const MAX = 65;

  let data = [];

if (mode === "audio") {
  data = [{ key: "Audiobook", label: "Audiobook users", value: 45 }];
} else if (mode === "physical") {
  data = [{ key: "Physical Book", label: "Physical book users", value: 47 }];
} else {
  // Compare mode: show nothing for now (or later: show both)
  data = [];
}

if (data.length === 0) {
  host.innerHTML = `
    <div style="padding:12px; color: rgba(31,36,48,.55); font-size:13px;">
      Switch to Audiobook or Physical to view age.
    </div>
  `;
  return;
}

  const pct = (v) => {
    const clamped = Math.max(MIN, Math.min(MAX, v));
    return (clamped - MIN) / (MAX - MIN); // 0..1
  };

  // ring settings
  const size = 260;
  const cx = size/2, cy = size/2;
  const r = 86;
  const stroke = 18;
  const C = 2 * Math.PI * r;

  host.innerHTML = data.map((d, i) => {
    const isDefault = defaultKey && d.key === defaultKey;
    const mainColor = isDefault ? accent : (i === 0 ? greyA : greyB);

    const p = pct(d.value);
    const dash = (C * p).toFixed(1);
    const gap = (C - C * p).toFixed(1);

    return `
      <div class="ageCol ageRing" data-key="${d.key}" data-label="${d.label}" data-value="${d.value}">
        <div class="ageLabel">
          <div class="name">${d.key === "Audiobook" ? "Audiobooks" : "Physical"}</div>
          <div class="val"><span class="num">${d.value}</span></div>
        </div>

        <svg viewBox="0 0 ${size} ${size}" class="ringSvg" aria-label="${d.label} average age">
          <defs>
            <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur"></feGaussianBlur>
              <feMerge>
                <feMergeNode in="blur"></feMergeNode>
                <feMergeNode in="SourceGraphic"></feMergeNode>
              </feMerge>
            </filter>
          </defs>

          <!-- background track -->
          <circle cx="${cx}" cy="${cy}" r="${r}"
                  fill="none"
                  stroke="rgba(31,36,48,.10)"
                  stroke-width="${stroke}" />

          <!-- value ring -->
          <circle class="ringVal"
                  cx="${cx}" cy="${cy}" r="${r}"
                  fill="none"
                  stroke="${mainColor}"
                  stroke-width="${stroke}"
                  stroke-linecap="round"
                  stroke-dasharray="${dash} ${gap}"
                  transform="rotate(-90 ${cx} ${cy})"
                  filter="url(#softGlow)" />

          <!-- center text -->
          <text x="${cx}" y="${cy-4}" text-anchor="middle"
                font-size="28" font-weight="900" fill="rgba(31,36,48,.88)">
            ${d.value}
          </text>
          <text x="${cx}" y="${cy+22}" text-anchor="middle"
                font-size="12" fill="rgba(31,36,48,.55)">
            avg age
          </text>

          <!-- tiny scale hint -->
          <text x="${cx}" y="${size-18}" text-anchor="middle"
                font-size="11" fill="rgba(31,36,48,.40)">
            scaled ${MIN}–${MAX}
          </text>
        </svg>

        <div class="ageHint">Hover ring for details</div>
      </div>
    `;
  }).join("");

  const cols = host.querySelectorAll(".ageRing");
  const rings = host.querySelectorAll(".ringVal");

  function applyHighlight(activeKey){
    cols.forEach((col, i) => {
      const key = col.dataset.key;
      const ring = col.querySelector(".ringVal");
      if (!ring) return;

      if (!activeKey){
        ring.setAttribute("stroke", i === 0 ? greyA : greyB);
        ring.style.opacity = "1";
        ring.style.filter = "none";
        return;
      }

      if (key === activeKey){
        ring.setAttribute("stroke", accent);
        ring.style.opacity = "1";
        ring.style.filter = "brightness(1.03)";
      } else {
        ring.setAttribute("stroke", i === 0 ? greyA : greyB);
        ring.style.opacity = "0.95";
        ring.style.filter = "none";
      }
    });
  }

  // default highlight based on mode
  applyHighlight(defaultKey);

  // hover interactions
  cols.forEach((col) => {
    col.addEventListener("mousemove", (e) => {
      const label = col.dataset.label;
      const val = Number(col.dataset.value);
      tip.textContent = `${label}: ${val} years old (avg)`;
      tip.style.display = "block";
      tip.style.left = (e.clientX + 12) + "px";
      tip.style.top  = (e.clientY + 12) + "px";
      applyHighlight(col.dataset.key);
    });

    col.addEventListener("mouseleave", () => {
      tip.style.display = "none";
      applyHighlight(defaultKey);
    });
  });

  // subtle “draw in” animation
  rings.forEach(ring => {
    const dashArr = ring.getAttribute("stroke-dasharray").split(" ");
    const dash = Number(dashArr[0]);
    const gap = Number(dashArr[1]);

    ring.style.transition = "stroke-dasharray 650ms ease, stroke 160ms ease, opacity 160ms ease";
    ring.setAttribute("stroke-dasharray", `0 ${dash + gap}`);

    requestAnimationFrame(() => {
      ring.setAttribute("stroke-dasharray", `${dash} ${gap}`);
    });
  });
}

function renderAgeVizCompare(){
  const host = document.getElementById("compareAgeViz");
  const tip  = document.getElementById("compareAgeTip");
  if (!host || !tip) return;

  const BLUE = "#5a6ea5";
  const RED  = "#b26a6a";
  const greyTrack = "rgba(31,36,48,.10)";

  const data = [
    { key: "Audiobook", label: "Audiobook users", value: 45, color: BLUE },
    { key: "Physical Book", label: "Physical book users", value: 47, color: RED },
  ];

  const MIN = 18, MAX = 65;
  const pct = (v) => {
    const clamped = Math.max(MIN, Math.min(MAX, v));
    return (clamped - MIN) / (MAX - MIN);
  };

  const size = 260;
  const cx = size/2, cy = size/2;
  const r = 86;
  const stroke = 18;
  const C = 2 * Math.PI * r;

  host.innerHTML = data.map((d) => {
    const p = pct(d.value);
    const dash = (C * p).toFixed(1);
    const gap  = (C - C * p).toFixed(1);

    return `
      <div class="ageCol ageRing" data-key="${d.key}" data-label="${d.label}" data-value="${d.value}">
        <div class="ageLabel">
          <div class="name">${d.key === "Audiobook" ? "Audiobooks" : "Physical"}</div>
          <div class="val"><span class="num">${d.value}</span></div>
        </div>

        <svg viewBox="0 0 ${size} ${size}" class="ringSvg" aria-label="${d.label} average age">
          <defs>
            <filter id="softGlowCompare" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur"></feGaussianBlur>
              <feMerge>
                <feMergeNode in="blur"></feMergeNode>
                <feMergeNode in="SourceGraphic"></feMergeNode>
              </feMerge>
            </filter>
          </defs>

          <circle cx="${cx}" cy="${cy}" r="${r}"
                  fill="none" stroke="${greyTrack}" stroke-width="${stroke}" />

          <circle class="ringVal"
                  cx="${cx}" cy="${cy}" r="${r}"
                  fill="none"
                  stroke="${d.color}"
                  stroke-width="${stroke}"
                  stroke-linecap="round"
                  stroke-dasharray="${dash} ${gap}"
                  transform="rotate(-90 ${cx} ${cy})"
                   />

          <text x="${cx}" y="${cy-4}" text-anchor="middle"
                font-size="28" font-weight="900" fill="rgba(31,36,48,.88)">
            ${d.value}
          </text>
          <text x="${cx}" y="${cy+22}" text-anchor="middle"
                font-size="12" fill="rgba(31,36,48,.55)">
            avg age
          </text>
          <text x="${cx}" y="${size-18}" text-anchor="middle"
                font-size="11" fill="rgba(31,36,48,.40)">
            scaled ${MIN}–${MAX}
          </text>
        </svg>

        <div class="ageHint">Hover ring for details</div>
      </div>
    `;
  }).join("");

  const cards = host.querySelectorAll(".ageRing");
  const rings = host.querySelectorAll(".ringVal");

  // tooltip
  cards.forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const label = card.dataset.label;
      const val = Number(card.dataset.value);
      tip.textContent = `${label}: ${val} years old (avg)`;
      tip.style.display = "block";
      tip.style.left = (e.clientX + 12) + "px";
      tip.style.top  = (e.clientY + 12) + "px";
    });
    card.addEventListener("mouseleave", () => {
      tip.style.display = "none";
    });
  });

  // draw-in animation
  rings.forEach(ring => {
    const [dash, gap] = ring.getAttribute("stroke-dasharray").split(" ").map(Number);
    ring.style.transition = "stroke-dasharray 650ms ease, stroke 160ms ease";
    ring.setAttribute("stroke-dasharray", `0 ${dash + gap}`);
    requestAnimationFrame(() => ring.setAttribute("stroke-dasharray", `${dash} ${gap}`));
  });
}


function renderBooksBar(mode){
  const host = document.getElementById("booksBar");
  const tip  = document.getElementById("booksBarTip");
  if (!host || !tip) return;

  const accent = getPrefAccent(mode); // reuses your existing function
  const defaultKey = getDefaultBarKey(mode);

  const greyA = "rgba(31,36,48,.22)";
  const greyB = "rgba(31,36,48,.30)";

  const maxVal = Math.max(...BOOKS_READ_DATA.map(d => d.value));
 const sizeW = 640, sizeH = 700;
  const padL = 78, padR = 30, padT = 100, padB = 70;

  const chartW = sizeW - padL - padR;
  const chartH = sizeH - padT - padB;

  // bar layout
  const barCount = BOOKS_READ_DATA.length;
  const gap = 44;
  const barW = Math.min(160, (chartW - gap*(barCount-1)) / barCount);

  // helper to map value -> height
  const yFor = (v) => padT + (chartH - (v / maxVal) * chartH);
  const hFor = (v) => (v / maxVal) * chartH;

  // build bars
  const bars = BOOKS_READ_DATA.map((d, i) => {
    const x = padL + i * (barW + gap) + (chartW - (barW*barCount + gap*(barCount-1))) / 2;
    const h = hFor(d.value);
    const y = padT + (chartH - h);

    const isDefault = defaultKey && d.key === defaultKey;
    const fill = isDefault ? accent : (i === 0 ? greyA : greyB);

    return `
      <g class="bar-group" data-key="${d.key}" data-label="${d.label}" data-value="${d.value}">
        <rect class="bar-rect"
              x="${x}" y="${y}"
              width="${barW}" height="${h}"
              rx="14" ry="14"
              fill="${fill}"></rect>

        <text x="${x + barW/2}" y="${padT + chartH + 34}"
              text-anchor="middle"
              font-size="14" fill="rgba(31,36,48,.65)" font-weight="600">
          ${d.key === "Audiobook" ? "Audiobooks" : "Physical"}
        </text>

        <text x="${x + barW/2}" y="${y - 12}"
              text-anchor="middle"
              font-size="14" fill="rgba(31,36,48,.70)" font-weight="700">
          ${d.value.toFixed(3)}
        </text>
      </g>
    `;
  }).join("");

  // axis + labels
  host.innerHTML = `
    <svg viewBox="0 0 ${sizeW} ${sizeH}" role="img" aria-label="Average total books read by group">
      <text x="${padL}" y="24" font-size="16" font-weight="800" fill="rgba(31,36,48,.85)">
        Avg. Total Books Read
      </text>
      <text x="${padL}" y="44" font-size="12" fill="rgba(31,36,48,.55)">
        Hover a bar to highlight + see details
      </text>

      <!-- y axis line -->
      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + chartH}"
            stroke="rgba(31,36,48,.18)" stroke-width="2"></line>

      <!-- x axis line -->
      <line x1="${padL}" y1="${padT + chartH}" x2="${padL + chartW}" y2="${padT + chartH}"
            stroke="rgba(31,36,48,.18)" stroke-width="2"></line>

      ${bars}
    </svg>
  `;

  const groups = host.querySelectorAll(".bar-group");

  function applyHighlight(activeKey){
    groups.forEach((g, i) => {
      const rect = g.querySelector("rect");
      const key = g.dataset.key;

      if (!activeKey){
        rect.setAttribute("fill", i === 0 ? greyA : greyB);
        rect.style.opacity = "1";
        return;
      }

      if (key === activeKey){
        rect.setAttribute("fill", accent);
        rect.style.opacity = "1";
      } else {
        rect.setAttribute("fill", i === 0 ? greyA : greyB);
        rect.style.opacity = "0.95";
      }
    });
  }

  applyHighlight(defaultKey);

  groups.forEach((g) => {
    const rect = g.querySelector("rect");

    rect.addEventListener("mousemove", (e) => {
      const label = g.dataset.label;
      const value = Number(g.dataset.value);

      tip.textContent = `${label}: ${value.toFixed(3)} avg books`;
      tip.style.display = "block";
      tip.style.left = (e.clientX + 12) + "px";
      tip.style.top  = (e.clientY + 12) + "px";

      applyHighlight(g.dataset.key);
    });

    rect.addEventListener("mouseleave", () => {
      tip.style.display = "none";
      applyHighlight(defaultKey);
    });
  });
}


// ---------- Mode / Tabs ----------
function setMode(next){
  state.mode = next;

  const btnAudio = document.getElementById("btnAudio");
  const btnPhysical = document.getElementById("btnPhysical");
  const btnCompare = document.getElementById("btnCompare");
  const modeLabelEl = document.getElementById("modeLabel");

  if (btnAudio) btnAudio.setAttribute("aria-pressed", next === "audio");
  if (btnPhysical) btnPhysical.setAttribute("aria-pressed", next === "physical");
  if (btnCompare) btnCompare.setAttribute("aria-pressed", next === "compare");

  const modeLabel = next === "audio" ? "Audiobook" : next === "physical" ? "Physical Books" : "Compare";
  if (modeLabelEl) modeLabelEl.textContent = modeLabel;

  // Swap the single-mode charts (preference is now the interactive donut)
  if (next === "audio") {
    // swapImg("booksImg", "assets/audiobooksread.svg");
    swapImg("timelineImg", "assets/audiobooktimeline.svg");
    swapImg("ageImg", "assets/audiobookage.svg");
    swapImg("eduImg", "assets/Audiobook Education.svg");
  } else if (next === "physical") {
    // swapImg("booksImg", "assets/physicalbooksread.svg");
    swapImg("timelineImg", "assets/physicaltimeline.svg");
    swapImg("ageImg", "assets/physicalage.svg");
    swapImg("eduImg", "assets/Physical Book Education.svg");
  }

  // Show/hide compare-only combined charts (if you still have this wrapper)
  const combined = document.getElementById("combinedCharts");
  if (combined) combined.style.display = next === "compare" ? "" : "none";

  // Show/hide compare grid (if exists)
  const compareGrid = document.getElementById("compareGrid");
  if (compareGrid) compareGrid.classList.toggle("show", next === "compare");

  // Summary tint (optional)
  const summary = document.getElementById("summary");
  if (summary){
    if (next === "audio"){
      summary.style.background = "linear-gradient(to right, rgba(90,110,165,.18), rgba(90,110,165,.06))";
    } else if (next === "physical"){
      summary.style.background = "linear-gradient(to right, rgba(178,106,106,.18), rgba(178,106,106,.06))";
    } else {
      summary.style.background = "linear-gradient(to right, rgba(178,106,106,.12), rgba(90,110,165,.12))";
    }
  }

  // Render interactive pie
  renderPreferencePie(next);
  renderBooksBar(next);
  renderAgeViz(next);
if (next === "compare") {
  renderPreferencePieCompare();
  renderAgeVizCompare();
}


const showOverviewCards = next !== "compare";

const cardFormat = document.getElementById("card-format");
const cardBooks  = document.getElementById("card-books");

if (cardFormat) cardFormat.style.display = showOverviewCards ? "" : "none";
if (cardBooks)  cardBooks.style.display  = showOverviewCards ? "" : "none";

const isCompare = next === "compare";

// Panels
const pOverview = document.getElementById("panel-overview");
const pTrends = document.getElementById("panel-trends");
const pDemo = document.getElementById("panel-demographics");
const pCompare = document.getElementById("panel-extras");

// Tabs row (Overview/Trends/Demographics)
const tabsRow = document.getElementById("tabsRow");

// Show ONLY compare panel in compare mode
if (pOverview) pOverview.style.display = isCompare ? "none" : "";
if (pTrends)   pTrends.style.display   = isCompare ? "none" : "none"; // trends only shown via setTab
if (pDemo)     pDemo.style.display     = isCompare ? "none" : "none"; // demographics only shown via setTab
if (pCompare)  pCompare.style.display  = isCompare ? "" : "none";

// Hide the tabs row in compare mode
if (tabsRow) tabsRow.style.display = isCompare ? "none" : "";

// If leaving compare, restore the selected tab panel
if (!isCompare) {
  setTab(state.tab || "overview");
}


}

function setTab(next){
  state.tab = next;
  $$(".tab").forEach(t => t.setAttribute("aria-selected", t.dataset.tab === next));

  // Show/hide panels
  const pOverview = document.getElementById("panel-overview");
  const pTrends = document.getElementById("panel-trends");
  const pDemo = document.getElementById("panel-demographics");

  if (pOverview) pOverview.style.display = next === "overview" ? "" : "none";
  if (pTrends) pTrends.style.display = next === "trends" ? "" : "none";
  if (pDemo) pDemo.style.display = next === "demographics" ? "" : "none";

  // Extras panel exists for compare scroll target; keep it visible so scrollIntoView works
  const pExtras = document.getElementById("panel-extras");
if (pExtras) pExtras.style.display = (state.mode === "compare") ? "" : "none";


  // Badge label
  const focus = document.getElementById("focusBadge");
  if (focus){
    focus.textContent =
      next === "overview" ? "Focus: Preferences" :
      next === "trends" ? "Focus: Timeline" :
      "Focus: Demographics";
  }
}

// ---------- Zoom ----------
function applyZoom(chartId){
  const el = document.getElementById(chartId);
  if (!el) return;
  el.style.transform = `scale(${state.zoom[chartId].toFixed(2)})`;
}

function zoomChart(chartId, dir){
  state.lastFocusedChartId = chartId;
  const step = 0.12;
  if (dir === "in") state.zoom[chartId] = Math.min(2.2, state.zoom[chartId] + step);
  if (dir === "out") state.zoom[chartId] = Math.max(0.7, state.zoom[chartId] - step);
  if (dir === "reset") state.zoom[chartId] = 1;
  applyZoom(chartId);
}

// ---------- Callouts / Spotlight ----------
function toggleCallouts(key, pressed){
  const panel = document.getElementById(`callouts-${key}`);
  if (!panel) return;
  panel.classList.toggle("show", pressed);
}

function setSpotlight(chartId, enabled){
  state.spotlight[chartId] = enabled;
  const el = document.getElementById(chartId);
  if (!el) return;

  const parentFrame = el.closest(".chart-frame");
  if (!parentFrame) return;

  parentFrame.onmousemove = null;
  parentFrame.onmouseleave = null;
  el.style.transition = "transform 180ms";

  if (!enabled){
    parentFrame.style.outline = "none";
    parentFrame.style.boxShadow = "";
    return;
  }

  parentFrame.style.outline = "2px solid rgba(178,106,106,.20)";
  parentFrame.style.boxShadow = "0 18px 50px rgba(0,0,0,.12)";

  parentFrame.onmousemove = (e) => {
    const r = parentFrame.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) - 0.5;
    const py = ((e.clientY - r.top) / r.height) - 0.5;
    const tilt = `rotateX(${(-py*3).toFixed(2)}deg) rotateY(${(px*3).toFixed(2)}deg)`;
    parentFrame.style.transform = `${tilt}`;
  };
  parentFrame.onmouseleave = () => {
    parentFrame.style.transform = "rotateX(0deg) rotateY(0deg)";
  };
}

// ---------- Events ----------
$("#btnAudio")?.addEventListener("click", () => setMode("audio"));
$("#btnPhysical")?.addEventListener("click", () => setMode("physical"));

$("#btnCompare")?.addEventListener("click", () => {
  setMode("compare");

  const extras = document.getElementById("panel-extras");
  if (extras) {
    extras.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const focus = document.getElementById("focusBadge");
  if (focus) focus.textContent = "Focus: Compare";
});

$$(".tab").forEach(t => t.addEventListener("click", () => setTab(t.dataset.tab)));

// Zoom buttons
$$(".iconbtn").forEach(btn => {
  const z = btn.dataset.zoom;
  const tgt = btn.dataset.target;
  if (!z || !tgt) return;
  btn.addEventListener("click", () => zoomChart(tgt, z));
});

// Callout chips
$$(".chip[data-callouts]").forEach(chip => {
  chip.addEventListener("click", () => {
    const key = chip.dataset.callouts;
    const next = chip.getAttribute("aria-pressed") !== "true";
    chip.setAttribute("aria-pressed", next);
    toggleCallouts(key, next);
  });
});

// Spotlight toggles
$("#sparklePref")?.addEventListener("click", () => {
  const next = !state.spotlight.prefChart;
  $("#sparklePref")?.setAttribute("aria-pressed", next);
  setSpotlight("prefChart", next);
});
$("#sparkleBooks")?.addEventListener("click", () => {
  const next = !state.spotlight.booksChart;
  $("#sparkleBooks")?.setAttribute("aria-pressed", next);
  setSpotlight("booksChart", next);
});
$("#sparkleTimeline")?.addEventListener("click", () => {
  const next = !state.spotlight.timelineChart;
  $("#sparkleTimeline")?.setAttribute("aria-pressed", next);
  setSpotlight("timelineChart", next);
});
$("#sparkleEdu")?.addEventListener("click", () => {
  const next = !state.spotlight.eduChart;
  $("#sparkleEdu")?.setAttribute("aria-pressed", next);
  setSpotlight("eduChart", next);
});
$("#sparkleAge")?.addEventListener("click", () => {
  const next = !state.spotlight.ageChart;
  $("#sparkleAge")?.setAttribute("aria-pressed", next);
  setSpotlight("ageChart", next);
});

// Narrative / Minimal / Explain toggles (Trends panel) — safe guards if elements exist
$("#chipNarrative")?.addEventListener("click", () => {
  $("#chipNarrative")?.setAttribute("aria-pressed", "true");
  $("#chipMinimal")?.setAttribute("aria-pressed", "false");
  $("#chipTeaching")?.setAttribute("aria-pressed", "false");

  const chip = document.querySelector('.chip[data-callouts="timeline"]');
  if (chip){
    chip.setAttribute("aria-pressed", "true");
    toggleCallouts("timeline", true);
  }
});

$("#chipMinimal")?.addEventListener("click", () => {
  $("#chipNarrative")?.setAttribute("aria-pressed", "false");
  $("#chipMinimal")?.setAttribute("aria-pressed", "true");
  $("#chipTeaching")?.setAttribute("aria-pressed", "false");

  ["pref","books","timeline","edu","age"].forEach(k => toggleCallouts(k,false));
  $$(".chip[data-callouts]").forEach(c => c.setAttribute("aria-pressed","false"));
});

$("#chipTeaching")?.addEventListener("click", () => {
  $("#chipNarrative")?.setAttribute("aria-pressed", "false");
  $("#chipMinimal")?.setAttribute("aria-pressed", "false");
  $("#chipTeaching")?.setAttribute("aria-pressed", "true");

  ["timeline","age","edu"].forEach(k => {
    const c = document.querySelector(`.chip[data-callouts="${k}"]`);
    if (c){
      c.setAttribute("aria-pressed","true");
      toggleCallouts(k,true);
    }
  });
});

// Modals (guarded)
$("#openHelp")?.addEventListener("click", () => $("#modalHelp")?.classList.add("show"));
$("#openSources")?.addEventListener("click", () => $("#modalSources")?.classList.add("show"));

$$("#modalHelp [data-close], #modalSources [data-close]").forEach(btn => {
  btn.addEventListener("click", () => {
    $("#modalHelp")?.classList.remove("show");
    $("#modalSources")?.classList.remove("show");
  });
});

$("#modalHelp")?.addEventListener("click", (e) => { if (e.target.id === "modalHelp") $("#modalHelp")?.classList.remove("show"); });
$("#modalSources")?.addEventListener("click", (e) => { if (e.target.id === "modalSources") $("#modalSources")?.classList.remove("show"); });

// Keyboard zoom on last focused chart
window.addEventListener("keydown", (e) => {
  if (e.key === "+" || e.key === "=") zoomChart(state.lastFocusedChartId, "in");
  if (e.key === "-" || e.key === "_") zoomChart(state.lastFocusedChartId, "out");
  if (e.key.toLowerCase() === "r") zoomChart(state.lastFocusedChartId, "reset");
  if (e.key === "Escape"){
    $("#modalHelp")?.classList.remove("show");
    $("#modalSources")?.classList.remove("show");
  }
});

// Focus chart for keyboard zoom
["prefChart","booksChart","timelineChart","eduChart","ageChart"].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("click", () => {
    state.lastFocusedChartId = id;
    const hint = document.getElementById("hintBadge");
    if (hint) hint.textContent = `Tip: ${id.replace("Chart","")} focused — use + / − / R`;
  });
});

// ---------- Init ----------
setMode("physical");
setTab("overview");
Object.keys(state.zoom).forEach(applyZoom);
