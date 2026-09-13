export const buttonPrimary =
	'rounded-control bg-primary-600 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50';

export const buttonSecondary =
	'rounded-control border border-primary-500 px-4 py-2.5 text-sm font-semibold text-primary-600';

export const buttonDestructive =
	'rounded-control bg-error-fg px-4 py-3 text-sm font-semibold text-white';

// Gleiches Gewicht wie buttonSecondary (Outline, keine Füllfarbe) — nur für Trigger-Buttons
// destruktiver Aktionen, deren eigentliche Bestätigung weiterhin über buttonDestructive im
// Dialog läuft. Signalisiert "Vorsicht" ohne bereits wie die finale Bestätigung auszusehen.
export const buttonDestructiveSecondary =
	'rounded-control border border-error-fg px-4 py-2.5 text-sm font-semibold text-error-fg';
