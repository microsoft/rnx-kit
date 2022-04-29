// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

/**
 * @typedef {{plain: Record<string, string>; styles: Array<{types: string[], style: { color: string; }}>}} CodeTheme
 */

const darkCodeTheme = require("prism-react-renderer/themes/vsDark");

/**
 * @type {CodeTheme}
 */
const lightCodeTheme = require("prism-react-renderer/themes/vsLight");
lightCodeTheme.plain.color = "rgb(28, 30, 33)"; // from CSS --font-color-base-rgb
lightCodeTheme.plain.backgroundColor = "#ffffff";

const organizationName = "microsoft";
const projectName = "rnx-kit";
const githubUrl = "https://github.com/" + organizationName + "/" + projectName;
const mainReadmeUrl = githubUrl + "/#react-native-developer-tools";
const mainBranchUrl = githubUrl + "/tree/main";
const docsiteUrl = mainBranchUrl + "/docsite";

/**
 * @typedef {ReturnType<import("@cmfcmf/docusaurus-search-local/lib/server").validateOptions>} SearchPluginOptions
 */

const title1 = "React Native";
const title2 = "Developer Tools";

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: title1 + " " + title2,
  tagline: "Modern, scalable tools. Exceptional developer experience.",
  url: "https://" + organizationName + ".github.io",
  baseUrl: "/" + projectName + "/",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",
  favicon: "img/favicon.ico",
  organizationName,
  projectName,

  customFields: {
    title1,
    title2,
  },

  plugins: [
    "./plugins/docusaurus/docusaurus-plugin-monorepo-markdown-processor",
    [
      require.resolve("@cmfcmf/docusaurus-search-local"),
      /** @type {SearchPluginOptions} */
      ({
        // whether to index docs pages
        indexDocs: true,

        // Whether to also index the titles of the parent categories in the sidebar of a doc page.
        // 0 disables this feature.
        // 1 indexes the direct parent category in the sidebar of a doc page
        // 2 indexes up to two nested parent categories of a doc page
        // 3...
        //
        // Do _not_ use Infinity, the value must be a JSON-serializable integer.
        indexDocSidebarParentCategories: 0,

        // whether to index blog pages
        indexBlog: false,

        // whether to index static pages
        // /404.html is never indexed
        indexPages: false,

        // language of your documentation, see next section
        language: "en",

        // setting this to "none" will prevent the default CSS to be included. The default CSS
        // comes from autocomplete-theme-classic, which you can read more about here:
        // https://www.algolia.com/doc/ui-libraries/autocomplete/api-reference/autocomplete-theme-classic/
        style: undefined,
      }),
    ],
  ],

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          breadcrumbs: false,
          sidebarPath: require.resolve("./sidebars.js"),
          sidebarCollapsed: false,
          editUrl: docsiteUrl + "/",
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: projectName,
        logo: {
          alt: "react native logo",
          src: "img/react-logo.svg",
        },
        items: [
          {
            type: "doc",
            docId: "introduction",
            position: "right",
            label: "Docs",
          },
          {
            type: "doc",
            docId: "packages/overview",
            position: "right",
            label: "Tools",
          },
          {
            type: "doc",
            docId: "architecture/overview",
            position: "right",
            label: "Architecture",
          },
          {
            type: "doc",
            docId: "resources",
            position: "right",
            label: "Resources",
          },
          {
            type: "doc",
            docId: "contributing",
            position: "right",
            label: "Contributing",
          },
          {
            src: "img/github-logo.svg",
            href: mainReadmeUrl,
            className: "github-mark-24px",
            position: "right",
            "aria-label": "GitHub repository",
          },
        ],
      },
      footer: {
        logo: {
          src: "img/msoss-light.png",
          srcDark: "img/msoss-dark.png",
          alt: "Microsoft Open Source logo",
          href: "https://opensource.microsoft.com",
        },
        copyright: `Copyright © ${new Date().getFullYear()} Microsoft`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
