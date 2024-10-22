import { Context, executeBackmerge, getBranches } from "./lib/backmerge"
import { PlatformHandler, newPlatformHandler } from "./lib/platform-handler"
import { SuccessContext, VerifyConditionsContext } from 'semantic-release'
import { ensureDefault, verifyConfig } from "./lib/verify-config"

import SemanticReleaseError from "@semantic-release/error"

import { BackmergeConfig } from "./lib/models/config"

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
export const verifyConditions = (globalConfig: BackmergeConfig, context: VerifyConditionsContext): [BackmergeConfig, PlatformHandler] => {
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
    const [config, platformHandler] = verifyConditions(globalConfig, context)

    try {
        const branches = await getBranches(context, config, platformHandler)
        await executeBackmerge(context, config, platformHandler, branches)
    } catch (error) {
        if (error instanceof AggregateError || error instanceof SemanticReleaseError) {
            throw error // don't wrap error in case it's already an acceptable error by semantic-release
        }

        const msg = "Failed to list or backmerge branches.";
        (context as Context).logger.error(msg, error)
        throw new SemanticReleaseError(msg, "EBACKMERGE")
    }
}