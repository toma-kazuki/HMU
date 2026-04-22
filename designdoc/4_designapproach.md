# Design approach: Integrated health monitoring and situational awareness

**Group Project Deliverable 4**

**INTEGRATED HEALTH MONITORING AND SITUATIONAL AWARENESS FOR AUTONOMOUS SPACEFLIGHT LONG-DURATION MISSIONS**

AERO 636 Human Factors Engineering

Group 7

This document captures the stated design approach, figures/tables, and development planning content as written below.

---

## Background

### Problem statement

Long-duration spaceflight missions beyond low Earth orbit (LEO) will expose astronauts to complex physiological, behavioral, and environmental stressors, including microgravity, sleep disruption, fatigue, high workload, and radiation. Current health monitoring approaches rely on multiple independent wearable and onboard systems that collect critical data related to this aerospace environment. Some examples of these data include heart rate and radiation levels. However, this information is usually fragmented, poorly synthesized, and not optimized for real-time crew decision-making under high cognitive workload, which could lead to decreased situational awareness. In this project, it is assumed that these devices and the Health Monitoring Unit (HMU) are already in place and functioning, with data being collected, transmitted, and processed onboard the spacecraft.

As missions extend to the Moon and Mars, crewmembers have to operate with greater autonomy due to communication delays between spacecraft or planetary modules and ground control. The lack of an effective human-centered interface that presents health, performance, and environmental data clearly, intuitively, and in an actionable way creates a gap in crew operations. This can lead to delayed recognition of health risks, misinterpretation of system outputs, and decreased crew performance. Hence, there is a need for a crew interface that transforms processed data into meaningful visualizations and prioritizes critical insights, enabling efficient interpretation and decision-making under constant high-workload conditions.

### Design objective

The objective of this project is to design a human-centered crew interface that effectively displays integrated data from the existing HMU during long-duration missions beyond LEO. The interface will present synthesized physiological health and behavioral data, as well as environmental information through intuitive visualizations, trend indicators, and prioritized alerts to support fast understanding and decision-making. The key design drivers stated in the requirements are usability, clarity, workload reduction, improved situational awareness, and robustness under varying operational conditions, such as fatigue, lighting changes, and partial data availability. The prototype will be evaluated through human-in-the-loop testing to assess usability, situational awareness, and cognitive workload. This will ensure that the interface enables accurate interpretation of health status and supports timely, informed crew responses. It is also assumed that crew members will be able to access this application via their onboard personal computer.

---

## Design approach

![conops](./images/conops.png)

**Figure 1:** High-level architecture of the integrated health monitoring system showing sensor inputs (left), onboard data processing (middle), and crew interface (right).

### Conceptual design

In this section, the initial system-level design concept is portrayed with several diagrams.

#### Overall Human-Machine Interaction Loop Diagram

![hmi_loop](./images/hmi_loop.png)

**Figure 2:** **Overall Human-Machine Interaction Loop Diagram**. Illustration of the system architecture, information flow, and interactions between crew, wearable devices, environmental sensors, the HMU, and ground support through mission control.

#### Software Functional Block Diagram

![sfbd](./images/software_fbd.png)

**Figure 3: Software Functional Block Diagram.** Illustration of the functional architecture of the system software, including data acquisition from sensors and wearable devices, data processing and fusion using algorithms and expert knowledge, backend data management for storage and retrieval, the presentation layer of crew interaction, and the communication layer enabling remote access and control by ground systems.

#### Function allocation table

**Table 1: Function Allocation Table**. Definition of how key system functions required to achieve the project objectives, such as threshold detection, alerting, and health data interpretation, are distributed between system components and the crew in alignment with the requirements established.

| Function | Allocation | Rationale |
| :---- | :---- | :---- |
| Continuous data collection | **System**  | Continuous, background, no crew action needed |
| Threshold exceedance detection | **System**  | Faster than human response, safety critical |
| Alert acknowledgement | **Human (manual)** | Human judgment required for contextual validity |
| Health trend interpretation | **Shared** | System provides scores; human makes final decision |
| Data backup initiation | **Shared** | Auto backup continuous, crew can initiate on demand |

Discussion of key design choices: The involvement of the ground medical team depends on the condition's severity and urgency. For time-critical situations, the crew is expected to act autonomously based on system alerts. For non-immediate cases, the crew should coordinate with mission control to enter Ground-Supported Mode, allowing ground personnel to access and analyze the data and provide guidance on appropriate actions.

#### Alert and notification hierarchy

**Table 2: Alert & Notification Hierarchy.** Classification of physiological and environmental parameters based on severity levels and corresponding crew response actions. Values extracted from NASA-STD-3001 Vol. 1 [1] and 2 [2], and NASA HIDH [3]. *1: non-sleep conditions; *2: non-exercise conditions.

