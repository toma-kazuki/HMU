/**
 * HMU — four-crew overview + progressive-disclosure detail modal.
 *
 * Cognitive-load design principle:
 *   Detail modal opens with only 6 synthesized score cards visible.
 *   Clicking a score card reveals its 6-hour trend chart + the small
 *   subset of raw sensor readings relevant to that score.
 *   Everything else (environ., alerts) is always visible but compact.
 */

// ── Operational mode (VD-R06 / §2.5 visual_design: chip label + icon + tint) ─
const MODES = {
  nominal_monitoring: {
    label:     "Nominal monitoring",
    chipLabel: "NOMINAL",
    cls:       "nominal",
    icon:      "✓",
  },
  alert: {
    label:     "Alert",
    chipLabel: "ALERT",
    cls:       "alert",
    icon:      "⚠",
  },
  degraded: {
    label:     "Degraded",
    chipLabel: "DEGRADED",
    cls:       "degraded",
    icon:      "⊘",
  },
  ground_supported: {
    label:     "Ground-supported",
    chipLabel: "GROUND-SUPPORTED",
    cls:       "ground",
    icon:      "⊕",
  },
};

// ── Activity status (VD-R05) — profile labels match backend `scenario` keys ──
const ACTIVITY_PROFILE_KEYS = new Set(["nominal", "exercise", "stress", "sleep"]);

/** Display line: "Rest · IVA" / "Exercise · EVA" — same string on overview cards and detail trigger. */
function formatActivityStatus(profileKey, locationKey) {
  const sl = PROFILE_SCENARIO_SHORT[profileKey] || profileKey;
  const loc = locationKey === "eva" ? "EVA" : "IVA";
  return `${sl} · ${loc}`;
}

/** Each interplanetary transit leg (VD: situation awareness for mission day). */
const MISSION_LEG_DAYS = 210;

/**
 * @returns {{ phase: 1 | 2 | 'post', phaseTitle: string, dayInLeg: number, legDays: number | null, progressFromEarthPct: number }}
 */
function missionTransitFromDay(missionDay) {
  const md = Math.max(1, Math.floor(Number(missionDay)) || 1);
  const span = Math.max(1, MISSION_LEG_DAYS - 1);

  if (md <= MISSION_LEG_DAYS) {
    const progressFromEarthPct = ((md - 1) / span) * 100;
    return {
      phase: 1,
      phaseTitle: "Transit Outbound",
      dayInLeg: md,
      legDays: MISSION_LEG_DAYS,
      progressFromEarthPct,
    };
  }
  if (md <= MISSION_LEG_DAYS * 2) {
    const dayInLeg = md - MISSION_LEG_DAYS;
    const progressFromEarthPct = (1 - (dayInLeg - 1) / span) * 100;
    return {
      phase: 2,
      phaseTitle: "Transit Return",
      dayInLeg,
      legDays: MISSION_LEG_DAYS,
      progressFromEarthPct,
    };
  }
  return {
    phase: "post",
    phaseTitle: "Post-transit",
    dayInLeg: md,
    legDays: null,
    progressFromEarthPct: 0,
  };
}

function renderMissionTransit(missionDay) {
  const ctx = missionTransitFromDay(missionDay);
  const titleEl = el("mission-phase-title");
  const badgeEl = el("mission-day-badge");
  const fillEl = el("mission-track-fill");
  const pinEl = el("mission-track-pin");
  const trackEl = el("mission-track");

  if (titleEl) titleEl.textContent = ctx.phaseTitle;
  if (badgeEl) {
    if (ctx.phase === "post") {
      badgeEl.textContent = `MD ${missionDay}`;
      badgeEl.setAttribute("aria-label", `Mission day ${missionDay}`);
    } else {
      badgeEl.textContent = `MD ${ctx.dayInLeg}/${ctx.legDays}`;
      badgeEl.setAttribute("aria-label", `Mission day ${ctx.dayInLeg} of ${ctx.legDays} in current transit leg`);
    }
  }
  const pct = Math.min(100, Math.max(0, ctx.progressFromEarthPct));
  const isReturn = ctx.phase === 2;
  if (fillEl) {
    fillEl.classList.toggle("mission-track-fill--return", isReturn);
    // Return leg: fill from Mars side — width = distance already covered toward Earth
    fillEl.style.width = isReturn ? `${100 - pct}%` : `${pct}%`;
  }
  if (pinEl) {
    pinEl.classList.toggle("mission-track-pin--return", isReturn);
    pinEl.style.left = `${pct}%`;
  }
  if (trackEl) {
    const pctRounded = Math.round(pct);
    if (ctx.phase === "post") {
      trackEl.setAttribute(
        "aria-label",
        `Mission day ${missionDay}. ${ctx.phaseTitle}. Crew position shown at Earth (start of scale).`,
      );
    } else {
      trackEl.setAttribute(
        "aria-label",
        `${ctx.phaseTitle}. Progress along the Earth-to-Mars corridor: ${pctRounded} percent from Earth on the left toward Mars on the right.`,
      );
    }
  }
}

// ── Parameter threshold limits (mirrors 7_parameter_limits.md) ──
// Two display tiers only: low_caution / high_caution (amber) and low_warn / high_warn (red).
// null = not applicable.  Operator: low_* triggers if value < threshold,
// high_* triggers if value > threshold.
const PARAM_LIMITS = {
  heart_rate_bpm:           { low_warn: 40,  low_caution: 45,  high_caution: 120, high_warn: 130 },
  blood_pressure_sys_mmhg:  { low_warn: 80,  low_caution: 90,  high_caution: 160, high_warn: 170 },
  spo2_pct:                 { low_warn: 92,  low_caution: 94                                      },
  respiration_rate_bpm:     { low_warn: 8,   low_caution: 10,  high_caution: 20,  high_warn: 24  },
  body_temperature_c:       { low_warn: 35,  low_caution: 36,  high_caution: 37.5, high_warn: 38 },
  cabin_co2_mmhg:           {                high_caution: 6,  high_warn: 8                       },
  cabin_temperature_c:      { low_warn: 18,  low_caution: 19,  high_caution: 26,  high_warn: 27  },
  cabin_humidity_pct:       { low_warn: 25,  low_caution: 30,  high_caution: 70,  high_warn: 75  },
  radiation_cumulative_msv: {                high_caution: 50, high_warn: 150                     },
  personal_co2_ppm:         {                high_caution: 1000, high_warn: 2500                  },
};

// ── Parameter display ranges (for arc gauge, band indicator, mini bar) ───────
// Covers the full clinically/operationally meaningful range, not just nominal.
const PARAM_RANGES = {
  heart_rate_bpm:           { min: 30,   max: 180 },
  spo2_pct:                 { min: 80,   max: 100 },
  respiration_rate_bpm:     { min: 4,    max: 36  },
  body_temperature_c:       { min: 33.0, max: 40.0 },
  blood_pressure_sys_mmhg:  { min: 60,   max: 200 },
  cabin_co2_mmhg:           { min: 0,    max: 12  },
  cabin_temperature_c:      { min: 14,   max: 32  },
  cabin_humidity_pct:       { min: 10,   max: 90  },
  radiation_cumulative_msv: { min: 0,    max: 200 },
};

/**
 * Returns the highest-triggered display tier for a parameter reading.
 * Returns: 'warning' (red) | 'caution' (amber) | null (nominal)
 * VD-R03: two display tiers only (Caution / Warning), matched 1-to-1 to alert palette.
 */
function paramSeverity(paramId, v) {
  const lim = PARAM_LIMITS[paramId];
  if (!lim || v == null || isNaN(v)) return null;
  if ((lim.low_warn    != null && v < lim.low_warn)    ||
      (lim.high_warn   != null && v > lim.high_warn))   return 'warning';
  if ((lim.low_caution != null && v < lim.low_caution) ||
      (lim.high_caution!= null && v > lim.high_caution)) return 'caution';
  return null;
}

/**
 * Map a numeric reading to a CSS colour class based on PARAM_LIMITS.
 * Returns: 'good' | 'medium' (caution/amber) | 'low' (warning/red) | ''
 * VD-R03: two tiers — caution → amber ('medium'), warning → red ('low').
 */
function paramClass(paramId, v) {
  const sev = paramSeverity(paramId, v);
  if (sev === 'warning') return 'low';
  if (sev === 'caution') return 'medium';
  if (sev === null && PARAM_LIMITS[paramId]) return 'good';
  return '';
}

// ── Score → description + relevant sensors ──────────
// Each "sensor" entry defines which device and which fields to surface.
// Kept intentionally small (≤ 4 fields per device, ≤ 3 devices per score).
const SCORE_DETAILS = {
  health_score: {
    label:  "Health Score",
    color:  "#3fb950",
    desc:   "Cardiovascular vitals, core temperature, and autonomic regulation",
    sensors: [
      { device: "bio_monitor",  icon: "👕", name: "Bio-Monitor",
        fields: [
          { label: "Resting heart rate", param: "heart_rate_bpm",          num: d => d.resting_heart_rate_bpm, get: d => fv(d.resting_heart_rate_bpm.toFixed(0), "bpm") },
          { label: "ECG rhythm",                                                                                get: d => d.ecg_rhythm },
          { label: "SpO₂",               param: "spo2_pct",                num: d => d.spo2_pct,               get: d => fv(d.spo2_pct.toFixed(0),               "%") },
          { label: "Blood pressure",     param: "blood_pressure_sys_mmhg", num: d => d.systolic_mmhg,          get: d => fv(`${d.systolic_mmhg.toFixed(0)}/${d.diastolic_mmhg.toFixed(0)}`, "mmHg") },
        ]},
      { device: "thermo_mini",  icon: "🌡", name: "Thermo-mini",
        fields: [
          { label: "Core body temp.", param: "body_temperature_c", num: d => d.core_body_temp_c, get: d => fv(d.core_body_temp_c.toFixed(2), "°C") },
        ]},
      { device: "oura_ring",    icon: "💍", name: "Oura Ring",
        fields: [
          { label: "HRV (RMSSD)", get: d => fv(d.hrv_ms.toFixed(1), "ms") },
        ]},
    ],
  },

  sleep_score: {
    label: "Sleep Score",
    color: "#79c0ff",
    desc:  "Sleep quality, architecture, and onset latency",
    sensors: [
      { device: "oura_ring",  icon: "💍", name: "Oura Ring",
        fields: [
          { label: "Deep sleep",  get: d => fv(d.sleep_deep_pct.toFixed(1),  "%") },
          { label: "REM sleep",   get: d => fv(d.sleep_rem_pct.toFixed(1),   "%") },
          { label: "Light sleep", get: d => fv(d.sleep_light_pct.toFixed(1), "%") },
          { label: "Awake",       get: d => fv(d.sleep_awake_pct.toFixed(1), "%") },
        ]},
      { device: "actiwatch",  icon: "⌚", name: "Actiwatch",
        fields: [
          { label: "Sleep onset",   get: d => fv(d.sleep_onset_min,              "min") },
          { label: "Wake episodes", get: d => fv(d.wake_episodes,                "") },
          { label: "Ambient light", get: d => fv(d.ambient_light_lux.toFixed(0), "lux") },
        ]},
    ],
  },

  activity_score: {
    label: "Activity Score",
    color: "#d29922",
    desc:  "Physical activity level and movement across the duty period",
    sensors: [
      { device: "bio_monitor",  icon: "👕", name: "Bio-Monitor",
        fields: [
          { label: "Activity", get: d => fv(d.activity_mets.toFixed(1), "METs") },
        ]},
      { device: "actiwatch",   icon: "⌚", name: "Actiwatch",
        fields: [
          { label: "Activity counts",  get: d => fv(d.activity_counts_per_epoch.toLocaleString(), "counts/epoch") },
          { label: "Activity level",   get: d => d.activity_level },
        ]},
      { device: "oura_ring",   icon: "💍", name: "Oura Ring",
        fields: [
          { label: "Steps", get: d => fv(d.steps.toLocaleString(), "") },
        ]},
    ],
  },

  fatigue_score: {
    label: "Fatigue Score",
    color: "#f0883e",
    desc:  "Accumulated fatigue, restlessness, and recovery deficit",
    sensors: [
      { device: "oura_ring",  icon: "💍", name: "Oura Ring",
        fields: [
          { label: "HRV (RMSSD)",      get: d => fv(d.hrv_ms.toFixed(1), "ms") },
          { label: "Temp. deviation",  get: d => fv((d.body_temp_deviation_c >= 0 ? "+" : "") + d.body_temp_deviation_c.toFixed(2), "°C vs baseline") },
        ]},
      { device: "actiwatch",  icon: "⌚", name: "Actiwatch",
        fields: [
          { label: "Wake episodes",       get: d => fv(d.wake_episodes,                    "") },
          { label: "Hyperactivity index", get: d => fv(d.hyperactivity_index.toFixed(1),   "/ 10") },
        ]},
      { device: "bio_monitor", icon: "👕", name: "Bio-Monitor",
        fields: [
          { label: "Resting heart rate", param: "heart_rate_bpm",       num: d => d.resting_heart_rate_bpm, get: d => fv(d.resting_heart_rate_bpm.toFixed(0), "bpm") },
          { label: "Breathing rate",     param: "respiration_rate_bpm", num: d => d.breathing_rate_bpm,     get: d => fv(d.breathing_rate_bpm.toFixed(1),     "breaths/min") },
        ]},
    ],
  },

  stress_management_score: {
    label: "Stress Management",
    color: "#db6d28",
    desc:  "Physiological stress load and autonomic coping capacity",
    sensors: [
      { device: "bio_monitor",  icon: "👕", name: "Bio-Monitor",
        fields: [
          { label: "Resting heart rate", param: "heart_rate_bpm",       num: d => d.resting_heart_rate_bpm, get: d => fv(d.resting_heart_rate_bpm.toFixed(0), "bpm") },
          { label: "Breathing rate",     param: "respiration_rate_bpm", num: d => d.breathing_rate_bpm,     get: d => fv(d.breathing_rate_bpm.toFixed(1),     "breaths/min") },
          { label: "Tidal volume",                                                                           get: d => fv(d.tidal_volume_l.toFixed(2),         "L/breath") },
        ]},
      { device: "oura_ring",    icon: "💍", name: "Oura Ring",
        fields: [
          { label: "HRV (RMSSD)",     get: d => fv(d.hrv_ms.toFixed(1),                                                                  "ms") },
          { label: "Temp. deviation", get: d => fv((d.body_temp_deviation_c >= 0 ? "+" : "") + d.body_temp_deviation_c.toFixed(2), "°C") },
        ]},
      { device: "personal_co2", icon: "💨", name: "Personal CO₂",
        fields: [
          { label: "Current exposure", param: "personal_co2_ppm", num: d => d.current_ppm, get: d => fv(d.current_ppm.toFixed(0), d.co2_unit) },
        ]},
    ],
  },

  readiness_score: {
    label: "Readiness Score",
    color: "#58a6ff",
    desc:  "Mission readiness integrating recovery, health, and radiation exposure",
    sensors: [
      { device: "oura_ring",   icon: "💍", name: "Oura Ring",
        fields: [
          { label: "HRV (RMSSD)", get: d => fv(d.hrv_ms.toFixed(1),                           "ms") },
          { label: "SpO₂ avg",    param: "spo2_pct", num: d => d.spo2_avg_pct, get: d => fv(d.spo2_avg_pct.toFixed(0), "%") },
        ]},
      { device: "bio_monitor",  icon: "👕", name: "Bio-Monitor",
        fields: [
          { label: "Resting heart rate", param: "heart_rate_bpm", num: d => d.resting_heart_rate_bpm, get: d => fv(d.resting_heart_rate_bpm.toFixed(0), "bpm") },
          { label: "SpO₂",               param: "spo2_pct",       num: d => d.spo2_pct,               get: d => fv(d.spo2_pct.toFixed(0),               "%") },
        ]},
      { device: "thermo_mini",  icon: "🌡", name: "Thermo-mini",
        fields: [
          { label: "Core body temp.", param: "body_temperature_c", num: d => d.core_body_temp_c, get: d => fv(d.core_body_temp_c.toFixed(2), "°C") },
        ]},
      { device: "evarm",        icon: "☢", name: "EVARM",
        fields: [
          { label: "Dose rate",       get: d => fv(d.dose_rate_usv_h.toFixed(3),                                    d.rate_unit) },
          { label: "Personal cumul.", param: "radiation_cumulative_msv", num: d => d.personal_cumulative_msv, get: d => fv(d.personal_cumulative_msv.toFixed(1), d.dose_unit) },
        ]},
    ],
  },
};

