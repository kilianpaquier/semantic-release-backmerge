import * as git from "../lib/git"

import { Context, executeBackmerge, getBranches } from "../lib/backmerge"
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"

import { Platform } from "../lib/models/config"
import { TestPlatformHandler } from "./platform-handler.test"
import { ensureDefault } from "../lib/verify-config"

const getContext = (name: string): Context => ({
    branch: { name },
    env: {},
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
    }
})

describe("getBranches", () => {
    afterEach(() => mock.restore())

    test("should not return any branch", async () => {
        // Arrange
        const context = getContext("main")
        const config = ensureDefault({
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
            targets: [{ from: "staging", to: "develop" }],
        }, {})

        // Act
        const branches = await getBranches(context, config, new TestPlatformHandler())

        // Assert
        expect(branches).toBeEmpty()
    })

    test("should fail to fetch", () => {
        // Arrange
        spyOn(git, "fetch").mockImplementation(() => { throw new Error("an error message") })

        const context = getContext("main")
        const config = ensureDefault({
            platform: Platform.GITHUB,
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
            targets: [{ from: "main", to: "staging" }],
        }, {})

        // Act
        const matcher = expect(async () => await getBranches(context, config, new TestPlatformHandler()))

        // Assert
        matcher.toThrowError("Failed to fetch git remote or list all branches.")
    })

    test("should fail to ls branches", () => {
        // Arrange
        spyOn(git, "fetch").mockImplementation(async () => {})
        spyOn(git, "ls").mockImplementation(() => { throw new Error("an error message") })

        const context = getContext("main")
        const config = ensureDefault({
            platform: Platform.GITHUB,
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
            targets: [{ from: "main", to: "staging" }],
        }, {})

        // Act
        const matcher = expect(async () => await getBranches(context, config, new TestPlatformHandler()))

        // Assert
        matcher.toThrowError("Failed to fetch git remote or list all branches.")
    })

    test("should not retrieve older semver branches", async () => {
        // Arrange
        spyOn(git, "fetch").mockImplementation(async () => {})
        const spy = spyOn(git, "ls").mockImplementation(async () => ["v1.0", "v1.1", "v1.2"])

        const context = getContext("v1.2")
        const config = ensureDefault({
            platform: Platform.GITHUB,
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
            targets: [{ from: "v[0-9]+(.[0-9]+)?", to: "v[0-9]+(.[0-9]+)?" }],
        }, {})

        // Act
        const branches = await getBranches(context, config, new TestPlatformHandler())

        // Assert
        expect(spy).toHaveBeenCalled()
        expect(branches).toBeEmpty()
    })

    test("should retrieve some branches", async () => {
        // Arrange
        const expectedURL = "https://test-user:some-token@github.com/kilianpaquier/semantic-release-backmerge.git"

        let fetchRemote = ""
        let lsRemote = ""
        spyOn(git, "fetch").mockImplementation(async (remote) => { fetchRemote = remote })
        spyOn(git, "ls").mockImplementation(async (remote) => { 
            lsRemote = remote
            return ["develop", "staging"] 
        })

        const context = getContext("main")
        const config = ensureDefault({
            platform: Platform.GITHUB,
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
            targets: [{ from: "main", to: "(develop|staging)" }],
        }, { GITHUB_TOKEN: "some-token" })

        // Act
        const branches = await getBranches(context, config, new TestPlatformHandler())

        // Assert
        expect(fetchRemote).toEqual(expectedURL)
        expect(lsRemote).toEqual(config.repositoryUrl)
        expect(branches).toEqual(["develop", "staging"])
    })

    test("should retrieve more recent semver branches but only same major version", async () => {
        // Arrange
        spyOn(git, "fetch").mockImplementation(async () => {})
        spyOn(git, "ls").mockImplementation(async () => ["v1.0", "v1.1", "v1.2", "v1.3", "v1.4", "v2.0", "v2.6"])

        const context = getContext("v1.2")
        const config = ensureDefault({
            platform: Platform.GITHUB,
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
            targets: [{ from: "v[0-9]+(.[0-9]+)?", to: "v[0-9]+(.[0-9]+)?" }],
        }, {})

        // Act
        const branches = await getBranches(context, config, new TestPlatformHandler())

        // Assert
        expect(branches).toEqual(["v1.3", "v1.4"])
    })

    test("should retrieve more recent semver branches but only same major version (.x case)", async () => {
        // Arrange
        spyOn(git, "fetch").mockImplementation(async () => {})
        spyOn(git, "ls").mockImplementation(async () => ["v1.0.x", "v1.1.x", "v1.2.x", "v1.3.x", "v1.4.x", "v2.0.x", "v2.6.x"])

        const context = getContext("v1.2.x")
        const config = ensureDefault({
            platform: Platform.GITHUB,
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
            targets: [{ from: "v[0-9]+(.{[0-9]+,x})?", to: "v[0-9]+(.{[0-9]+,x})?" }],
        }, {})

        // Act
        const branches = await getBranches(context, config, new TestPlatformHandler())

        // Assert
        expect(branches).toEqual(["v1.3.x", "v1.4.x"])
    })

    test("should retrieve no version since it's the major one", async () => {
        // Arrange
        spyOn(git, "fetch").mockImplementation(async () => {})
        spyOn(git, "ls").mockImplementation(async () => ["v1.0", "v1.1", "v1.2", "v1.3", "v1.4", "v2.0", "v2.6"])

        const context = getContext("v1")
        const config = ensureDefault({
            platform: Platform.GITHUB,
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
            targets: [{ from: "v[0-9]+(.[0-9]+)?", to: "v[0-9]+(.[0-9]+)?" }],
        }, {})

        // Act
        const branches = await getBranches(context, config, new TestPlatformHandler())

        // Assert
        expect(branches).toBeEmpty()
    })

    test("should retrieve no version since it's the major one (.x case)", async () => {
        // Arrange
        spyOn(git, "fetch").mockImplementation(async () => {})
        spyOn(git, "ls").mockImplementation(async () => ["v1.0.x", "v1.1.x", "v1.2.x", "v1.3.x", "v1.4.x", "v2.0.x", "v2.6.x"])

        const context = getContext("v1.x")
        const config = ensureDefault({
            platform: Platform.GITHUB,
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
            targets: [{ from: "v[0-9]+(.{[0-9]+,x})?", to: "v[0-9]+(.{[0-9]+,x})?" }],
        }, {})

        // Act
        const branches = await getBranches(context, config, new TestPlatformHandler())

        // Assert
        expect(branches).toBeEmpty()
    })
})

