#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this rollback as root (for example with pkexec)." >&2
  exit 1
fi

rm -f /etc/lightdm/lightdm.conf.d/99-eja-webkit-greeter.conf
rm -f /usr/share/xgreeters/eja-webkit-greeter.desktop
rm -f /usr/local/lib/eja-lightdm-greeter/greeter.py
rmdir /usr/local/lib/eja-lightdm-greeter 2>/dev/null || true
find /usr/local/share/eja-lightdm-greeter -depth -type f -delete 2>/dev/null || true
find /usr/local/share/eja-lightdm-greeter -depth -type d -empty -delete 2>/dev/null || true

echo "EJA WebKit greeter selection removed. LightDM will use its remaining greeter configuration."
