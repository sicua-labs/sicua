# Sicua

A comprehensive static analysis tool for TypeScript/React projects that generates detailed insights about your codebase structure, complexity, and potential issues.

## Installation

```bash
npm install -g sicua
```

## Quick Start

```bash
# Analyze current directory
sicua
```

## Features

### 🔍 **Comprehensive Analysis**

- **Component Analysis**: Circular dependencies, zombie clusters, component relationships
- **Complexity Metrics**: Cognitive complexity, cyclomatic complexity, maintainability index
- **Dependency Analysis**: Unused and missing package dependencies
- **Function Analysis**: Parameter parsing, async detection, type resolution
- **Error Handling**: Error boundaries, try-catch blocks, error patterns

### 📊 **Advanced Insights**

- **SEO Analysis**: Meta tags, structured data, performance optimization
- **Translation Coverage**: Missing translations, duplicate keys
- **Type Analysis**: Complex types, duplicate types, usage patterns
- **Contextual Summaries**: Business logic extraction, semantic analysis
- **Deduplication**: Component similarity detection and grouping

### 🎯 **Framework Support**

- **Next.js**: App Router, Pages Router, middleware analysis
- **React**: Components, hooks, JSX patterns
- **TypeScript**: Full type system analysis
- **Modern JavaScript**: ES6+, async/await, modules

## Usage

### Basic Analysis

```bash
sicua analyze ./my-project
```

### Output

The tool generates a comprehensive JSON report containing:

- **Component relationships** and dependency graphs
- **Complexity metrics** for maintainability assessment
- **Circular dependency detection** with break suggestions
- **Zombie cluster identification** for unused code cleanup
- **SEO optimization** recommendations
- **Error handling** coverage analysis

### Example Output Structure

```json
{
  "componentAnalysis": {
    "circularDependencies": [...],
    "zombieClusters": [...],
    "dependencyGraph": [...]
  },
  "complexityMetrics": {
    "cognitiveComplexity": {...},
    "cyclomaticComplexity": {...},
    "maintainabilityIndex": {...}
  },
  "advancedAnalysis": {
    "seoAnalysis": {...},
    "errorHandling": {...},
    "typeAnalysis": {...}
  }
}
```

## Supported File Types

- **TypeScript**: `.ts`, `.tsx`
- **JavaScript**: `.js`, `.jsx`
- **Configuration**: `next.config.js`, `tsconfig.json`, etc.
- **Translation**: JSON, TypeScript translation files

## Project Structure Analysis

AnalysisGen analyzes:

- **Components**: React components, hooks, context providers
- **Pages/Routes**: Next.js pages, API routes, middleware
- **Utils/Helpers**: Utility functions, shared logic
- **Types**: TypeScript interfaces, types, enums
- **Config Files**: Build configuration, environment setup

## Requirements

- **Node.js**: 18.0.0 or higher
- **TypeScript projects** (JavaScript support included)
- **React/Next.js** (optimized for these frameworks)

## CLI Options

```bash
sicua analyze [project-path] [options]

Options:
  -o, --output <file>     Output file path (default: analysis-result.json)
  -v, --verbose           Verbose logging
  -h, --help             Display help information
```

## Integration

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Run Code Analysis
  run: |
    npm install -g sicua
    sicua analyze . --output analysis.json
```

## Analysis Categories

### Component Analysis

- Circular dependency detection
- Component relationship mapping
- Zombie cluster identification
- Import/export tracking

### Complexity Metrics

- Cognitive complexity scoring
- Cyclomatic complexity calculation
- Component coupling analysis
- Maintainability index assessment

### Quality Insights

- Error handling coverage
- SEO optimization opportunities
- Translation completeness
- Code deduplication suggestions

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and contribution guidelines.

## License

ISC License - see [LICENSE](LICENSE) file for details.

## Support

- 📚 [Documentation](https://github.com/yourusername/sicua/wiki)
- 🐛 [Report Issues](https://github.com/yourusername/sicua/issues)
- 💬 [Discussions](https://github.com/yourusername/sicua/discussions)

---

**AnalysisGen** - Understand your codebase better, ship with confidence.
