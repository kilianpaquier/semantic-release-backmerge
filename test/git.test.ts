import { describe, expect, test } from "bun:test"

import parse from "git-url-parse"

import { authModificator, ls, version } from "../lib/git"

describe("authModificator", () => {
    test("should return a valid authenticated git URL from one with a port and ssh", () => {
        // Arrange
        const info = parse("ssh://git@github.com:7099/kilianpaquier/semantic-release-backmerge.git")

        // Act
        const url = authModificator(info, "user", "token")

        // Assert
        expect(url).toEqual("ssh://git@github.com:7099/kilianpaquier/semantic-release-backmerge.git")
    })

    test("should return a valid authenticated git URL with SSH", () => {
        // Arrange
        const info = parse("git@github.com:kilianpaquier/subgroup/semantic-release-backmerge.git")

        // Act
        const url = authModificator(info, "user", "token")

        // Assert
        expect(url).toEqual("ssh://git@github.com:kilianpaquier/subgroup/semantic-release-backmerge.git")
    })

    test("should return a valid authenticated git URL with a port", () => {
        // Arrange
        const info = parse("https://github.com:7099/kilianpaquier/semantic-release-backmerge.git")

        // Act
        const url = authModificator(info, "user", "token")

        // Assert
        expect(url).toEqual("https://user:token@github.com:7099/kilianpaquier/semantic-release-backmerge.git")
    })

    test("should return a valid authenticated git URL with git specific HTTPS", () => {
        // Arrange
        const info = parse("git+https://github.com/kilianpaquier/semantic-release-backmerge.git")

        // Act
        const url = authModificator(info, "user", "token")

        // Assert
        expect(url).toEqual("https://user:token@github.com/kilianpaquier/semantic-release-backmerge.git")
    })

    test("should return a valid authenticated git URL with already authenticated one", () => {
        // Arrange
        const info = parse("https://gitlab-ci-token:glpat-RKuRfmL9gfDnw@gitlab.example.com/my-group/my-project.git")

        // Act
        const url = authModificator(info, "user", "token")

        // Assert
        expect(url).toEqual("https://user:token@gitlab.example.com/my-group/my-project.git")
    })

    test("should return a valid authenticated git URL with HTTP", () => {
        // Arrange
        const info = parse("http://github.com/kilianpaquier/semantic-release-backmerge.git")

        // Act
        const url = authModificator(info, "user", "token")

        // Assert
        expect(url).toEqual("http://user:token@github.com/kilianpaquier/semantic-release-backmerge.git")
    })
})

describe("ls", () => {
    test("should return a list of branches", async () => {
        // Act
        const branches = await ls("origin") // a small test to ensure execa works

        // Assert
        const main = branches.filter(branch => branch.name === "main")
        expect(main).not.toBeUndefined()
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
