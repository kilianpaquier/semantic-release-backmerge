// eslint-disable-next-line no-shadow
export enum Platform {
    BITBUCKET = "bitbucket",
    BITBUCKET_CLOUD = "bitbucket-cloud",
    GITEA = "gitea",
    GITHUB = "github",
    GITLAB = "gitlab",
    NULL = "",
}

export interface Target {
    from: string
    to: string
}

export interface BackmergeConfig {
    apiPathPrefix: string
    baseUrl: string
    ci: boolean // comes from semantic-release config
    commit: string
    debug: boolean // comes from semantic-release config
    dryRun: boolean // comes from semantic-release config
    platform: Platform
    repositoryUrl: string // comes from semantic-release config
    targets: Target[]
    title: string
    token: string
}

export interface RepositoryInfo {
    owner: string
    repo: string
}

export const defaultTitle = "Automatic merge failure"
export const defaultCommit = "chore(release): merge branch $from into $to [skip ci]"

export const interpolate = (toInterpolate: string, options: Record<string, string>): string =>
    Object.entries(options).
        reduce((agg: string, [option, value]) => agg.replaceAll(`$${option}`, value), toInterpolate)