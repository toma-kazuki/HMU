# Visual Display Design — Health Monitoring Unit (HMU)

This document defines the visual modality for each displayed value and provides the SA-theoretic rationale behind every design decision. It is organized into seven parts:

| Part | Title | Contents |
| ---: | :--- | :--- |
| 1 | Theoretical Foundation | SA theory, display principles, modality selection, generic C&W taxonomy |
| 2 | HMU Display System Requirements | Cross-cutting VD-R requirements, alert palette, modes, activity status |
| 3 | Information Architecture | View hierarchy, progressive disclosure, overview and detail layouts |
| 4 | Per-Parameter Display Definitions | Physiological vitals, environmental, synthesized scores, score-detail panel |
| 5 | Visual Modality Library | Template definitions (NUMERIC / ARC_GAUGE / PROGRESS_BAR / BAND_INDICATOR / SPARKLINE) and parameter assignments |
| 6 | Sensor Integrity and Device Mapping | Per-parameter source table, SensorIntegrity model |
| 7 | Traceability | SA levels addressed, formal requirements satisfied |

Cross-reference: All parameter thresholds, device fields, and score computation inputs are defined in `7_parameter_limits.md`. Both documents must be updated together.

---

## Part 1 — Theoretical Foundation

### 1.1 Situation Awareness (SA)

All this effort is to increase the situation awareness (perception / comprehension / projection).  
Definition: *"…the perception of the elements in the environment within a volume of time and space, the comprehension of their meaning and the projection of their status in the near future"* (Endsley, 1988).

#### Levels of Situation Awareness

**Level 1: Perception** — What is happening?  
**Level 2: Comprehension** — Why is it happening? What does it mean?  
**Level 3: Projection** — What will happen next?

#### SA Error Taxonomy

**Level 1 failures — failure to correctly perceive information**
- Data not available
- Data hard to discriminate or detect
- Failure to monitor or observe data
- Memory lapse

**Level 2 failures — failure to correctly integrate or comprehend information**
- Lack of, or poor, mental model
- Use of incorrect mental model
- Over-reliance on default values

**Level 3 failures — failure to project future actions or state of the system**
- Lack of, or poor, mental model
- Over-projection of current trends

---

### 1.2 Display Modality Selection

| Is the message… | Choose Visual Display | Choose Auditory System |
| :--- | :---: | :---: |
| Complex? | ✅ | ❌ |
| Long? | ✅ | ❌ |
| Spatial information? | ✅ | ❌ |
| Urgent? | ❌ | ✅ |
| Needed now only? | ❌ | ✅ |
| Mobile operation? | ❌ | ✅ |
| Noisy environment? | ✔ (high auditory noise) | ✔ (high visual overload) |

**Characteristics that enhance effectiveness of visual displays**
- Conspicuity
- Visibility (under all lighting conditions)
- Legibility and Readability

---

### 1.3 Principles of Visual Display Design

#### (1) Perception

**Legibility**
- Contrast ratio = (Luminance max / Luminance min); 7:1 preferred

**Avoid absolute judgment limits**
- Do not require crew to make decisions based on a single sensory variable (color, size, etc.) with > 7 levels
- Example: "If the light is amber, proceed with caution" — and amber is one of six possible hues
- Consider designing for relative judgments — e.g., darker hues of the same color = "more"

**Top-down processing** — Crew will interpret information based on their mental model or expectations

**Redundancy** — Whenever possible, use multiple dissimilar indications

**Discriminability** — Avoid confusion by avoiding unnecessarily similar features; highlight dissimilar features

#### (2) Mental Model

- Pictorial Realism
- Principle of the Moving Part

#### (3) Attention

**Minimize information access cost**
- Most frequently used / most important elements located in the primary visual area
- Minimize need to navigate to multiple displays to complete a given task

**Proximity compatibility**
- Link multiple pieces of information required for a given task so they are easy to integrate
- Can be accomplished by proximity, common color, connecting lines, or pattern configuration

**Use Multiple Resources** — Use both visual and auditory cues to avoid overloading either sense

#### (4) Memory

**Reduce reliance on memory** — Whenever possible, put information on the display rather than requiring crew to memorize it

**Predictive Aiding** — Use displays to predict future states

**Consistency**
- With other systems and displays for the spacecraft
- With the user's mental model of how the system works
- Using graphics and symbols that are consistent system-wide

---

### 1.4 Generic Caution and Warning Classification

For spacecraft there are typically three levels of caution and warning. These generic classes inform the HMU design but are **not** mapped one-to-one to the HMU display tiers (see Part 2.3).

#### Class of Alarm Triggers

**Emergency (class 1) — Red**
- Life-threatening condition requiring immediate attention
- Predefined crew responses may be required prior to taking corrective action
- Includes fire and smoke, atmospheric toxicity, and rapid loss of atmospheric pressure

**Warning (class 2) — Red**
- Conditions requiring immediate correction to avoid potential loss of crew or major mission objectives
- Includes faults, failures, and out-of-tolerance conditions critical to station and crew survival

**Caution (class 3) — Yellow**
- Conditions of a less time-critical nature, but with potential for further degradation if crew attention is not given
- Includes faults, failures, and out-of-tolerance conditions critical to mission success

---

## Part 2 — HMU Display System Requirements

### 2.1 Scope

**In scope:** physiological scalars, environmental scalars, six synthesized health scores (Health · Sleep · Activity · Fatigue · Stress Management · Readiness), score cards and score-detail panel, device sensor rows, mission cumulative radiation, operational mode, **activity status** (activity profile + IVA/EVA), alert annunciation, **inline alert trend charts** (crew-detail alerts list), and per-sensor integrity status as surfaced by the HMU dashboard (overview and crew-detail views). All parameter thresholds, device fields, and score computation inputs are defined in `7_parameter_limits.md`.

**Out of scope:** hardware luminance calibration, exact font-size metrics, audio/haptic annunciation details (noted only where cross-modal redundancy is required), ground-access UI flows.

---

### 2.2 Cross-Cutting Display Requirements (VD-R01 – VD-R10)

These requirements apply to every element of the HMU display and govern all per-parameter definitions that follow.

