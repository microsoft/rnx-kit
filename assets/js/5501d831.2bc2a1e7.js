"use strict";(self.webpackChunk_rnx_kit_docsite=self.webpackChunk_rnx_kit_docsite||[]).push([[6176],{4535:(e,n,i)=>{i.r(n),i.d(n,{assets:()=>c,contentTitle:()=>l,default:()=>h,frontMatter:()=>s,metadata:()=>d,toc:()=>o});var r=i(4848),t=i(8453);const s={},l="cli",d={id:"tools/cli",title:"cli",description:"Build",source:"@site/docs/tools/cli.md",sourceDirName:"tools",slug:"/tools/cli",permalink:"/rnx-kit/docs/tools/cli",draft:!1,unlisted:!1,editUrl:"https://github.com/microsoft/rnx-kit/tree/main/docsite/docs/tools/cli.md",tags:[],version:"current",frontMatter:{},sidebar:"toolsSidebar",previous:{title:"bundle-diff",permalink:"/rnx-kit/docs/tools/bundle-diff"},next:{title:"config",permalink:"/rnx-kit/docs/tools/config"}},c={},o=[{value:"<code>rnx-cli bundle</code>",id:"rnx-cli-bundle",level:2},{value:"Example Usages",id:"example-usages",level:3},{value:"Example Configuration (Optional)",id:"example-configuration-optional",level:3},{value:"Bundle Defaults",id:"bundle-defaults",level:3},{value:"Command-Line Overrides",id:"command-line-overrides",level:3},{value:"<code>rnx-cli start</code>",id:"rnx-cli-start",level:2},{value:"Example Commands",id:"example-commands",level:3},{value:"Example Configuration",id:"example-configuration",level:3},{value:"Server Defaults",id:"server-defaults",level:3},{value:"Command-Line Overrides",id:"command-line-overrides-1",level:3},{value:"<code>rnx-cli build</code>",id:"rnx-cli-build",level:2},{value:"Example Commands",id:"example-commands-1",level:3},{value:"<code>rnx-cli run</code>",id:"rnx-cli-run",level:2},{value:"Example Commands",id:"example-commands-2",level:3},{value:"<code>rnx-cli align-deps</code>",id:"rnx-cli-align-deps",level:2},{value:"<code>rnx-cli clean</code>",id:"rnx-cli-clean",level:2},{value:"<code>rnx-cli write-third-party-notices</code>",id:"rnx-cli-write-third-party-notices",level:2},{value:"Other Commands",id:"other-commands",level:2}];function a(e){const n={a:"a",blockquote:"blockquote",code:"code",h1:"h1",h2:"h2",h3:"h3",header:"header",img:"img",li:"li",p:"p",pre:"pre",strong:"strong",table:"table",tbody:"tbody",td:"td",th:"th",thead:"thead",tr:"tr",ul:"ul",...(0,t.R)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(n.header,{children:(0,r.jsx)(n.h1,{id:"cli",children:"cli"})}),"\n",(0,r.jsxs)(n.p,{children:[(0,r.jsx)(n.a,{href:"https://github.com/microsoft/rnx-kit/actions/workflows/build.yml",children:(0,r.jsx)(n.img,{src:"https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg",alt:"Build"})}),"\n",(0,r.jsx)(n.a,{href:"https://www.npmjs.com/package/@rnx-kit/cli",children:(0,r.jsx)(n.img,{src:"https://img.shields.io/npm/v/@rnx-kit/cli",alt:"npm version"})})]}),"\n",(0,r.jsx)(n.p,{children:"Command-line interface for working with packages in your repo."}),"\n",(0,r.jsxs)(n.blockquote,{children:["\n",(0,r.jsx)(n.p,{children:"[!NOTE]"}),"\n",(0,r.jsxs)(n.p,{children:["All commands below are also a plugin to ",(0,r.jsx)(n.code,{children:"@react-native-community/cli"}),", meaning\nthey will work with both ",(0,r.jsx)(n.code,{children:"react-native"})," and ",(0,r.jsx)(n.code,{children:"rnc-cli"})," commands. Just make sure\nto prefix the command with ",(0,r.jsx)(n.code,{children:"rnx-"})," e.g., ",(0,r.jsx)(n.code,{children:"rnx-cli start"})," becomes\n",(0,r.jsx)(n.code,{children:"react-native rnx-start"}),". The prefix is to avoid name clashes."]}),"\n"]}),"\n",(0,r.jsx)(n.h2,{id:"rnx-cli-bundle",children:(0,r.jsx)(n.code,{children:"rnx-cli bundle"})}),"\n",(0,r.jsxs)(n.p,{children:["Bundle a package using ",(0,r.jsx)(n.a,{href:"https://facebook.github.io/metro",children:"Metro"}),". The bundling process uses optional\n",(0,r.jsx)(n.a,{href:"https://github.com/microsoft/rnx-kit/tree/main/packages/config#readme",children:"configuration"})," parameters and command-line overrides."]}),"\n",(0,r.jsxs)(n.blockquote,{children:["\n",(0,r.jsx)(n.p,{children:"[!NOTE]"}),"\n",(0,r.jsxs)(n.p,{children:["This command is meant to be a drop-in replacement for ",(0,r.jsx)(n.code,{children:"react-native bundle"}),".\nIf ",(0,r.jsx)(n.code,{children:"rnx-bundle"})," ever becomes widely accepted, we will work on upstreaming it\nto ",(0,r.jsx)(n.code,{children:"@react-native-community/cli"}),", along with supporting libraries for package\nconfiguration and Metro plugins."]}),"\n"]}),"\n",(0,r.jsx)(n.h3,{id:"example-usages",children:"Example Usages"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-sh",children:"yarn rnx-cli bundle\n"})}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-sh",children:"yarn rnx-cli bundle                \\\n    --entry-file src/index.ts      \\\n    --bundle-output main.jsbundle  \\\n    --platform ios                 \\\n    --dev false                    \\\n    --minify true\n"})}),"\n",(0,r.jsx)(n.h3,{id:"example-configuration-optional",children:"Example Configuration (Optional)"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-json",children:'{\n  "rnx-kit": {\n    "bundle": {\n      "entryFile": "entry.js",\n      "assetsDest": "dist",\n      "plugins": [\n        "@rnx-kit/metro-plugin-cyclic-dependencies-detector",\n        [\n          "@rnx-kit/metro-plugin-duplicates-checker",\n          { "ignoredModules": ["react-is"] }\n        ],\n        "@rnx-kit/metro-plugin-typescript"\n      ],\n      "targets": ["android", "ios", "macos", "windows"],\n      "platforms": {\n        "android": {\n          "assetsDest": "dist/res"\n        },\n        "macos": {\n          "plugins": [\n            "@rnx-kit/metro-plugin-cyclic-dependencies-detector",\n            [\n              "@rnx-kit/metro-plugin-duplicates-checker",\n              { "ignoredModules": ["react-is"] }\n            ]\n          ]\n        }\n      }\n    }\n  }\n}\n'})}),"\n",(0,r.jsx)(n.h3,{id:"bundle-defaults",children:"Bundle Defaults"}),"\n",(0,r.jsx)(n.p,{children:"When certain parameters aren't specified in configuration or on the\ncommand-line, they are explicitly set to default values."}),"\n",(0,r.jsxs)(n.table,{children:[(0,r.jsx)(n.thead,{children:(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.th,{children:"Parameter"}),(0,r.jsx)(n.th,{children:"Default Value"})]})}),(0,r.jsxs)(n.tbody,{children:[(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"entryFile"}),(0,r.jsx)(n.td,{children:(0,r.jsx)(n.code,{children:'"index.js"'})})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"bundleOutput"}),(0,r.jsxs)(n.td,{children:[(0,r.jsx)(n.code,{children:'"index.<platform>.bundle"'})," (Windows, Android) or ",(0,r.jsx)(n.code,{children:'"index.<platform>.jsbundle"'})," (iOS, macOS)"]})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"hermes"}),(0,r.jsx)(n.td,{children:(0,r.jsx)(n.code,{children:"false"})})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"treeShake"}),(0,r.jsx)(n.td,{children:(0,r.jsx)(n.code,{children:"false"})})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"plugins"}),(0,r.jsx)(n.td,{children:(0,r.jsx)(n.code,{children:'["@rnx-kit/metro-plugin-cyclic-dependencies-detector", "@rnx-kit/metro-plugin-duplicates-checker", "@rnx-kit/metro-plugin-typescript"]'})})]})]})]}),"\n",(0,r.jsx)(n.p,{children:"Other parameters have implicit defaults, buried deep in Metro or its\ndependencies."}),"\n",(0,r.jsx)(n.h3,{id:"command-line-overrides",children:"Command-Line Overrides"}),"\n",(0,r.jsxs)(n.table,{children:[(0,r.jsx)(n.thead,{children:(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.th,{children:"Option"}),(0,r.jsx)(n.th,{children:"Description"})]})}),(0,r.jsxs)(n.tbody,{children:[(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--id <id>"}),(0,r.jsx)(n.td,{children:"Target bundle definition; only needed when the rnx-kit configuration has multiple bundle definitions"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--entry-file <path>"}),(0,r.jsx)(n.td,{children:"Path to the root JavaScript or TypeScript file, either absolute or relative to the package"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--platform <ios|android|windows|win32|macos>"}),(0,r.jsx)(n.td,{children:"Target platform; when unspecified, all platforms in the rnx-kit configuration are bundled"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--dev [boolean]"}),(0,r.jsx)(n.td,{children:"If false, warnings are disabled and the bundle is minified"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--minify [boolean]"}),(0,r.jsx)(n.td,{children:"Controls whether or not the bundle is minified (useful for test builds)"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--bundle-output <string>"}),(0,r.jsx)(n.td,{children:"Path to the output bundle file, either absolute or relative to the package"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--bundle-encoding <utf8|utf16le|ascii>"}),(0,r.jsx)(n.td,{children:"Character encoding to use when writing the bundle file"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--max-workers <number>"}),(0,r.jsx)(n.td,{children:"Specifies the maximum number of parallel worker threads to use for transforming files; defaults to the number of cores available on your machine"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--sourcemap-output <string>"}),(0,r.jsx)(n.td,{children:"Path where the bundle source map is written, either absolute or relative to the package"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--sourcemap-sources-root <string>"}),(0,r.jsx)(n.td,{children:"Path to use when relativizing file entries in the bundle source map"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--sourcemap-use-absolute-path"}),(0,r.jsx)(n.td,{children:"Report SourceMapURL using its full path"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--assets-dest <path>"}),(0,r.jsx)(n.td,{children:"Path where bundle assets like images are written, either absolute or relative to the package; if unspecified, assets are ignored"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--unstable-transform-profile <string>"}),(0,r.jsx)(n.td,{children:"[Experimental] Transform JS for a specific JS engine; currently supported: hermes, hermes-canary, default"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--reset-cache"}),(0,r.jsx)(n.td,{children:"Reset the Metro cache"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--config <string>"}),(0,r.jsx)(n.td,{children:"Path to the Metro configuration file"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--tree-shake [boolean]"}),(0,r.jsx)(n.td,{children:"Enable tree shaking to remove unused code and reduce the bundle size"})]})]})]}),"\n",(0,r.jsx)(n.h2,{id:"rnx-cli-start",children:(0,r.jsx)(n.code,{children:"rnx-cli start"})}),"\n",(0,r.jsxs)(n.p,{children:["Start a bundle server for a package using ",(0,r.jsx)(n.a,{href:"https://facebook.github.io/metro",children:"Metro"}),". The bundle server uses\noptional ",(0,r.jsx)(n.a,{href:"https://github.com/microsoft/rnx-kit/tree/main/packages/config#readme",children:"configuration"})," parameters and command-line overrides."]}),"\n",(0,r.jsxs)(n.blockquote,{children:["\n",(0,r.jsx)(n.p,{children:"[!NOTE]"}),"\n",(0,r.jsxs)(n.p,{children:["This command is meant to be a drop-in replacement for ",(0,r.jsx)(n.code,{children:"react-native start"}),". If\n",(0,r.jsx)(n.code,{children:"rnx-start"})," ever becomes widely accepted, we will work on upstreaming it to\n",(0,r.jsx)(n.code,{children:"@react-native-community/cli"}),", along with supporting libraries for package\nconfiguration and Metro plugins."]}),"\n"]}),"\n",(0,r.jsx)(n.h3,{id:"example-commands",children:"Example Commands"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-sh",children:"yarn rnx-cli start\n"})}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-sh",children:"yarn rnx-cli start --host 127.0.0.1 --port 8812\n"})}),"\n",(0,r.jsx)(n.h3,{id:"example-configuration",children:"Example Configuration"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-json",children:'{\n  "rnx-kit": {\n    "server": {\n      "projectRoot": "src",\n      "plugins": [\n        "@rnx-kit/metro-plugin-cyclic-dependencies-detector",\n        [\n          "@rnx-kit/metro-plugin-duplicates-checker",\n          {\n            "ignoredModules": ["react-is"],\n            "throwOnError": false\n          }\n        ],\n        "@rnx-kit/metro-plugin-typescript"\n      ]\n    }\n  }\n}\n'})}),"\n",(0,r.jsx)(n.h3,{id:"server-defaults",children:"Server Defaults"}),"\n",(0,r.jsxs)(n.p,{children:["If the server configuration is not defined, it is implicitly created at runtime\nfrom the bundle configuration (or its ",(0,r.jsx)(n.a,{href:"#bundle-defaults",children:"defaults"}),")."]}),"\n",(0,r.jsx)(n.h3,{id:"command-line-overrides-1",children:"Command-Line Overrides"}),"\n",(0,r.jsxs)(n.table,{children:[(0,r.jsx)(n.thead,{children:(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.th,{children:"Option"}),(0,r.jsx)(n.th,{children:"Description"})]})}),(0,r.jsxs)(n.tbody,{children:[(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--port <number>"}),(0,r.jsx)(n.td,{children:"Host port to use when listening for incoming server requests"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--host <string>"}),(0,r.jsx)(n.td,{children:"Host name or address to bind when listening for incoming server requests; when not specified, requests from all addresses are accepted"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--project-root <path>"}),(0,r.jsx)(n.td,{children:"Path to the root of your react-native project; the bundle server uses this path to resolve all web requests"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--watch-folders <paths>"}),(0,r.jsx)(n.td,{children:"Additional folders which will be added to the watched files list, comma-separated; by default, Metro watches all project files"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--asset-plugins <list>"}),(0,r.jsx)(n.td,{children:"Additional asset plugins to be used by Metro's Babel transformer; comma-separated list containing plugin module names or absolute paths to plugin packages"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--source-exts <list>"}),(0,r.jsx)(n.td,{children:"Additional source file extensions to include when generating bundles; comma-separated list, excluding the leading dot"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--max-workers <number>"}),(0,r.jsx)(n.td,{children:"Specifies the maximum number of parallel worker threads to use for transforming files; defaults to the number of cores available on your machine"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--reset-cache"}),(0,r.jsx)(n.td,{children:"Reset the Metro cache"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--custom-log-reporter-path <string>"}),(0,r.jsx)(n.td,{children:"Path to a JavaScript file which exports a Metro 'TerminalReporter' function; replaces the default reporter that writes all messages to the Metro console"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--https"}),(0,r.jsx)(n.td,{children:"Use a secure (https) web server; when not specified, an insecure (http) web server is used"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--key <path>"}),(0,r.jsx)(n.td,{children:"Path to a custom SSL private key file to use for secure (https) communication"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--cert <path>"}),(0,r.jsx)(n.td,{children:"Path to a custom SSL certificate file to use for secure (https) communication"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--config <string>"}),(0,r.jsx)(n.td,{children:"Path to the Metro configuration file"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--no-interactive"}),(0,r.jsx)(n.td,{children:"Disables interactive mode"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--id <string>"}),(0,r.jsx)(n.td,{children:"Specify which bundle configuration to use if server configuration is missing"})]})]})]}),"\n",(0,r.jsx)(n.h2,{id:"rnx-cli-build",children:(0,r.jsx)(n.code,{children:"rnx-cli build"})}),"\n",(0,r.jsx)(n.p,{children:"Builds the native bits in your project."}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-sh",children:"yarn rnx-cli build [options]\n"})}),"\n",(0,r.jsxs)(n.table,{children:[(0,r.jsx)(n.thead,{children:(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.th,{children:"Option"}),(0,r.jsx)(n.th,{children:"Description"})]})}),(0,r.jsxs)(n.tbody,{children:[(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"-p, --platform <string>"}),(0,r.jsx)(n.td,{children:"Target platform"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--workspace <string>"}),(0,r.jsx)(n.td,{children:"Path, relative to project root, of the Xcode workspace to build (macOS only)"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--scheme <string>"}),(0,r.jsx)(n.td,{children:"Name of scheme to build (Apple platforms only)"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--configuration <string>"}),(0,r.jsx)(n.td,{children:"Build configuration for building the app; 'Debug' or 'Release'"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--destination <string>"}),(0,r.jsx)(n.td,{children:"Destination of the built app; 'device', 'emulator', or 'simulator'"})]})]})]}),"\n",(0,r.jsx)(n.h3,{id:"example-commands-1",children:"Example Commands"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-sh",children:"yarn rnx-cli build -p ios\n"})}),"\n",(0,r.jsx)(n.h2,{id:"rnx-cli-run",children:(0,r.jsx)(n.code,{children:"rnx-cli run"})}),"\n",(0,r.jsx)(n.p,{children:"Launches the native app (building it first if necessary)."}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-sh",children:"yarn rnx-cli run [options]\n"})}),"\n",(0,r.jsxs)(n.table,{children:[(0,r.jsx)(n.thead,{children:(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.th,{children:"Option"}),(0,r.jsx)(n.th,{children:"Description"})]})}),(0,r.jsxs)(n.tbody,{children:[(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"-p, --platform <string>"}),(0,r.jsx)(n.td,{children:"Target platform"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--workspace <string>"}),(0,r.jsx)(n.td,{children:"Path, relative to project root, of the Xcode workspace to build (macOS only)"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--scheme <string>"}),(0,r.jsx)(n.td,{children:"Name of scheme to build (Apple platforms only)"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--configuration <string>"}),(0,r.jsx)(n.td,{children:"Build configuration for building the app; 'Debug' or 'Release'"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--destination <string>"}),(0,r.jsx)(n.td,{children:"Destination of the built app; 'device', 'emulator', or 'simulator'"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"-d, --device <string>"}),(0,r.jsx)(n.td,{children:"The name of the device to launch the app in"})]})]})]}),"\n",(0,r.jsx)(n.h3,{id:"example-commands-2",children:"Example Commands"}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-sh",children:"yarn rnx-cli run -p ios\n"})}),"\n",(0,r.jsx)(n.h2,{id:"rnx-cli-align-deps",children:(0,r.jsx)(n.code,{children:"rnx-cli align-deps"})}),"\n",(0,r.jsx)(n.p,{children:"Manage dependencies within a repository and across many repositories."}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-sh",children:"yarn rnx-cli align-deps [options] [/path/to/package.json]\n"})}),"\n",(0,r.jsxs)(n.p,{children:["Refer to ",(0,r.jsx)(n.a,{href:"https://github.com/microsoft/rnx-kit/tree/main/packages/align-deps#readme",children:"@rnx-kit/align-deps"})," for details."]}),"\n",(0,r.jsx)(n.h2,{id:"rnx-cli-clean",children:(0,r.jsx)(n.code,{children:"rnx-cli clean"})}),"\n",(0,r.jsx)(n.p,{children:"Cleans your project by removing React Native related caches and modules."}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-sh",children:"yarn rnx-cli clean [options]\n"})}),"\n",(0,r.jsxs)(n.table,{children:[(0,r.jsx)(n.thead,{children:(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.th,{children:"Option"}),(0,r.jsx)(n.th,{children:"Description"})]})}),(0,r.jsxs)(n.tbody,{children:[(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--include <android,cocoapods,metro,npm,watchman,yarn>"}),(0,r.jsxs)(n.td,{children:["Comma-separated flag of caches to clear e.g., ",(0,r.jsx)(n.code,{children:"npm,yarn"})]})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--project-root <path>"}),(0,r.jsx)(n.td,{children:"Root path to your React Native project"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--verify-cache"}),(0,r.jsx)(n.td,{children:"Whether to verify the integrity of the cache"})]})]})]}),"\n",(0,r.jsx)(n.h2,{id:"rnx-cli-write-third-party-notices",children:(0,r.jsx)(n.code,{children:"rnx-cli write-third-party-notices"})}),"\n",(0,r.jsx)(n.p,{children:"Generate a third-party notice, an aggregation of all the LICENSE files from your\npackage's dependencies."}),"\n",(0,r.jsxs)(n.blockquote,{children:["\n",(0,r.jsx)(n.p,{children:"[!NOTE]"}),"\n",(0,r.jsxs)(n.p,{children:["A third-party notice is a ",(0,r.jsx)(n.strong,{children:"legal document"}),". You are solely responsble for\nits content, even if you use this command to assist you in generating it. You\nshould consult with an attorney to ensure your notice meets all legal\nrequirements."]}),"\n"]}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-sh",children:"yarn rnx-cli write-third-party-notices [options]\n"})}),"\n",(0,r.jsxs)(n.table,{children:[(0,r.jsx)(n.thead,{children:(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.th,{children:"Option"}),(0,r.jsx)(n.th,{children:"Description"})]})}),(0,r.jsxs)(n.tbody,{children:[(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--root-path <path>"}),(0,r.jsx)(n.td,{children:"The root of the repo to start resolving modules from"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--source-map-file <path>"}),(0,r.jsx)(n.td,{children:"The source map file to generate license contents for"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--json"}),(0,r.jsx)(n.td,{children:"Output license information as a JSON"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--output-file <path>"}),(0,r.jsx)(n.td,{children:"The output file to write the license file to"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--ignore-scopes <string>"}),(0,r.jsx)(n.td,{children:"npm scopes to ignore and not emit license information for"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--ignore-modules <string>"}),(0,r.jsx)(n.td,{children:"Modules (JS packages) to not emit license information for"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--preamble-text <string>"}),(0,r.jsx)(n.td,{children:"A list of lines to prepend at the start of the generated license file"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--additional-text <string>"}),(0,r.jsx)(n.td,{children:"A list of lines to append at the end of the generated license file"})]}),(0,r.jsxs)(n.tr,{children:[(0,r.jsx)(n.td,{children:"--full-license-text"}),(0,r.jsx)(n.td,{children:"Include full license text in the JSON output"})]})]})]}),"\n",(0,r.jsx)(n.h2,{id:"other-commands",children:"Other Commands"}),"\n",(0,r.jsxs)(n.p,{children:["The following commands route to ",(0,r.jsx)(n.code,{children:"@react-native-community/cli"}),":"]}),"\n",(0,r.jsxs)(n.ul,{children:["\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.code,{children:"rnx-cli build-android"})," \u2192\n",(0,r.jsx)(n.a,{href:"https://github.com/react-native-community/cli/blob/main/packages/cli-platform-android#build-android",children:(0,r.jsx)(n.code,{children:"react-native build-android"})})]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.code,{children:"rnx-cli build-ios"})," \u2192\n",(0,r.jsx)(n.a,{href:"https://github.com/react-native-community/cli/blob/main/packages/cli-platform-ios#build-ios",children:(0,r.jsx)(n.code,{children:"react-native build-ios"})})]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.code,{children:"rnx-cli config"})," \u2192\n",(0,r.jsx)(n.a,{href:"https://github.com/react-native-community/cli/blob/main/packages/cli-config#readme",children:(0,r.jsx)(n.code,{children:"react-native config"})})]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.code,{children:"rnx-cli doctor"})," \u2192\n",(0,r.jsx)(n.a,{href:"https://github.com/react-native-community/cli/blob/main/packages/cli-doctor#readme",children:(0,r.jsx)(n.code,{children:"react-native doctor"})})]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.code,{children:"rnx-cli info"})," \u2192\n",(0,r.jsx)(n.a,{href:"https://github.com/react-native-community/cli/blob/main/packages/cli-doctor#info",children:(0,r.jsx)(n.code,{children:"react-native info"})})]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.code,{children:"rnx-cli log-android"})," \u2192\n",(0,r.jsx)(n.a,{href:"https://github.com/react-native-community/cli/blob/main/packages/cli-platform-android#log-android",children:(0,r.jsx)(n.code,{children:"react-native log-android"})})]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.code,{children:"rnx-cli log-ios"})," \u2192\n",(0,r.jsx)(n.a,{href:"https://github.com/react-native-community/cli/blob/main/packages/cli-platform-ios#log-ios",children:(0,r.jsx)(n.code,{children:"react-native log-ios"})})]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.code,{children:"rnx-cli run-android"})," \u2192\n",(0,r.jsx)(n.a,{href:"https://github.com/react-native-community/cli/blob/main/packages/cli-platform-android#run-android",children:(0,r.jsx)(n.code,{children:"react-native run-android"})})]}),"\n",(0,r.jsxs)(n.li,{children:[(0,r.jsx)(n.code,{children:"rnx-cli run-ios"})," \u2192\n",(0,r.jsx)(n.a,{href:"https://github.com/react-native-community/cli/blob/main/packages/cli-platform-ios#run-ios",children:(0,r.jsx)(n.code,{children:"react-native run-ios"})})]}),"\n"]})]})}function h(e={}){const{wrapper:n}={...(0,t.R)(),...e.components};return n?(0,r.jsx)(n,{...e,children:(0,r.jsx)(a,{...e})}):a(e)}},8453:(e,n,i)=>{i.d(n,{R:()=>l,x:()=>d});var r=i(6540);const t={},s=r.createContext(t);function l(e){const n=r.useContext(s);return r.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function d(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(t):e.components||t:l(e.components),r.createElement(s.Provider,{value:n},e.children)}}}]);