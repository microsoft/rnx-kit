require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))
version = package['version']

Pod::Spec.new do |s|
  s.name      = 'ReactTestApp-MSAL'
  s.version   = version
  s.author    = { package['author']['name'] => package['author']['email'] }
  s.license   = package['license']
  s.homepage  = package['homepage']
  s.source    = { :git => package['repository']['url'], :tag => "#{package['name']}_v#{version}" }
  s.summary   = package['description']

  s.ios.deployment_target = '14.0'
  s.osx.deployment_target = '10.15'

  s.dependency 'MSAL'
  s.dependency 'React-Core'

  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }

  s.source_files         = 'ios/*.swift'
  s.public_header_files  = 'ios/*.h'
end
