// ---------- State ----------
    const state = {
      mode: "physical", // "physical" | "audio" | "compare"
      theme: "day",
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

  // nice fade
  img.style.transition = "opacity 150ms ease";
  img.style.opacity = "0";

  setTimeout(() => {
    img.src = src;
    img.onload = () => (img.style.opacity = "1");
  }, 150);
}

function setMode(next){
  state.mode = next;

  document.getElementById("btnAudio").setAttribute("aria-pressed", next === "audio");
  document.getElementById("btnPhysical").setAttribute("aria-pressed", next === "physical");
  document.getElementById("btnCompare").setAttribute("aria-pressed", next === "compare");

  const modeLabel = next === "audio" ? "Audiobook" : next === "physical" ? "Physical Books" : "Compare";
  document.getElementById("modeLabel").textContent = modeLabel;

  // swap the main “single mode” charts
  if (next === "audio") {
    swapImg("prefImg", "assets/audiopreferences.svg");
    swapImg("booksImg", "assets/audiobooksread.svg");
    swapImg("timelineImg", "assets/audiobooktimeline.svg");
    swapImg("ageImg", "assets/audiobookage.svg");
    swapImg("eduImg", "assets/Audiobook Education.svg");
  } else if (next === "physical") {
    swapImg("prefImg", "assets/physicalpreferences.svg");
    swapImg("booksImg", "assets/physicalbooksread.svg");
    swapImg("timelineImg", "assets/physicaltimeline.svg");
    swapImg("ageImg", "assets/physicalage.svg");
    swapImg("eduImg", "assets/Physical Book Education.svg");
  } else {
    // Compare mode: keep whatever was last selected in the single panels,
    // and show the comparison panel (Extras) to see both side-by-side.
  }

  // show comparison grid when mode is compare OR tab is extras
  const compareGrid = document.getElementById("compareGrid");
  if (compareGrid){
    compareGrid.classList.toggle("show", next === "compare" || state.tab === "extras");
  }

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

  const combined = document.getElementById("combinedCharts");
if (combined) {
  combined.style.display = next === "compare" ? "" : "none";
}

}


    function setTab(next){
      state.tab = next;
      $$(".tab").forEach(t => t.setAttribute("aria-selected", t.dataset.tab === next));

      // Show/hide panels
      $("#panel-overview").style.display = next === "overview" ? "" : "none";
      $("#panel-trends").style.display = next === "trends" ? "" : "none";
      $("#panel-demographics").style.display = next === "demographics" ? "" : "none";
     // Extras (compare) section is controlled only by the Compare button now
$("#panel-extras").style.display = "";


      $("#focusBadge").textContent =
        next === "overview" ? "Focus: Preferences" :
        next === "trends" ? "Focus: Timeline" :
        next === "demographics" ? "Focus: Demographics" :
        "Focus: Compare";

      // Show compare grid if extras tab OR compare mode
      $("#compareGrid").classList.toggle("show", state.mode === "compare" || next === "extras");
    }

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

    function toggleCallouts(key, pressed){
      const panel = document.getElementById(`callouts-${key}`);
      if (!panel) return;
      panel.classList.toggle("show", pressed);
    }

    function setSpotlight(chartId, enabled){
      state.spotlight[chartId] = enabled;
      const el = document.getElementById(chartId);
      if (!el) return;

      // spotlight = subtle hover lift on the chart container itself
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
    $("#btnAudio").addEventListener("click", () => setMode("audio"));
    $("#btnPhysical").addEventListener("click", () => setMode("physical"));
   $("#btnCompare").addEventListener("click", () => {
  // switch to compare mode
  setMode("compare");

  // scroll to the Extras (comparison) section
  const extras = document.getElementById("panel-extras");
  if (extras) {
    extras.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  // update summary badge
  $("#focusBadge").textContent = "Focus: Compare";
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

    // Spotlight toggles for each chart
    $("#sparklePref").addEventListener("click", () => {
      const next = !state.spotlight.prefChart;
      $("#sparklePref").setAttribute("aria-pressed", next);
      setSpotlight("prefChart", next);
    });
    $("#sparkleBooks").addEventListener("click", () => {
      const next = !state.spotlight.booksChart;
      $("#sparkleBooks").setAttribute("aria-pressed", next);
      setSpotlight("booksChart", next);
    });
    $("#sparkleTimeline").addEventListener("click", () => {
      const next = !state.spotlight.timelineChart;
      $("#sparkleTimeline").setAttribute("aria-pressed", next);
      setSpotlight("timelineChart", next);
    });
    $("#sparkleEdu").addEventListener("click", () => {
      const next = !state.spotlight.eduChart;
      $("#sparkleEdu").setAttribute("aria-pressed", next);
      setSpotlight("eduChart", next);
    });
    $("#sparkleAge").addEventListener("click", () => {
      const next = !state.spotlight.ageChart;
      $("#sparkleAge").setAttribute("aria-pressed", next);
      setSpotlight("ageChart", next);
    });

    // Narrative / Minimal / Explain toggles (Trends panel)
    $("#chipNarrative").addEventListener("click", () => {
      $("#chipNarrative").setAttribute("aria-pressed", "true");
      $("#chipMinimal").setAttribute("aria-pressed", "false");
      $("#chipTeaching").setAttribute("aria-pressed", "false");
      // Turn on timeline callouts for story feel
      const chip = document.querySelector('.chip[data-callouts="timeline"]');
      chip.setAttribute("aria-pressed", "true");
      toggleCallouts("timeline", true);
    });
    $("#chipMinimal").addEventListener("click", () => {
      $("#chipNarrative").setAttribute("aria-pressed", "false");
      $("#chipMinimal").setAttribute("aria-pressed", "true");
      $("#chipTeaching").setAttribute("aria-pressed", "false");
      // Hide all callouts
      ["pref","books","timeline","edu","age"].forEach(k => toggleCallouts(k,false));
      $$(".chip[data-callouts]").forEach(c => c.setAttribute("aria-pressed","false"));
    });
    $("#chipTeaching").addEventListener("click", () => {
      $("#chipNarrative").setAttribute("aria-pressed", "false");
      $("#chipMinimal").setAttribute("aria-pressed", "false");
      $("#chipTeaching").setAttribute("aria-pressed", "true");
      // Turn on multiple callouts
      ["timeline","age","edu"].forEach(k => {
        const c = document.querySelector(`.chip[data-callouts="${k}"]`);
        if (c){ c.setAttribute("aria-pressed","true"); toggleCallouts(k,true); }
      });
    });

    // Modals
    $("#openHelp").addEventListener("click", () => $("#modalHelp").classList.add("show"));
    $("#openSources").addEventListener("click", () => $("#modalSources").classList.add("show"));

    $$("#modalHelp [data-close], #modalSources [data-close]").forEach(btn => {
      btn.addEventListener("click", () => {
        $("#modalHelp").classList.remove("show");
        $("#modalSources").classList.remove("show");
      });
    });
    $("#modalHelp").addEventListener("click", (e) => { if (e.target.id === "modalHelp") $("#modalHelp").classList.remove("show"); });
    $("#modalSources").addEventListener("click", (e) => { if (e.target.id === "modalSources") $("#modalSources").classList.remove("show"); });

    // Keyboard zoom on last focused chart
    window.addEventListener("keydown", (e) => {
      if (e.key === "+" || e.key === "=") zoomChart(state.lastFocusedChartId, "in");
      if (e.key === "-" || e.key === "_") zoomChart(state.lastFocusedChartId, "out");
      if (e.key.toLowerCase() === "r") zoomChart(state.lastFocusedChartId, "reset");
      if (e.key === "Escape"){
        $("#modalHelp").classList.remove("show");
        $("#modalSources").classList.remove("show");
      }
    });

    // When user clicks a chart, it becomes the "focused" one for keyboard zoom
    ["prefChart","booksChart","timelineChart","eduChart","ageChart"].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("click", () => {
        state.lastFocusedChartId = id;
        $("#hintBadge").textContent = `Tip: ${id.replace("Chart","")} focused — use + / − / R`;
      });
    });

    // ---------- Init ----------
setMode("physical");
setTab("overview");
Object.keys(state.zoom).forEach(applyZoom);
