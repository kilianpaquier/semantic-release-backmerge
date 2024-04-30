import { type SuccessContext, type VerifyConditionsContext } from 'semantic-release'

import AggregateError from "aggregate-error"

import { type BackmergeConfig } from "./lib/models/config"
import { backmerge } from "./lib/backmerge"
import { repositoryInfo } from "./lib/repository-info"
import { verifyConfig } from "./lib/verify-config"

// eslint-disable-next-line @typescript-eslint/require-await
export const verifyConditions = async (partialConfig: Partial<BackmergeConfig>, context: VerifyConditionsContext) => {  
    const verifyResult = verifyConfig(partialConfig)
    if (verifyResult.errors.length > 0) {
        throw new AggregateError(verifyResult.errors)
    }

    const repositoryResult = repositoryInfo(context, verifyResult.config)
    if (repositoryResult.errors.length > 0) {
        throw new AggregateError(repositoryResult.errors)
    }

    if (verifyResult.config.debug) {
        context.logger.log(`Plugin configuration is ${JSON.stringify(verifyResult.config)}.`)
    }
}

export const success = async (partialConfig: Partial<BackmergeConfig>, context: SuccessContext) => {    
    const verifyResult = verifyConfig(partialConfig)
    if (verifyResult.errors.length > 0) {
        throw new AggregateError(verifyResult.errors)
    }

    const repositoryResult = repositoryInfo(context, verifyResult.config)
    if (repositoryResult.errors.length > 0) {
        throw new AggregateError(repositoryResult.errors)
    }

    if (verifyResult.config.debug) {
        context.logger.log(`Plugin configuration is ${JSON.stringify(verifyResult.config)}.`)
    }

    const errors = await backmerge(context, verifyResult.config, repositoryResult.info!)
    if (errors.length > 0) {
        throw new AggregateError(errors)
    }
}