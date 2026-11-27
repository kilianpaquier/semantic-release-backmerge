import { authModificator, ls, version } from "../lib/git"
import { describe, expect, onTestFinished, test } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"

import { execa } from "execa"
import parse from "git-url-parse"
import path from "node:path"

describe("authModificator", () => {
    test("should return a valid authenticated git URL from one with a port and ssh", () => {
        // Arrange
        const info = parse("ssh://git@git.example.com:7099/kilianpaquier/semantic-release-backmerge.git")

        // Act
        const url = authModificator(info, "user", "token")

        // Assert
        expect(url).toEqual("ssh://git@git.example.com:7099/kilianpaquier/semantic-release-backmerge.git")
    })

    test("should return a valid authenticated git URL with SSH", () => {
        // Arrange
        const info = parse("git@git.example.com:kilianpaquier/subgroup/semantic-release-backmerge.git")

        // Act
        const url = authModificator(info, "user", "token")

        // Assert
        expect(url).toEqual("ssh://git@git.example.com:kilianpaquier/subgroup/semantic-release-backmerge.git")
    })

    test("should return a valid authenticated git URL with a port", () => {
        // Arrange
        const info = parse("https://git.example.com:7099/kilianpaquier/semantic-release-backmerge.git")

        // Act
        const url = authModificator(info, "user", "token")

        // Assert
        expect(url).toEqual("https://user:token@git.example.com:7099/kilianpaquier/semantic-release-backmerge.git")
    })

    test("should return a valid authenticated git URL with git specific HTTPS", () => {
        // Arrange
        const info = parse("git+https://git.example.com/kilianpaquier/semantic-release-backmerge.git")

        // Act
        const url = authModificator(info, "user", "token")

        // Assert
        expect(url).toEqual("https://user:token@git.example.com/kilianpaquier/semantic-release-backmerge.git")
    })

    test("should return a valid authenticated git URL with already authenticated one", () => {
        // Arrange
        const info = parse("https://gitlab-ci-token:glpat-RKuRfmL9gfDnw@git.example.com/my-group/my-project.git")

        // Act
        const url = authModificator(info, "user", "token")

        // Assert
        expect(url).toEqual("https://user:token@git.example.com/my-group/my-project.git")
    })

    test("should return a valid authenticated git URL with HTTP", () => {
        // Arrange
        const info = parse("http://git.example.com/kilianpaquier/semantic-release-backmerge.git")

        // Act
        const url = authModificator(info, "user", "token")

        // Assert
        expect(url).toEqual("http://user:token@git.example.com/kilianpaquier/semantic-release-backmerge.git")
    })
})

describe("ls", () => {
    test("should return a list of branches", async () => {
        // Arrange
        const dir = await mkdtemp(path.join(tmpdir(), "backmerge-ls-")) // a fresh local repository, since a CI checkout may have no local branch
        onTestFinished(async () => await rm(dir, { force: true, recursive: true }))

        const git = async (...args: string[]): Promise<{ stdout: string }> => await execa("git", args, { cwd: dir })
        await git("init", "--initial-branch", "main")
        await git("-c", "user.name=test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", "commit", "--allow-empty", "-m", "init")
        const { stdout: hash } = await git("rev-parse", "HEAD")

        // Act
        const branches = await ls(dir)

        // Assert
        expect(branches).toEqual([{ hash, name: "main" }])
    })
})

describe("version", () => {
    test("should return the current git version", async () => {
        // Act
        const stdout = await version() // a small test to ensure execa works

        // Assert
        expect(stdout).toContain("git version")
    })
})
