import type { IncidentType } from '$lib/config/cities';
import { formatIsoDateDMY, formatTimeRange } from '$lib/format/germanDate';
import { formatAddress } from '$lib/geocode/formatAddress';
import type { VehicleEntry } from '$lib/validation/formSchema';

export interface SummaryRow {
	label: string;
	value: string;
}

interface BuildVehicleSummaryRowsOptions {
	// Eingeklappte Karte zeigt jede Zeile immer (mit "—"-Fallback), der Lösch-Dialog blendet
	// leere Zeilen ganz aus (s. VehicleBlock.svelte, zwei <dl>-Blöcke mit identischer Semantik).
	includeEmpty: boolean;
}

export const buildVehicleSummaryRows = (
	vehicle: VehicleEntry,
	incidentTypes: IncidentType[],
	{ includeEmpty }: BuildVehicleSummaryRowsOptions
): SummaryRow[] => {
	const address = vehicle.locationStreet
		? formatAddress({
				street: vehicle.locationStreet,
				houseNumber: vehicle.locationHouseNumber,
				postcode: vehicle.locationPostcode,
				city: vehicle.locationCity
			})
		: [vehicle.locationPostcode, vehicle.locationCity].filter(Boolean).join(' ');
	const vehicleDescription = includeEmpty
		? `${vehicle.vehicleType || '—'} · ${vehicle.make} · ${vehicle.color || '—'}`
		: vehicle.vehicleType || vehicle.make || vehicle.color
			? [vehicle.vehicleType, vehicle.make, vehicle.color].filter(Boolean).join(' · ')
			: '';
	const incidentLabels = incidentTypes
		.filter((type) => vehicle.incidentTypeIds.includes(type.id))
		.map((type) => type.label)
		.join(', ');
	const dateTime = vehicle.date
		? vehicle.time
			? `${formatIsoDateDMY(vehicle.date)}, ${formatTimeRange(vehicle)} Uhr`
			: formatIsoDateDMY(vehicle.date)
		: vehicle.time
			? `${formatTimeRange(vehicle)} Uhr`
			: '';

	const rows: SummaryRow[] = [];
	const push = (label: string, value: string) => {
		if (value || includeEmpty) rows.push({ label, value: value || '—' });
	};
	push('Kennzeichen', vehicle.licensePlate);
	push('Fahrzeug', vehicleDescription);
	push('Tatort', address);
	push('Datum / Uhrzeit', dateTime);
	push('Art des Verstoßes', incidentLabels);
	// Immer nur bei tatsächlichem Inhalt, auch bei includeEmpty — kein "—"-Platzhalter für ein
	// reines Freitext-Zusatzfeld.
	if (vehicle.notes) rows.push({ label: 'Weitere Angaben', value: vehicle.notes });

	return rows;
};
