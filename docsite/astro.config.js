// @ts-check
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightLinksValidator from "starlight-links-validator";
import { generateAll } from "./generate.js";

// Ensure content is generated
generateAll();

const githubUrl = "https://github.com/microsoft/rnx-kit";

export default defineConfig({
  site: "https://microsoft.github.io",
  base: "/rnx-kit",
  trailingSlash: "never",
  build: {
    format: "file",
  },
  integrations: [
    starlight({
      title: "rnx-kit",
      description:
        "Tools to boost your productivity. By and for the community.",
      favicon: "/img/favicon.ico",
      logo: {
        src: "./src/assets/react-logo.svg",
        alt: "React Native logo",
      },
      social: [
        { icon: "github", label: "GitHub", href: githubUrl + "/#readme" },
      ],
      editLink: {
        baseUrl: githubUrl + "/tree/main/docsite/",
      },
      expressiveCode: {
        themes: ["dark-plus", "light-plus"],
      },
      customCss: ["./src/styles/custom.css"],
      components: {
        Footer: "./src/components/Footer.astro",
      },
      plugins: [starlightLinksValidator()],
      sidebar: [
        {
          label: "The Basics",
          items: ["docs/introduction", "docs/dependencies", "docs/type-safety"],
        },
        {
          label: "Guides",
          items: [
            "docs/guides/getting-started",
            "docs/guides/dependency-management",
            "docs/guides/bundling",
          ],
        },
        {
          label: "Architecture",
          items: [
            "docs/architecture/overview",
            "docs/architecture/dependency-management",
          ],
        },
        {
          label: "Tools",
          items: [{ autogenerate: { directory: "docs/tools" } }],
        },
        "docs/community",
        "docs/contributing",
        {
          label: "Blog",
          link: "https://devblogs.microsoft.com/react-native/",
          attrs: { target: "_blank" },
        },
      ],
    }),
  ],
});
