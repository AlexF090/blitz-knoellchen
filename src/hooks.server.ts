import type { Handle } from '@sveltejs/kit';

// Die Content-Security-Policy wird über SvelteKits kit.csp-Option gesetzt (s. vite.config.ts) —
// nur dort kennt SvelteKit den Nonce/Hash für sein eigenes Bootstrap-<script> und kann die
// Direktiven korrekt in HTML-Seiten-Responses einfügen. X-Frame-Options und COOP betreffen keine
// Inline-Skripte und gelten sinnvollerweise für jede Response, auch /api/*-JSON-Antworten.
export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');

	return response;
};
