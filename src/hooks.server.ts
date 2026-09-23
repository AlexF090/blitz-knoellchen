import type { Handle } from '@sveltejs/kit';
import { applySecurityHeaders } from '$lib/server/applySecurityHeaders';

/** Setzt die Sicherheits-Header, die für jede Response gelten sollen. */
export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	// Die Content-Security-Policy steht bewusst nicht hier, sondern in SvelteKits kit.csp-Option
	// (s. vite.config.ts) — nur dort kennt SvelteKit den Nonce/Hash für sein eigenes
	// Bootstrap-<script>. Die übrigen Header betreffen keine Inline-Skripte.
	applySecurityHeaders(response.headers);

	return response;
};
