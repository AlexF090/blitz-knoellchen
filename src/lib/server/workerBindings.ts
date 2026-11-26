import { env } from 'cloudflare:workers';

/** Bindings des Workers aus wrangler.jsonc; ohne Wrangler-Konfiguration leer. */
// Eigenes Modul, damit Tests die Bindings ersetzen können: Der Cloudflare-Adapter löst
// `cloudflare:workers` auf einen Stub mit zufälliger Query auf, den `vi.mock` nicht trifft.
export const getWorkerBindings = () => env;
