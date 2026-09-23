/** Adressbestandteile für die einzeilige Darstellung. */
export interface FormattableAddress {
	street: string;
	houseNumber?: string;
	postcode: string;
	city: string;
}

/** Formatiert eine Adresse einzeilig als „Straße Hausnr., PLZ Ort". */
export const formatAddress = ({
	street,
	houseNumber,
	postcode,
	city
}: FormattableAddress): string => {
	const houseNumberPart = houseNumber?.trim() ? ` ${houseNumber.trim()}` : '';
	return `${street}${houseNumberPart}, ${postcode} ${city}`;
};
