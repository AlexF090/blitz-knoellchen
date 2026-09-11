export const describeHttpError = (providerName: string, status: number): string => {
	if (status === 429) return `${providerName} hat Rate-Limiting gemeldet (HTTP 429)`;
	if (status === 403) return `${providerName} hat die Anfrage blockiert (HTTP 403)`;
	return `${providerName} antwortete mit HTTP ${status}`;
};
