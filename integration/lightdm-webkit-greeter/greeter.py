#!/usr/bin/python3

import argparse
import json
import logging
import os
import pathlib
import shutil
import subprocess
import sys

os.environ.setdefault("WEBKIT_DISABLE_DMABUF_RENDERER", "1")

import gi

gi.require_version("Gtk", "3.0")
gi.require_version("Gdk", "3.0")
gi.require_version("LightDM", "1")
gi.require_version("WebKit2", "4.1")
from gi.repository import Gdk, GLib, Gtk, LightDM, WebKit2

LOG = logging.getLogger("eja-webkit-greeter")
INSTALLED_THEME = pathlib.Path("/usr/local/share/eja-lightdm-greeter")
PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[2]
READY_SOUND = pathlib.Path("/usr/share/sounds/LinuxMint/stereo/system-ready.ogg")
ALSA_READY_SOUND = pathlib.Path("/usr/share/sounds/linuxmint-login.wav")


class EjaGreeter:
    def __init__(self, theme_dir, preview=False, smoke_test=False, fullscreen=False):
        self.theme_dir = pathlib.Path(theme_dir).resolve()
        self.index_file = self.theme_dir / "index.html"
        self.index_uri = self.index_file.as_uri()
        self.preview = preview
        self.smoke_test = smoke_test
        self.performance_test = False
        self.fullscreen = fullscreen or not preview
        self.page_loaded = False
        self.greeter = None
        self.authenticated = False
        self.ready_sound_started = False
        self.sound_process = None

        if not self.index_file.is_file():
            raise FileNotFoundError(f"EJA login page was not found: {self.index_file}")

        if not preview:
            self.greeter = LightDM.Greeter.new()
            self.greeter.connect("show-prompt", self.on_show_prompt)
            self.greeter.connect("show-message", self.on_show_message)
            self.greeter.connect(
                "authentication-complete", self.on_authentication_complete
            )
            if not self.greeter.connect_to_daemon_sync():
                raise RuntimeError("Could not connect the EJA greeter to LightDM.")

        self.bootstrap = self.get_bootstrap_data()
        self.create_window()

    def get_bootstrap_data(self):
        if self.preview:
            return {
                "hostname": "eja-preview",
                "username": "cavathaeon",
                "display_name": "CAVATHAEON",
                "sessions": [{"key": "cinnamon", "name": "Cinnamon"}],
                "is_authenticated": False,
            }

        users = LightDM.UserList.get_instance().get_users()
        selected_name = self.greeter.get_select_user_hint()
        selected_user = next(
            (user for user in users if user.get_name() == selected_name),
            None,
        )
        login_users = [user for user in users if user.get_uid() >= 500]
        if selected_user is None and login_users:
            selected_user = login_users[0]

        sessions = [
            {"key": session.get_key(), "name": session.get_name()}
            for session in LightDM.get_sessions()
        ]
        if not sessions:
            raise RuntimeError("LightDM did not report any available sessions.")

        return {
            "hostname": LightDM.get_hostname() or "",
            "username": selected_user.get_name() if selected_user else "",
            "display_name": (
                selected_user.get_display_name() or selected_user.get_name()
                if selected_user
                else ""
            ),
            "sessions": sessions,
            "is_authenticated": False,
        }

    def create_window(self):
        manager = WebKit2.UserContentManager()
        if not manager.register_script_message_handler("lightdm"):
            raise RuntimeError("Could not register the LightDM WebKit bridge.")
        manager.connect(
            "script-message-received::lightdm",
            self.on_script_message,
        )
        manager.add_script(
            WebKit2.UserScript(
                self.build_bridge_script(),
                WebKit2.UserContentInjectedFrames.ALL_FRAMES,
                WebKit2.UserScriptInjectionTime.START,
                None,
                None,
            )
        )

        self.window = Gtk.Window()
        self.window.set_title("EJA Login")
        self.window.set_decorated(self.preview and not self.fullscreen)
        self.window.set_resizable(True)
        screen = Gdk.Screen.get_default()
        if screen is None:
            raise RuntimeError("Could not detect the greeter display.")
        if self.fullscreen:
            monitor = screen.get_primary_monitor()
            geometry = screen.get_monitor_geometry(monitor)
            self.window.set_default_size(geometry.width, geometry.height)
            self.window.set_keep_above(True)
        else:
            self.window.set_default_size(1280, 800)
            self.window.set_position(Gtk.WindowPosition.CENTER)

        self.webview = WebKit2.WebView.new_with_user_content_manager(manager)
        self.webview.set_hexpand(True)
        self.webview.set_vexpand(True)
        self.webview.set_halign(Gtk.Align.FILL)
        self.webview.set_valign(Gtk.Align.FILL)
        self.webview.set_background_color(Gdk.RGBA(0, 0, 0, 0))
        settings = self.webview.get_settings()
        settings.set_hardware_acceleration_policy(
            WebKit2.HardwareAccelerationPolicy.ALWAYS
        )
        if hasattr(settings, "set_enable_smooth_scrolling"):
            settings.set_enable_smooth_scrolling(False)
        settings.set_enable_developer_extras(False)
        settings.set_javascript_can_access_clipboard(False)
        settings.set_javascript_can_open_windows_automatically(False)
        self.webview.connect("load-changed", self.on_load_changed)
        self.webview.connect("load-failed", self.on_load_failed)
        self.webview.connect("decide-policy", self.on_decide_policy)
        self.webview.connect("create", self.on_create_webview)
        self.window.add(self.webview)
        self.window.connect("map-event", self.on_window_map)
        self.window.connect("destroy", Gtk.main_quit)
        self.window.show_all()
        if self.fullscreen:
            GLib.idle_add(self.enter_fullscreen)
        self.webview.load_uri(self.index_uri)

    def on_window_map(self, window, event):
        display = Gdk.Display.get_default()
        if display:
            cursor = Gdk.Cursor.new_for_display(display, Gdk.CursorType.LEFT_PTR)
            gdk_window = self.webview.get_window()
            if gdk_window:
                gdk_window.set_cursor(cursor)
        if self.fullscreen:
            GLib.idle_add(self.enter_fullscreen)
        return False

    def enter_fullscreen(self):
        if not self.window.get_visible():
            return GLib.SOURCE_REMOVE
        self.window.fullscreen()
        self.window.present()
        return GLib.SOURCE_REMOVE

    def build_bridge_script(self):
        data = json.dumps(self.bootstrap, ensure_ascii=True)
        return f"""
            (() => {{
              const info = {data};
              window.EJA_PERFORMANCE_MODE = "optimized";
              document.documentElement.classList.add("eja-optimized");
              const send = (method, values = {{}}) =>
                window.webkit.messageHandlers.lightdm.postMessage(
                  JSON.stringify({{ method, ...values }})
                );
              window.lightdm = {{
                ...info,
                authenticate: username => send("authenticate", {{ username }}),
                respond: response => send("respond", {{ response }}),
                start_session: session => send("start_session", {{ session }}),
                suspend: () => send("suspend"),
                restart: () => send("restart"),
                shutdown: () => send("shutdown")
              }};
            }})();
        """

    def on_load_changed(self, webview, event):
        if event != WebKit2.LoadEvent.FINISHED:
            return
        self.page_loaded = True
        if not self.preview:
            self.play_ready_sound()
            self.webview.grab_focus()
        if self.smoke_test:
            self.run_smoke_test()
        if self.performance_test:
            self.run_performance_test()

    def play_ready_sound(self):
        if self.ready_sound_started:
            return
        self.ready_sound_started = True
        if not READY_SOUND.is_file():
            LOG.warning("Mint login-ready sound was not found: %s", READY_SOUND)
            return
        player = shutil.which("paplay")
        if not player:
            LOG.warning("PulseAudio playback is unavailable; trying the ALSA fallback.")
            self.play_alsa_ready_sound()
            return
        try:
            self.sound_process = subprocess.Popen(
                [
                    player,
                    "--client-name=EJA Login Ready",
                    str(READY_SOUND),
                ],
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE,
                text=True,
            )
        except OSError:
            LOG.exception("Could not start the EJA login-ready sound.")
            return
        GLib.child_watch_add(
            GLib.PRIORITY_DEFAULT,
            self.sound_process.pid,
            self.on_pulse_sound_exit,
            self.sound_process,
        )

    def on_pulse_sound_exit(self, pid, status, process):
        stderr = process.stderr.read().strip() if process.stderr else ""
        if not os.WIFEXITED(status) or os.WEXITSTATUS(status) != 0:
            LOG.warning(
                "PulseAudio login-ready sound failed (status %s): %s; trying ALSA.",
                status,
                stderr or "no additional error details",
            )
            self.play_alsa_ready_sound()
        process.stderr.close() if process.stderr else None

    def play_alsa_ready_sound(self):
        player = shutil.which("aplay")
        if not player or not ALSA_READY_SOUND.is_file():
            LOG.warning("The ALSA login-ready sound fallback is unavailable.")
            return
        try:
            process = subprocess.Popen(
                [player, "-q", "-D", "sysdefault", str(ALSA_READY_SOUND)],
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE,
                text=True,
            )
        except OSError:
            LOG.exception("Could not start the ALSA login-ready sound.")
            return
        GLib.child_watch_add(
            GLib.PRIORITY_DEFAULT,
            process.pid,
            self.on_alsa_sound_exit,
            process,
        )

    @staticmethod
    def on_alsa_sound_exit(pid, status, process):
        stderr = process.stderr.read().strip() if process.stderr else ""
        if not os.WIFEXITED(status) or os.WEXITSTATUS(status) != 0:
            LOG.warning(
                "ALSA login-ready sound failed (status %s): %s",
                status,
                stderr or "no additional error details",
            )
        process.stderr.close() if process.stderr else None

    def on_load_failed(self, webview, event, uri, error):
        LOG.error("Failed to load EJA page %s: %s", uri, error)
        return False

    def on_decide_policy(self, webview, decision, decision_type):
        if decision_type != WebKit2.PolicyDecisionType.NAVIGATION_ACTION:
            return False
        action = decision.get_navigation_action()
        uri = action.get_request().get_uri()
        if uri == self.index_uri:
            decision.use()
        else:
            LOG.warning("Blocked greeter navigation outside EJA: %s", uri)
            decision.ignore()
        return True

    def on_create_webview(self, webview, navigation_action):
        return None

    def evaluate_javascript(self, script, callback=None):
        if not self.page_loaded:
            return

        def finished(view, result, user_data):
            try:
                value = view.evaluate_javascript_finish(result)
                if callback:
                    callback(value.to_string())
            except GLib.Error as error:
                LOG.error("Could not evaluate EJA greeter script: %s", error)
                if callback:
                    callback(None)

        self.webview.evaluate_javascript(
            script,
            -1,
            None,
            self.index_uri,
            None,
            finished,
            None,
        )

    def call_page(self, function, *args):
        encoded_args = ", ".join(json.dumps(arg, ensure_ascii=True) for arg in args)
        self.evaluate_javascript(f"window.{function}?.({encoded_args});")

    def on_script_message(self, manager, result):
        try:
            message = json.loads(result.get_js_value().to_string())
            self.handle_command(message)
        except (json.JSONDecodeError, TypeError, ValueError) as error:
            LOG.error("Invalid message from EJA greeter page: %s", error)
            self.call_page("show_message", "Invalid greeter request.", "error")
        except Exception as error:
            LOG.exception("EJA greeter request failed")
            self.call_page("show_message", str(error), "error")

    def handle_command(self, message):
        method = message.get("method")
        if self.preview:
            if method == "authenticate":
                self.call_page(
                    "show_prompt",
                    "Preview only — authentication is disabled.",
                    "password",
                )
            elif method == "respond":
                self.call_page(
                    "show_message", "Preview only — password was not sent.", "error"
                )
            elif method in {"suspend", "restart", "shutdown"}:
                self.call_page(
                    "show_message", "Power actions are disabled in preview.", "info"
                )
            return

        if method == "authenticate":
            username = message.get("username")
            if username != self.bootstrap["username"]:
                raise ValueError("The selected username cannot be changed.")
            if not username:
                raise ValueError("Username is required.")
            if not self.greeter.authenticate(username):
                raise RuntimeError("LightDM could not start authentication.")
            self.authenticated = False
        elif method == "respond":
            response = message.get("response")
            if not isinstance(response, str):
                raise ValueError("Authentication response must be text.")
            if not self.greeter.respond(response):
                raise RuntimeError("LightDM rejected the authentication response.")
        elif method == "start_session":
            session = message.get("session")
            available_sessions = {item["key"] for item in self.bootstrap["sessions"]}
            if session not in available_sessions:
                raise ValueError("The requested login session is unavailable.")
            if not self.greeter.start_session_sync(session):
                raise RuntimeError("LightDM could not start the selected session.")
        elif method in {"suspend", "restart", "shutdown"}:
            self.run_power_action(method)
        else:
            raise ValueError(f"Unknown greeter action: {method}")

    def run_power_action(self, action):
        can_run = {
            "suspend": LightDM.get_can_suspend,
            "restart": LightDM.get_can_restart,
            "shutdown": LightDM.get_can_shutdown,
        }[action]
        run = {
            "suspend": LightDM.suspend,
            "restart": LightDM.restart,
            "shutdown": LightDM.shutdown,
        }[action]
        if not can_run():
            raise RuntimeError(f"{action.capitalize()} is not available.")
        if not run():
            raise RuntimeError(f"LightDM could not {action}.")

    def on_show_prompt(self, greeter, text, prompt_type):
        prompt = "password" if prompt_type == LightDM.PromptType.SECRET else "question"
        self.call_page("show_prompt", text, prompt)

    def on_show_message(self, greeter, text, message_type):
        message = "error" if message_type == LightDM.MessageType.ERROR else "info"
        self.call_page("show_message", text, message)

    def on_authentication_complete(self, greeter):
        self.authenticated = greeter.get_is_authenticated()
        self.evaluate_javascript(
            "window.lightdm.is_authenticated = "
            + ("true" if self.authenticated else "false")
            + "; window.authentication_complete?.();"
        )

    def run_smoke_test(self):
        script = """
          JSON.stringify({
            title: document.title,
            bridge: typeof window.lightdm?.authenticate === "function",
            performanceMode: window.EJA_PERFORMANCE_MODE,
            optimizedClass: document.documentElement.classList.contains("eja-optimized"),
            username: Boolean(
              document.getElementById("login-user")?.readOnly
              && document.getElementById("login-user").value === window.lightdm?.username
            ),
            password: Boolean(document.getElementById("password")),
            cinnamon: window.lightdm?.sessions?.some(item =>
              item.name.toLowerCase().includes("cinnamon"))
          })
        """

        def checked(result):
            try:
                status = json.loads(result) if result else {}
            except json.JSONDecodeError:
                status = {}
            required = (
                "bridge",
                "username",
                "password",
                "cinnamon",
            )
            passed = all(status.get(key) for key in required)
            passed = passed and status.get("performanceMode") == "optimized"
            passed = passed and status.get("optimizedClass")
            if not passed:
                self.exit_code = 1
                print(f"EJA greeter smoke test: FAIL {status}", flush=True)
                self.window.destroy()
                return

            self.evaluate_javascript("""
                  (() => {
                    document.getElementById("login-user").value = "eja-smoke-user";
                    document.getElementById("password").value = "eja-smoke-password";
                    document.getElementById("login-form").dispatchEvent(
                      new Event("submit", { bubbles: true, cancelable: true })
                    );
                  })();
                """)
            GLib.timeout_add(500, self.check_preview_auth_flow)

        self.exit_code = 0
        self.evaluate_javascript(script, checked)

    def run_performance_test(self):
        phases = [
            ("both", True, True),
            ("pixel-mates-only", True, False),
            ("ambience-only", False, True),
            ("raf-only", False, False),
        ]
        results = []

        def capture_phase(index):
            name, pixel_enabled, ambience_enabled = phases[index]
            config = (
                "window.EJALoop?.setCallbacksEnabled(true);"
                "window.EJALoop?.setCallbackEnabled('pixel-mates', "
                + json.dumps(pixel_enabled)
                + ");"
                "window.EJALoop?.setCallbackEnabled('ambience', "
                + json.dumps(ambience_enabled)
                + ");"
            )
            self.evaluate_javascript(config)
            GLib.timeout_add_seconds(4, report_phase, index, name)
            return GLib.SOURCE_REMOVE

        def report_phase(index, name):
            script = """
              (() => {
              const loop = window.EJALoop?.getPerformance();
              const averageFrameIntervalMs = loop?.averageFrameIntervalMs || 0;
              return JSON.stringify({
                displayedFps: document.getElementById("fpsCounter")?.textContent,
                measuredFps: averageFrameIntervalMs
                  ? `${Math.round(1000 / averageFrameIntervalMs)} FPS`
                  : "unavailable",
                loop
              });
              })()
            """

            def finished(result):
                try:
                    result = json.loads(result) if result else {}
                except json.JSONDecodeError:
                    result = {"error": "Could not read the animation measurement."}
                results.append({"phase": name, **result})
                if index + 1 == len(phases):
                    self.evaluate_javascript(
                        """
                          JSON.stringify({
                            pixelCanvas: [
                              document.getElementById("worldCanvas")?.width,
                              document.getElementById("worldCanvas")?.height
                            ],
                            ambienceCanvas: [
                              document.getElementById("ambienceCanvas")?.width,
                              document.getElementById("ambienceCanvas")?.height
                            ],
                            viewport: [window.innerWidth, window.innerHeight],
                            mode: window.EJA_PERFORMANCE_MODE
                          })
                        """,
                        lambda value: self.finish_performance_report(value, results),
                    )
                else:
                    GLib.timeout_add_seconds(0, capture_phase, index + 1)

            self.evaluate_javascript(script, finished)
            return GLib.SOURCE_REMOVE

        GLib.timeout_add_seconds(4, capture_phase, 0)

    def finish_performance_report(self, result, phases):
        try:
            canvases = json.loads(result) if result else {}
        except json.JSONDecodeError:
            canvases = {"error": "Could not read canvas sizes."}
        print(
            f"EJA preview performance: "
            f"{json.dumps({'canvases': canvases, 'phases': phases})}",
            flush=True,
        )
        self.window.destroy()

    def check_preview_auth_flow(self):
        script = """
          JSON.stringify({
            previewMessage: document.getElementById("auth-message").textContent,
            passwordCleared: document.getElementById("password").value === ""
          })
        """

        def checked(result):
            try:
                status = json.loads(result) if result else {}
            except json.JSONDecodeError:
                status = {}
            passed = "Preview only" in status.get("previewMessage", "") and status.get(
                "passwordCleared"
            )
            self.exit_code = 0 if passed else 1
            print(
                f"EJA greeter smoke test: {'PASS' if passed else 'FAIL'} " f"{status}",
                flush=True,
            )
            self.window.destroy()

        self.evaluate_javascript(script, checked)
        return GLib.SOURCE_REMOVE


