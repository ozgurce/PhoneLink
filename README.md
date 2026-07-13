# PhoneControl

PhoneControl is a standalone Windows tray app and LAN web controller for L-Connect LCD devices. It does not edit theme files. It talks to the local L-Connect service and exposes a phone-friendly web UI for:

- Device selection
- Installed theme selection with preview
- Theme apply through L-Connect
- Brightness command attempts through L-Connect

## Run

Open `PhoneControl.exe`, or run during development:

```powershell
dotnet run --project D:\ThemeEditor\PhoneControl
```

The settings window opens on startup. Closing or minimizing the window keeps PhoneControl running in the Windows notification area.

Default address:

```text
http://<pc-ip>:37373
```

The settings window shows the LAN URL. PIN protection is optional; when enabled, the user chooses the PIN.

## Configure

Edit `appsettings.json` or pass values on the command line:

```powershell
dotnet run --project D:\ThemeEditor\PhoneControl --PhoneControl:Port=37373
```

Settings can also be changed in the Windows settings window. Saving restarts the embedded web server when needed.

## Notes

- L-Connect must be running on the PC.
- Windows Firewall must allow inbound access to the selected PhoneControl port.
- Theme switching uses `ReloadAssets`, `ApplyTemplate`, `SetTemplate`, `Apply2DTemplate`, `SaveProfile`, and `ApplyScreenContent`.
- Brightness support depends on the exact L-Connect command accepted by the installed L-Connect version. PhoneControl tries known command variants and reports failure if none are accepted.
