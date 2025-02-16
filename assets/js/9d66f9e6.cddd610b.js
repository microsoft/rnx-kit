"use strict";(self.webpackChunk_rnx_kit_docsite=self.webpackChunk_rnx_kit_docsite||[]).push([[2726],{9387:(e,t,r)=>{r.r(t),r.d(t,{assets:()=>i,contentTitle:()=>c,default:()=>h,frontMatter:()=>s,metadata:()=>o,toc:()=>a});var d=r(4848),n=r(8453);const s={},c="tools-node",o={id:"tools/tools-node",title:"tools-node",description:"Build",source:"@site/docs/tools/tools-node.md",sourceDirName:"tools",slug:"/tools/tools-node",permalink:"/rnx-kit/docs/tools/tools-node",draft:!1,unlisted:!1,editUrl:"https://github.com/microsoft/rnx-kit/tree/main/docsite/docs/tools/tools-node.md",tags:[],version:"current",frontMatter:{},sidebar:"toolsSidebar",previous:{title:"tools-language",permalink:"/rnx-kit/docs/tools/tools-language"},next:{title:"tools-packages",permalink:"/rnx-kit/docs/tools/tools-packages"}},i={},a=[];function l(e){const t={a:"a",code:"code",h1:"h1",header:"header",img:"img",p:"p",pre:"pre",table:"table",tbody:"tbody",td:"td",th:"th",thead:"thead",tr:"tr",...(0,n.R)(),...e.components};return(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)(t.header,{children:(0,d.jsx)(t.h1,{id:"tools-node",children:"tools-node"})}),"\n",(0,d.jsxs)(t.p,{children:[(0,d.jsx)(t.a,{href:"https://github.com/microsoft/rnx-kit/actions/workflows/build.yml",children:(0,d.jsx)(t.img,{src:"https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg",alt:"Build"})}),"\n",(0,d.jsx)(t.a,{href:"https://www.npmjs.com/package/@rnx-kit/tools-node",children:(0,d.jsx)(t.img,{src:"https://img.shields.io/npm/v/@rnx-kit/tools-node",alt:"npm version"})})]}),"\n",(0,d.jsxs)(t.p,{children:[(0,d.jsx)(t.code,{children:"@rnx-kit/tools-node"})," is a collection of supplemental NodeJS functions and\ntypes."]}),"\n",(0,d.jsx)(t.p,{children:"You can import the entire package, or, to save space, import individual\ncategories:"}),"\n",(0,d.jsx)(t.pre,{children:(0,d.jsx)(t.code,{className:"language-typescript",children:'import * as tools from "@rnx-kit/tools-node";\n\n// Alternatively...\nimport * as moduleTools from "@rnx-kit/tools-node/module";\nimport * as packageTools from "@rnx-kit/tools-node/package";\nimport * as pathTools from "@rnx-kit/tools-node/path";\n'})}),"\n",(0,d.jsxs)(t.table,{children:[(0,d.jsx)(t.thead,{children:(0,d.jsxs)(t.tr,{children:[(0,d.jsx)(t.th,{children:"Category"}),(0,d.jsx)(t.th,{children:"Type Name"}),(0,d.jsx)(t.th,{children:"Description"})]})}),(0,d.jsxs)(t.tbody,{children:[(0,d.jsxs)(t.tr,{children:[(0,d.jsx)(t.td,{children:"module"}),(0,d.jsx)(t.td,{children:"FileModuleRef"}),(0,d.jsxs)(t.td,{children:["Module reference rooted to a file system location, either relative to a directory, or as an absolute path. For example, ",(0,d.jsx)(t.code,{children:"./index"})," or ",(0,d.jsx)(t.code,{children:"/repos/rnx-kit/packages/tools/src/index"}),"."]})]}),(0,d.jsxs)(t.tr,{children:[(0,d.jsx)(t.td,{children:"module"}),(0,d.jsx)(t.td,{children:"PackageModuleRef"}),(0,d.jsxs)(t.td,{children:["Module reference relative to a package, such as ",(0,d.jsx)(t.code,{children:"react-native"})," or ",(0,d.jsx)(t.code,{children:"@rnx-kit/tools/node/index"}),"."]})]}),(0,d.jsxs)(t.tr,{children:[(0,d.jsx)(t.td,{children:"package"}),(0,d.jsx)(t.td,{children:"DestructuredModuleRef"}),(0,d.jsx)(t.td,{children:"Module reference with the package name and optional sub-module path included as path"})]}),(0,d.jsxs)(t.tr,{children:[(0,d.jsx)(t.td,{children:"package"}),(0,d.jsx)(t.td,{children:"FindPackageDependencyOptions"}),(0,d.jsx)(t.td,{children:"Options which control how package dependecies are located."})]}),(0,d.jsxs)(t.tr,{children:[(0,d.jsx)(t.td,{children:"package"}),(0,d.jsx)(t.td,{children:"PackageManifest"}),(0,d.jsxs)(t.td,{children:["Schema for the contents of a ",(0,d.jsx)(t.code,{children:"package.json"})," manifest file."]})]}),(0,d.jsxs)(t.tr,{children:[(0,d.jsx)(t.td,{children:"package"}),(0,d.jsx)(t.td,{children:"PackagePerson"}),(0,d.jsxs)(t.td,{children:["Schema for a reference to a person in ",(0,d.jsx)(t.code,{children:"package.json"}),"."]})]}),(0,d.jsxs)(t.tr,{children:[(0,d.jsx)(t.td,{children:"package"}),(0,d.jsx)(t.td,{children:"PackageRef"}),(0,d.jsx)(t.td,{children:"Components of a package reference."})]})]})]}),"\n",(0,d.jsxs)(t.table,{children:[(0,d.jsx)(t.thead,{children:(0,d.jsxs)(t.tr,{children:[(0,d.jsx)(t.th,{children:"Category"}),(0,d.jsx)(t.th,{children:"Function"}),(0,d.jsx)(t.th,{children:"Description"})]})}),(0,d.jsxs)(t.tbody,{children:[(0,d.jsxs)(t.tr,{children:[(0,d.jsx)(t.td,{children:"module"}),(0,d.jsx)(t.td,{children:(0,d.jsx)(t.code,{children:"getPackageModuleRefFromModulePath(modulePath)"})}),(0,d.jsx)(t.td,{children:"Convert a module path to a package module reference."})]}),(0,d.jsxs)(t.tr,{children:[(0,d.jsx)(t.td,{children:"module"}),(0,d.jsx)(t.td,{children:(0,d.jsx)(t.code,{children:"isFileModuleRef(r)"})}),(0,d.jsx)(t.td,{children:"Is the module reference relative to a file location?"})]}),(0,d.jsxs)(t.tr,{children:[(0,d.jsx)(t.td,{children:"module"}),(0,d.jsx)(t.td,{children:(0,d.jsx)(t.code,{children:"isPackageModuleRef(r)"})}),(0,d.jsx)(t.td,{children:"Is the module reference a package module reference?"})]}),(0,d.jsxs)(t.tr,{children:[(0,d.jsx)(t.td,{children:"module"}),(0,d.jsx)(t.td,{children:(0,d.jsx)(t.code,{children:"parseModuleRef(r)"})}),(0,d.jsx)(t.td,{children:"Parse a module reference into either a package module reference or a file module reference. If there are any sub-paths, they are returned in paths."})]}),(0,d.jsxs)(t.tr,{children:[(0,d.jsx)(t.td,{children:"package"}),(0,d.jsx)(t.td,{children:(0,d.jsx)(t.code,{children:"destructureModuleRef(r)"})}),(0,d.jsx)(t.td,{children:"Destructure a module reference into its component par"})]}),(0,d.jsxs)(t.tr,{children:[(0,d.jsx)(t.td,{children:"package"}),(0,d.jsx)(t.td,{children:(0,d.jsx)(t.code,{children:"findPackage(startDir)"})}),(0,d.jsxs)(t.td,{children:["Find the nearest ",(0,d.jsx)(t.code,{children:"package.json"})," manifest file. Search upward through all parent directories."]})]}),(0,d.jsxs)(t.tr,{children:[(0,d.jsx)(t.td,{children:"package"}),(0,d.jsx)(t.td,{children:(0,d.jsx)(t.code,{children:"findPackageDependencyDir(ref, options)"})}),(0,d.jsx)(t.td,{children:"Find the package dependency's directory, starting from the given directory and moving outward, through all parent directories."})]}),(0,d.jsxs)(t.tr,{children:[(0,d.jsx)(t.td,{children:"package"}),(0,d.jsx)(t.td,{children:(0,d.jsx)(t.code,{children:"findPackageDir(startDir)"})}),(0,d.jsxs)(t.td,{children:["Find the parent directory of the nearest ",(0,d.jsx)(t.code,{children:"package.json"})," manifest file. Search upward through all parent directories."]})]}),(0,d.jsxs)(t.tr,{children:[(0,d.jsx)(t.td,{children:"package"}),(0,d.jsx)(t.td,{children:(0,d.jsx)(t.code,{children:"parsePackageRef(r)"})}),(0,d.jsxs)(t.td,{children:["Parse a package reference string. An example reference is the ",(0,d.jsx)(t.code,{children:"name"})," property found in ",(0,d.jsx)(t.code,{children:"package.json"}),"."]})]}),(0,d.jsxs)(t.tr,{children:[(0,d.jsx)(t.td,{children:"package"}),(0,d.jsx)(t.td,{children:(0,d.jsx)(t.code,{children:"readPackage(pkgPath)"})}),(0,d.jsxs)(t.td,{children:["Read a ",(0,d.jsx)(t.code,{children:"package.json"})," manifest from a file."]})]}),(0,d.jsxs)(t.tr,{children:[(0,d.jsx)(t.td,{children:"package"}),(0,d.jsx)(t.td,{children:(0,d.jsx)(t.code,{children:"resolveDependencyChain(chain, startDir)"})}),(0,d.jsx)(t.td,{children:"Resolve the path to a dependency given a chain of dependencies leading up to it."})]}),(0,d.jsxs)(t.tr,{children:[(0,d.jsx)(t.td,{children:"package"}),(0,d.jsx)(t.td,{children:(0,d.jsx)(t.code,{children:"writePackage(pkgPath, manifest, space)"})}),(0,d.jsxs)(t.td,{children:["Write a ",(0,d.jsx)(t.code,{children:"package.json"})," manifest to a file."]})]}),(0,d.jsxs)(t.tr,{children:[(0,d.jsx)(t.td,{children:"path"}),(0,d.jsx)(t.td,{children:(0,d.jsx)(t.code,{children:"findUp(names, options)"})}),(0,d.jsx)(t.td,{children:"Finds the specified file(s) or directory(s) by walking up parent directories."})]}),(0,d.jsxs)(t.tr,{children:[(0,d.jsx)(t.td,{children:"path"}),(0,d.jsx)(t.td,{children:(0,d.jsx)(t.code,{children:"normalizePath(p)"})}),(0,d.jsx)(t.td,{children:"Normalize the separators in a path, converting each backslash ('\\') to a foreward slash ('/')."})]})]})]})]})}function h(e={}){const{wrapper:t}={...(0,n.R)(),...e.components};return t?(0,d.jsx)(t,{...e,children:(0,d.jsx)(l,{...e})}):l(e)}},8453:(e,t,r)=>{r.d(t,{R:()=>c,x:()=>o});var d=r(6540);const n={},s=d.createContext(n);function c(e){const t=d.useContext(s);return d.useMemo((function(){return"function"==typeof e?e(t):{...t,...e}}),[t,e])}function o(e){let t;return t=e.disableParentContext?"function"==typeof e.components?e.components(n):e.components||n:c(e.components),d.createElement(s.Provider,{value:t},e.children)}}}]);