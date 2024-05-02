import { type BackmergeConfig, Platform, type Target, defaultCommit, defaultTitle } from "./models/config"
import { isArray, isBoolean, isString } from "lodash"

import type SemanticReleaseError from "@semantic-release/error"

import { getConfigError } from "./error"

const validateTargets = (targets: Partial<Target>[]): boolean => targets.filter((target) => !target.from || !target.to).length === 0
const validatePlatform = (stringPlatform: string): boolean => Boolean(Object.values(Platform).
    filter(platform => platform !== Platform.NULL).
    find(platform => platform.toString() === stringPlatform))
const stringNotEmpty = (value: string) => value !== ""

// eslint-disable-next-line complexity
export const ensureDefault = (config: Partial<BackmergeConfig>, env?: Record<string, string>): BackmergeConfig => {
    const getURLs = (): [Platform, string, string] => { // eslint-disable-line complexity
        if (config.baseUrl) {
            return [Platform.NULL, config.baseUrl, config.apiPathPrefix ?? ""]
        }

        // bitbucket
        if (env?.BITBUCKET_URL) {
            return [Platform.BITBUCKET, env?.BITBUCKET_URL, config.apiPathPrefix ?? "/rest/api/1.0"]
        }
        
        // bitbucket cloud
        if (env?.BITBUCKET_CLOUD_URL) {
            return [Platform.BITBUCKET_CLOUD, env?.BITBUCKET_CLOUD_URL, config.apiPathPrefix ?? "/2.0"]
        }

        // gitea
        if (env?.GITEA_URL) {
            return [Platform.GITEA, env?.GITEA_URL, config.apiPathPrefix ?? "/api/v1"]
        }

        // github
        const githubUrl = env?.GH_URL ?? env?.GITHUB_URL ?? env?.GITHUB_API_URL
        if (githubUrl) {
            return [Platform.GITHUB, githubUrl, config.apiPathPrefix ?? ""]
        }

        // gitlab
        const gitlabUrl = env?.GL_URL ?? env?.GITLAB_URL ?? env?.CI_SERVER_URL
        if (gitlabUrl) {
            return [Platform.GITLAB, gitlabUrl, config.apiPathPrefix ?? "/api/v4"]
        }

        return [Platform.NULL, "", ""]
    }

    const [platform, baseUrl, apiPathPrefix] = getURLs()
    return {
        apiPathPrefix,
        baseUrl,
        commit: config.commit ?? defaultCommit,
        debug: config.debug ?? false, // shouldn't happen since it comes from semantic-release config
        dryRun: config.dryRun ?? false, // shouldn't happen since it comes from semantic-release config
        platform: config.platform ?? platform,
        targets: config.targets ?? [],
        title: config.title ?? defaultTitle,
        // checking all environment variables since it doesn't matter which is valued whatever the platform could be
        token: env?.BB_TOKEN ?? env?.BITBUCKET_TOKEN ?? env?.GITEA_TOKEN ?? env?.GH_TOKEN ?? env?.GITHUB_TOKEN ?? env?.GL_TOKEN ?? env?.GITLAB_TOKEN ?? "",
    }
}

export interface VerifyConfigResult {
    config: BackmergeConfig
    errors: SemanticReleaseError[]
}

export const verifyConfig = (config: BackmergeConfig): SemanticReleaseError[] => {
    const validators: { [k in keyof BackmergeConfig]: ((value: any) => boolean)[] } = {
        apiPathPrefix: [isString],
        baseUrl: [isString, stringNotEmpty],
        commit: [isString, stringNotEmpty],
        debug: [isBoolean], // shouldn't happen since it comes from semantic-release config
        dryRun: [isBoolean], // shouldn't happen since it comes from semantic-release config
        platform: [isString, validatePlatform],
        targets: [isArray, validateTargets],
        title: [isString, stringNotEmpty],
        token: [isString, stringNotEmpty]
    }

    const errors = Object.entries(config).reduce((agg: SemanticReleaseError[], [option, value]) => {
        // @ts-expect-error option is a keyof BackmergeConfig
        for (const validation of validators[option]) {
            if (!validation(value)) {
                // @ts-expect-error option is a keyof BackmergeConfig
                return [...agg, getConfigError(option, value)]
            }
        }
        return agg
    }, [])
    return errors
}