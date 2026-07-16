# Batch 2R cross-browser completion

## Matrix reconciliation

The supported browser set is Chromium desktop, Firefox desktop, WebKit desktop, and Chromium mobile. The first full 96-test run recorded 93 passes and three Chromium-mobile failures caused by test interaction with an intentional success overlay/mobile sheet state. The test-only recovery patch makes those states explicit; the Chromium-mobile smoke suite then passed 19/19. Desktop, Firefox, and WebKit smoke/trust/accessibility coverage remained green.

The boundary-rendering suite currently passes 8 tests and intentionally skips 8 duplicate project-scoped captures. The passing coverage includes startup policy, representative views, SVG/PNG/PDF hierarchy and attribution, high-DPI, and mobile export controls. The skips are not failures: Chromium owns the full fixture/export matrix while Firefox/WebKit and mobile cover non-duplicated views.

## Remaining limitation

`npm ci` is still environment-limited because the supplied Node 24 runtime does not include npm. Existing lockfile-resolved dependencies were used; a normal clean-install run remains required in CI or a standard Node installation before a live release claim.

No P0/P1 product defect is open. The remaining gates are owner visual approval and authenticated remote platform verification.
