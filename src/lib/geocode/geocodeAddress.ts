/** Ergebnis eines Geocoding-Lookups; jeder Bestandteil kann beim Anbieter fehlen. */
export interface GeocodeAddress {
	street: string | null;
	houseNumber: string | null;
	postcode: string | null;
	city: string | null;
}
