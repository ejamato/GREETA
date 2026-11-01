#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this installer as root (for example with pkexec)." >&2
  exit 1
fi

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
app_dir=/usr/local/lib/eja-lightdm-greeter
theme_dir=/usr/local/share/eja-lightdm-greeter
desktop_file=/usr/share/xgreeters/eja-webkit-greeter.desktop
config_file=/etc/lightdm/lightdm.conf.d/99-eja-webkit-greeter.conf
state_dir=/var/lib/lightdm/eja-webkit-greeter

/usr/bin/python3 -c 'import gi; gi.require_version("LightDM", "1"); gi.require_version("WebKit2", "4.1"); from gi.repository import LightDM, WebKit2'
test -r "$project_root/index.html"
test -r "$project_root/assets/js/auth.js"

if [ -e "$config_file" ] && ! grep -q '^greeter-session=eja-webkit-greeter$' "$config_file"; then
  echo "Refusing to overwrite an existing LightDM configuration: $config_file" >&2
  exit 1
fi

for graphics_group in render video; do
  if getent group "$graphics_group" >/dev/null; then
    usermod -a -G "$graphics_group" lightdm
  else
    echo "Graphics group '$graphics_group' is unavailable; hardware acceleration may not work." >&2
  fi
done

install -d -o root -g root -m 0755 "$app_dir" "$theme_dir"
install -d -o lightdm -g lightdm -m 0750 "$state_dir"
install -o root -g root -m 0755 \
  "$project_root/integration/lightdm-webkit-greeter/greeter.py" \
  "$app_dir/greeter.py"
cp -a "$project_root/index.html" "$project_root/assets" "$theme_dir/"
chown -R root:root "$theme_dir"
find "$theme_dir" -type d -exec chmod 0755 {} +
find "$theme_dir" -type f -exec chmod 0644 {} +
install -o root -g root -m 0644 \
  "$project_root/integration/lightdm-webkit-greeter/eja-webkit-greeter.desktop" \
  "$desktop_file"
install -d -o root -g root -m 0755 /etc/lightdm/lightdm.conf.d
printf '[Seat:*]\ngreeter-session=eja-webkit-greeter\n' > "$config_file"
chown root:root "$config_file"
chmod 0644 "$config_file"

echo "EJA WebKit greeter installed and selected for the next LightDM start."
echo "Slick Greeter remains installed; rollback with integration/lightdm-webkit-greeter/uninstall.sh."
echo "Do not restart LightDM until you have saved your work."
