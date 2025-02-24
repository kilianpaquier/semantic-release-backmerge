import { BackmergeConfig, Platform, Target, defaultCommit, defaultTitle } from "./models/config"
import { isArray, isBoolean, isString } from "lodash"

import AggregateError from "aggregate-error"
import SemanticReleaseError from "@semantic-release/error"

import { getConfigError } from "./error"
import { token } from "./platform-handler"

/**
 * stringNotEmpty validates that an input string is not empty.
 *
 * @param value the string to validate.
 *
 * @returns true if the input is not empty.
 */
const stringNotEmpty = (value: string) => value !== ""

/**
 * validTargets validates an input slice of targets (meaning both from and to fields are present)
 *
 * @param targets the slice of targets to validate
 *
 * @returns true if all targets are valid.
 */
const validTargetsArray = (targets: Partial<Target>[]): boolean => targets.
    filter(target =>
        typeof target.from === "string" && stringNotEmpty(target.from)
        && typeof target.to === "string" && stringNotEmpty(target.to)
    ).length === targets.length

/**
 * validPlatform validates an input string platform.
 *
 * @param input the platform to validate.
 *
 * @returns true if the input platform is valid.
 */
const validPlatform = (input: Platform): boolean => Boolean(Object.values(Platform).find(platform => input === platform))

/**
 * ensureDefaults takes as input a partial backmerge configuration, alongside environment variables
 * and ensure all its fields are valued with the default value or with the input value.
 *
 * @param config the partial input configuration.
 * @param env the environment variables.
 *
 * @returns the full configuration with default values if necessary.
 */
export const ensureDefault = (config: Partial<BackmergeConfig>, env: Record<string, string>): BackmergeConfig => ({
    apiPathPrefix: config.apiPathPrefix ?? "",
    baseUrl: config.baseUrl ?? "",
    checkHasPull: config.checkHasPull ?? true,
    commit: config.commit ?? defaultCommit,
    dryRun: config.dryRun ?? false, // shouldn't happen since it comes from semantic-release config
    platform: config.platform ?? Platform.NULL,
    repositoryUrl: config.repositoryUrl ?? "",
    targets: config.targets ?? [],
    title: config.title ?? defaultTitle,
    token: token(env),
})

/**
 * verifyConfig validates an input full BackmergeConfig.
 *
 * @param config the configuration to validate.
 */
export const verifyConfig = (config: BackmergeConfig): void => {
    const validators: { [k in keyof BackmergeConfig]: ((value: any) => boolean)[] } = {
        apiPathPrefix: [isString],
        baseUrl: [isString],
        checkHasPull: [isBoolean],
        commit: [isString, stringNotEmpty],
        dryRun: [isBoolean], // shouldn't happen since it comes from semantic-release config
        platform: [validPlatform],
        repositoryUrl: [isString, stringNotEmpty], // shouldn't happen since it comes from semantic-release config
        targets: [isArray, validTargetsArray],
        title: [isString, stringNotEmpty],
        token: [isString, stringNotEmpty],
    }

    const errors = Object.entries(config).reduce((agg: SemanticReleaseError[], [option, value]) => {
        // @ts-expect-error option is a keyof BackmergeConfig
        for (const validation of validators[option]) {
            if (!validation(value)) { // eslint-disable-line @typescript-eslint/no-unsafe-call
                // @ts-expect-error option is a keyof BackmergeConfig
                return [...agg, getConfigError(option, value)]
            }
        }
        return agg
    }, [])
    if (errors.length > 0) {
        throw new AggregateError(errors)
    }
}
