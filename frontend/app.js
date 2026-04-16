/**
 * HMU — four-crew overview + progressive-disclosure detail modal.
 *
 * Cognitive-load design principle:
 *   Detail modal opens with only 6 synthesized score cards visible.
 *   Clicking a score card reveals its 6-hour trend chart + the small
 *   subset of raw sensor readings relevant to that score.
 *   Everything else (environ., alerts) is always visible but compact.
 */

// ── Operational mode labels ─────────────────────────
const MODES = {
  nominal_monitoring: { label: "Nominal monitoring", cls: "nominal" },
  alert:              { label: "Alert",              cls: "alert"   },
  degraded:           { label: "Degraded",           cls: "degraded"},
  ground_supported:   { label: "Ground-supported",   cls: "ground"  },
};

// ── Parameter threshold limits (mirrors ParameterLimits.md) ──
// Fields: low_crit, low_warn, low_advisory, high_advisory, high_warn, high_crit
// null = not applicable.  Operator: low_* triggers if value < threshold,
// high_* triggers if value > threshold.
const PARAM_LIMITS = {
  heart_rate_bpm:           { low_crit: 40,  low_warn: 45,   high_warn: 120,  high_crit: 130  },
  blood_pressure_sys_mmhg:  { low_crit: 80,                  high_crit: 170                    },
  spo2_pct:                 { low_crit: 92                                                      },
  respiration_rate_bpm:     { low_crit: 8,                   high_warn: 24                     },
  body_temperature_c:       { low_warn: 35,                  high_warn: 38                     },
  cabin_co2_mmhg:           {                high_advisory: 6, high_warn: 8                    },
  cabin_temperature_c:      { low_warn: 18,                  high_warn: 27                     },
  cabin_humidity_pct:       { low_warn: 25,                  high_warn: 75                     },
  radiation_cumulative_msv: {                high_advisory: 50, high_warn: 150                 },
  personal_co2_ppm:         {                high_advisory: 1000, high_warn: 2500              },
};

/**
 * Map a numeric reading to a CSS colour class based on PARAM_LIMITS.
 * Returns: 'good' (green) | 'medium' (yellow) | 'low' (red) | '' (no limit defined)
 */
