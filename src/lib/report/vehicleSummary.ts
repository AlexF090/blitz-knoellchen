import type { IncidentType } from '$lib/config/cities';
import {
	ENDANGERED_PERSON_OPTIONS,
	IMPAIRMENT_OPTIONS,
	resolveImpactOptions
} from '$lib/config/impactOptions';
import { formatIsoDateDMY, formatTimeRange } from '$lib/format/germanDate';
import { formatAddress } from '$lib/geocode/formatAddress';
import type { VehicleEntry } from '$lib/validation/formSchema';

/** Eine Beschriftung/Wert-Zeile der Fahrzeug-Zusammenfassung. */
export interface SummaryRow {
	label: string;
	value: string;
}

interface BuildVehicleSummaryRowsOptions {
	// s. VehicleBlock.svelte, zwei <dl>-Blöcke mit identischer Semantik.
	includeEmpty: boolean;
}

/**
 * Baut die Übersichtszeilen einer Fahrzeug-Karte.
 *
 * @param includeEmpty `true` zeigt jede Zeile mit „—"-Fallback (eingeklappte Karte), `false`
 * blendet leere Zeilen ganz aus (Lösch-Dialog).
 */
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
	// Optionale Zeilen erscheinen auch bei includeEmpty nur mit Inhalt, ohne „—"-Platzhalter.
	const impairmentLabels = resolveImpactOptions(IMPAIRMENT_OPTIONS, vehicle.impairmentIds).map(
		(option) => option.label
	);
	if (impairmentLabels.length > 0)
		rows.push({ label: 'Ausmaß der Behinderung', value: impairmentLabels.join(', ') });
	const endangeredPersonLabels = resolveImpactOptions(
		ENDANGERED_PERSON_OPTIONS,
		vehicle.endangeredPersonIds
	).map((option) => option.label);
	const endangeredPersons = [endangeredPersonLabels.join(', '), vehicle.endangeredPersonsNote]
		.filter(Boolean)
		.join(' – ');
	if (endangeredPersons) rows.push({ label: 'Gefährdete Personen', value: endangeredPersons });
	if (vehicle.notes) rows.push({ label: 'Weitere Angaben', value: vehicle.notes });

	return rows;
};
