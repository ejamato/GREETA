#!/bin/sh
set -eu

project_root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
uninstaller="$project_root/integration/lightdm-webkit-greeter/uninstall.sh"

if [ "$(id -u)" -ne 0 ]; then
  if ! command -v pkexec >/dev/null 2>&1; then
    echo "pkexec is required to remove the LightDM greeter." >&2
    exit 1
  fi
  exec pkexec "$project_root/uninstall.sh" "$@"
fi

exec "$uninstaller" "$@"
