import { describe, expect, it } from 'vitest';
import type { Preset } from '@vite-pwa/assets-generator/config';
import { listGeneratedPwaAssets } from './listGeneratedPwaAssets';

describe('listGeneratedPwaAssets', () => {
	it('listet Icons je Typ und Größe sowie die Favicons', () => {
		const preset: Preset = {
			transparent: { sizes: [64, 192], favicons: [[48, 'favicon.ico']] },
			maskable: { sizes: [512] },
			apple: { sizes: [180] }
		};

		expect(listGeneratedPwaAssets(preset)).toEqual([
			'pwa-64x64.png',
			'pwa-192x192.png',
			'favicon.ico',
			'maskable-icon-512x512.png',
			'apple-touch-icon-180x180.png'
		]);
	});

	it('übernimmt nicht quadratische Größen', () => {
		const preset: Preset = {
			transparent: { sizes: [{ width: 120, height: 60 }] },
			maskable: { sizes: [] },
			apple: { sizes: [] }
		};

		expect(listGeneratedPwaAssets(preset)).toEqual(['pwa-120x60.png']);
	});

	it('nutzt einen eigenen assetName des Presets', () => {
		const preset: Preset = {
			transparent: { sizes: [64] },
			maskable: { sizes: [] },
			apple: { sizes: [] },
			assetName: (type, size) => `${type}-${size.width}.png`
		};

		expect(listGeneratedPwaAssets(preset)).toEqual(['transparent-64.png']);
	});
});
