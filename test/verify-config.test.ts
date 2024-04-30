import { Platform, type Target, defaultCommit, defaultTitle } from "../lib/models/config"
import { describe, expect, test } from "bun:test"
import { ensureDefault, verifyConfig } from "../lib/verify-config"

import { getConfigError } from "../lib/error"

describe("ensureDefault", () => {
    test("should be fine without inputs", () => {
        // Act
        const actual = ensureDefault({})

        // Assert
        expect(actual).toEqual({
            ci: false,
            commit: defaultCommit,
            debug: false,
            dryRun: false,
            platform: Platform.GITHUB,
            repositoryUrl: "",
            targets: [],
            title: defaultTitle,
        })
    })

    test("should be fine with inputs", () => {
        // Arrange
        const targets: Target[] = [
            { from: "main", to: "develop" },
            { from: "main", to: "(staging|develop)" },
            { from: "v[0-9]+(.[0-9]+)?", to: "develop" },
        ]

        // Act
        const actual = ensureDefault({
            ci: true,
            commit: "some commit",
            debug: true,
            dryRun: true,
            platform: Platform.GITLAB,
            repositoryUrl: "some repository url",
            targets,
            title: "Some title",
        })

        // Assert
        expect(actual).toEqual({
            ci: true,
            commit: "some commit",
            debug: true,
            dryRun: true,
            platform: Platform.GITLAB,
            repositoryUrl: "some repository url",
            targets,
            title: "Some title",
        })
    })
})

describe("verifyConfig", () => {
    test("should throw an invalid commit with bad format", () => {
        // Arrange
        const config = ensureDefault({
            // @ts-expect-error because we want to check invalid inputs
            commit: { key: "value" },
        })

        // Act
        const { errors } = verifyConfig(config)

        // Assert
        expect(errors).toEqual([getConfigError("commit", config.commit)])
    })

    test("should throw an invalid title with bad format", () => {
        // Arrange
        const config = ensureDefault({
            // @ts-expect-error because we want to check invalid inputs
            title: { key: "value" },
        })

        // Act
        const { errors } = verifyConfig(config)

        // Assert
        expect(errors).toEqual([getConfigError("title", config.title)])
    })

    test("should throw an invalid debug with bad format", () => {
        // Arrange
        const config = ensureDefault({
            // @ts-expect-error because we want to check invalid inputs
            debug: { key: "value" },
        })

        // Act
        const { errors } = verifyConfig(config)

        // Assert
        expect(errors).toEqual([getConfigError("debug", config.debug)])
    })

    test("should throw an invalid dryRun with bad format", () => {
        // Arrange
        const config = ensureDefault({
            // @ts-expect-error because we want to check invalid inputs
            dryRun: { key: "value" },
        })

        // Act
        const { errors } = verifyConfig(config)

        // Assert
        expect(errors).toEqual([getConfigError("dryRun", config.dryRun)])
    })

    test("should throw an invalid platform with bad format", () => {
        // Arrange
        const config = ensureDefault({
            // @ts-expect-error because we want to check invalid inputs
            platform: { key: "value" },
        })

        // Act
        const { errors } = verifyConfig(config)

        // Assert
        expect(errors).toEqual([getConfigError("platform", config.platform)])
    })

    test("should throw an invalid platform with bad value", () => {
        // Arrange
        const config = ensureDefault({
            // @ts-expect-error because we want to check invalid inputs
            platform: "some invalid value",
        })

        // Act
        const { errors } = verifyConfig(config)

        // Assert
        expect(errors).toEqual([getConfigError("platform", config.platform)])
    })

    test("should throw an invalid branch with bad format", () => {
        // Arrange
        const config = ensureDefault({
            // @ts-expect-error because we want to check invalid inputs
            targets: "",
        })

        // Act
        const { errors } = verifyConfig(config)

        // Assert
        expect(errors).toEqual([getConfigError("targets", config.targets)])
    })

    test("should throw an invalid branch error with bad target", () => {
        // Arrange
        // @ts-expect-error because we want to check invalid inputs
        const targets: Target[] = [{ from: "main" }]
        const config = ensureDefault({ targets })

        // Act
        const { errors } = verifyConfig(config)

        // Assert
        expect(errors).toEqual([getConfigError("targets", targets)])
    })

    test("should be fine without any targets input", () => {
        // Arrange
        const config = ensureDefault({})

        // Act
        const { errors } = verifyConfig(config)

        // Assert
        expect(errors).toBeEmpty()
    })

    test("should be fine with valid inputs", () => {
        // Arrange
        const config = ensureDefault({
            platform: Platform.GITLAB,
            targets: [
                { from: "main", to: "develop" },
                { from: "main", to: "(staging|develop)" },
                { from: "v[0-9]+(.[0-9]+)?", to: "develop" }
            ],
        })

        // Act
        const { errors } = verifyConfig(config)

        // Assert
        expect(errors).toBeEmpty()
    })
})