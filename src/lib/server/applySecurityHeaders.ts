/** Setzt die Sicherheits-Header, die für jede Response gelten, auch für /api/*-JSON-Antworten. */
export const applySecurityHeaders = (headers: Headers): void => {
	headers.set('X-Frame-Options', 'DENY');
	headers.set('Cross-Origin-Opener-Policy', 'same-origin');
	headers.set('X-Content-Type-Options', 'nosniff');
	headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	// Die App braucht keine dieser APIs: Den Standort liest sie aus den EXIF-Daten der Fotos,
	// Fotos kommen über die Dateiauswahl, nicht über die Kamera-API.
	headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
};
