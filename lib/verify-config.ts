import { type BackmergeConfig, Platform, type Target, defaultCommit, defaultTitle } from "./models/config"
import { isArray, isBoolean, isString } from "lodash"

import type SemanticReleaseError from "@semantic-release/error"

import { getConfigError } from "./error"

const validateTargets = (targets: Partial<Target>[]): boolean => targets.filter((target) => !target.from || !target.to).length === 0
const validatePlatform = (stringPlatform: string): boolean => Boolean(Object.values(Platform).find(platform => platform.toString() === stringPlatform))

export const ensureDefault = (config: Partial<BackmergeConfig>): BackmergeConfig => ({
    ci: config.ci ?? false, // shouldn't happen since it comes from semantic-release config
    commit: config.commit ?? defaultCommit,
    debug: config.debug ?? false, // shouldn't happen since it comes from semantic-release config
    dryRun: config.dryRun ?? false, // shouldn't happen since it comes from semantic-release config
    platform: config.platform ?? Platform.GITHUB,
    repositoryUrl: config.repositoryUrl ?? "", // shouldn't happen since it comes from semantic-release config
    targets: config.targets ?? [],
    title: config.title ?? defaultTitle,
})

export interface VerifyConfigResult {
    config: BackmergeConfig
    errors: SemanticReleaseError[]
}

export const verifyConfig = (partialConfig: Partial<BackmergeConfig>): VerifyConfigResult => {
    const config = ensureDefault(partialConfig)
    const validators: { [k in keyof BackmergeConfig]: ((value: any) => boolean)[] } = {
        ci: [isBoolean], // shouldn't happen since it comes from semantic-release config
        commit: [isString],
        debug: [isBoolean], // shouldn't happen since it comes from semantic-release config
        dryRun: [isBoolean], // shouldn't happen since it comes from semantic-release config
        platform: [isString, validatePlatform],
        repositoryUrl: [isString], // shouldn't happen since it comes from semantic-release config
        targets: [isArray, validateTargets],
        title: [isString],
    }

    const errors = Object.entries(config).reduce((agg: SemanticReleaseError[], [option, value]) => {
        // @ts-expect-error option is a keyof BackmergeConfig
        for (const validation of validators[option]) {
            if (!validation(value)) {
                // @ts-expect-error option is a keyof BackmergeConfig
                return [...agg, getConfigError(option, value)]
            }
        }
        return agg
    }, [])
    return { config, errors }
}