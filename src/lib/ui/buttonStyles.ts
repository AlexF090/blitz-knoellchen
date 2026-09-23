/** Klassen für die primäre Aktion eines Bildschirms. */
// *-button-Farbtokens statt der *-500/*-600-Skalenwerte: die Skalenwerte sind im Dark Mode für
// Text-auf-Surface-Nutzung aufgehellt und als Button-Hintergrund mit text-on-primary sonst zu
// hell (WCAG-AAA-Kontrast, s. layout.css). py-3 statt py-2.5, sonst käme die Klickfläche unter
// die WCAG-AAA-Zielgröße von 44×44px (SC 2.5.5).
export const buttonPrimary =
	'rounded-control bg-primary-button px-4 py-3 text-lg font-semibold text-on-primary hover:bg-primary-button-hover disabled:opacity-50';

/** Klassen für nachgeordnete Aktionen — gleiche Größe wie buttonPrimary, nur als Outline. */
export const buttonSecondary =
	'rounded-control border border-primary-500 px-4 py-3 text-lg font-semibold text-primary-600';

/** Klassen für die endgültige Bestätigung einer destruktiven Aktion. */
export const buttonDestructive =
	'rounded-control bg-destructive-button px-4 py-3 text-lg font-semibold text-on-primary';

/** Klassen für Buttons, die einen Bestätigungsdialog für eine destruktive Aktion öffnen. */
// Gleiches Gewicht wie buttonSecondary (Outline, keine Füllfarbe): signalisiert „Vorsicht", ohne
// bereits wie die finale Bestätigung im Dialog (buttonDestructive) auszusehen.
export const buttonDestructiveSecondary =
	'rounded-control border border-error-fg px-4 py-3 text-lg font-semibold text-error-fg';