| ID | Requirement | Principle link | Formal req. |
| :--- | :--- | :--- | :--- |
| VD-R01 | Every scalar value shall be displayed as **numeric digits + unit label + parameter name**, co-located in a single tile or row. | Reduce memory load; Level 1 SA (perception). | Req. 1, 14 |
| VD-R02 | **Color shall never be the sole carrier** of alert severity or normality. Each color-coded state shall be accompanied by at minimum one non-color cue: a text severity word ("WARNING", "CAUTION"), a border-weight difference, or an icon. | Discriminability; color absolute-judgment limit; design-induced error (Req. 3 example). | Req. 3, 8, 9 |
| VD-R03 | Exactly **two** alert-emphasis visual palettes shall be used for parameter threshold exceedances, mapped one-to-one to the display tiers: `caution` (amber) and `warning` (red). No intermediate hue steps shall be introduced for the same severity meaning. The "Severity" field in `7_parameter_limits.md` denotes an *action protocol classification* (Critical / Moderate), not an additional display tier. | Consistency; relative judgment; mental model; alarm fatigue reduction. | Req. 8, 9 |
| VD-R04 | For every parameter whose value changes over time (heart rate, SpO₂, respiration rate, CO₂, cumulative radiation, synthesized scores), a **time-series trend trace** shall be accessible within one interaction from the current numeric readout. Implementation: vitals trends appear in the **crew-detail alerts list** as an **inline expanded chart** under the selected alert row; score trends appear in the **score-detail** panel. The current value shall remain the visually dominant element in all primary views. | Level 2–3 SA (comprehension, projection). | Req. 5 |
| VD-R05 | The crew’s **activity status** shall be visible wherever heart rate or respiration rate limits are interpreted: it comprises (1) **activity profile** — Rest, High workload, Exercise, or Sleep (backend keys `nominal`, `stress`, `exercise`, `sleep`) — and (2) **IVA** vs **EVA**. The **same visual modality** (label + inset pill showing «profile» · IVA or EVA) shall be used on the **overview crew card** and on the **crew-detail modal** header; the overview pill is read-only, the detail pill opens controls to change profile and IVA/EVA. | Top-down processing; Level 2 SA errors from missing context. | Req. 5, 11 |
| VD-R06 | The active **operational mode** (Nominal Monitoring / Alert / Degraded / Ground-Supported) shall be shown as a persistent **named chip or banner** plus a non-color distinguishing cue (icon or pattern) on every view. Mode shall not be inferred from color alone. | Consistency; Level 1 SA (system state). | Req. 11 |
| VD-R07 | All primary text and numeric data shall achieve a contrast ratio of at least **7:1** (luminance) against the background. Dark-theme implementations shall be measured against the ambient-adjusted background, not a theoretical white background. | Legibility under varying lighting conditions (EVA prep, hab lighting cycles). | Req. 6 |
| VD-R08 | The **overview panel** (all crew + habitat) shall display only: current value, alert state, and sensor integrity per crew member column. Secondary device lists and historical trends shall collapse to a compact row until the crew explicitly expands them, keeping clutter within the primary visual area. | Information access cost; density control; Bedford workload ≤ 3 (Req. 4). | Req. 4, 8 |
| VD-R09 | Any parameter whose source sensor is degraded or lost shall display the numeric value (if still available) in a **visually reduced style** (greyed or dashed), with an explicit status word ("DEGRADED" or "NO DATA") and a sensor-specific icon on the tile. The crew shall never encounter a degraded reading styled identically to a trusted reading. | Level 2 SA error avoidance; Degraded Mode visibility. | Req. 5, 11 |
| VD-R10 | Threshold reference lines or **on-display limit markers** shall be shown for all parameters with defined exceedance limits, so the crew can make a **relative judgment** ("how far from the limit?") without recalling numeric thresholds from memory. | Reduce memory reliance; Level 1 SA. | Req. 5, 7 |

---

### 2.3 Alert Severity Palette

Two palettes are used for all parameter threshold exceedances. Hex values shall satisfy VD-R07; the semantic mappings below are fixed.

| Display tier | Semantic color family | Required non-color cue | Position in alert stack | Text label required |
| :--- | :--- | :--- | :--- | :--- |
| Warning (`warning`) | Red (`#f85149`) | Bold border + ⚠ icon | Top (highest salience) | "WARNING" |
| Caution (`caution`) | Amber (`#d29922`) | Standard border + caution text | Second | "CAUTION" |

**Warning** maps to the red/warm color family used for "requires prompt action" states, consistent with NASA-STD-3001 Vol. 2 (Req. 8). **Caution** uses amber to signal "heightened monitoring required."

**Nominal** (no alert active) shall use a neutral palette (no warm hues, no emphasis borders) so the crew can recognize at a glance that all values are in range.

---

### 2.4 Action Protocol Classification (Severity)

The *Severity* field in `7_parameter_limits.md` defines the required crew action when a threshold is exceeded. It is **not** a display color — it is an operational decision aid shown as explanatory text in the alert body or recommended-actions panel.

| Action protocol | Meaning | Display treatment |
| :--- | :--- | :--- |
| **Critical** | Act immediately upon detection. Ground flight surgeon consultation is **not required** before taking corrective action. | Alert body text: "Critical — act immediately. No ground consult required before treatment." |
| **Moderate** | Monitor closely and contact the flight surgeon immediately. Await medical guidance before escalating intervention. | Alert body text: "Moderate — monitor closely. Contact flight surgeon immediately." |

---

### 2.5 Operational Mode Display

Per VD-R06 and Req. 11, the mode chip shall be visible on every view at all times.

| Mode | Label text | Icon | Background tint |
| :--- | :--- | :--- | :--- |
| Nominal Monitoring | "NOMINAL" | ✓ checkmark | Neutral (no tint) |
| Alert | "ALERT" | ⚠ attention glyph | Warm tint matching highest-severity active alert |
| Degraded | "DEGRADED" | ⊘ broken-link glyph | Muted warning tint |
| Ground-Supported | "GROUND-SUPPORTED" | ⊕ link/satellite glyph | Neutral tint, distinct border |

The warm tint for Alert mode reuses the same hue family as the alert palette (VD-R03), so the crew learns a single color-to-meaning mapping rather than two.

---

### 2.6 Activity Status

Per VD-R05, **activity status** is the umbrella term for the crew’s current **activity profile** (what the human system is doing) and **pressure regime** (**IVA** = intravehicular / habitat air, **EVA** = extravehicular / suited). It is informational only — neutral chrome (label + pill), not an alert.

**Display string** (overview crew card and crew-detail header trigger, identical format):

| Activity profile (`scenario` in API) | Short label in UI | Combined with location |
| :--- | :--- | :--- |
| `nominal` | Rest | `Rest · IVA` or `Rest · EVA` |
| `stress` | High workload | `High workload · IVA` / `… · EVA` |
| `exercise` | Exercise | `Exercise · IVA` / `… · EVA` |
| `sleep` | Sleep | `Sleep · IVA` / `… · EVA` |

**Crew-detail popover** uses two groups under the heading **Activity status**: subsection **Activity profile** (four buttons) and subsection **IVA / EVA** (two buttons). Backend query parameters remain `scenario` and `location` for compatibility.

The activity status line shall also appear **adjacent to heart rate and respiration rate** vital tiles (same text as in the header) where those parameters are shown, so limit interpretation always has visible context.

---

## Part 3 — Information Architecture

### 3.1 View Hierarchy and Progressive Disclosure

The HMU uses a **three-level** progressive disclosure hierarchy to control cognitive load (VD-R08, Bedford ≤ 3). The **overview page** (Level A) also uses a fixed vertical order: global mission context → fleet narrative → per-crew triage → habitat.

```
Level A — Overview (top-level page)
    · App header: mission mode, mission timeline (Earth–Mars transit), mission date, UTC time
    · Mission health brief (fleet HMU Intelligence summary)
    · Crew board: four crew summary cards
    · Habitat: shared environmental strip + integrity footnote
    ↓ click a crew card
Level B — Crew-detail modal (single crew)
    · Header, symptom summary, six score cards, alerts list, optional recommended actions, chat
    ↓ click a score card, or interact with an alert row (see below)
Level C — Detail-on-demand (still inside the same modal; no separate route)
    · Score-detail panel — trend chart, contributing sensors, score-level HMU Intelligence assessment
    · Alert inline expansion — explanatory text + parameter headline (when trend exists) + trend chart in a fixed frame directly under that alert item
```

