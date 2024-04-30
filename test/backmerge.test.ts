// import module for spying / stubbing
import * as git from "../lib/git"

import type { BackmergeConfig, RepositoryInfo } from "../lib/models/config"
import { afterAll, afterEach, describe, expect, spyOn, test } from "bun:test"

import SemanticReleaseError from "@semantic-release/error"

import { type VerifyConditionsContext } from "semantic-release"
import { backmerge } from "../lib/backmerge"
import { ensureDefault } from "../lib/verify-config"


describe("backmerge", () => {
    const mergeSpy = spyOn(git, "mergeBranch")
    const globSpy = spyOn(git, "branchesByGlob")

    afterEach(() => {
        mergeSpy.mockReset()
        globSpy.mockReset()
    })

    afterAll(() => {
        mergeSpy.mockRestore()
        globSpy.mockRestore()
    })

    const getContext = (branchName: string): Partial<VerifyConditionsContext> => ({
        branch: { name: branchName },
        logger: console,
    })

    test("should not do anything since released branch is not in targets", async () => {
        // Arrange
        const context = getContext("main")
        const logSpy = spyOn(context, "logger")

        const config: BackmergeConfig = ensureDefault({})
        const info: RepositoryInfo = {}

        // Act
        const errors = await backmerge(context, config, info)

        // Assert
        expect(errors).toBeEmpty()
        expect(globSpy).not.toHaveBeenCalled()
        expect(mergeSpy).not.toHaveBeenCalled()
        expect(logSpy).toHaveBeenCalledTimes(1)
    })

    test("should not do anything since target branches don't exist", async () => {
        // Arrange
        globSpy.mockImplementation(() => Promise.resolve([]))

        const context = getContext("main")
        const logSpy = spyOn(context, "logger")

        const config: BackmergeConfig = ensureDefault({
            targets: [
                { from: "main", to: "develop" }
            ]
        })
        const info: RepositoryInfo = {}

        // Act
        const errors = await backmerge(context, config, info)

        // Assert
        expect(errors).toBeEmpty()
        expect(globSpy).toHaveBeenCalledTimes(1)
        expect(mergeSpy).not.toHaveBeenCalled()
        expect(logSpy).toHaveBeenCalledTimes(2)
    })

    test("should not do anything since target branch exist but is below minor or above major semver", async () => {
        // Arrange
        globSpy.mockImplementation(() => Promise.resolve(["v1.0", "v2.0"]))

        const context = getContext("v1.1")
        const logSpy = spyOn(context, "logger")

        const config: BackmergeConfig = ensureDefault({
            targets: [
                { from: "v.*", to: "v*" }
            ]
        })
        const info: RepositoryInfo = {}

        // Act
        const errors = await backmerge(context, config, info)

        // Assert
        expect(errors).toBeEmpty()
        expect(globSpy).toHaveBeenCalledTimes(1)
        expect(mergeSpy).not.toHaveBeenCalled()
        expect(logSpy).toHaveBeenCalledTimes(4)
    })

    test("should call merge branch and return error", async () => {
        // Arrange
        globSpy.mockImplementation(() => Promise.resolve(["develop", "develop_another"]))
        mergeSpy.mockImplementationOnce(() => Promise.resolve(new SemanticReleaseError("a message", "ECODE")))
        mergeSpy.mockImplementationOnce(() => Promise.resolve(new SemanticReleaseError("another message", "ECODE")))

        const context = getContext("main")
        const logSpy = spyOn(context, "logger")

        const config: BackmergeConfig = ensureDefault({
            targets: [
                { from: "main", to: "develop*" }
            ]
        })
        const info: RepositoryInfo = {}

        // Act
        const errors = await backmerge(context, config, info)

        // Assert
        expect(errors).toEqual([
            new SemanticReleaseError("a message", "ECODE"),
            new SemanticReleaseError("another message", "ECODE"),
        ])
        expect(globSpy).toHaveBeenCalledTimes(1)
        expect(mergeSpy).toHaveBeenCalledTimes(2)
        expect(logSpy).toHaveBeenCalledTimes(2)
    })

    test("should call merge branch and return success", async () => {
        // Arrange
        globSpy.mockImplementationOnce(() => Promise.resolve(["develop"]))
        globSpy.mockImplementationOnce(() => Promise.resolve(["staging"]))
        mergeSpy.mockImplementation(() => Promise.resolve())

        const context = getContext("main")
        const logSpy = spyOn(context, "logger")

        const config: BackmergeConfig = ensureDefault({
            targets: [
                { from: "main", to: "develop" },
                { from: "main", to: "staging" }
            ]
        })
        const info: RepositoryInfo = {}

        // Act
        const errors = await backmerge(context, config, info)

        // Assert
        expect(errors).toBeEmpty()
        expect(globSpy).toHaveBeenCalledTimes(2)
        expect(mergeSpy).toHaveBeenCalledTimes(2)
        expect(logSpy).toHaveBeenCalledTimes(2)
    })
})