#include "pch.h"

#include "ReactPackageProvider.h"
#if __has_include("ReactPackageProvider.g.cpp")
#include "ReactPackageProvider.g.cpp"
#endif

#include "ReactNativeWebStorage.h"

namespace winrt::ReactNativeWebStorage::implementation
{
    using winrt::Microsoft::ReactNative::AddAttributedModules;
    using winrt::Microsoft::ReactNative::IReactPackageBuilder;

    void ReactPackageProvider::CreatePackage(IReactPackageBuilder const &packageBuilder) noexcept
    {
#ifdef USE_FABRIC
        AddAttributedModules(packageBuilder, true);
#else
        AddAttributedModules(packageBuilder, false);
#endif  // USE_FABRIC
    }
}  // namespace winrt::ReactNativeWebStorage::implementation
