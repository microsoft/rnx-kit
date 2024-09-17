// @ts-check

// Ensure content is generated
require("./generate")();
const { themes } = require("prism-react-renderer");

const darkCodeTheme = themes.vsDark;

/** @type {import("prism-react-renderer").PrismTheme} */
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
module.exports = {
  title: title1 + " " + title2,
  url: "https://" + organizationName + ".github.io",
  baseUrl: "/" + projectName + "/",
  favicon: "img/favicon.ico",
  trailingSlash: false,
  tagline: "Tools to boost your productivity. By and for the community.",
  organizationName,
  projectName,
  deploymentBranch: "gh-pages",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",
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
  plugins: [require.resolve("docusaurus-lunr-search")],
  presets: [
    [
      "@docusaurus/preset-classic",
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
  customFields: {
    title1,
    title2,
  },
};
