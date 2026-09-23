import type { City, EmailTemplateInput, IncidentType } from '$lib/config/cities';
import type { ProfileFields, VehicleEntry } from '$lib/validation/formSchema';

/** Bausteine einer Anzeige: Melderprofil, Fahrzeug und dessen Position in der Gesamtmeldung. */
export interface BuildEmailTemplateInputOptions {
	profile: Pick<
		ProfileFields,
		'firstName' | 'lastName' | 'addressStreet' | 'addressPostcode' | 'addressCity' | 'phone'
	>;
	vehicle: VehicleEntry;
	incidentTypes: Pick<IncidentType, 'label' | 'description'>[];
	photoCount: number;
	vehicleIndex: number;
	vehicleTotal: number;
}

/** Flacht Profil- und Fahrzeugdaten zu der von der E-Mail-Vorlage erwarteten Struktur ab. */
export const buildEmailTemplateInput = (
	opts: BuildEmailTemplateInputOptions
): EmailTemplateInput => ({
	firstName: opts.profile.firstName,
	lastName: opts.profile.lastName,
	addressStreet: opts.profile.addressStreet,
	addressPostcode: opts.profile.addressPostcode,
	addressCity: opts.profile.addressCity,
	phone: opts.profile.phone,
	date: opts.vehicle.date,
	time: opts.vehicle.time,
	endTime: opts.vehicle.endTime,
	locationStreet: opts.vehicle.locationStreet,
	locationHouseNumber: opts.vehicle.locationHouseNumber,
	locationPostcode: opts.vehicle.locationPostcode,
	locationCity: opts.vehicle.locationCity,
	incidentTypes: opts.incidentTypes.map((t) => ({ label: t.label, description: t.description })),
	licensePlate: opts.vehicle.licensePlate,
	licensePlateCountry: opts.vehicle.licensePlateCountry,
	vehicleType: opts.vehicle.vehicleType,
	make: opts.vehicle.make,
	color: opts.vehicle.color,
	notes: opts.vehicle.notes,
	photoCount: opts.photoCount,
	vehicleIndex: opts.vehicleIndex,
	vehicleTotal: opts.vehicleTotal
});

/** Löst die am Fahrzeug gespeicherten Verstoßart-Ids zu den Verstoßarten der Stadt auf. */
export const resolveVehicleIncidentTypes = (
	city: Pick<City, 'incidentTypes'>,
	vehicle: VehicleEntry
): IncidentType[] => city.incidentTypes.filter((t) => vehicle.incidentTypeIds.includes(t.id));
