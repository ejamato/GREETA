#!/bin/sh
set -eu

project_root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
installer="$project_root/integration/lightdm-webkit-greeter/install.sh"

if [ "$(id -u)" -ne 0 ]; then
  if ! command -v pkexec >/dev/null 2>&1; then
    echo "pkexec is required to install the LightDM greeter." >&2
    exit 1
  fi
  exec pkexec "$project_root/install.sh" "$@"
fi

exec "$installer" "$@"
