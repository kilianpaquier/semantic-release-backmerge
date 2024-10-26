import { GitUrl } from "git-url-parse"
import { execa } from "execa"

import debug from "debug"

/**
 * Branch represents a simplified interface for a branch 
 * and its remote commit hash.
 */
export interface Branch {
    hash: string
    name: string
}

/**
 * prefix needs to be semantic-release:
 * @see https://github.com/semantic-release/semantic-release/blob/8940f32ccce455a01a4e32c101bb0f4a809ab00d/cli.js#L52
 */
const deblog = debug("semantic-release:backmerge")

/**
 * authModificator takes as input a GitUrl (from git-url-parse) 
 * and generates an http or https git url with replaced authentication (with the input token).
 * 
 * @param url with all related information to the git repository.
 * @param user being the oauth prefix to use (specific depending on the current git platform).
 * @param token to use instead of present token in url.
 * 
 * @throws SemanticReleaseError in case the platform isn't an implemented platform or is not a platform at all.
 * 
 * @returns the computed remote url with all modifications' done.
 */
export const authModificator = (url: GitUrl, user: string, token: string): string => {
    const proto = url.protocol === "http" ? "http" : "https"

    const origin = url.toString(proto)
    // simple replace to add the authentication after toString
    return origin.replace(`${proto}://${url.user}@`, `${proto}://`).
        replace(`${proto}://`, `${proto}://${user}:${token}@`)
}

/**
 * version returns the current git version. It also ensures that git is installed 
 * and rightly spawned by execa.
 * 
 * @param cwd the current directory.
 * @param env all known environment variables.
 * 
 * @returns the output of git --version.
 */
export const version = async (cwd?: string, env?: Record<string, string>) => {
    const { stdout, stderr } = await execa("git", ["--version"], { cwd, env })
    if (stderr !== "") {
        deblog("received stderr text from git version: %s", stderr)
    }
    return stdout
}

/**
 * ls returns the slice of all branches present in remote origin.
 * 
 * It removes 'refs/heads/' from the branches name.
 * 
 * @param remote the remote to list branches from.
 * @param cwd the current directory.
 * @param env all known environment variables.
 * 
 * @returns the slice of branches.
 * 
 * @throws an error if the git ls-remote cannot be done.
 */
export const ls = async (remote: string, cwd?: string, env?: Record<string, string>) => {
    deblog("executing git ls-remote")
    const { stdout, stderr } = await execa("git", ["ls-remote", "--heads", remote], { cwd, env })
    if (stderr !== "") {
        deblog("received stderr text from git ls-remote: %s", stderr)
    }
    deblog("received stdout text from git ls-remote: %s", stdout)

    const branches: Branch[] = stdout.
        split("\n").
        filter(branch => branch.includes("refs/heads/")).
        map(branch => branch.replace("refs/heads/", "")).
        map(branch => {
            const parts = branch.split("\t") // ls-remote lists elements with the form "<commit_hash>\t<branch_name>"
            if (parts.length !== 2) {
                deblog("retrieved invalid branch in git ls-remote: %s", branch)
                return { hash: "", name: "" }
            }
            return { hash: parts[0], name: parts[1] }
        }).
        filter(branch => branch.name !== "" && branch.hash !== "") // filter unparseable branches
    return [...new Set(branches)]
}

/**
 * checkout executes a simple checkout of input branch.
 * 
 * The checkout is strict with remote state, meaning all local changes are removed.
 * 
 * @param branch the input branch to checkout.
 * @param cwd the current directory.
 * @param env all known environment variables.
 * 
 * @throws an error if the checkout cannot be done.
 */
export const checkout = async (branch: Branch, cwd?: string, env?: Record<string, string>) => {
    deblog("executing git checkout command with branch '%j'", branch)
    const { stderr } = await execa("git", ["checkout", "-B", branch.name, branch.hash], { cwd, env })
    if (stderr !== "") {
        deblog("received stderr text from git checkout with branch '%j': %s", branch, stderr)
    }
}

/**
 * current returns the current commit where the current branch is at.
 * 
 * @param cwd the current directory.
 * @param env all known environment variables.
 */
export const current = async(cwd?: string, env?: Record<string, string>) => {
    const { stdout, stderr } = await execa("git", ["log", "--reverse", "-1", "HEAD", "--stat"], { cwd, env })
    if (stderr !== "") {
        deblog("received stderr text from git rev-parse: %s", stderr)
    }
    deblog("received stdout text from git rev-parse: %s", stdout)
}

/**
 * fetch executes a simple fetch of input remote.
 * 
 * @param remote the remote to fetch branches from.
 * @param cwd the current directory.
 * @param env all known environment variables.
 * 
 * @throws an error if the fetch cannot be done.
 */
export const fetch = async (remote: string, cwd?: string, env?: Record<string, string>) => {
    deblog("executing git fetch command")
    const { stderr } = await execa("git", ["fetch", remote], { cwd, env })
    if (stderr !== "") {
        deblog("received stderr text from git fetch: %s", stderr)
    }
}

/**
 * merge executes a checkout of input 'to' branch, and merges input 'from' branch into 'to'.
 * 
 * If a merge commit must be done (by default --ff is used), then the merge commit is the input commit.
 * 
 * @param from the branch to merge in the current one.
 * @param commit the merge commit message if one is done.
 * @param cwd the current directory.
 * @param env all known environment variables.
 * 
 * @throws an error if the merge fails (in case of conflicts, etc.).
 */
export const merge = async (from: string, commit: string, cwd?: string, env?: Record<string, string>) => {
    try {
        deblog("executing git merge command with branch '%s'", from)
        const { stderr } = await execa("git", ["merge", `${from}`, "--ff", "-m", commit], { cwd, env })
        if (stderr !== "") {
            deblog("received stderr text from git merge --ff with branch '%s': %s", from, stderr)
        }
    } catch (error) {
        deblog("aborting git merge command with branch '%s': %O", from, error)
        const { stderr } = await execa("git", ["merge", "--abort"], { cwd, env })
        if (stderr !== "") {
            deblog("received stderr text when aborting git merge with branch '%s': %s", from, stderr)
        }
        throw error
    }
}

/**
 * push executes a simple git push to the input remote with the current checked out branch.
 * 
 * @param remote the remote to push changes to.
 * @param branch the branch to push local changes to.
 * @param dryRun if the push must only verify if all conditions are fine and not alter the remote state.
 * @param cwd the current directory.
 * @param env all known environment variables.
 * 
 * @throws an error if the push cannot be executed.
 */
export const push = async (remote: string, branch: string, dryRun?: boolean, cwd?: string, env?: Record<string, string>) => {
    const args = ["push", remote, `HEAD:${branch}`]
    if (dryRun) {
        args.push("--dry-run")
    }

    deblog("executing git push command with args '%o'", args)
    const { stderr } = await execa("git", args, { cwd, env })
    if (stderr !== "") {
        deblog("received stderr text from git push: %s", stderr)
    }
}
