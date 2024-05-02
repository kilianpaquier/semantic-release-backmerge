import { type BackmergeConfig, Platform, type RepositoryInfo } from "./models/config"

import SemanticReleaseError from "@semantic-release/error"
import escapeStringRegexp from "escape-string-regexp"
import parseUrl from "parse-url"

import { getConfigError } from "./error"

// retrieved from https://github.com/semantic-release/github/blob/master/lib/parse-github-url.js
const parseRepositoryUrl = (repositoryUrl: string): Partial<RepositoryInfo> => {
    const [match, auth, host, path] = /^(?!.+:\/\/)(?:(?<auth>.*)@)?(?<host>.*?):(?<path>.*)$/.exec(repositoryUrl) ?? []
    try {
        const url = new URL(match ? `ssh://${auth ? `${auth}@` : ""}${host}/${path}` : repositoryUrl)
        const [, owner, repo] = /^\/(?<owner>[^/]+)?\/?(?<repo>.+?)(?:\.git)?$/.exec(url.pathname) ?? []
        return { owner, repo }
    } catch {
        return {}
    }
}

const getBitbucketInfo = (repositoryUrl: string, env?: Record<string, string>): [RepositoryInfo | undefined, SemanticReleaseError[]] => {
    const errors: SemanticReleaseError[] = []

    const info = parseRepositoryUrl(repositoryUrl)

    const owner = env?.BITBUCKET_WORKSPACE ?? info.owner
    const repo = env?.BITBUCKET_REPO_SLUG ?? info.repo
    if (!owner || owner === "" || !repo || repo === "") {
        errors.push(getConfigError("repositoryUrl"))
    }

    if (errors.length > 0) {
        return [, errors]
    }
    return [{ owner: owner!, repo: repo! }, []]
}

const getGiteaInfo = (repositoryUrl: string): [RepositoryInfo | undefined, SemanticReleaseError[]] => {
    const errors: SemanticReleaseError[] = []

    const { owner, repo } = parseRepositoryUrl(repositoryUrl)
    if (!owner || owner === "" || !repo || repo === "") {
        errors.push(getConfigError("repositoryUrl"))
    }

    if (errors.length > 0) {
        return [, errors]
    }
    return [{ owner: owner!, repo: repo! }, []]
}

const getGithubInfo = (repositoryUrl: string, env?: Record<string, string>): [RepositoryInfo | undefined, SemanticReleaseError[]] => {
    const errors: SemanticReleaseError[] = []

    const info = parseRepositoryUrl(repositoryUrl)

    const owner = env?.GITHUB_REPOSITORY_OWNER ?? info.owner
    const repository = env?.GITHUB_REPOSITORY
    const repo = repository ? repository.replace(`${owner}/`, "") : info.repo
    if (!owner || owner === "" || !repo || repo === "") {
        errors.push(getConfigError("repositoryUrl"))
    }

    if (errors.length > 0) {
        return [, errors]
    }
    return [{ owner: owner!, repo: repo! }, []]
}

const getGitlabInfo = (repositoryUrl: string, baseUrl: string, env?: Record<string, string>): [RepositoryInfo | undefined, SemanticReleaseError[]] => {
    const errors: SemanticReleaseError[] = []

    // retrieved from https://github.com/semantic-release/gitlab/blob/master/lib/get-repo-id.js
    const parseGitlabURL = (): string => {
        try {
            return parseUrl(repositoryUrl).pathname.
                replace(new RegExp(`^${escapeStringRegexp(parseUrl(baseUrl ?? "").pathname)}`), "").
                replace(/^\//, "").
                replace(/\/$/, "").
                replace(/\.git$/, "")
        } catch (error) {
            return ""
        }
    }

    // projectID is either the real project id number like 1560637 (available in gitlab UI or CI variables)
    // or the full path (later URI encoded in case of pull request creation) to the project like kilianpaquier/semantic-release-backmerge
    const projectID = env?.CI_PROJECT_ID ?? parseGitlabURL()
    if (projectID === "") {
        errors.push(getConfigError("repositoryUrl"))
    }

    if (errors.length > 0) {
        return [, errors]
    }
    return [{ owner: "", repo: projectID }, []]
}

export const repositoryInfo = (config: BackmergeConfig, env?: Record<string, string>): [RepositoryInfo | undefined, SemanticReleaseError[]] => {
    switch (config.platform) {
        case Platform.BITBUCKET:
        case Platform.BITBUCKET_CLOUD:
            return getBitbucketInfo(config.repositoryUrl, env)
        case Platform.GITEA:
            return getGiteaInfo(config.repositoryUrl)
        case Platform.GITHUB:
            return getGithubInfo(config.repositoryUrl, env)
        case Platform.GITLAB:
            return getGitlabInfo(config.repositoryUrl, config.baseUrl, env)
        default:
            // shouldn't happen since config is validated beforehand
            return [, [getConfigError("platform", config.platform)]]
    }
}