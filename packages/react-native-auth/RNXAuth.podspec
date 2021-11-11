require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))
version = package['version']

Pod::Spec.new do |s|
  s.name      = 'RNXAuth'
  s.version   = version
  s.author    = { package['author']['name'] => package['author']['email'] }
  s.license   = package['license']
  s.homepage  = package['homepage']
  s.source    = { :git => package['repository']['url'], :tag => "#{package['name']}_v#{version}" }
  s.summary   = package['description']

  s.ios.deployment_target = '13.0'
  s.osx.deployment_target = '10.15'

  s.dependency 'React-Core'

  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }

  s.source_files         = 'ios/*.{h,m}'
  s.public_header_files  = 'ios/*.h'
end
