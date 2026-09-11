export interface PhotoEntry {
	id: string;
	blob: Blob;
	fileName: string;
}

export const MAX_PHOTOS_PER_VEHICLE = 3;

// Der Foto-Pool wird von allen Fahrzeugen einer Anzeige gemeinsam genutzt (Fotos können
// zwischen Fahrzeugen geteilt werden) — die Obergrenze skaliert deshalb mit der Anzahl der
// Fahrzeuge statt fest bei MAX_PHOTOS_PER_VEHICLE zu liegen.
export const getMaxPoolPhotos = (vehicleCount: number): number =>
	vehicleCount * MAX_PHOTOS_PER_VEHICLE;

export interface VehicleEntry {
	id: string;
	photoIds: string[];
	licensePlate: string;
	incidentTypeIds: string[];
	notes?: string;
}

export type VehicleErrors = Partial<Record<'licensePlate' | 'incidentTypeIds', string>> & {
	photoIds?: string;
};

export interface ReportFormData {
	firstName: string;
	lastName: string;
	addressStreet: string;
	addressHouseNumber?: string;
	addressPostcode: string;
	addressCity: string;
	email: string;
	date: string;
	time: string;
	locationStreet: string;
	locationHouseNumber?: string;
	locationPostcode: string;
	locationCity: string;
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
	'firstName' | 'lastName' | 'addressStreet' | 'addressPostcode' | 'addressCity' | 'email'
>;

export type ProfileErrors = Partial<Record<keyof ProfileFields, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POSTCODE_PATTERN = /^\d{5}$/;
// Deutsches Kennzeichenschema: 1-3 Buchstaben (Kreis/Stadt), 1-2 Buchstaben
// (Erkennungsnummer), 1-4 Ziffern, optional "E" (E-Kennzeichen) oder "H" (Saisonkennzeichen).
const LICENSE_PLATE_PATTERN = /^[A-ZÄÖÜ]{1,3}[\s-]?[A-ZÄÖÜ]{1,2}[\s-]?\d{1,4}\s?(?:E|H)?$/i;
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

const validateVehicle = (vehicle: VehicleEntry, photos: PhotoEntry[]): VehicleErrors => {
	const errors: VehicleErrors = {};

	if (!vehicle.licensePlate.trim()) {
		errors.licensePlate = 'Bitte Kennzeichen angeben.';
	} else if (!LICENSE_PLATE_PATTERN.test(vehicle.licensePlate.trim())) {
		errors.licensePlate = 'Kennzeichen wirkt ungültig (z.B. K-AB 1234).';
	}
	if (vehicle.incidentTypeIds.length === 0)
		errors.incidentTypeIds = 'Mindestens eine Verstoßart ist erforderlich.';

	if (vehicle.photoIds.length === 0) {
		errors.photoIds = 'Bitte mindestens ein Foto für dieses Fahrzeug auswählen.';
	} else if (vehicle.photoIds.length > MAX_PHOTOS_PER_VEHICLE) {
		errors.photoIds = `Maximal ${MAX_PHOTOS_PER_VEHICLE} Fotos pro Fahrzeug.`;
	} else if (vehicle.photoIds.some((id) => !photos.some((photo) => photo.id === id))) {
		errors.photoIds = 'Ungültige Foto-Zuordnung.';
	}

	return errors;
};

export const validateProfileFields = (data: ProfileFields): ProfileErrors => {
	const errors: ProfileErrors = {};

	if (!data.firstName.trim()) errors.firstName = 'Vorname ist erforderlich.';
	if (!data.lastName.trim()) errors.lastName = 'Nachname ist erforderlich.';
	if (!data.addressStreet.trim()) errors.addressStreet = 'Straße ist erforderlich.';
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

	if (!data.date.trim()) {
		errors.date = 'Datum ist erforderlich.';
	} else if (!isValidCalendarDate(data.date.trim())) {
		errors.date = 'Datum ist ungültig.';
	} else if (data.date.trim() > new Date().toISOString().slice(0, 10)) {
		errors.date = 'Datum darf nicht in der Zukunft liegen.';
	}
	if (!data.time.trim()) {
		errors.time = 'Uhrzeit ist erforderlich.';
	} else if (!TIME_PATTERN.test(data.time.trim())) {
		errors.time = 'Uhrzeit ist ungültig.';
	}
	if (!data.locationStreet.trim()) errors.locationStreet = 'Straße ist erforderlich.';
	if (!data.locationPostcode.trim()) {
		errors.locationPostcode = 'Postleitzahl ist erforderlich.';
	} else if (!POSTCODE_PATTERN.test(data.locationPostcode.trim())) {
		errors.locationPostcode = 'Postleitzahl muss aus 5 Ziffern bestehen.';
	}
	if (!data.locationCity.trim()) errors.locationCity = 'Ort ist erforderlich.';
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
