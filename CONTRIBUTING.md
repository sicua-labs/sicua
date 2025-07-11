# Contributing to Sicua

Thank you for your interest in contributing to Sicua! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Submitting Changes](#submitting-changes)
- [Code Style](#code-style)
- [Testing](#testing)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

This project adheres to a code of conduct that we expect all contributors to follow:

- Be respectful of differing viewpoints and experiences
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:

   ```bash
   git clone https://github.com/sicualabs/sicua.git
   cd sicua
   ```

3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/sicualabs/sicua.git
   ```

## Development Setup

1. **Install dependencies** using pnpm:

   ```bash
   pnpm install
   ```

2. **Build the project**:

   ```bash
   pnpm run build
   ```

3. **Link the package globally**:

   ```bash
   pnpm link --global
   ```

4. **Link the package to your targeted project**:

   ```bash
   pnpm link sicua
   ```

5. **Run the package from the terminal**:
   ```bash
   sicua
   ```

## Making Changes

### Branch Naming

Use descriptive branch names:

- `feature/add-new-analysis-type`
- `fix/circular-dependency-detection`
- `docs/update-readme`
- `refactor/improve-performance`

### Commit Messages

Follow conventional commit format:

```
type(scope): brief description

Longer description if needed

- List any breaking changes
- Reference issues: Fixes #123
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```
feat(analysis): add maintainability index calculation
fix(circular): resolve false positive in self-references
docs(readme): add usage examples for CLI commands
```

## Submitting Changes

1. **Create a feature branch**:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and commit them with clear messages

3. **Update documentation** if needed

4. **Ensure tests pass**:

   ```bash
   pnpm run lint
   pnpm run build
   ```

5. **Push to your fork**:

   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** with:
   - Clear title and description
   - Reference to related issues
   - Screenshots if applicable
   - Test instructions

## Code Style

### TypeScript Guidelines

- Use **strict TypeScript** - no `any` types
- Prefer **interfaces** over type aliases for object shapes
- Use **explicit return types** for functions
- Follow **naming conventions**:
  - `camelCase` for variables and functions
  - `PascalCase` for classes and interfaces
  - `UPPER_CASE` for constants
  - Prefix interfaces with `I` only when needed for disambiguation

### Code Organization

- Keep functions **focused and small**
- Use **meaningful variable names**
- Add **JSDoc comments** for public APIs
- Group related functionality in modules
- Prefer **composition over inheritance**

### File Structure

```
src/
├── analyzers/          # Core analysis functionality
├── constants/          # Configuration constants
├── core/               # Cache manager, config manager, progress tracker, main project analyzer
├── generators/         # Graph generators
├── parsers/            # Parsers and scanners
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── cli.ts              # CLI entry point
└── index.ts            # Main package entry point
```

## Testing

### Running Tests

```bash
# Lint the code
pnpm run lint

# Build and check for errors
pnpm run build
```

### Adding Tests

When adding new features:

1. **Test edge cases** thoroughly
2. **Verify error handling** works correctly
3. **Test with different project structures**
4. **Ensure backwards compatibility**

### Test Projects

Test your changes against different project types:

- Next.js App Router projects
- Next.js Pages Router projects
- Create React App projects
- Custom React setups
- TypeScript and JavaScript projects

## Reporting Issues

### Bug Reports

Include:

- **Clear description** of the problem
- **Steps to reproduce** the issue
- **Expected vs actual behavior**
- **Environment details** (Node.js version, OS, project type)
- **Sample code or project** if possible

### Feature Requests

Include:

- **Use case description** - why is this needed?
- **Proposed solution** - how should it work?
- **Alternative solutions** considered
- **Implementation details** if you have ideas

### Issue Labels

- `bug` - Something isn't working
- `enhancement` - New feature or improvement
- `documentation` - Documentation needs
- `good first issue` - Good for newcomers
- `help wanted` - Need community help
- `question` - General questions

## Development Tips

### Performance Considerations

- **Profile before optimizing** - measure actual bottlenecks
- **Consider large codebases** - test with projects that have 1000+ files
- **Memory usage** - watch for memory leaks in long-running analysis
- **Incremental analysis** - consider caching for repeated runs

### Architecture Guidelines

- **Single responsibility** - each analyzer should have one clear purpose
- **Dependency injection** - make components testable and configurable
- **Error boundaries** - graceful handling of parsing errors
- **Progress reporting** - provide feedback for long-running operations

### Adding New Analyzers

1. Create analyzer in `src/analyzers/`
2. Add types to `src/types/`
3. Update main analysis orchestrator
4. Add CLI options if needed
5. Update documentation

## Release Process

Releases are handled by maintainers:

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create release tag
4. Publish to npm

## Questions?

- **Check existing issues** for similar questions
- **Create a new issue** with the `question` label
- **Be specific** about what you're trying to achieve

Thank you for contributing to Sicua! 🚀
