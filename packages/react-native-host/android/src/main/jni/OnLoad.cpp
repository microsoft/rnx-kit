#include <fbjni/fbjni.h>

#include "ComponentsRegistry.h"
#include "TurboModuleManagerDelegate.h"

using ReactTestApp::ComponentsRegistry;
using ReactTestApp::TurboModuleManagerDelegate;

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *)
{
    return facebook::jni::initialize(vm, [] {
        TurboModuleManagerDelegate::registerNatives();
        ComponentsRegistry::registerNatives();
    });
}
