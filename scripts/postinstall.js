const { getPackageInfo } = require('just-repo-utils');
// force the cache to rebuild and reset
getPackageInfo({ strategy: 'update' });
