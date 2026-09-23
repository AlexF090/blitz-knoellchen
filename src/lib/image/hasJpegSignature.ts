/** Prüft anhand der ersten drei Bytes (`FF D8 FF`), ob die Daten ein JPEG sind. */
export const hasJpegSignature = (bytes: Uint8Array): boolean => {
	return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
};
