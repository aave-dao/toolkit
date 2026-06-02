# Aave Toolkit

A TypeScript monorepo providing tools and utilities for interacting with Aave governance and DeFi protocols.

## Packages

- **[@aave-dao/toolbox](./packages/toolbox)** - Core library with utilities for Aave ecosystem development, including ABIs, address book integration, governance operations, and testing tools
- **[@aave-dao/cli](./packages/cli)** - Command-line interface for interacting with Aave protocols and governance

## Apps

- **[docs](./apps/docs)** - Centralized documentation for Aave projects

## Getting Started

This monorepo uses:

- [pnpm](https://pnpm.io/) for package management
- [Turbo](https://turbo.build/) for build orchestration
- [Changesets](https://github.com/changesets/changesets) for versioning and publishing

### Prerequisites

- Node.js >=22
- pnpm 10.5.2+

### Installation

```bash
pnpm install
```

### Development

```bash
# Run all packages in dev mode
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint
```

## Publishing

```bash
# Create a changeset
pnpm changeset

# Version packages
pnpm version-packages

# Publish to npm
pnpm release
```

## License

MIT
