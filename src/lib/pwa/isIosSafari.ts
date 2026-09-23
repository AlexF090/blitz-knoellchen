/** Erkennt Safari auf iOS — der einzige Browser ohne `beforeinstallprompt` (s. IosInstallBanner). */
export const isIosSafari = (userAgent: string): boolean => {
	const isIos = /iphone|ipad|ipod/i.test(userAgent);
	// Chrome/Firefox/Edge/Opera auf iOS führen "Safari" im User-Agent mit und müssen
	// ausgeschlossen werden.
	const isSafari = /safari/i.test(userAgent) && !/crios|fxios|edgios|opios/i.test(userAgent);
	return isIos && isSafari;
};
