/**
 * Suppress Metro's warning that the "roots" property is unknown and should not
 * be part of configuration.
 *
 * "roots" is a new Metro config property that hasn't been released yet. Customers
 * using our metro-config package should not be exposed to this warning.
 *
 * This can be removed after Metro PR https://github.com/facebook/metro/pull/701
 * is merged, published, and updated in our repo.
 */
const jestValidateUtils = require("jest-validate/build/utils");
const logValidationWarningOriginal = jestValidateUtils.logValidationWarning;
// eslint-disable-next-line
// @ts-ignore
jestValidateUtils.logValidationWarning = (name, message, comment) => {
  // eslint-disable-next-line
  if (message.match(/Unknown option \u001b\[1m"roots"/)) {
    return;
  }
  logValidationWarningOriginal(name, message, comment);
};
