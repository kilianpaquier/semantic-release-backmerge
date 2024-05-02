import { type SuccessContext, type VerifyConditionsContext } from 'semantic-release'
import { ensureDefault, verifyConfig } from "./lib/verify-config"
import gitUrlParse, { type GitUrl } from "git-url-parse"

import AggregateError from "aggregate-error"

import { type BackmergeConfig } from "./lib/models/config"
import SemanticReleaseError from "@semantic-release/error"
import { backmerge } from "./lib/backmerge"

interface Config extends Partial<BackmergeConfig> {
    repositoryUrl: string
}

// eslint-disable-next-line @typescript-eslint/require-await
export const verifyConditions = async (globalConfig: Config, context: VerifyConditionsContext): Promise<[BackmergeConfig, gitUrlParse.GitUrl]> => {
    const parseURL = (): [GitUrl | undefined, SemanticReleaseError | undefined] => {
        try {
            return [gitUrlParse(globalConfig.repositoryUrl), undefined] // eslint-disable-line no-undefined
        } catch (error) {
            return [, new SemanticReleaseError("Failed to parse repository url", "EINVALIDREPOSITORYURL", String(error))]
        }
    }

    const [info, error] = parseURL()
    if (error) {
        throw error
    }

    const config = ensureDefault(globalConfig, context.env)
    const errors = verifyConfig(config)
    if (errors.length > 0) {
        throw new AggregateError(errors)
    }
    return [config, info!]
}

export const success = async (globalConfig: Config, context: SuccessContext) => {
    const [config, info] = await verifyConditions(globalConfig, context)

    const errors = await backmerge(context, config, info)
    if (errors.length > 0) {
        throw new AggregateError(errors)
    }
}