**Disclosure rules**

- **Score vs. alert:** Opening one **score-detail** panel does not replace the alerts list; both regions use **in-place expansion** so the crew always returns to the same modal scaffold (Level B).
- **Alerts:** Only one alert row should be expanded at a time for the shared trend canvas; expanding another alert or collapsing the current row clears the chart and hides expanded copy (toggle by activating the same alert’s title row again).
- **Threshold / limit semantics:** For alerts that include a trend chart, reference thresholds appear in the **chart legend and traces**; redundant prose threshold summaries below the chart are omitted to avoid duplicate encoding.

Each **level** still maps to SA emphasis:
- **Level A** → Level 1 SA (perception): fleet-wide posture, phase context, and per-crew triage at a glance
- **Level B** → Level 2 SA (comprehension): individual crew meaning, **activity status**, and prioritized annunciation
- **Level C** → Level 1 verification + Level 3 projection: raw or derived series, limits on the chart, and short-term direction

---

### 3.2 Overview (Top-Level) Layout

The overview is **not** only the four crew columns. Implemented structure:

| Region | Role |
| :--- | :--- |
| **Header bar** | **Mission mode** (aggregated display per VD-R06), **mission timeline** (phase label, mission day, Earth–Mars progress track), **date**, **UTC clock**, and developer controls (prototype) |
| **Mission health brief** | Fleet-level **HMU Intelligence** narrative; border/accent follows aggregated mission mode class (nominal / alert / degraded) |
| **Crew board** | Four columns — one **crew summary card** per person (below) |
| **Habitat** | Shared cabin environment gauges (CO₂, temperature, humidity, cumulative mission radiation) and an environmental integrity footnote |

#### 3.2.1 Crew summary card (per column)

Each card is a compact summary that satisfies VD-R08: fleet-level triage without raw vitals.

| Element | Specification |
| :--- | :--- |
| Avatar + name + role | Identifies the crew member; **avatar ring** treatment reflects **operational mode** class (nominal / alert / degraded / ground-supported) for at-a-glance fleet posture |
| **Activity status** | Same **visual modality** as crew-detail: uppercase **Activity status** label + **inset pill** with `«profile» · IVA|EVA` (read-only on the card). VD-R05; supports interpretation of stress-sensitive scores |
| Crew member ID badge | Short identifier for logs / cross-reference |
| **Four score rows** | **Health · Sleep · Fatigue · Stress** — the four most operationally actionable scores for watch-keeping at overview density; numeric value **color-coded** by severity tier |
| No raw vitals | Scalar physiological tiles are **not** shown on the overview; they appear only after opening the crew-detail modal |
| Click target | Entire card (keyboard-accessible) opens the **crew-detail** modal for that crew member |

---

### 3.3 Crew-Detail Modal Layout

The crew-detail modal keeps a **single scrollable column** with the following **fixed order**:

1. **Modal header** — Crew **avatar**, **name**, **role**; **Activity status** control (label + pill, same modality as overview; popover to set **activity profile** and **IVA / EVA**); **device status bar** (connection / power state per device); **close** control.
2. **HMU Intelligence — Symptom Summary** — Clinical-style narrative (generated on open).
3. **Six synthesized score cards** — Primary analytical view (all six scores; see Part 4.3).
4. **Score-detail panel** (conditional) — Opens **below** the score grid when a score is selected: time-scale toggle, trend chart, contributing sensors, **HMU Intelligence — Score Assessment** (see Part 4.4). Closed with the panel’s own close control; does not navigate away from the modal.
5. **Alerts** — Prioritized list (see §3.4); emergency / warning / caution / advisory ordering and severity tagging.
6. **Recommended Actions** — Shown when applicable (alert-driven); GPT-4o generated.
7. **Communication** — Crew chat with System AI or Flight Surgeon.

**Habitat** remains on the **overview** only (shared environment, shared causality — proximity compatibility).

---

### 3.4 Alerts — Inline Expansion and Visual Regions

Alerts use **progressive disclosure within the list** so annunciation stays scannable while **trend verification** remains one interaction away (VD-R04).

| State | Content visible |
| :--- | :--- |
| **Collapsed (default)** | **Severity tag** (text label + color per Part 2.3) and **alert title** only — no body text, no separate “trend” affordance icon; the row reads as a single triage line |
| **Expanded** | **Title row** retains a **severity-tinted background** only behind the compact header (severity + title). **Below** a full-width divider, the **body region** uses the **nominal app background** (dark neutral) for: optional **parameter / current value** line when a trend exists, **alert message**, **source** metadata, and **parameter/value** lines as provided by the backend. **Trend chart** sits in a **fixed-height frame** immediately under that alert’s text block (not at the bottom of the full alert list). Chart **legends** carry threshold semantics where applicable |

**Interaction:** Toggling expansion is via the **same compact title row** (click / keyboard). There is **no separate “Close”** control in the alert body; collapsing the row is the dismiss gesture. **Redundant** textual “Thresholds — …” summaries are **not** duplicated under the chart when the chart already encodes limits.

---

## Part 4 — Per-Parameter Display Definitions

### 4.1 Physiological Parameters

Each tile uses the structure: **[label] [numeric value + unit] [limit markers] [context/status]**. Alert coloring applies to the tile border and a severity word prepended to the label when any threshold is exceeded.

---

#### Heart Rate

| Element | Specification |
| :--- | :--- |
| Label | "HEART RATE" |
| Unit | bpm |
| Primary display | Large numeric; minimum 2–3 digit width |
| Sparkline | 6-hour window (48 samples, ~7.5 min resolution); current value anchored at the right edge. Only HR, SpO₂, and RR are available in the vitals time series; BP and body temp do not have a sparkline in the current implementation. |
| On-display limit markers | Tick or dashed line at 45 bpm (CAUTION low), 40 bpm (WARNING low), 120 bpm (CAUTION high), 130 bpm (WARNING high) |
| Context tag | Required: **activity status** (VD-R05); critical to show **Exercise** in the profile when high HR is context-expected and the high-side threshold is suspended |
| Alert states | < 40 bpm → WARNING; 40–45 bpm → CAUTION; > 130 bpm → WARNING; 120–130 bpm → CAUTION (**Exercise** activity profile: high-side Caution threshold suspended — activity status must be visible to explain suppression). Action protocol: Critical. |
| Sensor source | `bio_monitor` (Astroskin / Bio-Monitor garment) |
| SA rationale | HR is the fastest-changing vital and the most context-dependent. The sparkline provides "is this trending worse?" (Level 3 projection). The context tag prevents misclassification of exercise-elevated HR as a warning (Level 2 error). Limit markers allow the crew to judge proximity to threshold without recalling exact values (Level 1 + memory reduction). |

---

#### Blood Pressure — Systolic

