# Changelog

## [0.9.0](https://github.com/allixsenos/asu/compare/v0.8.0...v0.9.0) (2026-09-10)


### Features

* **cli:** check npm once a day for a newer version ([#31](https://github.com/allixsenos/asu/issues/31)) ([41bf4e2](https://github.com/allixsenos/asu/commit/41bf4e242f0a651889fc94b6da41b8ff5568b33e))

## [0.8.0](https://github.com/allixsenos/asu/compare/v0.7.0...v0.8.0) (2026-09-10)


### Features

* **cli:** add a bars view and make it the terminal default ([#29](https://github.com/allixsenos/asu/issues/29)) ([c663770](https://github.com/allixsenos/asu/commit/c6637702c2fa4a188f61c663870ac4702fe7d89f))

## [0.7.0](https://github.com/allixsenos/asu/compare/v0.6.0...v0.7.0) (2026-09-08)


### Features

* **cli:** show the ASU version in every report header ([#27](https://github.com/allixsenos/asu/issues/27)) ([97f841f](https://github.com/allixsenos/asu/commit/97f841f4a4f05d50d76fd18cc408eecc54b7d173))

## [0.6.0](https://github.com/allixsenos/asu/compare/v0.5.0...v0.6.0) (2026-09-08)


### Features

* **cli:** show one status word per provider ([#25](https://github.com/allixsenos/asu/issues/25)) ([af977ef](https://github.com/allixsenos/asu/commit/af977efdf84dabb1b2441399b660725dca5f32df))

## [0.5.0](https://github.com/allixsenos/asu/compare/v0.4.0...v0.5.0) (2026-09-08)


### Features

* **skills:** bundle the asu-usage skill for measuring command cost ([#23](https://github.com/allixsenos/asu/issues/23)) ([a90a35f](https://github.com/allixsenos/asu/commit/a90a35ff0afb00c2102ead40c0d0cda4274c3167))


### Bug Fixes

* **providers:** round reset timestamps to the whole second ([#22](https://github.com/allixsenos/asu/issues/22)) ([406f47a](https://github.com/allixsenos/asu/commit/406f47acce526e005c7b4274e60dd04b65a2680e))

## [0.4.0](https://github.com/allixsenos/asu/compare/v0.3.0...v0.4.0) (2026-09-08)


### Features

* **cli:** accept provider names as bare words ([#19](https://github.com/allixsenos/asu/issues/19)) ([2889a28](https://github.com/allixsenos/asu/commit/2889a28c283ff21e1beb1a58a608e28ecaedf7c9))

## [0.3.0](https://github.com/allixsenos/asu/compare/v0.2.1...v0.3.0) (2026-09-08)


### Features

* **cli:** humanize timestamp details and fall back to plain output in narrow terminals ([#13](https://github.com/allixsenos/asu/issues/13)) ([e10f6c1](https://github.com/allixsenos/asu/commit/e10f6c1a73c3038cf157f907bd36d1a7c4e7be50))
* **cli:** show details as table rows and keep the footer for bookkeeping ([#15](https://github.com/allixsenos/asu/issues/15)) ([d6fb9d0](https://github.com/allixsenos/asu/commit/d6fb9d0bfd04708f0c512ea7dca2b7c9fa98ae67))

## [0.2.1](https://github.com/allixsenos/asu/compare/v0.2.0...v0.2.1) (2026-09-08)


### Bug Fixes

* **test:** compare --version with package.json ([#11](https://github.com/allixsenos/asu/issues/11)) ([7971810](https://github.com/allixsenos/asu/commit/797181041c55a84d3bbfd2e318c92d0b5ec8c319))

## [0.2.0](https://github.com/allixsenos/asu/compare/v0.1.0...v0.2.0) (2026-09-08)


### Features

* **cli:** name the calendar day for resets a day or more away ([#10](https://github.com/allixsenos/asu/issues/10)) ([3c9a247](https://github.com/allixsenos/asu/commit/3c9a2475ae32ca141249ac2185bc77a1bcba832d))
* **cli:** show relative times in table and plain output ([#7](https://github.com/allixsenos/asu/issues/7)) ([b3435a7](https://github.com/allixsenos/asu/commit/b3435a704b8cd1cf4005f180883d57584f4b102d))

## 0.1.0 (2026-09-07)


### Features

* **cli:** render plain text tables and JSON reports ([b019412](https://github.com/allixsenos/asu/commit/b01941291ff66fade4279e95f8d607d5305de2d3))
* **core:** define provider contracts and read-only runtime ([71d6e65](https://github.com/allixsenos/asu/commit/71d6e658f578d1eb976cb2b4c526ec9280546622))
* **providers:** add Claude Codex and Copilot usage adapters ([64cbc98](https://github.com/allixsenos/asu/commit/64cbc987d8b18f49290ab0dfaf55b60459b06678))
* **providers:** add experimental subscription adapters ([ad822d6](https://github.com/allixsenos/asu/commit/ad822d6e4d7255606e841ea274149bc9c5ae8ac6))
* **service:** cache usage and deduplicate provider requests ([82a6e00](https://github.com/allixsenos/asu/commit/82a6e00fcd3100d1dc7a53f35aab978e4fea0c11))


### Bug Fixes

* **auth:** continue Keychain fallback after malformed entries ([49d1440](https://github.com/allixsenos/asu/commit/49d1440a98390c8716dba76ff258be55566baf20))

## Changelog

release-please writes this file from the Conventional Commit history. Do not edit the version sections by hand. See [docs/releasing.md](docs/releasing.md).
