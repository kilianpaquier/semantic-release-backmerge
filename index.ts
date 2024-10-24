import { SuccessContext, VerifyConditionsContext } from 'semantic-release'
import { ensureDefault, verifyConfig } from "./lib/verify-config"
import { executeBackmerge, getBranches } from "./lib/backmerge"

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
export const verifyConditions = (globalConfig: BackmergeConfig, context: VerifyConditionsContext) => {
    const config = ensureDefault(globalConfig, context.env)

    // verifyConfig throws an exception in case the configuration is invalid
    // which will make semantic-release fail at verifyConditions step
    verifyConfig(config)
    return config
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
    const config = verifyConditions(globalConfig, context)

    try {
        const branches = await getBranches(context, config)
        await executeBackmerge(context, config, branches)
    } catch (error) {
        if (error instanceof AggregateError || error instanceof SemanticReleaseError) {
            throw error // don't wrap error in case it's already an acceptable error by semantic-release
        }

        const msg = "Failed to list or backmerge branches."
        context.logger.error(msg, error)
        throw new SemanticReleaseError(msg, "EBACKMERGE")
    }
}