/**
 * HMU prototype frontend — fetches dashboard from FastAPI.
 */

const MODES = {
  nominal_monitoring: { label: "Nominal monitoring", cls: "nominal" },
  alert: { label: "Alert", cls: "alert" },
  degraded: { label: "Degraded", cls: "degraded" },
  ground_supported: { label: "Ground-supported", cls: "ground" },
};

let chartInstance = null;

function el(id) {
  return document.getElementById(id);
}

function formatClock() {
  const d = new Date();
  return d.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function renderModeChips(activeMode) {
  const container = el("mode-chips");
  container.innerHTML = "";
  Object.entries(MODES).forEach(([key, { label, cls }]) => {
    const span = document.createElement("span");
    span.className = `mode-chip${key === activeMode ? ` active ${cls}` : ""}`;
    span.textContent = label;
    span.setAttribute("role", "status");
    if (key === activeMode) span.setAttribute("aria-current", "true");
    container.appendChild(span);
  });
}

function scoreCard(label, value, suffix = "/100") {
  return `<div class="score-card"><div class="label">${label}</div><div class="value">${value}<span>${suffix}</span></div></div>`;
}

function vitalCard(label, value, unit) {
  return `<div class="vital"><div class="v-label">${label}</div><div class="v-value">${value}<span class="v-unit">${unit}</span></div></div>`;
}

function renderScores(w) {
  el("score-grid").innerHTML = [
    scoreCard("Sleep score", w.sleep_score),
    scoreCard("Health score", w.health_score),
    scoreCard("Activity score", w.activity_score),
    scoreCard("Stress management", w.stress_management_score),
    scoreCard("Readiness", w.readiness_score),
  ].join("");
}

function renderVitals(w, env, integrity) {
  el("vital-grid").innerHTML = [
    vitalCard("Heart rate", w.heart_rate_bpm.toFixed(0), w.heart_rate_unit),
    vitalCard("SpO₂", w.spo2_pct.toFixed(0), w.spo2_unit),
    vitalCard("Respiratory rate", w.respiratory_rate_bpm.toFixed(1), w.respiratory_rate_unit),
    vitalCard("Skin temp.", w.skin_temp_c.toFixed(1), w.skin_temp_unit),
    vitalCard(
      "Blood pressure",
      `${w.systolic_mmhg.toFixed(0)} / ${w.diastolic_mmhg.toFixed(0)}`,
      w.blood_pressure_unit
    ),
    vitalCard("Wearable link", w.wearable_link_quality_pct.toFixed(0), "%"),
    vitalCard("Last sync", w.last_sync_ago_sec, "s ago"),
  ].join("");

  el("env-grid").innerHTML = [
    vitalCard("Cabin CO₂", env.cabin_co2_mmhg.toFixed(2), env.co2_unit),
    vitalCard("Cabin temperature", env.cabin_temp_c.toFixed(1), env.temp_unit),
    vitalCard("Mission cumulative dose", env.mission_cumulative_dose_msv.toFixed(1), env.dose_unit),
  ].join("");

  el("wearable-integrity").textContent = `Wearable channels — HR: ${integrity.heart_rate}, SpO₂: ${integrity.spo2}`;
  el("env-integrity").textContent = `Environmental fusion: ${integrity.environmental}`;
}

function renderAlerts(alerts) {
  const list = el("alerts-list");
  const empty = el("no-alerts");
  list.innerHTML = "";
  if (!alerts.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  alerts.forEach((a) => {
    const li = document.createElement("li");
    li.className = `alert-item ${a.severity}`;
    li.innerHTML = `
      <div class="alert-head">
        <span class="severity-tag ${a.severity}">${a.severity}</span>
        <h3 class="alert-title">${escapeHtml(a.title)}</h3>
      </div>
      <p class="alert-body">${escapeHtml(a.message)}</p>
      <div class="alert-meta">
        Source: ${escapeHtml(a.source)}
        ${a.parameter && a.value ? ` · ${escapeHtml(a.parameter)}: ${escapeHtml(a.value)}` : ""}
        ${a.threshold ? ` (threshold: ${escapeHtml(a.threshold)})` : ""}
      </div>
    `;
    list.appendChild(li);
  });
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function renderChart(series) {
  const canvas = el("vitals-chart");
  if (typeof Chart === "undefined") return;

  const labels = series.map((p) => {
    const h = Math.round(p.t_offset_min / 60);
    return `−${h}h`;
  });
  const hr = series.map((p) => p.heart_rate_bpm);
  const spo2 = series.map((p) => p.spo2_pct);

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Heart rate (bpm)",
          data: hr,
          borderColor: "#58a6ff",
          backgroundColor: "rgba(88, 166, 255, 0.1)",
          tension: 0.25,
          fill: true,
        },
        {
          label: "SpO₂ (%)",
          data: spo2,
          borderColor: "#3fb950",
          backgroundColor: "rgba(63, 185, 80, 0.08)",
          tension: 0.25,
          yAxisID: "y1",
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { labels: { color: "#8b949e" } },
      },
      scales: {
        x: {
          ticks: { color: "#8b949e", maxTicksLimit: 8 },
          grid: { color: "#30363d" },
        },
        y: {
          title: { display: true, text: "bpm", color: "#8b949e" },
          ticks: { color: "#8b949e" },
          grid: { color: "#30363d" },
        },
        y1: {
          position: "right",
          title: { display: true, text: "%", color: "#8b949e" },
          ticks: { color: "#8b949e" },
          grid: { drawOnChartArea: false },
          min: 90,
          max: 100,
        },
      },
    },
  });
}

async function postJson(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function syncSettings() {
  const ground = el("ground-supported").checked;
  const degraded = el("demo-degraded").checked;
  await postJson("/api/settings/mode", { ground_supported: ground });
  await fetch(`/api/settings/degraded-demo?on=${degraded ? "true" : "false"}`, {
    method: "POST",
  });
}

async function loadDashboard() {
  const scenario = el("scenario").value;
  await syncSettings();
  const r = await fetch(`/api/dashboard?scenario=${encodeURIComponent(scenario)}`);
  if (!r.ok) throw new Error(await r.text());
  const data = await r.json();

  el("crew-id").textContent = `Crew ${data.crew_member_id}`;
  el("mission-day").textContent = `Mission day ${data.mission_day}`;
  el("clock").textContent = formatClock();

  renderModeChips(data.mode);
  renderScores(data.wearable);
  renderVitals(data.wearable, data.environmental, data.integrity);
  renderAlerts(data.alerts);
  renderChart(data.vitals_series);
}

function init() {
  el("refresh").addEventListener("click", () => loadDashboard().catch(console.error));
  el("scenario").addEventListener("change", () => loadDashboard().catch(console.error));
  el("ground-supported").addEventListener("change", () => loadDashboard().catch(console.error));
  el("demo-degraded").addEventListener("change", () => loadDashboard().catch(console.error));
  loadDashboard().catch(console.error);
  setInterval(() => {
    el("clock").textContent = formatClock();
  }, 1000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