// ── Score advice text (8_medical_diagnosis.md §4.7) ──────────────────────────
const SCORE_ADVICE = {
  health_score: {
    caution: "Review cardiovascular parameters (HR, SpO₂, BP) and core body temperature in the sensor rows below. Note HRV trend. If any raw vital is also alarming, refer to the corresponding alert in the Alerts panel.",
    warning: "Review cardiovascular parameters (HR, SpO₂, BP) and core body temperature in the sensor rows below. Note HRV trend. If any raw vital is also alarming, refer to the corresponding alert in the Alerts panel. Notify Flight Surgeon at next contact with score value and which sensor parameters are flagged.",
  },
  sleep_score: {
    caution: "Prioritise sleep opportunity in the next duty cycle. Review sleep architecture (deep %, REM %) and wake episodes. Reduce bright light exposure before the sleep period.",
    warning: "Prioritise sleep opportunity in the next duty cycle. Review sleep architecture (deep %, REM %) and wake episodes. Reduce bright light exposure before the sleep period. If sleep score remains below 60 after two consecutive duty cycles, notify Flight Surgeon for evaluation of sleep disruption.",
  },
  activity_score: {
    caution: "Review duty schedule for prolonged sedentary periods. Schedule moderate exercise to prevent musculoskeletal deconditioning per the mission exercise protocol.",
    warning: "Review duty schedule for prolonged sedentary periods. Schedule moderate exercise to prevent musculoskeletal deconditioning per the mission exercise protocol. Sustained low activity score indicates deconditioning risk; notify Flight Surgeon for exercise prescription review.",
  },
  fatigue_score: {
    caution: "Increase rest time and prioritise high-quality sleep in the next cycle. Review HRV and wake episodes as recovery indicators.",
    warning: "Defer high-criticality tasks where operationally possible. Notify Flight Surgeon if score remains below 60 after two sleep cycles.",
  },
  stress_management_score: {
    caution: "Reduce non-essential workload and environmental stressors (noise, time pressure). Review resting HR and HRV trend for autonomic load indicators. If personal CO₂ is elevated, address that first.",
    warning: "Reduce non-essential workload and environmental stressors (noise, time pressure). Review resting HR and HRV trend for autonomic load indicators. If personal CO₂ is elevated, address that first. Notify Flight Surgeon at next contact with score value and contributing sensor context.",
  },
  readiness_score: {
    caution: "Defer safety-critical solo tasks where possible. Review contributing scores (Sleep, Health, Stress Management) to identify the primary driver and apply the corresponding advice above.",
    warning: "Do not assign solo or safety-critical tasks to the crew member. Notify Flight Surgeon at next scheduled contact.",
  },
};

// ══════════════════════════════════════════════════════
// Crew Communication Chat
// ══════════════════════════════════════════════════════

/** Per-crew message history: Map<crew_id, Array<{role, sender, text, ts}>> */
const chatHistories = new Map();
let chatCrewId      = null;   // crew currently open in modal
let chatRecipient   = 'ai';   // 'ai' | 'surgeon'
let surgeonTypingId = null;   // timeout handle for surgeon reply

// ── Flight surgeon reply bank (mock — surgeon is offline) ─────────────────
const SURGEON_REPLIES = [
  "Received — I've reviewed your latest sensor data. Nothing here that concerns me acutely. Stay on your current schedule and let me know if anything changes.",
  "Got it. Your readings are consistent with what I'm seeing on my end. Rest as scheduled and keep me updated at the next check-in.",
  "Understood. I've noted this in your daily health log. No immediate intervention required from my side — monitor and report if symptoms persist.",
  "Copy that. Based on your current data, you're within nominal bounds. I'll do a full review at the next medical downlink and get back to you.",
  "Thanks for the report. I'll flag this for discussion at the next crew health conference. In the meantime, follow standard protocol and stay hydrated.",
];

// ── DOM helpers ──────────────────────────────────────
function chatHistory(crewId) {
  if (!chatHistories.has(crewId)) chatHistories.set(crewId, []);
  return chatHistories.get(crewId);
}

function chatTimestamp() {
  return new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}

function appendChatMsg(role, sender, text) {
  const msgs   = el('chat-messages');
  const empty  = msgs.querySelector('.chat-empty');
  if (empty) empty.remove();

  const wrap = document.createElement('div');
  wrap.className = `chat-msg ${role}`;
  wrap.innerHTML = `
    <div class="chat-bubble">${escapeHtml(text)}</div>
    <span class="chat-meta">${escapeHtml(sender)} · ${chatTimestamp()}</span>
  `;
  msgs.appendChild(wrap);
  msgs.scrollTop = msgs.scrollHeight;
  return wrap;
}

function showTypingIndicator(senderLabel) {
  const msgs = el('chat-messages');
  const wrap = document.createElement('div');
  wrap.className = 'chat-msg incoming';
  wrap.id = 'chat-typing-row';
  wrap.innerHTML = `
    <div class="chat-typing-bubble">
      <span class="chat-typing-dot"></span>
      <span class="chat-typing-dot"></span>
      <span class="chat-typing-dot"></span>
    </div>
    <span class="chat-meta">${escapeHtml(senderLabel)} · typing…</span>
  `;
  msgs.appendChild(wrap);
  msgs.scrollTop = msgs.scrollHeight;
}

function removeTypingIndicator() {
  el('chat-typing-row')?.remove();
}

function renderChatHistory(crewId) {
  const msgs = el('chat-messages');
  msgs.innerHTML = '';
  const hist = chatHistory(crewId);
  if (hist.length === 0) {
    msgs.innerHTML = '<span class="chat-empty">No messages yet — ask a question or submit a self-report.</span>';
    return;
  }
  hist.forEach(m => appendChatMsg(m.role, m.sender, m.text));
}

function initChat(crewId) {
  chatCrewId = crewId;
  // Reset surgeon typing if modal changed
  clearTimeout(surgeonTypingId);
  removeTypingIndicator();
  renderChatHistory(crewId);
  // Sync recipient buttons
  document.querySelectorAll('.chat-recipient-btn').forEach(btn => {
    const active = btn.dataset.recipient === chatRecipient;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
}

async function sendChatMessage() {
  const input   = el('chat-input');
  const text    = input.value.trim();
  if (!text || !chatCrewId) return;

  const crewName = lastDetailData?.display_name ?? 'Crew';
  const hist     = chatHistory(chatCrewId);
  const sendBtn  = el('chat-send');

  // Record + display outgoing message
  hist.push({ role: 'outgoing', sender: crewName, text });
  appendChatMsg('outgoing', crewName, text);
  input.value = '';
  input.style.height = '';
  sendBtn.disabled = true;

  if (chatRecipient === 'ai') {
    // ── Real GPT-4o call ──────────────────────────────
    showTypingIndicator('HMU Intelligence');
    try {
      const res = await fetch('/dialogue/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: text, crew_id: chatCrewId }),
      });
      removeTypingIndicator();

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        const errMsg = `[Error ${res.status}] ${err.detail ?? 'Request failed'}`;
        hist.push({ role: 'incoming', sender: 'HMU Intelligence', text: errMsg });
        appendChatMsg('incoming error', 'HMU Intelligence', errMsg);
      } else {
        const data  = await res.json();
        const reply = data.response?.visual_message?.[0] ?? '(no response)';
        hist.push({ role: 'incoming', sender: 'HMU Intelligence', text: reply });
        appendChatMsg('incoming', 'HMU Intelligence', reply);
      }
    } catch (networkErr) {
      removeTypingIndicator();
      const errMsg = 'Unable to reach HMU Intelligence — check server connection.';
      hist.push({ role: 'incoming', sender: 'HMU Intelligence', text: errMsg });
      appendChatMsg('incoming error', 'HMU Intelligence', errMsg);
    }
    sendBtn.disabled = false;

  } else {
    // ── Mock flight surgeon (simulated comms latency 4–8 s) ──
    showTypingIndicator('Flight Surgeon');
    const delay = 4000 + Math.random() * 4000;
    surgeonTypingId = setTimeout(() => {
      removeTypingIndicator();
      const reply = SURGEON_REPLIES[Math.floor(Math.random() * SURGEON_REPLIES.length)];
      hist.push({ role: 'incoming', sender: 'Flight Surgeon', text: reply });
      appendChatMsg('incoming', 'Flight Surgeon', reply);
      sendBtn.disabled = false;
    }, delay);
  }
}

async function clearChatSession() {
  if (!chatCrewId) return;

  // Clear server-side session for System AI
  if (chatRecipient === 'ai') {
    await fetch('/dialogue/clear-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crew_id: chatCrewId }),
    }).catch(() => {});
  }

  // Clear local history and re-render empty state
  chatHistories.set(chatCrewId, []);
  renderChatHistory(chatCrewId);
}

function bindChatEvents() {
  // Recipient toggle
  document.querySelectorAll('.chat-recipient-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      chatRecipient = btn.dataset.recipient;
      document.querySelectorAll('.chat-recipient-btn').forEach(b => {
        const active = b.dataset.recipient === chatRecipient;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', String(active));
      });
    });
  });

  // Send / clear buttons
  el('chat-send').addEventListener('click',  sendChatMessage);
  el('chat-clear').addEventListener('click', clearChatSession);

  // Send on Ctrl+Enter / Cmd+Enter
  el('chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      sendChatMessage();
    }
  });

  // Auto-grow textarea
  el('chat-input').addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
  });
}

// ══════════════════════════════════════════════════════
// HMU Intelligence — Natural-language report generators
// (Mock / prototype descriptions seeded from live values)
// ══════════════════════════════════════════════════════

/** Map a 0–100 score to a clinical adjective (aligned with 70/60 Caution/Warning thresholds). */
function rateScore(v) {
  if (v >= 85) return { word: "excellent",    cls: "flag-ok"      };
  if (v >  70) return { word: "satisfactory", cls: "flag-ok"      };
  if (v >= 60) return { word: "caution",      cls: "flag-caution" };
  return             { word: "below target",  cls: "flag-warn"    };
}

function val(v) { return `<span class="flag-val">${v}</span>`; }
function ok(s)  { return `<span class="flag-ok">${s}</span>`; }
function caut(s){ return `<span class="flag-caution">${s}</span>`; }
function warn(s){ return `<span class="flag-warn">${s}</span>`; }

function rateHtml(score, label) {
  const r = rateScore(score);
  return `${label} <span class="${r.cls}">${score}/100 (${r.word})</span>`;
}

function nowTs(missionDay) {
  const t = new Date();
  const tr = missionTransitFromDay(missionDay);
  const mdPart =
    tr.phase === "post" ? `MD ${missionDay}` : `MD ${tr.dayInLeg}/${tr.legDays}`;
  return `${mdPart} · ${t.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false })} UTC`;
}

