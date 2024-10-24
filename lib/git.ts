import { execa } from "execa"

/**
 * ls returns the slice of all branches present in remote origin.
 * It removes 'refs/heads/' from the branches name.
 * 
 * @returns the slice of branches.
 * 
 * @throws an error if the git ls-remote cannot be done.
 */
export const ls = async (remote: string, cwd?: string, env?: Record<string, string>) => {
    const { stdout } = await execa("git", ["ls-remote", "--heads", remote], { cwd, env })
    const branches = stdout.
        split("\n").
        map(branch => branch.split("\t")).
        flat().
        filter(branch => branch.startsWith("refs/heads/")).
        map(branch => branch.replace("refs/heads/", ""))
    return [...new Set(branches)]
}

/**
 * checkout executes a simple checkout of input branch.
 * 
 * The checkout is strict with remote state, meaning all local changes are removed.
 * 
 * @param branch the input branch to checkout.
 * 
 * @throws an error if the checkout cannot be done.
 */
export const checkout = async (branch: string, cwd?: string, env?: Record<string, string>) => {
    await execa("git", ["checkout", "-B", branch], { cwd, env })
}

/**
 * fetch executes a simple fetch of input remote.
 * 
 * @param remote the remote to fetch branches from.
 * 
 * @throws an error if the fetch cannot be done.
 */
export const fetch = async (remote: string, cwd?: string, env?: Record<string, string>) => {
    await execa("git", ["fetch", remote], { cwd, env })
}

/**
 * merge executes a checkout of input 'to' branch, and merges input 'from' branch into 'to'.
 * 
 * If a merge commit must be done (by default --ff is used), then the merge commit is the input commit.
 * 
 * @param from the branch to merge into 'to'.
 * @param to the branch to merge changes from 'from'.
 * @param commit the merge commit message if one is done.
 * 
 * @throws an error if the merge fails (in case of conflicts, etc.).
 */
export const merge = async (from: string, to: string, commit: string, cwd?: string, env?: Record<string, string>) => {
    await checkout(to)

    try {
        await execa("git", ["merge", `${from}`, "--ff", "-m", commit], { cwd, env })
    } catch (error) {
        await execa("git", ["merge", "--abort"], { cwd, env })
        throw error
    }
}

/**
 * push executes a simple git push to the input remote with the current checked out branch.
 * 
 * @param remote the remote to push changes to.
 * @param dryRun if the push must only verify if all conditions are fine and not alter the remote state.
 * 
 * @throws an error if the push cannot be executed.
 */
export const push = async (remote: string, branch: string, dryRun?: boolean, cwd?: string, env?: Record<string, string>) => {
    const args = ["push", remote, `HEAD:${branch}`]
    if (dryRun) {
        args.push("--dry-run")
    }
    await execa("git", args, { cwd, env })
}
