require 'json'

pkg = JSON.parse(File.read(File.join(__dir__, '..', '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'ScreenTimeIOS'
  s.version        = pkg['version']
  s.summary        = 'Latch iOS Screen Time native module (FamilyControls / DeviceActivity / ManagedSettings)'
  s.description    = s.summary
  s.homepage       = 'https://github.com/ayaanpopatiya101-png/latch-screen-time-app'
  s.license        = { type: 'MIT' }
  s.author         = 'Latch'
  s.platforms      = { ios: '16.0' }
  s.source         = { git: '' }
  s.source_files   = 'ios/**/*.{swift,h,m}'
  s.swift_version  = '5.9'

  # Apple's Screen Time frameworks — available from iOS 16.
  s.frameworks = [
    'FamilyControls',
    'DeviceActivity',
    'ManagedSettings',
    'ManagedSettingsUI',
  ]

  s.dependency 'React-Core'
end
