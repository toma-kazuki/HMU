# Requirements: Integrated health monitoring and situational awareness

**Group Project Deliverable 3**

**INTEGRATED HEALTH MONITORING AND SITUATIONAL AWARENESS FOR AUTONOMOUS SPACEFLIGHT LONG-DURATION MISSIONS**

This document lists stated requirements and their documented rationales. The summary section at the end restates only what appears in the requirements body (for traceability).

---

## Requirements and rationale

### 1. Crew health information management methods

**Requirement:** The integrated health monitoring system shall provide methods and tools that enable the crew to input, store, receive, display, process, distribute, update, and dispose of crew health data.

*Rationale: NASA-STD-3001 Vol. 2 [V2 10120] states that the information management system, such as the integrated health monitoring unit, is to provide the hardware and software architecture, including the necessary crew interfaces, to manage all data within the information management system.*

### 2. Usability acceptability

**Requirement:** The integrated health monitoring system shall provide a crew interface that yields an average satisfaction score of 85 or higher on the NASA Modified System Usability Scale (NMSUS) during a representative human-in-the-loop evaluation.

*Rationale: If the user's expectations, needs, capabilities, or intuitions are not met by the system, the design is ineffective, as it can lead to frustration or confusion. Therefore, poor design can impact operations, schedules, and procedures, as well as incrementing workload. It is stated in the NASA-STD-3001 Vol. 2 [V2 10001] that use of the NMSUS is recommended to assess the usability and acceptability of a system.*

### 3. Design-induced error

**Requirement:** The integrated health monitoring system shall provide crew interfaces that limit design-induced errors during representative health monitoring and decision-support tasks such that: 1) no catastrophic design-induced errors occur, 2) non-catastrophic design-induced errors do not exceed 5% per user per task, and 3) non-catastrophic design-induced errors do not exceed 10% per task step.

*Rationale: The crew relies on the system interface to correctly interpret physiological trends, environmental risks, and automated health alerts. Poor interface design may lead to misinterpretation of alert acknowledgements, incorrect crew data selection, and misinterpretation of risk indicators, among other issues. Therefore, it is necessary to limit design-induced errors to support autonomous medical decision-making, reduce cognitive workload, and improve efficiency. An example of a design-induced error could be an astronaut seeing a yellow-looking red alert due to poor contrast or different illumination, leading them to think it is just a caution alert when it is actually a critical alert. This requirement and its values are sourced from NASA-STD-3001 Vol. 2 [V2 10002].*

### 4. Crew interface workload

**Requirement:** The integrated health monitoring system shall provide a crew interface that results in Bedford Workload Scale ratings of 3 or less for nominal monitoring tasks and 6 or less for tasks under degraded system conditions.

*Rationale: The integrated health monitoring system is intended to reduce workload and prevent information overload during long-duration missions beyond low Earth orbit (LEO), where crewmembers have to manage complex physiological and environmental information with limited ground support. If the interface requires excessive mental effort it may delay decision-making, increase the likelihood of errors among others. Therefore, maintaining cognitive workload within acceptable limits ensures that health related tasks can be completed efficiently and accurately. These thresholds are specified in NASA-STD-3001, Vol. 2 [V2 5007], for nominal and degraded system conditions.*

### 5. Situational awareness

**Requirement:** The integrated health monitoring system shall provide the crew with the situational awareness necessary for health-related task performance, and the interface features shall enable rapid recovery of situational awareness if it is degraded or lost during representative scenarios.

*Rationale: Long-duration beyond LEO missions will require crewmembers to interpret physiological, behavioural, and environmental information in order to assess their current health status and the anticipated potential risks, if any. As stated in the NASA-STD-3001 Vol. 2 [V2 5006], a loss of situational awareness may lead to a delayed or incorrect response to emerging medical and operational conditions. Therefore, the interface must clearly present the system state, trends, alerts, and predictive indicators, such as sleep score, stress management score, and readiness score. Finally, interface design that facilitates rapid recovery of situational awareness following task interruptions, workload shifts, or degraded system conditions helps maintain mission performance and reduce crew members’ cognitive stress. For quantitative assessment of situational awareness, industry tools such as Situation Awareness Global Assessment Technique (SAGAT) and Situation  Awareness Rating Technique (SART) are available.*

