import { Pull } from "../../lib/platform-handler"

/**
 * Server is a fake git remote answering both git over HTTP and one platform pull requests API.
 *
 * Disposing it shuts the server down.
 */
export interface Server extends AsyncDisposable {
    /**
     * pulls are the pull requests received by the platform API, in creation order.
     */
    pulls: Pull[]

    /**
     * url is the base url of the server, both the platform API and the git remote.
     */
    url: string
}

/**
 * cgi forwards an incoming request to 'git http-backend' and converts its CGI output back into a response.
 *
 * @param projects the directory containing the bare repositories.
 * @param request the incoming request.
 *
 * @returns the response built from the CGI output.
 */
const cgi = async (projects: string, request: Request): Promise<Response> => {
    const url = new URL(request.url)
    const body = new Uint8Array(await request.arrayBuffer())

    const proc = Bun.spawn(["git", "http-backend"], {
        env: {
            CONTENT_LENGTH: String(body.length),
            CONTENT_TYPE: request.headers.get("content-type") ?? "",
            GIT_HTTP_EXPORT_ALL: "1",
            GIT_PROJECT_ROOT: projects,
            PATH_INFO: url.pathname,
            QUERY_STRING: url.search.slice(1),
            REQUEST_METHOD: request.method,
        },
        stdin: body,
        stdout: "pipe",
    })
    const output = Buffer.from(await new Response(proc.stdout).arrayBuffer())
    await proc.exited

    // CGI output is a header block, an empty line, then the raw body
    const separator = output.indexOf("\r\n\r\n")
    let status = 200
    const headers = new Headers()
    for (const line of output.subarray(0, separator).toString().split("\r\n")) {
        const index = line.indexOf(":")
        const name = line.slice(0, index).trim()
        const value = line.slice(index + 1).trim()
        if (name.toLowerCase() === "status") {
            status = Number(value.split(" ")[0])
        } else {
            headers.set(name, value)
        }
    }
    return new Response(output.subarray(separator + 4), { headers, status })
}

/**
 * bitbucket starts a fake git remote answering the bitbucket server pull requests API.
 *
 * @see https://developer.atlassian.com/server/bitbucket/rest/v819/api-group-pull-requests
 *
 * @param projects the directory containing the bare repositories.
 * @param token the token the plugin must authenticate with.
 *
 * @returns the running server.
 */
export const bitbucket = (projects: string, token: string): Server => {
    const heads = "refs/heads/"
    const pulls: Pull[] = []

    const server = Bun.serve({
        fetch: request => cgi(projects, request),
        hostname: "127.0.0.1",
        idleTimeout: 0,
        port: 0,
        routes: {
            "/rest/api/1.0/projects/:owner/repos/:repo/pull-requests": {
                GET: request => {
                    if (request.headers.get("authorization") !== `Bearer ${token}`) {
                        return new Response("unauthorized", { status: 401 })
                    }

                    const from = new URL(request.url).searchParams.get("at")?.replace(heads, "")
                    const values = pulls.
                        filter(pull => pull.from === from).
                        map(pull => ({ fromRef: { id: heads + pull.from }, toRef: { id: heads + pull.to } }))
                    return Response.json({ isLastPage: true, values })
                },
                POST: async request => {
                    if (request.headers.get("authorization") !== `Bearer ${token}`) {
                        return new Response("unauthorized", { status: 401 })
                    }

                    const json = await request.json() as { description: string, fromRef: { id: string }, title: string, toRef: { id: string } }
                    pulls.push({
                        body: json.description,
                        from: String(json.fromRef.id).replace(heads, ""),
                        title: json.title,
                        to: String(json.toRef.id).replace(heads, ""),
                    })
                    return Response.json({ id: pulls.length }, { status: 201 })
                },
            },
        },
    })

    return { [Symbol.asyncDispose]: async () => { await server.stop(true) }, pulls, url: server.url.origin }
}

/**
 * bitbucketCloud starts a fake git remote answering the bitbucket cloud pull requests API.
 *
 * @see https://developer.atlassian.com/cloud/bitbucket/rest/api-group-pullrequests
 *
 * @param projects the directory containing the bare repositories.
 * @param token the token the plugin must authenticate with.
 *
 * @returns the running server.
 */
export const bitbucketCloud = (projects: string, token: string): Server => {
    const pulls: Pull[] = []

    const server = Bun.serve({
        fetch: request => cgi(projects, request),
        hostname: "127.0.0.1",
        idleTimeout: 0,
        port: 0,
        routes: {
            "/2.0/repositories/:owner/:repo/pullrequests": {
                // bitbucket cloud doesn't filter on branches, we walk it ourselves in semantic-release-backmerge
                GET: request => {
                    if (request.headers.get("authorization") !== `Bearer ${token}`) {
                        return new Response("unauthorized", { status: 401 })
                    }
                    return Response.json({
                        next: "",
                        values: pulls.map(pull => ({
                            destination: { branch: { name: pull.to } },
                            source: { branch: { name: pull.from } },
                        })),
                    })
                },
                POST: async request => {
                    if (request.headers.get("authorization") !== `Bearer ${token}`) {
                        return new Response("unauthorized", { status: 401 })
                    }

                    const json = await request.json() as { description: string, destination: { branch: { name: string } }, source: { branch: { name: string } }, title: string }
                    pulls.push({
                        body: json.description,
                        from: json.source.branch.name,
                        title: json.title,
                        to: json.destination.branch.name,
                    })
                    return Response.json({ id: pulls.length }, { status: 201 })
                },
            },
        },
    })

    return { [Symbol.asyncDispose]: async () => { await server.stop(true) }, pulls, url: server.url.origin }
}

