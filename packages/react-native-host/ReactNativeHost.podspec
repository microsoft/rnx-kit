require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))
version = package['version']
repository = package['repository']
repo_dir = repository['directory']

source_files = 'cocoa/*.{h,m,mm}'
public_header_files = 'cocoa/{ReactNativeHost,RNXHostConfig}.h'

Pod::Spec.new do |s|
  s.name      = 'ReactNativeHost'
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

  if ENV['RCT_NEW_ARCH_ENABLED'] == '1'
    s.dependency 'ReactCommon/turbomodule/core'
    s.dependency 'React-RCTFabric'
  end

  s.pod_target_xcconfig = {
    'CLANG_CXX_LANGUAGE_STANDARD' => 'gnu++17',
    'DEFINES_MODULE' => 'YES',
    'HEADER_SEARCH_PATHS' => [
      '$(PODS_ROOT)/Headers/Private/React-Core',
      '$(PODS_ROOT)/boost',
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
