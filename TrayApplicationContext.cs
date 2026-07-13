namespace PhoneControl;

public sealed class TrayApplicationContext : ApplicationContext
{
    private readonly PhoneControlSettingsStore settingsStore;
    private readonly PhoneControlServer server;
    private readonly SettingsForm settingsForm;
    private readonly NotifyIcon notifyIcon;

    public TrayApplicationContext(PhoneControlSettingsStore settingsStore, PhoneControlServer server)
    {
        this.settingsStore = settingsStore;
        this.server = server;
        settingsForm = new SettingsForm(settingsStore, server);

        notifyIcon = new NotifyIcon
        {
            Text = "Lian-Li Phone Link",
            Icon = LoadAppIcon(),
            Visible = true,
            ContextMenuStrip = BuildMenu()
        };
        notifyIcon.DoubleClick += (_, _) => ShowSettings();

        _ = StartServerAsync();
        settingsForm.Show();
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            notifyIcon.Visible = false;
            notifyIcon.Dispose();
            settingsForm.Dispose();
            server.DisposeAsync().AsTask().GetAwaiter().GetResult();
        }

        base.Dispose(disposing);
    }

    private ContextMenuStrip BuildMenu()
    {
        var menu = new ContextMenuStrip();
        menu.Items.Add("Settings", null, (_, _) => ShowSettings());
        menu.Items.Add("Open Web UI", null, (_, _) => OpenWebUi());
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add("Exit", null, async (_, _) => await ExitAsync());
        return menu;
    }

    private async Task StartServerAsync()
    {
        await server.StartAsync();
        settingsForm.RefreshServerState();
        notifyIcon.Text = server.IsRunning ? "Lian-Li Phone Link running" : "Lian-Li Phone Link stopped";
        if (!server.IsRunning)
        {
            notifyIcon.ShowBalloonTip(5000, "Lian-Li Phone Link", server.LastError, ToolTipIcon.Error);
        }
    }

    private void ShowSettings()
    {
        settingsForm.Show();
        if (settingsForm.WindowState == FormWindowState.Minimized)
        {
            settingsForm.WindowState = FormWindowState.Normal;
        }

        settingsForm.Activate();
        settingsForm.RefreshServerState();
    }

    private void OpenWebUi()
    {
        var url = server.Urls.FirstOrDefault() ?? $"http://localhost:{settingsStore.Load().Port}";
        System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(url) { UseShellExecute = true });
    }

    private async Task ExitAsync()
    {
        settingsForm.AllowExit();
        await server.StopAsync();
        notifyIcon.Visible = false;
        settingsForm.Close();
        ExitThread();
    }

    private static Icon LoadAppIcon()
    {
        var iconPath = Path.Combine(AppContext.BaseDirectory, "phonecontrol.ico");
        return File.Exists(iconPath) ? new Icon(iconPath) : SystemIcons.Application;
    }
}
