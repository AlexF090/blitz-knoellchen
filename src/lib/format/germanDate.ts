interface TimeRange {
	time: string;
	endTime?: string;
}

// Fällt bei unvollständigem/ungültigem ISO-Datum auf die Rohangabe zurück statt "undefined.
// undefined.undefined" zu produzieren.
export const formatIsoDateDMY = (isoDate: string): string => {
	const [year, month, day] = isoDate.split('T')[0].split('-');
	return year && month?.length === 2 && day?.length === 2 ? `${day}.${month}.${year}` : isoDate;
};

export const formatTimeRange = (vehicle: TimeRange): string =>
	vehicle.endTime ? `${vehicle.time}–${vehicle.endTime}` : vehicle.time;
