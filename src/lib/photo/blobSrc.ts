import type { Attachment } from 'svelte/attachments';

/**
 * Setzt einen Foto-Blob als `src` eines Bildes und gibt die Object-URL wieder frei, sobald das
 * Element entfernt oder der Blob ausgetauscht wird.
 */
export const blobSrc =
	(blob: Blob): Attachment<HTMLImageElement> =>
	(image) => {
		const url = URL.createObjectURL(blob);
		image.src = url;
		return () => URL.revokeObjectURL(url);
	};
