export interface PhotoEntry {
	id: string;
	blob: Blob;
	fileName: string;
}

export const MAX_PHOTOS_PER_REPORT = 3;

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
	address: string;
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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateVehicle = (vehicle: VehicleEntry, photos: PhotoEntry[]): VehicleErrors => {
	const errors: VehicleErrors = {};

	if (!vehicle.licensePlate.trim()) errors.licensePlate = 'Bitte Kennzeichen angeben.';
	if (vehicle.incidentTypeIds.length === 0)
		errors.incidentTypeIds = 'Mindestens eine Verstoßart ist erforderlich.';

	if (vehicle.photoIds.length === 0) {
		errors.photoIds = 'Bitte mindestens ein Foto für dieses Fahrzeug auswählen.';
	} else if (vehicle.photoIds.length > MAX_PHOTOS_PER_REPORT) {
		errors.photoIds = `Maximal ${MAX_PHOTOS_PER_REPORT} Fotos pro Fahrzeug.`;
	} else if (vehicle.photoIds.some((id) => !photos.some((photo) => photo.id === id))) {
		errors.photoIds = 'Ungültige Foto-Zuordnung.';
	}

	return errors;
};

export const validateReportForm = (data: ReportFormData): FormErrors => {
	const errors: FormErrors = {};

	if (!data.firstName.trim()) errors.firstName = 'Vorname ist erforderlich.';
	if (!data.lastName.trim()) errors.lastName = 'Nachname ist erforderlich.';
	if (!data.address.trim()) errors.address = 'Adresse ist erforderlich.';
	if (!data.email.trim()) {
		errors.email = 'E-Mail-Adresse ist erforderlich.';
	} else if (!EMAIL_PATTERN.test(data.email.trim())) {
		errors.email = 'E-Mail-Adresse ist ungültig.';
	}
	if (!data.date.trim()) errors.date = 'Datum ist erforderlich.';
	if (!data.time.trim()) errors.time = 'Uhrzeit ist erforderlich.';
	if (!data.locationStreet.trim()) errors.locationStreet = 'Straße ist erforderlich.';
	if (!data.locationPostcode.trim()) errors.locationPostcode = 'Postleitzahl ist erforderlich.';
	if (!data.locationCity.trim()) errors.locationCity = 'Ort ist erforderlich.';
	if (data.photos.length === 0) {
		errors.photos = 'Mindestens ein Foto ist erforderlich.';
	} else if (data.photos.length > MAX_PHOTOS_PER_REPORT) {
		errors.photos = `Maximal ${MAX_PHOTOS_PER_REPORT} Fotos pro Anzeige.`;
	}

	const vehicleErrors = data.vehicles.map((vehicle) => validateVehicle(vehicle, data.photos));
	if (vehicleErrors.some((v) => Object.keys(v).length > 0)) errors.vehicles = vehicleErrors;

	return errors;
};

export const isFormValid = (errors: FormErrors): boolean => {
	return Object.keys(errors).length === 0;
};
