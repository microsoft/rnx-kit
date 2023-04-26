#ifndef REACTTESTAPP_JNI_COMPONENTSREGISTRY_H_
#define REACTTESTAPP_JNI_COMPONENTSREGISTRY_H_

#include <fbjni/fbjni.h>

#if __has_include(<react/fabric/ComponentFactory.h>)  // >= 0.71
#include <react/fabric/ComponentFactory.h>
#else  // < 0.71
#include <ComponentFactory.h>
#endif

namespace ReactTestApp
{
    class ComponentsRegistry : public facebook::jni::HybridClass<ComponentsRegistry>
    {
    public:
        constexpr static auto kJavaDescriptor =
            "Lcom/microsoft/reacttestapp/fabric/ComponentsRegistry;";

        static void registerNatives();

        ComponentsRegistry(facebook::react::ComponentFactory *delegate);

    private:
        static facebook::jni::local_ref<ComponentsRegistry::jhybriddata>
        initHybrid(facebook::jni::alias_ref<jclass>, facebook::react::ComponentFactory *delegate);
    };
}  // namespace ReactTestApp

#endif  // REACTTESTAPP_JNI_COMPONENTSREGISTRY_H_
