require 'json'

find_file = lambda do |file_name, current_dir|
  return if current_dir.expand_path.to_s == '/'

  path = current_dir + file_name
  return path if File.exist?(path)

  find_file(file_name, current_dir.parent)
end

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))
version = package['version']

Pod::Spec.new do |s|
  s.name      = 'ReactTestApp-MSAL'
  s.version   = version
  s.author    = { package['author']['name'] => package['author']['email'] }
  s.license   = package['license']
  s.homepage  = package['homepage']
  s.source    = { :git => package['repository']['url'], :tag => "#{package['name']}@#{version}" }
  s.summary   = package['description']

  s.ios.deployment_target = '14.0'
  s.osx.deployment_target = '11.0'

  s.dependency 'MSAL'

  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }

  s.source_files = 'ios/*.swift'

  # Detect whether @rnx-kit/react-native-auth is installed and make additional changes
  rnx_kit_auth = find_file.call("node_modules/@rnx-kit/react-native-auth/package.json", Pathname.pwd)
  unless rnx_kit_auth.nil?
    s.dependency 'RNXAuth'
    s.source_files = 'ios/*.{h,m,swift}'
  end
end
