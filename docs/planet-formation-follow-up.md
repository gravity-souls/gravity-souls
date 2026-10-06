# Planet formation and identity follow-up

- Registration separates gathering preferences from public-tag consent. Back navigation keeps choices; skipping public tags leaves preferences private. Basics settings keep direct field editing.
- Preview names use opaque text rather than gradient clipping, and personalization uses a wide responsive shell with a single-column tablet layout and room for mobile controls.
- Planet Live and generated climate taglines use the selected English/French/Chinese locale. User-written names and descriptions remain unchanged.
- First calibration records PROFILE_COMPLETED with 0 XP; new users remain at level 1. Thresholds remain 0/100/300/700/1500. Existing XP is preserved. The level guide explains participation, rather than formation, as the way to level up.
- First calibration initializes the shared planet texture and glow from the generated visual. Recalibration preserves the existing customized appearance.
- All map portraits prefer custom planet photos, then planet presets, then provider portraits for legacy objects without a planet config. Canvas fallback is a glowing planet rather than an initial. Owner, lists and previews follow the same priority.
- Galaxy layout links use a faint gradient, spaced stardust and restrained twinkle. Real personal relationship edges retain their distinct meanings.
- “Understand my planet” is available throughout calibration (including mobile), the final reveal, Planet Live and My Planet. It explains the generated name as an identifier, chosen climate/life rhythm/expression/themes, self-selected axes and the relationship between appearance and preferences.
- The exact climate choice is retained inside existing visual JSON so introspective/melancholic and electric/turbulent are not collapsed when explaining or editing new profiles. Known generated descriptions recover the climate for older profiles; otherwise the stored mood provides a fallback.

Validation: real route/database formation and recalibration checks, level boundaries, localized meaning/preview rendering, shared map avatar priority, separate registration steps and back navigation, wide customization, localized Planet Live, and email-only map portraits. No schema migration or new environment variables.
