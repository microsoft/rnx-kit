#!/bin/bash
set -eox pipefail

case ${1-} in
  archive)
    archive=$2
    file=$3
    # bsdtar corrupts files when archiving due to APFS sparse files. A
    # workaround is to use GNU Tar instead. See also:
    #   - https://github.com/actions/cache/issues/403
    #   - https://github.com/actions/virtual-environments/issues/2619
    gtar -cvf ${archive} -C "$(dirname ${file})" "$(basename ${file})"
    shasum --algorithm 256 ${archive}
    ;;
  build-ios)
    shift
    while [[ "$#" -gt 0 ]]; do
      case $1 in
        --archs)
          archs="ARCHS=$2"
          shift 2
          ;;
        --device-type)
          device_type="$2"
          shift 2
          ;;
        --scheme)
          scheme="$2"
          shift 2
          ;;
        *)
          echo "Unknown option: $1"
          exit 1
          ;;
      esac
    done
    if [[ "${device_type}" == 'device' ]]; then
      destination='generic/platform=iOS'
      archs=''
      code_signing=''
    else
      destination='generic/platform=iOS Simulator'
      code_signing='CODE_SIGNING_ALLOWED=NO'
    fi
    xcworkspace=$(find . -maxdepth 1 -name '*.xcworkspace' -type d | head -1)
    # We need to disable Clang sanitizers otherwise the app will crash on
    # startup trying to load Clang sanitizer libraries that would only
    # exist if Xcode was attached.
    xcodebuild -workspace "${xcworkspace}" \
               -scheme ${scheme} \
               -destination "${destination}" \
               -configuration Debug \
               -derivedDataPath DerivedData \
               -archivePath ${XCARCHIVE_FILE} \
               ${archs} \
               ${code_signing} \
               CLANG_ADDRESS_SANITIZER=NO \
               CLANG_UNDEFINED_BEHAVIOR_SANITIZER=NO \
               OTHER_CFLAGS='$(inherited) -fstack-protector-strong' \
               OTHER_LDFLAGS='$(inherited) -fstack-protector-strong' \
               COMPILER_INDEX_STORE_ENABLE=NO \
               archive
    ;;
  build-macos)
    shift
    while [[ "$#" -gt 0 ]]; do
      case $1 in
        --scheme)
          scheme="$2"
          shift 2
          ;;
        *)
          echo "Unknown option: $1"
          exit 1
          ;;
      esac
    done
    xcworkspace=$(find . -maxdepth 1 -name '*.xcworkspace' -type d | head -1)
    # We need to disable Clang sanitizers otherwise the app will crash on
    # startup trying to load Clang sanitizer libraries that would only
    # exist if Xcode was attached.
    xcodebuild -workspace "${xcworkspace}" \
               -scheme ${scheme} \
               -configuration Debug \
               -derivedDataPath DerivedData \
               CODE_SIGNING_ALLOWED=NO \
               CLANG_ADDRESS_SANITIZER=NO \
               CLANG_UNDEFINED_BEHAVIOR_SANITIZER=NO \
               OTHER_CFLAGS='$(inherited) -fstack-protector-strong' \
               OTHER_LDFLAGS='$(inherited) -fstack-protector-strong' \
               COMPILER_INDEX_STORE_ENABLE=NO \
               build
    ;;
  install-certificate)
    # https://docs.github.com/en/actions/deployment/deploying-xcode-applications/installing-an-apple-certificate-on-macos-runners-for-xcode-development
    mkdir -p "$(dirname "${HOME}/${PROVISION_PATH}")"

    echo -n "${BUILD_CERTIFICATE_BASE64}" | base64 --decode --output "${RUNNER_TEMP}/${CERTIFICATE_FILE}"
    echo -n "${BUILD_PROVISION_PROFILE_BASE64}" | base64 --decode --output "${HOME}/${PROVISION_PATH}"

    security create-keychain -p "${KEYCHAIN_PASSWORD}" "${RUNNER_TEMP}/${KEYCHAIN_FILE}"
    security set-keychain-settings -lut 21600 "${RUNNER_TEMP}/${KEYCHAIN_FILE}"
    security unlock-keychain -p "${KEYCHAIN_PASSWORD}" "${RUNNER_TEMP}/${KEYCHAIN_FILE}"

    security import "${RUNNER_TEMP}/${CERTIFICATE_FILE}" -k "${RUNNER_TEMP}/${KEYCHAIN_FILE}" -t cert -f pkcs12 -P "${P12_PASSWORD}" -A -T '/usr/bin/codesign' -T '/usr/bin/security'
    security set-key-partition-list -S apple-tool:,apple: -k ${KEYCHAIN_PASSWORD} "${RUNNER_TEMP}/${KEYCHAIN_FILE}" 1> /dev/null
    security list-keychain -d user -s "${RUNNER_TEMP}/${KEYCHAIN_FILE}" login.keychain
    ;;
  uninstall-certificate)
    # Always run this job step, even if previous ones fail. See also
    # https://docs.github.com/en/actions/deployment/deploying-xcode-applications/installing-an-apple-certificate-on-macos-runners-for-xcode-development#required-clean-up-on-self-hosted-runners
    security delete-keychain "${RUNNER_TEMP}/${KEYCHAIN_FILE}"
    rm -f "${RUNNER_TEMP}/${CERTIFICATE_FILE}" "${HOME}/${PROVISION_PATH}"
    ;;
esac
