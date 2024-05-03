import { SuccessContext, VerifyConditionsContext } from 'semantic-release'
import { ensureDefault, verifyConfig } from "./lib/verify-config"
import { executeBackmerge, getBranches } from "./lib/backmerge"
import parse, { GitUrl } from "git-url-parse"

import SemanticReleaseError from "@semantic-release/error"

import { BackmergeConfig } from "./lib/models/config"

/**
 * Config represents an extension of BackmergeConfig with additional fields not to validate 
 * and given as input by semantic-release directly.
 */
interface Config extends BackmergeConfig {
    repositoryUrl: string
}

/**
 * verifyConditions is the exported function for semantic-release for verifyConditions lifecycle.
 * It verifies the input plugin configuration and throws an error if it's not valid.
 * 
 * @param globalConfig the semantic-release-backmerge plugin configuration.
 * @param context the semantic-release context.
 * 
 * @returns both the parsed repository url as GitUrl and validated configuration.
 */
export const verifyConditions = (globalConfig: Config, context: VerifyConditionsContext): [Config, parse.GitUrl] => {
    const parseURL = (): GitUrl => {
        try {
            return parse(globalConfig.repositoryUrl)
        } catch (error) {
            throw new SemanticReleaseError("Failed to parse repository url", "EINVALIDREPOSITORYURL", String(error))
        }
    }
    const info = parseURL()

    const config = ensureDefault(globalConfig, context.env)
    verifyConfig(config)

    return [{ ...config, repositoryUrl: globalConfig.repositoryUrl }, info]
}

/**
 * success is the function for semantic-release success lifecycle.
 * It executes the backmerge to all appropriate branches as the release was successfull.
 * 
 * @param globalConfig the semantic-release-backmerge plugin configuration (revalidated).
 * @param context the semantic-release context.
 */
export const success = async (globalConfig: Config, context: SuccessContext) => {
    const [config, info] = verifyConditions(globalConfig, context)
    
    try {
        const branches = await getBranches(context, config.repositoryUrl, config.targets)
        await executeBackmerge(context, config, info, branches)
    } catch (error) {
        throw new SemanticReleaseError("Failed to backmerge branches.", "EBACKMERGE", String(error))
    }
}