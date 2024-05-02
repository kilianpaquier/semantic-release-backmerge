import { type GitUrl } from "git-url-parse"
import { Platform } from "./models/config"

// see https://github.com/semantic-release/semantic-release/blob/master/lib/get-git-auth-url.js#L64
export const getUser = (platform: Platform): string => {
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
            return "" // should never happen
    }
}

export const authModificator = (url: GitUrl, platform: Platform, token: string): string => {
    const origin = url.toString("https")
    // simple replace to add the authentication after toString
    return origin.replace("https://", `https://${getUser(platform)}:${token}@`) 
}