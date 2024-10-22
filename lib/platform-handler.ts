import { Octokit } from "@octokit/core"
import { Platform } from "./models/config"
import { getConfigError } from "./error"

import SemanticReleaseError from "@semantic-release/error"
import debug from "debug"
import urlJoin from "url-join"

const deblog = debug("semantic-release-backmerge:platform-handler")

/**
 * isT checks whether input value is really a T or not.
 * 
 * @param input the input to verify.
 * @param fields the minimal fields to verify.
 * 
 * @returns truthy if input value is really a T.
 */
const isT = <T>(input: any, ...fields: string[]): input is T => {
    const cast = input as T
    for (const field of fields) {
        // @ts-expect-error check struct type fields
        if (typeof cast[field] === "undefined") {
            return false
        }
    }
    return true
}

/**
 * Pull represents a simplified pull request object.
 */
export interface Pull {
    body: string
    from: string
    title: string
    to: string
}

/**
 * PlatformHandler is the minimal interface for semantic-release-backmerge to communicate with a git platform.
 */
export interface PlatformHandler {
    /**
     * createPull creates a pull request for given repository and owner with pull object.
     * 
     * @param owner the repository owner.
     * @param repository the repository name.
     * @param pull the pull object to create.
     * 
     * @throws an error in case the approprite API (depending on git platform) couldn't be called to create the pull request.
     */
    createPull(owner: string, repository: string, pull: Pull): Promise<void>

    /**
     * hasPull checks whether a pull request already exists between from and to with the right direction.
     * 
     * @param owner the repository owner.
     * @param repository the repository name.
     * @param from the source branch of pull request.
     * @param to the target branch of pull request.
     * 
     * @returns a boolean to indicate whether a pull request already exists or not.
     * 
     * @throws an error in case the approprite API (depending on git platform) couldn't be called to list pull requests.
     */
    hasPull(owner: string, repository: string, from: string, to: string): Promise<boolean>

    /**
     * gitUser returns the appropriate username to alter a repository URL for git.
     */
    gitUser(): string
}

class Bitbucket implements PlatformHandler {
    private heads = "refs/heads/"

    private apiUrl: string
    private token: string

    constructor(baseUrl: string, token: string, basePath?: string) {
        this.apiUrl = urlJoin(baseUrl, basePath ?? "/rest/api/1.0")
        this.token = token
        deblog("initialized bitbucket platform handler with URL '%s'", this.apiUrl)
    }

    async createPull(owner: string, repository: string, pull: Pull): Promise<void> {
        // https://developer.atlassian.com/server/bitbucket/rest/v819/api-group-pull-requests/#api-api-latest-projects-projectkey-repos-repositoryslug-pull-requests-post
        const response = await fetch(`${this.apiUrl}/projects/${owner}/repos/${repository}/pull-requests`, {
            body: JSON.stringify({
                description: pull.body,
                fromRef: { id: this.heads + pull.from },
                open: true,
                state: "OPEN",
                title: pull.title,
                toRef: { id: this.heads + pull.to },
            }),
            headers: {
                Authorization: `Bearer ${this.token}`,
                "Content-Type": "application/json",
            },
            method: "POST",
        })
        if (!response.ok) {
            throw new Error(await response.text())
        }
    }

    async hasPull(owner: string, repository: string, from: string, to: string): Promise<boolean> {
        interface resultType {
            isLastPage: boolean
            values: { 
                fromRef: { id: string }
                toRef: { id: string }
            }[]
        }

        const limit = 100
        let start = 0
        let result: resultType = { isLastPage: false, values: [] }
        while (!result.isLastPage) {
            // https://developer.atlassian.com/server/bitbucket/rest/v819/api-group-pull-requests/#api-api-latest-projects-projectkey-repos-repositoryslug-pull-requests-get
            const response = await fetch(
                `${this.apiUrl}/projects/${owner}/repos/${repository}/pull-requests?state=OPEN&at=${this.heads + from}&start=${start}&limit=${limit}`,
                {
                    headers: { Authorization: `Bearer ${this.token}` },
                    method: "GET",
                })
            if (!response.ok) {
                throw new Error(await response.text())
            }
            const json = await response.json()
            if (!isT<resultType>(json, "isLastPage", "values")) {
                throw new Error(await response.text())
            }
            result = json

            // find the appropriate pull request target
            start += result.values.length
            for (const pull of result.values) {
                if (pull.toRef.id === this.heads + to) {
                    return true
                }
            }
        }
        return false // no pull found in all pages
    }

    gitUser(): string {
        return "x-token-auth"
    }
}

class BitbucketCloud implements PlatformHandler {
    private apiUrl: string
    private token: string

    constructor(baseUrl: string, token: string, basePath?: string) {
        this.apiUrl = urlJoin(baseUrl, basePath ?? "/2.0")
        this.token = token
        deblog("initialized bitbucket cloud platform handler with URL '%s'", this.apiUrl)
    }

