import type { AppMode } from '$lib/appMode.svelte';
import type { VehicleEntry } from '$lib/validation/formSchema';

/** Die Melderdaten, die mit jeder einzelnen Fahrzeug-Anzeige übertragen werden. */
export interface SendFormProfile {
	firstName: string;
	lastName: string;
	addressStreet: string;
	addressPostcode: string;
	addressCity: string;
	email: string;
	phone?: string;
}

/** Ein Fahrzeug ohne die clientseitigen Schlüsselfelder. */
// id/photoIds gehören nicht zur Nutzlast: der Server vergibt eine eigene id ('0') und leitet
// photoIds aus der Reihenfolge der empfangenen Foto-Dateien ab.
export type SendableVehicle = Omit<VehicleEntry, 'id' | 'photoIds'>;

/** Alles, was in die FormData einer einzelnen Fahrzeug-Anzeige einfließt. */
export interface BuildSendFormDataInput {
	profile: SendFormProfile;
	vehicle: SendableVehicle;
	vehicleIndex: number;
	vehicleTotal: number;
	// Roh, nicht als AppMode typisiert — parseSendFormData übernimmt den sicheren Fallback auf
	// 'demo' als Trust-Boundary-Prüfung, das Bauen der FormData selbst validiert nichts.
	mode: string;
	photos: { blob: Blob; fileName: string }[];
}

/** Serialisiert die Anzeige eines Fahrzeugs als FormData für POST /api/send. */
// Die Feldnamen-Stringliterale hier und in parseSendFormData existierten zuvor doppelt
// (ReportForm.svelte `set` vs. api/send/+server.ts `get`) — als Paar in einer Datei mit
// Round-Trip-Test können sie nicht mehr auseinanderdriften.
export const buildSendFormData = ({
	profile,
	vehicle,
	vehicleIndex,
	vehicleTotal,
	mode,
	photos
}: BuildSendFormDataInput): FormData => {
	const body = new FormData();
	body.set('firstName', profile.firstName);
	body.set('lastName', profile.lastName);
	body.set('addressStreet', profile.addressStreet);
	body.set('addressPostcode', profile.addressPostcode);
	body.set('addressCity', profile.addressCity);
	body.set('email', profile.email);
	body.set('phone', profile.phone ?? '');
	body.set('date', vehicle.date);
	body.set('time', vehicle.time);
	body.set('timeMode', vehicle.timeMode);
	body.set('endTime', vehicle.endTime ?? '');
	body.set('locationStreet', vehicle.locationStreet);
	body.set('locationHouseNumber', vehicle.locationHouseNumber ?? '');
	body.set('locationPostcode', vehicle.locationPostcode);
	body.set('locationCity', vehicle.locationCity);
	body.set('vehicleIndex', String(vehicleIndex));
	body.set('vehicleTotal', String(vehicleTotal));
	body.set('licensePlate', vehicle.licensePlate);
	body.set('licensePlateCountry', vehicle.licensePlateCountry);
	body.set('vehicleType', vehicle.vehicleType);
	body.set('make', vehicle.make);
	body.set('color', vehicle.color);
	for (const id of vehicle.incidentTypeIds) body.append('incidentTypeIds', id);
	body.set('notes', vehicle.notes ?? '');
	body.set('mode', mode);
	photos.forEach((photo) => body.append('photos', photo.blob, photo.fileName));
	return body;
};

/** Das aus der FormData zurückgewonnene, noch unvalidierte Gegenstück zu BuildSendFormDataInput. */
export interface ParsedSendFormData {
	profile: SendFormProfile;
	vehicle: SendableVehicle;
	vehicleIndex: number;
	vehicleTotal: number;
	mode: AppMode;
	photoBlobs: File[];
}

/**
 * Liest eine von `buildSendFormData` erzeugte FormData zurück. Sichert nur die Trust-Boundary
 * ab (Typen, sicherer Modus-Fallback) — die inhaltliche Prüfung macht `validateReportForm`.
 */
export const parseSendFormData = (formData: FormData): ParsedSendFormData => {
	const photoBlobs = formData.getAll('photos').filter((p): p is File => p instanceof File);
	const timeMode = formData.get('timeMode') === 'parkverstoss' ? 'parkverstoss' : 'halteverstoss';

	return {
		profile: {
			firstName: String(formData.get('firstName') ?? ''),
			lastName: String(formData.get('lastName') ?? ''),
			addressStreet: String(formData.get('addressStreet') ?? ''),
			addressPostcode: String(formData.get('addressPostcode') ?? ''),
			addressCity: String(formData.get('addressCity') ?? ''),
			email: String(formData.get('email') ?? ''),
			phone: String(formData.get('phone') ?? '') || undefined
		},
		vehicle: {
			licensePlate: String(formData.get('licensePlate') ?? ''),
			licensePlateCountry: String(formData.get('licensePlateCountry') ?? ''),
			vehicleType: String(formData.get('vehicleType') ?? ''),
			make: String(formData.get('make') ?? ''),
			color: String(formData.get('color') ?? ''),
			incidentTypeIds: formData.getAll('incidentTypeIds').map(String),
			notes: String(formData.get('notes') ?? '') || undefined,
			date: String(formData.get('date') ?? ''),
			time: String(formData.get('time') ?? ''),
			timeMode,
			endTime: String(formData.get('endTime') ?? '') || undefined,
			locationStreet: String(formData.get('locationStreet') ?? ''),
			locationHouseNumber: String(formData.get('locationHouseNumber') ?? '') || undefined,
			locationPostcode: String(formData.get('locationPostcode') ?? ''),
			locationCity: String(formData.get('locationCity') ?? '')
		},
		vehicleIndex: Number(formData.get('vehicleIndex') ?? '1'),
		vehicleTotal: Number(formData.get('vehicleTotal') ?? '1'),
		// Fällt bei fehlendem/ungültigem Wert bewusst auf 'demo' zurück — nie ungewollt live an die
		// Bußgeldstelle senden, nur weil ein Client den Modus nicht mitschickt oder manipuliert.
		mode: formData.get('mode') === 'live' ? 'live' : 'demo',
		photoBlobs
	};
};
