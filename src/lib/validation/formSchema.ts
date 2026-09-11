import type { GeocodeAddress } from '$lib/geocode/geocodeAddress';

export interface PhotoEntry {
	id: string;
	blob: Blob;
	fileName: string;
	gps: { lat: number; lon: number } | null;
	date: string | null;
	time: string | null;
	// Cache des Reverse-Geocoding-Ergebnisses: undefined = noch nicht versucht,
	// null = versucht, aber fehlgeschlagen/unvollständig.
	resolvedAddress?: GeocodeAddress | null;
}

export const MAX_PHOTOS_PER_VEHICLE = 3;

// Begrenzt, wie viele Fotos in einer einzelnen Dateiauswahl gleichzeitig hinzugefügt werden
// dürfen — unabhängig von MAX_PHOTOS_PER_VEHICLE, das die Zuordnung pro Fahrzeug begrenzt.
export const MAX_PHOTOS_PER_BATCH = 3;

// Der Foto-Pool wird von allen Fahrzeugen einer Anzeige gemeinsam genutzt (Fotos können
// zwischen Fahrzeugen geteilt werden) — die Obergrenze skaliert deshalb mit der Anzahl der
// Fahrzeuge statt fest bei MAX_PHOTOS_PER_VEHICLE zu liegen.
export const getMaxPoolPhotos = (vehicleCount: number): number =>
	Math.max(vehicleCount, 1) * MAX_PHOTOS_PER_VEHICLE;

export interface VehicleEntry {
	id: string;
	photoIds: string[];
	licensePlate: string;
	make: string;
	color: string;
	incidentTypeIds: string[];
	notes?: string;
	date: string;
	time: string;
	// 'parkverstoss' erfordert einen Zeitraum (endTime) mit Mindestparkzeit von 4 Minuten;
	// 'halteverstoss' braucht nur den Einzelzeitpunkt in `time` (s. validateVehicle).
	timeMode: 'halteverstoss' | 'parkverstoss';
	endTime?: string;
	locationStreet: string;
	locationHouseNumber?: string;
	locationPostcode: string;
	locationCity: string;
}

export type VehicleErrors = Partial<
	Record<
		| 'licensePlate'
		| 'make'
		| 'color'
		| 'incidentTypeIds'
		| 'date'
		| 'time'
		| 'endTime'
		| 'locationStreet'
		| 'locationPostcode'
		| 'locationCity',
		string
	>
> & {
	photoIds?: string;
};

export interface ReportFormData {
	firstName: string;
	lastName: string;
	addressStreet: string;
	addressPostcode: string;
	addressCity: string;
	email: string;
	phone?: string;
	photos: PhotoEntry[];
	vehicles: VehicleEntry[];
}

export type FormErrors = Partial<
	Record<keyof Omit<ReportFormData, 'photos' | 'vehicles'>, string>
> & {
	photos?: string;
	vehicles?: VehicleErrors[];
};

export type ProfileFields = Pick<
	ReportFormData,
	'firstName' | 'lastName' | 'addressStreet' | 'addressPostcode' | 'addressCity' | 'email' | 'phone'
>;

