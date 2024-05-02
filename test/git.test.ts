// import module for spying / stubbing
import * as git from "../lib/git"

import { afterAll, afterEach, describe, expect, spyOn, test } from "bun:test"

import SemanticReleaseError from "@semantic-release/error"
import gitUrlParse from "git-url-parse"

import { type ExecaReturnValue } from "execa"
import { type VerifyConditionsContext } from "semantic-release"
import { ensureDefault } from "../lib/verify-config"

const defaultExeca = (partial: Partial<ExecaReturnValue<string>>): ExecaReturnValue<string> => ({
    command: partial.command ?? "",
    cwd: partial.cwd ?? "",
    escapedCommand: partial.escapedCommand ?? "",
    exitCode: partial.exitCode ?? 0,
    failed: partial.failed ?? false,
    isCanceled: partial.isCanceled ?? false,
    killed: partial.killed ?? false,
    stderr: partial.stderr ?? "",
    stdout: partial.stdout ?? "",
    timedOut: partial.timedOut ?? false,
})

describe("gitBranches", () => {
    const context: Partial<VerifyConditionsContext> = { logger: console }

    const gitSpy = spyOn(git, "git")
    const logSpy = spyOn(context, "logger")

    afterEach(() => {
        gitSpy.mockReset()
        logSpy.mockReset()
    })

    afterAll(() => {
        gitSpy.mockReset()
        logSpy.mockRestore()
    })

    test("should fail to retrieve branches", async () => {
        // Arrange
        gitSpy.mockImplementation(() => Promise.reject(new Error("an error message")))

        // Act
        const branches = await git.gitBranches(context)

        // Assert
        expect(branches).toBeEmpty()
        expect(gitSpy).toHaveBeenCalledTimes(1)
        expect(logSpy).toHaveBeenCalledTimes(1)
    })

    test("should filter branches not starting with refs/heads/", async () => {
        // Arrange
        gitSpy.mockImplementation(() => Promise.resolve(defaultExeca({
            stdout: "somehash\trefs/heads/hey\nsomehash\trefs/heads/hoy\n"
        })))

        // Act
        const branches = await git.gitBranches(context)

        // Assert
        expect(branches).toEqual(["hey", "hoy"])
        expect(gitSpy).toHaveBeenCalledTimes(1)
        expect(logSpy).not.toHaveBeenCalled()
    })
})

