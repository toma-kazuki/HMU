# Design reference mission: Mars DRM transit phase

Reference scenario for ConOps and HMU crew-interface design. Facts below are **binding** for the first-version scope unless superseded elsewhere in the design package.

---

## Mission profile

| Attribute | Value |
|-----------|--------|
| **Crew size** | 4 |
| **Phase 1** | Earth → Mars transit, **210 days** |
| **Phase 2** | Mars → Earth transit, **210 days** |

---

## Medical and logistics constraints

- **Evacuation:** No evacuation capability; crew cannot reach definitive medical care off-vehicle.
- **Resupply:** Limited or none during transit; pre-positioned supplies *may* be an option (do not assume continuous resupply).

---

## Communications and autonomy

- **One-way comm delay:** 22 minutes (each direction).
- **Real-time telemedicine:** Limited; consultations are primarily for **information and guidance**, not continuous remote care.
- **Operational implication:** Crew and onboard systems must assume **high autonomy** for health monitoring, triage-style decisions, and following procedures without ground-in-the-loop for every event.

---

## First-version ConOps scope (explicit)

The **first version** of the ConOps covers **transit operations only**.

**Out of scope for v1 (do not design or assume unless a later doc says otherwise):**

- Surface operations
- EVA
- Launch and landing phases

---

## Summary for tooling / implementation

Use this block as a quick checklist when generating requirements or code:

- Transit-only ConOps v1; no surface, EVA, or launch/landing.
- Crew: 4; two 210-day transit legs (outbound and return).
- No medical evacuation; treat onboard care and procedures as primary.
- Resupply: minimal/none; optional pre-position only.
- 22 min one-way delay; telemed is guidance-oriented, not real-time continuous support.
- Design for **autonomous** crew workflows under delayed comms.

---

## Reference
 Urbina, M., McGuire, K., Lehnhardt, K., and Fleming, N., “Medical System Concept of Operations for Mars Exploration Mission-11: Exploration Medical Capability (ExMC) Element - Human Research Program,” HRP 48021, ntrs.nasa.gov, April 2019.
  
