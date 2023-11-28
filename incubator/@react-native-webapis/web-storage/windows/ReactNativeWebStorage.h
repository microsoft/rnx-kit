#pragma once

#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.Storage.h>

#include "JSValue.h"
#include "NativeModules.h"

namespace winrt::ReactNativeWebStorage
{
    using winrt::Microsoft::ReactNative::JSValue;
    using winrt::Microsoft::ReactNative::ReactContext;
    using winrt::Windows::Foundation::IReference;
    using winrt::Windows::Foundation::PropertyValue;
    using winrt::Windows::Storage::ApplicationData;
    using winrt::Windows::Storage::ApplicationDataContainer;
    using winrt::Windows::Storage::ApplicationDataCreateDisposition;

    REACT_MODULE(ReactNativeWebStorage, L"RNWWebStorage")
    struct ReactNativeWebStorage {
    private:
        inline static const auto kContainerName = L"ReactNativeWebStorage";

    public:
        REACT_INIT(Initialize)
        void Initialize(ReactContext const &reactContext) noexcept
        {
            m_reactContext = reactContext;
            CreateContainer();
        }

        REACT_SYNC_METHOD(GetLength, L"length")
        uint32_t GetLength() noexcept
        {
            return LocalSettings().Size();
        }

        REACT_SYNC_METHOD(GetKey, L"key")
        JSValue GetKey(double) noexcept
        {
            return {};
        }

        REACT_SYNC_METHOD(GetItem, L"getItem")
        JSValue GetItem(std::string key) noexcept
        {
            auto value = LocalSettings().Lookup(to_hstring(key));
            if (value) {
                if (auto temp = value.try_as<IReference<hstring>>()) {
                    return {to_string(temp.Value())};
                }
            }

            return {};
        }

        REACT_SYNC_METHOD(SetItem, L"setItem")
        JSValue SetItem(std::string key, std::string value) noexcept
        {
            auto v = PropertyValue::CreateString(to_hstring(value));
            LocalSettings().Insert(to_hstring(key), v);
            return {};
        }

        REACT_SYNC_METHOD(RemoveItem, L"removeItem")
        JSValue RemoveItem(std::string key) noexcept
        {
            LocalSettings().TryRemove(to_hstring(key));
            return {};
        }

        REACT_SYNC_METHOD(Clear, L"clear")
        JSValue Clear() noexcept
        {
            m_localSettings.DeleteContainer(kContainerName);
            CreateContainer();
            return {};
        }

    private:
        ReactContext m_reactContext{nullptr};
        ApplicationDataContainer m_localSettings{ApplicationData::Current().LocalSettings()};

        void CreateContainer()
        {
            m_localSettings.CreateContainer(kContainerName,
                                            ApplicationDataCreateDisposition::Always);
        }

        IPropertySet LocalSettings()
        {
            return m_localSettings.Containers().Lookup(kContainerName).Values();
        }
    };

}  // namespace winrt::ReactNativeWebStorage
