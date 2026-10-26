import { dirname, join } from "node:path";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const AD5 =
  "AD-5: server-only secrets and the env server section must not reach a client component.";
const SERVER_ENV_NAMES = ["getServerEnv", "parseServerEnv"];

const isClientComponent = (program) =>
  program.body.some(
    (node) => node.type === "ExpressionStatement" && node.directive === "use client",
  );

const isEnvModule = (source) => /(^|\/)env(\.ts|\/index(\.ts)?)?$/.test(source);
// The secret-key client: any import of it from a client component is a leak. Relative paths are resolved
// against the importing file, so `./admin` next to it counts too.
const ADMIN_MODULE = /(^|\/)supabase\/admin(\.ts)?$/;
const isAdminModule = (source, filename) =>
  ADMIN_MODULE.test(source.startsWith(".") ? join(dirname(filename), source) : source);

const noServerEnvInClient = {
  meta: { type: "problem", schema: [] },
  create(context) {
    let client = false;
    const report = (node) => context.report({ node, message: AD5 });
    const isAdmin = (source) => isAdminModule(source, context.filename);
    // Only named imports of the client section are allowed; anything else reaches the server section.
    const leaksServerSection = (node) =>
      isAdmin(node.source.value) ||
      (isEnvModule(node.source.value) &&
        (node.specifiers ?? []).some(
          (s) =>
            s.type === "ImportNamespaceSpecifier" ||
            s.type === "ExportNamespaceSpecifier" ||
            SERVER_ENV_NAMES.includes((s.imported ?? s.local).name),
        ));
    return {
      Program(node) {
        client = isClientComponent(node);
      },
      ImportDeclaration(node) {
        if (client && leaksServerSection(node)) report(node);
      },
      ExportNamedDeclaration(node) {
        if (client && node.source && leaksServerSection(node)) report(node);
      },
      ExportAllDeclaration(node) {
        if (client && (isEnvModule(node.source.value) || isAdmin(node.source.value))) report(node);
      },
      ImportExpression(node) {
        if (
          client &&
          node.source.type === "Literal" &&
          (isEnvModule(node.source.value) || isAdmin(node.source.value))
        )
          report(node);
      },
      Identifier(node) {
        if (client && node.name === "SUPABASE_SECRET_KEY") report(node);
      },
      Literal(node) {
        if (client && node.value === "SUPABASE_SECRET_KEY") report(node);
      },
    };
  },
};

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "_bmad/**",
      "next-env.d.ts",
      "playwright-report/**",
      "test-results/**",
      ".playwright-mcp/**",
      "src/types/database.ts",
    ],
  },
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { arrangly: { rules: { "no-server-env-in-client": noServerEnvInClient } } },
    rules: { "arrangly/no-server-env-in-client": "error" },
  },
];

export default eslintConfig;
