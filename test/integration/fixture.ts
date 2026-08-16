import * as git from "../../lib/git"

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"

import { Result, execa } from "execa"

import { join } from "node:path"
import { tmpdir } from "node:os"

/**
 * Origin is a temporary bare repository alongside the directories around it.
 *
 * Disposing it removes the temporary directory.
 */
export interface Origin extends AsyncDisposable {
    /**
     * path is the location of the bare repository.
     */
    path: string

    /**
     * projects is the directory to give to a fake server, git http-backend GIT_PROJECT_ROOT.
     */
    projects: string

    /**
     * tmp is the temporary directory holding everything, to remove once the test is done.
     */
    tmp: string
}

/**
 * Commit is a single file change to commit.
 */
export interface Commit {
    /**
     * content is what the file must contain after the commit.
     */
    content: string

    /**
     * file is the file name to write, relative to the repository.
     */
    file: string

    /**
     * message is the commit message.
     */
    message: string
}

/**
 * init creates a temporary directory with an empty bare repository inside, ready to be served over HTTP.
 *
 * @returns the created bare repository and the directories around it.
 */
export const init = async (): Promise<Origin> => {
    const tmp = await mkdtemp(join(tmpdir(), "backmerge-"))
    const projects = join(tmp, "projects")
    const path = join(projects, "owner", "repo.git")

    await mkdir(path, { recursive: true })
    await execa("git", ["init", "--bare", "-b", "main", path])
    await execa("git", ["config", "--bool", "http.receivepack", "true"], { cwd: path }) // required to push over HTTP

    return { [Symbol.asyncDispose]: () => rm(tmp, { force: true, recursive: true }), path, projects, tmp }
}

/**
 * clone clones the bare repository exposed by the input server.
 *
 * @param url the base url of the fake server exposing the bare repository.
 * @param tmp the temporary directory to clone into.
 *
 * @returns the current directory semantic-release must be run in.
 */
export const clone = async (url: string, tmp: string): Promise<string> => {
    const cwd = join(tmp, "cwd")

    await execa("git", ["clone", `${url}/owner/repo.git`, cwd])
    await execa("git", ["config", "user.email", "integration@example.com"], { cwd })
    await execa("git", ["config", "user.name", "integration"], { cwd })

    // cloning an empty repository leaves the branch to init.defaultBranch unless git adopts the
    // remote HEAD, which only recent versions do, so name it like the bare repository was named
    await execa("git", ["checkout", "-B", "main"], { cwd })

    return cwd
}

/**
 * commit writes and commits the input changes on the current branch.
 *
 * @param cwd the current directory.
 * @param commits the changes to commit, in order.
 */
export const commit = async (cwd: string, ...commits: Commit[]) => {
    for (const { content, file, message } of commits) {
        await writeFile(join(cwd, file), content)
        await execa("git", ["add", "."], { cwd })
        await execa("git", ["commit", "-m", message], { cwd })
    }
}

/**
 * checkout switches to the input branch, creating it off the current one when it doesn't exist yet.
 *
 * @param cwd the current directory.
 * @param name the branch to switch to.
 */
export const checkout = async (cwd: string, name: string) => {
    // the full ref, otherwise an unknown branch silently resolves to a remote or a tag of that name
    const { stdout: hash } = await execa("git", ["rev-parse", "--verify", `refs/heads/${name}`], { cwd, reject: false })
    await git.checkout({ hash: hash === "" ? "HEAD" : hash, name }, cwd)
}

/**
 * push pushes the current branch to the bare repository exposed by the input server.
 *
 * @param url the base url of the fake server exposing the bare repository.
 * @param cwd the current directory.
 * @param name the branch to push to.
 */
export const push = (url: string, cwd: string, name: string) => git.push(`${url}/owner/repo.git`, name, false, cwd)

/**
 * release runs semantic-release in the input directory.
 *
 * @param cwd the current directory.
 * @param variable the environment variable the plugin reads the platform token from.
 * @param token the token to give the plugin.
 *
 * @returns the semantic-release result, failures included.
 */
export const release = (cwd: string, variable: string, token: string): Promise<Result> => {
    const semanticRelease = join(import.meta.dirname, "..", "..", "node_modules", "semantic-release", "bin", "semantic-release.js")
    return execa("node", [semanticRelease, "--no-ci"], {
        cwd,
        env: {
            GIT_TERMINAL_PROMPT: "0",
            HOME: cwd,
            PATH: process.env.PATH!,
            [variable]: token
        },
        // isolated environment so no ambient CI variable or real token leaks into the run
        extendEnv: false,
        reject: false,
    })
}

/**
 * releaserc builds the semantic-release configuration backmerging main into develop with the plugin.
 *
 * @param plugin the path semantic-release must load semantic-release-backmerge from.
 * @param platform the platform to configure the plugin with.
 * @param url the base url of the fake server, both the platform API and the git remote.
 *
 * @returns the serialized configuration to write as .releaserc.json.
 */
export const releaserc = (plugin: string, platform: string, url: string): string => JSON.stringify({
    branches: ["main"],
    plugins: [
        "@semantic-release/commit-analyzer",
        "@semantic-release/release-notes-generator",
        [plugin, { baseUrl: url, platform, targets: [{ from: "main", to: "develop" }] }],
    ],
    repositoryUrl: `${url}/owner/repo.git`,
})

/**
 * log returns the commit subjects of the input branch.
 *
 * @param name the branch to read.
 * @param cwd the current directory.
 *
 * @returns the commit subjects, most recent first.
 */
export const log = async (name: string, cwd: string): Promise<string[]> => {
    const { stdout } = await execa("git", ["log", "--format=%s", name], { cwd })
    return stdout.split("\n")
}