    async createPull(owner: string, repository: string, pull: Pull): Promise<void> {
        // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pullrequests/#api-repositories-workspace-repo-slug-pullrequests-post
        const response = await fetch(`${this.apiUrl}/repositories/${owner}/${repository}/pullrequests`, {
            body: JSON.stringify({
                description: pull.body,
                destination: { branch: { name: pull.to } },
                source: { branch: { name: pull.from } },
                title: pull.title,
            }),
            headers: {
                Authorization: `Bearer ${this.token}`,
                "Content-Type": "application/json",
            },
            method: "POST",
        })
        if (!response.ok) {
            throw new Error(await response.text())
        }
    }

    async hasPull(owner: string, repository: string, from: string, to: string): Promise<boolean> {
        interface resultType {
            next: string
            values: {
                destination: { branch: { name: string } }
                source: { branch: { name: string } }
            }[]
        }

        let next = `${this.apiUrl}/repositories/${owner}/${repository}/pullrequests?state=OPEN`
        while (next !== "") {
            // https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pullrequests/#api-repositories-workspace-repo-slug-pullrequests-get
            const response = await fetch(next, {
                headers: { Authorization: `Bearer ${this.token}` },
                method: "GET",
            })
            if (!response.ok) {
                throw new Error(await response.text())
            }
            const json = await response.json()
            if (!isT<resultType>(json, "next", "values")) {
                throw new Error(await response.text())
            }
            next = json.next // next is empty when it's the last page

            // find the appropriate pull request target
            for (const pull of json.values) {
                if (pull.source.branch.name === from && pull.destination.branch.name === to) {
                    return true
                }
            }
        }
        return false // no pull found in all pages
    }

    gitUser(): string {
        return "x-token-auth"
    }
}

class Gitea implements PlatformHandler {
    private apiUrl: string
    private token: string

    constructor(baseUrl: string, token: string, basePath?: string) {
        this.apiUrl = urlJoin(baseUrl, basePath ?? "/api/v1")
        this.token = token
        deblog("initialized gitea platform handler with URL '%s'", this.apiUrl)
    }

    async createPull(owner: string, repository: string, pull: Pull): Promise<void> {
        // https://docs.gitea.com/api/1.22/#tag/repository/operation/repoCreatePullRequest
        const response = await fetch(`${this.apiUrl}/repos/${owner}/${repository}/pulls`, {
            body: JSON.stringify({
                base: pull.to,
                body: pull.body,
                head: pull.from,
                title: pull.title,
            }),
            headers: {
                Authorization: `Bearer ${this.token}`,
                "Content-Type": "application/json",
            },
            method: "POST",
        })
        if (!response.ok) {
            throw new Error(await response.text())
        }
    }

    async hasPull(owner: string, repository: string, from: string, to: string): Promise<boolean> {
        // https://docs.gitea.com/api/1.22/#tag/repository/operation/repoGetPullRequestByBaseHead
        const response = await fetch(`${this.apiUrl}/repos/${owner}/${repository}/pulls/${to}/${from}`, {
            headers: { Authorization: `Bearer ${this.token}` },
            method: "GET",
        })
        return response.ok
    }

    gitUser(): string {
        return "gitea-token" // no specific prefix identified
    }
}

class Github implements PlatformHandler {
    private apiUrl: string
    private token: string

    private octokit: Octokit

    constructor(baseUrl: string, token: string, basePath?: string) {
        this.apiUrl = urlJoin(baseUrl, basePath ?? "")
        this.token = token

        // https://octokit.github.io/rest.js/v21/#pulls
        this.octokit = new Octokit({ auth: this.token, request: { fetch } })

        deblog("initialized github platform handler with URL '%s'", this.apiUrl)
    }

    async createPull(owner: string, repository: string, pull: Pull): Promise<void> {
        // https://docs.github.com/fr/rest/pulls/pulls?apiVersion=2022-11-28#create-a-pull-request
        await this.octokit.request("POST /repos/{owner}/{repo}/pulls", {
            base: pull.to,
            baseUrl: this.apiUrl,
            body: pull.body,
            head: pull.from,
            owner,
            repo: repository,
            title: pull.title,
        })
    }

    async hasPull(owner: string, repository: string, from: string, to: string): Promise<boolean> {
        // https://docs.github.com/fr/rest/pulls/pulls?apiVersion=2022-11-28#list-pull-requests
        const response = await this.octokit.request("GET /repos/{owner}/{repo}/pulls", {
            base: to,
            baseUrl: this.apiUrl,
            head: `${owner}:${from}`,
            owner,
            repo: repository,
            state: "open",
        })
        return response.data.length !== 0
    }

    gitUser(): string {
        return "x-access-token"
    }
}

class Gitlab implements PlatformHandler {
    private apiUrl: string
    private token: string

