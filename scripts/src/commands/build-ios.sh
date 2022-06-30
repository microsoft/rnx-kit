#!/usr/bin/env bash

set -eo pipefail

build_actions=(build)

usage() {
  echo "Build an iOS project stored in the 'ios' directory of a package."
  echo "This must be run from the package directory."
  echo ""
  echo "USAGE: build-ios <options>"
  echo ""
  echo "OPTIONS:"
  echo "  --clean                 Optional. Clean up intermediate files before building."
  echo "  -s, --scheme <name>     Required. Name of the Xcode scheme to build"
  echo "  -w, --workspace <name>  Required. Name of the Xcode workspace file (without extension)."
  echo "                          This file must exist under the 'ios' directory."
  echo "                          Example: 'MyApp' --> ios/MyApp.xcworkspace"
  echo ""
  exit 1
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --clean )
      build_actions=("clean" "${build_actions[@]}")
      shift
      ;;
    -s|--scheme )
      scheme="$2"
      shift
      shift
      ;;
    -w|--workspace )
      workspace="$2"
      shift
      shift
      ;;
    -[?]|-h|--help )
      usage
      ;;
    * )
      echo ""
      echo "ERROR: unknown option: $1"
      echo ""
      usage
      ;;
  esac
done

if [[ -z "$workspace" ]]; then
  echo ""
  echo "ERROR: missing required option: -w, --workspace"
  echo ""
  usage
fi

if [[ -z "$scheme" ]]; then
  echo ""
  echo "ERROR: missing required option: -s, --scheme"
  echo ""
  usage
fi

if [[ ! -d "ios/${workspace}.xcworkspace" ]]; then
  package=$(basename $(pwd))
  echo ""
  echo "ERROR: Xcode workspace 'ios/${workspace}.xcworkspace' not found in package '${package}'."
  echo "       Maybe you need to run 'pod install --project-directory=ios'?"
  echo ""
  exit 1
fi

if [[ "$CCACHE_DISABLE" != "1" ]]; then
  ccache_libexec="/usr/local/opt/ccache/libexec"
  if [[ ! -d "$ccache_libexec" ]]; then
    brew install ccache
  fi

  export CC="$(git rev-parse --show-toplevel)/scripts/clang"
  export CCACHE_DIR="$(git rev-parse --show-toplevel)/.ccache"

  ccache --zero-stats 1> /dev/null
fi

cd ios
export RCT_NO_LAUNCH_PACKAGER=1

xcodebuild -workspace "${workspace}.xcworkspace" -scheme "${scheme}" -destination "generic/platform=iOS Simulator" CODE_SIGNING_ALLOWED=NO COMPILER_INDEX_STORE_ENABLE=NO "${build_actions[@]}"

if [[ "$CCACHE_DISABLE" != "1" ]]; then
  ccache --show-stats --verbose
fi
