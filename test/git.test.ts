import { describe, expect, test } from "bun:test"

import { ls } from "../lib/git.ts"

describe("ls", () => {
    test("should return a list of branches", () => {
        // Act
        const branches = ls("origin") // a small test to ensure execa works

        // Assert
        expect(branches).toContain("main")
    })
})