describe("mergeBranch", () => {
    const context: Partial<VerifyConditionsContext> = { logger: console }
    
    const info = gitUrlParse("git@github.com:kilianpaquier/semantic-release-backmerge.git")

    const gitSpy = spyOn(git, "git")
    const prSpy = spyOn(git, "createPullRequest")
    const logSpy = spyOn(context, "logger")

    afterEach(() => {
        gitSpy.mockReset()
        prSpy.mockReset()
        logSpy.mockReset()
    })

    afterAll(() => {
        gitSpy.mockRestore()
        prSpy.mockRestore()
        logSpy.mockRestore()
    })

    test("should fail at git checkout", async () => {
        // Arrange
        gitSpy.mockImplementation(() => Promise.reject(new Error("an error message")))

        const config = ensureDefault({})

        // Act
        const error = await git.mergeBranch(context, config, info, "main", "develop")

        // Assert
        expect(error?.code).toEqual("ECHECKOUT")
        expect(gitSpy).toHaveBeenCalledTimes(1)
        expect(prSpy).not.toHaveBeenCalled()
        expect(logSpy).not.toHaveBeenCalled()
    })

    test("should fail at git merge and later on at git merge abort", async () => {
        // Arrange
        gitSpy.mockImplementationOnce(() => Promise.resolve(defaultExeca({}))) // checkout
        gitSpy.mockImplementationOnce(() => Promise.reject(new Error("an error message"))) // merge
        gitSpy.mockImplementationOnce(() => Promise.reject(new Error("an error message"))) // abort

        const config = ensureDefault({})

        // Act
        const error = await git.mergeBranch(context, config, info, "main", "develop")

        // Assert
        expect(error?.code).toEqual("EMERGEABORT")
        expect(gitSpy).toHaveBeenCalledTimes(3)
        expect(prSpy).not.toHaveBeenCalled()
        expect(logSpy).toHaveBeenCalledTimes(1)
    })

    test("should fail at git merge and don't create pull request on dry run", async () => {
        // Arrange
        gitSpy.mockImplementationOnce(() => Promise.resolve(defaultExeca({}))) // checkout
        gitSpy.mockImplementationOnce(() => Promise.reject(new Error("an error message"))) // merge
        gitSpy.mockImplementationOnce(() => Promise.resolve(defaultExeca({}))) // abort

        const config = ensureDefault({ dryRun: true })

        // Act
        const error = await git.mergeBranch(context, config, info, "main", "develop")

        // Assert
        expect(error).toBeUndefined()
        expect(gitSpy).toHaveBeenCalledTimes(3)
        expect(prSpy).not.toHaveBeenCalled()
        expect(logSpy).toHaveBeenCalledTimes(2)
    })

    test("should fail at git merge and fail at create pull request", async () => {
        // Arrange
        gitSpy.mockImplementationOnce(() => Promise.resolve(defaultExeca({}))) // checkout
        gitSpy.mockImplementationOnce(() => Promise.reject(new Error("an error message"))) // merge
        gitSpy.mockImplementationOnce(() => Promise.resolve(defaultExeca({}))) // abort
        prSpy.mockImplementation(() => Promise.resolve(new SemanticReleaseError("an error message", "ECODE")))

        const config = ensureDefault({})

        // Act
        const error = await git.mergeBranch(context, config, info, "main", "develop")

        // Assert
        expect(error).toEqual(new SemanticReleaseError("an error message", "ECODE"))
        expect(gitSpy).toHaveBeenCalledTimes(3)
        expect(prSpy).toHaveBeenCalledTimes(1)
        expect(logSpy).toHaveBeenCalledTimes(1)
    })

    test("should be fine at git merge, fail at push with dry run and fail at reset hard", async () => {
        // Arrange
        gitSpy.mockImplementationOnce(() => Promise.resolve(defaultExeca({}))) // checkout
        gitSpy.mockImplementationOnce(() => Promise.resolve(defaultExeca({}))) // merge
        gitSpy.mockImplementationOnce(() => Promise.reject(new Error("an error message"))) // push
        gitSpy.mockImplementationOnce(() => Promise.reject(new Error("an error message"))) // reset hard

        const config = ensureDefault({ dryRun: true })

        // Act
        const error = await git.mergeBranch(context, config, info, "main", "develop")

        // Assert
        expect(error?.code).toEqual("ERESETHARD")
        expect(gitSpy).toHaveBeenCalledTimes(4)
        expect(prSpy).not.toHaveBeenCalled()
        expect(logSpy).toHaveBeenCalledTimes(2)
    })

    test("should be fine at git merge, fail at push with dry run but be fine at hard reset", async () => {
        // Arrange
        gitSpy.mockImplementationOnce(() => Promise.resolve(defaultExeca({}))) // checkout
        gitSpy.mockImplementationOnce(() => Promise.resolve(defaultExeca({}))) // merge
        gitSpy.mockImplementationOnce(() => Promise.reject(new Error("an error message"))) // push
        gitSpy.mockImplementationOnce(() => Promise.resolve(defaultExeca({}))) // reset hard

        const config = ensureDefault({ dryRun: true })

        // Act
        const error = await git.mergeBranch(context, config, info, "main", "develop")

        // Assert
        expect(error).toBeUndefined()
        expect(gitSpy).toHaveBeenCalledTimes(4)
        expect(prSpy).not.toHaveBeenCalled()
        expect(logSpy).toHaveBeenCalledTimes(3)
    })

    test("should be fine at git merge, fail at push and create pull request", async () => {
        // Arrange
        gitSpy.mockImplementationOnce(() => Promise.resolve(defaultExeca({}))) // checkout
        gitSpy.mockImplementationOnce(() => Promise.resolve(defaultExeca({}))) // merge
        gitSpy.mockImplementationOnce(() => Promise.reject(new Error("an error message"))) // push
        gitSpy.mockImplementationOnce(() => Promise.resolve(defaultExeca({}))) // reset hard

        const config = ensureDefault({})

        // Act
        const error = await git.mergeBranch(context, config, info, "main", "develop")

        // Assert
        expect(error).toBeUndefined()
        expect(gitSpy).toHaveBeenCalledTimes(4)
        expect(prSpy).toHaveBeenCalledTimes(1)
        expect(logSpy).toHaveBeenCalledTimes(1)
    })

    test("should be fine at git merge and fine at push", async () => {
        // Arrange
        gitSpy.mockImplementation(() => Promise.resolve(defaultExeca({})))

        const config = ensureDefault({ dryRun: true })

        // Act
        const error = await git.mergeBranch(context, config, info, "main", "develop")

        // Assert
        expect(error).toBeUndefined()
        expect(gitSpy).toHaveBeenCalledTimes(3)
        expect(prSpy).not.toHaveBeenCalled()
        expect(logSpy).toHaveBeenCalledTimes(1)
    })
})