### 6. Legibility

**Requirement:** The integrated health monitoring system shall provide crew interfaces whose textual and graphical information remains legible to crewmembers under all expected operational viewing conditions, including variations in illumination, viewing distance, and angle, as well as anticipated mission environmental factors.

*Rationale: The crew must rapidly interpret their health and physiological status, as well as environmental and alert information, during nominal and off-nominal system status. Legibility must be preserved under lighting variability, glare, vibration, fatigue, and constrained viewing geometry to avoid delays in decision-making or interpretation errors. Good interface design that maintains legibility across all operational conditions supports efficient task performance, reduces cognitive workload, and contributes to crew safety and mission effectiveness. This requirement is extracted from the NASA-STD-3001 Vol. 2 [V2 5051].*

### 7. Alerting of elevated crew health risk

**Requirement:** The integrated health monitoring system shall detect and alert crewmembers of an exceedance of predefined physiological and environmental operational health thresholds established by mission medical and environmental control authorities and shall automatically alert crew about any impending health risk.

*Rationale: Crew members on long-duration beyond LEO missions must continuously maintain awareness of physiological status and environmental habitability to preserve health, cognitive performance, and mission safety. Examples of operational thresholds that may require crew alerting include sustained deviations in cardiovascular indicators such as heart rate (e.g., sustained tachycardia above 120-130 bpm when not exercising or bradycardia below 40-45 bpm when not sleeping), or blood pressure (e.g., systolic blood pressure exceeding 160-170 mmHg or falling below 80-90 mmHg) which may indicate dehydration, cardiovascular instability, or impending syncope. Furthermore, environmental hazards will also need alerting, such as elevated cabin CO2 partial pressure above 6-8 mmHg, which is associated with degraded cognitive performance and increased crew discomfort, or cabin temperature outside typical habitability ranges of 18-27 ºC that may contribute to thermal stress and reduced task efficiency. Finally, accumulation of radiation exposure approaching mission operational limits even under the ALARA principle, such as mission cumulative dose greater than 50 mSv as an advisory alert, greater than 150 mSv as a warning alert. These alerts will facilitate autonomous medical and operational decision-making, such as not performing an EVA due to bradycardia or already exceeded radiation exposure. Representative threshold examples are informed by human performance and environmental habitability guidance contained in NASA Human Systems Integration documentation, including the NASA Human Integration Design Handbook.*

### 8. Alert prioritization

**Requirement:** The integrated health monitoring system shall prioritize alerts per NASA-STD-3001 Vol. 2 Table 10.3-1

*Rationale: This requirement was developed in accordance with NASA-STD-3001 Vol. 2 [V2 10175]. Although maintaining consistency with the Alert Type and Annunciation in the table categorizing emergencies, warnings, cautions, and advisories, the system extends the scope of alerts associated with crew health risk while refraining from redundant alerting of life/mission threats by the entire spacecraft monitoring system.*

### 9. Labeling plan and icon library

**Requirement:** The integrated health monitoring system shall provide interface labels, symbols, and icons that are consistent with a defined program labeling plan and icon library, including standard conventions for terminology, visual style, color usage, size, and placement across all crew displays and interaction elements.

*Rationale: The crew has to correctly interpret physiological data trends, environmental status indicators, and health risks rapidly and accurately under operational timeline and high cognitive workload. Inconsistent terms and icons across different interfaces or system screens may lead to confusion, errors, or misinterpretation of the crewmembers’  health status. Establishing a labeling plan and an icon library supports uniform presentation of alert levels, sensor data categories, and decision support cues throughout the GUI. The use of consistent labels and icons promotes increased safety, efficiency, and reduced cognitive workload due to reducing errors with the consistent design. This requirement is sourced from NASA-STD-3001 Vol. 2 [V2 10151].*

