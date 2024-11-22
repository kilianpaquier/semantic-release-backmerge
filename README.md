<!-- This file is safe to edit. Once it exists it will not be overwritten. -->

# @kilianpaquier/semantic-release-backmerge <!-- omit in toc -->

<p align="center">
  <img alt="GitHub Release" src="https://img.shields.io/github/v/release/kilianpaquier/semantic-release-backmerge?include_prereleases&sort=semver&style=for-the-badge">
  <img alt="GitHub Issues" src="https://img.shields.io/github/issues-raw/kilianpaquier/semantic-release-backmerge?style=for-the-badge">
  <img alt="GitHub License" src="https://img.shields.io/github/license/kilianpaquier/semantic-release-backmerge?style=for-the-badge">
  <img alt="Coverage" src="https://img.shields.io/codecov/c/github/kilianpaquier/semantic-release-backmerge/main?style=for-the-badge">
</p>

---

A [**semantic-release**](https://github.com/semantic-release/semantic-release) plugin to handle backmerge between branches.

| Step               | Description                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------- |
| `verifyConditions` | Verify the presence of specific plugin configuration alongside required environment variables |
| `success`          | Apply backmerge for the appropriate target branches                                           |

- [How to ?](#how-to-)
- [How does it work ?](#how-does-it-work-)
- [Usage](#usage)
- [Configuration](#configuration)
  - [Templating](#templating)
  - [Maintenance branches](#maintenance-branches)
- [Environment variables](#environment-variables)
  - [Bitbucket (data center/server)](#bitbucket-data-centerserver)
  - [Bitbucket (cloud)](#bitbucket-cloud)
  - [Gitea](#gitea)
  - [Github](#github)
  - [Gitlab](#gitlab)

## How to ?

**bun**

```sh
bun install -D @kilianpaquier/semantic-release-backmerge
```

**npm**

```sh
npm install -D @kilianpaquier/semantic-release-backmerge
```

**pnpm**

```sh
pnpm install -D @kilianpaquier/semantic-release-backmerge
```

**yarn**

```sh
yarn install -D @kilianpaquier/semantic-release-backmerge
```

## How does it work ?

When configured in [targets](#configuration), a provided branch (i.e `main`) can be backmerged in one or multiple others (i.e. `develop`) when a released in made with **semantic-release**.

With the instance of `main` and `develop`, `develop` branch will be check'ed out locally and merged with `git merge <branch> --ff -m <commit_message>`. 
It means that if git can avoid a merge commit, it will avoid it.

In the event of conflicts (it may happen, production fixes could be made to `main` and features developped in `develop`), a pull request is created from `main` to `develop`.

## Usage

This plugin can be configured through the semantic-release [configuration file](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#configuration).

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/git",
    "@semantic-release/github",
    [
      "@kilianpaquier/semantic-release-backmerge",
      {
        "commit": "chore(release): merge branch ${ from } into ${ to } [skip ci]",
        "targets": [
          { "from": "main", "to": "develop" }
          { "from": "main", "to": "staging" }
          { "from": "staging", "to": "develop" }
        ],
        "title": "Automatic merge failure",
      }
    ],
    "@semantic-release/exec",
  ]
}
```

## Configuration

| name            | required | default                                                                                                    | description                                                                                                                                                             |
| --------------- | -------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apiPathPrefix` | Yes      | Guessed in [environment variables](#environment-variables). **Unless `baseUrl`** is specifically provided. | API Prefix for your platform (i.e. `/api/v4` for **gitlab**).                                                                                                           |
| `baseUrl`       | Yes      | Guessed in [environment variables](#environment-variables)                                                 | Platform base URL (i.e. `https://gitlab.com` for **gitlab**).                                                                                                           |
| `checkHasPull`  | No       | `true`                                                                                                     | Whether to check if a pull request already exists between a backmerged branch and the released branch. This check is only made if backmerge with git wasn't successful. |
| `commit`        | No       | `chore(release): merge branch ${ from } into ${ to } [skip ci]`                                            | Merge commit in case the `fast-forward` mode couldn't be done.                                                                                                          |
| `dryRun`        | No       | `--dry-run` option from semantic-release                                                                   | Whether to really push and create pull requests or only log the actions.                                                                                                |
| `platform`      | Yes      | Guessed in [environment variables](#environment-variables). **Unless `baseUrl`** is specifically provided. | Platform name. Either `bitbucket`, `bitbucket-cloud`, `gitea`, `github` or `gitlab`.                                                                                    |
| `targets`       | No       | `[]`                                                                                                       | Backmerge targets, a slice / list of `{ from: <from>, to: <to> }`. `from` and `to` can be regexp like `(develop\|staging)` or `v[0-9]+(.[0-9]+)?`, etc.                 |
| `title`         | No       | `Automatic merge failure`                                                                                  | Pull request title to set when creating pull requests.                                                                                                                  |

### Templating

Configuration `commit` and `title` are templated with `lodash` during backmerge or pull request creation. The following data are available:

| name        | type   | description                                                                                     |
| ----------- | ------ | ----------------------------------------------------------------------------------------------- |
| from        | string | Backmerge source branch.                                                                        |
| to          | string | Backmerge target branch.                                                                        |
| lastRelease | object | Last release with `version`, `gitTag`, `gitHead`, `name`, and `channels` fields.                |
| nextRelease | object | Last release with `version`, `gitTag`, `gitHead`, `name`, `type`, `channel` and `notes` fields. |

### Maintenance branches

In some cases, you may want to maintain multiple maintenance branches associated to the same major version.

In that case, **semantic-release-backmerge** is covering for you. When providing a `from` branch matching a maintenance branch, 
then backmerge will only allow backmerge into more recent maintenance branches (of the same major version):

- `v1` cannot be backmerged
- `v1.6` can be backmerged into `v1.7` (and above) and `v1`
- `v1.x` cannot be backmerged
- `v1.5.x` can be backmerged into `v1.6.x` (and above) and `v1.x`

## Environment variables

When working with specifics git platforms, and as such sometimes with associated CI functionalities, environment variable are by default provided.

For **semantic-release-backmerge** to work flawlessly with your platform, you may provide in the next sections the right environment variables.

To avoid painful configurations, you may use the environments variables to automatically guess `baseUrl`, `apiPathPrefix` and `platform` instead of given them in your configuration file.

### Bitbucket (data center/server)

| variable name                   | description                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `BITBUCKET_URL`                 | Base URL to your **Bitbucket** server                                                                   |
| `BB_TOKEN` or `BITBUCKET_TOKEN` | **Bitbucket** token to push backmerged branches (in case of HTTP(S) connection) or create pull requests |

**Notes:** 

- The Base URL name differs from [Bitbucket (Cloud)](#bitbucket-cloud) because the API endpoints to create pull request aren't the same.
- When `BITBUCKET_URL` is provided, you may omit the following configuration variables:
  - `baseUrl` is given this URL
  - `apiPathPrefix` is given by default `/rest/api/1.0`
  - `platform` is set to `bitbucket`
- Endpoint to create pull requests is `POST {baseUrl}{apiPathPrefix}/projects/{owner}/repos/{name}/pull-requests`
  - Example: `POST https://stash.company.com/rest/api/1.0/projects/kilianpaquier/repos/semantic-release-backmerge/pull-requests`
  - See [documentation](https://developer.atlassian.com/server/bitbucket/rest/v819/api-group-pull-requests/#api-api-latest-projects-projectkey-repos-repositoryslug-pull-requests-post)

### Bitbucket (cloud)

| variable name                   | description                                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `BITBUCKET_CLOUD_URL`           | Base URL to your **Bitbucket** cloud server                                                             |
| `BB_TOKEN` or `BITBUCKET_TOKEN` | **Bitbucket** token to push backmerged branches (in case of HTTP(S) connection) or create pull requests |

**Notes:** 

- The Base URL name differs from [Bitbucket (Data Center/Server)](#bitbucket-data-centerserver) because the API endpoints to create pull request aren't the same.
- When `BITBUCKET_CLOUD_URL` is provided, you may omit the following configuration variables:
  - `baseUrl` is given this URL
  - `apiPathPrefix` is given by default `/2.0`
  - `platform` is set to `bitbucket-cloud`
- Endpoint to create pull requests is `POST {baseUrl}{apiPathPrefix}/repositories/{owner}/{name}/pullrequests`
  - Example: `POST https://company.bitbucket.org/2.0/repositories/kilianpaquier/semantic-release-backmerge/pullrequests`
  - See [documentation](https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pullrequests/#api-repositories-workspace-repo-slug-pullrequests-post)

### Gitea

| variable name | description                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------- |
| `GITEA_URL`   | Base URL to your gitea server                                                                   |
| `GITEA_TOKEN` | Gitea token to push backmerged branches (in case of HTTP(S) connection) or create pull requests |

**Notes:** 

- When `GITEA_URL` is provided, you may omit the following configuration variables:
  - `baseUrl` is given this URL
  - `apiPathPrefix` is given by default `/api/v1`
  - `platform` is set to `gitea`
- Endpoint to create pull requests is `POST {baseUrl}{apiPathPrefix}/repos/{owner}/{name}/pulls`
  - Example: `POST https://company.gitea.com/api/v1/repos/kilianpaquier/semantic-release-backmerge/pulls`
  - See [documentation](https://docs.gitea.com/api/1.22/#tag/repository/operation/repoCreatePullRequest)

### Github

| variable name                                | description                                                                                                                                                                                          |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GH_URL` or `GITHUB_URL` or `GITHUB_API_URL` | Base URL to your github server, note that `GITHUB_API_URL` already exists with [**GitHub** Actions](https://docs.github.com/fr/actions/learn-github-actions/variables#default-environment-variables) |
| `GH_TOKEN` or `GITHUB_TOKEN`                 | **GitHub** token to push backmerged branches (in case of HTTP(S) connection) or create pull requests                                                                                                 |

**Notes:** 

- When `GH_URL` or `GITHUB_URL` or `GITHUB_API_URL` is provided, you may omit the following configuration variables:
  - `baseUrl` is given this URL
  - `apiPathPrefix` is given by default `""`
  - `platform` is set to `github`
- Endpoint to create pull requests is `POST {baseUrl}{apiPathPrefix}/repos/{owner}/{repo}/pulls`
  - Example: `POST https://api.github.com/repos/kilianpaquier/semantic-release-backmerge/pulls`
  - See [documentation](https://docs.github.com/fr/rest/pulls/pulls?apiVersion=2022-11-28#create-a-pull-request)

### Gitlab

| variable name                               | description                                                                                                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GL_URL` or `GITLAB_URL` or `CI_SERVER_URL` | Base URL to your gitlab server, note that `CI_SERVER_URL` already exists with [**GitLab** CICD](https://docs.gitlab.com/ee/ci/variables/predefined_variables.html) |
| `GL_TOKEN` or `GITLAB_TOKEN`                | **GitLab** token to push backmerged branches (in case of HTTP(S) connection) or create pull requests (`api`, `read_repository` and `write_repository` scopes)      |

**Notes:** 

- When `GL_URL` or `GITLAB_URL` or `CI_SERVER_URL` is provided, you may omit the following configuration variables:
  - `baseUrl` is given this URL
  - `apiPathPrefix` is given by default `/api/v4`
  - `platform` is set to `gitlab`
- Endpoint to create pull requests is `POST {baseUrl}{apiPathPrefix}/projects/{uri_encoded({owner}/{repo})}/merge_requests`
  - Example: `POST https://gitlab.company.com/api/v4/projects/kilianpaquier%2Fsemantic-release-backmerge/merge_requests`
  - Example: `POST https://gitlab.company.com/api/v4/projects/kilianpaquier%2Fsubgroup%2Fsemantic-release-backmerge/merge_requests`
  - See [documentation](https://docs.gitlab.com/ee/api/merge_requests.html#create-mr)
