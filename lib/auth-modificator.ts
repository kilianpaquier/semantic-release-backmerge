import { GitUrl } from "git-url-parse"
import { Platform } from "./models/config"
import { getConfigError } from "./error"

/**
 * getUser returns the appropriate string user for the given input platform. 
 * It's specifically used in AuthModificator function for the auth user token.
 * 
 * @see https://github.com/semantic-release/semantic-release/blob/master/lib/get-git-auth-url.js#L64
 * 
 * @param platform is the input platform like bitbucket, gitea, github, gitlab, etc.
 * 
 * @throws SemanticReleaseError in case the platform isn't an implemented platform or is not a platform at all.
 * 
 * @returns the username (x-token-auth, x-access-token, etc.).
 */
const getUser = (platform: Platform): string => {
    switch (platform) {
        case Platform.BITBUCKET:
        case Platform.BITBUCKET_CLOUD:
            return "x-token-auth"
        case Platform.GITEA:
            return "gitea-token" // no specific prefix identified
        case Platform.GITHUB:
            return "x-access-token"
        case Platform.GITLAB:
            return "gitlab-ci-token"
        default:
            throw getConfigError("platform", platform) // shouldn't happen since config is validated beforehand
    }
}

/**
 * authModificator takes as input a GitUrl (from git-url-parse) 
 * and generates an http or https git url with replaced authentication (with the input token).
 * 
 * @param url with all related information to the git repository.
 * @param platform related to the url.
 * @param token to use instead of present token in url.
 * 
 * @throws SemanticReleaseError in case the platform isn't an implemented platform or is not a platform at all.
 * 
 * @returns the computed remote url with all modifications' done.
 */
export const authModificator = (url: GitUrl, platform: Platform, token: string): string => {
    const proto = url.protocol === "http" ? "http" : "https" // eslint-disable-line no-ternary

    const origin = url.toString(proto)
    // simple replace to add the authentication after toString
    return origin.replace(`${proto}://${url.user}@`, `${proto}://`).
        replace(`${proto}://`, `${proto}://${getUser(platform)}:${token}@`)
}