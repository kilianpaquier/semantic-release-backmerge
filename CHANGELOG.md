## [1.0.0-beta.6](https://github.com/kilianpaquier/semantic-release-backmerge/compare/v1.0.0-beta.5...v1.0.0-beta.6) (2024-05-03)


### Bug Fixes

* **fetch:** try to fetch all remotes to confirm missing commit from @esemantic-release/git ([1681f6c](https://github.com/kilianpaquier/semantic-release-backmerge/commit/1681f6c161e4b78284acdc38e4fcde4e97877dda))

## [1.0.0-beta.5](https://github.com/kilianpaquier/semantic-release-backmerge/compare/v1.0.0-beta.4...v1.0.0-beta.5) (2024-05-03)


### Bug Fixes

* **checkout:** try to checkout branch guessing it already exist before checkout with creation mode ([ed0e836](https://github.com/kilianpaquier/semantic-release-backmerge/commit/ed0e83625cdf33cd2f0fdb2b040a1d196902873c))


### Reverts

* "fix(merge): remove checkout of released branch" ([9500819](https://github.com/kilianpaquier/semantic-release-backmerge/commit/9500819fed0e5b5c3633d00ed2a743c99cdaf8cb))

## [1.0.0-beta.4](https://github.com/kilianpaquier/semantic-release-backmerge/compare/v1.0.0-beta.3...v1.0.0-beta.4) (2024-05-03)


### Bug Fixes

* **merge:** remove checkout of released branch ([737ba6e](https://github.com/kilianpaquier/semantic-release-backmerge/commit/737ba6eff2b837c3acff15dde8473d5494fea35c))

## [1.0.0-beta.3](https://github.com/kilianpaquier/semantic-release-backmerge/compare/v1.0.0-beta.2...v1.0.0-beta.3) (2024-05-03)


### Bug Fixes

* **merge:** try to find missing commit from @semantic-release/git ([c6415f6](https://github.com/kilianpaquier/semantic-release-backmerge/commit/c6415f6e040c54e8122a9b0a90f1b588e3b55bba))

## [1.0.0-beta.2](https://github.com/kilianpaquier/semantic-release-backmerge/compare/v1.0.0-beta.1...v1.0.0-beta.2) (2024-05-03)


### Chores

* **deps:** update lockb ([cce20a2](https://github.com/kilianpaquier/semantic-release-backmerge/commit/cce20a208f7c31ffb52eb922d6ceee7c73ad2ec3))
* **deps:** upgrade to bun 1.1.7 ([d6d85d9](https://github.com/kilianpaquier/semantic-release-backmerge/commit/d6d85d968bc8900fb5bf99db48b76be68e918d47))


### Code Refactoring

* rework the whole plugin with separated functions, jsdoc, etc. ([1ad6bba](https://github.com/kilianpaquier/semantic-release-backmerge/commit/1ad6bbac2c2cfe1f1fdbcc1cc7b7df3866f4a36d))

## 1.0.0-beta.1 (2024-05-02)


### Features

* add backmerge feature ([d3ad15c](https://github.com/kilianpaquier/semantic-release-backmerge/commit/d3ad15c52b0b9af75f75dd985f593c26d21b7827))


### Bug Fixes

* **auth modificator:** add test around port and add replacer in case an user is already in parsed url ([f22477a](https://github.com/kilianpaquier/semantic-release-backmerge/commit/f22477a2f11374ba8074ddc1a82786a1eaa56aa6))
* **branches:** bad split when multiple branches are returned by ls-remote ([9053d32](https://github.com/kilianpaquier/semantic-release-backmerge/commit/9053d32b629a172a3929a67a0959b3824647dac3))
* **ci:** add artifact upload after node-build on release workflow ([b691b62](https://github.com/kilianpaquier/semantic-release-backmerge/commit/b691b62a8513f3de7e38dd138aee106e337aeb29))
* **ci:** ensure index.js' path is define in package.json ([7119b71](https://github.com/kilianpaquier/semantic-release-backmerge/commit/7119b71bababdb2836d4cdb0ffe21e746e8b239f))
* **config:** add env to ensure default function ([64d4c0d](https://github.com/kilianpaquier/semantic-release-backmerge/commit/64d4c0da690ea92359da2607013756035a81ed73))
* **merge:** execute merge with local version fo 'from' branch in case @semantic-release/git is used ([8fd2afb](https://github.com/kilianpaquier/semantic-release-backmerge/commit/8fd2afbd5d66c6c251608d259b5c973eddb9e2a3))
* **pr:** add content type to post pull request ([bf0d25c](https://github.com/kilianpaquier/semantic-release-backmerge/commit/bf0d25cbffa2479cc9ce27a50151d21ccbab2637))
* **pr:** handle response from API as error when it's not ok by fetch ([3fe7730](https://github.com/kilianpaquier/semantic-release-backmerge/commit/3fe7730c3d27c8e39531211b462f6b9f3de63d7f))
* **push:** push to repository url and not just push ([569ebb0](https://github.com/kilianpaquier/semantic-release-backmerge/commit/569ebb02e59d71a531f0921645d4c0c5f3ea6624))


### Documentation

* **readme:** initialize readme ([7fbf413](https://github.com/kilianpaquier/semantic-release-backmerge/commit/7fbf413d94ecf92a3322103ae1f760558a21872e))


### Chores

* **config:** remove useless ci field ([4225dca](https://github.com/kilianpaquier/semantic-release-backmerge/commit/4225dca2675bfa58044684ca3b05b27f4a1d4709))
* **e2e:** remove specific test ([d92f0f6](https://github.com/kilianpaquier/semantic-release-backmerge/commit/d92f0f647f621b6e47a3dc08020836bea6976ebd))
* init project with README ([49eeddf](https://github.com/kilianpaquier/semantic-release-backmerge/commit/49eeddf7abb83571dd9c8ed71bec5a765929da56))
* **merge:** remove useless reset hard before opening pull request ([f611911](https://github.com/kilianpaquier/semantic-release-backmerge/commit/f61191143a98b4749174f6dfa0cdce9a445e1d06))
* **release:** v1.0.0-alpha.1 [skip ci] ([668f6fc](https://github.com/kilianpaquier/semantic-release-backmerge/commit/668f6fc8dd53d149484cc40999dbb33724551950))
* **release:** v1.0.0-alpha.10 [skip ci] ([73be721](https://github.com/kilianpaquier/semantic-release-backmerge/commit/73be721c3516952adb619d1950d313e61b8c977f))
* **release:** v1.0.0-alpha.2 [skip ci] ([f1af173](https://github.com/kilianpaquier/semantic-release-backmerge/commit/f1af17311b94256bca55ae6c5840cb141c60c4c5))
* **release:** v1.0.0-alpha.3 [skip ci] ([2bbd0c5](https://github.com/kilianpaquier/semantic-release-backmerge/commit/2bbd0c52dcaac85c81132a2895e0c0e3091b9602))
* **release:** v1.0.0-alpha.4 [skip ci] ([cd58162](https://github.com/kilianpaquier/semantic-release-backmerge/commit/cd581624fe8a9bee034b64524be0f1600e1d2a7f))
* **release:** v1.0.0-alpha.5 [skip ci] ([1e76bf0](https://github.com/kilianpaquier/semantic-release-backmerge/commit/1e76bf035fe610ee8cfe773225d0cee2076a7c74))
* **release:** v1.0.0-alpha.6 [skip ci] ([05af748](https://github.com/kilianpaquier/semantic-release-backmerge/commit/05af748ea3579c6c981a73ab1345418a18b121d4))
* **release:** v1.0.0-alpha.7 [skip ci] ([140406f](https://github.com/kilianpaquier/semantic-release-backmerge/commit/140406f3d9589afeba3fa96f24fd86e745627ff0))
* **release:** v1.0.0-alpha.8 [skip ci] ([4ac3833](https://github.com/kilianpaquier/semantic-release-backmerge/commit/4ac3833e4ef55196a1e4012a9d03877b9cf921bf))
* **release:** v1.0.0-alpha.9 [skip ci] ([f725b11](https://github.com/kilianpaquier/semantic-release-backmerge/commit/f725b118467f0ea9c19d6c70d105d5b97976d465))


### Code Refactoring

* **env:** load env values directly in config verification to guess platform and allow some overrides via config ([059e823](https://github.com/kilianpaquier/semantic-release-backmerge/commit/059e823d0395e3122d1add7972f9f567f29698df))
* **repository url:** rework parsing and add auth modificator to ensure git push works ([6438240](https://github.com/kilianpaquier/semantic-release-backmerge/commit/643824033e65e47d6a912423adc0553648c73d62))

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
