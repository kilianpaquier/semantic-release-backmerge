import * as git from "../lib/git"

import { Context, backmerge, filter } from "../lib/backmerge"
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"

import { Branch } from "../lib/git"
import { Target } from "../lib/models/config"
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

describe("filter", () => {
    test("should retrieve some branches", () => {
        // Arrange
        const release: Branch = { hash: "", name: "main" }
        const targets: Target[] = [{ from: "main", to: "(develop|staging)" }]
        const branches: Branch[] = [
            { hash: "", name: "main" },
            { hash: "", name: "develop" },
            { hash: "", name: "staging" },
        ]

        // Act
        const mergeables = filter(release, targets, branches)

        // Assert
        expect(mergeables).toEqual([
            { hash: "", name: "develop" },
            { hash: "", name: "staging" },
        ])
    })

    test("should retrieve more recent semver branches but only same major version", () => {
        // Arrange
        const release: Branch = { hash: "", name: "v1.2" }
        const targets: Target[] = [{ from: "v[0-9]+(.[0-9]+)?", to: "v[0-9]+(.[0-9]+)?" }]
        const branches: Branch[] = [
            { hash: "", name: "v1.0" },
            { hash: "", name: "v1.1" },
            { hash: "", name: "v1.2" },
            { hash: "", name: "v1.3" },
            { hash: "", name: "v1.4" },
            { hash: "", name: "v2.0" },
            { hash: "", name: "v2.6" },
        ]

        // Act
        const mergeables = filter(release, targets, branches)

        // Assert
        expect(mergeables).toEqual([
            { hash: "", name: "v1.3" },
            { hash: "", name: "v1.4" },
        ])
    })

    test("should retrieve more recent semver branches but only same major version (.x case)", () => {
        // Arrange
        const release: Branch = { hash: "", name: "v1.2.x" }
        const targets: Target[] = [{ from: "v[0-9]+(.{[0-9]+,x})?", to: "v[0-9]+(.{[0-9]+,x})?" }]
        const branches: Branch[] = [
            { hash: "", name: "v1.0.x" },
            { hash: "", name: "v1.1.x" },
            { hash: "", name: "v1.2.x" },
            { hash: "", name: "v1.3.x" },
            { hash: "", name: "v1.4.x" },
            { hash: "", name: "v2.0.x" },
            { hash: "", name: "v2.6.x" }
        ]

        // Act
        const mergeables = filter(release, targets, branches)

        // Assert
        expect(mergeables).toEqual([
            { hash: "", name: "v1.3.x" },
            { hash: "", name: "v1.4.x" },
        ])
    })

    test("should retrieve no version since it's the major one", () => {
        // Arrange
        const release: Branch = { hash: "", name: "v1" }
        const targets: Target[] = [{ from: "v[0-9]+(.[0-9]+)?", to: "v[0-9]+(.[0-9]+)?" }]
        const branches: Branch[] = [
            { hash: "", name: "v1.0" },
            { hash: "", name: "v1.1" },
            { hash: "", name: "v1.2" },
            { hash: "", name: "v1.3" },
            { hash: "", name: "v1.4" },
            { hash: "", name: "v2.0" },
            { hash: "", name: "v2.6" },
        ]

        // Act
        const mergeables = filter(release, targets, branches)

        // Assert
        expect(mergeables).toBeEmpty()
    })

    test("should retrieve no version since it's the major one (.x case)", () => {
        // Arrange
        const release: Branch = { hash: "", name: "v1.x" }
        const targets: Target[] = [{ from: "v[0-9]+(.{[0-9]+,x})?", to: "v[0-9]+(.{[0-9]+,x})?" }]
        const branches: Branch[] = [
            { hash: "", name: "v1.0.x" },
            { hash: "", name: "v1.1.x" },
            { hash: "", name: "v1.2.x" },
            { hash: "", name: "v1.3.x" },
            { hash: "", name: "v1.4.x" },
            { hash: "", name: "v2.0.x" },
            { hash: "", name: "v2.6.x" }
        ]

        // Act
        const mergeables = filter(release, targets, branches)

        // Assert
        expect(mergeables).toBeEmpty()
    })
})

