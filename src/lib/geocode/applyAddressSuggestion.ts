/** Die Tatort-Adressfelder eines Fahrzeug-Eintrags. */
export interface LocationAddressFields {
	locationStreet: string;
	locationHouseNumber?: string;
	locationPostcode: string;
	locationCity: string;
}

/** Adresse aus einer externen Quelle, bei der jeder Bestandteil fehlen kann. */
export interface PartialAddress {
	street?: string | null;
	houseNumber?: string | null;
	postcode?: string | null;
	city?: string | null;
}

/**
 * Überträgt eine Adresse (Autocomplete-Auswahl oder Reverse-Geocoding-Ergebnis) in die
 * location*-Felder eines Fahrzeugs.
 *
 * @param overwrite `true` für eine explizite Dropdown-Auswahl, die vorhandene Werte ersetzt;
 * `false` für einen automatischen EXIF-Fund, der nie bereits eingegebene Werte überschreibt.
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
