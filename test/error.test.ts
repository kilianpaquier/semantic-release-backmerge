import { describe, expect, test } from "bun:test"

import { getConfigError } from "../lib/error"

describe("getConfigError", () => {
    test("should have a valid api path prefix error", () => {
        // Arrange
        const code = "EINVALIDAPIPATHPREFIX"

        // Act
        const error = getConfigError("apiPathPrefix", {})

        // Assert
        expect(error.code).toEqual(code)
        expect(error.message).toContain("'apiPathPrefix'")
        expect(error.details).toContain("must be a string")
        expect(error.details).toContain("value is {}.")
    })

    test("should have a valid base url error", () => {
        // Arrange
        const code = "EINVALIDBASEURL"

        // Act
        const error = getConfigError("baseUrl", "")

        // Assert
        expect(error.code).toEqual(code)
        expect(error.message).toContain("'baseUrl'")
        expect(error.details).toContain("must be a non empty string")
    })

    test("should have a valid token error", () => {
        // Arrange
        const code = "EINVALIDTOKEN"

        // Act
        const error = getConfigError("token", "shouldn't be logged")

        // Assert
        expect(error.code).toEqual(code)
        expect(error.message).toContain("'token'")
        expect(error.details).toContain("must be a non empty string")
        expect(error.details).not.toContain("shouldn't be logged")
    })

    test("should have a valid targets error", () => {
        // Arrange
        const code = "EINVALIDTARGETS"

        // Act
        const error = getConfigError("targets", "some invalid targets")

        // Assert
        expect(error.code).toEqual(code)
        expect(error.message).toContain("'targets'")
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
        expect(error.message).toContain("'platform'")
        expect(error.details).toContain("must be one of 'bitbucket', 'bitbucket-cloud', 'gitea', 'github', 'gitlab'")
        expect(error.details).toContain("some invalid platform")
    })

    test("should have a valid commit error", () => {
        // Arrange
        const code = "EINVALIDCOMMIT"

        // Act
        const error = getConfigError("commit", true)

        // Assert
        expect(error.code).toEqual(code)
        expect(error.message).toContain("'commit'")
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
        expect(error.message).toContain("'title'")
        expect(error.details).toContain("must be a non empty string")
        expect(error.details).toContain("true")
    })

    test("should have a valid debug error", () => {
        // Arrange
        const code = "EINVALIDDEBUG"

        // Act
        const error = getConfigError("debug", "some invalid debug")

        // Assert
        expect(error.code).toEqual(code)
        expect(error.message).toContain("'debug'")
        expect(error.details).toBeEmpty()
    })

    test("should have a valid dryRun error", () => {
        // Arrange
        const code = "EINVALIDDRYRUN"

        // Act
        const error = getConfigError("dryRun", "some invalid dryRun")

        // Assert
        expect(error.code).toEqual(code)
        expect(error.message).toContain("'dryRun'")
        expect(error.details).toBeEmpty()
    })

    test("should have a valid ci error", () => {
        // Arrange
        const code = "EINVALIDCI"

        // Act
        const error = getConfigError("ci", "some invalid ci")

        // Assert
        expect(error.code).toEqual(code)
        expect(error.message).toContain("'ci'")
        expect(error.details).toBeEmpty()
    })
})
