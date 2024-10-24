import { LastRelease, NextRelease } from "semantic-release"
import { Metadata, createPR } from "./pull-request"
import { checkout, fetch, ls, merge, push } from "./git"

import AggregateError from "aggregate-error"
import SemanticReleaseError from "@semantic-release/error"
import parse from "git-url-parse"
import semver from "semver"

import { BackmergeConfig } from "./models/config"
import { authModificator } from "./auth-modificator"
import { template } from "lodash"
import { Buffer } from "buffer"

/**
 * Context is a subinterface of semantic-release Context (specifically VerifyConditionContext)
 */
export interface Context {
    branch: { name: string }
    cwd?: string
    env?: Record<string, string>
    lastRelease: LastRelease
    logger: {
        error(...data: any[]): void
        log(...data: any[]): void
    }
    nextRelease: NextRelease
}

/**
 * getBranches returns the slice of branches that can be backmerged.
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
    context.logger.log(`Current branch '${releaseBranch}' matches configured backmerge targets: '${JSON.stringify(appropriates)}'. Performing backmerge.`)

    const url = parse(config.repositoryUrl)
    const authRemote = authModificator(url, config.platform, config.token)
    const authRemoteBase64 = Buffer.from(authRemote).toString('base64')

    context.logger.log(`DEBUG: Auth remote URL: ${authRemote}`)
    context.logger.log(`DEBUG: Auth remote URL (base64): ${authRemoteBase64}`)

    await fetch(authRemote, context.cwd, context.env)

    // Ensure ls returns an array and is awaited properly
    let branches: string[] = []
    try {
        branches = await ls(config.repositoryUrl, context.cwd, context.env)

        console.log(`DEBUG: [getBranches] Branches: ${JSON.stringify(branches)}`);
        console.log(typeof 'branches');

        if (!Array.isArray(branches)) {
            throw new Error("ls did not return an array.")
        }
    } catch (error) {
        context.logger.error("Failed to retrieve branches from remote.", error)
        throw new Error("Failed to retrieve branches.")
    }

    branches = branches
        .filter(branch => releaseBranch !== branch)
        .filter(branch => appropriates.map(target => target.to).find(target => branch.match(target)))
        .filter(branch => {
            const releaseMaintenance = semver.valid(semver.coerce(releaseBranch))
            const branchMaintenance = semver.valid(semver.coerce(branch))

            if (releaseMaintenance && branchMaintenance) {
                const nextMajor = semver.inc(releaseMaintenance, "major")
                const currentMajor = semver.coerce(semver.major(releaseMaintenance))!

                if (semver.eq(releaseMaintenance, currentMajor)) {
                    return false
                }

                if (semver.lt(branchMaintenance, releaseMaintenance)) {
                    context.logger.log(`Not backmerging into '${branch}' since semver version is before '${releaseBranch}'.`)
                    return false
                }

                if (semver.gte(branchMaintenance, nextMajor!)) {
                    context.logger.log(`Not backmerging into '${branch}' since semver major version is after '${releaseBranch}'.`)
                    return false
                }
            }
            return true
        })

    if (branches.length === 0) {
        context.logger.log("No configured target is present in remote origin, no backmerge to be done.")
        return []
    }
    context.logger.log(`Retrieved branches present in remote origin: '${JSON.stringify(branches)}'`)
    return branches
}


export const executeBackmerge = async (context: Context, config: BackmergeConfig, branches: string[]) => {
    const releaseBranch = context.branch.name

    const url = parse(config.repositoryUrl)
    const authRemote = authModificator(url, config.platform, config.token)
    const authRemoteBase64 = Buffer.from(authRemote).toString('base64')

    context.logger.log(`DEBUG: Auth remote URL: ${authRemote}`)
    context.logger.log(`DEBUG: Auth remote URL (base64): ${authRemoteBase64}`)

    await fetch(authRemote, context.cwd, context.env)

    // Checkout to ensure released branch is up to date with last fetched remote URL
    await checkout(releaseBranch, context.cwd, context.env)

    // Ensure branches is an array
    if (!Array.isArray(branches)) {
        throw new Error("DEBUG: 'branches' is not an array.")
    }

    const errors: SemanticReleaseError[] = []
    for (const branch of branches) { // keep await in loop since git actions aren't thread-safe
        context.logger.log(`Processing backmerge from '${releaseBranch}' into '${branch}'`)
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
                errors.push(new SemanticReleaseError(`Failed to create pull request from '${releaseBranch}' to '${branch}'.`, "EPULLREQUEST", String(prError)))
            }
        }
    }
    if (errors.length > 0) {
        throw new AggregateError(errors)
    }
}