| Element | Specification |
| :--- | :--- |
| Label | "BLOOD PRESSURE (SYS)" |
| Unit | mmHg |
| Primary display | Numeric; always labeled "Sys" or "Systolic" — never a bare number |
| Sparkline | In the **crew-detail alerts list**, available inside the **inline expanded chart** when a BP alert is active (toggle the alert title row); uses a 24-hour synthetic series. No persistent sparkline in the vital tile itself. |
| On-display limit markers | Reference lines at 90 mmHg (CAUTION low), 80 mmHg (WARNING low), 160 mmHg (CAUTION high), 170 mmHg (WARNING high) in the expanded alert chart (and legend), consistent with VD-R10 |
| Alert states | < 80 mmHg → WARNING; 80–90 mmHg → CAUTION; > 170 mmHg → WARNING; 160–170 mmHg → CAUTION. Action protocol: Critical. |
| Context tag | Not required (BP thresholds are not activity-profile–suspended in current spec) |
| Sensor source | `bio_monitor` |
| SA rationale | A bare systolic number without the "Sys" label is ambiguous (diastolic, MAP, pulse pressure?). Explicit label prevents Level 2 misinterpretation. Both threshold zones are life-threatening, so the display must draw immediate attention at both ends (discriminability). |

---

#### SpO₂

| Element | Specification |
| :--- | :--- |
| Label | "SpO₂" |
| Unit | % |
| Primary display | Numeric + "%" suffix; for values < 92%, apply WARNING palette with bold border and "WARNING" text prefix; for 92–94%, apply CAUTION palette with "CAUTION" text prefix |
| Sparkline | Required; hypoxia trend is operationally critical — crew must see descent, not just current value |
| On-display limit markers | Horizontal reference lines at 94% (CAUTION) and 92% (WARNING) within the sparkline chart area |
| Alert states | < 92% → WARNING; 92–94% → CAUTION. Action protocol: Critical. |
| Sensor integrity note | If SpO₂ sensor is degraded, additional text required: "SpO₂ SENSOR DEGRADED — trend not reliable" (VD-R09); do not suppress the value but explicitly disclaim it |
| Sensor source | `bio_monitor` (pulse oximetry) |
| SA rationale | SpO₂ has two alert tiers: CAUTION at < 94% signals early desaturation warranting closer monitoring, while WARNING at < 92% signals clinically significant hypoxia requiring immediate action. The ARC_GAUGE makes both threshold markers simultaneously visible as spatial angle markers — the crew judges proximity to each tier without recalling exact numbers (memory reduction, Level 1 SA). The 6-hour sparkline exposes descent rate, enabling early escalation before the WARNING tier is reached (Level 3 projection). |

---

#### Respiration Rate

| Element | Specification |
| :--- | :--- |
| Label | "RESPIRATION RATE" |
| Unit | breaths/min |
| Primary display | Numeric |
| Sparkline | Required; respiration is sensitive to both exertion and CO₂ accumulation — trend exposes causality |
| On-display limit markers | Ticks at 10 breaths/min (CAUTION low), 8 breaths/min (WARNING low), 20 breaths/min (CAUTION high), 24 breaths/min (WARNING high) |
| Context tag | Required: exercise tag suspends high-side Caution threshold as applicable |
| Alert states | < 8 breaths/min → WARNING; 8–10 breaths/min → CAUTION; > 24 breaths/min → WARNING; 20–24 breaths/min → CAUTION (**Exercise** activity profile: high-side Caution suspended — activity status must be visible). Action protocol: Critical. |
| Sensor source | `bio_monitor` |
| SA rationale | Respiration rate changes in response to both physiological distress and environmental CO₂ elevation. Placing the sparkline adjacent to the CO₂ sparkline (proximity compatibility) allows the crew to identify shared causality without navigating between views (Level 2 comprehension). |

---

#### Body Temperature

| Element | Specification |
| :--- | :--- |
| Label | "BODY TEMP" |
| Unit | °C (one decimal place) |
| Primary display | Numeric |
| Sparkline | Not available in the current implementation; body temperature changes slowly and does not have a dedicated trend series |
| On-display limit markers | Ticks at 36.0 °C (CAUTION low), 35.0 °C (WARNING low), 37.5 °C (CAUTION high), 38.0 °C (WARNING high) shown on the band indicator |
| Alert states | < 35.0 °C → WARNING (hypothermia); 35.0–36.0 °C → CAUTION; > 38.0 °C → WARNING (fever); 37.5–38.0 °C → CAUTION. Action protocol: Moderate. |
| Sensor source | `thermo_mini` — `core_body_temp_c` (core body temperature; distinct from `bio_monitor.skin_temp_c` which is skin surface temperature and carries no alert threshold) |
| SA rationale | Body temperature changes slowly, so it does not require the same high-salience treatment as HR or SpO₂. Over-alerting on slow-changing "moderate" parameters risks alarm fatigue and visual competition with true emergencies (discriminability principle). On-display ticks remove the need to recall exact limit values while keeping the tile visually quiet during nominal conditions. |

---

#### Fatigue / Sleep Score

| Element | Specification |
| :--- | :--- |
| Label | "FATIGUE / SLEEP SCORE" |
| Unit | 0–100 (higher = better); show unit explanation on first use or in a tooltip: "higher = better rested" |
| Primary display | Integer numeric + **horizontal progress bar** showing distance from the caution floor (70) and warning floor (60) |
| Trend | Required: trend over previous 3–7 days (not minutes); this parameter is a rolling index, not a real-time signal |
| On-display limit markers | End markers at 70 (CAUTION floor) and 60 (WARNING floor) on the bar; each annotated with its tier label |
| Alert states | < 60 → WARNING; 60–70 → CAUTION. Action protocol: Moderate. |
| Footnote | "Mission-defined threshold — confirm with flight surgeon before operations" (prevents over-reliance on the 60 value as a hard constraint) |
| Sensor source | `oura_ring` + `actiwatch` (fused sleep and recovery data) |
| SA rationale | Composite scores are abstract to a crew member who did not design the algorithm. The bar converts the number into a spatial "how far from the floor?" judgment (relative, not absolute). The multi-day trend is the operationally meaningful signal — a score of 62 declining for four days is more concerning than a score of 58 that is recovering; this supports workload scheduling decisions (Level 3 projection). The footnote prevents misuse of the threshold as a hard operational limit before medical sign-off. |

---

### 4.2 Environmental Parameters

Environmental tiles are grouped in a **shared Habitat Panel** separate from individual crew columns. All crew are affected equally; grouping supports the shared mental model.

---

#### Cabin CO₂ Partial Pressure

| Element | Specification |
| :--- | :--- |
| Label | "CABIN CO₂" |
| Unit | mmHg |
| Primary display | Numeric; ARC_GAUGE as primary graphical modality (see Part 5.2) |
| Alert trend | **Inline** 24-hour synthetic trend chart in the crew-detail **alerts list** when a CO₂ alert is active (expand the alert row) |
| On-display limit markers | Shaded band or vertical guide at 6 mmHg (CAUTION) and 8 mmHg (WARNING) within the arc gauge; the same thresholds appear as reference lines in the **expanded alert chart** |
| Alert states | > 6 mmHg → CAUTION ("Increase cabin ventilation; monitor crew for cognitive symptoms"); > 8 mmHg → WARNING ("Execute warning-level CO₂ protocol; notify ground support immediately") |
| Proximity | Place CO₂ tile adjacent to respiration rate so the crew can correlate rising CO₂ with elevated respiratory rate (proximity compatibility, Level 2 SA) |
| Sensor source | `EnvironmentalSnapshot.cabin_co2_mmhg` (shared cabin sensor) |
| SA rationale | CO₂ elevations degrade cognitive performance before physical symptoms are noticed by the crew. A rising trend (Level 3 projection) is the key early indicator; dual threshold marks (6 and 8 mmHg) allow the crew to judge trajectory and act before reaching the warning tier. The verbal action prompt in the alert message reduces reliance on memorized procedures (Level 2 memory error reduction). |