export type ProfileErrors = Partial<Record<keyof ProfileFields, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POSTCODE_PATTERN = /^\d{5}$/;
// Straße + Hausnummer als ein Freitextfeld (z. B. "Musterstraße 12", "Musterstraße 12a") —
// endet auf eine Zahl, optional gefolgt von einem einzelnen Buchstaben.
export const HOUSE_NUMBER_SUFFIX_PATTERN = /\d+\s?[a-zA-ZäöüÄÖÜ]?$/;
// Deutsches Kennzeichenschema: 1-3 Buchstaben (Kreis/Stadt), 1-2 Buchstaben
// (Erkennungsnummer), 1-4 Ziffern, optional "E" (E-Kennzeichen) oder "H" (Saisonkennzeichen).
// Capture-Gruppen werden zusätzlich von normalizeLicensePlate() genutzt, um das von der Stadt
// Köln geforderte kanonische Format (z. B. "H-VA1234", kein Zeichen zwischen Buchstaben und
// Ziffern) zu bauen — Eingabe bleibt dabei tippfreundlich/flexibel.
// Der Kreis-Kürzel-Teil ist "lazy" (kürzestmögliche Übereinstimmung zuerst) — bei fehlendem
// Trennzeichen zwischen Kürzel und Buchstabenkombination (z. B. "KAB1234") sorgt das dafür, dass
// das Kürzel möglichst kurz und die anschließende Buchstabenkombination möglichst lang gelesen
// wird (realistischer für deutsche Kennzeichen als ein gieriges Kürzel).
const LICENSE_PLATE_PATTERN = /^([A-ZÄÖÜ]{1,3}?)[\s-]?([A-ZÄÖÜ]{1,2})[\s-]?(\d{1,4})\s?(E|H)?$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const isValidCalendarDate = (value: string): boolean => {
	if (!DATE_PATTERN.test(value)) return false;
	const [year, month, day] = value.split('-').map(Number);
	const date = new Date(Date.UTC(year, month - 1, day));
	return (
		date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
	);
};

const toMinutes = (time: string): number => {
	const [hours, minutes] = time.split(':').map(Number);
	return hours * 60 + minutes;
};

// Formt eine flexibel getippte Eingabe ("K AB 1234", "KAB1234", "k-ab 1234") in das von der
// Stadt Köln für die maschinelle Verarbeitung geforderte kanonische Format um (z. B.
// "H-VA1234"): ein Bindestrich zwischen Kreis-Kürzel und Buchstabenkombination, kein Zeichen
// zwischen Buchstaben- und Ziffernkombination. Nicht-parsbare Eingaben werden unverändert
// (nur getrimmt) zurückgegeben — fail-safe statt zu werfen.
export const normalizeLicensePlate = (value: string): string => {
	const trimmed = value.trim();
	const match = LICENSE_PLATE_PATTERN.exec(trimmed);
	if (!match) return trimmed;
	const [, district, letters, digits, suffix] = match;
	return `${district.toUpperCase()}-${letters.toUpperCase()}${digits}${(suffix ?? '').toUpperCase()}`;
};

export const validateVehicle = (vehicle: VehicleEntry, photos: PhotoEntry[]): VehicleErrors => {
	const errors: VehicleErrors = {};

	if (!vehicle.licensePlate.trim()) {
		errors.licensePlate = 'Bitte Kennzeichen angeben.';
	} else if (!LICENSE_PLATE_PATTERN.test(vehicle.licensePlate.trim())) {
		errors.licensePlate = 'Kennzeichen wirkt ungültig (z.B. K-AB 1234).';
	}
	if (!vehicle.make.trim()) errors.make = 'Marke ist erforderlich (ggf. „Unbekannt").';
	if (!vehicle.color.trim())
		errors.color = 'Farbe ist erforderlich (z. B. „hell"/„dunkel", falls unbekannt).';
	if (vehicle.incidentTypeIds.length === 0)
		errors.incidentTypeIds = 'Mindestens eine Verstoßart ist erforderlich.';

	if (vehicle.photoIds.length === 0) {
		errors.photoIds = 'Bitte mindestens ein Foto für dieses Fahrzeug auswählen.';
	} else if (vehicle.photoIds.length > MAX_PHOTOS_PER_VEHICLE) {
		errors.photoIds = `Maximal ${MAX_PHOTOS_PER_VEHICLE} Fotos pro Fahrzeug.`;
	} else if (vehicle.photoIds.some((id) => !photos.some((photo) => photo.id === id))) {
		errors.photoIds = 'Ungültige Foto-Zuordnung.';
	}

	if (!vehicle.date.trim()) {
		errors.date = 'Datum ist erforderlich.';
	} else if (!isValidCalendarDate(vehicle.date.trim())) {
		errors.date = 'Datum ist ungültig.';
	} else if (vehicle.date.trim() > new Date().toISOString().slice(0, 10)) {
		errors.date = 'Datum darf nicht in der Zukunft liegen.';
	}
	if (!vehicle.time.trim()) {
		errors.time = 'Uhrzeit ist erforderlich.';
	} else if (!TIME_PATTERN.test(vehicle.time.trim())) {
		errors.time = 'Uhrzeit ist ungültig.';
	}

	if (vehicle.timeMode === 'parkverstoss') {
		const endTime = vehicle.endTime?.trim();
		if (!endTime) {
			errors.endTime = 'Bis-Uhrzeit ist erforderlich (Mindestparkzeit 4 Minuten).';
		} else if (!TIME_PATTERN.test(endTime)) {
			errors.endTime = 'Bis-Uhrzeit ist ungültig.';
		} else if (!errors.time) {
			const diff = toMinutes(endTime) - toMinutes(vehicle.time.trim());
			if (diff <= 0) {
				errors.endTime = 'Bis-Uhrzeit muss nach der Von-Uhrzeit liegen.';
			} else if (diff < 4) {
				errors.endTime =
					'Für einen Parkverstoß ist eine Mindestparkzeit von 4 Minuten erforderlich.';
			}
		}
	}

	if (!vehicle.locationStreet.trim()) errors.locationStreet = 'Straße ist erforderlich.';
	if (!vehicle.locationPostcode.trim()) {
		errors.locationPostcode = 'Postleitzahl ist erforderlich.';
	} else if (!POSTCODE_PATTERN.test(vehicle.locationPostcode.trim())) {
		errors.locationPostcode = 'Postleitzahl muss aus 5 Ziffern bestehen.';
	}
	if (!vehicle.locationCity.trim()) errors.locationCity = 'Ort ist erforderlich.';

	return errors;
};