// ── (1) Overview: four-crew mission health brief ─────
function generateOverviewReport(data) {
  const { crew, mission_day, mode } = data;

  const concerns = crew.flatMap(c => {
    const issues = [];
    if (c.sleep_score   < 65) issues.push(`${val(c.display_name)}'s sleep`);
    if (c.fatigue_score < 60) issues.push(`${val(c.display_name)}'s fatigue`);
    if (c.stress_score  < 60) issues.push(`${val(c.display_name)}'s stress`);
    return issues;
  });

  if (mode === 'alert') {
    return `Mission Day ${val(mission_day)} — ${warn('One or more crew members have exceeded physiological thresholds')}; refer to individual crew alerts below.`;
  }
  if (concerns.length > 0) {
    return `Mission Day ${val(mission_day)} — overall crew status is ${ok('nominal')}, though ${caut(concerns.join(', '))} ${concerns.length > 1 ? 'warrant' : 'warrants'} attention.`;
  }
  return `Mission Day ${val(mission_day)} — ${ok('All four crew members are tracking within nominal physiological and environmental bounds')}.`;
}

// ── (2) Crew detail: GPT-4o symptom summary + recommended actions ─────────
// Called after openDetail() populates lastDetailData.
// Fires a single POST /api/crew/assessment and updates two separate panels.
async function fetchAndRenderAssessment(data) {
  // Reset both panels to loading state
  const summaryEl  = el('crew-report-text');
  const actSection = el('actions-section');
  const actLoading = el('actions-loading');
  const actList    = el('actions-list');

  summaryEl.innerHTML = '<span class="hmu-spinner"></span>Generating clinical assessment…';
  summaryEl.classList.add('hmu-report-loading');
  actSection.classList.remove('hidden');
  actList.innerHTML    = '';
  actLoading.classList.remove('hidden');
  el('crew-report-ts').textContent = '';

  // Build a lightweight payload (only what GPT-4o needs)
  const payload = {
    display_name:  data.display_name,
    role:          el('detail-role')?.textContent?.trim() ?? '',
    mission_day:   data.mission_day,
    alerts:        data.alerts.map(a => ({
      severity:  a.severity,
      title:     a.title,
      parameter: a.parameter ?? '',
      value:     a.value     ?? '',
      threshold: a.threshold ?? '',
    })),
    wearable:      {
      health_score:             data.scores.health_score,
      sleep_score:              data.scores.sleep_score,
      fatigue_score:            data.scores.fatigue_score,
      stress_management_score:  data.scores.stress_management_score,
      readiness_score:          data.scores.readiness_score,
      heart_rate_bpm:           data.devices.bio_monitor.heart_rate_bpm,
      spo2_pct:                 data.devices.bio_monitor.spo2_pct,
      systolic_mmhg:            data.devices.bio_monitor.systolic_mmhg,
      diastolic_mmhg:           data.devices.bio_monitor.diastolic_mmhg,
      respiratory_rate_bpm:     data.devices.bio_monitor.breathing_rate_bpm,
    },
    environmental: {
      cabin_co2_mmhg:              data.environmental.cabin_co2_mmhg,
      cabin_temp_c:                data.environmental.cabin_temp_c,
      cabin_humidity_pct:          data.environmental.cabin_humidity_pct,
      mission_cumulative_dose_msv: data.environmental.mission_cumulative_dose_msv,
    },
  };

  try {
    const res = await fetch('/api/crew/assessment', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      summaryEl.innerHTML = `<span class="flag-warn">[Error ${res.status}] ${escapeHtml(err.detail ?? 'Assessment unavailable')}</span>`;
      actLoading.classList.add('hidden');
      return;
    }

    const { summary, actions } = await res.json();

    // ── Symptom summary ───────────────────────────────
    summaryEl.classList.remove('hmu-report-loading');
    summaryEl.textContent = summary || 'No summary available.';
    el('crew-report-ts').textContent = nowTs(data.mission_day);

    // ── Recommended actions ───────────────────────────
    actLoading.classList.add('hidden');
    if (!actions || actions.length === 0) {
      actSection.classList.add('hidden');
      return;
    }
    const severityCls = data.alerts.some(a => a.severity === 'emergency') ? 'actions-emergency'
                      : data.alerts.some(a => a.severity === 'warning')   ? 'actions-warning'
                      : '';
    actList.className = `actions-list ${severityCls}`;
    actList.innerHTML = actions.map((act, i) =>
      `<li class="action-item">
        <span class="action-num">${i + 1}</span>
        <span class="action-text">${escapeHtml(act)}</span>
      </li>`
    ).join('');

  } catch (networkErr) {
    summaryEl.classList.remove('hmu-report-loading');
    summaryEl.innerHTML = `<span class="flag-warn">Unable to reach assessment service — check server connection.</span>`;
    actLoading.classList.add('hidden');
  }
}

// ── (3) Score detail: per-score clinical assessment ───
function generateScoreReport(scoreKey, wearable, devices, missionDay) {
  const v = wearable[scoreKey];
  const r = rateScore(v);
  const b = devices.bio_monitor;
  const o = devices.oura_ring;
  const a = devices.actiwatch;
  const t = devices.thermo_mini;
  const e = devices.evarm;
  const c = devices.personal_co2;

  const intros = {
    health_score:
      `The Health Score of ${val(v + '/100')} reflects overall cardiovascular, respiratory, and thermoregulatory function. `
      + `Current assessment is <span class="${r.cls}">${r.word}</span>. `
      + `Resting heart rate of ${val(b.resting_heart_rate_bpm.toFixed(0) + ' bpm')} and SpO₂ of ${val(b.spo2_pct.toFixed(0) + '%')} `
      + (b.resting_heart_rate_bpm < 70 && b.spo2_pct >= 96 ? `are both ${ok('within optimal ranges')}.` : `require continued monitoring.`)
      + ` ECG rhythm is reported as ${val(b.ecg_rhythm)}.`
      + ` Core body temperature of ${val(t.core_body_temp_c.toFixed(2) + '°C')} is `
      + (t.core_body_temp_c >= 36.5 && t.core_body_temp_c <= 37.5 ? ok('nominal') : warn('outside typical range')) + '.',

    sleep_score:
      `The Sleep Score of ${val(v + '/100')} synthesises sleep architecture, onset latency, and continuity. `
      + `Assessment is <span class="${r.cls}">${r.word}</span>. `
      + `Deep sleep accounted for ${val(o.sleep_deep_pct.toFixed(1) + '%')} and REM for ${val(o.sleep_rem_pct.toFixed(1) + '%')} of the last recorded sleep period `
      + (o.sleep_deep_pct >= 15 && o.sleep_rem_pct >= 18 ? `— ${ok('both within restorative targets')}.` : `— ${caut('below restorative targets, suggesting compromised recovery')}.`)
      + ` Sleep onset latency was ${val(a.sleep_onset_min + ' min')} with ${val(a.wake_episodes)} wake episode${a.wake_episodes !== 1 ? 's' : ''}, `
      + (a.sleep_onset_min <= 20 && a.wake_episodes <= 2 ? ok('consistent with good sleep hygiene.') : caut('indicating fragmented sleep.')),

    activity_score:
      `The Activity Score of ${val(v + '/100')} measures physical exertion and movement across the duty period. `
      + `Assessment is <span class="${r.cls}">${r.word}</span>. `
      + `Current metabolic equivalent is ${val(b.activity_mets.toFixed(1) + ' METs')} — classified as ${val(a.activity_level + ' activity')}. `
      + `Actiwatch records ${val(a.activity_counts_per_epoch.toLocaleString() + ' counts/epoch')} and the Oura Ring logs ${val(o.steps.toLocaleString() + ' steps')} today.`
      + (a.activity_level === 'Sedentary' ? ` ${caut('Prolonged sedentary periods should be mitigated with scheduled exercise intervals.')}` : ''),

    fatigue_score:
      `The Fatigue Score of ${val(v + '/100')} represents fatigue resistance — higher values indicate better recovery and lower accumulated fatigue. `
      + `Assessment is <span class="${r.cls}">${r.word}</span>. `
      + `HRV of ${val(o.hrv_ms.toFixed(0) + ' ms')} `
      + (o.hrv_ms >= 45 ? ok('supports adequate autonomic recovery.') : warn('is depressed, indicating physiological load.'))
      + ` Body temperature deviation of ${val((o.body_temp_deviation_c >= 0 ? '+' : '') + o.body_temp_deviation_c.toFixed(2) + '°C vs baseline')} `
      + (Math.abs(o.body_temp_deviation_c) <= 0.3 ? ok('is within normal circadian variation.') : caut('may reflect thermal stress or illness.'))
      + ` Actiwatch hyperactivity index: ${val(a.hyperactivity_index.toFixed(1) + '/10')}.`,

    stress_management_score:
      `The Stress Management Score of ${val(v + '/100')} reflects capacity to cope with physiological and cognitive stressors. `
      + `Assessment is <span class="${r.cls}">${r.word}</span>. `
      + `Resting heart rate of ${val(b.resting_heart_rate_bpm.toFixed(0) + ' bpm')} and breathing rate of ${val(b.breathing_rate_bpm.toFixed(1) + ' breaths/min')} `
      + (b.resting_heart_rate_bpm <= 70 && b.breathing_rate_bpm <= 18 ? `are both ${ok('consistent with low stress load')}.` : `are ${caut('mildly elevated, consistent with workload')}.`)
      + ` HRV of ${val(o.hrv_ms.toFixed(0) + ' ms')} `
      + (o.hrv_ms >= 45 ? ok('indicates retained autonomic flexibility.') : warn('suggests reduced stress tolerance.'))
      + ` Personal CO₂ exposure at ${val(c.current_ppm.toFixed(0) + ' ppm')} `
      + (c.current_ppm < 1000 ? ok('is within acceptable personal limits.') : caut('is elevated — consider ventilation review.')),

    readiness_score:
      `The Readiness Score of ${val(v + '/100')} integrates health, recovery, and environmental exposure into an operational readiness index. `
      + `Assessment is <span class="${r.cls}">${r.word}</span>. `
      + `Key inputs: resting heart rate ${val(b.resting_heart_rate_bpm.toFixed(0) + ' bpm')}, SpO₂ ${val(b.spo2_pct.toFixed(0) + '%')}, HRV ${val(o.hrv_ms.toFixed(0) + ' ms')}, core temperature ${val(t.core_body_temp_c.toFixed(2) + '°C')}. `
      + `Personal cumulative radiation dose stands at ${val(e.personal_cumulative_msv.toFixed(1) + ' mSv')} `
      + (e.personal_cumulative_msv < 50 ? ok('(within low advisory band).')
        : e.personal_cumulative_msv < 150 ? caut('(advisory monitoring band).')
        : warn('(warning band — EVA readiness must be re-evaluated).')),
  };

  return intros[scoreKey] || `Score of ${val(v + '/100')} — detailed assessment not available for this index.`;
}

// ── Report renderers ──────────────────────────────────
function renderOverviewReport(data) {
  el("overview-report-text").innerHTML = generateOverviewReport(data);
  el("overview-report-ts").textContent = nowTs(data.mission_day);
  const rep = el("overview-report");
  const modeCls = MODES[data.mode]?.cls || "nominal";
  rep.className = `hmu-report hmu-report--mode-${modeCls}`;
}

function renderScoreReportPanel(scoreKey, wearable, devices, missionDay) {
  el('score-report-text').innerHTML = generateScoreReport(scoreKey, wearable, devices, missionDay);
}

// ── Device metadata ─────────────────────────────────
const DEVICE_META = {
  bio_monitor:  { icon: "👕", name: "Bio-Monitor"       },
  oura_ring:    { icon: "💍", name: "Oura Ring"          },
  thermo_mini:  { icon: "🌡", name: "Thermo-mini"        },
  actiwatch:    { icon: "⌚", name: "Actiwatch"          },
  personal_co2: { icon: "💨", name: "Personal CO₂"       },
  evarm:        { icon: "☢", name: "EVARM"              },
};

// Extended lookup for related-params grouping — includes non-wearable sources
const DEVICE_DISPLAY = {
  ...DEVICE_META,
  environmental: { icon: "🌍", name: "Environmental" },
};

// ── State ────────────────────────────────────────────
let scoreChartInstance = null;
let lastOverview       = null;
let lastDetailData     = null;
let selectedScore      = null;
let currentScale       = "day";   // "day" | "week" | "month"

// ── Helpers ──────────────────────────────────────────
function el(id) { return document.getElementById(id); }

function fv(val, unit) {
  return unit ? `${val} <span style="font-size:0.7rem;color:var(--text-muted)">${unit}</span>` : `${val}`;
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function formatDate(d)  { return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
function formatTime(d)  { return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }); }
function scoreClass(v)  { return v > 70 ? "good" : v >= 60 ? "medium" : "low"; }
function initials(name) { const p = name.trim().split(/\s+/); return p.length >= 2 ? (p[0][0] + p[p.length-1][0]).toUpperCase() : name.slice(0,2).toUpperCase(); }

/** Worse of two score tiers (for radar edge colouring). */
function worseScoreClass(a, b) {
  const rank = (v) => (v > 70 ? 0 : v >= 60 ? 1 : 2);
  const w    = Math.max(rank(a), rank(b));
  return w === 0 ? "good" : w === 1 ? "medium" : "low";
}

const CREW_RADAR_AXES = [
  { key: "health_score", name: "Health" },
  { key: "sleep_score", name: "Sleep" },
  { key: "fatigue_score", name: "Fatigue" },
  { key: "stress_score", name: "Stress" },
  { key: "activity_score", name: "Activity" },
  { key: "readiness_score", name: "Readiness" },
];

