<script lang="ts">
	import type { PhotoEntry } from '$lib/validation/formSchema';

	interface Props {
		photo: PhotoEntry | null;
		onClose: () => void;
	}

	let { photo, onClose }: Props = $props();

	let dialog: HTMLDialogElement | undefined;
	let container: HTMLDivElement | undefined = $state();
	let imgEl: HTMLImageElement | undefined = $state();
	let objectUrl: string | null = $state(null);

	let scale = $state(1);
	let translateX = $state(0);
	let translateY = $state(0);
	let snapping = $state(false);

	const MIN_SCALE = 1;
	const MAX_SCALE = 5;
	const DOUBLE_TAP_SCALE = 3;
	const SNAP_DURATION_MS = 200;

	let baseSize = { width: 0, height: 0 };
	let snapTimeout: ReturnType<typeof setTimeout> | undefined;

	const resetTransform = () => {
		scale = 1;
		translateX = 0;
		translateY = 0;
	};

	const clampScale = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

	const clampTranslate = () => {
		if (!container || baseSize.width === 0) return;
		const rect = container.getBoundingClientRect();
		const maxX = Math.max(0, (baseSize.width * scale - rect.width) / 2);
		const maxY = Math.max(0, (baseSize.height * scale - rect.height) / 2);
		translateX = Math.min(maxX, Math.max(-maxX, translateX));
		translateY = Math.min(maxY, Math.max(-maxY, translateY));
	};

	// Zoomt so, dass der Bildpunkt unter (clientX, clientY) an derselben Bildschirmposition
	// bleibt (Standardformel für ankertreues Zoomen), statt immer um die Bildmitte zu skalieren.
	const zoomAt = (newScale: number, clientX: number, clientY: number) => {
		if (!container) {
			scale = newScale;
			return;
		}
		const rect = container.getBoundingClientRect();
		const anchorX = clientX - (rect.left + rect.width / 2);
		const anchorY = clientY - (rect.top + rect.height / 2);
		const ratio = newScale / scale;
		translateX = anchorX - ratio * (anchorX - translateX);
		translateY = anchorY - ratio * (anchorY - translateY);
		scale = newScale;
		clampTranslate();
	};

	const snapTo = (newScale: number, clientX: number, clientY: number) => {
		snapping = true;
		if (newScale === MIN_SCALE) {
			resetTransform();
		} else {
			zoomAt(newScale, clientX, clientY);
		}
		clearTimeout(snapTimeout);
		snapTimeout = setTimeout(() => (snapping = false), SNAP_DURATION_MS);
	};

	const updateBaseSize = () => {
		if (!imgEl || !container || !imgEl.naturalWidth || !imgEl.naturalHeight) return;
		const rect = container.getBoundingClientRect();
		const naturalRatio = imgEl.naturalWidth / imgEl.naturalHeight;
		const containerRatio = rect.width / rect.height;
		baseSize =
			naturalRatio > containerRatio
				? { width: rect.width, height: rect.width / naturalRatio }
				: { width: rect.height * naturalRatio, height: rect.height };
	};

	$effect(() => {
		if (!photo) {
			objectUrl = null;
			return;
		}
		const url = URL.createObjectURL(photo.blob);
		objectUrl = url;
		return () => URL.revokeObjectURL(url);
	});

	$effect(() => {
		if (!dialog) return;
		if (photo) {
			resetTransform();
			baseSize = { width: 0, height: 0 };
			if (!dialog.open) dialog.showModal();
		} else if (dialog.open) {
			dialog.close();
		}
	});

	const handleWheel = (event: WheelEvent) => {
		event.preventDefault();
		// Trackpad-Pinch liefert wheel-Events mit ctrlKey und braucht mehr Empfindlichkeit als ein
		// klassisches Mausrad, damit sich beides gleich "kräftig" anfühlt.
		const intensity = event.ctrlKey ? 0.02 : 0.01;
		const factor = Math.exp(-event.deltaY * intensity);
		zoomAt(clampScale(scale * factor), event.clientX, event.clientY);
	};

	const handleDoubleClick = (event: MouseEvent) => {
		if (scale > MIN_SCALE) {
			snapTo(MIN_SCALE, event.clientX, event.clientY);
		} else {
			snapTo(DOUBLE_TAP_SCALE, event.clientX, event.clientY);
		}
	};

	interface ActivePointer {
		x: number;
		y: number;
	}

	// Nur interner Pointer-Tracking-State, nicht Teil des reaktiven Renderings — SvelteMap unnötig.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	const activePointers = new Map<number, ActivePointer>();
	let panPointerId: number | null = null;
	let panStart = { x: 0, y: 0, translateX: 0, translateY: 0 };
	let lastPinchMid: { x: number; y: number } | null = null;
	let lastPinchDistance = 0;

	const pinchMidpoint = () => {
		const [a, b] = [...activePointers.values()];
		return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
	};

	const pinchDistance = () => {
		const [a, b] = [...activePointers.values()];
		return Math.hypot(a.x - b.x, a.y - b.y);
	};

	const handlePointerDown = (event: PointerEvent) => {
		snapping = false;
		activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);

		if (activePointers.size === 2) {
			panPointerId = null;
			lastPinchMid = pinchMidpoint();
			lastPinchDistance = pinchDistance();
		} else if (activePointers.size === 1 && scale > MIN_SCALE) {
			panPointerId = event.pointerId;
			panStart = { x: event.clientX, y: event.clientY, translateX, translateY };
		}
	};

	const handlePointerMove = (event: PointerEvent) => {
		if (!activePointers.has(event.pointerId)) return;
		activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

		if (activePointers.size === 2) {
			const mid = pinchMidpoint();
			const distance = pinchDistance();

			// Pinch = Pan (Mittelpunkt-Versatz) + Zoom (Distanzänderung), beides inkrementell
			// gegenüber dem letzten Frame statt gegenüber dem Gestenstart — so bleibt die Geste
			// exakt unter den Fingern statt bei starkem Zoom "wegzulaufen".
			if (lastPinchMid) {
				translateX += mid.x - lastPinchMid.x;
				translateY += mid.y - lastPinchMid.y;
			}
			if (lastPinchDistance > 0) {
				zoomAt(clampScale(scale * (distance / lastPinchDistance)), mid.x, mid.y);
			}
			clampTranslate();

			lastPinchMid = mid;
			lastPinchDistance = distance;
		} else if (panPointerId === event.pointerId) {
			translateX = panStart.translateX + (event.clientX - panStart.x);
			translateY = panStart.translateY + (event.clientY - panStart.y);
			clampTranslate();
		}
	};

	const endPointer = (event: PointerEvent) => {
		activePointers.delete(event.pointerId);
		if (panPointerId === event.pointerId) panPointerId = null;
		if (activePointers.size < 2) {
			lastPinchMid = null;
			lastPinchDistance = 0;
		}
	};

	const handleBackdropClick = (event: MouseEvent) => {
		if (event.target === dialog) onClose();
	};
