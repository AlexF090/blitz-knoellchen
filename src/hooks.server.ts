import type { Handle } from '@sveltejs/kit';

/** Setzt die Sicherheits-Header, die für jede Response gelten sollen. */
export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	// Die Content-Security-Policy steht bewusst nicht hier, sondern in SvelteKits kit.csp-Option
	// (s. vite.config.ts) — nur dort kennt SvelteKit den Nonce/Hash für sein eigenes
	// Bootstrap-<script>. Diese beiden Header betreffen keine Inline-Skripte und gelten
	// sinnvollerweise für jede Response, auch für /api/*-JSON-Antworten.
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');

	return response;
};
