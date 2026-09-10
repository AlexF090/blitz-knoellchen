export async function fetchAddress(lat: number, lon: number): Promise<string | null> {
	try {
		const response = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`);
		if (!response.ok) return null;
		const data = await response.json();
		return data.address ?? null;
	} catch {
		return null;
	}
}