describe("backmerge", () => {
    afterEach(() => mock.restore())

    const repositoryUrl = "git@github.com:kilianpaquier/semantic-release-backmerge.git"

    const context = getContext("main")
    const release: Branch = { hash: "", name: "main" }
    const branches: Branch[] = [{ hash: "", name: "staging" }, { hash: "", name: "develop" }] // two branches to test backmerge loop in function

    test("should fail to merge branch and create pull request", async () => {
        // Arrange
        let called = 0
        const handler = new TestPlatformHandler(async (): Promise<void> => { called++ }, async (): Promise<boolean> => false)

        spyOn(git, "checkout").mockImplementation(async () => {})
        spyOn(git, "merge").mockImplementation(() => { throw new Error("an error message") })
        spyOn(git, "push").mockImplementation(() => { throw new Error("shouldn't be called") })

        const config = ensureDefault({ repositoryUrl }, { GITHUB_TOKEN: "some-token" })

        // Act
        await backmerge(context, config, handler, release, branches)

        // Assert
        expect(called).toEqual(2)
    })

    test("should fail to merge branch and create pull request even if it exists", async () => {
        // Arrange
        let called = 0
        const handler = new TestPlatformHandler(async (): Promise<void> => { called++ }, async (): Promise<boolean> => { throw new Error("shouldn't be called") })

        spyOn(git, "checkout").mockImplementation(async () => {})
        spyOn(git, "merge").mockImplementation(() => { throw new Error("an error message") })
        spyOn(git, "push").mockImplementation(() => { throw new Error("shouldn't be called") })

        const config = ensureDefault({ checkHasPull: false, repositoryUrl }, { GITHUB_TOKEN: "some-token" })

        // Act
        await backmerge(context, config, handler, release, branches)

        // Assert
        expect(called).toEqual(2)
    })

    test("should fail to merge branch and not create a pull request since it exists", () => {
        // Arrange
        const handler = new TestPlatformHandler(async (): Promise<void> => { throw new Error("shouldn't be called") }, async (): Promise<boolean> => true)

        spyOn(git, "checkout").mockImplementation(async () => {})
        spyOn(git, "merge").mockImplementation(() => { throw new Error("an error message") })
        spyOn(git, "push").mockImplementation(() => { throw new Error("shouldn't be called") })

        const config = ensureDefault({ repositoryUrl }, { GITHUB_TOKEN: "some-token" })

        // Act
        const matcher = expect(async () => await backmerge(context, config, handler, release, branches))

        // Assert
        matcher.not.toThrow()
    })

    test("should fail to merge branch but not create pull request dry run", () => {
        // Arrange
        const handler = new TestPlatformHandler(async (): Promise<void> => { throw new Error("shouldn't be called") }, async (): Promise<boolean> => false)

        spyOn(git, "checkout").mockImplementation(async () => {})
        spyOn(git, "merge").mockImplementation(() => { throw new Error("an error message") })
        spyOn(git, "push").mockImplementation(() => { throw new Error("shouldn't be called") })

        const config = ensureDefault({ dryRun: true, repositoryUrl }, { GITHUB_TOKEN: "some-token" })

        // Act
        const matcher = expect(async () => await backmerge(context, config, handler, release, branches))

        // Assert
        matcher.not.toThrow()
    })

    test("should fail to push branch and fail to create pull request", () => {
        // Arrange
        const handler = new TestPlatformHandler(async (): Promise<void> => { throw new Error("pull request error") }, async (): Promise<boolean> => false)

        spyOn(git, "checkout").mockImplementation(async () => {})
        spyOn(git, "merge").mockImplementation(async () => {})
        spyOn(git, "push").mockImplementation(() => { throw new Error("an error message") })

        const config = ensureDefault({ repositoryUrl }, { GITHUB_TOKEN: "some-token" })

        // Act
        const matcher = expect(async () => await backmerge(context, config, handler, release, branches))

        // Assert
        matcher.toThrowError("Failed to create pull request from 'main' to 'staging'.")
    })

    test("should succeed to merge and push a branch", async () => {
        // Arrange
        const expectedUrl = "https://test-user:some-token@github.com/kilianpaquier/semantic-release-backmerge.git"

        const checkouts: Branch[] = []
        const merge: { commit?: string, from?: string }[] = []
        const push: { branch?: string, dryRun?: boolean, remote?: string }[] = []
        spyOn(git, "checkout").mockImplementation(async (branch: Branch) => { checkouts.push(branch) })
        spyOn(git, "merge").mockImplementation(async (from: string, commit: string) => { merge.push({ commit, from }) })
        spyOn(git, "push").mockImplementation(async (remote: string, branch: string, dryRun?: boolean) => { push.push({ branch, dryRun, remote }) })

        const config = ensureDefault({ repositoryUrl }, { GITHUB_TOKEN: "some-token" })

        // Act
        await backmerge(context, config, new TestPlatformHandler(), release, branches)

        // Assert
        expect(checkouts).toEqual(branches)
        expect(merge).toEqual([
            { commit: "chore(release): merge branch main into staging [skip ci]", from: "main" },
            { commit: "chore(release): merge branch main into develop [skip ci]", from: "main" }
        ])
        expect(push).toEqual([
            { branch: "staging", dryRun: false, remote: expectedUrl },
            { branch: "develop", dryRun: false, remote: expectedUrl }
        ])
    })
})