// import module for spying / stubbing
import * as git from "../lib/git"

import { afterAll, afterEach, describe, expect, spyOn, test } from "bun:test"

import SemanticReleaseError from "@semantic-release/error"
import gitUrlParse from "git-url-parse"

import { type BackmergeConfig } from "../lib/models/config"
import { type VerifyConditionsContext } from "semantic-release"
import { backmerge } from "../lib/backmerge"
import { ensureDefault } from "../lib/verify-config"

describe("backmerge", () => {
    const mergeSpy = spyOn(git, "mergeBranch")
    const branchesSpy = spyOn(git, "gitBranches")

    afterEach(() => {
        mergeSpy.mockReset()
        branchesSpy.mockReset()
    })

    afterAll(() => {
        mergeSpy.mockRestore()
        branchesSpy.mockRestore()
    })

    const getContext = (branchName: string): Partial<VerifyConditionsContext> => ({
        branch: { name: branchName },
        logger: console,
    })

    const info = gitUrlParse("https://github.com/kilianpaquier/semantic-release-backmerge.git")

    test("should not do anything since released branch is not in targets", async () => {
        // Arrange
        const context = getContext("main")
        const logSpy = spyOn(context, "logger")

        const config: BackmergeConfig = ensureDefault({})
        
        // Act
        const errors = await backmerge(context, config, info)

        // Assert
        expect(errors).toBeEmpty()
        expect(branchesSpy).not.toHaveBeenCalled()
        expect(mergeSpy).not.toHaveBeenCalled()
        expect(logSpy).toHaveBeenCalledTimes(1)
    })

    test("should not do anything since target branches don't exist", async () => {
        // Arrange
        branchesSpy.mockImplementation(() => Promise.resolve([]))

        const context = getContext("main")
        const logSpy = spyOn(context, "logger")

        const config: BackmergeConfig = ensureDefault({
            targets: [
                { from: "main", to: "develop" }
            ]
        })
        
        // Act
        const errors = await backmerge(context, config, info)

        // Assert
        expect(errors).toBeEmpty()
        expect(branchesSpy).toHaveBeenCalledTimes(1)
        expect(mergeSpy).not.toHaveBeenCalled()
        expect(logSpy).toHaveBeenCalledTimes(2)
    })

    test("should not do anything since target branch exist but is below minor or above major semver", async () => {
        // Arrange
        branchesSpy.mockImplementation(() => Promise.resolve(["v1.0", "v2.0"]))

        const context = getContext("v1.1")
        const logSpy = spyOn(context, "logger")

        const config: BackmergeConfig = ensureDefault({
            targets: [
                { from: "v.*", to: "v.*" }
            ]
        })
        
        // Act
        const errors = await backmerge(context, config, info)

        // Assert
        expect(errors).toBeEmpty()
        expect(branchesSpy).toHaveBeenCalledTimes(1)
        expect(mergeSpy).not.toHaveBeenCalled()
        expect(logSpy).toHaveBeenCalledTimes(4)
    })

    test("should call merge branch and return error", async () => {
        // Arrange
        branchesSpy.mockImplementation(() => Promise.resolve(["develop", "develop_another"]))
        mergeSpy.mockImplementationOnce(() => Promise.resolve(new SemanticReleaseError("a message", "ECODE")))
        mergeSpy.mockImplementationOnce(() => Promise.resolve(new SemanticReleaseError("another message", "ECODE")))

        const context = getContext("main")
        const logSpy = spyOn(context, "logger")

        const config: BackmergeConfig = ensureDefault({
            targets: [
                { from: "main", to: "develop*" }
            ]
        })
        
        // Act
        const errors = await backmerge(context, config, info)

        // Assert
        expect(errors).toEqual([
            new SemanticReleaseError("a message", "ECODE"),
            new SemanticReleaseError("another message", "ECODE"),
        ])
        expect(branchesSpy).toHaveBeenCalledTimes(1)
        expect(mergeSpy).toHaveBeenCalledTimes(2)
        expect(logSpy).toHaveBeenCalledTimes(2)
    })

    test("should call merge branch and return success", async () => {
        // Arrange
        branchesSpy.mockImplementation(() => Promise.resolve(["develop", "staging"]))
        mergeSpy.mockImplementation(() => Promise.resolve())

        const context = getContext("main")
        const logSpy = spyOn(context, "logger")

        const config: BackmergeConfig = ensureDefault({
            targets: [
                { from: "main", to: "develop" },
                { from: "main", to: "staging" }
            ]
        })
        
        // Act
        const errors = await backmerge(context, config, info)

        // Assert
        expect(errors).toBeEmpty()
        expect(branchesSpy).toHaveBeenCalledTimes(1)
        expect(mergeSpy).toHaveBeenCalledTimes(2)
        expect(logSpy).toHaveBeenCalledTimes(2)
    })
})