interface TimeRange {
	time: string;
	endTime?: string;
}

/** Formatiert ein ISO-Datum als "TT.MM.JJJJ". */
export const formatIsoDateDMY = (isoDate: string): string => {
	const [year, month, day] = isoDate.split('T')[0].split('-');
	// Fällt bei unvollständiger/ungültiger Eingabe auf die Rohangabe zurück, statt
	// "undefined.undefined.undefined" zu produzieren.
	return year && month?.length === 2 && day?.length === 2 ? `${day}.${month}.${year}` : isoDate;
};

/** Formatiert die Tatzeit als "von–bis", bei fehlender Bis-Uhrzeit nur als Einzelzeitpunkt. */
export const formatTimeRange = (vehicle: TimeRange): string =>
	vehicle.endTime ? `${vehicle.time}–${vehicle.endTime}` : vehicle.time;

const timestampFormat = new Intl.DateTimeFormat('de-DE', {
	day: '2-digit',
	month: '2-digit',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
	hourCycle: 'h23',
	timeZone: 'Europe/Berlin'
});

/** Formatiert einen Zeitstempel in Millisekunden als "TT.MM.JJJJ, HH:MM" in Berliner Zeit. */
export const formatTimestampDE = (milliseconds: number): string =>
	timestampFormat.format(milliseconds);
