export const VEHICLE_ACCENT_CLASSES = [
	'border-vehicle-1',
	'border-vehicle-2',
	'border-vehicle-3',
	'border-vehicle-4',
	'border-vehicle-5',
	'border-vehicle-6'
] as const;

export const getVehicleAccentClass = (index: number): string => {
	const length = VEHICLE_ACCENT_CLASSES.length;
	return VEHICLE_ACCENT_CLASSES[((index % length) + length) % length];
};
