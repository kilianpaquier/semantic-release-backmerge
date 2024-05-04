import { Options, execa } from "execa"

/**
 * Git is the class for all related git actions.
 */
export class Git {
    readonly cwd?: string
    readonly env?: Record<string, string>

    /**
     * @param cwd is the directory to execute git actions in.
     * @param env is all the environment variables to allow access during git actions.
     */
    constructor(cwd?: string, env?: Record<string, string>) {
        this.cwd = cwd
        this.env = env
    }

    /**
     * exec runs an execa git command with input args and options.
     * 
     * @param args input arguments like with git command to run its options.
     * @param options cmd options like environment variables, current directory, etc. 
     * By default cwd and env are already valued with current Git instance.
     * 
     * @returns the execa child process execution result.
     * 
     * @throws an error if execa command fails.
     */
    public async exec(args?: string[], options?: Options) {
        return await execa("git", args, {
            ...options,
            cwd: this.cwd,
            env: this.env,
        })
    }

    /**
     * ls returns the slice of all branches present in remote origin. 
     * It removes 'refs/heads/' from the branches name.
     * 
     * @returns the slice of branches.
     * 
     * @throws an error is the git ls-remote cannot be done.
     */
    public async ls(remote: string) {
        const response = await this.exec(["ls-remote", "--heads", remote])
        const branches = response.stdout.toString().
            split("\n").
            map(branch => branch.split("\t")).
            flat().
            filter(branch => branch.startsWith("refs/heads/")).
            map(branch => branch.replace("refs/heads/", ""))
        return [...new Set(branches)]
    }

    /**
     * checkout executes a simple checkout of input branch. 
     * The checkout is strict with remote state, meaning all local changes are removed.
     * 
     * @param branch the input branch to checkout.
     * 
     * @throws an error if the checkout cannot be done.
     */
    public async checkout(branch: string) {
        await this.exec(["checkout", "-B", branch])
    }

    /**
     * fetch executes a simple fetch of input remote.
     * 
     * @param remote the remote to fetch branches from.
     * 
     * @throws an error if the fetch cannot be done.
     */
    public async fetch(remote: string) {
        await this.exec(["fetch", remote])
    }

    /**
     * @see https://github.com/saitho/semantic-release-backmerge/blob/master/src/helpers/git.ts#L122
     */
    public async fetchAllRemotes() {
        await this.exec(["config", "remote.origin.fetch", "+refs/heads/*:refs/remotes/origin/*"])
    }

    /**
     * merge executes a checkout of input 'to' branch, and merges input 'from' branch into 'to'.
     * If a merge commit must be done (by default --ff is used), then the merge commit is the input commit.
     * 
     * @param from the branch to merge into 'to'.
     * @param to the branch to merge changes from 'from'.
     * @param commit the merge commit message if one is done.
     * 
     * @throws an error if the merge fails (in case of conflicts, etc.).
     */
    public async merge(from: string, to: string, commit: string) {
        await this.checkout(to)

        try {
            await this.exec(["merge", `${from}`, "--ff", "-m", commit])
        } catch (error) {
            await this.exec(["merge", "--abort"])
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
    public async push(remote: string, branch: string, dryRun?: boolean) {
        const push = ["push", remote, `HEAD:${branch}`]
        if (dryRun) {
            push.push("--dry-run")
        }
        await this.exec(push)
    }
}
