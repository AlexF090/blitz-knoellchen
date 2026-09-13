// bg-primary-button/bg-primary-button-hover statt bg-primary-600/hover:bg-primary-700 — im Dark
// Mode ist primary-600 für Text-auf-Surface-Nutzung aufgehellt und als Button-Hintergrund mit
// weißem Text sonst zu hell (WCAG-AAA-Kontrast, s. layout.css).
export const buttonPrimary =
	'rounded-control bg-primary-button px-4 py-3 text-lg font-semibold text-white hover:bg-primary-button-hover disabled:opacity-50';

// py-3 statt py-2.5 — sonst käme die Klickfläche unter die WCAG-AAA-Zielgröße von 44×44px (SC 2.5.5).
export const buttonSecondary =
	'rounded-control border border-primary-500 px-4 py-3 text-lg font-semibold text-primary-600';

// bg-destructive-button statt bg-error-fg — im Dark Mode ist error-fg für Text-auf-Surface-Nutzung
// aufgehellt und als Button-Hintergrund mit weißem Text sonst zu hell (WCAG-AAA-Kontrast, s.
// layout.css).
export const buttonDestructive =
	'rounded-control bg-destructive-button px-4 py-3 text-lg font-semibold text-white';

// Gleiches Gewicht wie buttonSecondary (Outline, keine Füllfarbe) — nur für Trigger-Buttons
// destruktiver Aktionen, deren eigentliche Bestätigung weiterhin über buttonDestructive im
// Dialog läuft. Signalisiert "Vorsicht" ohne bereits wie die finale Bestätigung auszusehen.
export const buttonDestructiveSecondary =
	'rounded-control border border-error-fg px-4 py-3 text-lg font-semibold text-error-fg';
