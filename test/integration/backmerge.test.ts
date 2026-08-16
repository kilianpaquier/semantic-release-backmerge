import { beforeAll, describe, expect, test } from "bun:test"
import { bitbucket, bitbucketCloud, gitea, github, gitlab } from "./git-http-server"
import { checkout, clone, commit, init, log, push, release, releaserc } from "./fixture"

import { Platform } from "../../lib/models/config"
import { execa } from "execa"
import { join } from "node:path"
import { newPlatformHandler } from "../../lib/platform-handler"
import { writeFile } from "node:fs/promises"

describe("integration", () => {
    const timeout = 15_000
    const token = "integration-token"

    // variable is the environment variable each platform reads its token from
    const platforms = [
        { platform: Platform.BITBUCKET, start: bitbucket, variable: "BB_TOKEN" },
        { platform: Platform.BITBUCKET_CLOUD, start: bitbucketCloud, variable: "BITBUCKET_TOKEN" },
        { platform: Platform.GITEA, start: gitea, variable: "FORGEJO_TOKEN" },
        { platform: Platform.GITHUB, start: github, variable: "GITHUB_TOKEN" },
        { platform: Platform.GITLAB, start: gitlab, variable: "GITLAB_TOKEN" },
    ]

    const plugin = join(import.meta.dirname, "..", "..")
    beforeAll(() => execa("bun", ["run", "build"], { cwd: plugin }))

    describe.each(platforms)("backmerge with $platform", ({ platform, start, variable }) => {
        test("should merge and push the released branch into the target branch", async () => {
            // Arrange
            await using origin = await init()
            await using server = start(origin.projects, token)
            const cwd = await clone(server.url, origin.tmp)

            await commit(cwd, { content: "initial\n", file: "content.txt", message: "chore: init" })
            await push(server.url, cwd, "main")

            await checkout(cwd, "develop")
            await commit(cwd, { content: "from develop\n", file: "develop.txt", message: "docs: develop note" })
            await push(server.url, cwd, "develop")

            await checkout(cwd, "main")
            await commit(cwd, { content: "from main\n", file: "content.txt", message: "feat: add feature" })
            await push(server.url, cwd, "main")

            await writeFile(join(cwd, ".releaserc.json"), releaserc(plugin, platform, server.url))

            // Act
            const result = await release(cwd, variable, token)

            // Assert
            expect(result.exitCode).toEqual(0)
            // the two branch commits share their timestamp so git log interleaves them either way
            const commits = (await log("develop", origin.path)).toReversed()
            expect(commits.at(0)).toEqual("chore: init")
            expect(commits.at(-1)).toEqual("chore(release): merge branch main into develop [skip ci]")
            expect(commits.slice(1, -1).toSorted()).toEqual(["docs: develop note", "feat: add feature"])
            expect(server.pulls).toBeEmpty()
        }, timeout)

        test("should create a pull request with merge conflicts", async () => {
            // Arrange
            await using origin = await init()
            await using server = start(origin.projects, token)
            const cwd = await clone(server.url, origin.tmp)

            await commit(cwd, { content: "initial\n", file: "content.txt", message: "chore: init" })
            await push(server.url, cwd, "main")

            // conflict expected on content.txt
            await checkout(cwd, "develop")
            await commit(cwd, { content: "from develop\n", file: "content.txt", message: "docs: develop note" })
            await push(server.url, cwd, "develop")

            await checkout(cwd, "main")
            await commit(cwd, { content: "from main\n", file: "content.txt", message: "feat: add feature" })
            await push(server.url, cwd, "main")

            await writeFile(join(cwd, ".releaserc.json"), releaserc(plugin, platform, server.url))

            // Act
            const result = await release(cwd, variable, token)

            // Assert
            expect(result.exitCode).toEqual(0)
            expect(await log("develop", origin.path)).toEqual(["docs: develop note", "chore: init"])
            expect(server.pulls).toEqual([{
                body: expect.stringContaining("add feature"),
                from: "main",
                title: "Automatic merge failure",
                to: "develop",
            }])
        }, timeout)

        test("should not create a pull request if it already exists", async () => {
            // Arrange
            await using origin = await init()
            await using server = start(origin.projects, token)
            const cwd = await clone(server.url, origin.tmp)

            await commit(cwd, { content: "initial\n", file: "content.txt", message: "chore: init" })
            await push(server.url, cwd, "main")

            // conflict expected on content.txt
            await checkout(cwd, "develop")
            await commit(cwd, { content: "from develop\n", file: "content.txt", message: "docs: develop note" })
            await push(server.url, cwd, "develop")

            await checkout(cwd, "main")
            await commit(cwd, { content: "from main\n", file: "content.txt", message: "feat: add feature" })
            await push(server.url, cwd, "main")

            await writeFile(join(cwd, ".releaserc.json"), releaserc(plugin, platform, server.url))

            const existing = { body: "already there", from: "main", title: "existing", to: "develop" }
            await newPlatformHandler(platform, server.url, "", token, {}).createPull("owner", "repo", existing)

            // Act
            const result = await release(cwd, variable, token)

            // Assert
            expect(result.exitCode).toEqual(0)
            expect(server.pulls).toEqual([existing])
        }, timeout)
    })
})
