import SemanticReleaseError from "@semantic-release/error"

import type { BackmergeConfig } from "./models/config"

const linkify = (section: string): string => `https://github.com/kilianpaquier/semantic-release-backmerge/blob/master/README.md#${section}`

interface PartialError {
    message: string
    details?: string
}

const configErrors: { [k in keyof BackmergeConfig]: PartialError } = {
    // shouldn't happen since it comes from semantic-release config
    ci: {
        message: "Invalid `ci` configuration (coming from semantic-release options).",
    },
    commit: {
        details: `[Commit](${linkify("commit")}) must be a string.`,
        message: "Invalid `commit` configuration.",
    },
    // shouldn't happen since it comes from semantic-release config
    debug: {
        message: "Invalid `debug` configuration (coming from semantic-release options).",
    },
    // shouldn't happen since it comes from semantic-release config
    dryRun: {
        message: "Invalid `dryRun` configuration (coming from semantic-release options).",
    },
    platform: {
        details: `[Platform](${linkify("platform")}) must be one of 'github', 'gitlab'.`,
        message: "Invalid `platform` configuration.",
    },
    // shouldn't happen since it comes from semantic-release config
    repositoryUrl: {
        message: "Invalid `repositoryUrl` configuration (coming from semantic-release options).",
    },
    targets: {
        details: `[Targets](${linkify("targets")}) must be a valid array of targets ({ from: "...", to: "..." }).`,
        message: "Invalid `targets` configuration.",
    },
    title: {
        details: `[Title](${linkify("title")}) must be a string.`,
        message: "Invalid `title` configuration.",
    },
}

export const getConfigError = (option: keyof BackmergeConfig, value?: any): SemanticReleaseError => {
    const code = `EINVALID${option.toUpperCase()}`

    const error = configErrors[option]
    if (error.details && value) {
        error.details += `Provided value is '${JSON.stringify(value)}'.`
    }
    return new SemanticReleaseError(error.message, code, error.details)
}

export interface Envs {
    BITBUCKET_API_URL: string,
    BITBUCKET_TOKEN: string,
    GITHUB_API_URL: string,
    GITHUB_TOKEN: string,
    GITLAB_API_URL: string,
    GITLAB_TOKEN: string,
    GITLAB_URL: string,
}

const envErrors: { [k in keyof Envs]: PartialError } = {
    BITBUCKET_API_URL: {
        details: `[Bitbucket](${linkify("bitbucket")}) section must be followed when backmerge configured on 'bitbucket'.`,
        message: "Missing `BITBUCKET_API_URL` environment variable.",
    },
    BITBUCKET_TOKEN: {
        details: `[Bitbucket](${linkify("bitbucket")}) section must be followed when backmerge configured on 'bitbucket'.`,
        message: "Missing `BITBUCKET_TOKEN` environment variable.",
    },

    GITHUB_API_URL: {
        details: `[github](${linkify("github")}) section must be followed when backmerge configured on 'github'.`,
        message: "Missing `GITHUB_API_URL` environment variable.",
    },
    GITHUB_TOKEN: {
        details: `[Github](${linkify("github")}) section must be followed when backmerge configured on 'github'.`,
        message: "Missing `GITHUB_TOKEN` or `GH_TOKEN` environment variable.",
    },

    GITLAB_API_URL: {
        details: `[Gitlab](${linkify("gitlab")}) section must be followed when backmerge configured on 'gitlab'.`,
        message: "Missing `GITLAB_API_URL` or `CI_API_V4_URL` environment variable.",
    },
    GITLAB_TOKEN: {
        details: `[Gitlab](${linkify("gitlab")}) section must be followed when backmerge configured on 'gitlab'.`,
        message: "Missing `GITLAB_TOKEN` or `GL_TOKEN` environment variable.",
    },
    GITLAB_URL: {
        details: `[Gitlab](${linkify("gitlab")}) section must be followed when backmerge configured on 'gitlab'.`,
        message: "Missing `GITLAB_URL` or `CI_SERVER_URL` environment variable.",
    },
}

export const getEnvError = (envName: keyof Envs): SemanticReleaseError => {
    const code = `EINVALID${envName.replaceAll("_", "").toUpperCase()}`
    const { message, details } = envErrors[envName]
    return new SemanticReleaseError(message, code, details)
}