import { defaultAssetName, toResolvedSize } from '@vite-pwa/assets-generator';
import type { AssetType, Preset } from '@vite-pwa/assets-generator/config';

const ASSET_TYPES: AssetType[] = ['transparent', 'maskable', 'apple'];

/**
 * Dateinamen, die `pwa-assets-generator` für ein Preset erzeugt: PNG-Icons je Typ und Größe
 * sowie die Favicons. Apple-Splash-Screens sind nicht enthalten.
 */
export const listGeneratedPwaAssets = (preset: Preset): string[] => {
	const assetName = preset.assetName ?? defaultAssetName;
	return ASSET_TYPES.flatMap((type) => {
		const asset = preset[type];
		const icons = asset.sizes.map((size) => assetName(type, toResolvedSize(size)));
		const favicons = (asset.favicons ?? []).map(([, name]) => name);
		return [...icons, ...favicons];
	});
};
