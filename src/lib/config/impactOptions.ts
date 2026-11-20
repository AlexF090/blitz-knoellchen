/** Eine auswählbare Angabe zur Auswirkung eines Verstoßes (Behinderung bzw. gefährdete Personen). */
export interface ImpactOption {
	id: string;
	/** Text der Checkbox im Formular. */
	label: string;
	/** Formulierung in der E-Mail. */
	emailText: string;
}

/** Ausmaß der Behinderung; `emailText` ist jeweils ein vollständiger Satz. */
export const IMPAIRMENT_OPTIONS: ImpactOption[] = [
	{
		id: 'gehweg-blockiert',
		label: 'Gehweg vollständig blockiert',
		emailText: 'Der Gehweg war vollständig blockiert.'
	},
	{
		id: 'gehweg-eingeengt',
		label: 'Gehweg stark eingeengt',
		emailText:
			'Der Gehweg war so stark eingeengt, dass ein Passieren nur eingeschränkt möglich war.'
	},
	{
		id: 'ausweichen-fahrbahn',
		label: 'Fußgänger mussten auf die Fahrbahn ausweichen',
		emailText: 'Fußgängerinnen und Fußgänger mussten auf die Fahrbahn ausweichen.'
	},
	{
		id: 'radverkehr-ausweichen',
		label: 'Radfahrende mussten in den fließenden Verkehr ausweichen',
		emailText: 'Radfahrende mussten in den fließenden Verkehr ausweichen.'
	},
	{
		id: 'fahrbahn-blockiert',
		label: 'Fahrbahn blockiert, kein Durchkommen für Fahrzeuge',
		emailText: 'Die Fahrbahn war blockiert, Fahrzeuge kamen nicht mehr durch.'
	},
	{
		id: 'sicht-verdeckt',
		label: 'Sicht beim Queren der Fahrbahn eingeschränkt',
		emailText: 'Das Fahrzeug schränkte die Sicht für Personen ein, die die Fahrbahn queren wollten.'
	},
	{
		id: 'rettungsweg-blockiert',
		label: 'Rettungsweg oder Feuerwehrzufahrt blockiert',
		emailText: 'Ein Rettungsweg bzw. eine Feuerwehrzufahrt war blockiert.'
	},
	{
		id: 'oepnv-behindert',
		label: 'Bus oder Bahn behindert',
		emailText: 'Der Bus- bzw. Bahnverkehr wurde behindert.'
	}
];

/** Gefährdete Personen; `emailText` ist jeweils eine Nominalphrase für eine Aufzählung. */
export const ENDANGERED_PERSON_OPTIONS: ImpactOption[] = [
	{
		id: 'kinder-schulweg',
		label: 'Kinder auf dem Schulweg',
		emailText: 'Kinder auf dem Schulweg'
	},
	{ id: 'fussgaenger', label: 'Fußgänger', emailText: 'Fußgängerinnen und Fußgänger' },
	{
		id: 'rollstuhl-rollator',
		label: 'Menschen mit Rollstuhl oder Rollator',
		emailText: 'Menschen im Rollstuhl oder mit Rollator'
	},
	{
		id: 'kinderwagen',
		label: 'Personen mit Kinderwagen',
		emailText: 'Personen mit Kinderwagen'
	},
	{ id: 'radfahrende', label: 'Radfahrende', emailText: 'Radfahrende' },
	{
		id: 'sehbehindert',
		label: 'Sehbehinderte Menschen',
		emailText: 'sehbehinderte und blinde Menschen'
	}
];

/** Löst ids zu Optionen auf: Reihenfolge der Konfiguration, ohne unbekannte ids und Duplikate. */
export const resolveImpactOptions = (options: ImpactOption[], ids: string[]): ImpactOption[] =>
	options.filter((option) => ids.includes(option.id));
