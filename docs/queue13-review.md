# Queue 13: viewer memory and judge cold-start cleanup

## Part 1: spacing

README and eleven top-level docs now separate words, ports, counts and units. Independent review compared each changed file after removing whitespace: every non-whitespace character is unchanged. Code, URLs, paths, dimensions, technical tokens and game numbers retain their meaning. No teardown change was needed; 071ce4b already fixes the cold-clone failure.

The requested separate documentation commit follows independent review (the `/review` command is unavailable here). Node 22 tests and TypeScript pass in the current tree, and all four unchanged SPEC §5 balance matrices pass. Feature work is committed separately.
