/** Verbindet Einträge als deutsche Aufzählung: „A", „A und B", „A, B und C". */
export const joinGermanList = (items: string[]): string => {
	if (items.length <= 1) return items.join('');
	return `${items.slice(0, -1).join(', ')} und ${items[items.length - 1]}`;
};
