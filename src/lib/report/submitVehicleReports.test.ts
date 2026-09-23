import { CITIES } from '$lib/config/cities';
import type { HistoryEntry } from '$lib/history/db';
import { createEmptyForm, createEmptyVehicle } from '$lib/validation/emptyForm';
import type { PhotoEntry, ReportFormData } from '$lib/validation/formSchema';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { submitVehicleReports } from './submitVehicleReports';

const photo = (id: string): PhotoEntry => ({
	id,
	blob: new Blob([id]),
	fileName: `${id}.jpg`,
	gps: null,
	date: null,
	time: null
});

const vehicleWith = (id: string, licensePlate: string, photoIds: string[]) => ({
	...createEmptyVehicle(id),
	licensePlate,
	photoIds,
	incidentTypeIds: ['gehweg']
});

const formWith = (vehicles: ReportFormData['vehicles'], photos: PhotoEntry[]): ReportFormData => ({
	...createEmptyForm(),
	firstName: 'Max',
	lastName: 'Mustermann',
	email: 'max@example.org',
	vehicles,
	photos
});

const run = (form: ReportFormData, send: (body: FormData) => Promise<boolean>) => {
	const saved: HistoryEntry[] = [];
	let nextId = 0;

	const results = submitVehicleReports({
		form,
		city: CITIES.koeln,
		mode: 'demo',
		send,
		saveHistoryEntry: async (entry) => {
			saved.push(entry);
		},
		createId: () => `entry-${++nextId}`,
		now: () => 1700000000000
	});

	return { results, saved };
};