---

#### Cabin Temperature

| Element | Specification |
| :--- | :--- |
| Label | "CABIN TEMP" |
| Unit | °C |
| Primary display | Numeric; BAND_INDICATOR as primary graphical modality |
| Band indicator | Horizontal band showing low / OK / high zones anchored at 19 °C (low-CAUTION), 18 °C (low-WARNING), 26 °C (high-CAUTION), 27 °C (high-WARNING); band replaces the need to recall limits independently |
| Alert states | < 18 °C → WARNING; 18–19 °C → CAUTION; > 27 °C → WARNING; 26–27 °C → CAUTION. Action protocol: Moderate. |
| Sensor source | `EnvironmentalSnapshot.cabin_temp_c` |
| SA rationale | Habitability temperature is a two-sided band problem; the visual band makes "in range" vs. "out of range" a spatial relative judgment rather than two recalled numbers (memory reduction principle). |

---

#### Relative Humidity

| Element | Specification |
| :--- | :--- |
| Label | "HUMIDITY" |
| Unit | % |
| Primary display | Numeric + "%" suffix; BAND_INDICATOR as primary graphical modality |
| Band indicator | Same band pattern as cabin temperature: Warning-low zone (< 25%), Caution-low zone (25–30%), OK zone (30–70%), Caution-high zone (70–75%), Warning-high zone (> 75%) |
| Alert states | < 25% → WARNING; 25–30% → CAUTION; > 75% → WARNING; 70–75% → CAUTION. Action protocol: Moderate. |
| Sensor source | `EnvironmentalSnapshot.cabin_humidity_pct` |
| SA rationale | Humidity and temperature both use two-sided habitability bands; visual consistency (same band style) reduces the mental model burden and applies the proximity compatibility principle — the crew learns one "band = habitability range" visual idiom for the full environmental panel. |

---

#### Radiation — Cumulative Dose

| Element | Specification |
| :--- | :--- |
| Label | "CUMULATIVE RADIATION DOSE" |
| Unit | mSv |
| Primary display | Numeric + **mission progress bar** that fills toward the caution (50 mSv) and warning (150 mSv) anchors; both marks labeled explicitly ("CAUTION: 50 mSv", "WARNING: 150 mSv") |
| Alert trend | **Inline** 24-hour synthetic cumulative series in the crew-detail **alerts list** when a radiation alert is active (expand the alert row) |
| Trend annotation | Rate of accumulation per day shown as annotation (derived from mock cumulative series) |
| Alert states | > 50 mSv → CAUTION ("Enhanced monitoring; review EVA and task schedule"); > 150 mSv → WARNING ("Mandatory ground consult; re-evaluate crew operational readiness") |
| Sensor source | `EnvironmentalSnapshot.mission_cumulative_dose_msv` (shared mission dose; per-crew dose in `evarm.personal_cumulative_msv` shown separately in Readiness score panel) |
| SA rationale | Cumulative dose is inherently an "approach to limit" quantity — the meaningful question is always "how much margin remains?". The progress bar spatially encodes margin, directly enabling Level 3 projection (EVA scheduling, ALARA decisions). Annotating both caution and warning markers prevents the crew from treating the caution value as the final limit. |

---

### 4.3 Synthesized Score Cards

The crew-detail modal opens with six synthesized score cards as the **primary, always-visible view** (VD-R08 cognitive-load principle: expose the synthesized summary first; raw sensor data only after crew interaction). Score cards are laid out in a 2-column grid.

#### Score Card Anatomy

Each card contains the following elements in fixed order:

| Element | Specification |
| :--- | :--- |
| Score label | Short title (e.g. "Health Score", "Fatigue Score") |
| Numeric value | Large integer (0–100); color follows severity tier: green → nominal, amber → caution, red → warning |
| PROGRESS_BAR | Horizontal fill bar showing value on 0–100 scale; fills left-to-right (higher = better for all six scores); caution floor at 70, warning floor at 60 shown as labeled tick marks |
| Severity badge | Text badge ("CAUTION" or "WARNING") adjacent to numeric when threshold exceeded (VD-R02 non-color cue) |
| Select hint | "Select a score to see its trend and relevant sensors" shown above the grid on first load |

#### Score Alert Thresholds (uniform across all six scores)

| Tier | Threshold | Display treatment |
| :--- | :--- | :--- |
| CAUTION (amber) | Score < 70 | Amber numeric + amber progress fill + "CAUTION" badge |
| WARNING (red) | Score < 60 | Red numeric + red progress fill + "WARNING" badge |
| Nominal | Score ≥ 70 | Green numeric + neutral fill |

#### Score Colors (nominal state — used for chart line and label accent)

| Score | Color | Hex |
| :--- | :--- | :--- |
| Health Score | Green | `#3fb950` |
| Sleep Score | Light blue | `#79c0ff` |
| Activity Score | Amber | `#d29922` |
| Fatigue Score | Orange | `#f0883e` |
| Stress Management | Dark orange | `#db6d28` |
| Readiness Score | Blue | `#58a6ff` |

---

### 4.4 Score-Detail Panel

Clicking a score card opens the score-detail panel below the card grid. Only one score-detail panel is open at a time. The panel is divided into three zones.

#### Zone 1: Score Trend Chart

| Element | Specification |
| :--- | :--- |
| Chart type | Line chart (Chart.js), full panel width |
| Time scale | Toggle buttons: **Daily** (default) · **Weekly** · **Monthly**; data is a synthetic trend series anchored to the current score value |
| Threshold lines | Dashed horizontal lines at Caution floor (70, amber) and Warning floor (60, red) |
| Fill | Area fill below the line, tinted with the score's nominal color at low opacity |
| Axes | Full labeled axes (time on X, score 0–100 on Y) |
| SA rationale | A score of 62 declining for four days is operationally more significant than a score of 58 that is recovering. The multi-day trend is the decision-relevant signal for workload scheduling (Level 3 projection). |

#### Zone 2: Device Sensor Rows

The sensor subset relevant to the selected score is displayed as labeled rows beneath the chart. Rows are grouped by device, with a device icon and name as a group header.

| Element | Specification |
| :--- | :--- |
| Group header | Device icon + device name (e.g. "👕 Bio-Monitor") |
| Field row | Label + formatted value + unit |
| Mini bar | A 4 px inline PROGRESS_BAR appears below the value when the field maps to a parameter in `PARAM_RANGES`. Color follows severity: green → nominal, amber → caution, red → warning. |
| Non-color cue | Severity badge on the same row when caution or warning is active (VD-R02) |

Fields with mini bars are those that have a `param` ID in `SCORE_DETAILS` and whose `param` ID appears in `PARAM_RANGES`. Fields without a defined range (e.g. `hrv_ms`, `ecg_rhythm`, `activity_level`) display as NUMERIC or TEXT only.

#### Zone 3: HMU Intelligence — Score Assessment

A GPT-4o-generated text assessment appears at the bottom of the score-detail panel. It summarizes what the raw sensor data means for this specific score, providing Level 2 (comprehension) SA context that the numeric alone cannot convey.

---

### 4.5 Score-to-Device Semantic Map

