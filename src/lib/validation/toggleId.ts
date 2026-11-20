/** Nimmt eine id in eine Mehrfachauswahl auf oder entfernt sie; die Eingabeliste bleibt unverändert. */
export const toggleId = (ids: string[], id: string, checked: boolean): string[] => {
	if (!checked) return ids.filter((existing) => existing !== id);
	return ids.includes(id) ? ids : [...ids, id];
};
