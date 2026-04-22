# Problem statement: Integrated health monitoring and situational awareness

**INTEGRATED HEALTH MONITORING AND SITUATIONAL AWARENESS FOR AUTONOMOUS SPACEFLIGHT LONG-DURATION MISSIONS**

**PROBLEM DEFINITION**

---

## Problem definition

During long-duration spaceflight missions in low Earth orbit, astronauts are exposed to an extreme environment; they live under unique physiological conditions such as microgravity or partial gravity, as well as psychological stressors such as isolation or sleep deprivation, radiation exposure, and limited medical support. Current spaceflight health monitoring relies on multiple wearables and onboard systems to assess for physiological, behavioural, and environmental data. Some examples include the Thermo-Mini, which measures body temperature, the ActiWatch Spectrum to monitor sleep, and small radiation dosimeters that fit in a pocket [1]. These data can include heart rate, sleep activity, and radiation exposure, among others. However, this information is often fragmented, displayed separately, and intended to be analyzed later on by ground teams, while not being meant for real-time astronaut decision-making.

As missions move beyond LEO to the Moon and Mars, there will be a substantial communication delay and operational autonomy of the crew. Therefore, astronauts must obtain and interpret a great amount of information themselves while experiencing high workload, fatigue, or stress. Fragmented data of several situational awareness inputs increases workload, degrades situational awareness, and raises the risk of delayed detection of health issues such as fatigue accumulation, stress overload, illness onset, or radiation-related effects.

The problem that this project addresses is the lack of an integrated and human-centered health monitoring system that obtains and synthesizes data from multiple wearables and environmental data sources into an interpretable display. This integration will help crews with the early detection of health degradation, which would lead to performance decrements, operational errors, or mission-threatening medical events during long duration missions beyond LEO.

---

## Rationale for need

NASA’s Human Research Program (HRP) designates the risk of “Adverse Health Outcomes and Decrements in Performance Due to Medical Conditions that occur in Mission, as well as Long Term Health Outcomes Due to Mission Exposures,” [2] classified as a red risk for a long duration Mars mission. Exposing the human body to increasingly harsh environments requires in-flight medical monitoring and a biotelemetry system to track changes in crew performance and health over time. Medical monitoring equipment has been provided in the early phase of human spaceflight, such as the Mercury and Vostok programs [3]. More specifically, there was a case during the Apollo 15 mission where an ECG in the Apollo biosinstrumentation system detected arrhythmia during intensive exercise during an EVA, which resulted in a change of the following EVA operation schedule [4].

Furthermore, NASA’s HRP identifies the “Risk of Performance Decrements and Adverse Health Outcomes Resulting from Sleep Loss, Circadian Desynchronization, and Work Overload.” Its evidence report [5] highlights the need for relevant monitoring technologies that can detect sleep quality and quantity, as well as performance metrics needed to evaluate fitness-for-duty. Research from Barger *et al*. [6] using objective wearable monitoring during long duration spaceflight missions shows astronauts consistently sleep around six hours, which falls below recommendations. Moreover, van Dongen *et al*. [7] demonstrate progressive performance degradation for chronic sleep deprivation, while subjects believe they are functioning adequately. Therefore, the evidence establishes a need for objective, trend monitoring systems to address human limitations of self-assessment.

Existing literature that has worked on wearable devices for vital sign monitoring includes the  LifeGuard [8], which measures electrocardiogram, respiration rate, heart rate, hemoglobin oxygen saturation, ambient or body temperature, three axes of acceleration, and blood pressure with a hand-sized crew physiologic observation device (CPOD) [9], a couple of electrodes, an oximeter, and a harness. Finally, as Bellisle *et al.* [10] advocated, there is a need for integrated “smart” garments with a wearable sensor network covering the entire body. The systems used for long-duration autonomous missions should be discussed in view of crew conformity with these wearable devices and a crew-centered design of synthesized analysis presentation.

---

## Summary for tooling / implementation

Use this block as a quick checklist when tracing design rationale (no new claims beyond the sections above):

