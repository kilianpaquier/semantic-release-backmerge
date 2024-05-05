import * as pulls from "../lib/pull-request"

import { Context, executeBackmerge, getBranches } from "../lib/backmerge"
import { afterAll, afterEach, describe, expect, mock, spyOn, test } from "bun:test"

import parse from "git-url-parse"

import { Git } from "../lib/git"
import { Platform } from "../lib/models/config"
import { authModificator } from "../lib/auth-modificator"
import { ensureDefault } from "../lib/verify-config"
import { getConfigError } from "../lib/error"

const getContext = (name: string): Context => ({
    branch: { name },
    lastRelease: {
        version: "v0.0.0",
        gitTag: "v0.0.0",
        channels: [],
        gitHead: "",
        name: "last_release"
    },
    logger: console,
    nextRelease: {
        type: "major",
        channel: "",
        version: "v0.0.0",
        gitTag: "v0.0.0",
        gitHead: "",
        name: "next_release"
    }
})

describe("getBranches", () => {
    test("should not return any branch", async () => {
        // Arrange
        const context = getContext("main")
        const config = ensureDefault({
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
            targets: [{ from: "staging", to: "develop" }],
        })

        // Act
        const branches = await getBranches(context, config)

        // Assert
        expect(branches).toBeEmpty()
    })

    test("should fail to fetch", async () => {
        // Arrange
        await mock.module("../lib/git", () => ({
            Git: class MockGit extends Git {
                public async fetch(): Promise<void> {
                    throw new Error("an error message")
                }
            }
        }))
        const context = getContext("main")
        const config = ensureDefault({
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
            targets: [{ from: "main", to: "staging" }],
        })

        // Act
        const matcher = expect(async () => await getBranches(context, config))

        // Assert
        matcher.toThrowError("an error message")
    })

    test("should fail to ls branches", async () => {
        // Arrange
        await mock.module("../lib/git", () => ({
            Git: class MockGit extends Git {
                public async fetch(): Promise<void> { }
                public async ls(): Promise<string[]> {
                    throw new Error("an error message")
                }
            }
        }))
        const context = getContext("main")
        const config = ensureDefault({
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
            targets: [{ from: "main", to: "staging" }],
        })

        // Act
        const matcher = expect(async () => await getBranches(context, config))

        // Assert
        matcher.toThrowError("an error message")
    })

    test("should not retrieve older semver branches", async () => {
        // Arrange
        let called = false
        await mock.module("../lib/git", () => ({
            Git: class MockGit extends Git {
                public async fetch(): Promise<void> { }
                public async ls(): Promise<string[]> {
                    called = true
                    return ["v1.0", "v1.1", "v1.2"]
                }
            }
        }))
        const context = getContext("v1.2")
        const config = ensureDefault({
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
            targets: [{ from: "v[0-9]+(.[0-9]+)?", to: "v[0-9]+(.[0-9]+)?" }],
        })

        // Act
        const branches = await getBranches(context, config)

        // Assert
        expect(called).toBeTrue()
        expect(branches).toBeEmpty()
    })

    test("should retrieve some branches", async () => {
        // Arrange
        let fetchRemote = ""
        let lsRemote = ""
        await mock.module("../lib/git", () => ({
            Git: class MockGit extends Git {
                public async fetch(actualRemote: string): Promise<void> {
                    fetchRemote = actualRemote
                }
                public async ls(actualRemote: string): Promise<string[]> {
                    lsRemote = actualRemote
                    return ["develop", "staging"]
                }
            }
        }))
        const context = getContext("main")
        const config = ensureDefault({
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
            targets: [{ from: "main", to: "(develop|staging)" }],
        })

        // Act
        const branches = await getBranches(context, config)

        // Assert
        expect(fetchRemote).toEqual(config.repositoryUrl)
        expect(lsRemote).toEqual(config.repositoryUrl)
        expect(branches).toEqual(["develop", "staging"])
    })

    test("should retrieve more recent semver branches but only same major version", async () => {
        // Arrange
        await mock.module("../lib/git", () => ({
            Git: class MockGit extends Git {
                public async fetch(): Promise<void> { }
                public async ls(): Promise<string[]> {
                    return ["v1.0", "v1.1", "v1.2", "v1.3", "v1.4", "v2.0", "v2.6"]
                }
            }
        }))
        const context = getContext("v1.2")
        const config = ensureDefault({
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
            targets: [{ from: "v[0-9]+(.[0-9]+)?", to: "v[0-9]+(.[0-9]+)?" }],
        })

        // Act
        const branches = await getBranches(context, config)

        // Assert
        expect(branches).toEqual(["v1.3", "v1.4"])
    })

    test("should retrieve more recent semver branches but only same major version (.x case)", async () => {
        // Arrange
        await mock.module("../lib/git", () => ({
            Git: class MockGit extends Git {
                public async fetch(): Promise<void> { }
                public async ls(): Promise<string[]> {
                    return ["v1.0.x", "v1.1.x", "v1.2.x", "v1.3.x", "v1.4.x", "v2.0.x", "v2.6.x"]
                }
            }
        }))
        const context = getContext("v1.2.x")
        const config = ensureDefault({
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
            targets: [{ from: "v[0-9]+(.{[0-9]+,x})?", to: "v[0-9]+(.{[0-9]+,x})?" }],
        })

        // Act
        const branches = await getBranches(context, config)

        // Assert
        expect(branches).toEqual(["v1.3.x", "v1.4.x"])
    })

    test("should retrieve no version since it's the major one", async () => {
        // Arrange
        await mock.module("../lib/git", () => ({
            Git: class MockGit extends Git {
                public async fetch(): Promise<void> { }
                public async ls(): Promise<string[]> {
                    return ["v1.0", "v1.1", "v1.2", "v1.3", "v1.4", "v2.0", "v2.6"]
                }
            }
        }))
        const context = getContext("v1")
        const config = ensureDefault({
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
            targets: [{ from: "v[0-9]+(.[0-9]+)?", to: "v[0-9]+(.[0-9]+)?" }],
        })

        // Act
        const branches = await getBranches(context, config)

        // Assert
        expect(branches).toBeEmpty()
    })

    test("should retrieve no version since it's the major one (.x case)", async () => {
        // Arrange
        await mock.module("../lib/git", () => ({
            Git: class MockGit extends Git {
                public async fetch(): Promise<void> { }
                public async ls(): Promise<string[]> {
                    return ["v1.0.x", "v1.1.x", "v1.2.x", "v1.3.x", "v1.4.x", "v2.0.x", "v2.6.x"]
                }
            }
        }))
        const context = getContext("v1.x")
        const config = ensureDefault({
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
            targets: [{ from: "v[0-9]+(.{[0-9]+,x})?", to: "v[0-9]+(.{[0-9]+,x})?" }],
        })

        // Act
        const branches = await getBranches(context, config)

        // Assert
        expect(branches).toBeEmpty()
    })
})

