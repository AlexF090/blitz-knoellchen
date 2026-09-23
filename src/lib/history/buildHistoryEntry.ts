import type { IncidentType } from '$lib/config/cities';
import { formatAddress } from '$lib/geocode/formatAddress';
import { normalizeLicensePlate } from '$lib/validation/formSchema';
import type { PhotoEntry, VehicleEntry } from '$lib/validation/formSchema';
import type { HistoryEntry } from './db';

/** Rohdaten einer gerade versendeten Anzeige. */
export interface BuildHistoryEntryInput {
	// id/timestamp als Parameter statt intern per crypto.randomUUID()/Date.now() erzeugt — hält
	// die Funktion rein und ohne Mocking testbar.
	id: string;
	timestamp: number;
	firstName: string;
	lastName: string;
	vehicle: VehicleEntry;
	incidentTypes: IncidentType[];
	photos: PhotoEntry[];
}

/** Verdichtet eine versendete Anzeige zu dem in der Historie gespeicherten Eintrag. */
export const buildHistoryEntry = ({
	id,
	timestamp,
	firstName,
	lastName,
	vehicle,
	incidentTypes,
	photos
}: BuildHistoryEntryInput): HistoryEntry => ({
	id,
	timestamp,
	firstName,
	lastName,
	locationAddress: formatAddress({
		street: vehicle.locationStreet,
		houseNumber: vehicle.locationHouseNumber,
		postcode: vehicle.locationPostcode,
		city: vehicle.locationCity
	}),
	incidentTypeLabels: incidentTypes.map((type) => type.label),
	licensePlate: normalizeLicensePlate(vehicle.licensePlate, vehicle.licensePlateCountry),
	licensePlateCountry: vehicle.licensePlateCountry,
	vehicleType: vehicle.vehicleType,
	make: vehicle.make,
	color: vehicle.color,
	notes: vehicle.notes,
	thumbnails: photos.map((photo) => photo.blob)
});