describe('submitVehicleReports', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('sendet eine Anzeige pro Fahrzeug und schreibt jeden Erfolg in die Historie', async () => {
		const send = vi.fn().mockResolvedValue(true);
		const form = formWith(
			[vehicleWith('v1', 'K AB 1234', ['p1']), vehicleWith('v2', 'K-CD-5678', ['p2'])],
			[photo('p1'), photo('p2')]
		);

		const { results, saved } = run(form, send);
		const resolved = await results;

		expect(send).toHaveBeenCalledTimes(2);
		expect(resolved.map((r) => r.ok)).toEqual([true, true]);
		// Kanonisches Format, nicht die Roheingabe — dieselbe Normalisierung wie beim Server.
		expect(resolved.map((r) => r.licensePlate)).toEqual(['K-AB1234', 'K-CD5678']);
		expect(saved).toHaveLength(2);
		expect(saved.map((entry) => entry.id)).toEqual(['entry-1', 'entry-2']);
	});

	it('nummeriert jedes Fahrzeug innerhalb der Gesamtzahl, damit der Empfänger die Mails zuordnen kann', async () => {
		const bodies: FormData[] = [];
		const send = vi.fn(async (body: FormData) => {
			bodies.push(body);
			return true;
		});
		const form = formWith(
			[vehicleWith('v1', 'K-AB1234', []), vehicleWith('v2', 'K-CD5678', [])],
			[]
		);

		await run(form, send).results;

		expect(bodies.map((b) => b.get('vehicleIndex'))).toEqual(['1', '2']);
		expect(bodies.map((b) => b.get('vehicleTotal'))).toEqual(['2', '2']);
	});

	it('hängt nur die dem jeweiligen Fahrzeug zugeordneten Fotos an', async () => {
		const bodies: FormData[] = [];
		const send = vi.fn(async (body: FormData) => {
			bodies.push(body);
			return true;
		});
		const form = formWith(
			[vehicleWith('v1', 'K-AB1234', ['p1', 'p3']), vehicleWith('v2', 'K-CD5678', ['p2'])],
			[photo('p1'), photo('p2'), photo('p3')]
		);

		await run(form, send).results;

		expect(bodies[0].getAll('photos')).toHaveLength(2);
		expect(bodies[1].getAll('photos')).toHaveLength(1);
	});

	it('ignoriert Foto-IDs, die nicht mehr im Pool liegen', async () => {
		const bodies: FormData[] = [];
		const send = vi.fn(async (body: FormData) => {
			bodies.push(body);
			return true;
		});
		const form = formWith([vehicleWith('v1', 'K-AB1234', ['p1', 'geloescht'])], [photo('p1')]);

		await run(form, send).results;

		expect(bodies[0].getAll('photos')).toHaveLength(1);
	});

	it('schreibt keinen Historien-Eintrag, wenn der Versand fehlschlägt', async () => {
		const send = vi.fn().mockResolvedValue(false);
		const form = formWith([vehicleWith('v1', 'K-AB1234', ['p1'])], [photo('p1')]);

		const { results, saved } = run(form, send);

		expect((await results)[0].ok).toBe(false);
		expect(saved).toEqual([]);
	});

	it('sendet nach einem Fehlschlag die übrigen Fahrzeuge weiter', async () => {
		const send = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
		const form = formWith(
			[vehicleWith('v1', 'K-AB1234', []), vehicleWith('v2', 'K-CD5678', [])],
			[]
		);

		const { results, saved } = run(form, send);
		const resolved = await results;

		expect(resolved.map((r) => r.ok)).toEqual([false, true]);
		expect(resolved.map((r) => r.vehicleId)).toEqual(['v1', 'v2']);
		// Nur der erfolgreiche Vorgang landet in der Historie.
		expect(saved).toHaveLength(1);
	});

	it('löst die Bezeichnungen der Verstoßarten aus der Stadt-Konfiguration auf', async () => {
		const send = vi.fn().mockResolvedValue(true);
		const form = formWith([vehicleWith('v1', 'K-AB1234', [])], []);
		const expectedLabel = CITIES.koeln.incidentTypes.find((type) => type.id === 'gehweg')?.label;

		const { results, saved } = run(form, send);
		await results;

		expect(saved[0].incidentTypeLabels).toEqual([expectedLabel]);
	});

	it('meldet den Versand als erfolgreich, auch wenn das Schreiben der Historie scheitert', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		const send = vi.fn().mockResolvedValue(true);
		const form = formWith(
			[vehicleWith('v1', 'K-AB1234', []), vehicleWith('v2', 'K-CD5678', [])],
			[]
		);

		const results = await submitVehicleReports({
			form,
			city: CITIES.koeln,
			mode: 'demo',
			send,
			saveHistoryEntry: vi.fn().mockRejectedValue(new Error('QuotaExceededError')),
			createId: () => 'entry',
			now: () => 1700000000000
		});

		expect(results.map((r) => r.ok)).toEqual([true, true]);
		expect(send).toHaveBeenCalledTimes(2);
		expect(consoleError).toHaveBeenCalledTimes(2);
	});

	it('schreibt die Historie direkt nach jedem Versand, vor dem nächsten Fahrzeug', async () => {
		const calls: string[] = [];
		const form = formWith(
			[vehicleWith('v1', 'K-AB1234', []), vehicleWith('v2', 'K-CD5678', [])],
			[]
		);

		await submitVehicleReports({
			form,
			city: CITIES.koeln,
			mode: 'demo',
			send: async (body) => {
				calls.push(`send:${body.get('vehicleIndex')}`);
				return true;
			},
			saveHistoryEntry: async (entry) => {
				calls.push(`history:${entry.licensePlate}`);
			},
			createId: () => 'entry',
			now: () => 1700000000000
		});

		expect(calls).toEqual(['send:1', 'history:K-AB1234', 'send:2', 'history:K-CD5678']);
	});

	it('liefert eine leere Ergebnisliste ohne Fahrzeug', async () => {
		const send = vi.fn();
		const { results, saved } = run(formWith([], []), send);

		expect(await results).toEqual([]);
		expect(send).not.toHaveBeenCalled();
		expect(saved).toEqual([]);
	});
});
