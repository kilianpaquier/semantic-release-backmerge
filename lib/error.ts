import SemanticReleaseError from "@semantic-release/error"

import type { BackmergeConfig } from "./models/config"

const linkify = (section: string): string => `https://github.com/kilianpaquier/semantic-release-backmerge/blob/master/README.md#${section}`

interface PartialError {
    message: string
    details?: string
}

const configErrors: { [k in keyof BackmergeConfig]: (value?: any) => PartialError } = {
    apiPathPrefix: (value: any) => ({
        details: `[API Path Prefix](${linkify("shared-configuration")}) must be a string. Provided value is ${JSON.stringify(value)}.`,
        message: `Invalid 'apiPathPrefix' configuration.`,
    }),
    baseUrl: (value: any) => ({
        details: `[Base URL](${linkify("shared-configuration")}) must be a non empty string. Provided value is ${JSON.stringify(value)}.`,
        message: `Invalid 'baseUrl' configuration.`,
    }),
    // shouldn't happen since it comes from semantic-release config
    ci: () => ({
        message: "Invalid 'ci' configuration (coming from semantic-release options).",
    }),
    commit: (value: any) => ({
        details: `[Commit](${linkify("shared-configuration")}) must be a string. Provided value is ${JSON.stringify(value)}.`,
        message: `Invalid 'commit' configuration.`,
    }),
    // shouldn't happen since it comes from semantic-release config
    debug: () => ({
        message: "Invalid 'debug' configuration (coming from semantic-release options).",
    }),
    // shouldn't happen since it comes from semantic-release config
    dryRun: () => ({
        message: "Invalid 'dryRun' configuration (coming from semantic-release options).",
    }),
    platform: (value: any) => ({
        details: `[Platform](${linkify("shared-configuration")}) must be one of 'bitbucket', 'bitbucket-cloud', 'gitea', 'github', 'gitlab'. Provided value is ${JSON.stringify(value)}.`,
        message: `Invalid 'platform' configuration.`,
    }),
    // shouldn't happen since it comes from semantic-release config
    repositoryUrl: () => ({
        message: "Invalid 'repositoryUrl' configuration (coming from semantic-release options).",
    }),
    targets: (value: any) => ({
        details: `[Targets](${linkify("shared-configuration")}) must be a valid array of targets ({ from: "...", to: "..." }). Provided value is ${JSON.stringify(value)}.`,
        message: `Invalid 'targets' configuration.`,
    }),
    title: (value: any) => ({
        details: `[Title](${linkify("shared-configuration")}) must be a non empty string. Provided value is ${JSON.stringify(value)}.`,
        message: `Invalid 'title' configuration.`,
    }),
    token: () => ({
        details: `[Token](${linkify("shared-configuration")}) must be a non empty string.`,
        message: "Invalid 'token' configuration.",
    })
}

export const getConfigError = (option: keyof BackmergeConfig, value?: any): SemanticReleaseError => {
    const code = `EINVALID${option.toUpperCase()}`
    const error = configErrors[option](value)
    return new SemanticReleaseError(error.message, code, error.details)
}
