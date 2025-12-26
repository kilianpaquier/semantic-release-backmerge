import { PlatformHandler, Pull, newPlatformHandler, token } from "../lib/platform-handler"
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"

import { Platform } from "../lib/models/config"
import { getConfigError } from "../lib/error"

/**
 * TestPlatformHandler is a mock PlatformHandler to use in testing functions.
 */
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

const bunfetch = (wrap: (input: string | URL | Request, init?: BunFetchRequestInit) => Promise<Response>) => {
    const ffetch: typeof fetch = async (input: string | URL | Request, init?: BunFetchRequestInit): Promise<Response> => wrap(input, init)
    ffetch.preconnect = () => { }
    spyOn(global, "fetch").mockImplementationOnce(ffetch)
}

const bunresponse = (data: any, ok = true): Promise<Response> =>
    // @ts-expect-error because fetch signature is too complex, we only need a small part
    Promise.resolve({
        json: () => Promise.resolve(data),
        ok,
        text: () => Promise.resolve(JSON.stringify(data))
    })


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

    describe("should guess github platform", () => {
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

    describe("should guess gitlab platform", () => {
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

    describe("should read token from environment variables", () => {
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
        const env = { INVALID: "some-token" }

        // Act
        const actual = token(env)

        // Assert
        expect(actual).toEqual("")
    })
})

describe("hasPull", () => {
    afterEach(() => mock.restore())

    const failure = (platform: Platform) => {
        // Arrange
        const handler = newPlatformHandler(platform, "baseURL", "prefix", "some-token", {})

        // Act
        const matcher = expect(async () => await handler.hasPull("owner", "repository", "main", "develop"))

        // Assert
        matcher.toThrowError("some error message")
    }

    describe("should throw error on invalid pull requests response", () => {
        const platforms = [Platform.BITBUCKET, Platform.BITBUCKET_CLOUD, Platform.GITLAB]
        for (const platform of platforms) {
            test(`should throw error on invalid ${platform} pull requests response`, () => {
                // Arrange
                const json = { invalid: true, text: "some text" }
                bunfetch(() => bunresponse(json))

                const handler = newPlatformHandler(platform, "baseURL", "prefix", "some-token", {})

                // Act
                const matcher = expect(async () => await handler.hasPull("owner", "repository", "main", "develop"))

                // Assert
                matcher.toThrowError(JSON.stringify(json))
            })
        }
    })

    describe("should throw error while checking pull request", () => {
        const platforms = [Platform.BITBUCKET, Platform.BITBUCKET_CLOUD, Platform.GITEA, Platform.GITLAB]
        for (const platform of platforms) {
            test(`should throw error while checking ${platform} pull request`, () => {
                // Arrange
                bunfetch(() => { throw new Error("some error message") })

                // Act & Assert
                failure(platform)
            })
        }
    })

    describe("should fail to check pull request", () => {
        const platforms = [Platform.BITBUCKET, Platform.BITBUCKET_CLOUD, Platform.GITLAB]
        for (const platform of platforms) {
            test(`should fail to check ${platform} pull request`, () => {
                // Arrange
                bunfetch(() => bunresponse("some error message", false))

                // Act & Assert
                failure(platform)
            })
        }
    })

    test("should check bitbucket pull request", async () => {
        // Arrange
        const expectedUrl = (query: string) => `baseURL/prefix/projects/owner/repos/repository/pull-requests?${query}`
        const expectedFirstPage = expectedUrl("state=OPEN&at=refs/heads/main&start=0&limit=100")
        const expectedSecondPage = expectedUrl("state=OPEN&at=refs/heads/main&start=1&limit=100") // start is 1 since mock only return one element

        const pages: string[] = []
        bunfetch((input): Promise<Response> => {
            pages.push(input as string)
            return bunresponse({
                isLastPage: false, // ensure paging is stopped when we find the right destination
                values: [{ fromRef: { id: "refs/heads/main" }, toRef: { id: "refs/heads/staging" } }]
            })
        })
        bunfetch((input): Promise<Response> => {
            pages.push(input as string)
            return bunresponse({
                isLastPage: false, // ensure paging is stopped when we find the right destination
                values: [{ fromRef: { id: "refs/heads/main" }, toRef: { id: "refs/heads/develop" } }]
            })
        })

        const handler = newPlatformHandler(Platform.BITBUCKET, "baseURL", "prefix", "some-token", {})

        // Act
        const has = await handler.hasPull("owner", "repository", "main", "develop")

        // Assert
        expect(pages).toEqual([expectedFirstPage, expectedSecondPage])
        expect(has).toBeTrue()
    })

    test("should check bitbucket cloud pull request", async () => {
        // Arrange
        const expectedUrl = (query: string) => `baseURL/prefix/repositories/owner/repository/pullrequests?${query}`
        const expectedFirstPage = expectedUrl("state=OPEN")
        const expectedSecondPage = expectedUrl("state=OPEN&page=2")

        const pages: string[] = []
        bunfetch((input): Promise<Response> => {
            pages.push(input as string)
            return bunresponse({
                next: expectedSecondPage,
                values: [{ destination: { branch: { name: "staging" } }, source: { branch: { name: "main" } } }],
            })
        })
        bunfetch((input): Promise<Response> => {
            pages.push(input as string)
            return bunresponse({
                next: "",
                values: [{ destination: { branch: { name: "develop" } }, source: { branch: { name: "main" } } }],
            })
        })

        const handler = newPlatformHandler(Platform.BITBUCKET_CLOUD, "baseURL", "prefix", "some-token", {})

        // Act
        const has = await handler.hasPull("owner", "repository", "main", "develop")

        // Assert
        expect(pages).toEqual([expectedFirstPage, expectedSecondPage])
        expect(has).toBeTrue()
    })

    test("should check gitea pull request", async () => {
        // Arrange
        const expectedUrl = "baseURL/prefix/repos/owner/repository/pulls/develop/main"

        let url = ""
        bunfetch((input): Promise<Response> => {
            url = (input as string)
            return bunresponse({})
        })

        const handler = newPlatformHandler(Platform.GITEA, "baseURL", "prefix", "some-token", {})

        // Act
        const has = await handler.hasPull("owner", "repository", "main", "develop")

        // Assert
        expect(url).toEqual(expectedUrl)
        expect(has).toBeTrue()
    })

    test("should check gitlab pull request", async () => {
        // Arrange
        const expectedUrl = "baseURL/prefix/projects/owner%2Frepository/merge_requests?state=opened&target_branch=develop&source_branch=main"

        let url = ""
        bunfetch((input): Promise<Response> => {
            url = (input as string)
            return bunresponse([{}])
        })

        const handler = newPlatformHandler(Platform.GITLAB, "baseURL", "prefix", "some-token", {})

        // Act
        const has = await handler.hasPull("owner", "repository", "main", "develop")

        // Assert
        expect(url).toEqual(expectedUrl)
        expect(has).toBeTrue()
    })
})

describe("createPull", () => {
    afterEach(() => mock.restore())

    const failure = (platform: Platform) => {
        // Arrange
        const pull = {
            body: "some body",
            from: "main",
            title: "backmerge failure",
            to: "develop"
        }

        const handler = newPlatformHandler(platform, "baseURL", "prefix", "some-token", {})

        // Act
        const matcher = expect(async () => await handler.createPull("owner", "repository", pull))

        // Assert
        matcher.toThrowError("some error message")
    }

    describe("should throw error on pull request creation", () => {
        const platforms = [Platform.BITBUCKET, Platform.BITBUCKET_CLOUD, Platform.GITEA, Platform.GITLAB]
        for (const platform of platforms) {
            test(`should throw error on ${platform} pull request creation`, () => {
                // Arrange
                bunfetch(() => { throw new Error("some error message") })

                // Act & Assert
                failure(platform)
            })
        }
    })

    describe("should fail to create pull request", () => {
        const platforms = [Platform.BITBUCKET, Platform.BITBUCKET_CLOUD, Platform.GITEA, Platform.GITLAB]
        for (const platform of platforms) {
            test(`should fail to create ${platform} pull request`, () => {
                // Arrange
                bunfetch(() => bunresponse("some error message", false))

                // Act & Assert
                failure(platform)
            })
        }
    })

    test("should create bitbucket pull request", async () => {
        // Arrange
        const expectedUrl = "baseURL/prefix/projects/owner/repos/repository/pull-requests"
        const pull = {
            body: "some body",
            from: "main",
            title: "backmerge failure",
            to: "develop"
        }
        const expectedBody = {
            body: JSON.stringify({
                description: pull.body,
                fromRef: { id: `refs/heads/${pull.from}` },
                open: true,
                state: "OPEN",
                title: pull.title,
                toRef: { id: `refs/heads/${pull.to}` },
            }),
            headers: {
                Authorization: `Bearer some-token`,
                "Content-Type": "application/json",
            },
            method: "POST",
        }

        let url = ""
        let body: BunFetchRequestInit = {}
        bunfetch((input, init): Promise<Response> => {
            url = (input as string).toString()
            body = init ?? {}
            return bunresponse({})
        })

        const handler = newPlatformHandler(Platform.BITBUCKET, "baseURL", "prefix", "some-token", {})

        // Act
        await handler.createPull("owner", "repository", pull)

        // Assert
        expect(url).toEqual(expectedUrl)
        expect(body).toEqual(expectedBody)
    })

    test("should create bitbucket cloud pull request", async () => {
        // Arrange
        const expectedUrl = "baseURL/prefix/repositories/owner/repository/pullrequests"
        const pull = {
            body: "some body",
            from: "main",
            title: "backmerge failure",
            to: "develop"
        }
        const expectedBody = {
            body: JSON.stringify({
                description: pull.body,
                destination: { branch: { name: pull.to } },
                source: { branch: { name: pull.from } },
                title: pull.title,
            }),
            headers: {
                Authorization: `Bearer some-token`,
                "Content-Type": "application/json",
            },
            method: "POST",
        }

        let url = ""
        let body: BunFetchRequestInit = {}
        bunfetch((input, init): Promise<Response> => {
            url = (input as string).toString()
            body = init ?? {}
            return bunresponse({})
        })

        const handler = newPlatformHandler(Platform.BITBUCKET_CLOUD, "baseURL", "prefix", "some-token", {})

        // Act
        await handler.createPull("owner", "repository", pull)

        // Assert
        expect(url).toEqual(expectedUrl)
        expect(body).toEqual(expectedBody)
    })

    test("should create gitea pull request", async () => {
        // Arrange
        const expectedUrl = "baseURL/prefix/repos/owner/repository/pulls"
        const pull = {
            body: "some body",
            from: "main",
            title: "backmerge failure",
            to: "develop"
        }
        const expectedBody = {
            body: JSON.stringify({
                base: pull.to,
                body: pull.body,
                head: pull.from,
                title: pull.title,
            }),
            headers: {
                Authorization: `Bearer some-token`,
                "Content-Type": "application/json",
            },
            method: "POST",
        }

        let url = ""
        let body: BunFetchRequestInit = {}
        bunfetch((input, init): Promise<Response> => {
            url = (input as string).toString()
            body = init ?? {}
            return bunresponse({})
        })

        const handler = newPlatformHandler(Platform.GITEA, "baseURL", "prefix", "some-token", {})

        // Act
        await handler.createPull("owner", "repository", pull)

        // Assert
        expect(url).toEqual(expectedUrl)
        expect(body).toEqual(expectedBody)
    })

    test("should create gitlab pull request", async () => {
        // Arrange
        const expectedUrl = `baseURL/prefix/projects/${encodeURIComponent("owner/repository")}/merge_requests`
        const pull = {
            body: "some body",
            from: "main",
            title: "backmerge failure",
            to: "develop"
        }
        const expectedBody = {
            body: JSON.stringify({
                description: pull.body,
                source_branch: pull.from,
                target_branch: pull.to,
                title: pull.title,
            }),
            headers: {
                Authorization: `Bearer some-token`,
                "Content-Type": "application/json",
            },
            method: "POST",
        }

        let url = ""
        let body: BunFetchRequestInit = {}
        bunfetch((input, init): Promise<Response> => {
            url = (input as string).toString()
            body = init ?? {}
            return bunresponse({})
        })

        const handler = newPlatformHandler(Platform.GITLAB, "baseURL", "prefix", "some-token", {})

        // Act
        await handler.createPull("owner", "repository", pull)

        // Assert
        expect(url).toEqual(expectedUrl)
        expect(body).toEqual(expectedBody)
    })
})