function paramClass(paramId, v) {
  const lim = PARAM_LIMITS[paramId];
  if (!lim || v == null || isNaN(v)) return '';
  if ((lim.low_crit  != null && v < lim.low_crit)  ||
      (lim.high_crit != null && v > lim.high_crit)) return 'low';
  if ((lim.low_warn  != null && v < lim.low_warn)  ||
      (lim.high_warn != null && v > lim.high_warn)) return 'medium';
  if ((lim.low_advisory  != null && v < lim.low_advisory)  ||
      (lim.high_advisory != null && v > lim.high_advisory)) return 'medium';
  return 'good';
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

/** Map a 0–100 score to a clinical adjective. */
function rateScore(v) {
  if (v >= 85) return { word: "excellent",    cls: "flag-ok"      };
  if (v >= 70) return { word: "satisfactory", cls: "flag-ok"      };
  if (v >= 55) return { word: "moderate",     cls: "flag-caution" };
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
  return `Mission Day ${missionDay} · ${t.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',hour12:false})} UTC`;
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

// ── (2) Crew detail: individual health summary ────────
function generateCrewReport(data) {
  const { wearable: w, devices: d, alerts, display_name, mission_day } = data;

  const overall = rateScore(w.health_score);
  const rhr     = d.bio_monitor.resting_heart_rate_bpm;
  const hrv     = d.oura_ring.hrv_ms;

  const alertPart = alerts.length === 0
    ? `no active alerts`
    : `${warn(alerts.length + ' active alert' + (alerts.length > 1 ? 's' : ''))}`;

  return `${val(display_name)} — health <span class="${overall.cls}">${w.health_score}/100 (${overall.word})</span> on Day ${val(mission_day)}: `
    + `resting HR ${val(rhr.toFixed(0) + ' bpm')}, SpO₂ ${val(w.spo2_pct.toFixed(0) + '%')}, `
    + `HRV ${val(hrv.toFixed(0) + ' ms')}, sleep ${val(w.sleep_score + '/100')}, fatigue ${val(w.fatigue_score + '/100')} — ${alertPart}.`;
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
  el('overview-report-text').innerHTML = generateOverviewReport(data);
  el('overview-report-ts').textContent = nowTs(data.mission_day);
}

function renderCrewReport(data) {
  el('crew-report-text').innerHTML = generateCrewReport(data);
  el('crew-report-ts').textContent = nowTs(data.mission_day);
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
function scoreClass(v)  { return v > 80 ? "good" : v >= 60 ? "medium" : "low"; }
function initials(name) { const p = name.trim().split(/\s+/); return p.length >= 2 ? (p[0][0] + p[p.length-1][0]).toUpperCase() : name.slice(0,2).toUpperCase(); }

// ── Clock ────────────────────────────────────────────
function tickClock() {
  const now = new Date();
  el("clock").textContent        = formatTime(now) + " UTC";
  el("mission-date").textContent = formatDate(now);
}

// ── Mode chips ───────────────────────────────────────
function renderModeChips(activeMode, containerId = "mode-chips") {
  const c = el(containerId);
  if (!c) return;
  c.innerHTML = "";
  Object.entries(MODES).forEach(([key, { label, cls }]) => {
    const s = document.createElement("span");
    s.className = "mode-chip" + (key === activeMode ? ` active ${cls}` : "");
    s.textContent = label;
    if (key === activeMode) s.setAttribute("aria-current", "true");
    c.appendChild(s);
  });
}

// ── Crew board (overview) ────────────────────────────
function renderCrewBoard(data) {
  const board = el("crew-board");
  board.innerHTML = "";
  data.crew.forEach((c) => {
    const modeCls = MODES[c.mode]?.cls || "nominal";
    const card    = document.createElement("article");
    card.className = `crew-card mode-${modeCls}`;
    card.tabIndex  = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `${c.display_name}, ${c.role}. Open detail.`);
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
      <div class="crew-scores">
        <div class="score-row"><span class="s-label">Health</span><span class="s-value ${scoreClass(c.health_score)}">${c.health_score}</span></div>
        <div class="score-row"><span class="s-label">Sleep</span><span class="s-value ${scoreClass(c.sleep_score)}">${c.sleep_score}</span></div>
        <div class="score-row"><span class="s-label">Fatigue</span><span class="s-value ${scoreClass(c.fatigue_score)}">${c.fatigue_score}</span></div>
        <div class="score-row"><span class="s-label">Stress</span><span class="s-value ${scoreClass(c.stress_score)}">${c.stress_score}</span></div>
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
    habCard("CO₂",         env.cabin_co2_mmhg.toFixed(2),              env.co2_unit,      "cabin_co2_mmhg",           env.cabin_co2_mmhg),
    habCard("Temperature", env.cabin_temp_c.toFixed(1),                env.temp_unit,     "cabin_temperature_c",      env.cabin_temp_c),
    habCard("Humidity",    env.cabin_humidity_pct.toFixed(0),          env.humidity_unit, "cabin_humidity_pct",       env.cabin_humidity_pct),
    habCard("Cumul. dose", env.mission_cumulative_dose_msv.toFixed(1), env.dose_unit,     "radiation_cumulative_msv", env.mission_cumulative_dose_msv),
  ].join("");
  el("habitat-integrity").textContent = `Environmental sensor integrity: ${data.integrity_environmental}`;
}

function habCard(label, value, unit, paramId, rawNum) {
  const cls = paramClass(paramId, rawNum);
  return `<div class="hab-card"><span class="hab-label">${label}</span><span class="hab-value ${cls}">${value}<span class="hab-unit">${unit}</span></span></div>`;
}

// ── Device status bar (in detail modal header) ────────
function renderDeviceStatusBar(devices) {
  el("device-status-bar").innerHTML = Object.entries(DEVICE_META).map(([key, meta]) => {
    const st  = devices[key].status;
    const sig = st.signal || (st.connected ? "ok" : "stale");
    const batt = st.battery_pct != null
      ? `<span class="dev-batt${st.battery_pct < 20 ? " low" : ""}">🔋${st.battery_pct}%</span>`
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

  renderScoreChart(scoreKey, lastDetailData?.wearable[scoreKey] ?? 70, meta.color, currentScale);
  renderSensorSubset(meta, lastDetailData?.devices);
  renderScoreReportPanel(scoreKey, lastDetailData?.wearable, lastDetailData?.devices, lastDetailData?.mission_day);

  el("score-detail-panel").classList.remove("hidden");
  el("score-detail-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function closeScoreDetail() {
  selectedScore = null;
  el("score-detail-panel").classList.add("hidden");
  el("detail-score-grid").querySelectorAll(".score-card").forEach((c) => c.classList.remove("selected"));
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
  const value = lastDetailData?.wearable[selectedScore] ?? 70;
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
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      interaction:         { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
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

// ── Relevant sensor subset ────────────────────────────
function renderSensorSubset(meta, devices) {
  if (!devices) return;
  el("sdp-sensors").innerHTML = meta.sensors.map(({ device, icon, name, fields }) => {
    const d = devices[device];
    if (!d) return "";
    const rows = fields.map(({ label, get, param, num }) => {
      const cls = (param && num) ? paramClass(param, num(d)) : '';
      return `<div class="sdp-row">
        <span class="sdp-row-label">${label}</span>
        <span class="sdp-row-value ${cls}">${get(d)}</span>
      </div>`;
    }).join("");
    return `<div class="sdp-device-block">
      <div class="sdp-device-header">${icon} ${name}</div>
      <div class="sdp-device-rows">${rows}</div>
    </div>`;
  }).join("");
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
function renderAlerts(alerts) {
  const list  = el("detail-alerts-list");
  const empty = el("detail-no-alerts");
  list.innerHTML = "";
  if (!alerts.length) { empty.classList.remove("hidden"); return; }
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
      <div class="alert-meta">Source: ${escapeHtml(a.source)}
        ${a.parameter && a.value ? ` · ${escapeHtml(a.parameter)}: ${escapeHtml(a.value)}` : ""}
        ${a.threshold ? ` (threshold: ${escapeHtml(a.threshold)})` : ""}
      </div>`;
    list.appendChild(li);
  });
}

// ── Settings sync ─────────────────────────────────────
async function syncSettings() {
  const ground   = el("ground-supported").checked;
  const degraded = el("demo-degraded").checked;
  await fetch("/api/settings/mode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ground_supported: ground }),
  });
  await fetch(`/api/settings/degraded-demo?on=${degraded}`, { method: "POST" });
}

// ── Overview loader ───────────────────────────────────
async function loadOverview() {
  const scenario = el("scenario").value;
  await syncSettings();
  const r = await fetch(`/api/overview?scenario=${encodeURIComponent(scenario)}`);
  if (!r.ok) { console.error("Overview failed:", await r.text()); return; }
  const data = await r.json();
  lastOverview = data;

  el("mission-day").textContent = data.mission_day;
  renderModeChips(data.mode);
  renderCrewBoard(data);
  renderHabitat(data);
  renderOverviewReport(data);
}

// ── Detail modal ──────────────────────────────────────
async function openDetail(crewId) {
  const scenario = el("scenario").value;
  selectedScore  = null;

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

  // Show panel immediately (scores will populate below)
  el("detail-backdrop").classList.remove("hidden");
  el("detail-panel").classList.remove("hidden");
  document.body.style.overflow = "hidden";

  // Close any open score detail from a previous crew
  el("score-detail-panel").classList.add("hidden");
  destroyScoreChart();

  try {
    const r = await fetch(`/api/crew/${encodeURIComponent(crewId)}/detail?scenario=${encodeURIComponent(scenario)}`);
    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();
    lastDetailData = data;

    renderModeChips(data.mode, "detail-mode-chips");
    renderDeviceStatusBar(data.devices);
    renderCrewReport(data);
    renderScoreCards(data.wearable);
    renderEnv(data.environmental, data.integrity);
    renderAlerts(data.alerts);
    initChat(crewId);
    el("detail-close").focus();
  } catch (err) {
    console.error("Detail fetch failed:", err);
  }
}

function closeDetail() {
  el("detail-backdrop").classList.add("hidden");
  el("detail-panel").classList.add("hidden");
  document.body.style.overflow = "";
  clearTimeout(surgeonTypingId);
  removeTypingIndicator();
  destroyScoreChart();
  lastDetailData = null;
  selectedScore  = null;
}

// ── Bootstrap ─────────────────────────────────────────
function init() {
  el("refresh").addEventListener("click",  () => loadOverview().catch(console.error));
  el("scenario").addEventListener("change",() => loadOverview().catch(console.error));
  el("ground-supported").addEventListener("change", () => loadOverview().catch(console.error));
  el("demo-degraded").addEventListener("change",    () => loadOverview().catch(console.error));

  el("detail-close").addEventListener("click", closeDetail);
  el("detail-backdrop").addEventListener("click", closeDetail);
  el("detail-panel").addEventListener("click", (e) => e.stopPropagation());
  el("sdp-close").addEventListener("click", closeScoreDetail);

  // Scale toggle buttons (delegated — buttons exist in static HTML)
  document.querySelectorAll(".sdp-scale-btn").forEach((btn) => {
    btn.addEventListener("click", () => onScaleChange(btn.dataset.scale));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!el("score-detail-panel").classList.contains("hidden")) { closeScoreDetail(); return; }
      if (!el("detail-panel").classList.contains("hidden"))       { closeDetail(); }
    }
  });

  bindChatEvents();
  tickClock();
  setInterval(tickClock, 1000);
  loadOverview().catch(console.error);
}

document.readyState === "loading"
  ? document.addEventListener("DOMContentLoaded", init)
  : init();
