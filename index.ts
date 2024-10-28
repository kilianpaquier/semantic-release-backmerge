import { Branch, checkout, fetch, ls, version } from "./lib/git"
import { Logger, backmerge, filter } from "./lib/backmerge"
import { PlatformHandler, newPlatformHandler } from "./lib/platform-handler"
import { SuccessContext, VerifyConditionsContext } from 'semantic-release'
import { ensureDefault, verifyConfig } from "./lib/verify-config"

import SemanticReleaseError from "@semantic-release/error"
import debug from "debug"

import { BackmergeConfig } from "./lib/models/config"

/**
 * prefix needs to be semantic-release:
 * @see https://github.com/semantic-release/semantic-release/blob/8940f32ccce455a01a4e32c101bb0f4a809ab00d/cli.js#L52
 */
const deblog = debug("semantic-release:backmerge")

/**
 * verifyConditions is the exported function for semantic-release for verifyConditions lifecycle.
 * 
 * It verifies the input plugin configuration and throws an error if it's not valid.
 * 
 * @param globalConfig the semantic-release-backmerge plugin configuration.
 * @param context the semantic-release context.
 * 
 * @returns the validated configuration.
 * 
 * @throws an exception in case the input semantic-release-backmerge configuration is invalid 
 * or missing inputs like tokens or URLs, etc.
 */
export const verifyConditions = async (globalConfig: BackmergeConfig, context: VerifyConditionsContext): Promise<[BackmergeConfig, PlatformHandler]> => {
    try {
        const stdout = await version(context.cwd, context.env);
        (context.logger as Logger).log(`Using git version: '${stdout}'.`)
    } catch (error) {
        throw new SemanticReleaseError("Failed to ensure git is spawnable by backmerge process.", "EGITSPAWN", String(error))
    }

    const config = ensureDefault(globalConfig, context.env)

    // verifyConfig throws an exception in case the configuration is invalid
    // which will make semantic-release fail at verifyConditions step
    verifyConfig(config)

    // newPlatformHandler will throw an exception in case the appropriate platform implementation cannot be found
    // which will make semantic-release fail at verifyConditions step
    return [config, newPlatformHandler(config.platform, config.baseUrl, config.apiPathPrefix, config.token, context.env)]
}

/**
 * success is the function for semantic-release success lifecycle.
 * 
 * It executes the backmerge to all appropriate branches as the release was successful.
 * 
 * @param globalConfig the semantic-release-backmerge plugin configuration.
 * @param context the semantic-release context.
 */
export const success = async (globalConfig: BackmergeConfig, context: SuccessContext) => {
    const logger = context.logger as Logger
    const [config, handler] = await verifyConditions(globalConfig, context)

    // filter targets to find if the current released branch needs to be backmerged into others
    const targets = config.targets.filter(branch => context.branch.name.match(branch.from))
    if (targets.length === 0) {
        logger.log(`Current branch '${context.branch.name}' doesn't match any configured backmerge targets.`)
        return
    }
    logger.log(`Current branch '${context.branch.name}' matches following configured backmerge targets: '${JSON.stringify(targets)}'.`)

    // fetch remote and retrieve all remote branches
    const branches: Branch[] = []
    try {
        // ensure at any time and any moment that the fetch'ed remote url is the same as there
        // https://github.com/semantic-release/git/blob/master/lib/prepare.js#L69
        // it's to ensure that the commit done during @semantic-release/git is backmerged alongside the other commits
        await fetch(config.repositoryUrl, context.cwd, context.env)
        branches.push(...await ls(config.repositoryUrl, context.cwd, context.env))
    } catch (error) {
        throw new SemanticReleaseError("Failed to fetch git remote or list all branches.", "EFECTHLISTREMOTE", String(error))
    }

    // retrieve current released branch informations
    const release = branches.find(branch => branch.name === context.branch.name)
    if (!release) {
        deblog("released branch is not present in branches fetched from git '%j'", branches)
        throw new SemanticReleaseError("Failed to retrieve released branch last commit hash. This shouldn't happen.", "ELISTREMOTE")
    }

    // filter targets branch with the known remote branches 
    // and with different business rules like vX.X, etc.
    const mergeables = filter(release, targets, branches)
    if (mergeables.length === 0) { // released branch is contained in branches
        logger.log("No configured target is present in remote origin, no backmerge to be done.")
        return // stop treatment since there's no branch to backmerge
    }

    // checkout to ensure released branch is up to date with last fetch'ed remote url
    try {
        await checkout(release, context.cwd, context.env)
    } catch (error) {
        throw new SemanticReleaseError(`Failed to checkout released branch '${release.name}'.`, "EFETCHCHECKOUT", String(error))
    }

    logger.log(`Performing backmerge of '${release.name}' on following branches: '${JSON.stringify(mergeables)}'.`)
    await backmerge(context, config, handler, release, mergeables)
}