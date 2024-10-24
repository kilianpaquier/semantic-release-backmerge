import { LastRelease, NextRelease } from "semantic-release"
import { Metadata, createPR } from "./pull-request"
import { checkout, fetch, ls, merge, push } from "./git"

import AggregateError from "aggregate-error"
import SemanticReleaseError from "@semantic-release/error"
import debug from "debug"
import parse from "git-url-parse"
import semver from "semver"

import { BackmergeConfig } from "./models/config"
import { authModificator } from "./auth-modificator"
import { template } from "lodash"

const deblog = debug("semantic-release-backmerge:git")

/**
 * Context is a subinterface of semantic-release Context (specifically VerifyConditionContext).
 */
export interface Context {
    branch: { name: string }
    cwd?: string
    env?: Record<string, string>
    lastRelease: LastRelease
    logger: {
        error(...data: any[]): void
        log(...data: any[]): void
        success(...data: any[]): void
        warn(...data: any[]): void
    }
    nextRelease: NextRelease
}

/**
 * getBranches returns the slice of branches that can be backmerged.
 * 
 * To retrieve them, it takes into account their existence in remote repository, their presence in input targets, 
 * and their semver version value related to the appropriate target (for instance, a branch v1.0 won't be returned if target.from is v1.1).
 * 
 * @param context with logger, released branch, current directory and environment.
 * @param config the semantic-release-backmerge plugin configuration.
 * 
 * @throws an error in case the input remote can't be fetched or the branches can be retrieved with git.
 * 
 * @returns the slice of branches where the context.branch.name must be backmerged into.
 */
export const getBranches = async (context: Context, config: BackmergeConfig) => {
    const releaseBranch = context.branch.name

    const appropriates = config.targets.filter(branch => releaseBranch.match(branch.from))
    if (appropriates.length === 0) {
        context.logger.log(`Current branch '${releaseBranch}' doesn't match any configured backmerge targets.`)
        return []
    }
    context.logger.log(`Current branch '${releaseBranch}' matches following configured backmerge targets: '${JSON.stringify(appropriates)}'. Performing backmerge.`)

    const url = parse(config.repositoryUrl)
    const authRemote = authModificator(url, config.platform, config.token)

    let branches: string[] = [] // eslint-disable-line no-useless-assignment
    try {
        // ensure at any time and any moment that the fetch'ed remote url is the same as there
        // https://github.com/semantic-release/git/blob/master/lib/prepare.js#L69
        // it's to ensure that the commit done during @semantic-release/git is backmerged alongside the other commits
        await fetch(authRemote, context.cwd, context.env)

        branches = await ls(config.repositoryUrl, context.cwd, context.env)
    } catch (error) {
        const msg = "Failed to fetch git remote or list all branches."
        context.logger.error(msg, error)
        throw new SemanticReleaseError(msg, "EFECTHLIST")
    }

    deblog("filtering branch to backmerge from '%j'", branches)
    const filteredBranches = branches.
        // don't keep the released branch
        filter(branch => releaseBranch !== branch).

        // don't keep branches that doesn't match 'to' regexp
        filter(branch => appropriates.map(target => target.to).find(target => branch.match(target))).

        // only keep upper version when it's a semver released branch
        // for instance v1 must not backmerge into anyone
        // for instance v1.5 must backmerge into v1.6, v1.7, etc.
        filter(branch => {
            const releaseMaintenance = semver.valid(semver.coerce(releaseBranch))
            const branchMaintenance = semver.valid(semver.coerce(branch))

            if (releaseMaintenance && branchMaintenance) {
                // don't keep branches of other major versions
                const nextMajor = semver.inc(releaseMaintenance, "major")
                const currentMajor = semver.coerce(semver.major(releaseMaintenance))!

                // don't keep any branches if the current branch is the major branch (like v1 or v1.x)
                if (semver.eq(releaseMaintenance, currentMajor)) {
                    return false
                }

                // don't merge into older versions
                if (semver.lt(branchMaintenance, releaseMaintenance)) {
                    deblog(`not backmerging into '${branch}' since semver version is before '${releaseBranch}'`)
                    return false
                }

                // don't merge minor versions into next majors versions
                if (semver.gte(branchMaintenance, nextMajor!)) {
                    deblog(`not backmerging into '${branch}' since semver major version is after '${releaseBranch}'`)
                    return false
                }
            }
            return true
        })
    if (filteredBranches.length === 0) {
        context.logger.log("No configured target is present in remote origin, no backmerge to be done.")
        return []
    }
    deblog(`retrieved branches present in remote origin: '${JSON.stringify(filteredBranches)}'`)
    return filteredBranches
}

/**
 * executeBackmerge runs a backmerge from context.branch.name into all input branches.
 * For that, it runs a fetch of input remote, then a checkout of the released branch (to ensure all commits are up to date) 
 * and then merge released branch into each branch from branches.
 * If a merge fails, it tries to create a pull request.
 * 
 * @param context input context with the logger, released branch, etc.
 * @param config the semantic-release-backmerge plugin configuration.
 * @param branches slice of branches to be backmerged with released branch commits.
 * 
 * @throws AggregateError of SemanticReleaseError(s) for each branch that couldn't be backmerged.
 */
export const executeBackmerge = async (context: Context, config: BackmergeConfig, branches: string[]) => {
    const releaseBranch = context.branch.name

    const url = parse(config.repositoryUrl)
    const authRemote = authModificator(url, config.platform, config.token)

    try {
        // ensure at any time and any moment that the fetch'ed remote url is the same as there
        // https://github.com/semantic-release/git/blob/master/lib/prepare.js#L69
        // it's to ensure that the commit done during @semantic-release/git is backmerged alongside the other commits
        await fetch(authRemote, context.cwd, context.env)

        // checkout to ensure released branch is up to date with last fetch'ed remote url
        await checkout(releaseBranch, context.cwd, context.env)
    } catch (error) {
        const msg = `Failed to fetch or checkout released branch '${releaseBranch}'.`
        context.logger.error(msg, error)
        throw new SemanticReleaseError(msg, "EFETCHCHECKOUT")
    }

    const errors: SemanticReleaseError[] = []
    for (const branch of branches) { // keep await in loop since git actions aren't thread safe
        const templateData = {
            from: releaseBranch,
            lastRelease: context.lastRelease,
            nextRelease: context.nextRelease,
            to: branch,
        }

        try {
            await merge(releaseBranch, branch, template(config.commit)(templateData), context.cwd, context.env)
            if (config.dryRun) {
                context.logger.log(`Running with --dry-run, push to '${branch}' will not update remote state.`)
            }
            await push(authRemote, branch, config.dryRun, context.cwd, context.env)
        } catch (error) {
            context.logger.error(`Failed to backmerge '${releaseBranch}' into '${branch}', opening pull request.`, error)

            if (config.dryRun) {
                context.logger.log(`Running with --dry-run, created pull request would have been from '${releaseBranch}' into '${branch}'.`)
                continue
            }

            try {
                const title = template(config.title)(templateData)
                const body: Metadata = {
                    body: context.nextRelease.notes ?? "",
                    from: releaseBranch,
                    name: url.name,
                    owner: url.owner,
                    title,
                    to: branch,
                }
                await createPR(config.baseUrl + config.apiPathPrefix, config.platform, config.token, body)
            } catch (prError) {
                const msg = `Failed to create pull request from '${releaseBranch}' to '${branch}'.`
                context.logger.error(msg, prError)
                errors.push(new SemanticReleaseError(msg, "EPULLREQUEST"))
            }
        }
    }
    if (errors.length > 0) {
        throw new AggregateError(errors)
    }
}