/**
 * SVG hex (6-axis) radar for overview crew card — vertex + edge colours follow scoreClass (VD-R03).
 */
function crewRadarChartHtml(c) {
  const n   = 6;
  const cx  = 50;
  const cy  = 50;
  /* Large hex within 0..100 so the chart reads clearly on the card. */
  const rMax = 39;
  const rows = CREW_RADAR_AXES.map((axis) => {
    const v = Math.max(0, Math.min(100, Number(c[axis.key] ?? 0)));
    return { v, cls: scoreClass(v), name: axis.name };
  });

  const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const vAt  = (rad, i) => {
    const t = ang(i);
    return { x: cx + rad * Math.cos(t), y: cy + rad * Math.sin(t) };
  };

  const hexPoly = (frac) => {
    const r = rMax * frac;
    return Array.from({ length: n }, (_, i) => {
      const p = vAt(r, i);
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    }).join(" ");
  };

  const gridHex = [1, 2 / 3, 1 / 3]
    .map((f) => `<polygon class="radar-hex" points="${hexPoly(f)}" />`)
    .join("");

  const axisLines = Array.from({ length: n }, (_, i) => {
    const p = vAt(rMax, i);
    return `<line class="radar-axis" x1="${cx}" y1="${cy}" x2="${p.x.toFixed(2)}" y2="${p.y.toFixed(2)}" />`;
  }).join("");

  const dataPts = rows.map((row, i) => {
    const r = (row.v / 100) * rMax;
    return { ...vAt(r, i), ...row, i };
  });

  const polyPoints = dataPts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");

  const segs = [];
  for (let i = 0; i < n; i++) {
    const a = dataPts[i], b = dataPts[(i + 1) % n];
    const eCls = worseScoreClass(rows[i].v, rows[(i + 1) % n].v);
    segs.push(
      `<line class="radar-seg ${eCls}" x1="${a.x.toFixed(2)}" y1="${a.y.toFixed(2)}" x2="${b.x.toFixed(2)}" y2="${b.y.toFixed(2)}" />`,
    );
  }

  /* Just past the outer grid — short gap, labels stay legible. */
  const rLab = 42.2;
  const labels = rows.map((row, i) => {
    const p  = vAt(rLab, i);
    const co = Math.cos(ang(i));
    const anc = co > 0.45 ? "start" : co < -0.45 ? "end" : "middle";
    return `<g class="radar-lbl-g">`
         + `<text class="radar-lbl" x="${p.x.toFixed(2)}" y="${p.y.toFixed(2)}" text-anchor="${anc}" dominant-baseline="middle">${escapeHtml(row.name)}</text>`
         + `</g>`;
  }).join("");

  const dots = dataPts.map(
    (p) =>
      `<circle class="radar-vertex ${p.cls}" cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="3.1"/>`,
  );

  const aria = rows.map((r) => `${r.name} ${r.v}`).join(", ");

  /* Tight around chart + labels (less empty viewBox margin) so the graphic scales up in the card. */
  const vb = "-12 -6 124 116";
  return `<div class="crew-radar" role="img" aria-label="Score radar. ${aria}. Green above 70, yellow 60–70, red below 60.">`
    + `<svg class="crew-radar-svg" viewBox="${vb}" preserveAspectRatio="xMidYMid meet" overflow="visible" aria-hidden="true" focusable="false">`
    + gridHex
    + axisLines
    + `<polygon class="radar-surface" points="${polyPoints}" />`
    + segs.join("")
    + dots.join("")
    + labels
    + "</svg></div>";
}

// ── Clock ────────────────────────────────────────────
function tickClock() {
  const now = new Date();
  el("clock").textContent        = formatTime(now) + " UTC";
  el("mission-date").textContent = formatDate(now);
}

// ── Mission mode (aggregated): single label matching meta-value style (VD-R06) ──
function renderMissionMode(activeMode) {
  const node = el("mode-value");
  if (!node) return;
  const m = MODES[activeMode] || MODES.nominal_monitoring;
  node.className = `mode-display mode-display--${m.cls}`;
  node.innerHTML = `<span class="mode-display-icon" aria-hidden="true">${m.icon}</span><span class="mode-display-text">${m.chipLabel}</span>`;
  node.setAttribute("aria-label", `Operational mode: ${m.label}`);
}

/** Per-crew activity profile (`scenario` in API) from last overview. */
function scenarioForCrew(crewId) {
  const row = lastOverview?.crew?.find((c) => c.crew_member_id === crewId);
  return row?.scenario ?? "nominal";
}

/** Per-crew IVA/EVA from last overview. */
function locationForCrew(crewId) {
  const row = lastOverview?.crew?.find((c) => c.crew_member_id === crewId);
  return row?.location === "eva" ? "eva" : "iva";
}

/** Short labels for activity profile (matches backend `scenario` keys). */
const PROFILE_SCENARIO_SHORT = {
  nominal:  "Rest",
  stress:   "High workload",
  exercise: "Exercise",
  sleep:    "Sleep",
};

/** CSS class suffix for colored profile chip (matches `.scenario-*` in CSS). */
function activityProfileChipClass(key) {
  const m = {
    nominal:  "scenario-nominal",
    exercise: "scenario-exercise",
    stress:   "scenario-stress",
    sleep:    "scenario-sleep",
  };
  return `activity-profile-chip ${m[key] || "scenario-nominal"}`;
}

let detailCrewId      = null;
let detailScenarioKey = "nominal";
let detailLocationKey = "iva";

function updateDetailStatusTriggerText() {
  const trig = el("detail-status-trigger");
  if (!trig) return;
  const label = escapeHtml(PROFILE_SCENARIO_SHORT[detailScenarioKey] || detailScenarioKey);
  const loc = detailLocationKey === "eva" ? "EVA" : "IVA";
  const chipCls = activityProfileChipClass(detailScenarioKey);
  const locCls =
    detailLocationKey === "eva"
      ? "activity-location-inline activity-location-inline--eva"
      : "activity-location-inline";
  trig.innerHTML = `<span class="${chipCls}">${label}</span><span class="${locCls}"> · ${loc}</span>`;
}

function renderDetailStatusUI() {
  updateDetailStatusTriggerText();
  el("detail-scenario-group")?.querySelectorAll(".detail-scenario-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.scenario === detailScenarioKey);
  });
  el("detail-location-group")?.querySelectorAll(".detail-location-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.location === detailLocationKey);
  });
}

function closeDetailStatusPopover() {
  const pop = el("detail-status-popover");
  const trig = el("detail-status-trigger");
  if (pop && !pop.classList.contains("hidden")) {
    pop.classList.add("hidden");
    if (trig) trig.setAttribute("aria-expanded", "false");
  }
}

function toggleDetailStatusPopover() {
  const pop = el("detail-status-popover");
  const trig = el("detail-status-trigger");
  if (!pop || !trig) return;
  pop.classList.toggle("hidden");
  const open = !pop.classList.contains("hidden");
  trig.setAttribute("aria-expanded", String(open));
}

async function loadCrewDetailData() {
  if (!detailCrewId) return;
  el("score-detail-panel")?.classList.add("hidden");
  destroyScoreChart();
  selectedScore = null;

  const r = await fetch(
    `/api/crew/${encodeURIComponent(detailCrewId)}/detail?scenario=${encodeURIComponent(detailScenarioKey)}&location=${encodeURIComponent(detailLocationKey)}`,
  );
  if (!r.ok) throw new Error(await r.text());
  const data = await r.json();
  lastDetailData = data;
  if (data.scenario_assumption) detailScenarioKey = data.scenario_assumption;
  if (data.location) detailLocationKey = data.location;

  renderDeviceStatusBar(data.devices);
  renderScoreCards(data.scores);
  renderAlerts(data.alerts);
  renderDetailStatusUI();
  initChat(detailCrewId);
  fetchAndRenderAssessment(data).catch(console.error);
}

function onDetailStatusOutsideClick(e) {
  const wrap = el("detail-header-status-wrap");
  const pop = el("detail-status-popover");
  const panel = el("detail-panel");
  if (!wrap || !pop || pop.classList.contains("hidden")) return;
  if (!panel || panel.classList.contains("hidden")) return;
  if (wrap.contains(e.target)) return;
  closeDetailStatusPopover();
}

function bindDetailStatusPopover() {
  el("detail-status-trigger")?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleDetailStatusPopover();
  });
  el("detail-scenario-group")?.addEventListener("click", async (e) => {
    const btn = e.target.closest(".detail-scenario-btn");
    if (!btn || !detailCrewId) return;
    e.stopPropagation();
    const next = btn.dataset.scenario;
    if (!next || next === detailScenarioKey) return;
    detailScenarioKey = next;
    try {
      await loadCrewDetailData();
    } catch (err) {
      console.error(err);
    }
    closeDetailStatusPopover();
  });
  el("detail-location-group")?.addEventListener("click", async (e) => {
    const btn = e.target.closest(".detail-location-btn");
    if (!btn || !detailCrewId) return;
    e.stopPropagation();
    const next = btn.dataset.location;
    if (!next || next === detailLocationKey) return;
    detailLocationKey = next;
    try {
      await loadCrewDetailData();
    } catch (err) {
      console.error(err);
    }
    closeDetailStatusPopover();
  });
  document.addEventListener("mousedown", onDetailStatusOutsideClick);
}

// ── Crew board (overview) ────────────────────────────
function renderCrewBoard(data) {
  const board = el("crew-board");
  board.innerHTML = "";
  data.crew.forEach((c) => {
    const modeCls = MODES[c.mode]?.cls || "nominal";
    const scenKey = ACTIVITY_PROFILE_KEYS.has(c.scenario) ? c.scenario : "nominal";
    const locKey = c.location === "eva" ? "eva" : "iva";
    const activityLine = formatActivityStatus(scenKey, locKey);
    const card    = document.createElement("article");
    card.className = `crew-card mode-${modeCls}`;
    card.tabIndex  = 0;
    card.setAttribute("role", "button");
    card.setAttribute(
      "aria-label",
      `${c.display_name}, ${c.role}. ${activityLine}. Open detail.`,
    );
    card.innerHTML = `
      <div class="avatar-ring ${modeCls}">
        <div class="avatar-inner">
          <img src="${escapeHtml(c.avatar_url)}" alt="" loading="lazy" />
          <div class="avatar-fallback">${escapeHtml(initials(c.display_name))}</div>
        </div>
      </div>
      <h2 class="crew-name">${escapeHtml(c.display_name)}</h2>
      <p class="crew-role-txt">${escapeHtml(c.role)}</p>
      <span class="crew-id-badge">${escapeHtml(c.crew_member_id)}</span>
      <div class="crew-activity-status">
        <div class="crew-activity-status-split">
          <span class="${activityProfileChipClass(scenKey)}">${escapeHtml(PROFILE_SCENARIO_SHORT[scenKey] || scenKey)}</span>
          <span class="crew-activity-location${locKey === "eva" ? " crew-activity-location--eva" : ""}">${locKey === "eva" ? "EVA" : "IVA"}</span>
        </div>
      </div>
      <div class="crew-scores">
        ${crewRadarChartHtml(c)}
      </div>
      <p class="crew-open-hint">Click for detailed view</p>`;

    const img  = card.querySelector("img");
    const ring = card.querySelector(".avatar-ring");
    img.addEventListener("error", () => ring.classList.add("img-error"));
    card.addEventListener("click",   () => openDetail(c.crew_member_id));
    card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(c.crew_member_id); } });
    board.appendChild(card);
  });
}

// ── Habitat strip (overview) ─────────────────────────
function renderHabitat(data) {
  const env = data.environmental;
  el("habitat-row").innerHTML = [
    habGaugeCard("CO₂",         env.co2_unit,      "cabin_co2_mmhg",      env.cabin_co2_mmhg),
    habBandCard ("Temperature",  env.cabin_temp_c.toFixed(1),       env.temp_unit,     "cabin_temperature_c", env.cabin_temp_c),
    habBandCard ("Humidity",     env.cabin_humidity_pct.toFixed(0), env.humidity_unit, "cabin_humidity_pct",  env.cabin_humidity_pct),
    radiationHabCard(env.mission_cumulative_dose_msv.toFixed(1), env.dose_unit, env.mission_cumulative_dose_msv),
  ].join("");
  el("habitat-integrity").textContent = `Environmental sensor integrity: ${data.integrity_environmental}`;
}

// ══════════════════════════════════════════════════════
// Visual modality rendering functions
// ══════════════════════════════════════════════════════

/**
 * ARC_GAUGE — 270° SVG arc gauge with caution/warning tick marks.
 * Arc sweeps clockwise from 135° (7:30) through top to 45° (4:30).
 * Returns an SVG string. viewBox="0 0 100 72".
 */
