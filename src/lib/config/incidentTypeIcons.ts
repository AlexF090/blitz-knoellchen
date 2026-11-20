import { Merge } from '@lucide/svelte';
import type { OptionIconMap } from './optionIcon';

/** Icon je Verstoßart-Id, damit sich die lange Verstoß-Liste schneller überfliegen lässt. */
// Vorrang hat das Verkehrszeichen, wo ein einzelnes Schild den Ort des Verstoßes eindeutig zeigt
// (Zeichen 237, 239, 283, 286, 350), danach ein Emoji, und nur wo es kein passendes Emoji gibt ein
// Lucide-Icon. Die zweite Reihe zeigt zwei Autos nebeneinander, weil ein einzelnes Emoji den
// Verstoß nicht abbildet. Die Schild-SVGs stammen von Wikimedia Commons (amtliche Werke, gemeinfrei) und
// liegen lokal unter static/signs, damit beim Rendern kein externer Request entsteht.
export const INCIDENT_TYPE_ICONS: OptionIconMap = {
	gehweg: { kind: 'sign', src: '/signs/zeichen-239-gehweg.svg' },
	halteverbot: { kind: 'sign', src: '/signs/zeichen-283-halteverbot.svg' },
	parkverbot: { kind: 'sign', src: '/signs/zeichen-286-parkverbot.svg' },
	'zweite-reihe': { kind: 'emoji', character: '🚘🚘' },
	schwerbehindert: { kind: 'emoji', character: '♿' },
	feuerwehrzufahrt: { kind: 'emoji', character: '🚒' },
	radweg: { kind: 'sign', src: '/signs/zeichen-237-radweg.svg' },
	'entgegen-fahrtrichtung': { kind: 'emoji', character: '↔️' },
	fussgaengerueberweg: { kind: 'sign', src: '/signs/zeichen-350-fussgaengerueberweg.svg' },
	kreuzung: { kind: 'symbol', component: Merge }
};
