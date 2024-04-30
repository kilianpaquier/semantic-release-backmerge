import { describe, expect, test } from "bun:test"
import { getConfigError, getEnvError } from "../lib/error"

describe("getConfigError", () => {
    test("should have a valid targets error", () => {
        // Arrange
        const code = "EINVALIDTARGETS"

        // Act
        const error = getConfigError("targets", "some invalid targets")

        // Assert
        expect(error.code).toEqual(code)
        expect(error.message).toContain("`targets`")
        expect(error.details).toContain("must be a valid array of targets")
        expect(error.details).toContain("some invalid targets")
    })

    test("should have a valid platform error", () => {
        // Arrange
        const code = "EINVALIDPLATFORM"

        // Act
        const error = getConfigError("platform", "some invalid platform")

        // Assert
        expect(error.code).toEqual(code)
        expect(error.message).toContain("`platform`")
        expect(error.details).toContain("must be one of 'github', 'gitlab'")
        expect(error.details).toContain("some invalid platform")
    })

    test("should have a valid commit error", () => {
        // Arrange
        const code = "EINVALIDCOMMIT"

        // Act
        const error = getConfigError("commit", true)

        // Assert
        expect(error.code).toEqual(code)
        expect(error.message).toContain("`commit`")
        expect(error.details).toContain("must be a string")
        expect(error.details).toContain("true")
    })

    test("should have a valid title error", () => {
        // Arrange
        const code = "EINVALIDTITLE"

        // Act
        const error = getConfigError("title", true)

        // Assert
        expect(error.code).toEqual(code)
        expect(error.message).toContain("`title`")
        expect(error.details).toContain("must be a string")
        expect(error.details).toContain("true")
    })

    test("should have a valid debug error", () => {
        // Arrange
        const code = "EINVALIDDEBUG"

        // Act
        const error = getConfigError("debug", "some invalid debug")

        // Assert
        expect(error.code).toEqual(code)
        expect(error.message).toContain("`debug`")
        expect(error.details).toBeEmpty()
    })

    test("should have a valid dryRun error", () => {
        // Arrange
        const code = "EINVALIDDRYRUN"

        // Act
        const error = getConfigError("dryRun", "some invalid dryRun")

        // Assert
        expect(error.code).toEqual(code)
        expect(error.message).toContain("`dryRun`")
        expect(error.details).toBeEmpty()
    })

    test("should have a valid ci error", () => {
        // Arrange
        const code = "EINVALIDCI"

        // Act
        const error = getConfigError("ci", "some invalid ci")

        // Assert
        expect(error.code).toEqual(code)
        expect(error.message).toContain("`ci`")
        expect(error.details).toBeEmpty()
    })

    test("should have a valid repositoryUrl error", () => {
        // Arrange
        const code = "EINVALIDREPOSITORYURL"

        // Act
        const error = getConfigError("repositoryUrl", true)

        // Assert
        expect(error.code).toEqual(code)
        expect(error.message).toContain("`repositoryUrl`")
        expect(error.details).toBeEmpty()
    })
})

describe("getEnvError", () => {
    test("should have a valid BITBUCKET_API_URL error", () => {
        // Arrange
        const code = "EINVALIDBITBUCKETAPIURL"

        // Act
        const error = getEnvError("BITBUCKET_API_URL")

        // Assert
        expect(error.code).toEqual(code)
        expect(error.message).toContain("`BITBUCKET_API_URL`")
        expect(error.details).toContain("section must be followed")
    })

    test("should have a valid BITBUCKET_TOKEN error", () => {
        // Arrange
        const code = "EINVALIDBITBUCKETTOKEN"

        // Act
        const error = getEnvError("BITBUCKET_TOKEN")

        // Assert
        expect(error.code).toEqual(code)
        expect(error.message).toContain("`BITBUCKET_TOKEN`")
        expect(error.details).toContain("section must be followed")
    })

    test("should have a valid GITLAB_API_URL error", () => {
        // Arrange
        const code = "EINVALIDGITLABAPIURL"

        // Act
        const error = getEnvError("GITLAB_API_URL")

        // Assert
        expect(error.code).toEqual(code)
        expect(error.message).toContain("`GITLAB_API_URL` or `CI_API_V4_URL`")
        expect(error.details).toContain("section must be followed")
    })

    test("should have a valid GITLAB_URL error", () => {
        // Arrange
        const code = "EINVALIDGITLABURL"

        // Act
        const error = getEnvError("GITLAB_URL")

        // Assert
        expect(error.code).toEqual(code)
        expect(error.message).toContain("`GITLAB_URL` or `CI_SERVER_URL`")
        expect(error.details).toContain("section must be followed")
    })

    test("should have a valid GITLAB_TOKEN error", () => {
        // Arrange
        const code = "EINVALIDGITLABTOKEN"

        // Act
        const error = getEnvError("GITLAB_TOKEN")

        // Assert
        expect(error.code).toEqual(code)
        expect(error.message).toContain("`GITLAB_TOKEN` or `GL_TOKEN`")
        expect(error.details).toContain("section must be followed")
    })

    test("should have a valid GITHUB_API_URL error", () => {
        // Arrange
        const code = "EINVALIDGITHUBAPIURL"

        // Act
        const error = getEnvError("GITHUB_API_URL")

        // Assert
        expect(error.code).toEqual(code)
        expect(error.message).toContain("`GITHUB_API_URL`")
        expect(error.details).toContain("section must be followed")
    })

    test("should have a valid GITHUB_TOKEN error", () => {
        // Arrange
        const code = "EINVALIDGITHUBTOKEN"

        // Act
        const error = getEnvError("GITHUB_TOKEN")

        // Assert
        expect(error.code).toEqual(code)
        expect(error.message).toContain("`GITHUB_TOKEN` or `GH_TOKEN`")
        expect(error.details).toContain("section must be followed")
    })
})