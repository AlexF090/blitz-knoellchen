<script lang="ts">
	import type { PhotoEntry } from '$lib/validation/formSchema';

	interface Props {
		photo: PhotoEntry | null;
		onClose: () => void;
	}

	let { photo, onClose }: Props = $props();

	let dialog: HTMLDialogElement | undefined;
	let objectUrl: string | null = $state(null);

	let scale = $state(1);
	let translateX = $state(0);
	let translateY = $state(0);

	const MIN_SCALE = 1;
	const MAX_SCALE = 4;
	const DOUBLE_TAP_SCALE = 2.5;

	const resetTransform = () => {
		scale = 1;
		translateX = 0;
		translateY = 0;
	};

	const clampScale = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

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
			if (!dialog.open) dialog.showModal();
		} else if (dialog.open) {
			dialog.close();
		}
	});

	const handleWheel = (event: WheelEvent) => {
		event.preventDefault();
		scale = clampScale(scale - event.deltaY * 0.002);
		if (scale === MIN_SCALE) {
			translateX = 0;
			translateY = 0;
		}
	};

	const handleDoubleClick = () => {
		if (scale > MIN_SCALE) {
			resetTransform();
		} else {
			scale = DOUBLE_TAP_SCALE;
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
	let pinchStartDistance = 0;
	let pinchStartScale = 1;

	const pointerDistance = () => {
		const [a, b] = [...activePointers.values()];
		return Math.hypot(a.x - b.x, a.y - b.y);
	};

	const handlePointerDown = (event: PointerEvent) => {
		activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

		if (activePointers.size === 2) {
			panPointerId = null;
			pinchStartDistance = pointerDistance();
			pinchStartScale = scale;
		} else if (activePointers.size === 1 && scale > MIN_SCALE) {
			panPointerId = event.pointerId;
			panStart = { x: event.clientX, y: event.clientY, translateX, translateY };
			(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		}
	};

	const handlePointerMove = (event: PointerEvent) => {
		if (!activePointers.has(event.pointerId)) return;
		activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

		if (activePointers.size === 2) {
			const distance = pointerDistance();
			scale = clampScale(pinchStartScale * (distance / pinchStartDistance));
		} else if (panPointerId === event.pointerId) {
			translateX = panStart.translateX + (event.clientX - panStart.x);
			translateY = panStart.translateY + (event.clientY - panStart.y);
		}
	};

	const endPointer = (event: PointerEvent) => {
		activePointers.delete(event.pointerId);
		if (panPointerId === event.pointerId) panPointerId = null;
		if (activePointers.size < 2 && scale === MIN_SCALE) {
			translateX = 0;
			translateY = 0;
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
				class="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface text-ink shadow-card"
			>
				×
			</button>
			<div
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
					src={objectUrl}
					alt="Beweisfoto {photo.fileName}"
					class="h-full w-full object-contain"
					style="transform: translate({translateX}px, {translateY}px) scale({scale}); transition: {scale ===
					MIN_SCALE
						? 'transform 0.15s ease-out'
						: 'none'};"
					draggable="false"
				/>
			</div>
		</div>
	{/if}
</dialog>
