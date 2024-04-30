import { defaultCommit, interpolate } from "../../lib/models/config"
import { describe, expect, test } from "bun:test"

describe("interpolate", () => {
    test("should not interpolate", () => {
        // Act
        const result = interpolate(defaultCommit, { key: "value" })

        // Assert
        expect(result).toEqual("chore(release): merge branch $from into $to [skip ci]")
    })

    test("should interpolate correctly", () => {
        // Act
        const result = interpolate(defaultCommit, { from: "hey", to: "oh" })

        // Assert
        expect(result).toEqual("chore(release): merge branch hey into oh [skip ci]")
    })
})