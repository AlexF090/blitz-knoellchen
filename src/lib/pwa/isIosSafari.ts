export const isIosSafari = (userAgent: string): boolean => {
	const isIos = /iphone|ipad|ipod/i.test(userAgent);
	const isSafari = /safari/i.test(userAgent) && !/crios|fxios|edgios|opios/i.test(userAgent);
	return isIos && isSafari;
};
