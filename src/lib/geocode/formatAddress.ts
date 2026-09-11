export interface FormattableAddress {
	street: string;
	houseNumber?: string;
	postcode: string;
	city: string;
}

export function formatAddress({ street, houseNumber, postcode, city }: FormattableAddress): string {
	const houseNumberPart = houseNumber?.trim() ? ` ${houseNumber.trim()}` : '';
	return `${street}${houseNumberPart}, ${postcode} ${city}`;
}
