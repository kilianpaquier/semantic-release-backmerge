import { PlatformHandler, Pull, newPlatformHandler, token } from "../lib/platform-handler"
import { describe, expect, spyOn, test } from "bun:test"

import { Platform } from "../lib/models/config"
import { getConfigError } from "../lib/error"

export class TestPlatformHandler implements PlatformHandler {
    private create?: (owner: string, repository: string, pull: Pull) => Promise<void>
    private has?: (owner: string, repository: string, from: string, to: string) => Promise<boolean>

    constructor(create?: (owner: string, repository: string, pull: Pull) => Promise<void>, has?: (owner: string, repository: string, from: string, to: string) => Promise<boolean>) {
        this.create = create
        this.has = has
    }

    createPull(owner: string, repository: string, pull: Pull): Promise<void> {
        return this.create!(owner, repository, pull)
    }

    hasPull(owner: string, repository: string, from: string, to: string): Promise<boolean> {
       return this.has!(owner, repository, from, to)
    }

    gitUser(): string {
        return "test-user"
    }
}

describe("gitUser", () => {
    test("should create bitbucket platform manually", () => {
        // Act
        const handler = newPlatformHandler(Platform.BITBUCKET, "baseURL", "", "", {})

        // Assert
        expect(handler.gitUser()).toEqual("x-token-auth")
    })

    test("should create bitbucket cloud platform manually", () => {
        // Act
        const handler = newPlatformHandler(Platform.BITBUCKET_CLOUD, "baseURL", "", "", {})

        // Assert
        expect(handler.gitUser()).toEqual("x-token-auth")
    })

    test("should create gitea platform manually", () => {
        // Act
        const handler = newPlatformHandler(Platform.GITEA, "baseURL", "", "", {})

        // Assert
        expect(handler.gitUser()).toEqual("gitea-token")
    })

    test("should create github platform manually", () => {
        // Act
        const handler = newPlatformHandler(Platform.GITHUB, "baseURL", "", "", {})

        // Assert
        expect(handler.gitUser()).toEqual("x-access-token")
    })

    test("should create gitlab platform manually", () => {
        // Act
        const handler = newPlatformHandler(Platform.GITLAB, "baseURL", "", "", {})

        // Assert
        expect(handler.gitUser()).toEqual("gitlab-ci-token")
    })

    test("should throw an exception for invalid input platform", () => {
        // Act
        // @ts-expect-error because we want to check invalid inputs
        const matcher = expect(() => newPlatformHandler("invalid", "baseURL", "", "", {}))

        // Assert
        matcher.toThrowError(getConfigError("platform", "invalid"))
    })

    test("should guess bitbucket platform", () => {
        // Act
        const handler = newPlatformHandler(Platform.NULL, "", "", "", { BITBUCKET_URL: "baseURL" })

        // Assert
        expect(handler.gitUser()).toEqual("x-token-auth")
    })

    test("should guess bitbucket cloud platform", () => {
        // Act
        const handler = newPlatformHandler(Platform.NULL, "", "", "", { BITBUCKET_CLOUD_URL: "baseURL" })

        // Assert
        expect(handler.gitUser()).toEqual("x-token-auth")
    })

    test("should guess gitea platform", () => {
        // Act
        const handler = newPlatformHandler(Platform.NULL, "", "", "", { GITEA_URL: "baseURL" })

        // Assert
        expect(handler.gitUser()).toEqual("gitea-token")
    })

    test("should guess github platform", () => {
        type record = Record<string, string>

        const envs = ["GH_URL", "GITHUB_URL", "GITHUB_API_URL"]
        for (const envvar of envs) {
            test(`should guess github platform with environment variable '${envvar}'`, () => {
                // Arrange
                const env: record = {}
                env[envvar] = "baseURL"

                // Act
                const handler = newPlatformHandler(Platform.NULL, "", "", "", env)

                // Assert
                expect(handler.gitUser()).toEqual("x-access-token")
            })
        }
    })

    test("should guess gitlab platform", () => {
        type record = Record<string, string>

        const envs = ["GL_URL", "GITLAB_URL", "CI_SERVER_URL"]
        for (const envvar of envs) {
            test(`should guess gitlab platform with environment variable '${envvar}'`, () => {
                // Arrange
                const env: record = {}
                env[envvar] = "baseURL"

                // Act
                const handler = newPlatformHandler(Platform.NULL, "", "", "", env)

                // Assert
                expect(handler.gitUser()).toEqual("gitlab-ci-token")
            })
        }
    })

    test("should throw an exception for no guess platform", () => {
        // Act
        const matcher = expect(() => newPlatformHandler(Platform.NULL, "", "", "", {}))

        // Assert
        matcher.toThrowError("Failed to guess git platform, no appropriate environment variable found.")
    })
})

