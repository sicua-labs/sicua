import ts from "typescript";

export class RiskAnalysisUtils {
  static isFileSystemOperation(node: ts.Node): boolean {
    if (ts.isCallExpression(node)) {
      const text = node.expression.getText();
      return (
        text.includes("readFile") ||
        text.includes("writeFile") ||
        text.includes("fs.") ||
        text.includes("File") ||
        text.includes("createReadStream") ||
        text.includes("createWriteStream")
      );
    }
    return false;
  }

  static isNetworkRequest(node: ts.Node): boolean {
    if (ts.isCallExpression(node)) {
      const text = node.expression.getText().toLowerCase();
      return (
        text.includes("fetch") ||
        text.includes("axios") ||
        text.includes("http") ||
        text.includes("request") ||
        text.includes("api.") ||
        text.includes("get(") ||
        text.includes("post(") ||
        text.includes("put(") ||
        text.includes("delete(")
      );
    }
    return false;
  }

  static isDataParsing(node: ts.Node): boolean {
    if (ts.isCallExpression(node)) {
      const text = node.expression.getText();
      return (
        text.includes("JSON.parse") ||
        text.includes("JSON.stringify") ||
        text.includes("parse") ||
        text.includes("deserialize") ||
        text.includes("decode")
      );
    }
    return false;
  }

  static isExternalAPICall(node: ts.Node): boolean {
    if (ts.isCallExpression(node)) {
      // Look for common API client patterns
      const text = node.expression.getText().toLowerCase();
      return (
        text.includes("api.") ||
        text.includes("client.") ||
        text.includes("service.") ||
        text.includes("graphql") ||
        text.includes("rest")
      );
    }
    return false;
  }

  static isDatabaseOperation(node: ts.Node): boolean {
    if (ts.isCallExpression(node)) {
      const text = node.expression.getText().toLowerCase();
      return (
        text.includes("query") ||
        text.includes("transaction") ||
        text.includes("db.") ||
        text.includes("database") ||
        text.includes("prisma.") ||
        text.includes("sequelize") ||
        text.includes("mongoose")
      );
    }
    return false;
  }

  static isStateUpdate(node: ts.Node): boolean {
    if (ts.isCallExpression(node)) {
      const text = node.expression.getText();
      return (
        text.startsWith("set") || // useState setters
        text.includes("dispatch") || // Redux dispatch
        text.includes("update") || // General state updates
        text.includes("mutate") // SWR/React Query
      );
    }
    return false;
  }

  static isComplexCalculation(node: ts.Node): boolean {
    let complexity = 0;
    let hasCalculations = false;

    const visit = (node: ts.Node): void => {
      // Check for mathematical operations
      if (ts.isBinaryExpression(node)) {
        switch (node.operatorToken.kind) {
          case ts.SyntaxKind.PlusToken:
          case ts.SyntaxKind.MinusToken:
          case ts.SyntaxKind.AsteriskToken:
          case ts.SyntaxKind.SlashToken:
          case ts.SyntaxKind.PercentToken:
            hasCalculations = true;
            complexity++;
            break;
        }
      }

      // Check for Math object usage
      if (
        ts.isPropertyAccessExpression(node) &&
        node.expression.getText() === "Math"
      ) {
        hasCalculations = true;
        complexity++;
      }

      ts.forEachChild(node, visit);
    };

    visit(node);
    return hasCalculations && complexity > 2;
  }

  static isThirdPartyLibraryCall(node: ts.Node): boolean {
    if (ts.isCallExpression(node)) {
      const text = node.expression.getText();
      // Add common third-party libraries that might throw
      return (
        text.includes("lodash.") ||
        text.includes("moment") ||
        text.includes("dayjs") ||
        text.includes("yup") ||
        text.includes("zod") ||
        text.includes("validator")
      );
    }
    return false;
  }

  static isDataTransformation(node: ts.Node): boolean {
    if (ts.isCallExpression(node)) {
      const text = node.expression.getText().toLowerCase();
      return (
        text.includes("map") ||
        text.includes("reduce") ||
        text.includes("filter") ||
        text.includes("transform") ||
        text.includes("convert") ||
        text.includes("format")
      );
    }
    return false;
  }
}
