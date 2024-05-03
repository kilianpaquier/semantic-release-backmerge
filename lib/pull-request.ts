import { BackmergeConfig, Platform } from "./models/config"

import SemanticReleaseError from "@semantic-release/error"
import fetch from "node-fetch"

import { GitUrl } from "git-url-parse"
import { Octokit } from "octokit"
import { getConfigError } from "./error"

/**
 * createPR creates a pull request to the remote for the given 'from' to 'to' inputs.
 * It uses the config.token to create the pull request.
 * Pull request creation depends on config.platform to retrieve the appropriate endpoint to call with the appropriate body.
 * 
 * @param config the configuration containing information to retrieve the API url.
 * @param url the git url with owner and repository name.
 * @param from the branch to create the pull request from.
 * @param to the branch to create the pull request to.
 * 
 * @throws an error if something wrong happened during pull request creation or if the config.platform isn't implemented.
 */
export const createPR = async (config: BackmergeConfig, url: GitUrl, from: string, to: string) => {
    const handleFetch = async (apiUrl: string, body: any) => {
        try {
            const response = await fetch(apiUrl, {
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
            throw new SemanticReleaseError(`Failed to create pull request from '${from}' into '${to}'.`, "EPULLREQUEST", String(error))
        }
    }

    const apiUrl = config.baseUrl + config.apiPathPrefix

    switch (config.platform) {
        case Platform.BITBUCKET_CLOUD:
            await handleFetch(`${apiUrl}/repositories/${url.owner}/${url.name}/pullrequests`, {
                destination: { branch: { name: to } },
                source: { branch: { name: from } },
                title: config.title,
            })
            break
        case Platform.BITBUCKET:
            await handleFetch(`${apiUrl}/projects/${url.owner}/repos/${url.name}/pull-requests`, {
                fromRef: { id: `refs/heads/${from}` },
                open: true,
                state: "OPEN",
                title: config.title,
                toRef: { id: `refs/heads/${to}` },
            })
            break
        case Platform.GITEA:
            await handleFetch(`${apiUrl}/repos/${url.owner}/${url.name}/pulls`, {
                base: to,
                head: from,
                title: config.title,
            })
            break
        case Platform.GITHUB:
            try {
                await new Octokit({ auth: config.token, request: { fetch } }).
                    request("POST /repos/{owner}/{repo}/pulls", {
                        base: to,
                        baseUrl: apiUrl,
                        head: from,
                        owner: url.owner,
                        repo: url.name,
                        title: config.title,
                    })
            } catch (error) {
                throw new SemanticReleaseError(`Failed to create pull request from '${from}' into '${to}'.`, "EPULLREQUEST", String(error))
            }
            break
        case Platform.GITLAB:
            await handleFetch(`${apiUrl}/projects/${encodeURIComponent(`${url.owner}/${url.name}`)}/merge_requests`, {
                source_branch: from,
                target_branch: to,
                title: config.title,
            })
            break
        default:
            throw getConfigError("platform", config.platform) // shouldn't happen since config is validated beforehand
    }
}