| Parameter | Lower Limit | Upper Limit | Severity | Recommended Action |
| :---- | :---- | :---- | :---- | :---- |
| Heart Rate (bpm) | < 40–45 (bradycardia*1) | > 120–130 (tachycardia*2) | Critical | Immediate crew action required |
| Blood Pressure (mmHg) | < 80 (presyncope risk) | > 170 | Critical | Immediate crew action required |
| SpO₂ (%) | < 92 | NA | Critical | Immediate crew action required |
| Respiration Rate (breaths/min) | < 8 | > 24 (*2) | Critical | Immediate crew action required |
| Body Temperature (°C) | < 35 (hypothermia) | > 38 (fever) | Moderate | Monitor and consult ground if persistent |
| Fatigue / Sleep Score | < mission-defined threshold | NA | Moderate | Monitor trends; adjust workload if needed |
| Cabin CO₂ Partial Pressure (mmHg) | NA | Advisory: > 6 Warning: > 8 | Advisory / Warning | Action aligned with severity level |
| Cabin Temperature (°C) | < 18 | > 27 | Moderate | Monitor and consult ground if persistent |
| Relative Humidity (%) | < 25 | > 75 | Moderate | Monitor and consult ground if persistent |
| Radiation Exposure (Cumulative Dose, mSv) | NA | Advisory: > 50 Warning: > 150 | Advisory / Warning | Aligned with severity and consult with ground |

---

## Design development

### Materials and resources

**Table 3: Materials and Resources**. Table with the list of materials, tools, hardware, and software resources that we expect to use for prototype development.

| item | category | justification |
| :---- | :---- | :---- |
| MacBook Pro | Hardware | Primary development platform used to design, code, and test the interface prototype. |
| Python v3 | Software resource | Coding language and environment for developing the interface logic, data processing, and visualization of health parameters. |
| Cursor | Coding agent | An AI-assisted coding tool to accelerate the development, debugging, and implementation of the interface. |

### Risks and mitigations

**Table 4: Risk and Mitigations.** Risks expected to be encountered during development and the mitigation approach for each risk.

| Risk Category | Risk | Mitigation Approach |
| :---- | :---- | :---- |
| Technical Uncertainty | Uncertainty of appropriate selection of the methods of visualization for complex multi-parameter health data in a clear and intuitive manner. | Start with simple visualization techniques such as plots or color-coded indicators, and iteratively refine through testing and feedback. |
| Integration Risks | Difficulty of integrating simulated health data into the interface in a way that mimics real HMU outputs. | Use standardized data formats and create mock datasets that replicate expected HMU outputs to ensure consistent code testing. |
| Availability of Hardware or Software | Potential limitations or incompatibilities in required development tools, libraries, or computing resources. | Rely on widely available open source and well-supported tools such as Python libraries, and ensure compatibility across development environments. |
| Schedule | Limited time to design, implement, and test the interface prototype within the project deadline. | Prioritize core features, and limit the scope to essential interface functionality. |

### Roles and responsibilities

**Table 5: Roles and responsibilities**. Table that defines the primary responsibility of each team member during the prototype development phase.

| Team member | Role | Primary Responsibilities |
| :---- | :---- | :---- |
| **Member 1** | - Software / Interface Subsystem Lead - Co-Documentation Lead - Co-Testing Engineer | Leads software development and interface implementation, including coding of the graphical user interface and creation of the virtual environment for prototype testing. Supports system integration and assists with debugging and optimizing the interface. Contributes to documentation reports and writing. Performs system testing and validation of the interface, including human-in-the-loop evaluation. |
| **Member 2** | - Human Factors and Bioastronautics Lead - Data Visualization Lead - Co-Documentation Lead - Co-Testing Engineer | Provides domain expertise on physiological and environmental parameter limits, as well as guidance on effective data visualization and human-centered design for the parameters. Supports the implementation of visualization features and assists in coding. Contributes to documentation reports and writing. Performs system testing and validation of the interface, including human-in-the-loop evaluation. |

---

## Summary for tooling / implementation

Use this block as a quick checklist when aligning implementation work to this deliverable (stated content only):

- **Assumptions stated in background:** Wearables and HMU already in place; data collected, transmitted, processed onboard; crew access via onboard personal computer (as written).
- **Design objective elements explicitly listed:** Human-centered crew interface displaying integrated HMU data beyond LEO; synthesized physiological health and behavioral data plus environmental information; visualizations, trend indicators, prioritized alerts; design drivers named: usability, clarity, workload reduction, situational awareness, robustness under fatigue/lighting/partial data; evaluation via human-in-the-loop testing for usability, situational awareness, cognitive workload.
- **Figures referenced:** Figure 1 (architecture), Figure 2 (HMI loop), Figure 3 (software FBD) as captioned.
- **Function allocation:** Table 1 rows and rationale column as given; discussion paragraph on ground involvement vs autonomous response vs Ground-Supported Mode as given.
- **Alert hierarchy:** Table 2 parameters/limits/severity/actions as given; footnotes *1 and *2 as given.
- **Prototype resources:** Table 3 items (MacBook Pro, Python v3, Cursor) with stated justifications.
- **Development risks/mitigations:** Table 4 as given.
- **Team roles:** Table 5 as given.

---

## References

[1] National Aeronautics and Space Administration, NASA-STD-3001, Volume 1: NASA Space Flight Human-System Standard – Crew Health, NASA Headquarters, Washington, DC, Current Revision.

[2] National Aeronautics and Space Administration, NASA-STD-3001, Volume 2: NASA Space Flight Human-System Standard – Human Factors, Habitability, and Environmental Health, NASA Headquarters, Washington, DC, Current Revision.

[3] National Aeronautics and Space Administration, Human Integration Design Handbook (HIDH), NASA/SP-2010-3407, NASA Headquarters, Washington, DC, 2010.
