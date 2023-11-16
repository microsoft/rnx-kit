"use strict";(self.webpackChunk_rnx_kit_docsite=self.webpackChunk_rnx_kit_docsite||[]).push([[5800],{678:(e,i,n)=>{n.r(i),n.d(i,{assets:()=>d,contentTitle:()=>r,default:()=>h,frontMatter:()=>o,metadata:()=>l,toc:()=>a});var s=n(5893),t=n(1151);const o={},r="metro-serializer-esbuild",l={id:"tools/metro-serializer-esbuild",title:"metro-serializer-esbuild",description:"Stability Beta",source:"@site/docs/tools/metro-serializer-esbuild.md",sourceDirName:"tools",slug:"/tools/metro-serializer-esbuild",permalink:"/rnx-kit/docs/tools/metro-serializer-esbuild",draft:!1,unlisted:!1,editUrl:"https://github.com/microsoft/rnx-kit/tree/main/docsite/docs/tools/metro-serializer-esbuild.md",tags:[],version:"current",frontMatter:{},sidebar:"toolsSidebar",previous:{title:"metro-serializer",permalink:"/rnx-kit/docs/tools/metro-serializer"},next:{title:"react-native-auth",permalink:"/rnx-kit/docs/tools/react-native-auth"}},d={},a=[{value:"Motivation",id:"motivation",level:2},{value:"Requirements",id:"requirements",level:2},{value:"Usage",id:"usage",level:2},{value:"Options",id:"options",level:2},{value:"<code>target</code>",id:"target",level:3},{value:"<code>fabric</code>",id:"fabric",level:3},{value:"<code>drop</code>",id:"drop",level:3},{value:"<code>minify</code>",id:"minify",level:3},{value:"<code>minifyWhitespace</code>",id:"minifywhitespace",level:3},{value:"<code>minifyIdentifiers</code>",id:"minifyidentifiers",level:3},{value:"<code>minifySyntax</code>",id:"minifysyntax",level:3},{value:"<code>pure</code>",id:"pure",level:3},{value:"<code>sourceMapPaths</code>",id:"sourcemappaths",level:3},{value:"<code>strictMode</code>",id:"strictmode",level:3},{value:"<code>analyze</code>",id:"analyze",level:3},{value:"<code>logLevel</code>",id:"loglevel",level:3},{value:"<code>metafile</code>",id:"metafile",level:3},{value:"Metro + ESM Support",id:"metro--esm-support",level:2},{value:"Known Limitations",id:"known-limitations",level:2}];function c(e){const i={a:"a",blockquote:"blockquote",code:"code",h1:"h1",h2:"h2",h3:"h3",img:"img",li:"li",p:"p",pre:"pre",ul:"ul",...(0,t.a)(),...e.components};return(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(i.h1,{id:"metro-serializer-esbuild",children:"metro-serializer-esbuild"}),"\n",(0,s.jsx)(i.p,{children:(0,s.jsx)(i.img,{src:"https://img.shields.io/badge/Stability-Beta-3bf",alt:"Stability Beta"})}),"\n",(0,s.jsxs)(i.p,{children:["Allow Metro to use ",(0,s.jsx)(i.a,{href:"https://esbuild.github.io",children:"esbuild"})," for bundling and\nserialization."]}),"\n",(0,s.jsx)(i.p,{children:"This tool is in Beta, and has been yielding good results so far. See the list of\nknown issues below for more information."}),"\n",(0,s.jsx)(i.h2,{id:"motivation",children:"Motivation"}),"\n",(0,s.jsx)(i.p,{children:"Metro currently does not implement tree shaking, i.e. it does not attempt to\nremove unused code from the JS bundle. For instance, given this code snippet:"}),"\n",(0,s.jsx)(i.pre,{children:(0,s.jsx)(i.code,{className:"language-ts",children:'import { partition } from "lodash";\n'})}),"\n",(0,s.jsxs)(i.p,{children:["Metro will bundle all of ",(0,s.jsx)(i.code,{children:"lodash"})," in your bundle even though you're only using a\nsmall part of it. In ",(0,s.jsx)(i.code,{children:"lodash"}),"'s case, you can add\n",(0,s.jsx)(i.a,{href:"https://github.com/lodash/babel-plugin-lodash#readme",children:(0,s.jsx)(i.code,{children:"babel-plugin-lodash"})})," to\nyour Babel config to help Metro strip away some modules, but not all libraries\nwill come with such helpers. For more details, see issues\n",(0,s.jsx)(i.a,{href:"https://github.com/facebook/metro/issues/227",children:"#227"})," and\n",(0,s.jsx)(i.a,{href:"https://github.com/facebook/metro/issues/632",children:"#632"}),"."]}),"\n",(0,s.jsx)(i.p,{children:"metro-serializer-esbuild addresses this by letting esbuild take over bundling."}),"\n",(0,s.jsx)(i.h2,{id:"requirements",children:"Requirements"}),"\n",(0,s.jsxs)(i.p,{children:["This plugin currently depends on some unstable features introduced in Metro\n",(0,s.jsx)(i.a,{href:"https://github.com/facebook/metro/releases/tag/v0.66.1",children:"0.66.1"}),". Breaking\nchanges were introduced in Metro 0.60, so this plugin will not work with React\nNative below 0.64."]}),"\n",(0,s.jsx)(i.h2,{id:"usage",children:"Usage"}),"\n",(0,s.jsxs)(i.p,{children:["esbuild works best when we pass it ES6 modules. The first thing we must do is to\ndisable import/export transformation by enabling ",(0,s.jsx)(i.code,{children:"disableImportExportTransform"}),"\nin ",(0,s.jsx)(i.code,{children:"babel.config.js"}),":"]}),"\n",(0,s.jsx)(i.pre,{children:(0,s.jsx)(i.code,{className:"language-diff",children:'+const env = process.env.BABEL_ENV || process.env.NODE_ENV;\n module.exports = {\n   presets: [\n     [\n       "module:metro-react-native-babel-preset",\n+      {\n+        disableImportExportTransform:\n+          env === "production" && process.env["RNX_METRO_SERIALIZER_ESBUILD"],\n+      },\n     ],\n   ],\n };\n'})}),"\n",(0,s.jsxs)(i.p,{children:["To avoid issues with dev server, we only want to enable\n",(0,s.jsx)(i.code,{children:"disableImportExportTransform"})," when bundling for production."]}),"\n",(0,s.jsxs)(i.p,{children:["If you're using ",(0,s.jsx)(i.code,{children:"@rnx-kit/babel-preset-metro-react-native"}),", you don't need to\nmake any changes."]}),"\n",(0,s.jsxs)(i.blockquote,{children:["\n",(0,s.jsxs)(i.p,{children:["Note that Hermes currently does not fully implement the\n",(0,s.jsx)(i.a,{href:"https://kangax.github.io/compat-table/es6/",children:"ES6 spec"}),". esbuild, on the other\nhand, does not fully support\n",(0,s.jsx)(i.a,{href:"https://github.com/evanw/esbuild/issues/297",children:"lowering to ES5"}),'. This\nessentially means that you may have to add additional plugins if you\'re seeing\nesbuild outputting "target environment is not supported yet" errors during\nbundle. For an example, see the error and its solution in\n',(0,s.jsx)(i.a,{href:"https://github.com/microsoft/rnx-kit/issues/1743",children:"#1743"}),"."]}),"\n"]}),"\n",(0,s.jsxs)(i.p,{children:["Next, configure Metro to use the esbuild serializer by making the following\nchanges to ",(0,s.jsx)(i.code,{children:"metro.config.js"}),":"]}),"\n",(0,s.jsx)(i.pre,{children:(0,s.jsx)(i.code,{className:"language-diff",children:' const { makeMetroConfig } = require("@rnx-kit/metro-config");\n+const {\n+  MetroSerializer,\n+  esbuildTransformerConfig,\n+} = require("@rnx-kit/metro-serializer-esbuild");\n\n module.exports = makeMetroConfig({\n   serializer: {\n+    customSerializer: MetroSerializer(),\n   },\n+  transformer: esbuildTransformerConfig,\n });\n'})}),"\n",(0,s.jsxs)(i.blockquote,{children:["\n",(0,s.jsxs)(i.p,{children:["Note that ",(0,s.jsx)(i.code,{children:"esbuildTransformerConfig"})," is incompatible with dev server and debug\nbuilds. It should only be set when bundling for production."]}),"\n"]}),"\n",(0,s.jsx)(i.p,{children:"We can now create a bundle as usual, e.g.:"}),"\n",(0,s.jsx)(i.pre,{children:(0,s.jsx)(i.code,{className:"language-sh",children:"react-native bundle --entry-file index.js --platform ios --dev false ...\n"})}),"\n",(0,s.jsx)(i.h2,{id:"options",children:"Options"}),"\n",(0,s.jsxs)(i.p,{children:["Similar to\n",(0,s.jsx)(i.a,{href:"https://github.com/microsoft/rnx-kit/tree/main/packages/metro-serializer#usage",children:(0,s.jsx)(i.code,{children:"metro-serializer"})}),",\n",(0,s.jsx)(i.code,{children:"metro-serializer-esbuild"})," also supports plugins. Additionally, you can\nconfigure the output of the plugin by passing an options object as the second\nparameter. For instance, to output ES6 compliant code, set the target option:"]}),"\n",(0,s.jsx)(i.pre,{children:(0,s.jsx)(i.code,{className:"language-diff",children:' const myPlugins = [...];\n module.exports = makeMetroConfig({\n   serializer: {\n     customSerializer: MetroSerializer(myPlugins, {\n+      target: "es6"\n     }),\n   },\n   transformer: esbuildTransformerConfig,\n });\n'})}),"\n",(0,s.jsx)(i.p,{children:"Below are all the currently supported options."}),"\n",(0,s.jsx)(i.h3,{id:"target",children:(0,s.jsx)(i.code,{children:"target"})}),"\n",(0,s.jsx)(i.p,{children:"Sets the target environment for the transpiled JavaScript code."}),"\n",(0,s.jsxs)(i.p,{children:["See the full documentation at ",(0,s.jsx)(i.a,{href:"https://esbuild.github.io/api/#target",children:"https://esbuild.github.io/api/#target"}),"."]}),"\n",(0,s.jsxs)(i.p,{children:["Values: Any JS language version string such as ",(0,s.jsx)(i.code,{children:"es6"})," or ",(0,s.jsx)(i.code,{children:"esnext"}),". You can also\nuse environment names. See the full documentation for a list of supported names."]}),"\n",(0,s.jsxs)(i.p,{children:["Defaults to ",(0,s.jsx)(i.code,{children:"hermes0.7.0"}),"."]}),"\n",(0,s.jsx)(i.h3,{id:"fabric",children:(0,s.jsx)(i.code,{children:"fabric"})}),"\n",(0,s.jsx)(i.p,{children:"When enabled, includes Fabric-enabled version of React. You can save some bytes\nby disabling this if you haven't migrated to Fabric yet."}),"\n",(0,s.jsxs)(i.p,{children:["Defaults to ",(0,s.jsx)(i.code,{children:"false"}),"."]}),"\n",(0,s.jsx)(i.h3,{id:"drop",children:(0,s.jsx)(i.code,{children:"drop"})}),"\n",(0,s.jsxs)(i.p,{children:["Tells esbuild to edit your source code before building to drop certain\nconstructs. There are currently two possible things that can be dropped:\n",(0,s.jsx)(i.code,{children:"debugger"})," and ",(0,s.jsx)(i.code,{children:"console"}),"."]}),"\n",(0,s.jsxs)(i.p,{children:["See the full documentation at ",(0,s.jsx)(i.a,{href:"https://esbuild.github.io/api/#drop",children:"https://esbuild.github.io/api/#drop"}),"."]}),"\n",(0,s.jsx)(i.p,{children:"By default, this option is not set."}),"\n",(0,s.jsx)(i.h3,{id:"minify",children:(0,s.jsx)(i.code,{children:"minify"})}),"\n",(0,s.jsx)(i.p,{children:"When enabled, the generated code will be minified instead of pretty-printed."}),"\n",(0,s.jsxs)(i.p,{children:["See the full documentation at ",(0,s.jsx)(i.a,{href:"https://esbuild.github.io/api/#minify",children:"https://esbuild.github.io/api/#minify"}),"."]}),"\n",(0,s.jsxs)(i.p,{children:["Defaults to ",(0,s.jsx)(i.code,{children:"true"})," in production environment; ",(0,s.jsx)(i.code,{children:"false"})," otherwise."]}),"\n",(0,s.jsx)(i.h3,{id:"minifywhitespace",children:(0,s.jsx)(i.code,{children:"minifyWhitespace"})}),"\n",(0,s.jsxs)(i.p,{children:["Same as ",(0,s.jsx)(i.code,{children:"minify"})," but only removes whitespace."]}),"\n",(0,s.jsxs)(i.p,{children:["See the full documentation at ",(0,s.jsx)(i.a,{href:"https://esbuild.github.io/api/#minify",children:"https://esbuild.github.io/api/#minify"}),"."]}),"\n",(0,s.jsx)(i.p,{children:"By default, this option is not set."}),"\n",(0,s.jsx)(i.h3,{id:"minifyidentifiers",children:(0,s.jsx)(i.code,{children:"minifyIdentifiers"})}),"\n",(0,s.jsxs)(i.p,{children:["Same as ",(0,s.jsx)(i.code,{children:"minify"})," but only renames local variables to be shorter."]}),"\n",(0,s.jsxs)(i.p,{children:["See the full documentation at ",(0,s.jsx)(i.a,{href:"https://esbuild.github.io/api/#minify",children:"https://esbuild.github.io/api/#minify"}),"."]}),"\n",(0,s.jsx)(i.p,{children:"By default, this option is not set."}),"\n",(0,s.jsx)(i.h3,{id:"minifysyntax",children:(0,s.jsx)(i.code,{children:"minifySyntax"})}),"\n",(0,s.jsxs)(i.p,{children:["Same as ",(0,s.jsx)(i.code,{children:"minify"})," but only rewrites syntax to be more compact."]}),"\n",(0,s.jsxs)(i.p,{children:["See the full documentation at ",(0,s.jsx)(i.a,{href:"https://esbuild.github.io/api/#minify",children:"https://esbuild.github.io/api/#minify"}),"."]}),"\n",(0,s.jsx)(i.p,{children:"By default, this option is not set."}),"\n",(0,s.jsx)(i.h3,{id:"pure",children:(0,s.jsx)(i.code,{children:"pure"})}),"\n",(0,s.jsxs)(i.p,{children:["Add ",(0,s.jsx)(i.code,{children:"/* @__PURE__ */"})," annotation to the specified new or call expressions. This\ntells esbuild they can be removed if the resulting value is unused."]}),"\n",(0,s.jsxs)(i.p,{children:["See the full documentation at ",(0,s.jsx)(i.a,{href:"https://esbuild.github.io/api/#pure",children:"https://esbuild.github.io/api/#pure"}),"."]}),"\n",(0,s.jsx)(i.p,{children:"By default, this option is not set."}),"\n",(0,s.jsx)(i.h3,{id:"sourcemappaths",children:(0,s.jsx)(i.code,{children:"sourceMapPaths"})}),"\n",(0,s.jsx)(i.p,{children:"Determines whether paths in the output source map are absolute or relative to\nthe directory containing the source map."}),"\n",(0,s.jsxs)(i.p,{children:["Values: ",(0,s.jsx)(i.code,{children:"absolute"})," | ",(0,s.jsx)(i.code,{children:"relative"})]}),"\n",(0,s.jsxs)(i.p,{children:["Defaults to ",(0,s.jsx)(i.code,{children:"relative"}),"."]}),"\n",(0,s.jsx)(i.h3,{id:"strictmode",children:(0,s.jsx)(i.code,{children:"strictMode"})}),"\n",(0,s.jsxs)(i.p,{children:["By default, the ",(0,s.jsx)(i.code,{children:'"use strict";'})," directive is added by Babel and esbuild when\nlowering to ES5. You can save some bytes by telling this serializer to strip\nthem from the bundle."]}),"\n",(0,s.jsxs)(i.p,{children:["Note that disabling ",(0,s.jsx)(i.code,{children:"strictMode"})," here will definitely break source maps. It is\nrecommended to try disabling strict mode in Babel or TypeScript first before\nconsidering this option. If you can target ES6, that is a better alternative."]}),"\n",(0,s.jsx)(i.p,{children:"This flag only affects production environment."}),"\n",(0,s.jsxs)(i.p,{children:["Defaults to ",(0,s.jsx)(i.code,{children:"true"}),"."]}),"\n",(0,s.jsx)(i.h3,{id:"analyze",children:(0,s.jsx)(i.code,{children:"analyze"})}),"\n",(0,s.jsx)(i.p,{children:"Sets whether esbuild should output a report at the end of bundling."}),"\n",(0,s.jsxs)(i.p,{children:["See the full documentation at ",(0,s.jsx)(i.a,{href:"https://esbuild.github.io/api/#analyze",children:"https://esbuild.github.io/api/#analyze"}),"."]}),"\n",(0,s.jsxs)(i.p,{children:["Values: ",(0,s.jsx)(i.code,{children:"false"})," | ",(0,s.jsx)(i.code,{children:"true"})," | ",(0,s.jsx)(i.code,{children:"verbose"})]}),"\n",(0,s.jsxs)(i.p,{children:["Defaults to ",(0,s.jsx)(i.code,{children:"false"}),"."]}),"\n",(0,s.jsx)(i.h3,{id:"loglevel",children:(0,s.jsx)(i.code,{children:"logLevel"})}),"\n",(0,s.jsx)(i.p,{children:"The log level passed to esbuild."}),"\n",(0,s.jsxs)(i.p,{children:["See the full documentation at ",(0,s.jsx)(i.a,{href:"https://esbuild.github.io/api/#log-level",children:"https://esbuild.github.io/api/#log-level"})]}),"\n",(0,s.jsxs)(i.p,{children:["Values: ",(0,s.jsx)(i.code,{children:"verbose"})," | ",(0,s.jsx)(i.code,{children:"debug"})," | ",(0,s.jsx)(i.code,{children:"info"})," | ",(0,s.jsx)(i.code,{children:"warning"})," | ",(0,s.jsx)(i.code,{children:"error"})," | ",(0,s.jsx)(i.code,{children:"silent"})]}),"\n",(0,s.jsxs)(i.p,{children:["Defaults to ",(0,s.jsx)(i.code,{children:"warning"}),"."]}),"\n",(0,s.jsx)(i.h3,{id:"metafile",children:(0,s.jsx)(i.code,{children:"metafile"})}),"\n",(0,s.jsx)(i.p,{children:"The path to write metadata to, relative to the package root."}),"\n",(0,s.jsx)(i.p,{children:"Determines whether esbuild should produce some metadata about the build in JSON\nformat."}),"\n",(0,s.jsxs)(i.p,{children:["See the full documentation at ",(0,s.jsx)(i.a,{href:"https://esbuild.github.io/api/#metafile",children:"https://esbuild.github.io/api/#metafile"}),"."]}),"\n",(0,s.jsx)(i.h2,{id:"metro--esm-support",children:"Metro + ESM Support"}),"\n",(0,s.jsxs)(i.p,{children:["Metro currently does not support ESM. However, if you're looking to save even\nmore bytes, and are comfortable with solving CJS vs ESM resolution issues, you\ncan try adding ",(0,s.jsx)(i.code,{children:"module"})," to\n",(0,s.jsx)(i.a,{href:"https://facebook.github.io/metro/docs/configuration#resolvermainfields",children:(0,s.jsx)(i.code,{children:"resolver.resolverMainFields"})}),"\nin ",(0,s.jsx)(i.code,{children:"metro.config.js"}),". This will tell Metro to always pick ESM over CJS when\npossible. Note that this can lead to unexpected errors since you cannot import\nESM from CJS. Until ",(0,s.jsx)(i.a,{href:"https://github.com/facebook/metro/issues/670",children:"https://github.com/facebook/metro/issues/670"})," lands, you are\nbasically on your own to fix any issues that might come up."]}),"\n",(0,s.jsx)(i.h2,{id:"known-limitations",children:"Known Limitations"}),"\n",(0,s.jsxs)(i.ul,{children:["\n",(0,s.jsxs)(i.li,{children:["Dev server does not play well with ",(0,s.jsx)(i.code,{children:"esbuildTransformerConfig"}),". To work around\nthis limitation, you can save the esbuild specific Metro config to a separate\nfile and only specify it when needed, e.g.:","\n",(0,s.jsx)(i.pre,{children:(0,s.jsx)(i.code,{className:"language-sh",children:"react-native bundle ... --config metro+esbuild.config.js\n"})}),"\n"]}),"\n",(0,s.jsxs)(i.li,{children:["esbuild does not properly tree-shake ",(0,s.jsx)(i.code,{children:"export *"}),". This is a known limitation\n(see ",(0,s.jsx)(i.a,{href:"https://github.com/evanw/esbuild/issues/1420",children:"https://github.com/evanw/esbuild/issues/1420"}),"). It is also not recommended\nto use ",(0,s.jsx)(i.code,{children:"export *"})," in your code as they may lead to duplicate exports. For more\ndetails, read ",(0,s.jsx)(i.a,{href:"https://hackmd.io/Z021hgSGStKlYLwsqNMOcg",children:"https://hackmd.io/Z021hgSGStKlYLwsqNMOcg"}),". This can be mitigated\nwith an ESLint rule, such as ",(0,s.jsx)(i.code,{children:"no-export-all"})," from\n",(0,s.jsx)(i.a,{href:"https://github.com/microsoft/rnx-kit/tree/main/packages/eslint-plugin#readme",children:(0,s.jsx)(i.code,{children:"@rnx-kit/eslint-plugin"})}),"."]}),"\n",(0,s.jsxs)(i.li,{children:["esbuild is incompatible with\n",(0,s.jsx)(i.a,{href:"https://facebook.github.io/metro/docs/bundling/#indexed-ram-bundle",children:"RAM bundle"}),".\nIf you require RAM bundles, you cannot use this serializer. In fact, Metro\nwill simply ignore it."]}),"\n"]})]})}function h(e={}){const{wrapper:i}={...(0,t.a)(),...e.components};return i?(0,s.jsx)(i,{...e,children:(0,s.jsx)(c,{...e})}):c(e)}},1151:(e,i,n)=>{n.d(i,{Z:()=>l,a:()=>r});var s=n(7294);const t={},o=s.createContext(t);function r(e){const i=s.useContext(o);return s.useMemo((function(){return"function"==typeof e?e(i):{...i,...e}}),[i,e])}function l(e){let i;return i=e.disableParentContext?"function"==typeof e.components?e.components(t):e.components||t:r(e.components),s.createElement(o.Provider,{value:i},e.children)}}}]);