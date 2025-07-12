# Sicua

A comprehensive static analysis tool for TypeScript/React projects that generates detailed insights about your codebase structure, complexity, and potential issues.

> ⚠️ **Alpha Release** - Currently in alpha stage. Best compatibility with **Next.js 13.4+** TypeScript projects using the **App Router**. Pages Router and pure React projects are supported but may have limited features.

## Installation

```bash
npm install -g sicua
```

## Quick Analysis

```bash
# Analyze current directory
npx sicua
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
- **Security Analysis**: Basic Security Analysis and vulnerability detections
- **Deduplication**: Component similarity detection and grouping

### 🎯 **Framework Support**

- **Next.js**: App Router, Pages Router, middleware analysis
- **React**: Components, hooks, JSX patterns
- **TypeScript**: Full type system analysis
- **Modern JavaScript**: ES6+, async/await, modules

## Usage

### Basic Analysis

```bash
sicua
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

Sicua analyzes:

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
sicua [options]

Options:
  -p, --path <path>              Path to the project (default: current directory)
  -o, --output <path>            Output file path (default: analysis-results.json)
  --src <dir>                    Source directory to analyze
  --root-components <names>      Root component names (comma-separated)
  --extensions <exts>            File extensions to process (comma-separated)  
  --verbose                      Enable verbose output
  --force                        Force analysis even if validation fails
  -V, --version                  Show version number
  -h, --help                     Display help information

# Additional commands
sicua validate                   # Validate project structure
sicua init                       # Initialize config file  
sicua info                       # Show project information
```

# Additional commands

sicua validate # Validate project structure
sicua init # Initialize config file  
sicua info # Show project information

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

## 🌐 Full Analysis Platform

Upload your analysis results to [sicualabs.com](https://sicualabs.com) for:

- Interactive dependency graphs
- Detailed recommendations
- AI Multi Model Analysis
- Historical tracking

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and contribution guidelines.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📚 [Documentation](https://github.com/sicua-labs/sicua/wiki)
- 🐛 [Report Issues](https://github.com/sicua-labs/sicua/issues)
- 💬 [Discussions](https://github.com/sicua-labs/sicua/discussions)

---

**Sicua** - Understand your codebase better, ship with confidence.
