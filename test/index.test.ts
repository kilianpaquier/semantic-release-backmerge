import * as backmerge from "../lib/backmerge"
import * as git from "../lib/git"
import * as index from "../index"
import * as platform from "../lib/platform-handler"
import * as verify from "../lib/verify-config"

import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { success, verifyConditions } from "../index"

import { BackmergeConfig } from "../lib/models/config"
import { SuccessContext } from "semantic-release"
import { TestPlatformHandler } from "./platform-handler.test"
import { ensureDefault } from "../lib/verify-config"

const getContext = (name: string): SuccessContext => ({
    branch: { name },
    branches: [],
    commits: [],
    env: {},
    envCi: {
        branch: "",
        commit: "",
        isCi: false,
    },
    lastRelease: {
        channels: [],
        gitHead: "",
        gitTag: "v0.0.0",
        name: "last_release",
        version: "v0.0.0",
    },
    logger: console,
    nextRelease: {
        channel: "",
        gitHead: "",
        gitTag: "v0.0.0",
        name: "next_release",
        type: "major",
        version: "v0.0.0",
    },
    releases: [],
    // @ts-expect-error unused
    stderr: undefined, // eslint-disable-line no-undefined
    // @ts-expect-error unused
    stdout: undefined, // eslint-disable-line no-undefined
})

describe("verifyConditions", () => {
    afterEach(() => mock.restore())

    const context = getContext("main")

    test("should fail with git version unverifiable", () => {
        // Arrange
        spyOn(git, "version").mockImplementation(async () => { throw new Error("an error message") })
        const config = ensureDefault({}, {})

        // Act
        const matcher = expect(async () => await verifyConditions(config, context))

        // Assert
        matcher.toThrowError("Failed to ensure git is spawnable by backmerge process.")
    })

    test("should fail with at least one invalid config field", () => {
        // Arrange
        spyOn(git, "version").mockImplementation(async () => "git version <some version>")
        spyOn(verify, "verifyConfig").mockImplementation(() => { throw new Error("an error message") })
        const config = ensureDefault({}, {})

        // Act
        const matcher = expect(async () => await verifyConditions(config, context))

        // Assert
        matcher.toThrowError("an error message")
    })

    test("should fail when platform handler cannot be created", () => {
        // Arrange
        spyOn(git, "version").mockImplementation(async () => "git version <some version>")
        spyOn(verify, "verifyConfig").mockImplementation(() => {})
        spyOn(platform, "newPlatformHandler").mockImplementation(() => { throw new Error("an error message") })
        const config = ensureDefault({}, {})

        // Act
        const matcher = expect(async () => await verifyConditions(config, context))

        // Assert
        matcher.toThrowError("an error message")
    })

    test("should return configuration and platform handler", async () => {
        // Arrange
        spyOn(git, "version").mockImplementation(async () => "git version <some version>")
        spyOn(verify, "verifyConfig").mockImplementation(() => {})
        spyOn(platform, "newPlatformHandler").mockImplementation(() => new TestPlatformHandler())
        const config = ensureDefault({}, {})

        // Act
        const [actual, handler] = await verifyConditions(config, context)

        // Assert
        expect(actual).toEqual(config)
        expect(handler).toEqual(new TestPlatformHandler())
    })
})