def main():
    parser = argparse.ArgumentParser(description="EJA LightDM WebKit greeter")
    parser.add_argument(
        "--preview", action="store_true", help="Run without LightDM authentication"
    )
    parser.add_argument(
        "--smoke-test",
        action="store_true",
        help="Load the login page and check its LightDM bridge",
    )
    parser.add_argument(
        "--fullscreen", action="store_true", help="Preview in fullscreen"
    )
    parser.add_argument(
        "--performance-test",
        action="store_true",
        help="Measure the preview rendering after startup without authenticating",
    )
    parser.add_argument("--theme-dir", type=pathlib.Path, help=argparse.SUPPRESS)
    args = parser.parse_args()
    if (args.smoke_test or args.performance_test) and not args.preview:
        parser.error("Preview tests are available only together with --preview.")
    if args.theme_dir:
        theme_dir = args.theme_dir
    elif args.preview and (PROJECT_ROOT / "index.html").is_file():
        theme_dir = PROJECT_ROOT
    else:
        theme_dir = INSTALLED_THEME

    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    Gtk.init(None)
    try:
        app = EjaGreeter(theme_dir, args.preview, args.smoke_test, args.fullscreen)
    except Exception as error:
        LOG.exception("Could not start EJA LightDM greeter")
        return 1
    app.exit_code = 0
    app.performance_test = args.performance_test
    Gtk.main()
    return app.exit_code


if __name__ == "__main__":
    sys.exit(main())