function arcGaugeSvg(paramId, rawNum) {
  const rng = PARAM_RANGES[paramId];
  const lim = PARAM_LIMITS[paramId];
  if (!rng || !lim || rawNum == null) return '';

  const { min, max } = rng;
  const sev     = paramSeverity(paramId, rawNum);
  const fillHex = sev === 'warning' ? '#f85149' : sev === 'caution' ? '#d29922' : '#3fb950';
  const c01     = v => Math.max(0, Math.min(1, v));

  const cx = 50, cy = 42, r = 36, sw = 7;
  const START = 135, SWEEP = 270;
  const valDeg = START + c01((rawNum - min) / (max - min)) * SWEEP;

  function pt(deg) {
    const rad = deg * Math.PI / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  }
  function arcD(s, e) {
    const [sx, sy] = pt(s), [ex, ey] = pt(e);
    let d = e - s; while (d < 0) d += 360; while (d > 360) d -= 360;
    return `M${sx.toFixed(2)},${sy.toFixed(2)} A${r},${r} 0 ${d > 180 ? 1 : 0},1 ${ex.toFixed(2)},${ey.toFixed(2)}`;
  }

  const ticks = [
    [lim.low_warn,    '#f85149'], [lim.low_caution,  '#d29922'],
    [lim.high_caution,'#d29922'], [lim.high_warn,    '#f85149'],
  ].filter(([v]) => v != null && v > min && v < max)
   .map(([v, tc]) => {
     const deg = START + c01((v - min) / (max - min)) * SWEEP;
     const rad = deg * Math.PI / 180;
     const r1 = r - sw / 2 - 1, r2 = r + sw / 2 + 2;
     return `<line x1="${(cx+r1*Math.cos(rad)).toFixed(1)}" y1="${(cy+r1*Math.sin(rad)).toFixed(1)}"
                   x2="${(cx+r2*Math.cos(rad)).toFixed(1)}" y2="${(cy+r2*Math.sin(rad)).toFixed(1)}"
               stroke="${tc}" stroke-width="2" stroke-linecap="round"/>`;
   }).join('');

  return `<svg class="gauge-svg" viewBox="0 0 100 72" aria-hidden="true">
    <path d="${arcD(START, START + SWEEP - 0.01)}" fill="none" stroke="#21262d" stroke-width="${sw}" stroke-linecap="round"/>
    ${c01((rawNum - min)/(max - min)) > 0.003 ? `<path d="${arcD(START, valDeg)}" fill="none" stroke="${fillHex}" stroke-width="${sw}" stroke-linecap="round"/>` : ''}
    ${ticks}
    <text x="50" y="40" text-anchor="middle" dominant-baseline="middle" font-size="14" font-weight="700" fill="${fillHex}" font-family="inherit">${rawNum}</text>
  </svg>`;
}

/**
 * BAND_INDICATOR — 5-zone horizontal band with sliding cursor.
 * Zones left→right: Warning-Low · Caution-Low · OK · Caution-High · Warning-High.
 * Returns an HTML string.
 */
function bandIndicatorHtml(paramId, rawNum) {
  const rng = PARAM_RANGES[paramId];
  const lim = PARAM_LIMITS[paramId];
  if (!rng || !lim || rawNum == null) return '';

  const { min, max } = rng;
  const total = max - min;
  const c01   = v => Math.max(0, Math.min(1, v));
  const pct   = (a, b) => (c01((b - a) / total) * 100).toFixed(2) + '%';

  const loW = lim.low_warn    ?? min;
  const loC = lim.low_caution ?? loW;
  const hiC = lim.high_caution ?? max;
  const hiW = lim.high_warn   ?? hiC;

  const sev     = paramSeverity(paramId, rawNum);
  const zoneTxt = !sev ? 'IN RANGE'
                : rawNum < loC ? 'LOW' : rawNum > hiC ? 'HIGH' : 'NEAR LIMIT';
  const zoneCls = !sev ? 'zone-ok' : sev === 'warning' ? 'zone-warning' : 'zone-caution';
  const curPct  = (c01((rawNum - min) / total) * 100).toFixed(2);

  return `<div class="band-ind">
    <div class="band-track">
      <div class="band-seg bs-w" style="flex:0 0 ${pct(min, loW)}"></div>
      <div class="band-seg bs-c" style="flex:0 0 ${pct(loW, loC)}"></div>
      <div class="band-seg bs-o" style="flex:0 0 ${pct(loC, hiC)}"></div>
      <div class="band-seg bs-c" style="flex:0 0 ${pct(hiC, hiW)}"></div>
      <div class="band-seg bs-w" style="flex:0 0 ${pct(hiW, max)}"></div>
      <div class="band-cursor" style="left:${curPct}%"></div>
    </div>
    <div class="band-zone-txt ${zoneCls}">${zoneTxt}</div>
  </div>`;
}

/**
 * Mini progress bar for sensor rows — shows value position in the param range
 * with caution/warning tick marks. 4px height, spans full row width.
 */
function sensorMiniBar(paramId, rawNum) {
  const rng = PARAM_RANGES[paramId];
  const lim = PARAM_LIMITS[paramId];
  if (!rng || !lim || rawNum == null) return '';

  const { min, max } = rng;
  const c01     = v => Math.max(0, Math.min(1, v));
  const fillPct = (c01((rawNum - min) / (max - min)) * 100).toFixed(1);
  const sev     = paramSeverity(paramId, rawNum);
  const cls     = sev === 'warning' ? 'mb-w' : sev === 'caution' ? 'mb-c' : 'mb-g';

  const ticks = [
    [lim.low_warn,    'mb-w'], [lim.low_caution,  'mb-c'],
    [lim.high_caution,'mb-c'], [lim.high_warn,    'mb-w'],
  ].filter(([v]) => v != null && v > min && v < max)
   .map(([v, tc]) => {
     const lp = (c01((v - min) / (max - min)) * 100).toFixed(1);
     return `<div class="mb-tick ${tc}" style="left:${lp}%"></div>`;
   }).join('');

  return `<div class="sdp-mini-bar"><div class="mb-track"><div class="mb-fill ${cls}" style="width:${fillPct}%"></div>${ticks}</div></div>`;
}

// ── Habitat card builders ─────────────────────────────

/**
 * Standard hab card — label + value + severity badge (VD-R02: color + text word).
 */
function habCard(label, value, unit, paramId, rawNum) {
  const cls = paramClass(paramId, rawNum);
  const sev = paramSeverity(paramId, rawNum);
  const badge = sev ? `<span class="hab-severity-badge ${sev}">${sev.toUpperCase()}</span>` : '';
  return `<div class="hab-card${sev ? ' hab-' + sev : ''}">
    <div class="hab-card-top"><span class="hab-label">${label}</span>${badge}</div>
    <span class="hab-value ${cls}">${value}<span class="hab-unit">${unit}</span></span>
  </div>`;
}

/**
 * ARC_GAUGE hab card — label + arc gauge SVG + unit (for CO₂).
 * Number is rendered inside the SVG; no separate hab-value span needed.
 */
function habGaugeCard(label, unit, paramId, rawNum) {
  const sev   = paramSeverity(paramId, rawNum);
  const badge = sev ? `<span class="hab-severity-badge ${sev}">${sev.toUpperCase()}</span>` : '';
  return `<div class="hab-card hab-card-gauge${sev ? ' hab-' + sev : ''}">
    <div class="hab-card-top"><span class="hab-label">${label}</span>${badge}</div>
    ${arcGaugeSvg(paramId, rawNum)}
    <span class="hab-unit-label">${unit}</span>
  </div>`;
}

/**
 * BAND_INDICATOR hab card (temperature, humidity) — value + 5-zone band with cursor.
 * VD-R10: relative judgment ("where in the band?") without recalling two limits.
 */
function habBandCard(label, value, unit, paramId, rawNum) {
  const cls   = paramClass(paramId, rawNum);
  const sev   = paramSeverity(paramId, rawNum);
  const badge = sev ? `<span class="hab-severity-badge ${sev}">${sev.toUpperCase()}</span>` : '';
  return `<div class="hab-card${sev ? ' hab-' + sev : ''}">
    <div class="hab-card-top"><span class="hab-label">${label}</span>${badge}</div>
    <span class="hab-value ${cls}">${value}<span class="hab-unit">${unit}</span></span>
    ${bandIndicatorHtml(paramId, rawNum)}
  </div>`;
}

/**
 * Radiation cumulative dose card — progress bar toward advisory (50 mSv) and
 * warning (150 mSv) anchors (VD-R10: "approach to limit" spatial encoding).
 */
function radiationHabCard(value, unit, rawNum) {
  const cls = paramClass('radiation_cumulative_msv', rawNum);
  const sev = paramSeverity('radiation_cumulative_msv', rawNum);
  const badge = sev ? `<span class="hab-severity-badge ${sev}">${sev.toUpperCase()}</span>` : '';
  const pctFill    = Math.min(rawNum / 150 * 100, 100).toFixed(1);
  const advisory50 = (50 / 150 * 100).toFixed(1);
  const barColor   = sev === 'warning'  ? 'var(--emergency)'
                   : sev === 'caution'  ? 'var(--caution)'
                   : 'var(--success)';
  return `<div class="hab-card hab-card-radiation${sev ? ' hab-' + sev : ''}">
    <div class="hab-card-top"><span class="hab-label">CUMUL. DOSE</span>${badge}</div>
    <span class="hab-value ${cls}">${value}<span class="hab-unit">${unit}</span></span>
    <div class="hab-rad-bar-wrap">
      <div class="hab-rad-bar" style="width:${pctFill}%;background:${barColor}"></div>
      <div class="hab-rad-marker" style="left:${advisory50}%" title="ADVISORY 50 mSv"></div>
    </div>
    <div class="hab-rad-anchors">
      <span class="hab-rad-anchor advisory">ADV 50</span>
      <span class="hab-rad-anchor warning">WARN 150</span>
    </div>
  </div>`;
}

// ── Device status bar (in detail modal header) ────────
function renderDeviceStatusBar(devices) {
  el("device-status-bar").innerHTML = Object.entries(DEVICE_META).map(([key, meta]) => {
    const st  = devices[key].status;
    const sig = st.signal || (st.connected ? "ok" : "stale");
    const batt = st.battery_pct != null
      ? `<span class="dev-batt${st.battery_pct < 20 ? " low" : ""}">${st.battery_pct}%</span>`
      : `<span class="dev-batt">wired</span>`;
    return `<div class="dev-chip"><span class="dev-dot ${sig}"></span><span class="dev-name">${meta.icon} ${meta.name}</span>${batt}</div>`;
  }).join("");
}

// ── Score cards (detail modal) ────────────────────────
function renderScoreCards(wearable) {
  const SCORES = [
    { key: "health_score",            label: "Health" },
    { key: "sleep_score",             label: "Sleep"  },
    { key: "activity_score",          label: "Activity" },
    { key: "fatigue_score",           label: "Fatigue" },
    { key: "stress_management_score", label: "Stress mgmt." },
    { key: "readiness_score",         label: "Readiness" },
  ];

  el("detail-score-grid").innerHTML = SCORES.map(({ key, label }) => {
    const v = wearable[key];
    return `<div class="score-card" role="button" tabindex="0"
               aria-label="${label}: ${v}. Click to view trend and sensors."
               data-score="${key}">
      <div class="label">${label}</div>
      <div class="value ${scoreClass(v)}">${v}<span>/100</span></div>
    </div>`;
  }).join("");

  el("detail-score-grid").querySelectorAll(".score-card").forEach((card) => {
    card.addEventListener("click",   () => toggleScoreDetail(card.dataset.score));
    card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleScoreDetail(card.dataset.score); } });
  });
}

