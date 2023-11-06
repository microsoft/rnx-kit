/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

// https://github.com/cezaraugusto/chromium-edge-launcher/blob/master/docs/edge-flags-for-tools.md

export const DEFAULT_FLAGS: readonly string[] = [
  // Disable built-in Google Translate service
  '--disable-features=Translate',
  // Disable all edge extensions
  '--disable-extensions',
  // Disable some extensions that aren't affected by --disable-extensions
  '--disable-component-extensions-with-background-pages',
  // Disable various background network services, including extension updating,
  //   safe browsing service, upgrade detector, translate, UMA
  '--disable-background-networking',
  // Don't update the browser 'components' listed at edge://components/
  '--disable-component-update',
  // Disables client-side phishing detection.
  '--disable-client-side-phishing-detection',
  // Disable syncing to a Google account
  '--disable-sync',
  // Disable reporting to UMA, but allows for collection
  '--metrics-recording-only',
  // Disable installation of default apps on first run
  '--disable-default-apps',
  // Mute any audio
  '--mute-audio',
  // Disable the default browser check, do not prompt to set it as such
  '--no-default-browser-check',
  // Skip first run wizards
  '--no-first-run',
  // Disable backgrounding renders for occluded windows
  '--disable-backgrounding-occluded-windows',
  // Disable renderer process backgrounding
  '--disable-renderer-backgrounding',
  // Disable task throttling of timer tasks from background pages.
  '--disable-background-timer-throttling',
  // Disable the default throttling of IPC between renderer & browser processes.
  '--disable-ipc-flooding-protection',
  // Avoid potential instability of using Gnome Keyring or KDE wallet. crbug.com/571003 crbug.com/991424
  '--password-store=basic',
  // Use mock keychain on Mac to prevent blocking permissions dialogs
  '--use-mock-keychain',
  // Disable background tracing (aka slow reports & deep reports) to avoid 'Tracing already started'
  '--force-fieldtrials=*BackgroundTracing/default/',
];
