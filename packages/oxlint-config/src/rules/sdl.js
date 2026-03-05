// @ts-expect-error @microsoft/eslint-plugin-sdl does not have types
import noCookies from "@microsoft/eslint-plugin-sdl/lib/rules/no-cookies.js";
// @ts-expect-error @microsoft/eslint-plugin-sdl does not have types
import noDocumentDomain from "@microsoft/eslint-plugin-sdl/lib/rules/no-document-domain.js";
// @ts-expect-error @microsoft/eslint-plugin-sdl does not have types
import noDocumentWrite from "@microsoft/eslint-plugin-sdl/lib/rules/no-document-write.js";
// @ts-expect-error @microsoft/eslint-plugin-sdl does not have types
import noHtmlMethod from "@microsoft/eslint-plugin-sdl/lib/rules/no-html-method.js";
// @ts-expect-error @microsoft/eslint-plugin-sdl does not have types
import noInnerHtml from "@microsoft/eslint-plugin-sdl/lib/rules/no-inner-html.js";
// @ts-expect-error @microsoft/eslint-plugin-sdl does not have types
import noInsecureUrl from "@microsoft/eslint-plugin-sdl/lib/rules/no-insecure-url.js";
// @ts-expect-error @microsoft/eslint-plugin-sdl does not have types
import noMsappExecUnsafe from "@microsoft/eslint-plugin-sdl/lib/rules/no-msapp-exec-unsafe.js";
// @ts-expect-error @microsoft/eslint-plugin-sdl does not have types
import noPostmessageStarOrigin from "@microsoft/eslint-plugin-sdl/lib/rules/no-postmessage-star-origin.js";
// @ts-expect-error @microsoft/eslint-plugin-sdl does not have types
import noUnsafeAlloc from "@microsoft/eslint-plugin-sdl/lib/rules/no-unsafe-alloc.js";
// @ts-expect-error @microsoft/eslint-plugin-sdl does not have types
import noWinjsHtmlUnsafe from "@microsoft/eslint-plugin-sdl/lib/rules/no-winjs-html-unsafe.js";

/**
 * We manually import the rules here because loading
 * `@microsoft/eslint-plugin-sdl` directly eventually pulls in ESLint specific
 * dependencies, which is completely unnecessary for our use case.
 *
 * https://github.com/microsoft/eslint-plugin-sdl/blob/v1.1.0/lib/index.js#L16-L34
 */
export default {
  rules: {
    "no-cookies": noCookies,
    "no-document-domain": noDocumentDomain,
    "no-document-write": noDocumentWrite,
    "no-html-method": noHtmlMethod,
    "no-inner-html": noInnerHtml,
    "no-insecure-url": noInsecureUrl,
    "no-msapp-exec-unsafe": noMsappExecUnsafe,
    "no-postmessage-star-origin": noPostmessageStarOrigin,
    "no-unsafe-alloc": noUnsafeAlloc,
    "no-winjs-html-unsafe": noWinjsHtmlUnsafe,
  },
};