// ── Score detail panel ────────────────────────────────
function toggleScoreDetail(scoreKey) {
  if (selectedScore === scoreKey) {
    closeScoreDetail();
    return;
  }
  selectedScore = scoreKey;

  // Update card selection highlight
  el("detail-score-grid").querySelectorAll(".score-card").forEach((c) => {
    c.classList.toggle("selected", c.dataset.score === scoreKey);
  });

  const meta = SCORE_DETAILS[scoreKey];
  el("sdp-label").textContent = meta.label;
  el("sdp-desc").textContent  = meta.desc;

  // Sync the scale buttons to current scale
  syncScaleButtons();

  const scoreValue = lastDetailData?.scores[scoreKey] ?? 70;
  renderScoreChart(scoreKey, scoreValue, meta.color, currentScale);
  renderSensorSubset(meta, lastDetailData?.devices, scoreKey, scoreValue, lastDetailData?.cognitive_risk);
  renderScoreReportPanel(scoreKey, lastDetailData?.scores, lastDetailData?.devices, lastDetailData?.mission_day);

  el("score-detail-panel").classList.remove("hidden");
  el("score-detail-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function closeScoreDetail() {
  selectedScore = null;
  el("score-detail-panel").classList.add("hidden");
  el("detail-score-grid").querySelectorAll(".score-card").forEach((c) => c.classList.remove("selected"));
  el("sdp-advice").innerHTML = "";
  destroyScoreChart();
}

function syncScaleButtons() {
  document.querySelectorAll(".sdp-scale-btn").forEach((btn) => {
    const active = btn.dataset.scale === currentScale;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function onScaleChange(scale) {
  if (scale === currentScale || !selectedScore) return;
  currentScale = scale;
  syncScaleButtons();
  const meta  = SCORE_DETAILS[selectedScore];
  const value = lastDetailData?.scores[selectedScore] ?? 70;
  renderScoreChart(selectedScore, value, meta.color, currentScale);
}

// ── Score trend chart ─────────────────────────────────

function destroyScoreChart() {
  if (scoreChartInstance) { scoreChartInstance.destroy(); scoreChartInstance = null; }
}

function _wave(seed, i, period = 48) {
  const x = 2 * Math.PI * (i / period) + seed;
  return Math.sin(x) * 0.5 + Math.sin(2 * x) * 0.15;
}

/**
 * Build a plausible mock series anchored to `currentValue`.
 * @param {number}  currentValue  Today's / most-recent score
 * @param {number}  N             Number of data points
 * @param {number}  noise         Max random swing per point
 * @param {number}  drift         Linear drift from first to last point (can be negative)
 * @param {number}  seed          Wave seed for smooth oscillation
 */
function mockSeries(currentValue, N, noise, drift, seed) {
  const values = [];
  for (let i = 0; i < N; i++) {
    const progress = i / (N - 1);                   // 0 → 1
    const wave     = _wave(seed, i) * noise * 0.6;
    const rand     = (Math.sin(seed * 31.7 + i * 7.3) * 0.5 + 0.5 - 0.5) * noise;
    const trendOff = drift * progress - drift;      // oldest has full drift offset
    values.push(Math.max(0, Math.min(100, Math.round(currentValue + trendOff + wave + rand))));
  }
  values[N - 1] = currentValue;                     // anchor newest = actual score
  return values;
}

const SCALE_CONFIG = {
  day: {
    N:      30,
    noise:  10,
    drift:   6,
    xLabel: (i, N) => i === N - 1 ? "Today" : `D−${N - 1 - i}`,
    xMax:   9,
    xTitle: "Last 30 days",
    pointRadius: 2,
  },
  week: {
    N:      12,
    noise:   6,
    drift:   8,
    xLabel: (i, N) => i === N - 1 ? "This wk" : `W−${N - 1 - i}`,
    xMax:   12,
    xTitle: "Last 12 weeks",
    pointRadius: 3,
  },
  month: {
    N:       6,
    noise:   4,
    drift:  10,
    xLabel: (i, N) => i === N - 1 ? "This mo" : `M−${N - 1 - i}`,
    xMax:    6,
    xTitle: "Last 6 months",
    pointRadius: 4,
  },
};

function renderScoreChart(scoreKey, currentValue, color, scale = currentScale) {
  const canvas = el("score-chart");
  if (!canvas || typeof Chart === "undefined") return;
  destroyScoreChart();

  const cfg    = SCALE_CONFIG[scale];
  const seed   = scoreKey.charCodeAt(0) * 0.019 + scoreKey.charCodeAt(scoreKey.length - 1) * 0.007;
  const labels = Array.from({ length: cfg.N }, (_, i) => cfg.xLabel(i, cfg.N));
  const values = mockSeries(currentValue, cfg.N, cfg.noise, cfg.drift, seed);

  // Build a subtle fill gradient
  const ctx    = canvas.getContext("2d");
  const grad   = ctx.createLinearGradient(0, 0, 0, canvas.offsetHeight || 140);
  grad.addColorStop(0,   color + "33");
  grad.addColorStop(1,   color + "05");

  // Threshold floor reference lines for scores with defined minimums (VD-R10)
  const thresholdDatasets = [];
  if (scoreKey === 'fatigue_score' || scoreKey === 'sleep_score') {
    thresholdDatasets.push({
      label:       'Caution floor (70)',
      data:        Array(cfg.N).fill(70),
      borderColor: '#d29922',
      borderDash:  [5, 4],
      borderWidth: 1.5,
      pointRadius: 0,
      fill:        false,
      tension:     0,
    });
    thresholdDatasets.push({
      label:       'Warning floor (60)',
      data:        Array(cfg.N).fill(60),
      borderColor: '#f85149',
      borderDash:  [5, 4],
      borderWidth: 1.5,
      pointRadius: 0,
      fill:        false,
      tension:     0,
    });
  }

  scoreChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label:           SCORE_DETAILS[scoreKey].label,
        data:            values,
        borderColor:     color,
        backgroundColor: grad,
        tension:         scale === "day" ? 0.25 : 0.35,
        fill:            true,
        pointRadius:     cfg.pointRadius,
        pointBackgroundColor: color,
        pointHoverRadius: cfg.pointRadius + 2,
      }, ...thresholdDatasets],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      interaction:         { mode: "index", intersect: false },
      plugins: {
        legend: {
          display: thresholdDatasets.length > 0,
          position: 'bottom',
          labels: { color: '#8b949e', boxWidth: 18, font: { size: 10 } },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.parsed.y} / 100`,
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#8b949e", maxTicksLimit: cfg.xMax, font: { size: 10 } },
          grid:  { color: "#21262d" },
          title: { display: true, text: cfg.xTitle, color: "#8b949e", font: { size: 9 } },
        },
        y: {
          min:   0,
          max:   100,
          ticks: { color: "#8b949e", stepSize: 20 },
          grid:  { color: "#21262d" },
          title: { display: true, text: "Score (0–100)", color: "#8b949e", font: { size: 9 } },
        },
      },
    },
  });
}

// ── Score advice block ────────────────────────────────
function renderScoreAdviceBlock(scoreKey, scoreValue, cognitiveRisk) {
  const advice = SCORE_ADVICE[scoreKey];
  let tier = null;
  let text = null;
  if (advice) {
    if (scoreValue < 60) { tier = "warning"; text = advice.warning; }
    else if (scoreValue < 70) { tier = "caution"; text = advice.caution; }
  }

  const isCogScore = scoreKey === "fatigue_score" || scoreKey === "sleep_score";
  const crTier = cognitiveRisk?.tier;

  if (!tier && !(isCogScore && crTier)) return "";

  const blocks = [];
  if (tier && text) {
    blocks.push(`<div class="score-advice-block score-advice-block--${tier}">
      <span class="score-advice-label">${tier === "warning" ? "Warning" : "Caution"}</span>
      <p class="score-advice-text">${text}</p>
    </div>`);
  }
  if (isCogScore && crTier) {
    blocks.push(`<div class="score-advice-block score-advice-block--${crTier}">
      <span class="score-advice-label">Cognitive Performance Risk</span>
      <p class="score-advice-text">Multiple performance-affecting factors are elevated simultaneously. Judgment and reaction time may be impaired. Address the most tractable contributing factor (CO₂ or SpO₂) first, then prioritise sleep.</p>
    </div>`);
  }
  return blocks.join("");
}

// ── Relevant sensor subset ────────────────────────────
function renderSensorSubset(meta, devices, scoreKey, scoreValue, cognitiveRisk) {
  if (!devices) return;
  const sensorsHtml = meta.sensors.map(({ device, icon, name, fields }) => {
    const d = devices[device];
    if (!d) return "";
    const rows = fields.map(({ label, get, param, num }) => {
      const rawV = (param && num) ? num(d) : null;
      const cls  = (rawV != null && param) ? paramClass(param, rawV) : '';
      const bar  = (rawV != null && param && PARAM_RANGES[param]) ? sensorMiniBar(param, rawV) : '';
      return `<div class="sdp-row${bar ? ' has-bar' : ''}">
        <span class="sdp-row-label">${label}</span>
        <span class="sdp-row-value ${cls}">${get(d)}</span>
        ${bar}
      </div>`;
    }).join("");
    return `<div class="sdp-device-block">
      <div class="sdp-device-header">${icon} ${name}</div>
      <div class="sdp-device-rows">${rows}</div>
    </div>`;
  }).join("");
  el("sdp-sensors").innerHTML = sensorsHtml;
  // Advice panels rendered separately below HMU Intelligence — Score Assessment
  el("sdp-advice").innerHTML = renderScoreAdviceBlock(scoreKey, scoreValue, cognitiveRisk);
}

// ── Environmental (detail modal) ──────────────────────
function renderEnv(env, integrity) {
  el("detail-env-grid").innerHTML = [
    vitalCard("Cabin CO₂",   env.cabin_co2_mmhg.toFixed(2),              env.co2_unit,      "cabin_co2_mmhg",           env.cabin_co2_mmhg),
    vitalCard("Temperature", env.cabin_temp_c.toFixed(1),                env.temp_unit,     "cabin_temperature_c",      env.cabin_temp_c),
    vitalCard("Humidity",    env.cabin_humidity_pct.toFixed(0),          env.humidity_unit, "cabin_humidity_pct",       env.cabin_humidity_pct),
    vitalCard("Cumul. dose", env.mission_cumulative_dose_msv.toFixed(1), env.dose_unit,     "radiation_cumulative_msv", env.mission_cumulative_dose_msv),
  ].join("");
  el("detail-env-integrity").textContent = `Environmental fusion: ${integrity.environmental}`;
}

function vitalCard(label, value, unit, paramId, rawNum) {
  const cls = paramClass(paramId, rawNum);
  return `<div class="vital">
    <div class="v-label">${label}</div>
    <div class="v-value ${cls}">${value}<span class="v-unit">${unit}</span></div>
  </div>`;
}

// ── Alerts (detail modal) ─────────────────────────────
// ══════════════════════════════════════════════════════
// Alert trend charts
// ══════════════════════════════════════════════════════

/** Format a negative-minute offset as "−2h 30m" / "−6h" / "Now". */
function fmtMin(min) {
  if (min === 0) return 'Now';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `−${h}h` : `−${h}h ${m}m`;
}

/** Generate a plausible 24-point time series centred on `center` with noise `jitter`. */
function mockParamSeries(center, n = 24, jitter = 1) {
  const out = [];
  let v = center;
  for (let i = 0; i < n; i++) {
    v += (Math.random() - 0.5) * jitter * 2;
    v  = v * 0.85 + center * 0.15;           // mean-revert toward center
    out.push(parseFloat(v.toFixed(2)));
  }
  out[n - 1] = center;                        // last point is current reading
  return out;
}

/** Time labels for a 24-point mock hourly series: "−23h" … "Now". */
function mockHourLabels(n = 24) {
  return Array.from({ length: n }, (_, i) => {
    const h = n - 1 - i;
    return h === 0 ? 'Now' : `−${h}h`;
  });
}

/** Monotonically increasing cumulative series ending at `current`. */
function mockCumulativeSeries(current, n = 24, dailyRate = 1.1) {
  const hourlyRate = dailyRate / 24;
  return Array.from({ length: n }, (_, i) => {
    const offset = (n - 1 - i) * hourlyRate;
    return parseFloat((current - offset + (Math.random() - 0.5) * 0.1).toFixed(1));
  });
}

/**
 * Maps alert `parameter` strings (from the backend AlertItem) to chart config.
 * `getSeries(d)` and `getLabels(d)` receive `lastDetailData`.
 * `thresholds` are rendered as dashed horizontal reference lines.
 */
const ALERT_TREND_MAP = {
  'SpO₂': {
    label: 'SpO₂',       unit: '%',     color: '#79c0ff',
    getSeries: d => mockParamSeries(d.devices.bio_monitor.spo2_pct, 48, 0.8),
    getLabels:  () => mockHourLabels(48),
    thresholds: [
      { value: 94, label: 'Caution < 94%',  color: '#d29922' },
      { value: 92, label: 'Warning < 92%',  color: '#f85149' },
    ],
  },
  'Heart rate': {
    label: 'Heart Rate',  unit: 'bpm',   color: '#f0883e',
    getSeries: d => mockParamSeries(d.devices.bio_monitor.heart_rate_bpm, 48, 6),
    getLabels:  () => mockHourLabels(48),
    thresholds: [
      { value: 45,  label: 'Caution < 45 bpm',   color: '#d29922' },
      { value: 40,  label: 'Warning < 40 bpm',   color: '#f85149' },
      { value: 120, label: 'Caution > 120 bpm',  color: '#d29922' },
      { value: 130, label: 'Warning > 130 bpm',  color: '#f85149' },
    ],
  },
  'Breathing rate': {
    label: 'Breathing Rate', unit: 'br/min', color: '#56d364',
    getSeries: d => mockParamSeries(d.devices.bio_monitor.breathing_rate_bpm, 48, 2),
    getLabels:  () => mockHourLabels(48),
    thresholds: [
      { value: 10, label: 'Caution < 10 br/min', color: '#d29922' },
      { value: 8,  label: 'Warning < 8 br/min',  color: '#f85149' },
      { value: 20, label: 'Caution > 20 br/min', color: '#d29922' },
      { value: 24, label: 'Warning > 24 br/min', color: '#f85149' },
    ],
  },
  'Systolic BP': {
    label: 'Systolic Blood Pressure', unit: 'mmHg', color: '#db6d28',
    getSeries: d => mockParamSeries(d.devices.bio_monitor.systolic_mmhg, 24, 5),
    getLabels:  () => mockHourLabels(24),
    thresholds: [
      { value: 90,  label: 'Caution < 90 mmHg',  color: '#d29922' },
      { value: 80,  label: 'Warning < 80 mmHg',  color: '#f85149' },
      { value: 160, label: 'Caution > 160 mmHg', color: '#d29922' },
      { value: 170, label: 'Warning > 170 mmHg', color: '#f85149' },
    ],
  },
  'Cabin CO₂': {
    label: 'Cabin CO₂',  unit: 'mmHg', color: '#d29922',
    getSeries: d => mockParamSeries(d.environmental.cabin_co2_mmhg, 24, 0.3),
    getLabels:  () => mockHourLabels(24),
    thresholds: [
      { value: 6, label: 'Caution > 6 mmHg', color: '#d29922' },
      { value: 8, label: 'Warning > 8 mmHg',  color: '#f85149' },
    ],
  },
  'Cumulative dose': {
    label: 'Cumulative Radiation Dose', unit: 'mSv', color: '#bc8cff',
    getSeries: d => mockCumulativeSeries(d.environmental.mission_cumulative_dose_msv, 24, 1.1),
    getLabels:  () => mockHourLabels(24),
    thresholds: [
      { value: 50,  label: 'Caution > 50 mSv',  color: '#d29922' },
      { value: 150, label: 'Warning > 150 mSv', color: '#f85149' },
    ],
  },
  'Cabin temperature': {
    label: 'Cabin Temperature', unit: '°C', color: '#58a6ff',
    getSeries: d => mockParamSeries(d.environmental.cabin_temp_c, 24, 0.4),
    getLabels:  () => mockHourLabels(24),
    thresholds: [
      { value: 19, label: 'Caution < 19 °C',  color: '#d29922' },
      { value: 18, label: 'Warning < 18 °C',  color: '#f85149' },
      { value: 26, label: 'Caution > 26 °C',  color: '#d29922' },
      { value: 27, label: 'Warning > 27 °C',  color: '#f85149' },
    ],
  },
  'Core body temperature': {
    label: 'Core Body Temperature', unit: '°C', color: '#f0883e',
    getSeries: d => mockParamSeries(d.devices?.thermo_mini?.core_body_temp_c ?? 37.0, 24, 0.2),
    getLabels:  () => mockHourLabels(24),
    thresholds: [
      { value: 36.0, label: 'Caution < 36.0 °C',  color: '#d29922' },
      { value: 35.0, label: 'Warning < 35.0 °C',  color: '#f85149' },
      { value: 37.5, label: 'Caution > 37.5 °C',  color: '#d29922' },
      { value: 38.0, label: 'Warning > 38.0 °C',  color: '#f85149' },
    ],
  },
  'Personal CO₂': {
    label: 'Personal CO₂', unit: 'ppm', color: '#d29922',
    getSeries: d => mockParamSeries(d.devices?.personal_co2?.current_ppm ?? 600, 24, 80),
    getLabels:  () => mockHourLabels(24),
    thresholds: [
      { value: 1000, label: 'Caution > 1 000 ppm', color: '#d29922' },
      { value: 2500, label: 'Warning > 2 500 ppm', color: '#f85149' },
    ],
  },
  'Cabin humidity': {
    label: 'Cabin Humidity', unit: '%', color: '#79c0ff',
    getSeries: d => mockParamSeries(d.environmental.cabin_humidity_pct, 24, 2),
    getLabels:  () => mockHourLabels(24),
    thresholds: [
      { value: 30, label: 'Caution < 30%',  color: '#d29922' },
      { value: 25, label: 'Warning < 25%',  color: '#f85149' },
      { value: 70, label: 'Caution > 70%',  color: '#d29922' },
      { value: 75, label: 'Warning > 75%',  color: '#f85149' },
    ],
  },
  'Diastolic BP': {
    label: 'Diastolic Blood Pressure', unit: 'mmHg', color: '#bc8cff',
    getSeries: d => mockParamSeries(d.devices?.bio_monitor?.diastolic_mmhg ?? 80, 24, 4),
    getLabels:  () => mockHourLabels(24),
    thresholds: [],
  },
  'Resting heart rate': {
    label: 'Resting Heart Rate', unit: 'bpm', color: '#f0883e',
    getSeries: d => mockParamSeries(d.devices?.bio_monitor?.resting_heart_rate_bpm ?? 60, 24, 3),
    getLabels:  () => mockHourLabels(24),
    thresholds: [],
  },
  'Body temp deviation': {
    label: 'Body Temperature Deviation', unit: '°C', color: '#56d364',
    getSeries: d => mockParamSeries(d.devices?.oura_ring?.body_temp_deviation_c ?? 0, 24, 0.15),
    getLabels:  () => mockHourLabels(24),
    thresholds: [
      { value: 0, label: 'Baseline', color: '#8b949e' },
    ],
  },
  'Dose rate': {
    label: 'Dose Rate', unit: 'μSv/h', color: '#bc8cff',
    getSeries: d => mockParamSeries(d.devices?.evarm?.dose_rate_usv_h ?? 50, 24, 10),
    getLabels:  () => mockHourLabels(24),
    thresholds: [],
  },
  'Personal cumulative dose': {
    label: 'Personal Cumulative Dose', unit: 'mSv', color: '#bc8cff',
    getSeries: d => mockCumulativeSeries(d.devices?.evarm?.personal_cumulative_msv ?? 0, 24, 1.1),
    getLabels:  () => mockHourLabels(24),
    thresholds: [],
  },
  // Integrity alerts — map to underlying signal trends
  'Heart rate channel':    null,   // handled via aliasing below
  'SpO₂ channel':          null,
  'Environmental fusion':  null,
};
// Integrity alert aliases → same chart as the raw parameter
ALERT_TREND_MAP['Heart rate channel']   = ALERT_TREND_MAP['Heart rate'];
ALERT_TREND_MAP['SpO₂ channel']         = ALERT_TREND_MAP['SpO₂'];
ALERT_TREND_MAP['Environmental fusion'] = ALERT_TREND_MAP['Cabin CO₂'];

// ── Alert trend chart state ───────────────────────────
let selectedAlertId    = null;
let alertTrendChart    = null;

function destroyAlertTrendChart() {
  if (alertTrendChart) { alertTrendChart.destroy(); alertTrendChart = null; }
}

function closeAlertTrend() {
  destroyAlertTrendChart();
  const pool = el("alert-chart-pool");
  const canvas = el("alert-trend-chart");
  if (canvas && pool && canvas.parentNode !== pool) {
    pool.appendChild(canvas);
  }
  document.querySelectorAll(".alert-item").forEach((li) => {
    li.classList.remove("selected");
    const ex = li.querySelector(".alert-expand");
    const compact = li.querySelector(".alert-compact");
    if (ex) {
      ex.classList.add("hidden");
      ex.setAttribute("aria-hidden", "true");
    }
    if (compact) compact.setAttribute("aria-expanded", "false");
  });
  selectedAlertId = null;
}

function updateAlertCompactAria(li, expanded) {
  const c = li.querySelector(".alert-compact");
  if (c) c.setAttribute("aria-expanded", expanded ? "true" : "false");
}

function buildAlertTrendChart(parameter, li) {
  const cfg = ALERT_TREND_MAP[parameter];
  if (!cfg || !lastDetailData) return;

  const series = cfg.getSeries(lastDetailData);
  const current = series[series.length - 1];
  const paramEl = li.querySelector(".alert-expand-param");
  const curEl = li.querySelector(".alert-expand-current");
  const slot = li.querySelector(".alert-chart-slot");
  if (paramEl) paramEl.textContent = cfg.label;
  if (curEl) curEl.textContent = `Current: ${current} ${cfg.unit}`;

  destroyAlertTrendChart();
  const canvas = el("alert-trend-chart");
  if (slot && canvas) {
    slot.innerHTML = "";
    slot.appendChild(canvas);
  }

  const labels = cfg.getLabels(lastDetailData);
  const n = labels.length;
  const datasets = [
    {
      label: cfg.label,
      data: series,
      borderColor: cfg.color,
      backgroundColor: cfg.color + "22",
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      fill: true,
      tension: 0.35,
    },
    ...(cfg.thresholds || []).map((t) => ({
      label: t.label,
      data: Array(n).fill(t.value),
      borderColor: t.color,
      borderDash: [5, 4],
      borderWidth: 1.5,
      pointRadius: 0,
      fill: false,
      tension: 0,
    })),
  ];

  const ctx = canvas.getContext("2d");
  alertTrendChart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      plugins: {
        legend: {
          display: (cfg.thresholds || []).length > 0,
          position: "bottom",
          labels: { color: "#8b949e", boxWidth: 18, font: { size: 10 } },
        },
        tooltip: {
          mode: "index",
          intersect: false,
          callbacks: {
            label: (c) => `${c.dataset.label}: ${c.parsed.y} ${cfg.unit}`,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#8b949e",
            font: { size: 9 },
            maxTicksLimit: 8,
            maxRotation: 0,
          },
          grid: { color: "#21262d" },
        },
        y: {
          ticks: { color: "#8b949e", font: { size: 10 } },
          grid: { color: "#21262d" },
        },
      },
    },
  });
}

function toggleAlertFromData(a) {
  const hasTrend = !!(a.parameter && ALERT_TREND_MAP[a.parameter]);
  const li = document.querySelector(`.alert-item[data-alert-id="${a.id}"]`);
  const ex = li?.querySelector(".alert-expand");
  const compact = li?.querySelector(".alert-compact");
  if (!li || !ex) return;

  const wasOpen = !ex.classList.contains("hidden");
  if (wasOpen && selectedAlertId === a.id) {
    closeAlertTrend();
    return;
  }

  closeAlertTrend();

  ex.classList.remove("hidden");
  ex.setAttribute("aria-hidden", "false");
  li.classList.add("selected");
  selectedAlertId = a.id;
  if (compact) compact.setAttribute("aria-expanded", "true");

  if (hasTrend) {
    buildAlertTrendChart(a.parameter, li);
  }
  li.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ── Alert field path lookup ───────────────────────────
function getNestedValue(data, fieldPath) {
  if (!data || !fieldPath) return undefined;
  const parts = fieldPath.split(".");
  const deviceKey = parts[0];
  const propKey   = parts[1];
  const devices = lastDetailData?.devices;
  const env     = lastDetailData?.environmental;

  if (deviceKey === "environmental" && env) {
    return env[propKey];
  }
  if (devices && devices[deviceKey]) {
    return devices[deviceKey][propKey];
  }
  return undefined;
}

// ── Urgency badge rendering ───────────────────────────
function urgencyBadgeHtml(urgency) {
  if (!urgency) return "";
  let cls = "urgency-badge--monitor";
  if (urgency.startsWith("Act immediately")) cls = "urgency-badge--act";
  else if (urgency.startsWith("Notify"))      cls = "urgency-badge--notify";
  return `<span class="urgency-badge ${cls}">${escapeHtml(urgency)}</span>`;
}

// ── Field-path → display metadata lookup ─────────────
const FIELD_META = {
  "bio_monitor.heart_rate_bpm":          { label: "Heart rate",          paramId: "heart_rate_bpm",           fmt: (v) => `${v} bpm` },
  "bio_monitor.resting_heart_rate_bpm":  { label: "Resting heart rate",  paramId: null,                       fmt: (v) => `${v} bpm` },
  "bio_monitor.spo2_pct":               { label: "SpO₂",                paramId: "spo2_pct",                 fmt: (v) => `${v} %` },
  "bio_monitor.systolic_mmhg":           { label: "Systolic BP",         paramId: "systolic_mmhg",            fmt: (v) => `${v} mmHg` },
  "bio_monitor.diastolic_mmhg":          { label: "Diastolic BP",        paramId: null,                       fmt: (v) => `${v} mmHg` },
  "bio_monitor.breathing_rate_bpm":      { label: "Breathing rate",      paramId: "respiration_rate_bpm",     fmt: (v) => `${v} br/min` },
  "bio_monitor.tidal_volume_l":          { label: "Tidal volume",        paramId: null,                       fmt: (v) => `${Number(v).toFixed(2)} L` },
  "bio_monitor.skin_temp_c":             { label: "Skin temp",           paramId: null,                       fmt: (v) => `${v} °C` },
  "bio_monitor.ecg_rhythm":              { label: "ECG rhythm",          paramId: null,                       fmt: (v) => v },
  "bio_monitor.activity_mets":           { label: "Activity (METs)",     paramId: null,                       fmt: (v) => `${v} METs` },
  "thermo_mini.core_body_temp_c":        { label: "Core body temp",      paramId: "core_body_temp_c",         fmt: (v) => `${v} °C` },
  "oura_ring.hrv_ms":                    { label: "HRV (RMSSD)",         paramId: null,                       fmt: (v) => `${v} ms` },
  "oura_ring.spo2_avg_pct":             { label: "SpO₂ overnight avg",  paramId: null,                       fmt: (v) => `${v} %` },
  "oura_ring.body_temp_deviation_c":     { label: "Temp deviation",      paramId: null,                       fmt: (v) => `${v > 0 ? "+" : ""}${v} °C` },
  "personal_co2.current_ppm":            { label: "Personal CO₂",        paramId: "personal_co2_ppm",         fmt: (v) => `${v} ppm` },
  "evarm.personal_cumulative_msv":       { label: "Personal dose",       paramId: "radiation_cumulative_msv", fmt: (v) => `${v} mSv` },
  "evarm.dose_rate_usv_h":               { label: "Dose rate",           paramId: null,                       fmt: (v) => `${v} μSv/h` },
  "environmental.cabin_co2_mmhg":        { label: "Cabin CO₂",           paramId: "cabin_co2_mmhg",           fmt: (v) => `${v} mmHg` },
  "environmental.cabin_temp_c":          { label: "Cabin temp",          paramId: "cabin_temp_c",             fmt: (v) => `${v} °C` },
  "environmental.cabin_humidity_pct":    { label: "Cabin humidity",      paramId: "cabin_humidity_pct",       fmt: (v) => `${v} %` },
  "environmental.mission_cumulative_dose_msv": { label: "Mission dose",  paramId: "radiation_cumulative_msv", fmt: (v) => `${v} mSv` },
};

// ── Related parameter panel ───────────────────────────
// Device display order for related-params grouping
const RELATED_DEVICE_ORDER = [
  "bio_monitor", "thermo_mini", "oura_ring", "personal_co2", "evarm", "environmental",
];

function relatedParamsHtml(relatedParams) {
  if (!relatedParams || !relatedParams.length) return "";
  // Filter: always = show, if_alarming = show only when alarming, context = never
  const visible = relatedParams.filter((p) => {
    if (p.show_rule === "always")      return true;
    if (p.show_rule === "if_alarming") return p.currently_alarming === true;
    return false; // context — hidden
  });

  if (!visible.length) return "";

  // Group by device (prefix of "device.field")
  const groups = {};
  for (const p of visible) {
    const device = p.field.split(".")[0];
    (groups[device] = groups[device] || []).push(p);
  }

  const blocks = RELATED_DEVICE_ORDER
    .filter((d) => groups[d])
    .map((device) => {
      const dm = DEVICE_DISPLAY[device] || { icon: "📡", name: device };
      const rows = groups[device].map((p) => {
        const meta     = FIELD_META[p.field];
        const raw      = getNestedValue(lastDetailData, p.field);
        const label    = meta ? meta.label : p.field;
        const valueStr = (raw !== undefined && raw !== null && meta)
          ? meta.fmt(raw)
          : (raw !== undefined && raw !== null ? String(raw) : "—");
        const paramId  = meta?.paramId || null;
        const rawNum   = (typeof raw === "number") ? raw : parseFloat(raw);
        const cls      = (paramId && !isNaN(rawNum)) ? paramClass(paramId, rawNum) : "";
        const bar      = (paramId && !isNaN(rawNum) && PARAM_RANGES[paramId]) ? sensorMiniBar(paramId, rawNum) : "";
        const alarmCls = p.currently_alarming ? " sdp-row--alarming" : "";
        return `<div class="sdp-row${bar ? " has-bar" : ""}${alarmCls}">
          <span class="sdp-row-label">${escapeHtml(label)}</span>
          <span class="sdp-row-value ${cls}">${escapeHtml(valueStr)}</span>
          ${bar}
        </div>`;
      }).join("");
      return `<div class="sdp-device-block">
        <div class="sdp-device-header">${dm.icon} ${dm.name}</div>
        <div class="sdp-device-rows">${rows}</div>
      </div>`;
    }).join("");

  return `<div class="related-params-panel">
    <p class="related-params-heading">Related parameters</p>
    <div class="related-params-devices">${blocks}</div>
  </div>`;
}

function renderAlerts(alerts) {
  const list  = el("detail-alerts-list");
  const empty = el("detail-no-alerts");
  list.innerHTML = "";
  closeAlertTrend();
  if (!alerts.length) { empty.classList.remove("hidden"); return; }
  empty.classList.add("hidden");
  alerts.forEach((a) => {
    const hasTrend = !!(a.parameter && ALERT_TREND_MAP[a.parameter]);
    const li = document.createElement("li");
    li.className = `alert-item ${a.severity} is-interactive`;
    li.setAttribute("data-alert-id", a.id);

    const displayTitle = a.symptom_title || a.title;
    const gloss = a.plain_language_gloss
      ? `<p class="alert-gloss">${escapeHtml(a.plain_language_gloss)}</p>`
      : "";
    // Compact badge: only Act immediately or Notify Flight Surgeon (no Monitor)
    const compactBadge = (() => {
      const u = a.urgency || "";
      if (u.startsWith("Act immediately")) return `<span class="urgency-badge urgency-badge--act">Act immediately</span>`;
      if (u.startsWith("Notify"))          return `<span class="urgency-badge urgency-badge--notify">Notify Flight Surgeon</span>`;
      return "";
    })();

    const sourceTag = a.source ? `<span class="alert-source-tag">${escapeHtml(a.source)}</span>` : "";
    const trendHead = hasTrend
      ? `<div class="alert-expand-head">
          <span class="alert-expand-param"></span>
          <span class="alert-expand-current"></span>
          ${sourceTag}
        </div>`
      : "";

    const trendChart = hasTrend
      ? `<div class="alert-expand-chart">
          <div class="alert-chart-frame">
            <div class="alert-chart-slot"></div>
          </div>
        </div>`
      : "";

    const relatedPanel = relatedParamsHtml(a.related_params);

    li.innerHTML = `
      <div class="alert-compact" role="button" tabindex="0" aria-expanded="false">
        <span class="severity-tag ${a.severity}">${a.severity}</span>
        <h3 class="alert-title">${escapeHtml(displayTitle)}</h3>
        ${compactBadge}
      </div>
      <div class="alert-expand hidden" aria-hidden="true">
        <div class="alert-expand-copy">
          ${gloss}
          ${trendHead}
          ${trendChart}
          <p class="alert-body">${escapeHtml(a.message)}</p>
          ${relatedPanel}
        </div>
      </div>`;

    const compact = li.querySelector(".alert-compact");
    compact.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleAlertFromData(a);
    });
    compact.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleAlertFromData(a);
      }
    });

    list.appendChild(li);
  });
}

// ── Settings sync ─────────────────────────────────────
async function syncSettings() {
  const ground    = el("ground-supported").checked;
  const degraded  = el("demo-degraded").checked;
  const alertDemo = el("alert-demo").checked;
  await fetch("/api/settings/mode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ground_supported: ground }),
  });
  await fetch(`/api/settings/degraded-demo?on=${degraded}`,  { method: "POST" });
  await fetch(`/api/settings/alert-demo?on=${alertDemo}`,     { method: "POST" });
}

// ── Overview loader ───────────────────────────────────
async function loadOverview() {
  await syncSettings();
  const r = await fetch("/api/overview");
  if (!r.ok) { console.error("Overview failed:", await r.text()); return; }
  const data = await r.json();
  lastOverview = data;

  renderMissionTransit(data.mission_day);
  renderMissionMode(data.mode);
  renderCrewBoard(data);
  renderHabitat(data);
  renderOverviewReport(data);
}

// ── Detail modal ──────────────────────────────────────
async function openDetail(crewId) {
  selectedScore = null;
  detailCrewId = crewId;
  detailScenarioKey = scenarioForCrew(crewId);
  detailLocationKey = locationForCrew(crewId);

  // Populate header from cached overview
  const crew = lastOverview?.crew?.find((c) => c.crew_member_id === crewId);
  if (crew) {
    el("detail-title").textContent = crew.display_name;
    el("detail-role").textContent  = `${crew.role} · ${crew.crew_member_id}`;
    const da = el("detail-avatar");
    da.src = crew.avatar_url;
    da.alt = crew.display_name;
    da.onerror = () => { da.style.display = "none"; };
  }

  el("detail-backdrop").classList.remove("hidden");
  el("detail-panel").classList.remove("hidden");
  document.body.style.overflow = "hidden";

  el("score-detail-panel").classList.add("hidden");
  destroyScoreChart();

  try {
    await loadCrewDetailData();
    el("detail-close").focus();
  } catch (err) {
    console.error("Detail fetch failed:", err);
  }
}

function closeDetail() {
  closeDetailStatusPopover();
  el("detail-backdrop").classList.add("hidden");
  el("detail-panel").classList.add("hidden");
  document.body.style.overflow = "";
  clearTimeout(surgeonTypingId);
  removeTypingIndicator();
  el("actions-section").classList.add("hidden");
  el("actions-list").innerHTML = "";
  closeAlertTrend();
  destroyScoreChart();
  lastDetailData = null;
  selectedScore  = null;
  detailCrewId   = null;
}

// ═══════════════════════════════════════════════════════
// Welcome screen & Registration page
// ═══════════════════════════════════════════════════════

const CREW_DEFAULTS = [
  { id: "CM-1", name: "A. Okada",     role: "Commander"        },
  { id: "CM-2", name: "M. Reyes",     role: "Flight Engineer"  },
  { id: "CM-3", name: "J. Park",      role: "Mission Specialist" },
  { id: "CM-4", name: "S. Lindqvist", role: "Medical Officer"  },
];

const ROLES = [
  "Commander",
  "Flight Engineer",
  "Mission Specialist",
  "Medical Officer",
  "Payload Specialist",
  "Science Officer",
];

function showDashboard() {
  el("welcome-screen").classList.add("hidden");
  el("registration-page").classList.add("hidden");
}

function showWelcome() {
  el("registration-page").classList.add("hidden");
  el("welcome-screen").classList.remove("hidden");
}

function showRegistration() {
  el("welcome-screen").classList.add("hidden");
  el("registration-page").classList.remove("hidden");
}

// ── Build registration crew cards (pre-populate from saved data) ──
async function buildRegGrid() {
  // Fetch any previously saved roster
  let savedById = {};
  try {
    const r = await fetch("/api/crew-roster");
    if (r.ok) {
      const data = await r.json();
      (data.crew || []).forEach((m) => { savedById[m.id] = m; });
    }
  } catch (e) {
    console.warn("Could not load saved roster:", e);
  }

  const grid = el("reg-grid");
  grid.innerHTML = "";

  CREW_DEFAULTS.forEach((crew) => {
    const saved = savedById[crew.id] || {};
    const name      = saved.name      || crew.name;
    const role      = saved.role      || crew.role;
    const heightVal = saved.height_cm != null ? saved.height_cm : "";
    const weightVal = saved.weight_kg != null ? saved.weight_kg : "";
    const photoUrl  = saved.photo_url || null;

    const card = document.createElement("div");
    card.className = "reg-card";
    card.innerHTML = `
      <p class="reg-card-label">${crew.id}</p>

      <!-- Photo upload -->
      <div class="reg-photo-wrap">
        <input
          type="file" accept="image/*"
          id="photo-${crew.id}"
          class="reg-photo-input"
          aria-label="Upload photo for ${name}"
        />
        <img
          id="photo-preview-${crew.id}"
          class="reg-photo-preview${photoUrl ? " active" : ""}"
          src="${photoUrl || ""}"
          alt="Photo of ${name}"
        />
        <div class="reg-photo-placeholder" id="photo-ph-${crew.id}"
             style="${photoUrl ? "display:none" : ""}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"/>
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"/>
          </svg>
          <span>Click to upload photo</span>
        </div>
      </div>

      <!-- Fields — each input has a stable id for collection at save time -->
      <div class="reg-fields">
        <label class="reg-field">
          <span>Full name *</span>
          <input id="name-${crew.id}" type="text"
                 value="${name}" placeholder="Full name" required />
        </label>
        <label class="reg-field">
          <span>Role *</span>
          <select id="role-${crew.id}">
            ${ROLES.map((r) =>
              `<option${r === role ? " selected" : ""}>${r}</option>`
            ).join("")}
          </select>
        </label>
        <div class="reg-field-row">
          <label class="reg-field">
            <span>Height (cm) *</span>
            <input id="height-${crew.id}" type="number"
                   min="140" max="220" placeholder="175" value="${heightVal}" />
          </label>
          <label class="reg-field">
            <span>Weight (kg) *</span>
            <input id="weight-${crew.id}" type="number"
                   min="40"  max="150" placeholder="70"  value="${weightVal}" />
          </label>
        </div>
      </div>
    `;
    grid.appendChild(card);

    // Photo preview — new file selection
    const fileInput   = card.querySelector(`#photo-${crew.id}`);
    const preview     = card.querySelector(`#photo-preview-${crew.id}`);
    const placeholder = card.querySelector(`#photo-ph-${crew.id}`);
    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (!file) return;
      preview.src = URL.createObjectURL(file);
      preview.classList.add("active");
      if (placeholder) placeholder.style.display = "none";
    });
  });
}