### 10. Maximum system response time

**Requirement:** The integrated health monitoring system shall provide indication of crew initiated controls within the following times: 1) continuous input of a cursor or onscreen dynamic elements within 0.07 second; 2) indication of a visual, auditory or tactile discrete input within 0.1 second; 3) Update to a local element within 0.5 seconds; 4) Display of a requested graphical user interface (GUI), or display of requested updated data on crew command within 1 second; 5) feedback for commands that cannot be completed within 1 second should indicate that this command is in progress within 1.0 second.

*Rationale: There must be an indication of control activation to acknowledge the system's response to a control action by the crewmember. Feedback on crew inputs is necessary to create a seamless experience and to ensure the crew feels they are interacting with the system. The values for this requirement are obtained from NASA-STD-3001 Vol. 2 Table 10.2-1.*

### 11. Mode visibility

**Requirement:** The integrated health monitoring system shall provide an explicit display indicating to the crew which mode it is operating in: Nominal Monitoring Mode, Alert Mode, Degraded Mode, or Ground-Supported Mode.

*Rationale: An explicit display of the current mode increases situational awareness and reduces misinterpretation of the presented information.*

### 12. Information management ground access

**Requirement:** The system shall allow for ground medical teams to access the onboard database and operate the system in the integrated health monitoring system without crew intervention.

*Rationale: Ground medical teams should be able to access all crew health data in the integrated health monitoring system and perform medical analysis with it. When ground medical teams access the system, it switches to Ground-Supported Mode. This function is intended to support direct interaction between ground and crew health data without crew intervention, while allowing the crew to be aware that operations will occur, are occurring, or have occurred. This requirement referred to NASA-STD-3001 Vol. 2 [V2 10126].*

### 13. Information backup and restoration

**Requirement:** The system shall automatically backup and restore crew health information essential for system functionality, and allow crew-initiated backup and restoration of information that can be generated or changed by crew during the mission.

*Rationale: Data obtained from wearable devices or environmental sensors are to be automatically stored in a backup to ensure data is protected against accidental loss. Backups of the analysis report, fused with these prior data, are generated based on the crew's request via user interface commands. This requirement is derived from NASA-STD-3001 Vol. 2 [V2 10130].*

### 14. Measurement units

**Requirement:** The integrated health monitoring unit shall employ units of measure that are consistent with Program standards, ensuring each individual or grouped numerical value is accompanied by its corresponding unit.

*Rationale: Standardizing measurement units across the system reduces the training burden on the crew and mitigates the risk of manual conversion errors. By providing clearly identifiable magnitudes and scales, the system supports accurate data comparison and enhances overall mission safety for both the crew and the vehicle. This requirement is aligned with the NASA-STD-3001 Vol. 2 [V2 10046].*

### 15. Hardware design for crew safety

**Requirement:** The integrated health monitoring unit shall be free of physical hazards to the crew.

*Rationale: Physical hazards to the crew when accessing the device are to be mitigated throughout the system design. Potential physical hazards include potential energy, sharp edges, and interface handling with the wearable device. Hazards should also be mitigated by providing a warning signal or a sticker on the part of the hardware. This requirement was developed in accordance with NASA-STD-3001 Vol. 2 [V2 9101] [V2 9005] [V2 9007] [V2 9009].*

---

## Requirements index (machine-oriented)

