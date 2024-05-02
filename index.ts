import { type BackmergeConfig, type RepositoryInfo } from "./lib/models/config"
import { type SuccessContext, type VerifyConditionsContext } from 'semantic-release'
import { ensureDefault, verifyConfig } from "./lib/verify-config"

import AggregateError from "aggregate-error"

import { backmerge } from "./lib/backmerge"
import { repositoryInfo } from "./lib/repository-info"

// eslint-disable-next-line @typescript-eslint/require-await
export const verifyConditions = async (partialConfig: Partial<BackmergeConfig>, context: VerifyConditionsContext): Promise<[BackmergeConfig, RepositoryInfo]> => {  
    const config = ensureDefault(partialConfig)
    
    const configErrors = verifyConfig(config)
    if (configErrors.length > 0) {
        throw new AggregateError(configErrors)
    }

    const [info, infoErrors] = repositoryInfo(config, context.env)
    if (infoErrors.length > 0) {
        throw new AggregateError(infoErrors)
    }
    return [config, info!]
}

export const success = async (partialConfig: Partial<BackmergeConfig>, context: SuccessContext) => {    
    const [config, info] = await verifyConditions(partialConfig, context)

    const errors = await backmerge(context, config, info)
    if (errors.length > 0) {
        throw new AggregateError(errors)
    }
}