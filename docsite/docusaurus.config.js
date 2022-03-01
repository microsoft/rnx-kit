// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

// Always use VSCode dark-theme for code blocks. The light theme looks
// bad on top of our site's light theme (no contrast).
const darkCodeTheme = require("prism-react-renderer/themes/vsDark");
const lightCodeTheme = darkCodeTheme;

const organizationName = "microsoft";
const projectName = "rnx-kit";
const githubUrl = "https://github.com/" + organizationName + "/" + projectName;
const mainReadmeUrl = githubUrl + "/#react-native-developer-tools";
const mainBranchUrl = githubUrl + "/tree/main";
const docsiteUrl = mainBranchUrl + "/docsite";

const title = "React Native Developer Tools";

/** @type {import('@docusaurus/types').Config} */
const config = {
  title,
  tagline:
    "Helping developers build, deliver, and maintain React Native apps and libraries",
  url: "https://" + organizationName + ".github.io",
  baseUrl: "/" + projectName + "/",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",
  favicon: "img/favicon.ico",
  organizationName,
  projectName,

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          editUrl: docsiteUrl + "/docs/",
        },
        blog: {
          showReadingTime: true,
          editUrl: docsiteUrl + "/blog/",
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
          alt: "blue atomic symbol",
          src: "img/react-logo.svg",
        },
        items: [
          {
            type: "doc",
            docId: "tutorial-basics/intro",
            position: "right",
            label: "Tutorial",
          },
          { to: "/blog", label: "Blog", position: "right" },
          {
            href: mainReadmeUrl,
            className: "github-mark-24px",
            position: "right",
            "aria-label": "GitHub repository",
          },
        ],
      },
      footer: {
        style: "dark",
        // links: [
        //   {
        //     title: "Docs",
        //     items: [
        //       {
        //         label: "Tutorial",
        //         to: "/docs/intro",
        //       },
        //     ],
        //   },
        //   {
        //     title: "Community",
        //     items: [
        //       {
        //         label: "Stack Overflow",
        //         href: "https://stackoverflow.com/questions/tagged/docusaurus",
        //       },
        //       {
        //         label: "Discord",
        //         href: "https://discordapp.com/invite/docusaurus",
        //       },
        //       {
        //         label: "Twitter",
        //         href: "https://twitter.com/docusaurus",
        //       },
        //     ],
        //   },
        //   {
        //     title: "More",
        //     items: [
        //       {
        //         label: "Blog",
        //         to: "/blog",
        //       },
        //       {
        //         label: "GitHub",
        //         href: mainReadmeUrl,
        //       },
        //     ],
        //   },
        // ],
        logo: {
          src: "img/Microsoft-Open-Source-logo.svg",
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
