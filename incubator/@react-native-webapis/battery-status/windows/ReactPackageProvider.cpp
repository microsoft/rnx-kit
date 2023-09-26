#include "pch.h"

#include "ReactPackageProvider.h"
#if __has_include("ReactPackageProvider.g.cpp")
#include "ReactPackageProvider.g.cpp"
#endif

#include "RNWBatteryStatus.h"

namespace winrt::ReactNativeBatteryStatus::implementation
{
    using winrt::Microsoft::ReactNative::AddAttributedModules;
    using winrt::Microsoft::ReactNative::IReactPackageBuilder;

    void ReactPackageProvider::CreatePackage(IReactPackageBuilder const &packageBuilder) noexcept
    {
        AddAttributedModules(packageBuilder, false);
    }
}  // namespace winrt::ReactNativeBatteryStatus::implementation
