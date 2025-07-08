# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup and core functionality

## [1.0.0] - 2024-12-19

### Added
- Static analysis tool for TypeScript/React projects
- Circular dependency detection and visualization
- Zombie cluster analysis (unreachable components)
- Package dependency analysis (unused/missing dependencies)
- Complexity metrics calculation:
  - Cognitive complexity
  - Cyclomatic complexity
  - Component complexity
  - Coupling degree
  - Maintainability index
- CLI interface with project analysis commands
- JSON output for analysis results
- Support for Next.js and React projects
- Component relationship mapping
- Function-level dependency tracking

### Features
- **Advanced Analysis**:
  - Detects circular dependencies with break suggestions
  - Identifies zombie component clusters
  - Analyzes package dependencies for cleanup
- **Complexity Metrics**:
  - Multi-dimensional complexity scoring
  - Maintainability assessment
  - Coupling analysis
- **Framework Support**:
  - Next.js App Router and Pages Router
  - React components and hooks
  - TypeScript and JavaScript files

### Technical
- Built with TypeScript for type safety
- Uses Babel parser for AST analysis
- Fast-glob for efficient file scanning
- Commander.js for CLI interface
- Comprehensive error handling and logging

---

## How to Update This Changelog

When releasing a new version:

1. Move items from `[Unreleased]` to a new version section
2. Add a new `[Unreleased]` section at the top
3. Update version links at the bottom
4. Use these categories as appropriate:
   - `Added` for new features
   - `Changed` for changes in existing functionality
   - `Deprecated` for soon-to-be removed features
   - `Removed` for now removed features
   - `Fixed` for any bug fixes
   - `Security` for vulnerability fixes