    constructor(baseUrl: string, token: string, basePath?: string) {
        this.apiUrl = urlJoin(baseUrl, basePath ?? "/api/v4")
        this.token = token
        deblog("initialized gitlab platform handler with URL '%s'", this.apiUrl)
    }

    async createPull(owner: string, repository: string, pull: Pull): Promise<void> {
        // https://docs.gitlab.com/ee/api/merge_requests.html#create-mr
        const response = await fetch(`${this.apiUrl}/projects/${encodeURIComponent(`${owner}/${repository}`)}/merge_requests`, {
            body: JSON.stringify({
                description: pull.body,
                source_branch: pull.from,
                target_branch: pull.to,
                title: pull.title,
            }),
            headers: {
                Authorization: `Bearer ${this.token}`,
                "Content-Type": "application/json",
            },
            method: "POST",
        })
        if (!response.ok) {
            throw new Error(await response.text())
        }
    }

    async hasPull(owner: string, repository: string, from: string, to: string): Promise<boolean> {
        // https://docs.gitlab.com/ee/api/merge_requests.html#list-project-merge-requests
        const response = await fetch(
            `${this.apiUrl}/projects/${encodeURIComponent(`${owner}/${repository}`)}/merge_requests?state=opened&target_branch=${to}&source_branch=${from}`, 
            {
                headers: { Authorization: `Bearer ${this.token}` },
                method: "GET",
            })
        if (!response.ok) {
            throw new Error(await response.text())
        }
        const json = await response.json()
        if (!isT<any[]>(json, "length")) {
            throw new Error(await response.text())
        }
        return json.length !== 0
    }

    gitUser(): string {
        return "gitlab-ci-token"
    }
}

/**
 * newPlatformHandler creates the appropriate PlatformHandler depending on input platform and baseUrl.
 * 
 * @param platform an input platform if configured manually.
 * @param baseUrl an input baseUrl if configured manually.
 * @param apiPathPrefix an input apiPathPrefix if configured manually.
 * @param token the token with minimal rights to read pull requests and create ones.
 * @param env the environment variables parse'd by semantic-release.
 * 
 * @returns the appropriate PlatformHandler.
 * 
 * @throws an error in case the input platform is invalid or not platform couldn't be guessed from environment variables.
 */
export const newPlatformHandler = (platform: Platform, baseUrl: string, apiPathPrefix: string, token: string, env: Record<string, string>): PlatformHandler => {
    // only use baseUrl with platform when provided by developer in plugin configuration
    if (platform !== Platform.NULL && baseUrl !== "") {
        switch (platform) {
            case Platform.BITBUCKET:
                return new Bitbucket(baseUrl, token, apiPathPrefix)
            case Platform.BITBUCKET_CLOUD:
                return new BitbucketCloud(baseUrl, token, apiPathPrefix)
            case Platform.GITEA:
                return new Gitea(baseUrl, token, apiPathPrefix)
            case Platform.GITHUB:
                return new Github(baseUrl, token, apiPathPrefix)
            case Platform.GITLAB:
                return new Gitlab(baseUrl, token, apiPathPrefix)
            default:
                throw getConfigError("platform", platform)
        }
    }

    // bitbucket
    if (env.BITBUCKET_URL) {
        return new Bitbucket(env.BITBUCKET_URL, token, apiPathPrefix)
    }

    // bitbucket cloud
    if (env.BITBUCKET_CLOUD_URL) {
        return new BitbucketCloud(env.BITBUCKET_CLOUD_URL, token, apiPathPrefix)
    }

    // gitea
    if (env.GITEA_URL) {
        return new Gitea(env.GITEA_URL, token, apiPathPrefix)
    }

    // github
    const githubUrl = env.GH_URL ?? env.GITHUB_URL ?? env.GITHUB_API_URL
    if (githubUrl) {
        return new Github(githubUrl, token, apiPathPrefix)
    }

    // gitlab
    const gitlabUrl = env.GL_URL ?? env.GITLAB_URL ?? env.CI_SERVER_URL
    if (gitlabUrl) {
        return new Gitlab(gitlabUrl, token, apiPathPrefix)
    }

    throw new SemanticReleaseError("Failed to guess git platform, no appropriate environment variable found.", "EPLATFORM")
}

/**
 * token returns the first available token depending on used CI from environment variables.
 * 
 * @param env the environment variables containing the appropriate token variable.
 * 
 * @returns the token.
 */
export const token = (env: Record<string, string>): string =>
    // checking all environment variables since it doesn't matter which is valued whatever the platform could be
    env.BB_TOKEN ?? env.BITBUCKET_TOKEN ?? env.GITEA_TOKEN ?? env.GH_TOKEN ?? env.GITHUB_TOKEN ?? env.GL_TOKEN ?? env.GITLAB_TOKEN ?? ""