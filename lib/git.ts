import { type BackmergeConfig, Platform, type RepositoryInfo, interpolate } from "./models/config"
import { type ExecaReturnValue, type Options, type SyncOptions, execa } from "execa"

import SemanticReleaseError from "@semantic-release/error"
import fetch from "node-fetch"

import { Octokit } from "octokit"
import { type VerifyConditionsContext } from "semantic-release"
import { getConfigError } from "./error"

const remote = "origin"

export const git = async (args?: string[], options?: Options): Promise<ExecaReturnValue<string>> => {
    const result = await execa("git", args, options)
    return result
}

export const branchesByGlob = async (context: Partial<VerifyConditionsContext>, glob: string): Promise<string[]> => {
    const options: SyncOptions = { cwd: context.cwd, env: context.env }

    try {
        const branches = await git(["ls-remote", "--heads", remote, `refs/heads/${glob}`], options)
        return branches.stdout.toString().
            trimEnd().
            split("\t").
            filter(branch => branch.startsWith("refs/heads/")).
            map(branch => branch.replace("refs/heads/", ""))
    } catch (error) {
        context.logger?.error(`Failed to retrieve branches with glob '${glob}'`, error)
        return []
    }
}


export const createPullRequest = async (config: BackmergeConfig, info: RepositoryInfo, from: string, to: string): Promise<SemanticReleaseError | void> => {
    switch (config.platform) {
        case Platform.BITBUCKET:
            try {
                await fetch(`${info.apiUrl}/2.0/repositories/${info.owner}/${info.repo}/pullrequests`, {
                    body: JSON.stringify({
                        destination: { branch: { name: to } },
                        source: { branch: { name: from } },
                        title: config.title,
                    }),
                    headers: { Authorization: `Bearer ${info.token}` },
                    method: "POST",
                })
            } catch (error) {
                return new SemanticReleaseError(`Failed to create pull request from '${remote}/${from}' to '${remote}/${to}'`, "EPULLREQUEST", String(error))
            }
            break
        case Platform.GITHUB:
            try {
                await new Octokit({ auth: info.token, request: { fetch } }).
                    request("POST /repos/{owner}/{repo}/pulls", {
                        base: to,
                        baseUrl: info.apiUrl,
                        head: from,
                        owner: info.owner!,
                        repo: info.repo!,
                        title: config.title,
                    })
            } catch (error) {
                return new SemanticReleaseError(`Failed to create pull request from '${remote}/${from}' to '${remote}/${to}'`, "EPULLREQUEST", String(error))
            }
            break
        case Platform.GITLAB:
            try {
                await fetch(`${info.apiUrl}/projects/${encodeURIComponent(info.repo!)}/merge_requests`, {
                    body: JSON.stringify({
                        source_branch: from,
                        target_branch: to,
                        title: config.title,
                    }),
                    headers: { Authorization: `Bearer ${info.token}` },
                    method: "POST",
                })
            } catch (error) {
                return new SemanticReleaseError(`Failed to create pull request from '${remote}/${from}' to '${remote}/${to}'`, "EPULLREQUEST", String(error))
            }
            break
        default:
            return getConfigError("platform", config.platform) // shouldn't happen since config is validated beforehand
    }
    return Promise.resolve()
}

export const mergeBranch = async (context: Partial<VerifyConditionsContext>, config: BackmergeConfig, info: RepositoryInfo, from: string, to: string): Promise<SemanticReleaseError | void> => {
    const options: SyncOptions = { cwd: context.cwd, env: context.env }

    try {
        await git(["checkout", "-B", to, `${remote}/${to}`], options)
    } catch (error) {
        return new SemanticReleaseError(`Failed to checkout branch '${to}' from '${remote}/${to}'.`, "ECHECKOUT", String(error))
    }

    const commit = interpolate(config.commit, { from, to })
    try {
        await git(["merge", `${remote}/${from}`, "--ff", "-m", commit], options)
    } catch (_error) {
        context.logger?.log("Merge conflicts detected! Creating a pull request.")

        try {
            await git(["merge", "--abort"])
        } catch (error) {
            return new SemanticReleaseError("Failed to abort merge before creating pull request", "EMERGEABORT", String(error))
        }

        if (config.dryRun) {
            context.logger?.log(`Running with --dry-run, created pull request would have been from '${from}' to '${to}' with title '${commit}'.`)
            return Promise.resolve()
        }
        return await createPullRequest(config, info, from, to)
    }

    const push = ["push"]
    if (config.dryRun) {
        context.logger?.log(`Running with --dry-run, push from '${from}' to '${to}' with commit '${commit}' will not update ${remote}.`)
        push.push("--dry-run")
    }

    try {
        await git(push, options)
    } catch (error) {
        return new SemanticReleaseError(`Failed to push branch ${to} to '${remote}/${to}'.`, "EPUSH", String(error))
    }
    return Promise.resolve()
}
