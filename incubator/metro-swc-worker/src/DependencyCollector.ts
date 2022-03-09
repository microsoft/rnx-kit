import {
  CallExpression,
  ExportAllDeclaration,
  ExportNamedDeclaration,
  Expression,
  ImportDeclaration,
  ModuleDeclaration,
  TsType,
} from "@swc/core";
import Visitor from "@swc/core/Visitor";
import type { TransformResultDependency } from "metro";

export default class DependencyCollector extends Visitor {
  public dependencies: TransformResultDependency[] = [];

  // > export * from "chopper";
  visitExportAllDeclration(decl: ExportAllDeclaration): ModuleDeclaration {
    this.registerDependency(decl);
    return decl;
  }

  // > export { escape } from "chopper";
  visitExportNamedDeclration(decl: ExportNamedDeclaration): ModuleDeclaration {
    this.registerDependency(decl);
    return decl;
  }

  visitCallExpression(expr: CallExpression): Expression {
    const callee = expr.callee;
    if (callee.type === "Identifier" && callee.value === "require") {
      // > require("chopper");
      const arg = expr.arguments[0].expression;
      if (arg.type === "StringLiteral") {
        this.dependencies.push({
          name: arg.value,
          data: {
            asyncType: null,
            isOptional: false,
            locs: [],
          },
        });
      }
    } else if (callee.type === "CallExpression") {
      // > require("chopper")(...args);
      this.visitCallExpression(callee);
    } else {
      // > interopRequireDefault(require("chopper"))
      expr.arguments.forEach(({ expression }) => {
        if (expression.type === "CallExpression") {
          this.visitCallExpression(expression);
        }
      });
    }
    return expr;
  }

  visitTsType(n: TsType): TsType {
    // No-op to avoid "Error: Method visitTsType not implemented."
    return n;
  }

  // > import * as chopper from "chopper";
  // > import chopper from "chopper";
  visitImportDeclaration(decl: ImportDeclaration): ImportDeclaration {
    this.registerDependency(decl);
    return decl;
  }

  private registerDependency(
    decl: ExportAllDeclaration | ExportNamedDeclaration | ImportDeclaration
  ): void {
    const name = decl.source?.value;
    if (name) {
      this.dependencies.push({
        name,
        data: {
          asyncType: null,
          isOptional: false,
          locs: [],
        },
      });
    }
  }
}
