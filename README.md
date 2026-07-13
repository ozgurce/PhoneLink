# Lian-Li Phone Link (PhoneLink)

Lian-Li Phone Link is a standalone Windows tray app and LAN web controller for L-Connect LCD devices. It does not edit theme files. It communicates with the local L-Connect service and exposes a mobile-friendly web UI for:

- Device selection
- Installed theme selection with preview
- Theme application through L-Connect
- Brightness control commands through L-Connect

## Run / Development

Start the application by launching the built executable, or run it during development:

```powershell
dotnet run --project d:\PhoneControl
```

The settings window opens on startup. Closing or minimizing the window keeps PhoneLink running in the Windows notification area (system tray).

Default address:

```text
http://<pc-ip>:37373
```

The settings window shows the current LAN URL. PIN protection is optional; when enabled, the user can set a custom PIN.

## Configuration

Edit `appsettings.json` or pass values on the command line:

```powershell
dotnet run --project d:\PhoneControl --PhoneControl:Port=37373
```

Settings can also be modified in the Windows settings window. Saving settings automatically restarts the embedded web server if necessary.

## Notes

- L-Connect must be running on the PC.
- Windows Firewall must allow inbound access to the selected port.
- Theme switching uses `ReloadAssets`, `ApplyTemplate`, `SetTemplate`, `Apply2DTemplate`, `SaveProfile`, and `ApplyScreenContent` from the L-Connect service interface.
- Brightness support depends on the exact command variants accepted by the installed L-Connect version. PhoneLink attempts multiple known command patterns.
