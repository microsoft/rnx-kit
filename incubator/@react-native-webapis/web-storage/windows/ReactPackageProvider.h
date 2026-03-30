#pragma once
#include "ReactPackageProvider.g.h"

namespace winrt::ReactNativeWebStorage::implementation
{
    using winrt::Microsoft::ReactNative::IReactPackageBuilder;

    struct ReactPackageProvider : ReactPackageProviderT<ReactPackageProvider> {
        ReactPackageProvider() = default;

        void CreatePackage(IReactPackageBuilder const &packageBuilder) noexcept;
    };
}  // namespace winrt::ReactNativeWebStorage::implementation

namespace winrt::ReactNativeWebStorage::factory_implementation
{
    using winrt::Microsoft::ReactNative::IReactPackageBuilder;

    struct ReactPackageProvider
        : ReactPackageProviderT<ReactPackageProvider, implementation::ReactPackageProvider> {
    };
}  // namespace winrt::ReactNativeWebStorage::factory_implementation
