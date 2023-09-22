#pragma once
#include "ReactPackageProvider.g.h"

namespace winrt::ReactNativeBatteryStatus::implementation
{
    using winrt::Microsoft::ReactNative::IReactPackageBuilder;

    struct ReactPackageProvider : ReactPackageProviderT<ReactPackageProvider> {
        ReactPackageProvider() = default;

        void CreatePackage(IReactPackageBuilder const &packageBuilder) noexcept;
    };
}  // namespace winrt::ReactNativeBatteryStatus::implementation

namespace winrt::ReactNativeBatteryStatus::factory_implementation
{
    using winrt::Microsoft::ReactNative::IReactPackageBuilder;

    struct ReactPackageProvider
        : ReactPackageProviderT<ReactPackageProvider, implementation::ReactPackageProvider> {
    };
}  // namespace winrt::ReactNativeBatteryStatus::factory_implementation
