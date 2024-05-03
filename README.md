<!-- This file is safe to edit. Once it exists it will not be overwritten. -->

# @kilianpaquier/semantic-release-backmerge <!-- omit in toc -->

<p align="center">
  <img alt="GitHub Actions" src="https://img.shields.io/github/actions/workflow/status/kilianpaquier/semantic-release-backmerge/integration.yml?branch=main&style=for-the-badge">
  <img alt="GitHub Release" src="https://img.shields.io/github/v/release/kilianpaquier/semantic-release-backmerge?include_prereleases&sort=semver&style=for-the-badge">
  <img alt="GitHub Issues" src="https://img.shields.io/github/issues-raw/kilianpaquier/semantic-release-backmerge?style=for-the-badge">
</p>

---

A [semantic-release](https://github.com/semantic-release/semantic-release) plugin to handle backmerge between branches (works on github, gitlab and bitbucket).

| Step               | Description                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------- |
| `verifyConditions` | Verify the presence of specific plugin configuration alongside required environment variables |
| `success`          | Apply backmerge for the appropriate target branches                                           |

- [How to ?](#how-to-)
- [Usage](#usage)
- [Configuration](#configuration)
  - [Shared configuration](#shared-configuration)
  - [Github](#github)
  - [Gitlab](#gitlab)
  - [Bitbucket](#bitbucket)

## How to ?

```sh
npm install -D @kilianpaquier/semantic-release-backmerge
```

## Usage

This plugin can be configured through the semantic-release [configuration file](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#configuration).

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    [
      "@kilianpaquier/semantic-release-backmerge",
      {
        "commit": "chore(release): merge branch $from into $to [skip ci]",
        "targets": [
          { "from": "main", "to": "develop" }
          { "from": "main", "to": "staging" }
          { "from": "staging", "to": "develop" }
        ],
        "title": "Automatic merge failure"
      }
    ]
  ]
}
```

## Configuration

### Shared configuration

### Github

### Gitlab

### Bitbucket