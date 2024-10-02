"use strict";(self.webpackChunk_rnx_kit_docsite=self.webpackChunk_rnx_kit_docsite||[]).push([[8059],{3113:(e,r,i)=>{i.r(r),i.d(r,{assets:()=>l,contentTitle:()=>o,default:()=>m,frontMatter:()=>s,metadata:()=>c,toc:()=>a});var t=i(4848),n=i(8453);const s={},o="metro-serializer",c={id:"tools/metro-serializer",title:"metro-serializer",description:"Build",source:"@site/docs/tools/metro-serializer.md",sourceDirName:"tools",slug:"/tools/metro-serializer",permalink:"/rnx-kit/docs/tools/metro-serializer",draft:!1,unlisted:!1,editUrl:"https://github.com/microsoft/rnx-kit/tree/main/docsite/docs/tools/metro-serializer.md",tags:[],version:"current",frontMatter:{},sidebar:"toolsSidebar",previous:{title:"metro-resolver-symlinks",permalink:"/rnx-kit/docs/tools/metro-resolver-symlinks"},next:{title:"metro-serializer-esbuild",permalink:"/rnx-kit/docs/tools/metro-serializer-esbuild"}},l={},a=[{value:"Usage",id:"usage",level:2}];function d(e){const r={a:"a",code:"code",h1:"h1",h2:"h2",header:"header",img:"img",p:"p",pre:"pre",...(0,n.R)(),...e.components};return(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(r.header,{children:(0,t.jsx)(r.h1,{id:"metro-serializer",children:"metro-serializer"})}),"\n",(0,t.jsxs)(r.p,{children:[(0,t.jsx)(r.a,{href:"https://github.com/microsoft/rnx-kit/actions/workflows/build.yml",children:(0,t.jsx)(r.img,{src:"https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg",alt:"Build"})}),"\n",(0,t.jsx)(r.a,{href:"https://www.npmjs.com/package/@rnx-kit/metro-serializer",children:(0,t.jsx)(r.img,{src:"https://img.shields.io/npm/v/@rnx-kit/metro-serializer",alt:"npm version"})})]}),"\n",(0,t.jsxs)(r.p,{children:[(0,t.jsx)(r.code,{children:"@rnx-kit/metro-serializer"})," is Metro's default JavaScript bundle serializer, but\nwith support for plugins."]}),"\n",(0,t.jsx)(r.h2,{id:"usage",children:"Usage"}),"\n",(0,t.jsxs)(r.p,{children:["Import and set the serializer to ",(0,t.jsx)(r.code,{children:"serializer.customSerializer"})," in your\n",(0,t.jsx)(r.code,{children:"metro.config.js"}),", then add your desired plugins. For instance, to add\n",(0,t.jsx)(r.code,{children:"CyclicDependencies"})," and ",(0,t.jsx)(r.code,{children:"DuplicateDependencies"})," plugins:"]}),"\n",(0,t.jsx)(r.pre,{children:(0,t.jsx)(r.code,{className:"language-diff",children:' const { makeMetroConfig } = require("@rnx-kit/metro-config");\n+const {\n+  CyclicDependencies,\n+} = require("@rnx-kit/metro-plugin-cyclic-dependencies-detector");\n+const {\n+  DuplicateDependencies,\n+} = require("@rnx-kit/metro-plugin-duplicates-checker");\n+const { MetroSerializer } = require("@rnx-kit/metro-serializer");\n\n module.exports = makeMetroConfig({\n   projectRoot: __dirname,\n   serializer: {\n+    customSerializer: MetroSerializer([\n+      CyclicDependencies(),\n+      DuplicateDependencies(),\n+    ]),\n   },\n });\n'})})]})}function m(e={}){const{wrapper:r}={...(0,n.R)(),...e.components};return r?(0,t.jsx)(r,{...e,children:(0,t.jsx)(d,{...e})}):d(e)}},8453:(e,r,i)=>{i.d(r,{R:()=>o,x:()=>c});var t=i(6540);const n={},s=t.createContext(n);function o(e){const r=t.useContext(s);return t.useMemo((function(){return"function"==typeof e?e(r):{...r,...e}}),[r,e])}function c(e){let r;return r=e.disableParentContext?"function"==typeof e.components?e.components(n):e.components||n:o(e.components),t.createElement(s.Provider,{value:r},e.children)}}}]);