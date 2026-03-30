#if __has_include(<RNWWebStorageSpec/RNWWebStorageSpec.h>)

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wnullability-completeness"
#include <RNWWebStorageSpec/RNWWebStorageSpec.h>
#pragma clang diagnostic pop

#define RNW_USE_NEW_ARCH 1

@interface RNWWebStorage () <NativeWebStorageSpec>
@end

#else

#define RNW_USE_NEW_ARCH 0

#endif  // __has_include(<RNWWebStorageSpec/RNWWebStorageSpec.h>)
