import type { VehicleEntry } from '$lib/validation/formSchema';

// Fällt bei unvollständigem/ungültigem ISO-Datum auf die Rohangabe zurück statt "undefined.
// undefined.undefined" zu produzieren.
export const formatIsoDateDMY = (isoDate: string): string => {
	const [year, month, day] = isoDate.split('-');
	return year && month && day ? `${day}.${month}.${year}` : isoDate;
};

export const formatTimeRange = (vehicle: Pick<VehicleEntry, 'time' | 'endTime'>): string =>
	vehicle.endTime ? `${vehicle.time}–${vehicle.endTime}` : vehicle.time;
