import type { City } from '$lib/config/cities';
import { resolveVehicleIncidentTypes } from '$lib/email/buildEmailTemplateInput';
import { buildHistoryEntry } from '$lib/history/buildHistoryEntry';
import type { HistoryEntry } from '$lib/history/db';
import type { PhotoEntry, ReportFormData } from '$lib/validation/formSchema';
import { normalizeLicensePlate } from '$lib/validation/formSchema';
import { buildSendFormData } from './sendFormData';
import type { VehicleSendResult } from './sendResults';

/** Die abzusendende Anzeige plus die von außen injizierten Seiteneffekte. */
export interface SubmitVehicleReportsInput {
	form: ReportFormData;
	city: City;
	mode: string;
	// Netzwerk-, Storage- und Zufallsquellen kommen von außen — analog zu buildHistoryEntry hält
	// das die Funktion ohne Rendering und ohne Modul-Mocking testbar.
	send: (body: FormData) => Promise<boolean>;
	saveHistoryEntry: (entry: HistoryEntry) => Promise<unknown>;
	createId: () => string;
	now: () => number;
}

/**
 * Sendet jedes Fahrzeug als eigene Anzeige und schreibt jeden Erfolg in die Historie.
 * Liefert pro Fahrzeug ein Ergebnis; ein Fehlschlag bricht die Schleife nicht ab.
 */
// Eine E-Mail pro Fahrzeug, weil die Bußgeldstelle pro Vorgang eine erwartet. Sequenziell statt
// parallel, und die Historie direkt nach jedem Erfolg geschrieben, damit ein Abbruch mitten in
// der Schleife keine bereits versendete Anzeige verliert.
export const submitVehicleReports = async ({
	form,
	city,
	mode,
	send,
	saveHistoryEntry,
	createId,
	now
}: SubmitVehicleReportsInput): Promise<VehicleSendResult[]> => {
	const photoById = new Map(form.photos.map((photo) => [photo.id, photo]));
	const results: VehicleSendResult[] = [];

	for (const [index, vehicle] of form.vehicles.entries()) {
		const vehiclePhotos = vehicle.photoIds
			.map((id) => photoById.get(id))
			.filter((photo): photo is PhotoEntry => photo !== undefined);

		const ok = await send(
			buildSendFormData({
				profile: form,
				vehicle,
				vehicleIndex: index + 1,
				vehicleTotal: form.vehicles.length,
				mode,
				photos: vehiclePhotos.map((photo, photoIndex) => ({
					blob: photo.blob,
					fileName: `beweisfoto-${photoIndex + 1}.jpg`
				}))
			})
		);

		results.push({
			vehicleId: vehicle.id,
			licensePlate: normalizeLicensePlate(vehicle.licensePlate, vehicle.licensePlateCountry),
			ok
		});

		if (ok) {
			await saveHistoryEntry(
				buildHistoryEntry({
					id: createId(),
					timestamp: now(),
					firstName: form.firstName,
					lastName: form.lastName,
					vehicle,
					incidentTypes: resolveVehicleIncidentTypes(city, vehicle),
					photos: vehiclePhotos
				})
			);
		}
	}

	return results;
};
