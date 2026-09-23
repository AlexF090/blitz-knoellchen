import type { ReportFormData, VehicleEntry } from './formSchema';

/**
 * Erzeugt ein leeres Fahrzeug mit den Formular-Defaults (Nationalitätszeichen „D",
 * Marke „Unbekannt", Halteverstoß).
 */
export const createEmptyVehicle = (id: string = crypto.randomUUID()): VehicleEntry => ({
	id,
	photoIds: [],
	licensePlate: '',
	licensePlateCountry: 'D',
	vehicleType: '',
	make: 'Unbekannt',
	color: '',
	incidentTypeIds: [],
	notes: '',
	date: '',
	time: '',
	timeMode: 'halteverstoss',
	locationStreet: '',
	locationHouseNumber: '',
	locationPostcode: '',
	locationCity: ''
});

/** Erzeugt ein leeres Anzeigen-Formular, noch ohne Fahrzeuge und Fotos. */
export const createEmptyForm = (): ReportFormData => ({
	firstName: '',
	lastName: '',
	addressStreet: '',
	addressPostcode: '',
	addressCity: '',
	email: '',
	phone: '',
	photos: [],
	vehicles: []
});
