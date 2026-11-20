import type { Component } from 'svelte';

/** Amtliches Verkehrszeichen als Bild unter `static/signs`. */
export interface TrafficSignIcon {
	kind: 'sign';
	/** Root-relativer Pfad der SVG-Datei, z.B. `/signs/zeichen-283-halteverbot.svg`. */
	src: string;
}

/** Emoji als Zeichen; Darstellung kommt aus der System-Emoji-Schrift. */
export interface EmojiIcon {
	kind: 'emoji';
	character: string;
}

/** Strich-Icon aus `@lucide/svelte`, nur wo es kein passendes Emoji gibt. */
export interface SymbolIcon {
	kind: 'symbol';
	component: Component<{ class?: string; 'aria-hidden'?: 'true' }>;
}

/** Orientierungs-Icon vor einer Checkbox-Option; rein dekorativ, das Label trägt die Bedeutung. */
export type OptionIcon = TrafficSignIcon | EmojiIcon | SymbolIcon;

/** Zuordnung Options-id → Icon; Optionen ohne Eintrag erscheinen ohne Icon. */
export type OptionIconMap = Partial<Record<string, OptionIcon>>;