// ── Save roster then enter the dashboard ──────────────
async function saveRosterAndEnter() {
  const btn = el("reg-begin");
  const origLabel = btn.textContent;
  btn.textContent = "Saving…";
  btn.disabled = true;

  try {
    // Collect text fields
    const crew = CREW_DEFAULTS.map((def) => ({
      id:        def.id,
      name:      el(`name-${def.id}`)?.value?.trim()   || def.name,
      role:      el(`role-${def.id}`)?.value            || def.role,
      height_cm: parseInt(el(`height-${def.id}`)?.value) || null,
      weight_kg: parseInt(el(`weight-${def.id}`)?.value) || null,
    }));

    // POST text data
    const r = await fetch("/api/crew-roster", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crew }),
    });
    if (!r.ok) throw new Error(await r.text());

    // Upload any new photos
    for (const def of CREW_DEFAULTS) {
      const fileInput = el(`photo-${def.id}`);
      if (fileInput?.files?.[0]) {
        const fd = new FormData();
        fd.append("photo", fileInput.files[0]);
        await fetch(`/api/crew-roster/${def.id}/photo`, {
          method: "POST",
          body: fd,
        });
      }
    }

    showDashboard();
    loadOverview().catch(console.error);
  } catch (err) {
    console.error("Save failed:", err);
    btn.textContent = "Error — retry";
    btn.disabled = false;
    setTimeout(() => {
      btn.textContent = origLabel;
      btn.disabled = false;
    }, 3000);
  }
}

