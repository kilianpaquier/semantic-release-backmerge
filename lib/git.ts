import { type BackmergeConfig, Platform, interpolate } from "./models/config"
import { type ExecaReturnValue, type Options, type SyncOptions, execa } from "execa"

import SemanticReleaseError from "@semantic-release/error"
import fetch from "node-fetch"

import { type GitUrl } from "git-url-parse"
import { Octokit } from "octokit"
import { type VerifyConditionsContext } from "semantic-release"
import { authModificator } from "./auth-modificator"
import { getConfigError } from "./error"

const remote = "origin"

export const git = async (args?: string[], options?: Options): Promise<ExecaReturnValue<string>> => {
    const result = await execa("git", args, options)
    return result
}

export const gitBranches = async (context: Partial<VerifyConditionsContext>): Promise<string[]> => {
    const options: SyncOptions = { cwd: context.cwd, env: context.env }

    try {
        const branches = await git(["ls-remote", "--heads", remote], options)
        return branches.stdout.toString().
            split("\n").
            map(branch => branch.split("\t")).
            flat().
            filter(branch => branch.startsWith("refs/heads/")).
            map(branch => branch.replace("refs/heads/", ""))
    } catch (error) {
        context.logger?.error("Failed to retrieve branches.", error)
        return []
    }
}

export const createPullRequest = async (config: BackmergeConfig, info: GitUrl, from: string, to: string): Promise<SemanticReleaseError | void> => {
    const apiUrl = config.baseUrl + config.apiPathPrefix

    const handleFetch = async (url: string, body: any): Promise<SemanticReleaseError | void> => {
        try {
            const response = await fetch(url, {
                body: JSON.stringify(body),
                headers: {
                    Authorization: `Bearer ${config.token}`,
                    "Content-Type": "application/json",
                },
                method: "POST",
            })
            if (!response.ok) {
                throw new Error(await response.text())
            }
        } catch (error) {
            return new SemanticReleaseError(`Failed to create pull request from '${remote}/${from}' into '${remote}/${to}'.`, "EPULLREQUEST", String(error))
        }
        return Promise.resolve()
    }

    switch (config.platform) {
        case Platform.BITBUCKET_CLOUD:
            return handleFetch(`${apiUrl}/repositories/${info.owner}/${info.name}/pullrequests`, {
                destination: { branch: { name: to } },
                source: { branch: { name: from } },
                title: config.title,
            })
        case Platform.BITBUCKET:
            return handleFetch(`${apiUrl}/projects/${info.owner}/repos/${info.name}/pull-requests`, {
                fromRef: { id: `refs/heads/${from}` },
                open: true,
                state: "OPEN",
                title: config.title,
                toRef: { id: `refs/heads/${to}` },
            })
        case Platform.GITEA:
            return handleFetch(`${apiUrl}/repos/${info.owner}/${info.name}/pulls`, {
                base: to,
                head: from,
                title: config.title,
            })
        case Platform.GITHUB:
            try {
                await new Octokit({ auth: config.token, request: { fetch } }).
                    request("POST /repos/{owner}/{repo}/pulls", {
                        base: to,
                        baseUrl: apiUrl,
                        head: from,
                        owner: info.owner,
                        repo: info.name,
                        title: config.title,
                    })
            } catch (error) {
                return new SemanticReleaseError(`Failed to create pull request from '${remote}/${from}' into '${remote}/${to}'.`, "EPULLREQUEST", String(error))
            }
            break
        case Platform.GITLAB:
            return handleFetch(`${apiUrl}/projects/${encodeURIComponent(`${info.owner}/${info.name}`)}/merge_requests`, {
                source_branch: from,
                target_branch: to,
                title: config.title,
            })
        default:
            return getConfigError("platform", config.platform) // shouldn't happen since config is validated beforehand
    }
    return Promise.resolve()
}

export const mergeBranch = async (context: Partial<VerifyConditionsContext>, config: BackmergeConfig, info: GitUrl, from: string, to: string): Promise<SemanticReleaseError | void> => {
    const options: SyncOptions = { cwd: context.cwd, env: context.env }

    try {
        await git(["checkout", "-B", to, `${remote}/${to}`], options)
    } catch (error) {
        return new SemanticReleaseError(`Failed to checkout branch '${to}' from '${remote}/${to}'.`, "ECHECKOUT", String(error))
    }

    const commit = interpolate(config.commit, { from, to })
    try {
        // don't merge with remote part because there's potentiallement a local commit 
        await git(["merge", `${from}`, "--ff", "-m", commit], options)
    } catch (mergeError) {
        context.logger?.error("Merge conflicts detected! Creating a pull request.", mergeError)

        try {
            await git(["merge", "--abort"], options)
        } catch (abortError) {
            return new SemanticReleaseError("Failed to abort merge before creating pull request.", "EMERGEABORT", String(abortError))
        }

        if (config.dryRun) {
            context.logger?.log(`Running with --dry-run, created pull request would have been from '${from}' into '${to}' with title '${commit}'.`)
            return Promise.resolve()
        }
        return await createPullRequest(config, info, from, to)
    }

    const push = ["push", authModificator(info, config.platform, config.token)]
    if (config.dryRun) {
        context.logger?.log(`Running with --dry-run, push from '${from}' into '${to}' with commit '${commit}' will not update ${remote}.`)
        push.push("--dry-run")
    }

    try {
        await git(push, options)
    } catch (pushError) {
        context.logger?.error(`Failed to backmerge '${from}' into '${to}' with a push, opening pull request.`, pushError)
        if (config.dryRun) {
            context.logger?.log(`Running with --dry-run, created pull request would have been from '${from}' into '${to}' with title '${commit}'.`)
            return Promise.resolve()
        }
        return await createPullRequest(config, info, from, to)
    }
    return Promise.resolve()
}
