// @ts-check

// Ensure content is generated
require("./generate")();
const { themes } = require("prism-react-renderer");

const darkCodeTheme = themes.vsDark;

/** @type {import("prism-react-renderer").PrismTheme} */
// @ts-expect-error Type definition doesn't match up with actual export
const lightCodeTheme = themes.vsLight;
lightCodeTheme.plain.color = "rgb(28, 30, 33)"; // from CSS --font-color-base-rgb
lightCodeTheme.plain.backgroundColor = "#ffffff";

const organizationName = "microsoft";
const projectName = "rnx-kit";
const githubUrl = "https://github.com/" + organizationName + "/" + projectName;
const mainReadmeUrl = githubUrl + "/#readme";
const mainBranchUrl = githubUrl + "/tree/main";
const docsiteUrl = mainBranchUrl + "/docsite";

const title1 = "React Native";
const title2 = "Developer Tools";

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: title1 + " " + title2,
  tagline: "Tools to boost your productivity. By and for the community.",
  url: "https://" + organizationName + ".github.io",
  baseUrl: "/" + projectName + "/",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",
  favicon: "img/favicon.ico",
  organizationName,
  projectName,
  deploymentBranch: "gh-pages",
  trailingSlash: false,

  customFields: {
    title1,
    title2,
  },

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
        gtag: {
          trackingID: "G-ZT44H2DNEQ",
          anonymizeIP: true,
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      algolia: {
        // ------------
        //
        // Docusaurus's Algolia plugin properties
        //
        appId: "47BE8NTWGA",
        apiKey: "db4f13fdceb9b39d4ddb0b3746ecb99e",
        indexName: "rnx-kit",
        contextualSearch: true,

        // Optional: Specify domains where the navigation should occur through window.location instead on history.push. Useful when our Algolia config crawls multiple documentation sites and we want to navigate with window.location.href to them.
        //externalUrlRegex: "external\\.com|domain\\.com",

        // Optional: path for search page that enabled by default (`false` to disable it)
        searchPagePath: "search",

        // ----------
        //
        // Algolia search parameters
        // Reference: https://www.algolia.com/doc/api-reference/search-api-parameters
        //
        // ** These are all OPTIONAL **
        //
        searchParameters: {},

        // ----------
        //
        // Algolia DocSearch API properties
        // Reference: https://docsearch.algolia.com/docs/api
        //
        // ** All properties are OPTIONAL, and should be listed below here **
        //
      },
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
            docId: "tools/overview",
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
            docId: "community",
            position: "right",
            label: "Community",
          },
          {
            type: "doc",
            docId: "contributing",
            position: "right",
            label: "Contributing",
          },
          {
            label: "Blog",
            position: "right",
            href: "https://devblogs.microsoft.com/react-native/",
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
