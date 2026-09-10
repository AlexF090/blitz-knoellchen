import { describe, expect, it } from 'vitest';
import { isIosSafari } from './isIosSafari';

const IOS_SAFARI =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const IOS_CHROME =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0.6422.80 Mobile/15E148 Safari/604.1';
const ANDROID_CHROME =
	'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36';
const MACOS_SAFARI =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';

describe('isIosSafari', () => {
	it('erkennt Safari auf iOS', () => {
		expect(isIosSafari(IOS_SAFARI)).toBe(true);
	});

	it('erkennt Chrome auf iOS nicht als Safari', () => {
		expect(isIosSafari(IOS_CHROME)).toBe(false);
	});

	it('erkennt Android nicht als iOS', () => {
		expect(isIosSafari(ANDROID_CHROME)).toBe(false);
	});

	it('erkennt macOS Safari nicht als iOS', () => {
		expect(isIosSafari(MACOS_SAFARI)).toBe(false);
	});
});
