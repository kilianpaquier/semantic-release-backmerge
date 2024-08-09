/**
 * Platform represents the available implemented platforms to backmerge branches with semantic-release-backmerge.
 */
export enum Platform {  
    BITBUCKET = "bitbucket",
    BITBUCKET_CLOUD = "bitbucket-cloud",
    GITEA = "gitea",
    GITHUB = "github",
    GITLAB = "gitlab",
    NULL = "",
}

/**
 * Target represents a target configuration for a backmerge with a source branch (from) and a target branch (to).
 */
export interface Target {
    from: string
    to: string
}

/**
 * BackmergeConfig represesents all the configurable fields (with some exceptions like token, debug and dryRun) for semantic-release-backmerge.
 */
export interface BackmergeConfig {
    apiPathPrefix: string
    baseUrl: string
    commit: string
    debug: boolean // comes from semantic-release config
    dryRun: boolean // comes from semantic-release config
    platform: Platform
    repositoryUrl: string // comes from semantic-release config
    targets: Target[]
    title: string
    token: string
}

/**
 * defaultTitle is the default title for a pull request.
 */
export const defaultTitle = "Automatic merge failure"

/**
 * defaultCommit is the default commit message for a merge commit.
 * It's interpolated by lodash before being used.
 */
export const defaultCommit = "chore(release): merge branch ${ from } into ${ to } [skip ci]" // eslint-disable-line no-template-curly-in-string
