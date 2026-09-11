export interface LocationAddressFields {
	locationStreet: string;
	locationHouseNumber?: string;
	locationPostcode: string;
	locationCity: string;
}

export interface PartialAddress {
	street?: string | null;
	houseNumber?: string | null;
	postcode?: string | null;
	city?: string | null;
}

/**
 * Überträgt eine Adresse (Autocomplete-Auswahl oder Reverse-Geocoding-Ergebnis) in die
 * location*-Felder eines Fahrzeugs. `overwrite` unterscheidet die beiden Aufrufsituationen:
 * eine explizite Dropdown-Auswahl ersetzt vorhandene Werte, ein automatischer EXIF-Fund
 * überschreibt nie bereits vorhandene (auch manuell eingegebene) Werte.
 */
export const applyAddressSuggestion = (
	target: LocationAddressFields,
	address: PartialAddress,
	overwrite: boolean
): void => {
	if (address.street && (overwrite || !target.locationStreet)) {
		target.locationStreet = address.street;
	}
	if (address.houseNumber && (overwrite || !target.locationHouseNumber)) {
		target.locationHouseNumber = address.houseNumber;
	}
	if (address.postcode && (overwrite || !target.locationPostcode)) {
		target.locationPostcode = address.postcode;
	}
	if (address.city && (overwrite || !target.locationCity)) {
		target.locationCity = address.city;
	}
};
