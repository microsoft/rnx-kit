#pragma once

#include <winrt/Windows.Devices.Power.h>

#include "JSValue.h"
#include "NativeModules.h"

namespace winrt::ReactNativeBatteryStatus
{
    using winrt::Microsoft::ReactNative::JSValue;
    using winrt::Microsoft::ReactNative::JSValueObject;
    using winrt::Microsoft::ReactNative::ReactContext;
    using winrt::Microsoft::ReactNative::ReactPromise;
    using winrt::Windows::Devices::Power::Battery;
    using winrt::Windows::System::Power::BatteryStatus;

    REACT_MODULE(RNWBatteryStatus)
    struct RNWBatteryStatus {
        REACT_INIT(Initialize)
        void Initialize(ReactContext const &reactContext) noexcept
        {
            m_reactContext = reactContext;
        }

        REACT_METHOD(GetStatus, L"getStatus")
        void GetStatus(ReactPromise<JSValue> promise) noexcept
        {
            JSValueObject status;

            // https://learn.microsoft.com/en-us/windows/uwp/devices-sensors/get-battery-info
            auto report = Battery::AggregateBattery().GetReport();
            auto const batteryStatus = report.Status();
            if (batteryStatus == BatteryStatus::NotPresent) {
                // These are values reported by Chrome/Edge on a desktop machine
                status["charging"] = true;
                status["chargingTime"] = 0;
                status["dischargingTime"] = -1;
                status["level"] = 1;
            } else {
                status["charging"] = batteryStatus == BatteryStatus::Charging;

                // TODO: Actually implement charging/discharging times
                status["chargingTime"] = batteryStatus == BatteryStatus::Charging ? -1 : 0;
                status["dischargingTime"] = batteryStatus == BatteryStatus::Discharging ? -1 : -1;

                auto const remaining = report.RemainingCapacityInMilliwattHours().GetInt32();
                auto const fullCharge = report.FullChargeCapacityInMilliwattHours().GetInt32();
                status["level"] = static_cast<float>(remaining) / static_cast<float>(fullCharge);
            }

            promise.Resolve(JSValue{std::move(status)});
        }

    private:
        ReactContext m_reactContext{nullptr};
    };

}  // namespace winrt::ReactNativeBatteryStatus
