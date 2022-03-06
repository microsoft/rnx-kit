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

/**
 * @typedef {ReturnType<import("@cmfcmf/docusaurus-search-local/lib/server").validateOptions>} SearchPluginOptions
 */

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

  plugins: [
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
        indexBlog: true,

        // whether to index static pages
        // /404.html is never indexed
        indexPages: false,

        // language of your documentation, see next section
        language: "en",

        // setting this to "none" will prevent the default CSS to be included. The default CSS
        // comes from autocomplete-theme-classic, which you can read more about here:
        // https://www.algolia.com/doc/ui-libraries/autocomplete/api-reference/autocomplete-theme-classic/
        style: undefined,

        // lunr.js-specific settings
        lunr: {
          // When indexing your documents, their content is split into "tokens".
          // Text entered into the search box is also tokenized.
          // This setting configures the separator used to determine where to split the text into tokens.
          // By default, it splits the text at whitespace and dashes.
          //
          // Note: Does not work for "ja" and "th" languages, since these use a different tokenizer.
          //tokenizerSeparator: /[\s-]+/.toString(),
          //
          // https://lunrjs.com/guides/customising.html#similarity-tuning
          //
          // This parameter controls the importance given to the length of a document and its fields. This
          // value must be between 0 and 1, and by default it has a value of 0.75. Reducing this value
          // reduces the effect of different length documents on a term’s importance to that document.
          //b: 0.75,
          //
          // This controls how quickly the boost given by a common word reaches saturation. Increasing it
          // will slow down the rate of saturation and lower values result in quicker saturation. The
          // default value is 1.2. If the collection of documents being indexed have high occurrences
          // of words that are not covered by a stop word filter, these words can quickly dominate any
          // similarity calculation. In these cases, this value can be reduced to get more balanced results.
          //k1: 1.2,
          //
          // By default, we rank pages where the search term appears in the title higher than pages where
          // the search term appears in just the text. This is done by "boosting" title matches with a
          // higher value than content matches. The concrete boosting behavior can be controlled by changing
          // the following settings.
          //titleBoost: 5,
          //contentBoost: 1,
          //parentCategoriesBoost: 2, // Only used when indexDocSidebarParentCategories > 0
        },
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
          editUrl: docsiteUrl + "/",
        },
        blog: {
          showReadingTime: true,
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
            src: "img/github-logo.svg",
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
