// Vitest setzt im Tester-Iframe `body { margin: 0 }`, und ohne das App-Stylesheet (Tailwind wird in
// Komponententests nicht geladen) landen Elemente oft direkt am linken Rand bei x=0. Ab Vitest 5
// verfehlen echte Playwright-Klicks (locator.click / userEvent.click) solche Elemente lautlos:
// kein pointerdown, kein click, kein Fehler. Unter Vitest 4 traf derselbe Klick. Reproduziert am
// Vergrößern-Button in PhotoPool: bei x=0 kein Treffer, ab 8px Einrückung zuverlässig. Der
// Browser-Default von 8px hält alle gerenderten Elemente vom Rand fern.
document.body.style.margin = '8px';