| ID | Short label |
|----|-------------|
| 1 | Crew health information management methods |
| 2 | Usability acceptability (NMSUS ≥ 85) |
| 3 | Design-induced error limits |
| 4 | Bedford workload thresholds (nominal / degraded) |
| 5 | Situational awareness and recovery |
| 6 | Legibility under operational viewing conditions |
| 7 | Alerting on threshold exceedance / impending health risk |
| 8 | Alert prioritization (NASA-STD-3001 Vol. 2 Table 10.3-1) |
| 9 | Labeling plan and icon library |
| 10 | Maximum system response times (control feedback) |
| 11 | Mode visibility (four named modes) |
| 12 | Ground access to onboard database / system operation without crew intervention |
| 13 | Backup and restoration (automatic + crew-initiated scope as stated) |
| 14 | Measurement units per Program standards |
| 15 | Hardware free of physical hazards to crew |

---

## Acronym list

| Acronym | Expansion |
|---------|------------|
| NASA | National Aeronautics and Space Administration |
| NMSUS | NASA Modified System Usability Scale |
| LEO | Low Earth Orbit |
| STD | Standard |
| GUI | Graphical User Interface |

---

## Summary for tooling / implementation

Use this block as a quick checklist when mapping code or tests to this document (verbatim constraints only):

- **IMS / crew health data lifecycle:** input, store, receive, display, process, distribute, update, dispose (Req. 1; rationale cites V2 10120).
- **Usability:** NMSUS average ≥ 85 in representative HITL evaluation (Req. 2; V2 10001).
- **Design-induced errors:** no catastrophic; non-catastrophic ≤ 5% per user per task; ≤ 10% per task step (Req. 3; V2 10002).
- **Workload:** Bedford ≤ 3 nominal monitoring; ≤ 6 degraded conditions (Req. 4; V2 5007).
- **SA:** SA for health-related tasks; rapid recovery features in representative scenarios (Req. 5; V2 5006); predictive indicators explicitly listed include sleep score, stress management score, readiness score; SAGAT/SART mentioned as available industry tools.
- **Legibility:** text/graphics legible under stated viewing-condition variations and anticipated mission environmental factors (Req. 6; V2 5051).
- **Health risk alerting:** detect/alert exceedances of thresholds set by mission medical and environmental control authorities; auto-alert impending health risk (Req. 7); rationale includes the numerical examples and categories exactly as written in the source requirement.
- **Alert prioritization:** per NASA-STD-3001 Vol. 2 Table 10.3-1 (Req. 8; V2 10175) with the rationale text as stated about scope vs spacecraft-wide redundancy.
- **Labeling/icons:** consistency with program labeling plan and icon library across displays/elements (Req. 9; V2 10151).
- **Response times:** 0.07 s / 0.1 s / 0.5 s / 1 s / in-progress within 1.0 s as specified (Req. 10; Table 10.2-1).
- **Modes visible:** Nominal Monitoring, Alert, Degraded, Ground-Supported (Req. 11).
- **Ground access:** ground medical teams access onboard database and operate system without crew intervention; Ground-Supported Mode behavior as stated in rationale (Req. 12; V2 10126).
- **Backup/restore:** automatic backup/restore of information essential for functionality; crew-initiated backup/restore for crew-generated/changed information (Req. 13; V2 10130).
- **Units:** Program-standard units; each value accompanied by unit (Req. 14; V2 10046).
- **Hardware safety:** free of physical hazards; rationale lists examples and mitigations as stated (Req. 15; V2 9101, 9005, 9007, 9009).

---

## References

National Aeronautics and Space Administration, NASA-STD-3001, Volume 1: NASA Space Flight Human-System Standard – Crew Health, NASA Headquarters, Washington, DC, Current Revision.

National Aeronautics and Space Administration, NASA-STD-3001, Volume 2: NASA Space Flight Human-System Standard – Human Factors, Habitability, and Environmental Health, NASA Headquarters, Washington, DC, Current Revision.

National Aeronautics and Space Administration, Human Integration Design Handbook (HIDH), NASA/SP-2010-3407, NASA Headquarters, Washington, DC, 2010.