</script>

<dialog
	bind:this={dialog}
	onclose={onClose}
	onclick={handleBackdropClick}
	class="m-auto max-h-none max-w-none overflow-hidden rounded-card bg-surface p-0 shadow-card backdrop:bg-ink/70"
>
	{#if photo && objectUrl}
		<div class="relative h-[85vh] w-[90vw] max-w-3xl">
			<button
				type="button"
				onclick={onClose}
				aria-label="Vorschau schließen"
				class="absolute top-2 right-2 z-10 flex size-8 items-center justify-center rounded-full bg-surface text-ink shadow-card"
			>
				×
			</button>
			<div
				bind:this={container}
				class="h-full w-full touch-none overflow-hidden"
				role="presentation"
				onwheel={handleWheel}
				ondblclick={handleDoubleClick}
				onpointerdown={handlePointerDown}
				onpointermove={handlePointerMove}
				onpointerup={endPointer}
				onpointercancel={endPointer}
				onpointerleave={endPointer}
			>
				<img
					bind:this={imgEl}
					src={objectUrl}
					alt="Beweisfoto {photo.fileName}"
					class="h-full w-full object-contain will-change-transform"
					style="transform: translate({translateX}px, {translateY}px) scale({scale}); transition: {snapping
						? `transform ${SNAP_DURATION_MS}ms ease-out`
						: 'none'};"
					draggable="false"
					onload={updateBaseSize}
				/>
			</div>
		</div>
	{/if}
</dialog>
