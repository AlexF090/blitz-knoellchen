import { redirect } from '@sveltejs/kit';
import { IMPRESSUM_URL } from '#lib/site.ts';

// Das ladungsfähige Impressum liegt zentral auf appool.de und gilt für alle Subdomains.
export function GET(): never {
	redirect(301, IMPRESSUM_URL, { external: ['https://appool.de'] });
}