/**
 * gitea starts a fake git remote answering the gitea and forgejo pull requests API.
 *
 * @see https://docs.gitea.com/api/1.22/#tag/repository
 *
 * @param projects the directory containing the bare repositories.
 * @param token the token the plugin must authenticate with.
 *
 * @returns the running server.
 */
export const gitea = (projects: string, token: string): Server => {
    const pulls: Pull[] = []

    const server = Bun.serve({
        fetch: request => cgi(projects, request),
        hostname: "127.0.0.1",
        idleTimeout: 0,
        port: 0,
        routes: {
            "/api/v1/repos/:owner/:repo/pulls": {
                POST: async request => {
                    if (request.headers.get("authorization") !== `Bearer ${token}`) {
                        return new Response("unauthorized", { status: 401 })
                    }

                    const json = await request.json() as { base: string, body: string, head: string, title: string }
                    pulls.push({ body: json.body, from: json.head, title: json.title, to: json.base })
                    return Response.json({ id: pulls.length }, { status: 201 })
                },
            },
            // gitea only reads the response status to know whether a pull request exists
            "/api/v1/repos/:owner/:repo/pulls/:to/:from": {
                GET: request => {
                    if (request.headers.get("authorization") !== `Bearer ${token}`) {
                        return new Response("unauthorized", { status: 401 })
                    }

                    const { from, to } = request.params
                    const exists = pulls.some(pull => pull.from === from && pull.to === to)
                    return exists ? Response.json({}) : new Response("not found", { status: 404 })
                },
            },
        },
    })

    return { [Symbol.asyncDispose]: async () => { await server.stop(true) }, pulls, url: server.url.origin }
}

/**
 * github starts a fake git remote answering the github pull requests API.
 *
 * @see https://docs.github.com/fr/rest/pulls/pulls
 *
 * @param projects the directory containing the bare repositories.
 * @param token the token the plugin must authenticate with.
 *
 * @returns the running server.
 */
export const github = (projects: string, token: string): Server => {
    const pulls: Pull[] = []

    const server = Bun.serve({
        fetch: request => cgi(projects, request),
        hostname: "127.0.0.1",
        idleTimeout: 0,
        port: 0,
        routes: {
            "/repos/:owner/:repo/pulls": {
                GET: request => {
                    if (request.headers.get("authorization") !== `token ${token}`) { // octokit doesn't use the bearer scheme
                        return new Response("unauthorized", { status: 401 })
                    }

                    const query = new URL(request.url).searchParams
                    const from = query.get("head")?.split(":").pop() // github lists the source branch as '<owner>:<branch>'
                    const to = query.get("base")
                    return Response.json(pulls.filter(pull => pull.from === from && pull.to === to))
                },
                POST: async request => {
                    if (request.headers.get("authorization") !== `token ${token}`) {
                        return new Response("unauthorized", { status: 401 })
                    }

                    const json = await request.json() as { base: string, body: string, head: string, title: string }
                    pulls.push({ body: json.body, from: json.head, title: json.title, to: json.base })
                    return Response.json({ id: pulls.length }, { status: 201 })
                },
            },
        },
    })

    return { [Symbol.asyncDispose]: async () => { await server.stop(true) }, pulls, url: server.url.origin }
}

/**
 * gitlab starts a fake git remote answering the gitlab merge requests API.
 *
 * @see https://docs.gitlab.com/ee/api/merge_requests.html
 *
 * @param projects the directory containing the bare repositories.
 * @param token the token the plugin must authenticate with.
 *
 * @returns the running server.
 */
export const gitlab = (projects: string, token: string): Server => {
    const pulls: Pull[] = []

    const server = Bun.serve({
        fetch: request => cgi(projects, request),
        hostname: "127.0.0.1",
        idleTimeout: 0,
        port: 0,
        routes: {
            "/api/v4/projects/:project/merge_requests": {
                GET: request => {
                    if (request.headers.get("authorization") !== `Bearer ${token}`) {
                        return new Response("unauthorized", { status: 401 })
                    }

                    const query = new URL(request.url).searchParams
                    const from = query.get("source_branch")
                    const to = query.get("target_branch")
                    return Response.json(pulls.filter(pull => pull.from === from && pull.to === to))
                },
                POST: async request => {
                    if (request.headers.get("authorization") !== `Bearer ${token}`) {
                        return new Response("unauthorized", { status: 401 })
                    }

                    const json = await request.json() as { description: string, source_branch: string, target_branch: string, title: string }
                    pulls.push({
                        body: json.description,
                        from: json.source_branch,
                        title: json.title,
                        to: json.target_branch,
                    })
                    return Response.json({ id: pulls.length }, { status: 201 })
                },
            },
        },
    })

    return { [Symbol.asyncDispose]: async () => { await server.stop(true) }, pulls, url: server.url.origin }
}
