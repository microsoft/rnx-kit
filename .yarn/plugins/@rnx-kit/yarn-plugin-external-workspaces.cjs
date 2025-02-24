/* eslint-disable */
//prettier-ignore
module.exports = {
name: "@rnx-kit/yarn-plugin-external-workspaces",
factory: function (require) {
"use strict";var plugin=(()=>{var je=Object.create;var b=Object.defineProperty;var De=Object.getOwnPropertyDescriptor;var Se=Object.getOwnPropertyNames;var Re=Object.getPrototypeOf,Ee=Object.prototype.hasOwnProperty;var l=(t=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(t,{get:(e,n)=>(typeof require<"u"?require:e)[n]}):t)(function(t){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+t+'" is not supported')});var $=(t,e)=>()=>(e||t((e={exports:{}}).exports,e),e.exports),_e=(t,e)=>{for(var n in e)b(t,n,{get:e[n],enumerable:!0})},X=(t,e,n,o)=>{if(e&&typeof e=="object"||typeof e=="function")for(let r of Se(e))!Ee.call(t,r)&&r!==n&&b(t,r,{get:()=>e[r],enumerable:!(o=De(e,r))||o.enumerable});return t};var S=(t,e,n)=>(n=t!=null?je(Re(t)):{},X(e||!t||!t.__esModule?b(n,"default",{value:t,enumerable:!0}):n,t)),be=t=>X(b({},"__esModule",{value:!0}),t);var z=$(f=>{"use strict";var $e=f&&f.__importDefault||function(t){return t&&t.__esModule?t:{default:t}};Object.defineProperty(f,"__esModule",{value:!0});f.rebasePackageDefinition=Z;f.rebaseExternalDeps=Te;f.findDependencyChanges=Ce;f.reportDependencyChanges=Me;f.sortStringRecord=Le;var Y=$e(l("path"));function Z(t,e){return{path:t.path?Y.default.posix.normalize(Y.default.join(e,t.path)):null,version:t.version}}function Te(t,e){let n={};for(let o in t)n[o]=Z(t[o],e);return n}function We(t,e){return t.path===e.path&&t.version===e.version}function Ce(t,e){let n={};for(let o in e)t[o]?We(t[o],e[o])||(n[o]="update"):n[o]="add";for(let o in t)e[o]||(n[o]="remove");return Object.keys(n).length>0?n:null}function Me(t,e){for(let n in t){let o=String(t[n]).padEnd(6," ");e(`${o} - ${n}`)}}function Le(t,e){let n=Object.keys(t).sort();e??(e={});for(let o of n)e[o]=t[o];return e}});var ae=$(d=>{"use strict";var te=d&&d.__importDefault||function(t){return t&&t.__esModule?t:{default:t}};Object.defineProperty(d,"__esModule",{value:!0});d.parseJsonPath=oe;d.getDepsFromJson=re;d.createFinderFromJson=se;d.createFinderFromJs=ie;d.loadExternalDeps=Ue;var A=te(l("fs")),R=te(l("path")),Je=z(),ee=".json",ne=t=>null;function oe(t){let e=t.indexOf(ee);if(e>0){let n=e+ee.length,o=t.slice(0,n),r=t.length>n+1?t.slice(n+1):"";return{jsonPath:o,keysPath:r}}return{}}function re(t,e){let n=e?e.split("/"):[],o=t;for(let r of n)if(o=o[r],!o)return;return o}function se(t,e,n){if(A.default.existsSync(t)){let o=re(JSON.parse(A.default.readFileSync(t,"utf8")),e);if(o)return n(`Loaded the finder from the json file ${t}`),r=>o[r]??null}return ne}function ie(t,e){let n=l(t);if(!n)throw new Error(`Unable to load config from ${t}`);return e(`Creating a finder from: ${t}`),n.default}function Ie(t,e,n,o){let r=new Map;return s=>{if(r.has(s))return r.get(s)??null;let i=t(s),a=i?{...i}:null;return a&&(a=(0,Je.rebasePackageDefinition)(a,n),a.path&&(A.default.existsSync(R.default.join(e,a.path,"package.json"))?o(`finder: ${s} found at ${a.path}`):(o(`finder: ${s} not found at ${a.path}`),a.path=null))),r.set(s,a),a}}function Ue(t,e,n){let o,r="";if(typeof t=="string"){if(R.default.isAbsolute(t))throw new Error(`Invalid external workspace config path: ${t}. Must be relative to the root of the repository`);let s=R.default.join(e,t);r=R.default.dirname(t);let{jsonPath:i,keysPath:a}=oe(s);if(i)o=se(i,a,n);else{let p=R.default.extname(s).toLowerCase();(p===".js"||p===".cjs")&&(o=ie(s,n))}if(!o)throw new Error(`Invalid external workspace config path: ${s}. Supported types are .json, .js, and .cjs`)}else typeof t=="object"&&(o=s=>t[s]??null);return o?Ie(o,e,r,n):ne}});var pe=$(y=>{"use strict";var le=y&&y.__importDefault||function(t){return t&&t.__esModule?t:{default:t}};Object.defineProperty(y,"__esModule",{value:!0});y.externalWorkspacesKey=void 0;y.getExternalWorkspaces=qe;var k=le(l("fs")),x=le(l("path")),T=z(),K=ae(),ce=()=>null;y.externalWorkspacesKey="external-workspaces";var C=class t{constructor(e){this.startTime=performance.now(),this.root=e;let{outputOnlyOnCommand:n,outputPath:o,externalDependencies:r,logTo:s}=this.loadConfig(this.root);this.outputOnlyOnCommand=!!n,this.outputPath=o||"",this.logTo=s||"",this.trace=this.createTraceFunction(),this.report=i=>{console.log(i),this.trace(i)},this.findPackage=(0,K.loadExternalDeps)(r,e,this.trace)}outputWorkspaces(e,n,o){if(n??(n=this.outputPath),!n){this.trace("No output path specified, skipping write");return}let{jsonPath:r,keysPath:s}=(0,K.parseJsonPath)(x.default.join(this.root,n));if(r){let i=x.default.dirname(r);o||this.ensureDirExists(i);let a=x.default.relative(i,this.root),p=(0,T.rebaseExternalDeps)(e,a),c=k.default.existsSync(r)?JSON.parse(k.default.readFileSync(r,"utf8")):{},m=(0,K.getDepsFromJson)(c,s)||{},v=(0,T.findDependencyChanges)(m,p);if(v)if(o)this.report(`Update needed for ${n}:`),(0,T.reportDependencyChanges)(v,this.report);else{this.report(`Updating ${n}...`);let _=s?s.split("/"):[],Q=_.length>0?c:{},j=Q,D=_.shift();for(;D;)(!j[D]||_.length===0)&&(j[D]={}),j=j[D],D=_.shift();(0,T.sortStringRecord)(p,j);let Oe=JSON.stringify(Q,null,2);k.default.writeFileSync(r,Oe),this.report(`Updated ${r}`)}}}loadConfig(e){return JSON.parse(k.default.readFileSync(x.default.join(e,"package.json"),"utf8"))[t.pkgJsonKey]||{}}createTraceFunction(){if(!this.logTo)return ce;if(this.logTo==="console")return e=>this.consoleTrace(e);{let e=x.default.dirname(this.logTo);return this.ensureDirExists(e),this.fileTrace(`
==== Session Started at ${new Date().toISOString()} ====`),n=>this.fileTrace(n)}}formatTrace(e){return`[${(performance.now()-this.startTime).toFixed(2)}ms] ${e}`}consoleTrace(e){console.log(this.formatTrace(e))}fileTrace(e){k.default.appendFile(this.logTo,this.formatTrace(e)+`
`,ce)}ensureDirExists(e){k.default.existsSync(e)||k.default.mkdirSync(e,{recursive:!0,mode:493})}};C.pkgJsonKey="external-workspaces";var W;function qe(t){let e=x.default.resolve(t);return(!W||W.root!==e)&&(W=new C(e)),W}});var ue=$(M=>{"use strict";Object.defineProperty(M,"__esModule",{value:!0});M.getExternalWorkspaces=void 0;var Ne=pe();Object.defineProperty(M,"getExternalWorkspaces",{enumerable:!0,get:function(){return Ne.getExternalWorkspaces}})});var et={};_e(et,{default:()=>Ze});var G=l("@yarnpkg/cli"),F=l("@yarnpkg/core"),g=l("clipanion");var ke=l("@yarnpkg/core"),V=S(l("fs")),ye=S(l("path"));var h=l("@yarnpkg/core");var fe=S(ue()),de=l("@yarnpkg/core"),L=S(l("path")),w="external:";function J(){return w}var Be=t=>t;function ze(t){return L.default.posix.normalize(t)}var Ae=process.platform==="win32"?t=>L.default.win32.normalize(t):Be;function Ke(t,e){return ze(L.default.relative(t,e))}function u(t){return(0,fe.getExternalWorkspaces)(Ae(t.cwd))}function he(t){let e=t.indexOf(":");return e===-1?t:t.slice(e+1)}function ge(t){let e=t.indexOf(":");return e!==-1?{protocol:t.slice(0,e+1),version:t.slice(e+1)}:{protocol:"",version:t}}function me(t){return t.startsWith(w)&&(t=t.slice(w.length)),{version:t}}function H(t,e){return e.startsWith(w)&&(e=e.slice(w.length)),`${w}${e}`}function I(t,e,n,o){let r={};t.workspacesByIdent.forEach(s=>{let{name:i,version:a,private:p}=s.manifest;if(i&&a&&!p){let c=de.structUtils.stringifyIdent(i);r[c]={version:a,path:Ke(t.cwd,s.cwd)}}}),e.outputWorkspaces(r,n,o)}var{makeLocator:He,stringifyIdent:E,makeDescriptor:Ve}=h.structUtils,P=class t{constructor(){this.settings=null;this.candidates={}}static{this.protocol=J()}ensureSettings(e){return this.settings||(this.settings=u(e.project)),this.settings}ensureLocator(e){let n=E(e),o=he(e.range),r=this.candidates[n]??={locator:He(e,H(n,o)),ranges:new Set};return r.ranges.add(o),r.locator}trace(e){this.settings?.trace(e)}tryExternal(e,n){if(!n.project.tryWorkspaceByDescriptor(e)){let o=E(e);return this.ensureSettings(n).findPackage(o)}return!1}getResolutionDependencies(e,n){return{}}supportsDescriptor(e,n){let{trace:o}=this.ensureSettings(n);return e.range.startsWith(t.protocol)?!0:this.tryExternal(e,n)?(o(`Resolver: supports undecorated external: ${h.structUtils.stringifyIdent(e)}`),!0):!1}supportsLocator(e,n){return e.reference.startsWith(t.protocol)}shouldPersistResolution(e,n){return!0}bindDescriptor(e,n,o){if(!e.range.startsWith(t.protocol)&&this.tryExternal(e,o)){let{version:r}=ge(e.range),s=H(E(e),r);return Ve(e,s)}return e}async getCandidates(e,n,o){return this.ensureSettings(o),this.trace(`Resolver: getCandidates(${E(e)})`),[this.ensureLocator(e)]}async getSatisfying(e,n,o,r){let s=await this.getCandidates(e,n,r);return this.trace(`Resolver: getSatisfying found ${s.length} candidates`),{locators:s,sorted:!1}}async resolve(e,n){if(this.ensureSettings(n),!n.fetchOptions)throw new Error("Assertion failed: This resolver cannot be used unless a fetcher is configured");this.trace(`Resolving ${E(e)}`);let o=await n.fetchOptions.fetcher.fetch(e,n.fetchOptions),r=await h.miscUtils.releaseAfterUseAsync(async()=>await h.Manifest.find(o.prefixPath,{baseFs:o.packageFs}),o.releaseFs);return{...e,version:r.version||"0.0.0",languageName:r.languageName||n.project.configuration.get("defaultLanguageName"),linkType:h.LinkType.SOFT,conditions:r.getConditions(),dependencies:n.project.configuration.normalizeDependencyMap(r.dependencies),peerDependencies:r.peerDependencies,dependenciesMeta:r.dependenciesMeta,peerDependenciesMeta:r.peerDependenciesMeta,bin:r.bin}}};var ve=P.protocol,Ge=ve+"*";function Qe(t,e){let n=new Set(Object.keys(t).filter(s=>t[s].startsWith(ve))),o=new Set,r=new Set;for(let s of e)n.has(s)||o.add(s);for(let s of n)e.has(s)||r.add(s);return{addedExternals:o,removedExternals:r}}function Xe(t,e,n,o){let r=ye.default.join(t,"package.json"),s=JSON.parse(V.default.readFileSync(r,"utf8")),i=s.resolutions||{},{addedExternals:a,removedExternals:p}=Qe(i,e);if(a.size>0||p.size>0){o("Found changes to resolutions for external workspaces");for(let c of a)i[c]=Ge,o(`+ external workspace: ${c}`);for(let c of p)delete i[c],o(`- external workspace: ${c}`);if(!n){o(`Updating ${r} with changes to resolutions`);let c=Object.keys(i).sort().reduce((m,v)=>(m[v]=i[v],m),{});s.resolutions=c,V.default.writeFileSync(r,JSON.stringify(s,null,2))}}else o("No changes needed")}function xe(t,e){let{report:n,findPackage:o}=u(t),r=new Set,s=new Set,i=a=>{for(let p of a)for(let c of p.values())if(t.tryWorkspaceByDescriptor(c)===null){let m=ke.structUtils.stringifyIdent(c);o(m)&&(r.add(m),s.has(c)||s.add(c))}};t.workspacesByIdent.forEach(a=>{i([a.manifest.dependencies,a.manifest.devDependencies])});for(let a of s){let p=t.storedResolutions.get(a.descriptorHash);if(p){let c=t.storedPackages.get(p);c&&i([c.dependencies])}}Xe(t.cwd,r,e,n)}var U=class extends G.BaseCommand{constructor(){super(...arguments);this.target=g.Option.String("--target","",{description:"The path to the file to output the workspaces to"});this.checkOnly=g.Option.Boolean("--check-only",!1,{description:"Check if the workspaces have changed without writing the file"});this.includePrivate=g.Option.Boolean("--include-private",!1,{description:"Include private workspaces in the output"})}static{this.paths=[["external-workspaces","output"]]}static{this.usage=g.Command.Usage({category:"External Workspaces",description:"Output current workspace information to a json file",details:`
      This command will output the current set of workspaces to a json file. The file will not be modified if the workspaces have not changed.

      The path to the .json file can optionally have a set of keys appended to the end as a path. This will write the workspaces to a subpath of
      the file while maintaining the other contents of the file.
    `,examples:[["Output workspaces with settings from package.json","$0 external-workspaces output"],["Output workspaces to target","$0 external-workspaces output --target ./path/to/file.json"],["Output workspaces to target with a subpath","$0 external-workspaces output --target ./path/to/file.json/key1/key2"],["Check if workspaces have changed","$0 external-workspaces output --target ./path/to/file.json --check-only"]]})}async execute(){let n=await F.Configuration.find(this.context.cwd,this.context.plugins),{project:o}=await F.Project.find(n,this.context.cwd),r=u(o),s=this.target||r.outputPath;s&&await I(o,r,s,this.checkOnly)}},q=class extends G.BaseCommand{constructor(){super(...arguments);this.checkOnly=g.Option.Boolean("--check-only",!1,{description:"Check if the resolutions are up to date without writing the file"})}static{this.paths=[["external-workspaces","resolutions"]]}static{this.usage=g.Command.Usage({category:"External Workspaces",description:"Check if the workspace resolutions are up to date",details:`
      This command will check the current workspace resolutions against the external dependencies defined in the package.json.
    `,examples:[["Check resolutions with settings from package.json","$0 external-workspaces resolutions"]]})}async execute(){let n=await F.Configuration.find(this.context.cwd,this.context.plugins),{project:o}=await F.Project.find(n,this.context.cwd);await xe(o,this.checkOnly)}};var N=l("@yarnpkg/core"),O=l("@yarnpkg/fslib"),Pe=S(l("path"));var{stringifyIdent:we}=N.structUtils,B=class t{constructor(){this.settings=null;this.fetcher=null;this.resolver=null;this.resolveOptions=null}static{this.protocol=J()}ensureSettings(e){return this.settings||(this.settings=u(e.project)),this.settings}supports(e,n){return e.reference.startsWith(t.protocol)}getLocalPath(e,n){let{findPackage:o}=this.ensureSettings(n),r=we(e),s=o(r)?.path;return s?O.npath.toPortablePath(Pe.default.join(n.project.cwd,s)):null}async fetch(e,n){let{version:o}=me(e.reference),r=we(e),{trace:s}=this.ensureSettings(n),i=this.getLocalPath(e,n);return i?(s(`Fetcher: Found existing local path for ${r}: ${i}`),{packageFs:new O.CwdFS(i),prefixPath:O.PortablePath.dot,localPath:i}):await this.fetchFallback(r,o,n,s)}async fetchFallback(e,n,o,r){let s=N.structUtils.makeDescriptor(N.structUtils.parseIdent(e),n);this.resolver??=o.project.configuration.makeResolver(),this.fetcher??=o.project.configuration.makeFetcher(),this.resolveOptions??={project:o.project,resolver:this.resolver,fetchOptions:o,report:o.report};let i=await this.resolver.getCandidates(s,{},this.resolveOptions);if(i.length===0)throw new Error(`No candidate found on npm for "${e}" : "${n}"`);let a=i[0];return r(`Fetcher: falling back to generic fetch for ${e}: ${n}`),await this.fetcher.fetch(a,o)}};function Fe(t,e){let n=u(t);!n.outputOnlyOnCommand&&n.outputPath&&I(t,n)}var Ye={fetchers:[B],resolvers:[P],hooks:{afterAllInstalled:Fe},commands:[U,q]},Ze=Ye;return be(et);})();
return plugin;
}
};
//# sourceMappingURL=external-workspaces.cjs.map
