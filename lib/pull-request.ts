import { Platform } from "./models/config"

import SemanticReleaseError from "@semantic-release/error"
import fetch from "node-fetch"

import { Octokit } from "@octokit/core"
import { getConfigError } from "./error"

/**
 * Metadata contains all related information to the body sent during createPR call.
 */
export interface Metadata {
    body: string
    from: string
    name: string
    owner: string
    title: string
    to: string
}

/**
 * createPR creates a pull request to the remote for the given 'body.from' to 'body.to' inputs.
 * It uses the token to create the pull request.
 * Pull request creation depends on platform to retrieve the appropriate endpoint to call with the appropriate body.
 * 
 * @param apiUrl the API endpoint URL.
 * @param platform the platform to call the right endpoint for pull request creation.
 * @param token the token with the appropriate rights to craete the pull request.
 * @param metadata input informations related to body sent in API call.
 * 
 * @throws an error if something wrong happened during pull request creation or if the config.platform isn't implemented.
 */
export const createPR = async (apiUrl: string, platform: Platform, token: string, metadata: Metadata) => {
    const handleFetch = async (url: string, body: any) => {
        try {
            const response = await fetch(url, {
                body: JSON.stringify(body),
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                method: "POST",
            })
            if (!response.ok) {
                throw new Error(await response.text())
            }
        } catch (error) {
            throw new SemanticReleaseError(`Failed to create pull request from '${metadata.from}' into '${metadata.to}'.`, "EPULLREQUEST", String(error))
        }
    }

    switch (platform) {
        case Platform.BITBUCKET_CLOUD:
            await handleFetch(`${apiUrl}/repositories/${metadata.owner}/${metadata.name}/pullrequests`, {
                description: metadata.body,
                destination: { branch: { name: metadata.to } },
                source: { branch: { name: metadata.from } },
                title: metadata.title,
            })
            break
        case Platform.BITBUCKET:
            await handleFetch(`${apiUrl}/projects/${metadata.owner}/repos/${metadata.name}/pull-requests`, {
                description: metadata.body,
                fromRef: { id: `refs/heads/${metadata.from}` },
                open: true,
                state: "OPEN",
                title: metadata.title,
                toRef: { id: `refs/heads/${metadata.to}` },
            })
            break
        case Platform.GITEA:
            await handleFetch(`${apiUrl}/repos/${metadata.owner}/${metadata.name}/pulls`, {
                base: metadata.to,
                body: metadata.body,
                head: metadata.from,
                title: metadata.title,
            })
            break
        case Platform.GITHUB:
            try {
                await new Octokit({ auth: token, request: { fetch } }).
                    request("POST /repos/{owner}/{repo}/pulls", {
                        base: metadata.to,
                        baseUrl: apiUrl,
                        body: metadata.body,
                        head: metadata.from,
                        owner: metadata.owner,
                        repo: metadata.name,
                        title: metadata.title,
                    })
            } catch (error) {
                throw new SemanticReleaseError(`Failed to create pull request from '${metadata.from}' into '${metadata.to}'.`, "EPULLREQUEST", String(error))
            }
            break
        case Platform.GITLAB:
            await handleFetch(`${apiUrl}/projects/${encodeURIComponent(`${metadata.owner}/${metadata.name}`)}/merge_requests`, {
                description: metadata.body,
                source_branch: metadata.from,
                target_branch: metadata.to,
                title: metadata.title,
            })
            break
        default:
            throw getConfigError("platform", platform) // shouldn't happen since config is validated beforehand
    }
}
