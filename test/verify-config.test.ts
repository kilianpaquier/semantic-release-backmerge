import { Platform, Target, defaultCommit, defaultTitle } from "../lib/models/config"
import { describe, expect, test } from "bun:test"
import { ensureDefault, verifyConfig } from "../lib/verify-config"

import { getConfigError } from "../lib/error"

describe("ensureDefault", () => {
    test("should be fine without inputs", () => {
        // Act
        const actual = ensureDefault({}, {})

        // Assert
        expect(actual).toEqual({
            apiPathPrefix: "",
            baseUrl: "",
            checkHasPull: true,
            commit: defaultCommit,
            dryRun: false,
            platform: Platform.NULL,
            repositoryUrl: "",
            targets: [],
            title: defaultTitle,
            token: ""
        })
    })

    test("should be fine with inputs", () => {
        // Arrange
        const targets: Target[] = [
            { from: "main", to: "develop" },
            { from: "main", to: "staging" },
            { from: "v[0-9]+(.[0-9]+)?", to: "develop" },
        ]

        // Act
        const actual = ensureDefault({
            checkHasPull: false,
            commit: "some commit",
            dryRun: true,
            platform: Platform.GITLAB,
            repositoryUrl: "some repository url",
            targets,
            title: "Some title",
            token: "some token" // ensure it's not taken
        }, {})

        // Assert
        expect(actual).toEqual({
            apiPathPrefix: "",
            baseUrl: "",
            checkHasPull: false,
            commit: "some commit",
            dryRun: true,
            platform: Platform.GITLAB,
            repositoryUrl: "some repository url",
            targets,
            title: "Some title",
            token: ""
        })
    })
})

describe("verifyConfig", () => {
    const validConfig = ensureDefault({
        baseUrl: "https://example.com",
        platform: Platform.GITHUB,
    }, { GITHUB_TOKEN: "some token" })

    test("should throw an invalid commit with bad format", () => {
        // Arrange
        const config = ensureDefault({
            ...validConfig,
            // @ts-expect-error because we want to check invalid inputs
            commit: { key: "value" },
        }, { GITHUB_TOKEN: "some token" })

        // Act
        const matcher = expect(() => verifyConfig(config))

        // Assert
        matcher.toThrowError(getConfigError("commit", config.commit).message)
    })

    test("should throw an invalid title with bad format", () => {
        // Arrange
        const config = ensureDefault({
            ...validConfig,
            // @ts-expect-error because we want to check invalid inputs
            title: { key: "value" },
        }, { GITHUB_TOKEN: "some token" })

        // Act
        const matcher = expect(() => verifyConfig(config))

        // Assert
        matcher.toThrowError(getConfigError("title", config.title).message)
    })

    test("should throw an invalid dryRun with bad format", () => {
        // Arrange
        const config = ensureDefault({
            ...validConfig,
            // @ts-expect-error because we want to check invalid inputs
            dryRun: { key: "value" },
        }, { GITHUB_TOKEN: "some token" })

        // Act
        const matcher = expect(() => verifyConfig(config))

        // Assert
        matcher.toThrowError(getConfigError("dryRun", config.dryRun).message)
    })

    test("should throw an invalid platform with bad format", () => {
        // Arrange
        const config = ensureDefault({
            ...validConfig,
            // @ts-expect-error because we want to check invalid inputs
            platform: { key: "value" },
        }, { GITHUB_TOKEN: "some token" })

        // Act
        const matcher = expect(() => verifyConfig(config))

        // Assert
        matcher.toThrowError(getConfigError("platform", config.platform).message)
    })

    test("should throw an invalid platform with bad value", () => {
        // Arrange
        const config = ensureDefault({
            ...validConfig,
            // @ts-expect-error because we want to check invalid inputs
            platform: "some invalid value",
        }, { GITHUB_TOKEN: "some token" })

        // Act
        const matcher = expect(() => verifyConfig(config))

        // Assert
        matcher.toThrowError(getConfigError("platform", config.platform).message)
    })

    test("should throw an invalid branch with bad format", () => {
        // Arrange
        const config = ensureDefault({
            ...validConfig,
            // @ts-expect-error because we want to check invalid inputs
            targets: "",
        }, { GITHUB_TOKEN: "some token" })

        // Act
        const matcher = expect(() => verifyConfig(config))

        // Assert
        matcher.toThrowError(getConfigError("targets", config.targets).message)
    })

    test("should throw an invalid branch error with bad target", () => {
        // Arrange
        const targets: Target[] = [{ from: "main", to: "" }]
        const config = ensureDefault({
            ...validConfig,
            targets,
        }, { GITHUB_TOKEN: "some token" })

        // Act
        const matcher = expect(() => verifyConfig(config))

        // Assert
        matcher.toThrowError(getConfigError("targets", targets).message)
    })

    test("should be fine with minimal inputs", () => {
        // Arrange
        const config = ensureDefault({ repositoryUrl: "some repository url" }, { GITHUB_TOKEN: "some token" })

        // Act
        const matcher = expect(() => verifyConfig(config))

        // Assert
        matcher.not.toThrow()
    })

    test("should be fine with some inputs", () => {
        // Arrange
        const config = ensureDefault({
            baseUrl: "https://example.com",
            platform: Platform.GITHUB,
            repositoryUrl: "some repository url",
            targets: [
                { from: "main", to: "develop" },
                { from: "main", to: "staging" },
                { from: "v[0-9]+(.[0-9]+)?", to: "develop" }
            ],
        }, { GITHUB_TOKEN: "some token" })

        // Act
        const matcher = expect(() => verifyConfig(config))

        // Assert
        matcher.not.toThrow()
    })
})