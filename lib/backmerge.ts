import { Branch, authModificator, checkout, merge, push } from "./git"
import { LastRelease, NextRelease } from "semantic-release"

import AggregateError from "aggregate-error"
import SemanticReleaseError from "@semantic-release/error"
import debug from "debug"
import parse from "git-url-parse"
import semver from "semver"

import { BackmergeConfig, Target } from "./models/config"
import { PlatformHandler } from "./platform-handler"
import { template } from "lodash"

/**
 * prefix needs to be semantic-release:
 * @see https://github.com/semantic-release/semantic-release/blob/8940f32ccce455a01a4e32c101bb0f4a809ab00d/cli.js#L52
 */
const deblog = debug("semantic-release:backmerge")

/**
 * Logger is a simple interface to ensure eslint doesn't show invalid errors with semantic-release context logger.
 */
export interface Logger {
    error(...data: any[]): void
    log(...data: any[]): void
    warn(...data: any[]): void
}

/**
 * Context is a subinterface of semantic-release Context (specifically VerifyConditionContext).
 */
export interface Context {
    branch: { name: string }
    cwd?: string
    env: Record<string, string>
    lastRelease: LastRelease
    logger: Logger
    nextRelease: NextRelease
}

/**
 * filter removes from input branches the ones not appropriates for backmerging with the input released branch.
 *
 * Not being appropriate is not being configured in the input targets list
 * or being too old in case of maintenance branches.
 *
 * @param release the released branch.
 * @param targets the input targets configurations in semantic-release-backmerge.
 * @param branches the list of branches potentially backmergeable.
 *
 * @returns the list of branches to backmerge the released one into.
 */
export const filter = (release: Branch, targets: Target[], branches: Branch[]): Branch[] => {
    deblog("filtering branch to backmerge from '%j'", branches)
    const mergeables = branches.
        // don't keep the released branch
        filter(branch => branch.name !== release.name).

        // don't keep branches that doesn't match 'to' regexp
        filter(branch => targets.map(target => target.to).find(target => branch.name.match(target))).

        // only keep upper version when it's a semver released branch
        // for instance v1 must not backmerge into anyone
        // for instance v1.5 must only backmerge into v1.6, v1.7, etc.
        filter(branch => {
            const releaseMaintenance = semver.valid(semver.coerce(release.name))
            const branchMaintenance = semver.valid(semver.coerce(branch.name))

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
                    deblog(`not backmerging into '${branch.name}' since semver version is before '${release.name}'`)
                    return false
                }

                // don't merge minor versions into next majors versions
                if (semver.gte(branchMaintenance, nextMajor!)) {
                    deblog(`not backmerging into '${branch.name}' since semver major version is after '${release.name}'`)
                    return false
                }
            }
            return true
        })
    deblog(`retrieved branches present in remote origin: '${JSON.stringify(mergeables)}'`)
    return mergeables
}

/**
 * backmerge runs a backmerge from context.branch.name into all input branches.
 *
 * For that, it runs a fetch of input remote, then a checkout of the released branch (to ensure all commits are up to date)
 * and then merge released branch into each branch from branches.
 *
 * If a merge fails, it tries to create a pull request.
 *
 * @param context input context with the logger, released branch, etc.
 * @param config the semantic-release-backmerge plugin configuration.
 * @param handler the interface to handle current git platform API calls.
 * @param mergeables slice of branches to be backmerged with released branch commits.
 *
 * @throws AggregateError of SemanticReleaseError(s) for each branch that couldn't be backmerged.
 */
export const backmerge = async (context: Context, config: BackmergeConfig, handler: PlatformHandler, release: Branch, mergeables: Branch[]) => {
    const url = parse(config.repositoryUrl)
    const authRemote = authModificator(url, handler.gitUser(), config.token)

    const errors: SemanticReleaseError[] = []
    for (const branch of mergeables) { // keep await in loop since git actions aren't thread safe
        const templateData = {
            from: release.name,
            lastRelease: context.lastRelease,
            nextRelease: context.nextRelease,
            to: branch.name,
        }

        // try to merge with git the released branch into the current loop branch
        try {
            await checkout(branch)
            await merge(release.name, template(config.commit)(templateData), context.cwd, context.env)
            if (config.dryRun) {
                context.logger.log(`Running with --dry-run, push to '${branch.name}' will not update remote state.`)
            }
            await push(authRemote, branch.name, config.dryRun, context.cwd, context.env)
            continue // backmerge with git successful, skip backmerge with pull request
        } catch (error) {
            context.logger.error(`Failed to backmerge '${release.name}' into '${branch.name}', opening pull request.`, error)
        }

        // in case of merge error with git and dry run, skip pull request check or creation
        if (config.dryRun) {
            context.logger.log(`Running with --dry-run, created pull request would have been from '${release.name}' into '${branch.name}'.`)
            continue
        }

        // in case of merge error with git, create a pull request with the platform handler
        try {
            if (config.checkHasPull) { // don't check if a pull request already exists if disabled
                const exists = await handler.hasPull(url.owner, url.name, release.name, branch.name)
                if (exists) {
                    context.logger.log(`A pull request already exists between '${release.name}' and '${branch.name}'. Not creating another.`)
                    continue
                }
            }

            const title = template(config.title)(templateData)
            await handler.createPull(url.owner, url.name, {
                body: context.nextRelease.notes ?? "",
                from: release.name,
                title,
                to: branch.name
            })
        } catch (error) {
            errors.push(new SemanticReleaseError(`Failed to create pull request from '${release.name}' to '${branch.name}'.`, "EPULLREQUEST", String(error)))
        }
    }
    if (errors.length > 0) {
        throw new AggregateError(errors)
    }
}