describe("token", () => {
    type record = Record<string, string>

    test("should read token from environment variables", () => {
        const envs = ["BB_TOKEN", "BITBUCKET_TOKEN", "GITEA_TOKEN", "GH_TOKEN", "GITHUB_TOKEN", "GL_TOKEN", "GITLAB_TOKEN"]
        for (const envvar of envs) {
            test(`should read token from ${envvar}`, () => {
                // Arrange
                const env: record = {}
                env[envvar] = "some-token"

                // Act
                const actual = token(env)

                // Assert
                expect(actual).toEqual("some-token")
            })
        }
    })

    test("should read nothing", () => {
        // Arrange
        const env: record = { INVALID: "some-token" }

        // Act
        const actual = token(env)

        // Assert
        expect(actual).toEqual("")
    })
})

describe("hasPull", () => {

})

describe("createPull", () => {
    test("should create bitbucket pull request", async () => {
        // Arrange
        let url = ""
        spyOn(global, "fetch").mockImplementation(async (input: string | URL | Request, init?: FetchRequestInit): Promise<Response> => {
            url = input.toString()
            // @ts-expect-error because fetch signature is too complex, we only need a small part
            return Promise.resolve({ ok: true })
        })

        const pull = {
            body: "some body",
            from: "main",
            title: "backmerge failure",
            to: "develop"
        }

        const bitbucket = newPlatformHandler(Platform.BITBUCKET, "baseURL", "prefix", "some-token", {})

        // Act
        await bitbucket.createPull("owner", "repository", pull)

        // Assert
        expect(url).toEqual(`baseURL/prefix/projects/owner/repos/repository/pull-requests`)
    })

    test("should create bitbucket cloud pull request", async () => {
        // Arrange
        let url = ""
        spyOn(global, "fetch").mockImplementation(async (input: string | URL | Request, init?: FetchRequestInit): Promise<Response> => {
            url = input.toString()
            // @ts-expect-error because fetch signature is too complex, we only need a small part
            return Promise.resolve({ ok: true })
        })

        const pull = {
            body: "some body",
            from: "main",
            title: "backmerge failure",
            to: "develop"
        }

        const bitbucket = newPlatformHandler(Platform.BITBUCKET_CLOUD, "baseURL", "prefix", "some-token", {})

        // Act
        await bitbucket.createPull("owner", "repository", pull)

        // Assert
        expect(url).toEqual(`baseURL/prefix/repositories/owner/repository/pullrequests`)
    })

    test("should create gitea pull request", async () => {
        // Arrange
        let url = ""
        spyOn(global, "fetch").mockImplementation(async (input: string | URL | Request, init?: FetchRequestInit): Promise<Response> => {
            url = input.toString()
            // @ts-expect-error because fetch signature is too complex, we only need a small part
            return Promise.resolve({ ok: true })
        })

        const pull = {
            body: "some body",
            from: "main",
            title: "backmerge failure",
            to: "develop"
        }

        const bitbucket = newPlatformHandler(Platform.GITEA, "baseURL", "prefix", "some-token", {})

        // Act
        await bitbucket.createPull("owner", "repository", pull)

        // Assert
        expect(url).toEqual(`baseURL/prefix/repos/owner/repository/pulls`)
    })

    // test("should create github pull request", async () => {
    //     // Arrange
    //     let url = ""
    //     spyOn(global, "fetch").mockImplementation(async (input: String | URL | Request, init?: FetchRequestInit): Promise<Response> => {
    //         url = input.toString()
    //         const response = { 
    //             body: null,
    //             headers: {},
    //             json: () => {}, 
    //             ok: true, 
    //             status: 200, 
    //             text: () => {},
    //         }
    //         // @ts-expect-error because fetch signature is too complex, we only need a small part
    //         return Promise.resolve(response)
    //     })

    //     const pull = {
    //         body: "some body",
    //         from: "main",
    //         title: "backmerge failure",
    //         to: "develop"
    //     }

    //     const bitbucket = newPlatformHandler(Platform.GITHUB, "baseURL", "prefix", "some-token", {})

    //     // Act
    //     await bitbucket.createPull("owner", "repository", pull)

    //     // Assert
    //     expect(url).toEqual(`baseURL/prefix/projects/owner/repos/repository/pull-requests`)
    // })

    test("should create gitlab pull request", async () => {
        // Arrange
        let url = ""
        spyOn(global, "fetch").mockImplementation(async (input: string | URL | Request, init?: FetchRequestInit): Promise<Response> => {
            url = input.toString()
            // @ts-expect-error because fetch signature is too complex, we only need a small part
            return Promise.resolve({ ok: true })
        })

        const pull = {
            body: "some body",
            from: "main",
            title: "backmerge failure",
            to: "develop"
        }

        const bitbucket = newPlatformHandler(Platform.GITLAB, "baseURL", "prefix", "some-token", {})

        // Act
        await bitbucket.createPull("owner", "repository", pull)

        // Assert
        expect(url).toEqual(`baseURL/prefix/projects/${encodeURIComponent("owner/repository")}/merge_requests`)
    })
})