This table defines which devices contribute to each synthesized score. Full input field detail is in `7_parameter_limits.md §4`.

| Score | Primary devices | Key indicators surfaced in sensor panel |
| :--- | :--- | :--- |
| **Health Score** | `bio_monitor` · `thermo_mini` · `oura_ring` | Resting HR · SpO₂ · ECG rhythm · Blood pressure · Core body temp · HRV |
| **Sleep Score** | `oura_ring` · `actiwatch` | Sleep stage proportions (deep / REM / light / awake) · Sleep onset latency · Wake episodes · Ambient light |
| **Activity Score** | `bio_monitor` · `actiwatch` · `oura_ring` | Activity METs · Activity counts + level · Steps |
| **Fatigue Score** | `oura_ring` · `actiwatch` · `bio_monitor` | HRV · Temp deviation · Wake episodes · Hyperactivity index · Resting HR · Breathing rate |
| **Stress Management** | `bio_monitor` · `oura_ring` · `personal_co2` | Resting HR · Breathing rate · Tidal volume · HRV · Temp deviation · Personal CO₂ exposure |
| **Readiness Score** | `oura_ring` · `bio_monitor` · `thermo_mini` · `evarm` | HRV · SpO₂ avg · Resting HR · SpO₂ · Core body temp · Personal cumul. dose |

**SA rationale for score-first layout:** Six scores deliver Level 2 comprehension immediately on modal open. The raw device fields (one click deeper) deliver Level 1 verification data for the crew or flight surgeon who needs to confirm the score's basis. This two-step structure minimises cognitive load (Bedford ≤ 3, Req. 4) while keeping all data accessible within two interactions.

---

## Part 5 — Visual Modality Library

This section defines the five reusable visual modality templates and maps each parameter to its assigned modalities. The mapping drives software implementation — each parameter tile shall be rendered using the template(s) specified here.

**Design principle:** Numeric digits alone satisfy Level 1 SA (perception of current value), but do not efficiently support Level 2 (comprehension of meaning) or Level 3 (projection of future state). Secondary modalities are chosen specifically to address the SA gaps that a bare number leaves open for that parameter.

---

### 5.1 Template Definitions

#### NUMERIC

The baseline modality. Always present, either as the sole display or as the dominant element overlaid on a graphical modality.

| Attribute | Specification |
| :--- | :--- |
| Content | Current value in digits + unit label, co-located (VD-R01) |
| Font weight | Bold; minimum 1.2× surrounding text size |
| Color | Follows severity tier: green (nominal), amber (caution), red (warning) |
| Non-color cue | Severity word badge adjacent to value (VD-R02) |
| Use alone when | The parameter has no meaningful graphical encoding (e.g., ECG rhythm label, categorical text) |

---

#### ARC_GAUGE

