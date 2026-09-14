import type { ReportFormData, VehicleEntry } from './formSchema';

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