describe("executeBackmerge", () => {
    const pullsSpy = spyOn(pulls, "createPR")
    afterEach(() => {
        pullsSpy.mockReset()
    })
    afterAll(() => {
        pullsSpy.mockRestore()
    })

    test("should fail to modify authentication", () => {
        // Arrange
        const context = getContext("main")
        const config = ensureDefault({
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
        })

        // Act
        const matcher = expect(async () => await executeBackmerge(context, config, []))

        // Assert
        matcher.toThrowError(getConfigError("platform", Platform.NULL).message)
    })

    test("should fail to fetch remote", async () => {
        // Arrange
        await mock.module("../lib/git", () => ({
            Git: class MockGit extends Git {
                public async fetch(): Promise<void> {
                    throw new Error("an error message")
                }
            }
        }))
        const context = getContext("main")
        const config = ensureDefault({
            baseUrl: "https://github.com",
            platform: Platform.GITHUB,
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
        })

        // Act
        const matcher = expect(async () => await executeBackmerge(context, config, []))

        // Assert
        matcher.toThrowError("an error message")
    })

    test("should fail to checkout released branch", async () => {
        // Arrange
        await mock.module("../lib/git", () => ({
            Git: class MockGit extends Git {
                public async fetch(): Promise<void> { }
                public async checkout(): Promise<void> {
                    throw new Error("an error message")
                }
            }
        }))
        const context = getContext("main")
        const config = ensureDefault({
            baseUrl: "https://github.com",
            platform: Platform.GITHUB,
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
        })

        // Act
        const matcher = expect(async () => await executeBackmerge(context, config, []))

        // Assert
        matcher.toThrowError("an error message")
    })

    test("should fail to merge branch and create pull request", async () => {
        // Arrange
        await mock.module("../lib/git", () => ({
            Git: class MockGit extends Git {
                public async fetch(): Promise<void> { }
                public async checkout(): Promise<void> { }
                public async merge(): Promise<void> {
                    throw new Error("an error message")
                }
                public async push(): Promise<void> {
                    throw new Error("shouldn't be called")
                }
            }
        }))
        const context = getContext("main")
        const config = ensureDefault({
            baseUrl: "https://github.com",
            platform: Platform.GITHUB,
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
        })

        // Act
        await executeBackmerge(context, config, ["staging"])

        // Assert
        expect(pullsSpy).toHaveBeenCalledTimes(1)
        // expect(pullsSpy).toHaveBeenCalledWith(config, parse(config.repositoryUrl), "main", "staging")
    })

    test("should fail to merge branch but not create pull request dry run", async () => {
        // Arrange
        await mock.module("../lib/git", () => ({
            Git: class MockGit extends Git {
                public async fetch(): Promise<void> { }
                public async checkout(): Promise<void> { }
                public async merge(): Promise<void> {
                    throw new Error("an error message")
                }
                public async push(): Promise<void> {
                    throw new Error("shouldn't be called")
                }
            }
        }))
        const context = getContext("main")
        const config = ensureDefault({
            baseUrl: "https://github.com",
            dryRun: true,
            platform: Platform.GITHUB,
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
        })

        // Act
        await executeBackmerge(context, config, ["staging"])

        // Assert
        expect(pullsSpy).not.toHaveBeenCalled()
    })

    test("should fail to push branch and fail to create pull request", async () => {
        // Arrange
        await mock.module("../lib/git", () => ({
            Git: class MockGit extends Git {
                public async fetch(): Promise<void> { }
                public async checkout(): Promise<void> { }
                public async merge(): Promise<void> { }
                public async push(): Promise<void> {
                    throw new Error("an error message")
                }
            }
        }))
        pullsSpy.mockImplementation(() => { throw new Error("pull request error") })
        const context = getContext("main")
        const config = ensureDefault({
            baseUrl: "https://github.com",
            platform: Platform.GITHUB,
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
        })

        // Act
        const matcher = expect(async () => await executeBackmerge(context, config, ["staging"]))

        // Assert
        matcher.toThrowError("Failed to create pull request from 'main' to 'staging'.")
    })

    test("should succeed to merge and push a branch", async () => {
        // Arrange
        let fetchRemote = ""
        let checkoutBranch = ""
        let merge: { commit?: string, from?: string, to?: string } = {}
        let push: { branch?: string, dryRun?: boolean, remote?: string } = {}
        await mock.module("../lib/git", () => ({
            Git: class MockGit extends Git {
                public async fetch(remote: string): Promise<void> {
                    fetchRemote = remote
                }
                public async checkout(branch: string): Promise<void> {
                    checkoutBranch = branch
                }
                public async merge(from: string, to: string, commit: string): Promise<void> {
                    merge = { commit, from, to }
                }
                public async push(remote: string, branch: string, dryRun?: boolean): Promise<void> {
                    push = { branch, dryRun, remote }
                }
            }
        }))
        const context = getContext("main")
        const config = ensureDefault({
            baseUrl: "https://github.com",
            dryRun: true,
            platform: Platform.GITHUB,
            repositoryUrl: "git@github.com:kilianpaquier/semantic-release-backmerge.git",
        })

        // Act
        await executeBackmerge(context, config, ["staging"])

        // Assert
        expect(fetchRemote).toEqual(config.repositoryUrl)
        expect(checkoutBranch).toEqual("main")
        expect(merge).toEqual({ commit: "chore(release): merge branch main into staging [skip ci]", from: "main", to: "staging" })
        expect(push).toEqual({ branch: "staging", dryRun: true, remote: authModificator(parse(config.repositoryUrl), config.platform, config.token) })
    })
})