- **Context:** Long-duration missions (including LEO as described); stressors named in the problem definition include microgravity or partial gravity, isolation, sleep deprivation, radiation, limited medical support.
- **Current monitoring:** Multiple wearables/onboard systems; examples named: Thermo-Mini, ActiWatch Spectrum, pocket radiation dosimeters; data examples include heart rate, sleep activity, radiation exposure, among others.
- **Stated limitation:** Information often fragmented, displayed separately, analyzed later by ground teams, not meant for real-time astronaut decision-making.
- **Beyond LEO:** Communication delay and crew operational autonomy; crew must obtain/interpret information under high workload, fatigue, or stress; fragmented situational awareness inputs linked to workload, degraded SA, delayed detection (fatigue accumulation, stress overload, illness onset, radiation-related effects).
- **Project problem (as stated):** Lack of an integrated, human-centered health monitoring system that obtains and synthesizes data from multiple wearables and environmental data sources into an interpretable display, to support early detection of health degradation leading to performance decrements, operational errors, or mission-threatening medical events beyond LEO.
- **Rationale strands explicitly cited:** HRP red risk framing [2]; early-program monitoring examples [3]; Apollo 15 ECG / EVA schedule example [4]; sleep/workload risk evidence [5]–[7]; LifeGuard/CPOD literature [8]–[9]; integrated “smart” garments [10].

---

## References

[1] National Aeronautics and Space Administration, “Wearable Tech for Space Station Research,” NASA, https://www.nasa.gov/missions/station/iss-research/wearable-tech-for-space-station-research/. Accessed: 5 Feb. 2026.

[2] NASA Human Research Program, “Evidence Report: Risk of Adverse Health Outcomes and Decrements in Performance Due to In-Flight Medical Conditions,” NASA Johnson Space Center, Houston, TX, 2017.

[3] *Space Biology and Medicine*, Washington: U.S. Joint Publications Research Service; available from National Technical Information Service, Springfield, Va, 1971.

[4] Johnston, R. S., Dietlein, L. F., and Berry, C. A., “Biomedical results of Apollo,” Washington, D.C: Scientific and Technical Information Office, National Aeronautics and Space Administration, 1975.

[5] NASA Human Research Program, ”Evidence Report: Risk of Performance Decrements and Adverse Health Outcomes Resulting from Sleep Loss, Circadian Desynchronization, and Work Overload,” NASA Johnson Space Center, Houston, TX, 2016.

[6] Barger, L. K., Flynn-Evans, E. E., Kubey, A., Walsh, L., Ronda, J. M., Wang, W., Wright, K. P., and Czeisler, C. A., “Prevalence of Sleep Deficiency and Use of Hypnotic Drugs in Astronauts before, during, and after Spaceflight: An Observational Study,” *The Lancet Neurology*, Vol. 13, No. 9, 2014, pp. 904–912. https://doi.org/10.1016/S1474-4422(14)70122-X

[7] Van Dongen, H. P. A., Maislin, G., Mullington, J. M., and Dinger, D. F., “The Cumulative Cost of Additional Wakefulness: Dose-Response Effects on Neurobehavioral Functions and Sleep Physiology From Chronic Sleep Restriction and Total Sleep Deprivation,” *Sleep*, Vol. 26, No. 2, 2003, pp. 117–126. https://doi.org/10.1093/sleep/26.2.117

[8] Montgomery, K., Mundt, C., Thonier, G., Tellier, A., Udoh, U., Barker, V., Ricks, R., Giovangrandi, L., Davies, P., Cagle, Y., Swain, J., Hines, J., and Kovacs, G., “Lifeguard - a personal physiological monitor for extreme environments,” *The 26th Annual International Conference of the IEEE Engineering in Medicine and Biology Society*, vol. 3, pp. 2192–2195.

[9] Mundt, C. W., Montgomery, K. N., Udoh, U. E., Barker, V. N., Thonier, G. C., Tellier, A. M., Ricks, R. D., Darling, R. B., Cagle, Y. D., Cabrol, N. A., Ruoss, S. J., Swain, J. L., Hines, J. W., and Kovacs, G. T. A., “A Multiparameter Wearable Physiologic Monitoring System for Space and Terrestrial Applications,” *IEEE Transactions on Information Technology in Biomedicine*, vol. 9, Sep. 2005, pp. 382–391.

[10] Bellisle, R., Bjune, C., and Newman, D., “Considerations for Wearable Sensors to Monitor Physical Performance During Spaceflight Intravehicular Activities,” *The 42nd Annual International Conference of the IEEE Engineering in Medicine and Biology Society*, Jul. 2020, pp. 4160–4164.
