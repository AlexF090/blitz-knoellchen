<script lang="ts">
	/**
	 * Das gesamte Anzeige-Formular: „Deine Angaben“, Foto-Pool und beliebig viele Fahrzeug-Karten.
	 * Hält Entwurf (IndexedDB-Autosave), Validierung und Versand zusammen.
	 */
	import { resolve } from '$app/paths';
	import { appMode } from '#lib/appMode.svelte.ts';
	import { CITIES } from '#lib/config/cities.ts';
	import { appendCoordinatesNote } from '#lib/geocode/appendCoordinatesNote.ts';
	import { applyAddressSuggestion } from '#lib/geocode/applyAddressSuggestion.ts';
	import { fetchAddress } from '#lib/geocode/client.ts';
	import { triggerHaptic } from '#lib/haptics/vibrate.ts';
	import {
		addEntry,
		clearDraft,
		getDraft,
		saveDraft,
		type DraftFormData,
		type LoadedDraft
	} from '#lib/history/db.ts';
	import { createDraftAutosave, DRAFT_AUTOSAVE_DELAY_MS } from '#lib/history/draftAutosave.ts';
	import { transitionDuration } from '#lib/motion/reducedMotion.ts';
	import { decideAutoAssignment } from '#lib/photo/autoAssign.ts';
	import { createPhotoEntry } from '#lib/photo/createPhotoEntry.ts';
	import { processPhotoQueue, type PhotoQueueProgress } from '#lib/photo/processPhotoQueue.ts';
	import { createProfileStore } from '#lib/profile/profileStore.svelte.ts';
	import { PHOTO_WARNINGS, pruneWarnings } from '#lib/report/photoWarnings.ts';
	import { sendVehicleReport } from '#lib/report/sendClient.ts';
	import type { VehicleSendResult } from '#lib/report/sendResults.ts';
	import { submitVehicleReports } from '#lib/report/submitVehicleReports.ts';
	import {
		buttonDestructive,
		buttonDestructiveSecondary,
		buttonPrimary,
		buttonSecondary
	} from '#lib/ui/buttonStyles.ts';
	import { createEmptyForm, createEmptyVehicle } from '#lib/validation/emptyForm.ts';
	import { findFirstErrorTarget } from '#lib/validation/fieldOrder.ts';
	import {
		isFormValid,
		MAX_PHOTOS_PER_VEHICLE,
		validateProfileFields,
		validateReportForm,
		type FormErrors,
		type PhotoEntry,
		type ReportFormData,
		type VehicleEntry
	} from '#lib/validation/formSchema.ts';
	import { tick } from 'svelte';
	import { fly } from 'svelte/transition';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import DraftResumeBanner from './DraftResumeBanner.svelte';
	import PhotoPool from './PhotoPool.svelte';
	import ProfileCard from './ProfileCard.svelte';
	import VehicleBlock from './VehicleBlock.svelte';

	interface Props {
		demoRecipientEmail: string;
		liveRecipientEmail: string;
		senderEmail: string;
	}

	let { demoRecipientEmail, liveRecipientEmail, senderEmail }: Props = $props();

	const recipientEmail = $derived(
		appMode.current === 'live' ? liveRecipientEmail : demoRecipientEmail
	);

	const city = CITIES.koeln;
	const profileStore = createProfileStore();

	let form = $state<ReportFormData>(createEmptyForm());
	let errors = $state<FormErrors>({});
	let photosCardElement = $state<HTMLDivElement | undefined>(undefined);
	let photoProgress = $state<PhotoQueueProgress | null>(null);
	const photoProcessing = $derived(photoProgress !== null);
	let photoProcessingError = $state<string | null>(null);
	/** Bricht die laufende Foto-Verarbeitung ab, sobald das Formular zurückgesetzt wird. */
	let photoQueueAbort: AbortController | undefined;
	/**
	 * Gilt für den aktuellen Formularstand: Zurücksetzen und Verlassen der Seite brechen ihn ab,
	 * damit eine noch laufende Adresssuche nichts mehr in das Formular schreibt.
	 */
	let formSessionAbort = new AbortController();
	/** Fahrzeug-ids mit laufender Adresssuche; verhindert parallele Suchen für dieselbe Karte. */
	// Bewusst nicht reaktiv: Nur die Suche selbst liest den Wert, keine Anzeige hängt daran.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const vehiclesResolvingAddress = new Set<string>();
	let vehicleGeocodeWarnings = $state<Record<string, string>>({});
	/** Fahrzeug-id -> `true`, wenn die Karte zugeklappt ist; fehlende Einträge gelten als offen. */
	let collapsedVehicles = $state<Record<string, boolean>>({});
	let sendError = $state<string | null>(null);
	let sendResults = $state<VehicleSendResult[]>([]);
	let submitting = $state(false);
	let isEditingProfile = $state(true);
	let formReady = $state(false);
	/**
	 * `pending`: Ein gespeicherter Entwurf wartet auf die Entscheidung des Nutzers und bleibt bis
	 * dahin unangetastet; `active`: Formular in Benutzung, Autosave aktiv.
	 */
	let draftStatus = $state<'loading' | 'pending' | 'active'>('loading');
	let pendingDraft = $state.raw<LoadedDraft | undefined>(undefined);
	let discardDialog = $state<HTMLDialogElement | undefined>(undefined);
	let resetDialog = $state<HTMLDialogElement | undefined>(undefined);
	let successDialog = $state<HTMLDialogElement | undefined>(undefined);
	let successCount = $state(0);

	/** Kurzer Grund, warum „Absenden“ und „Zurücksetzen“ gerade gesperrt sind; sonst `null`. */
	const actionsDisabledReason = $derived.by(() => {
		if (draftStatus === 'pending') {
			return 'Bitte zuerst entscheiden, ob du den Entwurf fortsetzen oder verwerfen möchtest.';
		}
		if (photoProcessing) return 'Fotos werden noch verarbeitet …';
		return null;
	});

	// Profil und Entwurf laden gemeinsam, bevor irgendetwas vom Formular gerendert wird (s.
	// formReady-Gate im Markup) — sonst blitzt „Deine Angaben“ erst leer im Bearbeiten-Modus auf
	// und schaltet dann auf den Lese-Modus um.
	$effect(() => {
		(async () => {
			try {
				const [, draft] = await Promise.all([profileStore.load(), getDraft()]);
				const profile = profileStore.value;
				if (!form.firstName) form.firstName = profile.firstName;
				if (!form.lastName) form.lastName = profile.lastName;
				if (!form.addressStreet) form.addressStreet = profile.addressStreet;
				if (!form.addressPostcode) form.addressPostcode = profile.addressPostcode;
				if (!form.addressCity) form.addressCity = profile.addressCity;
				if (!form.email) form.email = profile.email;
				if (!form.phone) form.phone = profile.phone;

				const profileErrors = validateProfileFields(form);
				if (Object.keys(profileErrors).length === 0) isEditingProfile = false;

				pendingDraft = draft;
			} catch (error) {
				// Ein defekter/inkompatibler Alt-Entwurf darf das Formular nie dauerhaft im
				// Lade-Skeleton hängen lassen — im Fehlerfall startet die App leer statt gar nicht.
				console.error('Fehler beim Laden von Profil/Entwurf:', error);
			} finally {
				draftStatus = pendingDraft ? 'pending' : 'active';
				formReady = true;
			}
		})();
	});

	/**
	 * Setzt den Fokus nach der Entscheidung über den Entwurf auf die Überschrift der Fotos: Der
	 * Hinweis samt fokussiertem Button ist dann entfernt, der Fokus fiele sonst auf `body`.
	 */
	const focusPhotoHeading = async () => {
		await tick();
		document.getElementById('photo-pool-heading')?.focus({ preventScroll: true });
	};

	/** Übernimmt den wartenden Entwurf ins Formular und stellt die Ansicht wieder her. */
	const resumeDraft = async (draft: LoadedDraft) => {
		form.vehicles = draft.vehicles;
		form.photos = draft.photos;
		collapsedVehicles = Object.fromEntries(
			draft.ui.collapsedVehicleIds.map((vehicleId) => [vehicleId, true])
		);
		vehicleGeocodeWarnings = draft.ui.geocodeWarnings;
		pendingDraft = undefined;
		draftStatus = 'active';
		// Erst nach dem Rendern der Karten ist die Seite wieder so hoch wie beim Speichern.
		await focusPhotoHeading();
		if (draft.ui.scrollY > 0) window.scrollTo({ top: draft.ui.scrollY, behavior: 'instant' });
	};

	/** Öffnet die Rückfrage vor dem Verwerfen des Entwurfs, weil dabei die Fotos gelöscht werden. */
	const openDiscardDialog = () => discardDialog?.showModal();

	/** Löscht den wartenden Entwurf und startet mit leerem Formular. */
	const confirmDiscard = async () => {
		discardDialog?.close();
		triggerHaptic('warning');
		try {
			await clearDraft();
		} catch (error) {
			console.error('Fehler beim Löschen des Entwurfs:', error);
		}
		pendingDraft = undefined;
		draftStatus = 'active';
		await focusPhotoHeading();
	};

	/**
	 * Baut den zu speichernden Entwurf aus dem aktuellen Formularstand; `null`, wenn das Formular
	 * leer ist und der Entwurf damit entfällt.
	 */
	const buildDraftSnapshot = (): DraftFormData | null => {
		if (form.vehicles.length === 0 && form.photos.length === 0) return null;
		// $state-Proxys sind nicht structured-clone-fähig (IndexedDB wirft sonst "could not be
		// cloned") — daher als reine Snapshots speichern.
		return {
			vehicles: $state.snapshot(form.vehicles),
			photos: $state.snapshot(form.photos),
			ui: {
				collapsedVehicleIds: form.vehicles
					.map((vehicle) => vehicle.id)
					.filter((vehicleId) => collapsedVehicles[vehicleId]),
				// Beim Speichern gelesen statt per Scroll-Listener mitgeführt: Der Wert ist nur beim
				// Schreiben nötig.
				scrollY: window.scrollY,
				geocodeWarnings: $state.snapshot(vehicleGeocodeWarnings)
			}
		};
	};

	const autosave = createDraftAutosave({
		delayMs: DRAFT_AUTOSAVE_DELAY_MS,
		write: async (snapshot) => {
			if (snapshot) await saveDraft(snapshot);
			else await clearDraft();
		}
	});

	// Solange der Entwurf nicht geladen ist oder auf die Entscheidung des Nutzers wartet, darf nichts
	// geschrieben oder gelöscht werden, sonst überschriebe der leere Ausgangszustand ihn.
	$effect(() => autosave.setEnabled(formReady && draftStatus === 'active'));

	// Debounced Autosave des Entwurfs in die IndexedDB — überlebt ein Schließen von Tab/PWA
	// mitten im Ausfüllen.
	$effect(() => {
		if (!formReady || draftStatus !== 'active') return;
		// Erzwingt das Tracking aller verschachtelten Felder; der Snapshot selbst entsteht erst
		// beim Schreiben und enthält damit den jüngsten Stand.
		JSON.stringify(form.vehicles);
		JSON.stringify(collapsedVehicles);
		JSON.stringify(vehicleGeocodeWarnings);
		void form.photos.length;

		autosave.schedule(buildDraftSnapshot);
	});

	/** Hat der Nutzer „Deine Angaben“ geändert, ohne dass sie schon im Profil gespeichert sind? */
	const hasUnsavedProfileChanges = () => {
		const stored = profileStore.value;
		return (
			form.firstName !== stored.firstName ||
			form.lastName !== stored.lastName ||
			form.addressStreet !== stored.addressStreet ||
			form.addressPostcode !== stored.addressPostcode ||
			form.addressCity !== stored.addressCity ||
			form.email !== stored.email ||
			form.phone !== stored.phone
		);
	};

	/** Sichert Entwurf und angefangene Profileingaben, bevor die Seite in den Hintergrund geht. */
	const persistBeforeLeaving = () => {
		void autosave.flush();
		// Profilfelder speichern sonst erst beim Verlassen eines Feldes; ein Tab-Wechsel mitten in
		// der Eingabe löst kein Blur aus.
		if (isEditingProfile && hasUnsavedProfileChanges()) {
			saveProfileFields().catch((error) =>
				console.error('Fehler beim Speichern des Profils:', error)
			);
		}
	};

	$effect(() => {
		if (!formReady) return;
		const onVisibilityChange = () => {
			if (document.visibilityState === 'hidden') persistBeforeLeaving();
		};
		window.addEventListener('pagehide', persistBeforeLeaving);
		document.addEventListener('visibilitychange', onVisibilityChange);
		return () => {
			window.removeEventListener('pagehide', persistBeforeLeaving);
			document.removeEventListener('visibilitychange', onVisibilityChange);
		};
	});

	// Beim Verlassen der Seite (z.B. Wechsel zur Historie) bleibt die letzte Eingabe erhalten.
	$effect(() => () => void autosave.flush());

	// Beim Verlassen der Seite endet auch die Foto-Verarbeitung, damit keine Einträge in ein
	// nicht mehr vorhandenes Formular fallen.
	$effect(() => () => {
		photoQueueAbort?.abort();
		formSessionAbort.abort();
	});

	/** Übernimmt die aktuellen „Deine Angaben“-Felder in das dauerhaft gespeicherte Profil. */
	const saveProfileFields = async () => {
		await profileStore.save({
			firstName: form.firstName,
			lastName: form.lastName,
			addressStreet: form.addressStreet,
			addressPostcode: form.addressPostcode,
			addressCity: form.addressCity,
			email: form.email,
			phone: form.phone
		});
	};

	let usageCounts = $derived.by(() => {
		const counts: Record<string, number> = {};
		for (const vehicle of form.vehicles) {
			for (const photoId of vehicle.photoIds) counts[photoId] = (counts[photoId] ?? 0) + 1;
		}
		return counts;
	});

	/** Löst das GPS eines Fotos per Reverse-Geocoding in eine Adresse auf. */
	const resolvePhotoAddress = async (photo: PhotoEntry) => {
		// Ergebnis liegt am Pool-Eintrag, damit eine Mehrfachzuordnung zu Fahrzeugen keinen
		// erneuten Netzwerkaufruf auslöst.
		if (photo.resolvedAddress !== undefined) return photo.resolvedAddress;
		if (!photo.gps) return null;
		const address = await fetchAddress(photo.gps.lat, photo.gps.lon);
		photo.resolvedAddress = address;
		return address;
	};

	/**
	 * Befüllt Datum/Uhrzeit/Tatort eines Fahrzeugs aus dem EXIF eines ihm zugeordneten Fotos —
	 * überschreibt nie bereits vorhandene (auch manuell eingegebene) Werte.
	 */
	const applyPhotoExifToVehicle = async (vehicle: VehicleEntry, photoId: string) => {
		const photo = form.photos.find((p) => p.id === photoId);
		if (!photo) return;

		if (photo.date) vehicle.date ||= photo.date;
		if (photo.time) vehicle.time ||= photo.time;

		if (vehicle.locationStreet.trim() && vehicle.locationCity.trim()) return;
		if (vehiclesResolvingAddress.has(vehicle.id)) return;
		if (!photo.gps) {
			vehicleGeocodeWarnings = {
				...vehicleGeocodeWarnings,
				[vehicle.id]: PHOTO_WARNINGS.noGps
			};
			return;
		}

		// Beim Start gelesen: Ein Zurücksetzen während der Suche ersetzt den Controller.
		const signal = formSessionAbort.signal;
		vehiclesResolvingAddress.add(vehicle.id);
		let address: Awaited<ReturnType<typeof resolvePhotoAddress>>;
		try {
			address = await resolvePhotoAddress(photo);
		} finally {
			vehiclesResolvingAddress.delete(vehicle.id);
		}
		if (signal.aborted) return;
		applyAddressSuggestion(vehicle, address ?? {}, false);

		if (!address?.street || !address?.city) {
			vehicleGeocodeWarnings = {
				...vehicleGeocodeWarnings,
				[vehicle.id]: PHOTO_WARNINGS.incompleteAddress
			};
			vehicle.notes = appendCoordinatesNote(vehicle.notes, photo.gps);
		}
	};

	/** Startet die EXIF-Übernahme, ohne auf die Adresssuche zu warten. */
	// Die Adresssuche geht übers Netzwerk; abgewartet hielte sie die Foto-Warteschlange und deren
	// Fortschrittsanzeige an, bis die Antwort da ist.
	const startPhotoExifApplication = (vehicle: VehicleEntry, photoId: string) => {
		applyPhotoExifToVehicle(vehicle, photoId).catch((error: unknown) =>
			console.error('Fehler beim Übernehmen der Fotodaten:', error)
		);
	};

	/** Nimmt einen verarbeiteten Eintrag in den Pool auf und ordnet ihn — soweit eindeutig — zu. */
	const addPhotoEntry = (entry: PhotoEntry) => {
		form.photos = [...form.photos, entry];
		errors = { ...errors, photos: undefined };

		const assignment = decideAutoAssignment({
			vehicleCount: form.vehicles.length,
			firstVehiclePhotoCount: form.vehicles[0]?.photoIds.length ?? 0,
			maxPhotosPerVehicle: MAX_PHOTOS_PER_VEHICLE
		});

		if (assignment === 'create-vehicle') {
			// Erstes Foto: legt die erste Fahrzeug-Karte an, die bis dahin nicht existiert.
			const vehicle = createEmptyVehicle();
			vehicle.photoIds = [entry.id];
			form.vehicles = [vehicle];
			// Nach der Zuweisung ist form.vehicles[0] die reaktive Proxy-Version — die lokale
			// `vehicle`-Referenz bleibt roh, Mutationen darauf würden vom UI nicht bemerkt.
			startPhotoExifApplication(form.vehicles[0], entry.id);
		} else if (assignment === 'append-first') {
			form.vehicles[0].photoIds = [...form.vehicles[0].photoIds, entry.id];
			startPhotoExifApplication(form.vehicles[0], entry.id);
		}
	};

	/**
	 * Verarbeitet alle ausgewählten Dateien nacheinander, legt sie im Pool ab und meldet
	 * gescheiterte Dateien gesammelt.
	 */
	const onAddFiles = async (files: File[]) => {
		photoProcessingError = null;
		const abort = new AbortController();
		photoQueueAbort = abort;
		try {
			const { failed } = await processPhotoQueue(files, {
				process: createPhotoEntry,
				onEntry: addPhotoEntry,
				onProgress: (progress) => (photoProgress = progress),
				signal: abort.signal
			});
			// Nach einem Abbruch gehören die Fehlschläge zu einem verworfenen Formularstand.
			if (abort.signal.aborted) return;
			if (failed.length > 0) {
				// Bei genau einer Datei ist deren konkrete Meldung (z.B. HEIC-Hinweis) hilfreicher.
				photoProcessingError =
					files.length === 1
						? failed[0].message
						: `${failed.length} von ${files.length} Fotos konnten nicht verarbeitet werden: ${failed
								.map((failure) => failure.fileName)
								.join(', ')}`;
			}
		} finally {
			photoProgress = null;
		}
	};

	/** Entfernt ein Foto aus dem Pool und aus der Auswahl aller Fahrzeuge. */
	const onRemovePhoto = (photoId: string) => {
		form.photos = form.photos.filter((photo) => photo.id !== photoId);
		for (const vehicle of form.vehicles) {
			vehicle.photoIds = vehicle.photoIds.filter((id) => id !== photoId);
		}
	};

	/** Hängt eine leere Fahrzeug-Karte an und scrollt sie in den sichtbaren Bereich. */
	const addVehicle = async () => {
		const entry = createEmptyVehicle();
		form.vehicles = [...form.vehicles, entry];
		await tick();
		document
			.getElementById(`vehicle-block-${entry.id}`)
			?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	};

	/** Verwirft die Zuklapp-Zustände von Karten, die es nicht mehr gibt. */
	const pruneCollapsedVehicles = () => {
		const vehicleIds = new Set(form.vehicles.map((vehicle) => vehicle.id));
		collapsedVehicles = Object.fromEntries(
			Object.entries(collapsedVehicles).filter(([vehicleId]) => vehicleIds.has(vehicleId))
		);
	};

	/** Entfernt eine Fahrzeug-Karte; die letzte verbleibende bleibt bestehen. */
	const removeVehicle = (id: string) => {
		if (form.vehicles.length <= 1) return;
		const removedIndex = form.vehicles.findIndex((vehicle) => vehicle.id === id);
		form.vehicles = form.vehicles.filter((vehicle) => vehicle.id !== id);
		vehicleGeocodeWarnings = pruneWarnings(vehicleGeocodeWarnings, form.vehicles);
		pruneCollapsedVehicles();
		// errors.vehicles hängt an der Fahrzeug-POSITION, nicht an der id (s. VehicleBlock
		// errors={errors.vehicles?.[index]}) — ohne Neuindizierung verschieben sich die Fehler
		// auf die verbleibenden Fahrzeuge.
		if (removedIndex !== -1 && errors.vehicles) {
			errors = {
				...errors,
				vehicles: errors.vehicles.filter((_, index) => index !== removedIndex)
			};
		}
	};

	/** Leert eine Fahrzeug-Karte, ohne sie zu entfernen. */
	const resetVehicle = (id: string) => {
		const resetIndex = form.vehicles.findIndex((vehicle) => vehicle.id === id);
		form.vehicles = form.vehicles.map((vehicle) =>
			vehicle.id === id ? createEmptyVehicle() : vehicle
		);
		vehicleGeocodeWarnings = pruneWarnings(vehicleGeocodeWarnings, form.vehicles);
		pruneCollapsedVehicles();
		// Das Fahrzeug an dieser Position ist frisch und noch nicht neu validiert — der alte
		// Fehler-Eintrag an derselben Position würde sonst fälschlich weiter angezeigt.
		if (resetIndex !== -1 && errors.vehicles) {
			const nextVehicleErrors = [...errors.vehicles];
			nextVehicleErrors[resetIndex] = {};
			errors = { ...errors, vehicles: nextVehicleErrors };
		}
	};

	/**
	 * Setzt das komplette Formular inkl. „Deine Angaben“ zurück, lässt das gespeicherte Profil
	 * aber unangetastet (bleibt für die nächste Anzeige als Autofill erhalten).
	 */
	const resetAll = async () => {
		photoQueueAbort?.abort();
		formSessionAbort.abort();
		formSessionAbort = new AbortController();
		vehiclesResolvingAddress.clear();
		form = createEmptyForm();
		errors = {};
		vehicleGeocodeWarnings = {};
		collapsedVehicles = {};
		sendError = null;
		sendResults = [];
		photoProcessingError = null;
		photoProgress = null;
		submitting = false;
		isEditingProfile = true;
		try {
			// Ein ausstehender Autosave würde den gelöschten Entwurf sonst wieder anlegen.
			autosave.cancel();
			await autosave.whenIdle();
			await clearDraft();
		} catch (error) {
			console.error('Fehler beim Löschen des Entwurfs:', error);
		}
	};

	/** Öffnet die Rückfrage vor dem Zurücksetzen des gesamten Formulars. */
	const openResetDialog = () => resetDialog?.showModal();

	/** Führt das bestätigte Zurücksetzen aus. */
	const confirmReset = async () => {
		resetDialog?.close();
		triggerHaptic('warning');
		await resetAll();
	};

	/** Schließt die Erfolgsmeldung nach einem Versand. */
	const closeSuccessDialog = () => successDialog?.close();

	/**
	 * Fokussiert nach einem gescheiterten Absenden das erste fehlerhafte Feld — Bildschirmleser
	 * erfahren so direkt, welches Feld zu korrigieren ist, statt nur einen visuellen Scroll zu
	 * bekommen. Bei mehreren Fehlern gewinnt das visuell oberste Feld.
	 */
	const focusFirstError = async (formErrors: FormErrors) => {
		await tick();
		const target = findFirstErrorTarget(
			formErrors,
			form.vehicles.map((vehicle) => vehicle.id)
		);
		if (!target) return;
		if (target.type === 'photos') {
			photosCardElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		} else if (target.type === 'profileField') {
			document.getElementById(target.elementId)?.focus();
		} else {
			const field = document.getElementById(target.fieldElementId);
			if (field) {
				field.focus();
			} else {
				document
					.getElementById(target.blockElementId)
					?.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		}
	};

	/**
	 * Validiert und versendet eine eigene Anzeige pro Fahrzeug. Erfolgreiche Fahrzeuge fallen aus
	 * dem Formular, fehlgeschlagene bleiben für einen erneuten Versuch stehen.
	 */
	const onSubmit = async (event: SubmitEvent) => {
		event.preventDefault();
		errors = validateReportForm(form);
		if (!isFormValid(errors)) {
			await focusFirstError(errors);
			return;
		}

		submitting = true;
		sendError = null;
		sendResults = [];

		try {
			await saveProfileFields();

			const results = await submitVehicleReports({
				form,
				city,
				mode: appMode.current,
				send: sendVehicleReport,
				saveHistoryEntry: addEntry,
				createId: () => crypto.randomUUID(),
				now: Date.now
			});

			sendResults = results;

			const failedCount = results.filter((r) => !r.ok).length;
			if (failedCount === results.length) {
				sendError =
					'Der Versand ist fehlgeschlagen. Deine Angaben bleiben erhalten — bitte erneut versuchen.';
				return;
			}

			triggerHaptic('success');
			if (failedCount === 0) {
				successCount = results.length;
				successDialog?.showModal();
			}
			const succeededIds = new Set(results.filter((r) => r.ok).map((r) => r.vehicleId));
			form.vehicles = form.vehicles.filter((vehicle) => !succeededIds.has(vehicle.id));

			if (form.vehicles.length === 0) {
				form = {
					...form,
					photos: [],
					vehicles: []
				};
			}
			pruneCollapsedVehicles();
			vehicleGeocodeWarnings = pruneWarnings(vehicleGeocodeWarnings, form.vehicles);
			// Ersetzt einen ausstehenden Autosave und schreibt sofort: Ein leeres Formular löscht
			// den Entwurf, sonst bleibt der Rest für den erneuten Versuch gespeichert.
			autosave.schedule(buildDraftSnapshot);
			await autosave.flush();
		} finally {
			submitting = false;
		}
	};
</script>

<form onsubmit={onSubmit} class="flex flex-col gap-4">
	{#if sendError}
		<p
			role="alert"
			transition:fly={{ y: -8, duration: transitionDuration(200) }}
			class="rounded-card bg-error-bg p-3 text-error-fg"
		>
			{sendError}
		</p>
	{:else if sendResults.length > 0 && !sendResults.every((r) => r.ok)}
		<p
			role="alert"
			transition:fly={{ y: -8, duration: transitionDuration(200) }}
			class="rounded-card bg-warning-bg p-3 text-warning-fg"
		>
			{sendResults.filter((r) => r.ok).length} von {sendResults.length} Anzeigen erfolgreich versendet.
			Fehlgeschlagen: {sendResults
				.filter((r) => !r.ok)
				.map((r) => r.licensePlate)
				.join(', ')}. Bitte erneut auf „Absenden" klicken, um es für die verbleibenden Fahrzeuge
			erneut zu versuchen.
		</p>
	{/if}

	{#if !formReady}
		<div class="rounded-card bg-surface p-4 shadow-card sm:p-6">
			<p role="status" class="sr-only">Formular wird geladen…</p>
			<div aria-hidden="true">
				<div class="h-4 w-32 animate-pulse rounded bg-border motion-reduce:animate-none"></div>
				<div
					class="mt-4 h-4 w-full animate-pulse rounded bg-border motion-reduce:animate-none"
				></div>
				<div
					class="mt-2 h-4 w-2/3 animate-pulse rounded bg-border motion-reduce:animate-none"
				></div>
			</div>
		</div>
	{:else}
		<ProfileCard
			bind:form
			bind:errors
			bind:isEditing={isEditingProfile}
			onPersist={saveProfileFields}
		/>
	{/if}

	{#if pendingDraft}
		{@const draft = pendingDraft}
		<DraftResumeBanner
			savedAt={draft.savedAt}
			vehicleCount={draft.vehicles.length}
			photoCount={draft.photos.length}
			onResume={() => resumeDraft(draft)}
			onDiscard={openDiscardDialog}
		/>
	{:else if formReady}
		<div bind:this={photosCardElement}>
			<PhotoPool
				photos={form.photos}
				{usageCounts}
				error={errors.photos}
				processingError={photoProcessingError}
				progress={photoProgress}
				maxPhotosPerVehicle={MAX_PHOTOS_PER_VEHICLE}
				{onAddFiles}
				onRemove={onRemovePhoto}
			/>
		</div>

		<div class="flex flex-col gap-4">
			<div
				class={`grid grid-cols-1 gap-4 ${form.vehicles.length > 1 ? 'md:grid-cols-2' : ''} lg:grid-cols-1`}
			>
				{#each form.vehicles as vehicle, index (vehicle.id)}
					<div id="vehicle-block-{vehicle.id}">
						<VehicleBlock
							bind:vehicle={form.vehicles[index]}
							{index}
							total={form.vehicles.length}
							errors={errors.vehicles?.[index]}
							pool={form.photos}
							incidentTypes={city.incidentTypes}
							maxPhotos={MAX_PHOTOS_PER_VEHICLE}
							geocodeWarning={vehicleGeocodeWarnings[vehicle.id]}
							profile={{
								firstName: form.firstName,
								lastName: form.lastName,
								addressStreet: form.addressStreet,
								addressPostcode: form.addressPostcode,
								addressCity: form.addressCity,
								email: form.email,
								phone: form.phone
							}}
							{city}
							{recipientEmail}
							bind:open={
								() => !collapsedVehicles[vehicle.id],
								(isOpen) => (collapsedVehicles[vehicle.id] = !isOpen)
							}
							onRemove={() => removeVehicle(vehicle.id)}
							onReset={() => resetVehicle(vehicle.id)}
							onPhotoToggled={(photoId, selected) => {
								if (selected) startPhotoExifApplication(vehicle, photoId);
							}}
						/>
					</div>
				{/each}
			</div>

			<button type="button" onclick={addVehicle} class={buttonSecondary}>
				+ Weiteres Fahrzeug hinzufügen
			</button>
		</div>
	{/if}

	<div class="mt-4 border-t border-border pt-4">
		{#if actionsDisabledReason}
			<p
				id="form-actions-disabled-reason"
				class="mx-auto mb-3 max-w-md text-lg text-ink-muted lg:max-w-5xl"
			>
				{actionsDisabledReason}
			</p>
		{/if}
		<div class="mx-auto flex max-w-md items-center gap-6 lg:max-w-5xl">
			<button
				type="button"
				onclick={openResetDialog}
				disabled={!formReady || draftStatus === 'pending' || photoProcessing}
				aria-describedby={actionsDisabledReason ? 'form-actions-disabled-reason' : undefined}
				class="flex-1 {buttonDestructiveSecondary} disabled:cursor-not-allowed disabled:opacity-50"
			>
				Zurücksetzen
			</button>
			<button
				type="submit"
				disabled={!formReady || draftStatus === 'pending' || submitting || photoProcessing}
				aria-describedby={actionsDisabledReason ? 'form-actions-disabled-reason' : undefined}
				class="flex-1 {buttonPrimary}"
			>
				{submitting ? 'Wird gesendet…' : 'Absenden'}
			</button>
		</div>
	</div>
</form>

<ConfirmDialog
	bind:dialog={resetDialog}
	titleId="reset-form-dialog-title"
	title="Formular komplett zurücksetzen?"
>
	<p class="mt-1 text-lg text-ink-muted">
		„Deine Angaben“, alle Fotos und Fahrzeuge/Vorgänge werden unwiderruflich gelöscht. Dein
		gespeichertes Profil bleibt für die nächste Anzeige erhalten.
	</p>
	{#snippet actions()}
		<button type="button" onclick={() => resetDialog?.close()} class="flex-1 {buttonSecondary}">
			Abbrechen
		</button>
		<button type="button" onclick={confirmReset} class="flex-1 {buttonDestructive}">
			Zurücksetzen
		</button>
	{/snippet}
</ConfirmDialog>

<ConfirmDialog
	bind:dialog={discardDialog}
	titleId="discard-draft-dialog-title"
	title="Entwurf verwerfen?"
>
	<p class="mt-1 text-lg text-ink-muted">
		Alle Fotos und Fahrzeuge/Vorgänge dieses Entwurfs werden unwiderruflich gelöscht.
	</p>
	{#snippet actions()}
		<button type="button" onclick={() => discardDialog?.close()} class="flex-1 {buttonSecondary}">
			Abbrechen
		</button>
		<button type="button" onclick={confirmDiscard} class="flex-1 {buttonDestructive}">
			Verwerfen
		</button>
	{/snippet}
</ConfirmDialog>

<ConfirmDialog
	bind:dialog={successDialog}
	titleId="success-dialog-title"
	title={successCount > 1
		? `Alle ${successCount} Anzeigen erfolgreich versendet`
		: 'Anzeige erfolgreich versendet'}
	desktopMaxWidthClass="sm:max-w-lg"
>
	<p class="mt-1 text-lg text-ink-muted">
		Du erhältst eine Kopie per E-Mail von <strong class="font-semibold text-ink">
			{senderEmail}
		</strong>. Falls sie nicht im Posteingang ankommt, prüfe bei Bedarf auch deinen Spam-Ordner. Die
		Anzeige liegt außerdem in deiner Historie.
	</p>
	{#snippet actions()}
		<button type="button" onclick={closeSuccessDialog} class="flex-1 {buttonSecondary}">
			Schließen
		</button>
		<a href={resolve('/historie')} class="flex-1 text-center {buttonPrimary}">Zur Historie</a>
	{/snippet}
</ConfirmDialog>