export const validateProfileFields = (data: ProfileFields): ProfileErrors => {
	const errors: ProfileErrors = {};

	if (!data.firstName.trim()) errors.firstName = 'Vorname ist erforderlich.';
	if (!data.lastName.trim()) errors.lastName = 'Nachname ist erforderlich.';
	if (!data.addressStreet.trim()) {
		errors.addressStreet = 'Straße ist erforderlich.';
	} else if (!HOUSE_NUMBER_SUFFIX_PATTERN.test(data.addressStreet.trim())) {
		errors.addressStreet = 'Bitte Straße mit Hausnummer angeben (z. B. „Musterstraße 12").';
	}
	if (!data.addressPostcode.trim()) {
		errors.addressPostcode = 'Postleitzahl ist erforderlich.';
	} else if (!POSTCODE_PATTERN.test(data.addressPostcode.trim())) {
		errors.addressPostcode = 'Postleitzahl muss aus 5 Ziffern bestehen.';
	}
	if (!data.addressCity.trim()) errors.addressCity = 'Ort ist erforderlich.';
	if (!data.email.trim()) {
		errors.email = 'E-Mail-Adresse ist erforderlich.';
	} else if (!EMAIL_PATTERN.test(data.email.trim())) {
		errors.email = 'E-Mail-Adresse ist ungültig.';
	}

	return errors;
};

export const validateReportForm = (data: ReportFormData): FormErrors => {
	const errors: FormErrors = { ...validateProfileFields(data) };

	const maxPoolPhotos = getMaxPoolPhotos(data.vehicles.length);
	if (data.photos.length === 0) {
		errors.photos = 'Mindestens ein Foto ist erforderlich.';
	} else if (data.photos.length > maxPoolPhotos) {
		errors.photos = `Maximal ${maxPoolPhotos} Fotos insgesamt (max. ${MAX_PHOTOS_PER_VEHICLE} pro Fahrzeug).`;
	}

	const vehicleErrors = data.vehicles.map((vehicle) => validateVehicle(vehicle, data.photos));
	if (vehicleErrors.some((v) => Object.keys(v).length > 0)) errors.vehicles = vehicleErrors;

	return errors;
};

export const isFormValid = (errors: FormErrors): boolean => {
	return Object.keys(errors).length === 0;
};
