"use strict";(self.webpackChunk_rnx_kit_docsite=self.webpackChunk_rnx_kit_docsite||[]).push([[3737],{7157:(t,e,r)=>{r.r(e),r.d(e,{assets:()=>c,contentTitle:()=>i,default:()=>h,frontMatter:()=>n,metadata:()=>l,toc:()=>d});var s=r(4848),o=r(8453);const n={},i="tools-react-native",l={id:"tools/tools-react-native",title:"tools-react-native",description:"Build",source:"@site/docs/tools/tools-react-native.md",sourceDirName:"tools",slug:"/tools/tools-react-native",permalink:"/rnx-kit/docs/tools/tools-react-native",draft:!1,unlisted:!1,editUrl:"https://github.com/microsoft/rnx-kit/tree/main/docsite/docs/tools/tools-react-native.md",tags:[],version:"current",frontMatter:{},sidebar:"toolsSidebar",previous:{title:"tools-node",permalink:"/rnx-kit/docs/tools/tools-node"},next:{title:"tools-shell",permalink:"/rnx-kit/docs/tools/tools-shell"}},c={},d=[];function a(t){const e={a:"a",code:"code",h1:"h1",header:"header",img:"img",p:"p",pre:"pre",table:"table",tbody:"tbody",td:"td",th:"th",thead:"thead",tr:"tr",...(0,o.R)(),...t.components};return(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(e.header,{children:(0,s.jsx)(e.h1,{id:"tools-react-native",children:"tools-react-native"})}),"\n",(0,s.jsxs)(e.p,{children:[(0,s.jsx)(e.a,{href:"https://github.com/microsoft/rnx-kit/actions/workflows/build.yml",children:(0,s.jsx)(e.img,{src:"https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg",alt:"Build"})}),"\n",(0,s.jsx)(e.a,{href:"https://www.npmjs.com/package/@rnx-kit/tools-react-native",children:(0,s.jsx)(e.img,{src:"https://img.shields.io/npm/v/@rnx-kit/tools-react-native",alt:"npm version"})})]}),"\n",(0,s.jsxs)(e.p,{children:[(0,s.jsx)(e.code,{children:"@rnx-kit/tools-react-native"})," is a collection of supplemental react-native\nfunctions and types."]}),"\n",(0,s.jsx)(e.p,{children:"You can import the entire package, or, to save space, import individual\ncategories:"}),"\n",(0,s.jsx)(e.pre,{children:(0,s.jsx)(e.code,{className:"language-typescript",children:'import * as tools from "@rnx-kit/tools-react-native";\n\n// Alternatively...\nimport * as metroTools from "@rnx-kit/tools-react-native/metro";\nimport * as platformTools from "@rnx-kit/tools-react-native/platform";\n'})}),"\n",(0,s.jsxs)(e.table,{children:[(0,s.jsx)(e.thead,{children:(0,s.jsxs)(e.tr,{children:[(0,s.jsx)(e.th,{children:"Category"}),(0,s.jsx)(e.th,{children:"Type Name"}),(0,s.jsx)(e.th,{children:"Description"})]})}),(0,s.jsx)(e.tbody,{children:(0,s.jsxs)(e.tr,{children:[(0,s.jsx)(e.td,{children:"platform"}),(0,s.jsx)(e.td,{children:"AllPlatforms"}),(0,s.jsx)(e.td,{children:"List of supported react-native platforms."})]})})]}),"\n",(0,s.jsxs)(e.table,{children:[(0,s.jsx)(e.thead,{children:(0,s.jsxs)(e.tr,{children:[(0,s.jsx)(e.th,{children:"Category"}),(0,s.jsx)(e.th,{children:"Function"}),(0,s.jsx)(e.th,{children:"Description"})]})}),(0,s.jsxs)(e.tbody,{children:[(0,s.jsxs)(e.tr,{children:[(0,s.jsx)(e.td,{children:"context"}),(0,s.jsx)(e.td,{children:(0,s.jsx)(e.code,{children:"loadContext(root)"})}),(0,s.jsxs)(e.td,{children:["Equivalent to calling ",(0,s.jsx)(e.code,{children:"loadConfig()"})," from ",(0,s.jsx)(e.code,{children:"@react-native-community/cli"}),", but the result is cached for faster subsequent accesses."]})]}),(0,s.jsxs)(e.tr,{children:[(0,s.jsx)(e.td,{children:"context"}),(0,s.jsx)(e.td,{children:(0,s.jsx)(e.code,{children:"resolveCommunityCLI(root, reactNativePath)"})}),(0,s.jsxs)(e.td,{children:["Finds path to ",(0,s.jsx)(e.code,{children:"@react-native-community/cli"}),"."]})]}),(0,s.jsxs)(e.tr,{children:[(0,s.jsx)(e.td,{children:"metro"}),(0,s.jsx)(e.td,{children:(0,s.jsx)(e.code,{children:"findMetroPath(projectRoot)"})}),(0,s.jsx)(e.td,{children:"Finds the installation path of Metro."})]}),(0,s.jsxs)(e.tr,{children:[(0,s.jsx)(e.td,{children:"metro"}),(0,s.jsx)(e.td,{children:(0,s.jsx)(e.code,{children:"getMetroVersion(projectRoot)"})}),(0,s.jsx)(e.td,{children:"Returns Metro version number."})]}),(0,s.jsxs)(e.tr,{children:[(0,s.jsx)(e.td,{children:"metro"}),(0,s.jsx)(e.td,{children:(0,s.jsx)(e.code,{children:"requireModuleFromMetro(moduleName, fromDir)"})}),(0,s.jsxs)(e.td,{children:["Imports specified module starting from the installation directory of the currently used ",(0,s.jsx)(e.code,{children:"metro"})," version."]})]}),(0,s.jsxs)(e.tr,{children:[(0,s.jsx)(e.td,{children:"platform"}),(0,s.jsx)(e.td,{children:(0,s.jsx)(e.code,{children:"expandPlatformExtensions(platform, extensions)"})}),(0,s.jsx)(e.td,{children:"Returns a list of extensions that should be tried for the target platform in prioritized order."})]}),(0,s.jsxs)(e.tr,{children:[(0,s.jsx)(e.td,{children:"platform"}),(0,s.jsx)(e.td,{children:(0,s.jsx)(e.code,{children:"getAvailablePlatforms(startDir)"})}),(0,s.jsx)(e.td,{children:"Returns a map of available React Native platforms. The result is cached."})]}),(0,s.jsxs)(e.tr,{children:[(0,s.jsx)(e.td,{children:"platform"}),(0,s.jsx)(e.td,{children:(0,s.jsx)(e.code,{children:"getAvailablePlatformsUncached(startDir, platformMap)"})}),(0,s.jsx)(e.td,{children:"Returns a map of available React Native platforms. The result is NOT cached."})]}),(0,s.jsxs)(e.tr,{children:[(0,s.jsx)(e.td,{children:"platform"}),(0,s.jsx)(e.td,{children:(0,s.jsx)(e.code,{children:"parsePlatform(val)"})}),(0,s.jsx)(e.td,{children:"Parse a string to ensure it maps to a valid react-native platform."})]}),(0,s.jsxs)(e.tr,{children:[(0,s.jsx)(e.td,{children:"platform"}),(0,s.jsx)(e.td,{children:(0,s.jsx)(e.code,{children:"platformExtensions(platform)"})}),(0,s.jsx)(e.td,{children:"Returns file extensions that can be mapped to the target platform."})]})]})]})]})}function h(t={}){const{wrapper:e}={...(0,o.R)(),...t.components};return e?(0,s.jsx)(e,{...t,children:(0,s.jsx)(a,{...t})}):a(t)}},8453:(t,e,r)=>{r.d(e,{R:()=>i,x:()=>l});var s=r(6540);const o={},n=s.createContext(o);function i(t){const e=s.useContext(n);return s.useMemo((function(){return"function"==typeof t?t(e):{...e,...t}}),[e,t])}function l(t){let e;return e=t.disableParentContext?"function"==typeof t.components?t.components(o):t.components||o:i(t.components),s.createElement(n.Provider,{value:e},t.children)}}}]);