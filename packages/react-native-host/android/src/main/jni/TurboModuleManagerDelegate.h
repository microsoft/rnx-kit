#ifndef REACTTESTAPP_JNI_TURBOMODULEMANAGERDELEGATE_H_
#define REACTTESTAPP_JNI_TURBOMODULEMANAGERDELEGATE_H_

#include <memory>
#include <string>

#include <fbjni/fbjni.h>

#include <ReactCommon/TurboModuleManagerDelegate.h>

namespace ReactTestApp
{
    class TurboModuleManagerDelegate
        : public facebook::jni::HybridClass<TurboModuleManagerDelegate,
                                            facebook::react::TurboModuleManagerDelegate>
    {
        // Signatures changed in 0.70 to avoid unnecessary string copies; see
        // https://github.com/facebook/react-native/commit/3337add547c60b84816ef5dad82f4ead2e8742ef
#if __has_include(<ReactCommon/CompositeTurboModuleManagerDelegate.h>)
        using SharedCallInvoker = const std::shared_ptr<facebook::react::CallInvoker> &;
        using StringRef = const std::string &;
#else
        using SharedCallInvoker = const std::shared_ptr<facebook::react::CallInvoker>;
        using StringRef = const std::string;
#endif

    public:
        static constexpr auto kJavaDescriptor =
            "Lcom/microsoft/reacttestapp/turbomodule/TurboModuleManagerDelegate;";

        static void registerNatives();

        std::shared_ptr<facebook::react::TurboModule>
        getTurboModule(StringRef name, SharedCallInvoker jsInvoker) override;

        std::shared_ptr<facebook::react::TurboModule>
        getTurboModule(StringRef name,  //
                       const facebook::react::JavaTurboModule::InitParams &params) override;

    private:
        static facebook::jni::local_ref<jhybriddata>
            initHybrid(facebook::jni::alias_ref<jhybridobject>);

        /**
         * Test-only method. Allows user to verify whether a TurboModule can be
         * created by instances of this class.
         */
        bool canCreateTurboModule(StringRef name);
    };
}  // namespace ReactTestApp

#endif  // REACTTESTAPP_JNI_TURBOMODULEMANAGERDELEGATE_H_
