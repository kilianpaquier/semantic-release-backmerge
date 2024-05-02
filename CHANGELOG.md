## [1.0.0-alpha.10](https://github.com/kilianpaquier/semantic-release-backmerge/compare/v1.0.0-alpha.9...v1.0.0-alpha.10) (2024-05-02)


### Bug Fixes

* **auth modificator:** add test around port and add replacer in case an user is already in parsed url ([f22477a](https://github.com/kilianpaquier/semantic-release-backmerge/commit/f22477a2f11374ba8074ddc1a82786a1eaa56aa6))

## [1.0.0-alpha.9](https://github.com/kilianpaquier/semantic-release-backmerge/compare/v1.0.0-alpha.8...v1.0.0-alpha.9) (2024-05-02)


### Bug Fixes

* **branches:** bad split when multiple branches are returned by ls-remote ([9053d32](https://github.com/kilianpaquier/semantic-release-backmerge/commit/9053d32b629a172a3929a67a0959b3824647dac3))

## [1.0.0-alpha.8](https://github.com/kilianpaquier/semantic-release-backmerge/compare/v1.0.0-alpha.7...v1.0.0-alpha.8) (2024-05-02)


### Code Refactoring

* **repository url:** rework parsing and add auth modificator to ensure git push works ([6438240](https://github.com/kilianpaquier/semantic-release-backmerge/commit/643824033e65e47d6a912423adc0553648c73d62))

## [1.0.0-alpha.7](https://github.com/kilianpaquier/semantic-release-backmerge/compare/v1.0.0-alpha.6...v1.0.0-alpha.7) (2024-05-02)


### Bug Fixes

* **pr:** add content type to post pull request ([bf0d25c](https://github.com/kilianpaquier/semantic-release-backmerge/commit/bf0d25cbffa2479cc9ce27a50151d21ccbab2637))

## [1.0.0-alpha.6](https://github.com/kilianpaquier/semantic-release-backmerge/compare/v1.0.0-alpha.5...v1.0.0-alpha.6) (2024-05-02)


### Bug Fixes

* **pr:** handle response from API as error when it's not ok by fetch ([3fe7730](https://github.com/kilianpaquier/semantic-release-backmerge/commit/3fe7730c3d27c8e39531211b462f6b9f3de63d7f))

## [1.0.0-alpha.5](https://github.com/kilianpaquier/semantic-release-backmerge/compare/v1.0.0-alpha.4...v1.0.0-alpha.5) (2024-05-02)


### Bug Fixes

* **config:** add env to ensure default function ([64d4c0d](https://github.com/kilianpaquier/semantic-release-backmerge/commit/64d4c0da690ea92359da2607013756035a81ed73))

## [1.0.0-alpha.4](https://github.com/kilianpaquier/semantic-release-backmerge/compare/v1.0.0-alpha.3...v1.0.0-alpha.4) (2024-05-02)


### Bug Fixes

* **push:** push to repository url and not just push ([569ebb0](https://github.com/kilianpaquier/semantic-release-backmerge/commit/569ebb02e59d71a531f0921645d4c0c5f3ea6624))


### Code Refactoring

* **env:** load env values directly in config verification to guess platform and allow some overrides via config ([059e823](https://github.com/kilianpaquier/semantic-release-backmerge/commit/059e823d0395e3122d1add7972f9f567f29698df))

## [1.0.0-alpha.3](https://github.com/kilianpaquier/semantic-release-backmerge/compare/v1.0.0-alpha.2...v1.0.0-alpha.3) (2024-05-01)


### Documentation

* **readme:** initialize readme ([7fbf413](https://github.com/kilianpaquier/semantic-release-backmerge/commit/7fbf413d94ecf92a3322103ae1f760558a21872e))

## [1.0.0-alpha.2](https://github.com/kilianpaquier/semantic-release-backmerge/compare/v1.0.0-alpha.1...v1.0.0-alpha.2) (2024-05-01)


### Bug Fixes

* **ci:** add artifact upload after node-build on release workflow ([b691b62](https://github.com/kilianpaquier/semantic-release-backmerge/commit/b691b62a8513f3de7e38dd138aee106e337aeb29))
* **ci:** ensure index.js' path is define in package.json ([7119b71](https://github.com/kilianpaquier/semantic-release-backmerge/commit/7119b71bababdb2836d4cdb0ffe21e746e8b239f))

## 1.0.0-alpha.1 (2024-04-30)


### Features

* add backmerge feature ([d3ad15c](https://github.com/kilianpaquier/semantic-release-backmerge/commit/d3ad15c52b0b9af75f75dd985f593c26d21b7827))


### Chores

* **e2e:** remove specific test ([d92f0f6](https://github.com/kilianpaquier/semantic-release-backmerge/commit/d92f0f647f621b6e47a3dc08020836bea6976ebd))
* init project with README ([49eeddf](https://github.com/kilianpaquier/semantic-release-backmerge/commit/49eeddf7abb83571dd9c8ed71bec5a765929da56))
