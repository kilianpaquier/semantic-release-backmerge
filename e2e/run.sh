#!/bin/sh

bun run build || exit 1
cd e2e || exit 1

echo "Executing manual e2e test, please take care of verifying that everything is OK by yourself!"

# create a simple releaserc for semantic-release test
cat > .releaserc.yml <<EOF
plugins:
  - - "@semantic-release/commit-analyzer"
    - releaseRules:
      - { breaking: true, release: major }
      - { revert: true, release: patch }
      - { type: feat, release: minor }
      - { type: fix, release: patch }
      - { type: revert, release: patch }
      - { type: perf, release: patch }
      - { type: docs, release: patch }
      - { type: chore, release: patch }
      - { type: refactor, release: minor }

      - { scope: release, release: false }
      parserOpts:
        noteKeywords:
          - BREAKING CHANGE
          - BREAKING CHANGES
          - BREAKING
  - - "@kilianpaquier/semantic-release-backmerge"
    - dryRun: true
      targets:
        - { from: main, to: main }
        - { from: main, to: develop }
        - { from: main, to: staging }
        - { from: alpha, to: main }
        - { from: $(git rev-parse --abbrev-ref HEAD), to: $(git rev-parse --abbrev-ref HEAD) }
  - "@semantic-release/exec"
branches:
  - (master|main)
  - v+([0-9])?(.+([0-9]))
  - { name: next, prerelease: true }
  - { name: beta, prerelease: true }
  - { name: alpha, prerelease: true }
  - { name: staging, prerelease: beta }
  - { name: develop, prerelease: alpha }
  - { name: $(git rev-parse --abbrev-ref HEAD), prerelease: testing }
EOF

bun add -d @semantic-release/commit-analyzer @semantic-release/exec
bun link @kilianpaquier/semantic-release-backmerge

semantic-release --no-ci --dry-run --debug

rm .releaserc.yml
cd - || exit 1