describe("executeBackmerge", () => {
    afterEach(() => mock.restore())

    test("should fail to fetch remote", () => {
        // Arrange
        spyOn(git, "fetch").mockImplementation(() => { throw new Error("an error message") })

        const context = getContext("main")
        const config = ensureDefault({
            baseUrl: "https://example.com",
            platform: Platform.GITHUB,
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
        }, {})

        // Act
        const matcher = expect(async () => await executeBackmerge(context, config, new TestPlatformHandler(), []))

        // Assert
        matcher.toThrowError("Failed to fetch or checkout released branch 'main'.")
    })

    test("should fail to checkout released branch", () => {
        // Arrange
        spyOn(git, "fetch").mockImplementation(async () => {})
        spyOn(git, "checkout").mockImplementation(() => { throw new Error("an error message") })

        const context = getContext("main")
        const config = ensureDefault({
            baseUrl: "https://example.com",
            platform: Platform.GITHUB,
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
        }, {})

        // Act
        const matcher = expect(async () => await executeBackmerge(context, config, new TestPlatformHandler(), []))

        // Assert
        matcher.toThrowError("Failed to fetch or checkout released branch 'main'.")
    })

    test("should fail to merge branch and create pull request", async () => {
        // Arrange
        const has = async (): Promise<boolean> => false
        let called = false
        const create = async (): Promise<void> => { called = true }

        spyOn(git, "fetch").mockImplementation(async () => {})
        spyOn(git, "checkout").mockImplementation(async () => {})
        spyOn(git, "merge").mockImplementation(() => { throw new Error("an error message") })
        spyOn(git, "push").mockImplementation(() => { throw new Error("shouldn't be called") })

        const context = getContext("main")
        const config = ensureDefault({
            baseUrl: "https://example.com",
            platform: Platform.GITHUB,
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
        }, {})

        // Act
        await executeBackmerge(context, config, new TestPlatformHandler(create, has), ["staging"])

        // Assert
        expect(called).toBeTrue()
    })

    test("should fail to merge branch and not create a pull request since it exists", async () => {
        // Arrange
        const has = async (): Promise<boolean> => true
        let called = false
        const create = async (): Promise<void> => { called = true }

        spyOn(git, "fetch").mockImplementation(async () => {})
        spyOn(git, "checkout").mockImplementation(async () => {})
        spyOn(git, "merge").mockImplementation(() => { throw new Error("an error message") })
        spyOn(git, "push").mockImplementation(() => { throw new Error("shouldn't be called") })

        const context = getContext("main")
        const config = ensureDefault({
            baseUrl: "https://example.com",
            platform: Platform.GITHUB,
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
        }, {})

        // Act
        await executeBackmerge(context, config, new TestPlatformHandler(create, has), ["staging"])

        // Assert
        expect(called).toBeFalse()
    })

    test("should fail to merge branch but not create pull request dry run", async () => {
        // Arrange
        const has = async (): Promise<boolean> => false
        let called = false
        const create = async (): Promise<void> => { called = true }

        spyOn(git, "fetch").mockImplementation(async () => {})
        spyOn(git, "checkout").mockImplementation(async () => {})
        spyOn(git, "merge").mockImplementation(() => { throw new Error("an error message") })
        spyOn(git, "push").mockImplementation(() => { throw new Error("shouldn't be called") })

        const context = getContext("main")
        const config = ensureDefault({
            baseUrl: "https://example.com",
            dryRun: true,
            platform: Platform.GITHUB,
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
        }, {})

        // Act
        await executeBackmerge(context, config, new TestPlatformHandler(create, has), ["staging"])

        // Assert
        expect(called).toBeFalse()
    })

    test("should fail to push branch and fail to create pull request", () => {
        // Arrange
        const has = async (): Promise<boolean> => false
        const create = async (): Promise<void> => { throw new Error("pull request error") }

        spyOn(git, "fetch").mockImplementation(async () => {})
        spyOn(git, "checkout").mockImplementation(async () => {})
        spyOn(git, "merge").mockImplementation(async () => {})
        spyOn(git, "push").mockImplementation(() => { throw new Error("an error message") })

        const context = getContext("main")
        const config = ensureDefault({
            baseUrl: "https://example.com",
            platform: Platform.GITHUB,
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
        }, {})

        // Act
        const matcher = expect(async () => await executeBackmerge(context, config, new TestPlatformHandler(create, has), ["staging"]))

        // Assert
        matcher.toThrowError("Failed to create pull request from 'main' to 'staging'.")
    })

    test("should succeed to merge and push a branch", async () => {
        // Arrange
        const expectedURL = "https://test-user:some-token@github.com/kilianpaquier/semantic-release-backmerge.git"

        let fetchRemote = ""
        let checkoutBranch = ""
        let merge: { commit?: string, from?: string, to?: string } = {}
        let push: { branch?: string, dryRun?: boolean, remote?: string } = {}
        spyOn(git, "fetch").mockImplementation(async (remote: string) => {
            fetchRemote = remote
        })
        spyOn(git, "checkout").mockImplementation(async (branch: string) => {
            checkoutBranch = branch
        })
        spyOn(git, "merge").mockImplementation(async (from: string, to: string, commit: string) => {
            merge = { commit, from, to }
        })
        spyOn(git, "push").mockImplementation(async (remote: string, branch: string, dryRun?: boolean) => { 
            push = { branch, dryRun, remote }
        })

        const context = getContext("main")
        const config = ensureDefault({
            baseUrl: "https://example.com",
            dryRun: true,
            platform: Platform.GITHUB,
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
        }, { GITHUB_TOKEN: "some-token" })

        // Act
        await executeBackmerge(context, config, new TestPlatformHandler(), ["staging"])

        // Assert
        expect(fetchRemote).toEqual(expectedURL)
        expect(checkoutBranch).toEqual("main")
        expect(merge).toEqual({ commit: "chore(release): merge branch main into staging [skip ci]", from: "main", to: "staging" })
        expect(push).toEqual({ branch: "staging", dryRun: true, remote: expectedURL })
    })
})