A partial-circle arc (~270° sweep, starting at the 7:30 o'clock position) that encodes the current value as a filled arc against a fixed background track. Suited to parameters with a well-defined physiological range and threshold ticks on the same scale.

| Attribute | Specification |
| :--- | :--- |
| Shape | SVG arc; clockwise fill from minimum to current value. Implementation: cx=50, cy=42, r=36, viewBox="0 0 100 72", stroke-width=7 |
| Range | Defined per parameter (see §5.2); must cover the full clinically meaningful range, not just nominal bounds |
| Threshold marks | Short radial tick marks at each caution and warning threshold; labeled with value + tier word outside the arc |
| Fill color | Follows severity tier (green / amber / red); background track in neutral dark |
| Center label | Current numeric value + unit in large font centered inside the arc |
| Non-color cue | Tier word ("CAUTION" / "WARNING") displayed below the arc when threshold exceeded (VD-R02) |
| SA rationale | Converts an absolute number into a spatial angle judgment ("how far into the danger arc?"), reducing Level 1 perception effort and Level 2 recall burden for limit values |

---

#### PROGRESS_BAR

A horizontal fill bar encoding the current value as a proportion of a meaningful maximum. Suited to monotonically bounded quantities where proximity to a limit is the primary concern.

| Attribute | Specification |
| :--- | :--- |
| Orientation | Horizontal, full tile width |
| Fill direction | Left → right, from 0 (or min) toward the defined maximum |
| Anchor marks | Vertical tick lines at each caution and warning threshold, with labels above the bar |
| Fill color | Follows severity tier |
| Value label | Numeric + unit displayed above or overlaid on the bar |
| Non-color cue | Tier word badge; anchor mark labels (VD-R02, VD-R10) |
| SA rationale | Spatially encodes "approach to limit" — the meaningful question for bounded parameters is always "how much margin remains?", which a progress bar answers directly (Level 3 projection) |

---

#### BAND_INDICATOR

A static five-zone horizontal strip divided into labeled regions. Suited to parameters with a bilateral normal range (too low and too high are both out of tolerance).

| Attribute | Specification |
| :--- | :--- |
| Zones | Five segments left to right: Warning-Low · Caution-Low · OK · Caution-High · Warning-High |
| Zone widths | Proportional to the parameter range; OK zone is the widest |
| Zone colors | Warning zones in red; Caution zones in amber; OK zone in neutral dark |
| Value cursor | A vertical marker that slides along the band to the current value position |
| Zone label | Text label of the current zone ("IN RANGE", "LOW", "HIGH") displayed below the band |
| Non-color cue | Zone label text; cursor position (VD-R02, VD-R10) |
| SA rationale | Makes the bilateral tolerance problem a single spatial relative judgment ("where is the cursor relative to the OK zone?") instead of two independent recalled limits (memory reduction principle) |

---

#### SPARKLINE

A time-series line chart used as a secondary modality to provide trend direction and rate of change. Two rendering contexts exist in the current implementation:

- **Crew-detail alerts (inline expansion)** — When an alert has a mapped trend parameter, the crew **expands that alert row** in the prioritized alerts list; a **fixed-height chart** is rendered **directly under that row** (not in a separate footer panel). Supported mappings include HR, SpO₂, RR, Cabin CO₂, Systolic BP, and cumulative dose, subject to the same backend/parameter mapping as the prototype. Collapse by activating the same alert title row again (Part 3 §3.4).
- **Score-detail panel** (click score card): renders the synthesized score over day / week / month time scales (user-selectable).

| Attribute | Specification |
| :--- | :--- |
| Time window | Vitals (HR, SpO₂, RR): 6 hours, 48 samples (~7.5 min interval) from `vitals_series`. Systolic BP · Cabin CO₂ · Cabin Temp · Cumul. Dose: 24-hour synthetic series (client-side). Scores: day / week / month synthetic series anchored to current score value. |
| Data source | Vitals: `vitals_series` from backend (48 `VitalSample` records). All others: client-side mock series. |
| Threshold lines | Dashed horizontal reference lines at Caution and Warning thresholds (VD-R10); redundant prose threshold summaries under the chart are omitted when the legend encodes limits (Part 3 §3.4). |
| Line color | Follows current severity tier |
| Axes | Full labeled axes in **score-detail** and in **expanded alert** chart frames |
| Current-value anchor | Right-edge point is current reading. **Alert expansion:** current numeric appears in the **expanded block headline** (parameter label + current value) above the chart body. **Score-detail:** current score is shown in the panel header context. |
| SA rationale | Provides "is this getting worse?" (Level 3 projection) and "how long has this been elevated?" (Level 2 comprehension) that a single numeric cannot convey |

---

### 5.2 Parameter-to-Modality Assignment

Each parameter is assigned one **primary** graphical modality (always rendered) and zero or more **secondary** modalities. NUMERIC is implicitly co-present with every graphical modality. **SPARKLINE(alert)** = time-series in the **crew-detail alerts list**, **inline under the expanded alert row**; **SPARKLINE(score)** = **score-detail** panel chart.

**Physiological vitals:**

| Parameter | Primary modality | Secondary modality | Scale / range | SA gap addressed |
| :--- | :--- | :--- | :--- | :--- |
| Heart Rate | ARC_GAUGE | SPARKLINE(alert) | 30–180 bpm | Spatial distance to caution/warning arc; inline expanded alert chart shows 6-hour HR trace |
| Blood Pressure (Systolic) | NUMERIC | SPARKLINE(alert) | — | Dual Sys/Dia value; inline expanded alert chart shows 24-hour synthetic series |
| SpO₂ | ARC_GAUGE | SPARKLINE(alert) | 80–100% | Arc shrink toward threshold is pre-attentive; two-tier ticks at 94% (caution) and 92% (warning); inline expanded alert chart exposes desaturation trajectory |
| Respiration Rate | ARC_GAUGE | SPARKLINE(alert) | 4–36 breaths/min | Arc encodes both low and high sides simultaneously; inline expanded alert chart supports correlation with CO₂ rise |
| Body Temperature | BAND_INDICATOR | NUMERIC | 33–40 °C | Bilateral normal range; cursor immediately shows deviation from OK zone. Source: `thermo_mini.core_body_temp_c` |

**Environmental / habitat:**

| Parameter | Primary modality | Secondary modality | Scale / range | SA gap addressed |
| :--- | :--- | :--- | :--- | :--- |
| Cabin CO₂ | ARC_GAUGE | SPARKLINE(alert) | 0–12 mmHg | Arc fills toward caution (6 mmHg) and warning (8 mmHg); inline expanded alert chart shows 24-hour trace |
| Cabin Temperature | BAND_INDICATOR | NUMERIC | 14–32 °C | Bilateral band; cursor placement relative to OK zone replaces two recalled limits |
| Relative Humidity | BAND_INDICATOR | NUMERIC | 10–90% | Same pattern as cabin temperature |
| Mission Cumulative Radiation | PROGRESS_BAR | SPARKLINE(alert) | 0–200 mSv | Monotonically increasing toward limit; bar margin encodes EVA planning headroom; inline expanded alert chart shows cumulative trajectory when mapped |

**Synthesized scores (crew-detail score card grid):**

| Score | Primary modality | Secondary modality | Scale | SA gap addressed |
| :--- | :--- | :--- | :--- | :--- |
| Health Score | PROGRESS_BAR | SPARKLINE(score) | 0–100 | Bar shrinks toward caution (70) / warning (60) floors; trend shows recovery or decline |
| Sleep Score | PROGRESS_BAR | SPARKLINE(score) | 0–100 | Multi-day trend is the meaningful signal; single-night score is not sufficient for scheduling |
| Activity Score | PROGRESS_BAR | SPARKLINE(score) | 0–100 | Shows duty-period physical load trajectory |
| Fatigue Score | PROGRESS_BAR | SPARKLINE(score) | 0–100 (higher = less fatigued) | Bar shrinks as fatigue accumulates; trend enables workload rebalancing decisions |
| Stress Management | PROGRESS_BAR | SPARKLINE(score) | 0–100 (higher = better coping) | Trend exposes sustained stress load not visible in any single vital |
| Readiness Score | PROGRESS_BAR | SPARKLINE(score) | 0–100 | Mission-critical gate; EVA/task scheduling requires knowing trajectory, not just current value |

**Device sensor row fields (score-detail panel — shown after score card selection):**

| Parameter | Source field | Modality | Score panels |
| :--- | :--- | :--- | :--- |
| Resting Heart Rate | `bio_monitor.resting_heart_rate_bpm` | NUMERIC + mini bar (`heart_rate_bpm` range) | Health · Fatigue · Stress · Readiness |
| ECG Rhythm | `bio_monitor.ecg_rhythm` | TEXT | Health |
| SpO₂ | `bio_monitor.spo2_pct` | NUMERIC + mini bar (`spo2_pct` range) | Health · Readiness |
| Blood Pressure | `bio_monitor.systolic_mmhg` / `diastolic_mmhg` | NUMERIC + mini bar (`blood_pressure_sys_mmhg` range) | Health |
| Breathing Rate | `bio_monitor.breathing_rate_bpm` | NUMERIC + mini bar (`respiration_rate_bpm` range) | Fatigue · Stress |
| Tidal Volume | `bio_monitor.tidal_volume_l` | NUMERIC | Stress |
| Activity (METs) | `bio_monitor.activity_mets` | NUMERIC | Activity |
| HRV (RMSSD) | `oura_ring.hrv_ms` | NUMERIC | Health · Fatigue · Stress · Readiness |
| Temp deviation | `oura_ring.body_temp_deviation_c` | NUMERIC | Fatigue · Stress |
| Sleep stage % | `oura_ring.sleep_*_pct` × 4 | NUMERIC | Sleep |
| SpO₂ avg | `oura_ring.spo2_avg_pct` | NUMERIC + mini bar (`spo2_pct` range) | Readiness |
| Steps | `oura_ring.steps` | NUMERIC | Activity |
| Sleep onset | `actiwatch.sleep_onset_min` | NUMERIC | Sleep |
| Wake episodes | `actiwatch.wake_episodes` | NUMERIC | Sleep · Fatigue |
| Ambient light | `actiwatch.ambient_light_lux` | NUMERIC | Sleep |
| Activity counts | `actiwatch.activity_counts_per_epoch` | NUMERIC | Activity |
| Activity level | `actiwatch.activity_level` | TEXT | Activity |
| Hyperactivity index | `actiwatch.hyperactivity_index` | NUMERIC | Fatigue |
| Personal CO₂ current | `personal_co2.current_ppm` | NUMERIC *(no mini bar — not in `PARAM_RANGES`)* | Stress; caution >1000 / warning >2500 ppm |
| Personal cumul. dose | `evarm.personal_cumulative_msv` | NUMERIC + mini bar (`radiation_cumulative_msv` range) | Readiness |
| Dose rate | `evarm.dose_rate_usv_h` | NUMERIC | Readiness |

---

### 5.3 Modality Selection Rationale

| SA level | Modality contribution |
| :--- | :--- |
| Level 1 (Perception) | ARC_GAUGE and PROGRESS_BAR reduce the numeric reading task to a spatial glance; BAND_INDICATOR makes zone status pre-attentive; mini bars in sensor rows give instant range-context for raw device values |
| Level 2 (Comprehension) | BAND_INDICATOR labels the current zone; threshold marks on all graphical modalities eliminate limit-recall; SPARKLINE shows whether a value is caused by a trend or an acute event; score card layout groups synthesized meaning before raw data |
| Level 3 (Projection) | SPARKLINE(score) shows multi-day score trajectory for workload scheduling; SPARKLINE(alert) (inline under the expanded alert row) exposes rate of change before threshold breach; PROGRESS_BAR encodes remaining margin toward limit; ARC_GAUGE makes the approach to a threshold visible as arc fill grows |

**Information architecture — SA level mapping:**

| View level | SA function |
| :--- | :--- |
| Overview (all crew columns) | Level 1 — fleet-wide perception and alert triage |
| Score cards (crew-detail primary view) | Level 2 — comprehension of individual physiological status |
| Score-detail + sensor rows | Level 1 verification — raw input data underlying the score |
| Expanded alert inline charts (crew-detail) | Level 3 — projection of whether the condition is improving or worsening |

**Blood Pressure exception:** Systolic + diastolic are always shown as a pair (e.g., 118/76). No single graphical modality encodes two related values on a shared scale without ambiguity. NUMERIC with severity badge and **inline alert trend** access (expand alert row when mapped) is the correct choice.

---

## Part 6 — Sensor Integrity and Device Mapping

### 6.1 Per-Parameter Integrity Table

Each physiological tile carries an integrity indicator from its source device.

| Parameter | Source device / field | Nominal integrity cue | Degraded display (VD-R09) |
| :--- | :--- | :--- | :--- |
| Heart rate | `bio_monitor` (Astroskin garment) | Small "OK" badge or green dot on tile | Numeric greyed + "BIO-MONITOR DEGRADED"; sparkline dashed |
| Blood pressure | `bio_monitor` | Same | Numeric greyed + "BP SENSOR DEGRADED" |
| SpO₂ | `bio_monitor` (dedicated SpO₂ channel — tracked separately as `spo2` in `SensorIntegrity`) | Same | Numeric greyed + "SpO₂ SENSOR DEGRADED — trend not reliable" (SpO₂ triggers WARNING at < 92%) |
| Respiration rate | `bio_monitor` | Same | Numeric greyed + "RR SENSOR DEGRADED" |
| Body temperature | `thermo_mini.core_body_temp_c` | Small "OK" badge | Numeric greyed + "THERMO-MINI DEGRADED" |
| Fatigue / sleep score | `oura_ring` + `actiwatch` | Combined badge | Score greyed + "SLEEP SENSOR DEGRADED — score not reliable" |
| Cabin CO₂ (mmHg) | `EnvironmentalSnapshot.cabin_co2_mmhg` (shared cabin sensor) | Habitat panel badge | Value greyed + "CO₂ SENSOR DEGRADED"; suppress "all clear" styling |
| Personal CO₂ exposure (ppm) | `personal_co2.current_ppm` (per-crew device) | Badge in Stress Management sensor panel | Value shown as "—" + "SENSOR OFFLINE" if device disconnected |
| Cabin temperature | `EnvironmentalSnapshot.cabin_temp_c` | Habitat panel badge | Value greyed + "TEMP SENSOR DEGRADED" |
| Relative humidity | `EnvironmentalSnapshot.cabin_humidity_pct` | Habitat panel badge | Value greyed + "HUMIDITY SENSOR DEGRADED" |
| Mission cumulative radiation | `EnvironmentalSnapshot.mission_cumulative_dose_msv` (shared) | Habitat panel badge | Bar stops updating; "RADIATION SENSOR DEGRADED — dose estimate frozen at last reading" |
| Personal cumulative radiation | `evarm.personal_cumulative_msv` (per-crew dosimeter) | Badge in Readiness Score sensor panel | Value greyed + "EVARM DEGRADED — personal dose estimate frozen" |

When multiple habitat sensors are degraded simultaneously, the habitat panel shall display a consolidated **"HABITAT DATA PARTIAL"** banner and suppress any composite "all-nominal" indicators, to prevent false composure (Level 2 SA protection, Degraded Mode visibility per Req. 11).

---

### 6.2 SensorIntegrity Implementation Model

The backend exposes sensor integrity through a three-field `SensorIntegrity` object, not individual per-device flags. The three channels and their scope are:

| `SensorIntegrity` field | Covers | Possible values |
| :--- | :--- | :--- |
| `heart_rate` | Bio-Monitor garment (HR, BP, RR) | `ok` · `stale` · `lost` |
| `spo2` | SpO₂ dedicated channel (can degrade independently of heart rate channel) | `ok` · `stale` · `lost` |
| `environmental` | EnvironmentalSnapshot (cabin CO₂, temp, humidity, mission dose) | `ok` · `stale` |

Per-device status for `thermo_mini`, `oura_ring`, `actiwatch`, `personal_co2`, and `evarm` is available through `DeviceStatus` records (battery %, connected flag, last-sync age, signal quality) and is surfaced in the device status bar in the crew-detail modal header. It is **not** part of the `SensorIntegrity` model and does not affect operational mode resolution directly.

---

## Part 7 — Traceability

### 7.1 SA Levels Addressed

| SA level | Mechanisms |
| :--- | :--- |
| Level 1 (Perception) | VD-R01 (digits + unit + label on every tile); VD-R02 (non-color severity cues); VD-R07 (7:1 contrast); VD-R10 (on-display limit markers); ARC_GAUGE / PROGRESS_BAR / BAND_INDICATOR graphical modalities; mini bars in sensor rows |
| Level 2 (Comprehension) | VD-R04 (trend access within one interaction); VD-R05 (activity status); VD-R09 (degraded-state styling); CO₂ + RR proximity grouping; alert verbal action prompts; score card layout (synthesized meaning before raw data); score-detail GPT-4o assessment |
| Level 3 (Projection) | SPARKLINE(alert) — rate of change before threshold breach (inline chart under expanded alert); SPARKLINE(score) — multi-day trajectory for workload scheduling; PROGRESS_BAR — remaining margin toward limit; ARC_GAUGE — approach to threshold as arc fill grows; radiation dose rate annotation |
| SA error mitigation | Level 1 errors: VD-R07, VD-R10 (make data and limits visible). Level 2 errors: VD-R05, VD-R09, proximity grouping (prevent wrong mental model, prevent use of degraded data). Level 3 errors: trend displays, radiation bar (prevent over-projection by showing actual trajectory). |

---

### 7.2 Formal Requirements Satisfied

| Formal requirement | VD requirements |
| :--- | :--- |
| Req. 1 (data display) | VD-R01, VD-R08 |
| Req. 3 (design-induced error) | VD-R02, VD-R05, VD-R09 |
| Req. 4 (Bedford workload) | VD-R08 (clutter budget); score-first progressive disclosure |
| Req. 5 (situational awareness) | VD-R04, VD-R05, VD-R06, VD-R09, VD-R10 |
| Req. 6 (legibility) | VD-R07 |
| Req. 7 (threshold alerting) | VD-R03, per-parameter alert states (Part 4) |
| Req. 8 (alert prioritization) | VD-R03 (two-tier palette: Caution/Warning, consistent with NASA-STD-3001 color-class intent) |
| Req. 9 (labeling / icon library) | VD-R01, VD-R02, VD-R03, VD-R06 |
| Req. 11 (mode visibility) | VD-R06 |
| Req. 14 (measurement units) | VD-R01 (unit co-located with every numeric) |

---

*This document and `7_parameter_limits.md` must be updated together whenever: `PARAM_LIMITS` or `PARAM_RANGES` in `app.js` change, a new device field is added to `models.py`, a score's `SCORE_DETAILS` entry changes, a new **activity profile** value (`scenario` key) is defined, or a new sensor device is added.*
