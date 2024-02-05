#if __has_include(<RNWWebStorageSpec/RNWWebStorageSpec.h>)

#include <RNWWebStorageSpec/RNWWebStorageSpec.h>

#define RNW_USE_NEW_ARCH 1

@interface RNWWebStorage () <NativeWebStorageSpec>
@end

#else

#define RNW_USE_NEW_ARCH 0

#endif  // __has_include(<RNWWebStorageSpec/RNWWebStorageSpec.h>)
