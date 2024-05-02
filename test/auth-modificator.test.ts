import { describe, expect, test } from "bun:test"

import gitUrlParse from "git-url-parse"

import { Platform } from "../lib/models/config"
import { authModificator } from "../lib/auth-modificator"

describe("modificator", () => {
    test("should return a valid authenticated git url with bitbucket", () => {
        // Arrange
        const info = gitUrlParse("git@github.com:kilianpaquier/semantic-release-backmerge.git")

        // Act
        const url = authModificator(info, Platform.BITBUCKET, "token")

        // Assert
        expect(url).toEqual("https://x-token-auth:token@github.com/kilianpaquier/semantic-release-backmerge.git")
    })

    test("should return a valid authenticated git url with bitbucket cloud", () => {
        // Arrange
        const info = gitUrlParse("https://github.com/kilianpaquier/semantic-release-backmerge.git")

        // Act
        const url = authModificator(info, Platform.BITBUCKET_CLOUD, "token")

        // Assert
        expect(url).toEqual("https://x-token-auth:token@github.com/kilianpaquier/semantic-release-backmerge.git")
    })

    test("should return a valid authenticated git url with bitbucket and port", () => {
        // Arrange
        const info = gitUrlParse("https://github.com:7099/kilianpaquier/semantic-release-backmerge.git")

        // Act
        const url = authModificator(info, Platform.BITBUCKET_CLOUD, "token")

        // Assert
        expect(url).toEqual("https://x-token-auth:token@github.com:7099/kilianpaquier/semantic-release-backmerge.git")
    })

    test("should return a valid authenticated git url with gitea", () => {
        // Arrange
        const info = gitUrlParse("git+https://github.com/kilianpaquier/semantic-release-backmerge.git")

        // Act
        const url = authModificator(info, Platform.GITEA, "token")

        // Assert
        expect(url).toEqual("https://gitea-token:token@github.com/kilianpaquier/semantic-release-backmerge.git")
    })

    test("should return a valid authenticated git url with github", () => {
        // Arrange
        const info = gitUrlParse("https://some-user:token@github.com/kilianpaquier/semantic-release-backmerge.git")

        // Act
        const url = authModificator(info, Platform.GITHUB, "token")

        // Assert
        expect(url).toEqual("https://x-access-token:token@github.com/kilianpaquier/semantic-release-backmerge.git")
    })

    test("should return a valid authenticated git url with gitlab", () => {
        // Arrange
        const info = gitUrlParse("git@github.com:kilianpaquier/subgroup/semantic-release-backmerge.git")

        // Act
        const url = authModificator(info, Platform.GITLAB, "token")

        // Assert
        expect(url).toEqual("https://gitlab-ci-token:token@github.com/kilianpaquier/subgroup/semantic-release-backmerge.git")
    })
})