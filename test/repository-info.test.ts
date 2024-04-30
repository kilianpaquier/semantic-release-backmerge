import { describe, expect, test } from "bun:test"
import { getConfigError, getEnvError } from "../lib/error"

import { Platform } from "../lib/models/config"
import type { VerifyConditionsContext } from "semantic-release"
import { ensureDefault } from "../lib/verify-config"
import { repositoryInfo } from "../lib/repository-info"

describe("repositoryInfo", () => {
    test("should have multiple errors with github", () => {
        // Arrange
        const config = ensureDefault({
            platform: Platform.GITHUB,
            repositoryUrl: "",
        })
        const context: Partial<VerifyConditionsContext> = { env: {} }

        // Act
        const { errors } = repositoryInfo(context, config)

        // Assert
        expect(errors).toEqual([getEnvError("GITHUB_API_URL"), getEnvError("GITHUB_TOKEN"), getConfigError("repositoryUrl")])
    })

    test("should have multiple errors with gitlab", () => {
        // Arrange
        const config = ensureDefault({
            platform: Platform.GITLAB,
            repositoryUrl: "",
        })
        const context: Partial<VerifyConditionsContext> = { env: {} }

        // Act
        const { errors } = repositoryInfo(context, config)

        // Assert
        expect(errors).toEqual([getEnvError("GITLAB_API_URL"), getEnvError("GITLAB_URL"), getEnvError("GITLAB_TOKEN"), getConfigError("repositoryUrl")])
    })

    test("should have multiple errors with bitbucket", () => {
        // Arrange
        const config = ensureDefault({
            platform: Platform.BITBUCKET,
            repositoryUrl: "",
        })
        const context: Partial<VerifyConditionsContext> = { env: {} }

        // Act
        const { errors } = repositoryInfo(context, config)

        // Assert
        expect(errors).toEqual([getEnvError("BITBUCKET_API_URL"), getEnvError("BITBUCKET_TOKEN"), getConfigError("repositoryUrl")])
    })

    test("should return a valid info result with github https", () => {
        // Arrange
        const config = ensureDefault({
            platform: Platform.GITHUB,
            repositoryUrl: "https://github.com/kilianpaquier/semantic-release-backmerge.git",
        })
        const context: Partial<VerifyConditionsContext> = {
            env: {
                GH_TOKEN: "some token",
                GITHUB_API_URL: "https://api.github.com",
            },
        }

        // Act
        const { info, errors } = repositoryInfo(context, config)

        // Assert
        expect(errors).toBeEmpty()
        expect(info).toEqual({
            apiUrl: "https://api.github.com",
            owner: "kilianpaquier",
            repo: "semantic-release-backmerge",
            token: "some token",
        })
    })

    test("should return a valid info result with github env", () => {
        // Arrange
        const config = ensureDefault({
            platform: Platform.GITHUB,
            repositoryUrl: "",
        })
        const context: Partial<VerifyConditionsContext> = {
            env: {
                GITHUB_API_URL: "https://api.github.enterprise.com",
                GITHUB_REPOSITORY: "kilianpaquier/semantic-release-backmerge",
                GITHUB_REPOSITORY_OWNER: "kilianpaquier",
                GITHUB_TOKEN: "some token",
            },
        }

        // Act
        const { info, errors } = repositoryInfo(context, config)

        // Assert
        expect(errors).toBeEmpty()
        expect(info).toEqual({
            apiUrl: "https://api.github.enterprise.com",
            owner: "kilianpaquier",
            repo: "semantic-release-backmerge",
            token: "some token",
        })
    })

    test("should return a valid info result with github ssh", () => {
        // Arrange
        const config = ensureDefault({
            platform: Platform.GITHUB,
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
        })
        const context: Partial<VerifyConditionsContext> = {
            env: {
                GITHUB_API_URL: "https://api.github.com",
                GITHUB_TOKEN: "some token",
            },
        }

        // Act
        const { info, errors } = repositoryInfo(context, config)

        // Assert
        expect(errors).toBeEmpty()
        expect(info).toEqual({
            apiUrl: "https://api.github.com",
            owner: "kilianpaquier",
            repo: "semantic-release-backmerge",
            token: "some token",
        })
    })

    test("should return a valid info result with gitlab https", () => {
        // Arrange
        const config = ensureDefault({
            platform: Platform.GITLAB,
            repositoryUrl: "https://gitlab.com/kilianpaquier/subgroup/semantic-release-backmerge.git",
        })
        const context: Partial<VerifyConditionsContext> = {
            env: {
                GITLAB_API_URL: "https://gitlab.com/api/v4",
                GITLAB_URL: "https://gitlab.com",
                GL_TOKEN: "some token",
            },
        }

        // Act
        const { info, errors } = repositoryInfo(context, config)

        // Assert
        expect(errors).toBeEmpty()
        expect(info).toEqual({
            apiUrl: "https://gitlab.com/api/v4",
            repo: "kilianpaquier/subgroup/semantic-release-backmerge",
            token: "some token",
        })
    })

    test("should return a valid info result with gitlab env", () => {
        // Arrange
        const config = ensureDefault({
            platform: Platform.GITLAB,
            repositoryUrl: "",
        })
        const context: Partial<VerifyConditionsContext> = {
            env: {
                CI_PROJECT_ID: "1769099",
                GITLAB_API_URL: "https://gitlab.com/api/v4",
                GITLAB_URL: "https://gitlab.com",
                GL_TOKEN: "some token",
            },
        }

        // Act
        const { info, errors } = repositoryInfo(context, config)

        // Assert
        expect(errors).toBeEmpty()
        expect(info).toEqual({
            apiUrl: "https://gitlab.com/api/v4",
            repo: "1769099",
            token: "some token",
        })
    })

    test("should return a valid info result with gitlab ssh", () => {
        // Arrange
        const config = ensureDefault({
            platform: Platform.GITLAB,
            repositoryUrl: "git@gitlab.com:kilianpaquier/subgroup/semantic-release-backmerge.git",
        })
        const context: Partial<VerifyConditionsContext> = {
            env: {
                GITLAB_API_URL: "https://gitlab.com/api/v4",
                GITLAB_URL: "https://gitlab.com",
                GL_TOKEN: "some token",
            },
        }

        // Act
        const { info, errors } = repositoryInfo(context, config)

        // Assert
        expect(errors).toBeEmpty()
        expect(info).toEqual({
            apiUrl: "https://gitlab.com/api/v4",
            repo: "kilianpaquier/subgroup/semantic-release-backmerge",
            token: "some token",
        })
    })

    test("should return a valid info result with bitbucket https", () => {
        // Arrange
        const config = ensureDefault({
            platform: Platform.BITBUCKET,
            repositoryUrl: "https://stash.bitbucket.org/kilianpaquier/semantic-release-backmerge.git",
        })
        const context: Partial<VerifyConditionsContext> = {
            env: {
                BB_TOKEN: "some token",
                BITBUCKET_API_URL: "https://api.stash.bitbucket.org",
            },
        }

        // Act
        const { info, errors } = repositoryInfo(context, config)

        // Assert
        expect(errors).toBeEmpty()
        expect(info).toEqual({
            apiUrl: "https://api.stash.bitbucket.org",
            owner: "kilianpaquier",
            repo: "semantic-release-backmerge",
            token: "some token",
        })
    })

    test("should return a valid info result with bitbucket ssh", () => {
        // Arrange
        const config = ensureDefault({
            platform: Platform.BITBUCKET,
            repositoryUrl: "git@stash.bitbucket.org:kilianpaquier/semantic-release-backmerge.git",
        })
        const context: Partial<VerifyConditionsContext> = {
            env: {
                BITBUCKET_API_URL: "https://api.stash.bitbucket.org",
                BITBUCKET_TOKEN: "some token",
            },
        }

        // Act
        const { info, errors } = repositoryInfo(context, config)

        // Assert
        expect(errors).toBeEmpty()
        expect(info).toEqual({
            apiUrl: "https://api.stash.bitbucket.org",
            owner: "kilianpaquier",
            repo: "semantic-release-backmerge",
            token: "some token",
        })
    })
})