// ── Bootstrap ─────────────────────────────────────────
function init() {
  // Welcome & registration navigation
  buildRegGrid().catch(console.error);
  el("btn-enter-mission").addEventListener("click", () => {
    showDashboard();
    loadOverview().catch(console.error);
  });
  el("btn-go-register").addEventListener("click", () => {
    buildRegGrid().catch(console.error);  // refresh in case roster was updated
    showRegistration();
  });
  el("reg-back").addEventListener("click", showWelcome);
  el("reg-begin").addEventListener("click", saveRosterAndEnter);

  // Developer panel toggle
  el("dev-toggle").addEventListener("click", () => {
    const panel = el("dev-panel");
    panel.classList.toggle("hidden");
    el("dev-toggle").setAttribute(
      "aria-expanded",
      String(!panel.classList.contains("hidden"))
    );
  });

  el("refresh").addEventListener("click",  () => loadOverview().catch(console.error));
  el("ground-supported").addEventListener("change", () => loadOverview().catch(console.error));
  el("demo-degraded").addEventListener("change",    () => loadOverview().catch(console.error));
  el("alert-demo").addEventListener("change",       () => loadOverview().catch(console.error));

  el("detail-close").addEventListener("click", closeDetail);
  el("detail-backdrop").addEventListener("click", closeDetail);
  el("detail-panel").addEventListener("click", (e) => e.stopPropagation());
  bindDetailStatusPopover();
  el("sdp-close").addEventListener("click", closeScoreDetail);

  // Scale toggle buttons (delegated — buttons exist in static HTML)
  document.querySelectorAll(".sdp-scale-btn").forEach((btn) => {
    btn.addEventListener("click", () => onScaleChange(btn.dataset.scale));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!el("score-detail-panel").classList.contains("hidden")) { closeScoreDetail(); return; }
      const pop = el("detail-status-popover");
      if (pop && !pop.classList.contains("hidden")) {
        closeDetailStatusPopover();
        return;
      }
      if (!el("detail-panel").classList.contains("hidden")) { closeDetail(); }
    }
  });

  bindChatEvents();
  tickClock();
  setInterval(tickClock, 1000);
  // loadOverview() is called only when the user enters the mission from the welcome screen
}

document.readyState === "loading"
  ? document.addEventListener("DOMContentLoaded", init)
  : init();
