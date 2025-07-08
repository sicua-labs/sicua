/**
 * SQL injection detection constants
 */

// Database libraries that support SQL operations
export const SQL_LIBRARIES = [
  // MySQL
  "mysql",
  "mysql2",

  // PostgreSQL
  "pg",
  "postgres",

  // SQLite
  "sqlite3",
  "better-sqlite3",

  // Multi-database ORMs
  "prisma",
  "sequelize",
  "typeorm",
  "knex",
  "drizzle-orm",

  // MongoDB (NoSQL but supports SQL-like queries)
  "mongodb",
  "mongoose",

  // Generic database connectors
  "database",
  "db-migrate",
  "node-sql-parser",
];

// SQL keywords that indicate query construction
export const SQL_KEYWORDS = [
  "SELECT",
  "INSERT",
  "UPDATE",
  "DELETE",
  "DROP",
  "CREATE",
  "ALTER",
  "UNION",
  "WHERE",
  "ORDER BY",
  "GROUP BY",
  "HAVING",
  "JOIN",
  "INNER JOIN",
  "LEFT JOIN",
  "RIGHT JOIN",
  "FULL JOIN",
  "FROM",
  "INTO",
  "VALUES",
  "SET",
  "LIMIT",
  "OFFSET",
];

// Methods commonly used for executing SQL queries
export const SQL_EXECUTION_METHODS = [
  "query",
  "execute",
  "exec",
  "run",
  "all",
  "get",
  "prepare",
  "raw",
  "sql",
  "findRaw",
  "executeRaw",
];

// Dangerous SQL construction patterns (for string concatenation detection)
export const DANGEROUS_SQL_PATTERNS = [
  // Template literals with variables
  /`[^`]*\$\{[^}]*\}[^`]*(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|UNION|WHERE|ORDER\s+BY|GROUP\s+BY|HAVING|JOIN|FROM|INTO|VALUES|SET|LIMIT|OFFSET)/gi,

  // String concatenation with SQL keywords
  /['"][^'"]*(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|UNION|WHERE|ORDER\s+BY|GROUP\s+BY|HAVING|JOIN|FROM|INTO|VALUES|SET|LIMIT|OFFSET)[^'"]*['"]\s*\+/gi,

  // Plus operator with SQL-like strings
  /\+\s*['"][^'"]*(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|UNION|WHERE|ORDER\s+BY|GROUP\s+BY|HAVING|JOIN|FROM|INTO|VALUES|SET|LIMIT|OFFSET)/gi,
];

// Safe parameterized query patterns
export const SAFE_QUERY_PATTERNS = [
  // Prisma-style queries
  /prisma\.\w+\.(?:findMany|findFirst|findUnique|create|update|delete|upsert|count|aggregate)/,

  // Prepared statement placeholders
  /\?/,
  /\$\d+/,
  /:[\w_]+/,

  // Named parameters
  /@[\w_]+/,
];

// User input sources that could lead to SQL injection
export const SQL_INJECTION_INPUT_SOURCES = [
  "req.query",
  "req.params",
  "req.body",
  "request.query",
  "request.params",
  "request.body",
  "searchParams",
  "formData",
  "input",
  "userInput",
  "query",
  "params",
  "filter",
  "search",
  "sort",
  "orderBy",
  "where",
  "condition",
];

// ORM methods that are generally safe from SQL injection
export const SAFE_ORM_METHODS = [
  // Prisma
  "findMany",
  "findFirst",
  "findUnique",
  "create",
  "update",
  "delete",
  "upsert",
  "count",
  "aggregate",

  // Sequelize
  "findAll",
  "findOne",
  "findByPk",
  "findAndCountAll",
  "create",
  "update",
  "destroy",
  "bulkCreate",
  "bulkUpdate",

  // TypeORM
  "find",
  "findOne",
  "findOneBy",
  "save",
  "remove",
  "softRemove",
  "recover",
  "insert",
  "update",
  "delete",
];

// Raw SQL methods that require careful analysis
export const RAW_SQL_METHODS = [
  "raw",
  "query",
  "execute",
  "exec",
  "sql",
  "findRaw",
  "executeRaw",
  "$queryRaw",
  "$executeRaw",
  "$queryRawUnsafe",
  "$executeRawUnsafe",
];

// Variable names that commonly hold SQL queries
export const SQL_VARIABLE_NAMES = [
  "sql",
  "query",
  "sqlQuery",
  "statement",
  "sqlStatement",
  "command",
  "sqlCommand",
  "rawQuery",
  "selectQuery",
  "insertQuery",
  "updateQuery",
  "deleteQuery",
];

// String concatenation operators and methods
export const STRING_CONCAT_PATTERNS = [
  // Template literals
  /`[^`]*\$\{/,

  // Plus operator
  /\s*\+\s*/,

  // String methods
  /\.concat\(/,
  /\.replace\(/,
  /\.join\(/,
];
