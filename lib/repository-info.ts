import { type BackmergeConfig, Platform, type RepositoryInfo } from "./models/config"
import { getConfigError, getEnvError } from "./error"

import SemanticReleaseError from "@semantic-release/error"
import escapeStringRegexp from "escape-string-regexp"
import parseUrl from "parse-url"

import { type VerifyConditionsContext } from "semantic-release"

interface RepositoryInfoResult {
    info?: RepositoryInfo
    errors: SemanticReleaseError[]
}

const getBitbucketInfo = (context: Partial<VerifyConditionsContext>, repositoryUrl: string): RepositoryInfoResult => {
    const errors: SemanticReleaseError[] = []

    const apiUrl = context.env?.BITBUCKET_API_URL
    if (!apiUrl) {
        errors.push(getEnvError("BITBUCKET_API_URL"))
    }

    const token = context.env?.BB_TOKEN ?? context.env?.BITBUCKET_TOKEN
    if (!token) {
        errors.push(getEnvError("BITBUCKET_TOKEN"))
    }

    // retrieved from https://github.com/semantic-release/github/blob/master/lib/parse-github-url.js
    const parseBitbucketURL = (): Partial<RepositoryInfo> => {
        const [match, auth, host, path] = /^(?!.+:\/\/)(?:(?<auth>.*)@)?(?<host>.*?):(?<path>.*)$/.exec(repositoryUrl) ?? []
        try {
            const url = new URL(match ? `ssh://${auth ? `${auth}@` : ""}${host}/${path}` : repositoryUrl)
            const [, owner, repo] = /^\/(?<owner>[^/]+)?\/?(?<repo>.+?)(?:\.git)?$/.exec(url.pathname) ?? []
            return { owner, repo }
        } catch {
            return {}
        }
    }
    const info = parseBitbucketURL()

    const owner = context.env?.BITBUCKET_WORKSPACE ?? info.owner
    const repo = context.env?.BITBUCKET_REPO_SLUG ?? info.repo
    if (!owner || owner === "" || !repo || repo === "") {
        errors.push(getConfigError("repositoryUrl"))
    }
    return { errors, info: { apiUrl, owner, repo, token } }
}

const getGithubInfo = (context: Partial<VerifyConditionsContext>, repositoryUrl: string): RepositoryInfoResult => {
    const errors: SemanticReleaseError[] = []

    const apiUrl = context.env?.GITHUB_API_URL
    if (!apiUrl) {
        errors.push(getEnvError("GITHUB_API_URL"))
    }

    const token = context.env?.GH_TOKEN ?? context.env?.GITHUB_TOKEN
    if (!token) {
        errors.push(getEnvError("GITHUB_TOKEN"))
    }

    // retrieved from https://github.com/semantic-release/github/blob/master/lib/parse-github-url.js
    const parseGithubURL = (): Partial<RepositoryInfo> => {
        const [match, auth, host, path] = /^(?!.+:\/\/)(?:(?<auth>.*)@)?(?<host>.*?):(?<path>.*)$/.exec(repositoryUrl) ?? []
        try {
            const url = new URL(match ? `ssh://${auth ? `${auth}@` : ""}${host}/${path}` : repositoryUrl)
            const [, owner, repo] = /^\/(?<owner>[^/]+)?\/?(?<repo>.+?)(?:\.git)?$/.exec(url.pathname) ?? []
            return { owner, repo }
        } catch {
            return {}
        }
    }
    const info = parseGithubURL()

    const owner = context.env?.GITHUB_REPOSITORY_OWNER ?? info.owner
    const repository = context.env?.GITHUB_REPOSITORY
    const repo = repository ? repository.replace(`${owner}/`, "") : info.repo
    if (!owner || owner === "" || !repo || repo === "") {
        errors.push(getConfigError("repositoryUrl"))
    }
    return { errors, info: { apiUrl, owner, repo, token } }
}

const getGitlabInfo = (context: Partial<VerifyConditionsContext>, repositoryUrl: string): RepositoryInfoResult => {
    const errors: SemanticReleaseError[] = []

    const apiUrl = context.env?.CI_API_V4_URL ?? context.env?.GITLAB_API_URL
    if (!apiUrl) {
        errors.push(getEnvError("GITLAB_API_URL"))
    }

    const gitlabUrl = context.env?.CI_SERVER_URL ?? context.env?.GITLAB_URL
    if (!gitlabUrl) {
        errors.push(getEnvError("GITLAB_URL"))
    }

    const token = context.env?.GL_TOKEN ?? context.env?.GITLAB_TOKEN
    if (!token) {
        errors.push(getEnvError("GITLAB_TOKEN"))
    }

    // retrieved from https://github.com/semantic-release/gitlab/blob/master/lib/get-repo-id.js
    const parseGitlabURL = (): string => {
        try {
            return parseUrl(repositoryUrl).pathname.
                replace(new RegExp(`^${escapeStringRegexp(parseUrl(gitlabUrl ?? "").pathname)}`), "").
                replace(/^\//, "").
                replace(/\/$/, "").
                replace(/\.git$/, "")
        } catch (error) {
            return ""
        }
    }

    // projectID is either the real project id number like 1560637 (available in gitlab UI or CI variables)
    // or the full path (later URI encoded in case of pull request creation) to the project like kilianpaquier/semantic-release-backmerge
    const projectID = context.env?.CI_PROJECT_ID ?? parseGitlabURL()
    if (projectID === "") {
        errors.push(getConfigError("repositoryUrl"))
    }

    return { errors, info: { apiUrl, repo: projectID, token } }
}

export const repositoryInfo = (context: Partial<VerifyConditionsContext>, config: BackmergeConfig): RepositoryInfoResult => {
    switch (config.platform) {
        case Platform.BITBUCKET:
            return getBitbucketInfo(context, config.repositoryUrl)
        case Platform.GITHUB:
            return getGithubInfo(context, config.repositoryUrl)
        case Platform.GITLAB:
            return getGitlabInfo(context, config.repositoryUrl)
        default:
            // shouldn't happen since config is validated beforehand
            return { errors: [getConfigError("platform", config.platform)] }
    }
}