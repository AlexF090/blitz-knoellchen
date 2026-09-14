// Eine Zeile pro Fahrzeug/Vorgang-Sendeversuch — dieselbe Form wird sowohl für die
// Erfolgs-/Fehler-Anzeige (licensePlate, ok) als auch zum Herausfiltern erfolgreich
// gesendeter Fahrzeuge (vehicleId) gebraucht, dadurch entfällt ein Remap am Ende von onSubmit.
export interface VehicleSendResult {
	vehicleId: string;
	licensePlate: string;
	ok: boolean;
}
