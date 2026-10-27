# Original EscalaMED confirmation components

Source: `x5med/obrigado-x5med`, pinned at `0bc2798` (27/10/2026). Links target stable page/section anchors so scroll animations cannot shift their destinations.

HeroRibbons, JourneyTransition, NextSteps, AdmitOneTicket, header, CSS, local fonts and brand assets are imported from the reference. Original keyframes, durations, easing, 3 ribbon layers, pointer tilt and scroll coordinates are preserved. Import paths are local; the journey wrapper uses a div because the application already owns the main landmark; ticket status says “Inscrição recebida”. The stylesheet uses native @scope to prevent resets from changing the form. Scroll anchoring is disabled within the moving presentation to preserve anchor navigation.

Form copy, receipt, pending review notice, contact and restart remain application-owned. Checklist storage is scoped to the receipt and cleared on restart. /obrigado renders the same component for direct verification; visiting it neither submits a form nor emits Lead/sign_up.

Reimport with `node scripts/import-confirmation-reference.mjs <reference checkout>`. The generator reads the pinned commit, not uncommitted source files. Font OFL licenses accompany the assets; Phosphor icons use MIT-licensed SSR exports.
