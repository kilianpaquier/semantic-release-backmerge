import { describe, expect, test } from "bun:test"

import { Platform } from "../lib/models/config"
import { ensureDefault } from "../lib/verify-config"
import { getConfigError } from "../lib/error"
import { repositoryInfo } from "../lib/repository-info"

describe("repositoryInfo", () => {
    test("should have multiple errors with github", () => {
        // Arrange
        const config = ensureDefault({
            baseUrl: "",
            platform: Platform.GITHUB,
            repositoryUrl: "",
        })

        // Act
        const [, errors] = repositoryInfo(config)

        // Assert
        expect(errors).toEqual([getConfigError("repositoryUrl")])
    })

    test("should have multiple errors with gitlab", () => {
        // Arrange
        const config = ensureDefault({
            baseUrl: "",
            platform: Platform.GITLAB,
            repositoryUrl: "",
        })

        // Act
        const [, errors] = repositoryInfo(config)

        // Assert
        expect(errors).toEqual([getConfigError("repositoryUrl")])
    })

    test("should have multiple errors with bitbucket", () => {
        // Arrange
        const config = ensureDefault({
            baseUrl: "",
            platform: Platform.BITBUCKET,
            repositoryUrl: "",
        })

        // Act
        const [, errors] = repositoryInfo(config)

        // Assert
        expect(errors).toEqual([getConfigError("repositoryUrl")])
    })

    test("should have multiple errors with gitea", () => {
        // Arrange
        const config = ensureDefault({
            baseUrl: "",
            platform: Platform.GITEA,
            repositoryUrl: "",
        })

        // Act
        const [, errors] = repositoryInfo(config)

        // Assert
        expect(errors).toEqual([getConfigError("repositoryUrl")])
    })

    test("should return a valid info result with github https", () => {
        // Arrange
        const config = ensureDefault({
            baseUrl: "",
            platform: Platform.GITHUB,
            repositoryUrl: "https://github.com/kilianpaquier/semantic-release-backmerge.git",
        })

        // Act
        const [info, errors] = repositoryInfo(config)

        // Assert
        expect(errors).toBeEmpty()
        expect(info).toEqual({
            owner: "kilianpaquier",
            repo: "semantic-release-backmerge",
        })
    })

    test("should return a valid info result with github env", () => {
        // Arrange
        const config = ensureDefault({
            baseUrl: "",
            platform: Platform.GITHUB,
            repositoryUrl: "",
        })
        const env = {
            GITHUB_REPOSITORY: "kilianpaquier/semantic-release-backmerge",
            GITHUB_REPOSITORY_OWNER: "kilianpaquier",
        }

        // Act
        const [info, errors] = repositoryInfo(config, env)

        // Assert
        expect(errors).toBeEmpty()
        expect(info).toEqual({
            owner: "kilianpaquier",
            repo: "semantic-release-backmerge",
        })
    })

    test("should return a valid info result with github ssh", () => {
        // Arrange
        const config = ensureDefault({
            baseUrl: "",
            platform: Platform.GITHUB,
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
        })

        // Act
        const [info, errors] = repositoryInfo(config)

        // Assert
        expect(errors).toBeEmpty()
        expect(info).toEqual({
            owner: "kilianpaquier",
            repo: "semantic-release-backmerge",
        })
    })

    test("should return a valid info result with gitlab https", () => {
        // Arrange
        const config = ensureDefault({
            baseUrl: "https://gitlab.com",
            platform: Platform.GITLAB,
            repositoryUrl: "https://gitlab.com/kilianpaquier/subgroup/semantic-release-backmerge.git",
        })

        // Act
        const [info, errors] = repositoryInfo(config)

        // Assert
        expect(errors).toBeEmpty()
        expect(info).toEqual({
            owner: "",
            repo: "kilianpaquier/subgroup/semantic-release-backmerge",
        })
    })

    test("should return a valid info result with gitlab env", () => {
        // Arrange
        const config = ensureDefault({
            baseUrl: "https://gitlab.com",
            platform: Platform.GITLAB,
            repositoryUrl: "",
        })
        const env = { CI_PROJECT_ID: "1769099" }

        // Act
        const [info, errors] = repositoryInfo(config, env)

        // Assert
        expect(errors).toBeEmpty()
        expect(info).toEqual({
            owner: "",
            repo: "1769099",
        })
    })

    test("should return a valid info result with gitlab ssh", () => {
        // Arrange
        const config = ensureDefault({
            baseUrl: "https://gitlab.com",
            platform: Platform.GITLAB,
            repositoryUrl: "git@gitlab.com:kilianpaquier/subgroup/semantic-release-backmerge.git",
        })

        // Act
        const [info, errors] = repositoryInfo(config)

        // Assert
        expect(errors).toBeEmpty()
        expect(info).toEqual({
            owner: "",
            repo: "kilianpaquier/subgroup/semantic-release-backmerge",
        })
    })

    test("should return a valid info result with bitbucket https", () => {
        // Arrange
        const config = ensureDefault({
            baseUrl: "",
            platform: Platform.BITBUCKET,
            repositoryUrl: "https://stash.bitbucket.org/kilianpaquier/semantic-release-backmerge.git",
        })

        // Act
        const [info, errors] = repositoryInfo(config)

        // Assert
        expect(errors).toBeEmpty()
        expect(info).toEqual({
            owner: "kilianpaquier",
            repo: "semantic-release-backmerge",
        })
    })

    test("should return a valid info result with bitbucket ssh", () => {
        // Arrange
        const config = ensureDefault({
            baseUrl: "",
            platform: Platform.BITBUCKET,
            repositoryUrl: "git@stash.bitbucket.org:kilianpaquier/semantic-release-backmerge.git",
        })

        // Act
        const [info, errors] = repositoryInfo(config)

        // Assert
        expect(errors).toBeEmpty()
        expect(info).toEqual({
            owner: "kilianpaquier",
            repo: "semantic-release-backmerge",
        })
    })

    test("should return a valid info result with gitea https", () => {
        // Arrange
        const config = ensureDefault({
            baseUrl: "",
            platform: Platform.GITEA,
            repositoryUrl: "https://stash.gitea.com/kilianpaquier/semantic-release-backmerge.git",
        })

        // Act
        const [info, errors] = repositoryInfo(config)

        // Assert
        expect(errors).toBeEmpty()
        expect(info).toEqual({
            owner: "kilianpaquier",
            repo: "semantic-release-backmerge",
        })
    })

    test("should return a valid info result with gitea ssh", () => {
        // Arrange
        const config = ensureDefault({
            baseUrl: "",
            platform: Platform.GITEA,
            repositoryUrl: "git@stash.gitea.com:kilianpaquier/semantic-release-backmerge.git",
        })

        // Act
        const [info, errors] = repositoryInfo(config)

        // Assert
        expect(errors).toBeEmpty()
        expect(info).toEqual({
            owner: "kilianpaquier",
            repo: "semantic-release-backmerge",
        })
    })
})