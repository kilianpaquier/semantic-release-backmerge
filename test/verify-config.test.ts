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
            apiPathPrefix: "",
            baseUrl: "",
            ci: false,
            commit: defaultCommit,
            debug: false,
            dryRun: false,
            platform: Platform.NULL,
            repositoryUrl: "",
            targets: [],
            title: defaultTitle,
            token: ""
        })
    })

    test("should be fine with bitbucket", () => {
        // Arrange
        const env = { BITBUCKET_URL: "some value" }

        // Act
        const actual = ensureDefault({}, env)

        // Assert
        expect(actual).toEqual({
            apiPathPrefix: "/rest/api/1.0",
            baseUrl: "some value",
            ci: false,
            commit: defaultCommit,
            debug: false,
            dryRun: false,
            platform: Platform.BITBUCKET,
            repositoryUrl: "",
            targets: [],
            title: defaultTitle,
            token: ""
        })
    })

    test("should be fine with bitbucket cloud", () => {
        // Arrange
        const env = { BITBUCKET_CLOUD_URL: "some value" }

        // Act
        const actual = ensureDefault({}, env)

        // Assert
        expect(actual).toEqual({
            apiPathPrefix: "/2.0",
            baseUrl: "some value",
            ci: false,
            commit: defaultCommit,
            debug: false,
            dryRun: false,
            platform: Platform.BITBUCKET_CLOUD,
            repositoryUrl: "",
            targets: [],
            title: defaultTitle,
            token: ""
        })
    })

    test("should be fine with gitea", () => {
        // Arrange
        const env = { GITEA_URL: "some value" }

        // Act
        const actual = ensureDefault({}, env)

        // Assert
        expect(actual).toEqual({
            apiPathPrefix: "/api/v1",
            baseUrl: "some value",
            ci: false,
            commit: defaultCommit,
            debug: false,
            dryRun: false,
            platform: Platform.GITEA,
            repositoryUrl: "",
            targets: [],
            title: defaultTitle,
            token: ""
        })
    })

    test("should be fine with github url", () => {
        // Arrange
        const env = { GITHUB_URL: "some value" }

        // Act
        const actual = ensureDefault({}, env)

        // Assert
        expect(actual).toEqual({
            apiPathPrefix: "",
            baseUrl: "some value",
            ci: false,
            commit: defaultCommit,
            debug: false,
            dryRun: false,
            platform: Platform.GITHUB,
            repositoryUrl: "",
            targets: [],
            title: defaultTitle,
            token: ""
        })
    })

    test("should be fine with github api url", () => {
        // Arrange
        const env = { GITHUB_API_URL: "some value" }

        // Act
        const actual = ensureDefault({}, env)

        // Assert
        expect(actual).toEqual({
            apiPathPrefix: "",
            baseUrl: "some value",
            ci: false,
            commit: defaultCommit,
            debug: false,
            dryRun: false,
            platform: Platform.GITHUB,
            repositoryUrl: "",
            targets: [],
            title: defaultTitle,
            token: ""
        })
    })

    test("should be fine with gitlab url", () => {
        // Arrange
        const env = { GITLAB_URL: "some value" }

        // Act
        const actual = ensureDefault({}, env)

        // Assert
        expect(actual).toEqual({
            apiPathPrefix: "/api/v4",
            baseUrl: "some value",
            ci: false,
            commit: defaultCommit,
            debug: false,
            dryRun: false,
            platform: Platform.GITLAB,
            repositoryUrl: "",
            targets: [],
            title: defaultTitle,
            token: ""
        })
    })

    test("should be fine with gitlab ci server url", () => {
        // Arrange
        const env = { CI_SERVER_URL: "some value" }

        // Act
        const actual = ensureDefault({ apiPathPrefix: "/api/v3" }, env)

        // Assert
        expect(actual).toEqual({
            apiPathPrefix: "/api/v3",
            baseUrl: "some value",
            ci: false,
            commit: defaultCommit,
            debug: false,
            dryRun: false,
            platform: Platform.GITLAB,
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
            { from: "v[0-9]+(\.[0-9]+)?", to: "develop" },
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
            token: "some token" // ensure it's not taken
        })

        // Assert
        expect(actual).toEqual({
            apiPathPrefix: "",
            baseUrl: "",
            ci: true,
            commit: "some commit",
            debug: true,
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
        repositoryUrl: "some repository url",
    }, { GITHUB_TOKEN: "some token" })

    test("should throw an invalid commit with bad format", () => {
        // Arrange
        const config = ensureDefault({
            ...validConfig,
            // @ts-expect-error because we want to check invalid inputs
            commit: { key: "value" },
        }, { GITHUB_TOKEN: "some token" })

        // Act
        const errors = verifyConfig(config)

        // Assert
        expect(errors).toEqual([getConfigError("commit", config.commit)])
    })

    test("should throw an invalid title with bad format", () => {
        // Arrange
        const config = ensureDefault({
            ...validConfig,
            // @ts-expect-error because we want to check invalid inputs
            title: { key: "value" },
        }, { GITHUB_TOKEN: "some token" })

        // Act
        const errors = verifyConfig(config)

        // Assert
        expect(errors).toEqual([getConfigError("title", config.title)])
    })

    test("should throw an invalid debug with bad format", () => {
        // Arrange
        const config = ensureDefault({
            ...validConfig,
            // @ts-expect-error because we want to check invalid inputs
            debug: { key: "value" },
        }, { GITHUB_TOKEN: "some token" })

        // Act
        const errors = verifyConfig(config)

        // Assert
        expect(errors).toEqual([getConfigError("debug", config.debug)])
    })

    test("should throw an invalid dryRun with bad format", () => {
        // Arrange
        const config = ensureDefault({
            ...validConfig,
            // @ts-expect-error because we want to check invalid inputs
            dryRun: { key: "value" },
        }, { GITHUB_TOKEN: "some token" })

        // Act
        const errors = verifyConfig(config)

        // Assert
        expect(errors).toEqual([getConfigError("dryRun", config.dryRun)])
    })

    test("should throw an invalid platform with bad format", () => {
        // Arrange
        const config = ensureDefault({
            ...validConfig,
            // @ts-expect-error because we want to check invalid inputs
            platform: { key: "value" },
        }, { GITHUB_TOKEN: "some token" })

        // Act
        const errors = verifyConfig(config)

        // Assert
        expect(errors).toEqual([getConfigError("platform", config.platform)])
    })

    test("should throw an invalid platform with bad value", () => {
        // Arrange
        const config = ensureDefault({
            ...validConfig,
            // @ts-expect-error because we want to check invalid inputs
            platform: "some invalid value",
        }, { GITHUB_TOKEN: "some token" })

        // Act
        const errors = verifyConfig(config)

        // Assert
        expect(errors).toEqual([getConfigError("platform", config.platform)])
    })

    test("should throw an invalid branch with bad format", () => {
        // Arrange
        const config = ensureDefault({
            ...validConfig,
            // @ts-expect-error because we want to check invalid inputs
            targets: "",
        }, { GITHUB_TOKEN: "some token" })

        // Act
        const errors = verifyConfig(config)

        // Assert
        expect(errors).toEqual([getConfigError("targets", config.targets)])
    })

    test("should throw an invalid branch error with bad target", () => {
        // Arrange
        // @ts-expect-error because we want to check invalid inputs
        const targets: Target[] = [{ from: "main" }]
        const config = ensureDefault({
            ...validConfig,
            targets,
        }, { GITHUB_TOKEN: "some token" })

        // Act
        const errors = verifyConfig(config)

        // Assert
        expect(errors).toEqual([getConfigError("targets", targets)])
    })

    test("should throw an invalid platform with base url", () => {
        // Arrange
        const config = ensureDefault({
            baseUrl: "https://example.com",
            repositoryUrl: "some repository url",
        }, { GITHUB_TOKEN: "some token" })

        // Act
        const errors = verifyConfig(config)

        // Assert
        expect(errors).toEqual([getConfigError("platform", "")])
    })

    test("should be fine with base url", () => {
        // Arrange
        const config = ensureDefault({
            baseUrl: "https://example.com",
            platform: Platform.GITHUB,
            repositoryUrl: "some repository url",
            targets: [
                { from: "main", to: "develop" },
                { from: "main", to: "staging" },
                { from: "v[0-9]+(\.[0-9]+)?", to: "develop" }
            ],
        }, { GITHUB_TOKEN: "some token" })

        // Act
        const errors = verifyConfig(config)

        // Assert
        expect(errors).toBeEmpty()
    })
})