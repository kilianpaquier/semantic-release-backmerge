import { describe, expect, test } from "bun:test"

import parse from "git-url-parse"

import { Platform } from "../lib/models/config"
import { authModificator } from "../lib/auth-modificator"

describe("authModificator", () => {
    test("should return a valid authenticated git ssh url with bitbucket", () => {
        // Arrange
        const info = parse("git@github.com:kilianpaquier/semantic-release-backmerge.git")

        // Act
        const url = authModificator(info, Platform.BITBUCKET, "token")

        // Assert
        expect(url).toEqual("https://x-token-auth:token@github.com/kilianpaquier/semantic-release-backmerge.git")
    })

    test("should return a valid authenticated git ssh url with bitbucket and port", () => {
        // Arrange
        const info = parse("ssh://git@github.com:7099/kilianpaquier/semantic-release-backmerge.git")

        // Act
        const url = authModificator(info, Platform.BITBUCKET, "token")

        // Assert
        expect(url).toEqual("https://x-token-auth:token@github.com:7099/kilianpaquier/semantic-release-backmerge.git")
    })

    test("should return a valid authenticated git https url with bitbucket cloud", () => {
        // Arrange
        const info = parse("https://github.com/kilianpaquier/semantic-release-backmerge.git")

        // Act
        const url = authModificator(info, Platform.BITBUCKET_CLOUD, "token")

        // Assert
        expect(url).toEqual("https://x-token-auth:token@github.com/kilianpaquier/semantic-release-backmerge.git")
    })

    test("should return a valid authenticated git https url with bitbucket and port", () => {
        // Arrange
        const info = parse("https://github.com:7099/kilianpaquier/semantic-release-backmerge.git")

        // Act
        const url = authModificator(info, Platform.BITBUCKET_CLOUD, "token")

        // Assert
        expect(url).toEqual("https://x-token-auth:token@github.com:7099/kilianpaquier/semantic-release-backmerge.git")
    })

    test("should return a valid authenticated git https url with gitea and git prefix", () => {
        // Arrange
        const info = parse("git+https://github.com/kilianpaquier/semantic-release-backmerge.git")

        // Act
        const url = authModificator(info, Platform.GITEA, "token")

        // Assert
        expect(url).toEqual("https://gitea-token:token@github.com/kilianpaquier/semantic-release-backmerge.git")
    })

    test("should return a valid authenticated git https url with github and already present user/token", () => {
        // Arrange
        const info = parse("https://some-user:token@github.com/kilianpaquier/semantic-release-backmerge.git")

        // Act
        const url = authModificator(info, Platform.GITHUB, "token")

        // Assert
        expect(url).toEqual("https://x-access-token:token@github.com/kilianpaquier/semantic-release-backmerge.git")
    })

    test("should return a valid authenticated git http url with github", () => {
        // Arrange
        const info = parse("http://github.com/kilianpaquier/semantic-release-backmerge.git")

        // Act
        const url = authModificator(info, Platform.GITHUB, "token")

        // Assert
        expect(url).toEqual("http://x-access-token:token@github.com/kilianpaquier/semantic-release-backmerge.git")
    })

    test("should return a valid authenticated git ssh url with gitlab with subgroup", () => {
        // Arrange
        const info = parse("git@github.com:kilianpaquier/subgroup/semantic-release-backmerge.git")

        // Act
        const url = authModificator(info, Platform.GITLAB, "token")

        // Assert
        expect(url).toEqual("https://gitlab-ci-token:token@github.com/kilianpaquier/subgroup/semantic-release-backmerge.git")
    })
})