describe("success", () => {
    afterEach(() => mock.restore())

    const context = getContext("main")

    test("should fail with invalid configuration", () => {
        // Arrange
        spyOn(index, "verifyConditions").mockImplementation(async () => { throw new Error("an error message") })

        const config = ensureDefault({}, {})

        // Act
        const matcher = expect(async () => await success(config, context))

        // Assert
        matcher.toThrowError("an error message")
    })

    test("should not have any target configured", () => {
        // Arrange
        spyOn(index, "verifyConditions").mockImplementation(async (config: BackmergeConfig) => [config, new TestPlatformHandler()])
        spyOn(git, "fetch").mockImplementation(async () => { throw new Error("shouldn't be called") })

        const config = ensureDefault({ targets: [{ from: "staging", to: "develop" }] }, {})

        // Act
        const matcher = expect(async () => await success(config, context))

        // Assert
        matcher.not.toThrow()
    })

    test("should fail to fetch remote", async () => {
        // Arrange
        spyOn(index, "verifyConditions").mockImplementation(async (config: BackmergeConfig) => [config, new TestPlatformHandler()])
        spyOn(git, "fetch").mockImplementation(async () => { throw new Error("an error message") })

        const config = ensureDefault({ targets: [{ from: "main", to: "staging" }] }, {})

        // Act
        const matcher = expect(async () => await success(config, context))

        // Assert
        matcher.toThrowError("Failed to fetch git remote or list all branches.")
    })

    test("should fail to list remote", async () => {
        // Arrange
        spyOn(index, "verifyConditions").mockImplementation(async (config: BackmergeConfig) => [config, new TestPlatformHandler()])
        spyOn(git, "fetch").mockImplementation(async () => {})
        spyOn(git, "ls").mockImplementation(async () => { throw new Error("an error message") })

        const config = ensureDefault({ targets: [{ from: "main", to: "staging" }] }, {})

        // Act
        const matcher = expect(async () => await success(config, context))

        // Assert
        matcher.toThrowError("Failed to fetch git remote or list all branches.")
    })

    test("should not find released branch in remote branches", () => {
        // Arrange
        spyOn(index, "verifyConditions").mockImplementation(async (config: BackmergeConfig) => [config, new TestPlatformHandler()])
        spyOn(git, "fetch").mockImplementation(async () => {})
        spyOn(git, "ls").mockImplementation(async () => [{ hash: "", name: "staging" }])
        spyOn(git, "checkout").mockImplementation(async () => { throw new Error("an error message") })

        const config = ensureDefault({ targets: [{ from: "main", to: "staging" }] }, {})

        // Act
        const matcher = expect(async () => await success(config, context))

        // Assert
        matcher.toThrowError("Failed to retrieve released branch last commit hash. This shouldn't happen.")
    })

    test("should not have any mergeable remote branches", () => {
        // Arrange
        spyOn(index, "verifyConditions").mockImplementation(async (config: BackmergeConfig) => [config, new TestPlatformHandler()])
        spyOn(backmerge, "filter").mockImplementation(() => [])
        spyOn(git, "fetch").mockImplementation(async () => {})
        spyOn(git, "ls").mockImplementation(async () => [{ hash: "", name: "main" }])
        spyOn(git, "checkout").mockImplementation(async () => { throw new Error("shouldn't be called") })

        const config = ensureDefault({ targets: [{ from: "main", to: "staging" }] }, {})

        // Act
        const matcher = expect(async () => await success(config, context))

        // Assert
        matcher.not.toThrow()
    })

    test("should fail to checkout released branch", async () => {
        // Arrange
        spyOn(index, "verifyConditions").mockImplementation(async (config: BackmergeConfig) => [config, new TestPlatformHandler()])
        spyOn(backmerge, "filter").mockImplementation(() => [{ hash: "", name: "staging" }])
        spyOn(git, "fetch").mockImplementation(async () => {})
        spyOn(git, "ls").mockImplementation(async () => [{ hash: "", name: "main" }])
        spyOn(git, "checkout").mockImplementation(async () => { throw new Error("an error message") })

        const config = ensureDefault({ targets: [{ from: "main", to: "staging" }] }, {})

        // Act
        const matcher = expect(async () => await success(config, context))

        // Assert
        matcher.toThrowError("Failed to checkout released branch 'main'.")
    })

    test("should fail to backmerge", () => {
        // Arrange
        spyOn(index, "verifyConditions").mockImplementation(async (config: BackmergeConfig) => [config, new TestPlatformHandler()])
        spyOn(backmerge, "filter").mockImplementation(() => [{ hash: "", name: "staging" }])
        spyOn(backmerge, "backmerge").mockImplementation(async () => { throw new Error("an error message") })
        spyOn(git, "fetch").mockImplementation(async () => {})
        spyOn(git, "ls").mockImplementation(async () => [{ hash: "", name: "main" }])
        spyOn(git, "checkout").mockImplementation(async () => {})

        const config = ensureDefault({ targets: [{ from: "main", to: "staging" }] }, {})

        // Act
        const matcher = expect(async () => await success(config, context))

        // Assert
        matcher.toThrowError("an error message")
    })

    test("should perform backmerge", () => {
        // Arrange
        spyOn(index, "verifyConditions").mockImplementation(async (config: BackmergeConfig) => [config, new TestPlatformHandler()])
        spyOn(backmerge, "filter").mockImplementation(() => [{ hash: "", name: "staging" }])
        spyOn(backmerge, "backmerge").mockImplementation(async () => {})
        spyOn(git, "fetch").mockImplementation(async () => {})
        spyOn(git, "ls").mockImplementation(async () => [{ hash: "", name: "main" }])
        spyOn(git, "checkout").mockImplementation(async () => {})

        const config = ensureDefault({ targets: [{ from: "main", to: "staging" }] }, {})

        // Act
        const matcher = expect(async () => await success(config, context))

        // Assert
        matcher.not.toThrow()
    })
})