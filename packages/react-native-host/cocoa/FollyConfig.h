#include <folly/Portability.h>
#if FOLLY_HAS_COROUTINES
// TODO: `FOLLY_CFG_NO_COROUTINES` was added in 0.73. We can drop this block
// when we drop support for 0.72:
// https://github.com/facebook/react-native/commit/17154a661fe06ed25bf599f47bd4193eba011971
#define FOLLY_HAS_COROUTINES 0
#endif
