<script lang="ts">
	import { resolve } from '$app/paths';
	import { appMode } from '$lib/appMode.svelte';
	import { CITIES } from '$lib/config/cities';
	import { parseExif } from '$lib/exif/parseExif';
	import { applyAddressSuggestion } from '$lib/geocode/applyAddressSuggestion';
	import { fetchAddress } from '$lib/geocode/client';
	import { formatAddress } from '$lib/geocode/formatAddress';
	import { triggerHaptic } from '$lib/haptics/vibrate';
	import { addEntry, clearDraft, getDraft, saveDraft } from '$lib/history/db';
	import { compressImage } from '$lib/image/compress';
	import { convertHeicToJpeg, isHeicFile } from '$lib/image/convertHeic';
	import { embedExifMetadata } from '$lib/image/embedExif';
	import { transitionDuration } from '$lib/motion/reducedMotion';
	import { createProfileStore } from '$lib/profile/profileStore.svelte';
	import {
		buttonDestructive,
		buttonDestructiveSecondary,
		buttonPrimary,
		buttonSecondary
	} from '$lib/ui/buttonStyles';
	import { onEnterKey } from '$lib/ui/onEnterKey';
	import { createEmptyForm, createEmptyVehicle } from '$lib/validation/emptyForm';
	import {
		getMaxPoolPhotos,
		isFormValid,
		MAX_PHOTOS_PER_VEHICLE,
		normalizeLicensePlate,
		validateProfileFields,
		validateReportForm,
		type PhotoEntry,
		type ReportFormData,
		type VehicleEntry,
		type VehicleErrors
	} from '$lib/validation/formSchema';
	import { tick } from 'svelte';
	import { fly } from 'svelte/transition';
	import AddressAutocomplete from './AddressAutocomplete.svelte';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import FormField from './FormField.svelte';
	import PhotoPool from './PhotoPool.svelte';
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
	let errors = $state<ReturnType<typeof validateReportForm>>({});
	let photosCardElement = $state<HTMLDivElement | undefined>(undefined);
	let photoProcessing = $state(false);
	let photoProcessingError = $state<string | null>(null);
	let vehicleGeocodeWarnings = $state<Record<string, string>>({});
	let sendError = $state<string | null>(null);
	let sendResults = $state<{ licensePlate: string; ok: boolean }[]>([]);
	let submitting = $state(false);
	let isEditingProfile = $state(true);
	let formReady = $state(false);
	let resetDialog = $state<HTMLDialogElement | undefined>(undefined);
	let successDialog = $state<HTMLDialogElement | undefined>(undefined);
	let successCount = $state(0);

	// Profil und Entwurf werden gemeinsam geladen, bevor überhaupt etwas vom Formular gerendert
	// wird (s. formReady-Gate im Markup) — verhindert, dass "Deine Angaben" erst leer im
	// Bearbeiten-Modus aufblitzt und dann auf den Lese-Modus umschaltet.
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

				if (draft) {
					form.vehicles = draft.vehicles;
					form.photos = draft.photos;
				}
			} catch (error) {
				// Ein defekter/inkompatibler Alt-Entwurf darf das Formular nie dauerhaft im
				// Lade-Skeleton hängen lassen — im Fehlerfall startet die App leer statt gar nicht.
				console.error('Fehler beim Laden von Profil/Entwurf:', error);
			} finally {
				formReady = true;
			}
		})();
	});

	// Debounced Autosave des Entwurfs (Fahrzeuge + Fotos) in die IndexedDB, solange noch nicht
	// abgesendet wurde — überlebt so ein Schließen von Tab/PWA mitten im Ausfüllen.
	$effect(() => {
		if (!formReady) return;
		JSON.stringify(form.vehicles); // erzwingt Tracking aller verschachtelten Fahrzeug-Felder
		void form.photos.length;

		const timer = setTimeout(() => {
			if (form.vehicles.length === 0 && form.photos.length === 0) {
				clearDraft();
			} else {
				// $state-Proxys sind nicht structured-clone-fähig (IndexedDB wirft sonst
				// "could not be cloned") — daher als reine Snapshots speichern.
				saveDraft($state.snapshot(form.vehicles), $state.snapshot(form.photos));
			}
		}, 800);
		return () => clearTimeout(timer);
	});

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

	const onSaveProfile = async () => {
		const profileErrors = validateProfileFields(form);
		errors = { ...errors, ...profileErrors };
		if (Object.keys(profileErrors).length > 0) return;

		await saveProfileFields();
		isEditingProfile = false;
	};

	const onEditProfile = () => {
		isEditingProfile = true;
	};

	// Die Profil-Felder liegen im selben <form> wie der eigentliche Absenden-Button (s. u.) —
	// ohne diesen Handler würde Enter in einem Profil-Feld das gesamte Formular abschicken statt
	// nur das Profil zu speichern.
	const onProfileFieldKeydown = onEnterKey(() => void onSaveProfile());

	let usageCounts = $derived.by(() => {
		const counts: Record<string, number> = {};
		for (const vehicle of form.vehicles) {
			for (const photoId of vehicle.photoIds) counts[photoId] = (counts[photoId] ?? 0) + 1;
		}
		return counts;
	});

	// Cache: löst das GPS eines Fotos per Reverse-Geocoding auf und merkt sich das Ergebnis
	// auf dem Pool-Eintrag, damit eine Mehrfachzuordnung zu Fahrzeugen keinen erneuten
	// Netzwerkaufruf auslöst.
	const resolvePhotoAddress = async (photo: PhotoEntry) => {
		if (photo.resolvedAddress !== undefined) return photo.resolvedAddress;
		if (!photo.gps) return null;
		const address = await fetchAddress(photo.gps.lat, photo.gps.lon);
		photo.resolvedAddress = address;
		return address;
	};

	// Befüllt Datum/Uhrzeit/Tatort eines Fahrzeugs aus dem EXIF eines ihm zugeordneten
	// Fotos — überschreibt nie bereits vorhandene (auch manuell eingegebene) Werte.
	const applyPhotoExifToVehicle = async (vehicle: VehicleEntry, photoId: string) => {
		const photo = form.photos.find((p) => p.id === photoId);
		if (!photo) return;

		if (photo.date) vehicle.date ||= photo.date;
		if (photo.time) vehicle.time ||= photo.time;

		if (vehicle.locationStreet.trim() && vehicle.locationCity.trim()) return;
		if (!photo.gps) {
			vehicleGeocodeWarnings = {
				...vehicleGeocodeWarnings,
				[vehicle.id]: 'Keine Standortdaten im Foto gefunden — bitte Adresse manuell eingeben.'
			};
			return;
		}

		const address = await resolvePhotoAddress(photo);
		applyAddressSuggestion(vehicle, address ?? {}, false);

		if (!address?.street || !address?.city) {
			vehicleGeocodeWarnings = {
				...vehicleGeocodeWarnings,
				[vehicle.id]:
					'Adresse konnte nicht vollständig automatisch ermittelt werden — bitte prüfen/ergänzen.'
			};
			const coordsNote = `GPS-Koordinaten des Fotos: ${photo.gps.lat}, ${photo.gps.lon}`;
			vehicle.notes = vehicle.notes ? `${vehicle.notes}\n${coordsNote}` : coordsNote;
		}
	};

	const onAddPhoto = async (file: File) => {
		photoProcessingError = null;
		const exif = await parseExif(file);

		photoProcessing = true;
		let entry: PhotoEntry;
		try {
			let rawBlob: Blob = file;
			if (isHeicFile(file)) {
				try {
					rawBlob = await convertHeicToJpeg(file);
				} catch {
					photoProcessingError =
						'Dieses HEIC-Foto konnte nicht verarbeitet werden. Bitte ein JPEG/PNG-Foto wählen oder in den Kameraeinstellungen "Am kompatibelsten" aktivieren.';
					return;
				}
			}

			const compressed = await compressImage(rawBlob, { maxDimension: 1600, quality: 0.8 });
			const withExif = await embedExifMetadata(compressed, exif);

			entry = {
				id: crypto.randomUUID(),
				blob: withExif,
				fileName: file.name,
				gps: exif.gps,
				date: exif.date,
				time: exif.time
			};
			form.photos = [...form.photos, entry];
			errors = { ...errors, photos: undefined };
		} finally {
			// Das Bild selbst ist ab hier fertig prozessiert und im Grid sichtbar — die
			// nachfolgende Adressauflösung (Netzwerk-Geocoding) darf das Add-Label nicht länger
			// blockieren, sonst "hängt" der Spinner sichtbar an dessen Stelle weiter.
			photoProcessing = false;
		}

		// Erstes Foto: legt die erste Fahrzeug-Karte an, die bis dahin nicht existiert.
		if (form.vehicles.length === 0) {
			const vehicle = createEmptyVehicle();
			vehicle.photoIds = [entry.id];
			form.vehicles = [vehicle];
			// Nach der Zuweisung ist form.vehicles[0] die reaktive Proxy-Version — die lokale
			// `vehicle`-Referenz bleibt roh, Mutationen darauf würden vom UI nicht bemerkt.
			await applyPhotoExifToVehicle(form.vehicles[0], entry.id);
		} else if (
			// Bei genau einem Fahrzeug ist die Zuordnung eindeutig — direkt automatisch übernehmen.
			form.vehicles.length === 1 &&
			form.vehicles[0].photoIds.length < MAX_PHOTOS_PER_VEHICLE
		) {
			form.vehicles[0].photoIds = [...form.vehicles[0].photoIds, entry.id];
			await applyPhotoExifToVehicle(form.vehicles[0], entry.id);
		}
	};

	const onRemovePhoto = (photoId: string) => {
		form.photos = form.photos.filter((photo) => photo.id !== photoId);
		for (const vehicle of form.vehicles) {
			vehicle.photoIds = vehicle.photoIds.filter((id) => id !== photoId);
		}
	};

	const addVehicle = async () => {
		const entry = createEmptyVehicle();
		form.vehicles = [...form.vehicles, entry];
		await tick();
		document
			.getElementById(`vehicle-block-${entry.id}`)
			?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	};

	const removeVehicle = (id: string) => {
		if (form.vehicles.length <= 1) return;
		form.vehicles = form.vehicles.filter((vehicle) => vehicle.id !== id);
	};

	const resetVehicle = (id: string) => {
		form.vehicles = form.vehicles.map((vehicle) =>
			vehicle.id === id ? createEmptyVehicle() : vehicle
		);
	};

	// Setzt das komplette Formular inkl. "Deine Angaben" zurück, lässt das gespeicherte Profil
	// aber unangetastet (bleibt für die nächste Anzeige als Autofill erhalten).
	const resetAll = async () => {
		form = createEmptyForm();
		errors = {};
		vehicleGeocodeWarnings = {};
		sendError = null;
		sendResults = [];
		photoProcessingError = null;
		photoProcessing = false;
		submitting = false;
		isEditingProfile = true;
		try {
			await clearDraft();
		} catch (error) {
			console.error('Fehler beim Löschen des Entwurfs:', error);
		}
	};

	const openResetDialog = () => resetDialog?.showModal();

	const confirmReset = async () => {
		resetDialog?.close();
		triggerHaptic('warning');
		await resetAll();
	};

	const closeSuccessDialog = () => successDialog?.close();

	// Reihenfolge bestimmt, welches Feld bei mehreren gleichzeitigen Fehlern fokussiert wird —
	// folgt der visuellen Reihenfolge des Formulars von oben nach unten.
	const PROFILE_FIELD_ORDER: (keyof typeof errors)[] = [
		'firstName',
		'lastName',
		'addressStreet',
		'addressPostcode',
		'addressCity',
		'email'
	];
	const VEHICLE_FIELD_ORDER: (keyof VehicleErrors)[] = [
		'photoIds',
		'date',
		'time',
		'endTime',
		'locationStreet',
		'locationPostcode',
		'locationCity',
		'licensePlate',
		'make',
		'color',
		'incidentTypeIds'
	];

	// Fokussiert das erste fehlerhafte Feld nach einem gescheiterten Absenden — Bildschirmleser
	// erfahren so direkt, welches Feld korrigiert werden muss, statt nur einen visuellen Scroll
	// (der sehende Maus-Nutzer hilft, aber Tastatur-/Screenreader-Nutzer nicht weiterbringt).
	const focusFirstError = async (formErrors: ReturnType<typeof validateReportForm>) => {
		await tick();
		if (formErrors.photos) {
			photosCardElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
			return;
		}
		const profileField = PROFILE_FIELD_ORDER.find((field) => formErrors[field]);
		if (profileField) {
			document.getElementById(profileField)?.focus();
			return;
		}
		for (const [index, vehicleErrors] of (formErrors.vehicles ?? []).entries()) {
			const field = VEHICLE_FIELD_ORDER.find((f) => vehicleErrors[f]);
			if (!field) continue;
			const vehicleId = form.vehicles[index]?.id;
			if (!vehicleId) return;
			// photoIds/incidentTypeIds haben kein einzelnes fokussierbares Eingabefeld (Foto-Grid
			// bzw. Checkbox-Gruppe) — dafür genügt das Scrollen zur Fahrzeugkarte als Fallback.
			const target = document.getElementById(`${field}-${vehicleId}`);
			if (target) {
				target.focus();
			} else {
				document
					.getElementById(`vehicle-block-${vehicleId}`)
					?.scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
			return;
		}
	};

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

			const photoById = new Map(form.photos.map((photo) => [photo.id, photo]));
			const results: { vehicle: VehicleEntry; ok: boolean }[] = [];

			for (const [index, vehicle] of form.vehicles.entries()) {
				const incidentTypes = city.incidentTypes.filter((t) =>
					vehicle.incidentTypeIds.includes(t.id)
				);
				const vehiclePhotos = vehicle.photoIds
					.map((id) => photoById.get(id))
					.filter((photo): photo is PhotoEntry => photo !== undefined);

				const body = new FormData();
				body.set('firstName', form.firstName);
				body.set('lastName', form.lastName);
				body.set('addressStreet', form.addressStreet);
				body.set('addressPostcode', form.addressPostcode);
				body.set('addressCity', form.addressCity);
				body.set('email', form.email);
				body.set('phone', form.phone ?? '');
				body.set('date', vehicle.date);
				body.set('time', vehicle.time);
				body.set('timeMode', vehicle.timeMode);
				body.set('endTime', vehicle.endTime ?? '');
				body.set('locationStreet', vehicle.locationStreet);
				body.set('locationHouseNumber', vehicle.locationHouseNumber ?? '');
				body.set('locationPostcode', vehicle.locationPostcode);
				body.set('locationCity', vehicle.locationCity);
				body.set('vehicleIndex', String(index + 1));
				body.set('vehicleTotal', String(form.vehicles.length));
				body.set('licensePlate', vehicle.licensePlate);
				body.set('licensePlateCountry', vehicle.licensePlateCountry);
				body.set('vehicleType', vehicle.vehicleType);
				body.set('make', vehicle.make);
				body.set('color', vehicle.color);
				for (const id of vehicle.incidentTypeIds) body.append('incidentTypeIds', id);
				body.set('notes', vehicle.notes ?? '');
				body.set('mode', appMode.current ?? 'demo');
				vehiclePhotos.forEach((photo, pIdx) =>
					body.append('photos', photo.blob, `beweisfoto-${pIdx + 1}.jpg`)
				);

				let ok: boolean;
				try {
					const response = await fetch('/api/send', { method: 'POST', body });
					ok = response.ok;
				} catch {
					ok = false;
				}
				results.push({ vehicle, ok });

				if (ok) {
					await addEntry({
						id: crypto.randomUUID(),
						timestamp: Date.now(),
						firstName: form.firstName,
						lastName: form.lastName,
						locationAddress: formatAddress({
							street: vehicle.locationStreet,
							houseNumber: vehicle.locationHouseNumber,
							postcode: vehicle.locationPostcode,
							city: vehicle.locationCity
						}),
						incidentTypeLabels: incidentTypes.map((t) => t.label),
						licensePlate: normalizeLicensePlate(vehicle.licensePlate, vehicle.licensePlateCountry),
						licensePlateCountry: vehicle.licensePlateCountry,
						vehicleType: vehicle.vehicleType,
						make: vehicle.make,
						color: vehicle.color,
						notes: vehicle.notes,
						thumbnails: vehiclePhotos.map((photo) => photo.blob)
					});
				}
			}

			sendResults = results.map((r) => ({
				licensePlate: normalizeLicensePlate(r.vehicle.licensePlate, r.vehicle.licensePlateCountry),
				ok: r.ok
			}));

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
			const succeededIds = new Set(results.filter((r) => r.ok).map((r) => r.vehicle.id));
			form.vehicles = form.vehicles.filter((vehicle) => !succeededIds.has(vehicle.id));

			if (form.vehicles.length === 0) {
				form = {
					...form,
					photos: [],
					vehicles: []
				};
				await clearDraft();
			} else {
				await saveDraft($state.snapshot(form.vehicles), $state.snapshot(form.photos));
			}
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
		<div class="rounded-card bg-surface p-4 shadow-card sm:p-6">
			<h2 class="text-lg font-semibold text-ink md:text-xl">Deine Angaben</h2>

			{#if isEditingProfile}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div onkeydown={onProfileFieldKeydown}>
					<p class="mt-1 text-lg text-ink-muted">
						Mit <span class="text-error-fg">*</span> markierte Felder sind Pflichtfelder.
					</p>

					<div class="mt-3 grid grid-cols-2 gap-3">
						<FormField
							id="firstName"
							label="Vorname"
							required
							autocompleteAttr="given-name"
							error={errors.firstName}
							bind:value={form.firstName}
							onblur={saveProfileFields}
						/>
						<FormField
							id="lastName"
							label="Nachname"
							required
							autocompleteAttr="family-name"
							error={errors.lastName}
							bind:value={form.lastName}
							onblur={saveProfileFields}
						/>
					</div>

					<div class="mt-3">
						<AddressAutocomplete
							id="addressStreet"
							label="Straße und Hausnr."
							required
							autocompleteAttr="address-line1"
							placeholder="z. B. Musterstraße 12"
							error={errors.addressStreet}
							bind:value={form.addressStreet}
							onBlur={saveProfileFields}
							onSelect={(suggestion) => {
								form.addressStreet = [suggestion.street, suggestion.houseNumber]
									.filter(Boolean)
									.join(' ');
								if (suggestion.postcode) form.addressPostcode = suggestion.postcode;
								if (suggestion.city) form.addressCity = suggestion.city;
							}}
						/>
					</div>

					<div class="mt-3 grid grid-cols-[1fr_2fr] gap-3">
						<FormField
							id="addressPostcode"
							label="PLZ"
							required
							autocompleteAttr="postal-code"
							error={errors.addressPostcode}
							bind:value={form.addressPostcode}
							onblur={saveProfileFields}
						/>
						<FormField
							id="addressCity"
							label="Ort"
							required
							autocompleteAttr="address-level2"
							error={errors.addressCity}
							bind:value={form.addressCity}
							onblur={saveProfileFields}
						/>
					</div>

					<div class="mt-3">
						<FormField
							id="email"
							label="Deine E-Mail-Adresse"
							type="email"
							required
							autocompleteAttr="email"
							spellcheck={false}
							error={errors.email}
							bind:value={form.email}
							onblur={saveProfileFields}
						/>
					</div>

					<div class="mt-3">
						<FormField
							id="phone"
							label="Telefonnummer"
							type="tel"
							autocompleteAttr="tel"
							placeholder="z. B. 0221 12345678"
							bind:value={form.phone}
							onblur={saveProfileFields}
						/>
					</div>

					<button type="button" onclick={onSaveProfile} class="mt-4 ml-auto block {buttonPrimary}">
						Speichern
					</button>
				</div>
			{:else}
				<div class="mt-3 text-lg text-ink">
					<p>{form.firstName} {form.lastName}</p>
					<p>{form.addressStreet}</p>
					<p>{form.addressPostcode} {form.addressCity}</p>
					<p>{form.email}</p>
					{#if form.phone}<p>{form.phone}</p>{/if}
				</div>

				<button type="button" onclick={onEditProfile} class="mt-4 ml-auto block {buttonSecondary}">
					Bearbeiten
				</button>
			{/if}
		</div>

		<div bind:this={photosCardElement}>
			<PhotoPool
				photos={form.photos}
				{usageCounts}
				error={errors.photos}
				processingError={photoProcessingError}
				processing={photoProcessing}
				maxPhotos={getMaxPoolPhotos(form.vehicles.length)}
				maxPhotosPerVehicle={MAX_PHOTOS_PER_VEHICLE}
				onAdd={onAddPhoto}
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
							{vehicle}
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
							onRemove={() => removeVehicle(vehicle.id)}
							onReset={() => resetVehicle(vehicle.id)}
							onPhotoToggled={(photoId, selected) => {
								if (selected) applyPhotoExifToVehicle(vehicle, photoId);
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
		<div class="mx-auto flex max-w-md items-center gap-6 lg:max-w-5xl">
			<button
				type="button"
				onclick={openResetDialog}
				disabled={!formReady}
				class="flex-1 {buttonDestructiveSecondary} disabled:cursor-not-allowed disabled:opacity-50"
			>
				Zurücksetzen
			</button>
			<button
				type="submit"
				disabled={!formReady || submitting || photoProcessing}
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
	bind:dialog={successDialog}
	titleId="success-dialog-title"
	title={successCount > 1
		? `Alle ${successCount} Anzeigen erfolgreich versendet`
		: 'Anzeige erfolgreich versendet'}
	desktopMaxWidthClass="sm:max-w-lg"
>
	<p class="mt-1 text-lg text-ink-muted">
		Du erhältst eine Kopie per E-Mail von <strong class="font-semibold text-ink"
			>{senderEmail}</strong
		>. Falls sie nicht im Posteingang ankommt, prüfe bei Bedarf auch deinen Spam-Ordner. Die Anzeige
		liegt außerdem in deiner Historie.
	</p>
	{#snippet actions()}
		<button type="button" onclick={closeSuccessDialog} class="flex-1 {buttonSecondary}">
			Schließen
		</button>
		<a href={resolve('/historie')} class="flex-1 text-center {buttonPrimary}">Zur Historie</a>
	{/snippet}
</ConfirmDialog>
