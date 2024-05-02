import { gitBranches, mergeBranch } from "./git"

import type SemanticReleaseError from "@semantic-release/error"
import semver from "semver"

import { type BackmergeConfig } from "./models/config"
import { type GitUrl } from "git-url-parse"
import { type VerifyConditionsContext } from "semantic-release"

export const backmerge = async (context: Partial<VerifyConditionsContext>, config: BackmergeConfig, info: GitUrl): Promise<SemanticReleaseError[]> => {
    const releaseBranch = context.branch!.name

    const targets = config.targets.filter(branch => releaseBranch.match(branch.from))
    if (targets.length === 0) {
        context.logger?.log(`Current branch '${releaseBranch}' doesn't match any configured backmerge targets.`)
        return []
    }
    context.logger?.log(`Current branch '${releaseBranch}' matches following configured backmerge targets: '${JSON.stringify(targets)}'. Performing backmerge.`)

    const branches = (await gitBranches(context)).
        filter(branch => targets.map(target => target.to).find(target => branch.match(target))).
        filter(branch => {
            const releaseMaintenance = semver.valid(semver.coerce(releaseBranch))
            const branchMaintenance = semver.valid(semver.coerce(branch))

            if (releaseMaintenance && branchMaintenance) {
                const major = semver.inc(releaseMaintenance, "major") // don't keep branches of other major versions

                // don't merge into older versions
                if (semver.lt(branchMaintenance, releaseMaintenance)) {
                    context.logger?.log(`Not backmerging into '${branch}' since the semver version is before '${releaseBranch}'.`)
                    return false
                }

                // don't merge minor versions into next majors versions
                if (semver.gte(branchMaintenance, major!)) {
                    context.logger?.log(`Not backmerging into '${branch}' since the semver major version is after '${releaseBranch}'.`)
                    return false
                }
            }
            return true
        })
    if (branches.length === 0) {
        context.logger?.log("No configured target is present in remote origin, no backmerge to be done.")
        return []
    }
    context.logger?.log(`Retrieved following branches present in remote origin: '${JSON.stringify(branches)}'`)

    const errors: SemanticReleaseError[] = []
    for (const branch of branches) {
        const error = await mergeBranch(context, config, info, releaseBranch, branch)
        if (error) {
            errors.push(error)
        }
    }
    return errors
}