/** Ergebnis eines einzelnen Fahrzeug-Sendeversuchs. */
// Enthält sowohl die Anzeige-Felder (licensePlate, ok) als auch die vehicleId zum Herausfiltern
// bereits gesendeter Fahrzeuge — dadurch entfällt ein Remap am Ende von onSubmit.
export interface VehicleSendResult {
	vehicleId: string;
	licensePlate: string;
	ok: boolean;
}
