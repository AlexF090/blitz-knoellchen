import { describe, expect, it } from 'vitest';
import { createVercelAnalytics } from './vercelAnalytics';

// Läuft im Node-Projekt ohne `window`, wie das serverseitige Rendern des Layouts.
describe('createVercelAnalytics beim serverseitigen Rendern', () => {
	it('greift ausgeschaltet nicht auf window zu', () => {
		expect(typeof window).toBe('undefined');

		const track = createVercelAnalytics(false);

		expect(() => track('/', '/')).not.toThrow();
	});
});
