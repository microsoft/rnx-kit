require 'json'

source_files = 'cocoa/*.{h,m,mm}'
public_header_files = 'cocoa/{ReactNativeHost,RNXHostConfig}.h'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))
version = package['version']
repository = package['repository']
repo_dir = repository['directory']

new_arch_enabled = ENV['RCT_NEW_ARCH_ENABLED'] == '1'
preprocessor_definitions = ['FOLLY_NO_CONFIG=1', 'FOLLY_MOBILE=1', 'FOLLY_USE_LIBCPP=1']
if new_arch_enabled
  preprocessor_definitions << 'RCT_NEW_ARCH_ENABLED=1'
  preprocessor_definitions << 'USE_FABRIC=1'
  preprocessor_definitions << 'USE_TURBOMODULE=1'
end

Pod::Spec.new do |s|
  s.name      = File.basename(__FILE__, '.podspec')
  s.version   = version
  s.author    = { package['author']['name'] => package['author']['email'] }
  s.license   = package['license']
  s.homepage  = package['homepage']
  s.source    = { :git => repository['url'], :tag => "#{package['name']}@#{version}" }
  s.summary   = package['description']

  s.ios.deployment_target = '13.0'
  s.osx.deployment_target = '10.15'

  s.dependency 'React-Core'
  s.dependency 'React-cxxreact'

  # Normally, we wouldn't need this unless New Arch was enabled. However,
  # Reanimated requires a header from here.
  s.dependency 'ReactCommon/turbomodule/core'

  if new_arch_enabled
    s.dependency 'React-RCTAppDelegate'
    s.dependency 'React-RCTFabric'
    s.dependency 'Yoga'
  end

  s.pod_target_xcconfig = {
    'CLANG_CXX_LANGUAGE_STANDARD' => 'gnu++17',
    'DEFINES_MODULE' => 'YES',
    'GCC_PREPROCESSOR_DEFINITIONS' => preprocessor_definitions,
    'HEADER_SEARCH_PATHS' => [
      '$(PODS_ROOT)/boost',
      '$(PODS_ROOT)/boost-for-react-native',
      '$(PODS_ROOT)/RCT-Folly',
      '$(PODS_ROOT)/DoubleConversion',
      '$(PODS_ROOT)/Headers/Private/React-Core',
      '$(PODS_ROOT)/Headers/Private/Yoga',
    ],
  }

  # Include both package and repository relative paths to allow the podspec to
  # be consumed from both a local path, and as a podspec outside a spec
  # repository.
  s.source_files         = source_files,                         # :path
                           "#{repo_dir}/#{source_files}"         # :podspec
  s.public_header_files  = public_header_files,                  # :path
                           "#{repo_dir}/#{public_header_files}"  # :podspec
end
