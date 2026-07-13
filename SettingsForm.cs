using System.Diagnostics;
using System.Drawing.Drawing2D;

namespace PhoneControl;

public sealed class SettingsForm : Form
{
    private readonly PhoneControlSettingsStore settingsStore;
    private readonly PhoneControlServer server;
    private readonly TextBox portBox = new();
    private readonly CheckBox usePinCheck = new();
    private readonly TextBox pinBox = new();
    private readonly Panel statusDot = new();
    private readonly TextBox urlsBox = new();
    private readonly Button startButton = new();
    private readonly Button stopButton = new();
    private bool allowClose;

    public SettingsForm(PhoneControlSettingsStore settingsStore, PhoneControlServer server)
    {
        this.settingsStore = settingsStore;
        this.server = server;

        Text = "Lian-Li Phone Link Settings";
        StartPosition = FormStartPosition.CenterScreen;
        MinimumSize = new Size(640, 520);
        Size = new Size(680, 560); // Increased height to allow URLs to show fully
        MaximizeBox = false;
        BackColor = Color.FromArgb(7, 9, 12); // #07090c
        ForeColor = Color.FromArgb(242, 245, 248);
        Font = new Font("Segoe UI", 9.5f);
        Icon = LoadAppIcon();

        BuildUi();
        LoadSettings();
    }

    public void AllowExit() => allowClose = true;

    public void RefreshServerState()
    {
        var settings = settingsStore.Load();
        statusDot.BackColor = server.IsRunning ? Color.FromArgb(79, 248, 137) : Color.FromArgb(255, 74, 74); // brighter green/red
        urlsBox.Text = server.Urls.Count == 0
            ? ""
            : string.Join(Environment.NewLine, server.Urls);
        startButton.Enabled = !server.IsRunning;
        stopButton.Enabled = server.IsRunning;
    }

    protected override void OnShown(EventArgs e)
    {
        base.OnShown(e);
        RefreshServerState();
    }

    protected override void OnResize(EventArgs e)
    {
        base.OnResize(e);
        if (WindowState == FormWindowState.Minimized)
        {
            Hide();
        }
    }

    protected override void OnFormClosing(FormClosingEventArgs e)
    {
        if (!allowClose && e.CloseReason == CloseReason.UserClosing)
        {
            e.Cancel = true;
            Hide();
            return;
        }

        base.OnFormClosing(e);
    }

    private void BuildUi()
    {
        var root = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            Padding = new Padding(16), // Reduced padding from 24
            ColumnCount = 1,
            RowCount = 5,
            BackColor = BackColor
        };
        root.ColumnStyles.Clear();
        root.RowStyles.Clear();
        root.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize)); // Header
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize)); // Settings Card
        root.RowStyles.Add(new RowStyle(SizeType.Percent, 100)); // Phone URLs Card (takes all remaining space)
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize)); // Buttons
        root.RowStyles.Add(new RowStyle(SizeType.AutoSize)); // Hint

        var header = new TableLayoutPanel { Dock = DockStyle.Top, ColumnCount = 2, AutoSize = true, Margin = new Padding(0, 0, 0, 12) };
        header.ColumnStyles.Clear();
        header.RowStyles.Clear();
        header.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        header.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
        header.RowStyles.Add(new RowStyle(SizeType.AutoSize));

        var titleStack = new FlowLayoutPanel { FlowDirection = FlowDirection.TopDown, AutoSize = true, WrapContents = false };
        titleStack.Controls.Add(new Label
        {
            Text = "Lian-Li Phone Link",
            AutoSize = true,
            Font = new Font("Segoe UI", 20f, FontStyle.Bold),
            ForeColor = ForeColor,
            Margin = new Padding(0)
        });
        titleStack.Controls.Add(new Label
        {
            Text = "LAN control for L-Connect LCD screens and wireless fans",
            AutoSize = true,
            ForeColor = Color.FromArgb(150, 162, 176),
            Margin = new Padding(0, 2, 0, 0)
        });
        header.Controls.Add(titleStack, 0, 0);

        // Server controls (Play, Stop, Status dot) on the right of title
        var serverPanel = new FlowLayoutPanel
        {
            FlowDirection = FlowDirection.LeftToRight,
            WrapContents = false,
            AutoSize = true,
            Anchor = AnchorStyles.Right, // vertically centered
            Margin = new Padding(0)
        };

        statusDot.Size = new Size(12, 12);
        statusDot.Margin = new Padding(0, 13, 8, 0); // vertically center dot
        
        ConfigureIconButton(startButton, "\u25B6", primary: true); // Play symbol
        ConfigureIconButton(stopButton, "\u25FC", primary: false); // Stop symbol
        startButton.Click += async (_, _) => await StartServerAsync();
        stopButton.Click += async (_, _) => await StopServerAsync();

        serverPanel.Controls.Add(statusDot);
        serverPanel.Controls.Add(startButton);
        serverPanel.Controls.Add(stopButton);
        
        header.Controls.Add(serverPanel, 1, 0);
        root.Controls.Add(header, 0, 0);

        root.Controls.Add(BuildSettingsCard(), 0, 1);
        root.Controls.Add(BuildUrlsCard(), 0, 2);
        root.Controls.Add(BuildButtons(), 0, 3);

        var hint = new Label
        {
            Text = "Minimize or close this window to keep Lian-Li Phone Link running in the notification area.",
            AutoSize = true,
            ForeColor = Color.FromArgb(150, 162, 176),
            Margin = new Padding(4, 8, 0, 0)
        };
        root.Controls.Add(hint, 0, 4);

        Controls.Add(root);
    }

    private Control BuildSettingsCard()
    {
        var card = CreateCard();
        card.ColumnCount = 3;
        card.RowCount = 2;
        card.ColumnStyles.Clear();
        card.RowStyles.Clear();
        card.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 160)); // Port
        card.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 110)); // Use PIN checkbox
        card.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100)); // PIN textbox
        card.RowStyles.Add(new RowStyle(SizeType.AutoSize)); // Heading
        card.RowStyles.Add(new RowStyle(SizeType.AutoSize)); // Inputs row

        var heading = CreateHeading("Access");
        card.Controls.Add(heading, 0, 0);
        card.SetColumnSpan(heading, 3);

        // Port input
        var portPanel = CreateLabeledControl("Port", portBox);
        card.Controls.Add(portPanel, 0, 1);

        // Use PIN checkbox (centered vertically relative to the inputs)
        usePinCheck.Text = "Use PIN";
        usePinCheck.AutoSize = true;
        usePinCheck.ForeColor = ForeColor;
        usePinCheck.Margin = new Padding(10, 24, 0, 0); // aligned vertically with the center of the 36px textbox
        usePinCheck.FlatStyle = FlatStyle.Flat;
        usePinCheck.FlatAppearance.BorderColor = Color.FromArgb(33, 41, 52);
        usePinCheck.FlatAppearance.CheckedBackColor = Color.FromArgb(0, 242, 254);
        usePinCheck.CheckedChanged += (_, _) => pinBox.Enabled = usePinCheck.Checked;
        card.Controls.Add(usePinCheck, 1, 1);

        // PIN input
        pinBox.UseSystemPasswordChar = false;
        var pinControl = CreateLabeledControl("PIN", pinBox);
        card.Controls.Add(pinControl, 2, 1);

        return card;
    }

    private Control BuildUrlsCard()
    {
        var card = CreateCard(fill: true);
        card.RowCount = 2;
        card.ColumnCount = 1;
        card.ColumnStyles.Clear();
        card.RowStyles.Clear();
        card.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        card.RowStyles.Add(new RowStyle(SizeType.AutoSize)); // Heading
        card.RowStyles.Add(new RowStyle(SizeType.Percent, 100)); // URLs TextBox wrapper
        
        card.Controls.Add(CreateHeading("Phone URLs"), 0, 0);

        urlsBox.Multiline = true;
        urlsBox.ReadOnly = true;
        urlsBox.ScrollBars = ScrollBars.Vertical;
        urlsBox.Dock = DockStyle.Fill;
        urlsBox.BorderStyle = BorderStyle.None;
        urlsBox.BackColor = Color.FromArgb(9, 12, 15); // #090c0f
        urlsBox.ForeColor = Color.FromArgb(242, 245, 248);
        urlsBox.Font = new Font("Segoe UI", 10f);

        var borderPanel = new Panel
        {
            Dock = DockStyle.Fill,
            BackColor = Color.FromArgb(33, 41, 52), // #212934
            Padding = new Padding(1) // Border width
        };
        
        var innerPanel = new Panel
        {
            Dock = DockStyle.Fill,
            BackColor = Color.FromArgb(9, 12, 15),
            Padding = new Padding(6)
        };
        
        innerPanel.Controls.Add(urlsBox);
        borderPanel.Controls.Add(innerPanel);
        
        card.Controls.Add(borderPanel, 0, 1);
        return card;
    }

    private Control BuildButtons()
    {
        var buttons = new FlowLayoutPanel
        {
            FlowDirection = FlowDirection.RightToLeft,
            Dock = DockStyle.Fill,
            AutoSize = true,
            WrapContents = false,
            Margin = new Padding(0, 8, 0, 0)
        };
        var saveButton = new Button();
        var openButton = new Button();
        var hideButton = new Button();
        ConfigureButton(saveButton, "Save", primary: true);
        ConfigureButton(openButton, "Open Web UI", primary: false);
        ConfigureButton(hideButton, "Minimize to Tray", primary: false);
        saveButton.Click += async (_, _) => await SaveAsync();
        openButton.Click += (_, _) => OpenWebUi();
        hideButton.Click += (_, _) => Hide();
        buttons.Controls.Add(saveButton);
        buttons.Controls.Add(openButton);
        buttons.Controls.Add(hideButton);
        return buttons;
    }

    private void LoadSettings()
    {
        var settings = settingsStore.Load();
        portBox.Text = settings.Port.ToString();
        usePinCheck.Checked = settings.UsePin;
        pinBox.Text = settings.Token;
        pinBox.Enabled = settings.UsePin;
        RefreshServerState();
    }

    private async Task SaveAsync()
    {
        if (!TryReadSettings(out var settings))
        {
            return;
        }

        settingsStore.Save(settings);
        await server.RestartAsync(settings);
        RefreshServerState();

        MessageBox.Show(
            this,
            server.IsRunning ? "Settings saved and server restarted." : $"Settings saved, but server could not start: {server.LastError}",
            Text,
            MessageBoxButtons.OK,
            server.IsRunning ? MessageBoxIcon.Information : MessageBoxIcon.Error);
    }

    private async Task StartServerAsync()
    {
        if (!TryReadSettings(out var settings))
        {
            return;
        }

        settingsStore.Save(settings);
        await server.RestartAsync(settings);
        RefreshServerState();
    }

    private async Task StopServerAsync()
    {
        await server.StopAsync();
        RefreshServerState();
    }

    private bool TryReadSettings(out PhoneControlOptions settings)
    {
        settings = settingsStore.Load();
        if (!int.TryParse(portBox.Text.Trim(), out var port) || port is <= 0 or > 65535)
        {
            MessageBox.Show(this, "Port must be between 1 and 65535.", Text, MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return false;
        }

        var pin = pinBox.Text.Trim();
        if (usePinCheck.Checked && string.IsNullOrWhiteSpace(pin))
        {
            MessageBox.Show(this, "Enter a PIN or turn off Use PIN.", Text, MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return false;
        }

        settings.Port = port;
        settings.UsePin = usePinCheck.Checked;
        settings.Token = pin;
        return true;
    }

    private void OpenWebUi()
    {
        var url = server.Urls.FirstOrDefault() ?? $"http://localhost:{settingsStore.Load().Port}";
        Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
    }

    private TableLayoutPanel CreateCard(bool fill = false)
    {
        return new CardTableLayoutPanel
        {
            AutoSize = !fill,
            Dock = fill ? DockStyle.Fill : DockStyle.Top,
            BackColor = Color.FromArgb(20, 26, 34), // #141a22
            Padding = new Padding(12), // Reduced card padding from 18 to 12
            Margin = new Padding(0, 0, 0, 8) // Reduced card margin from 12 to 8
        };
    }

    private static Label CreateHeading(string text) => new()
    {
        Text = text,
        AutoSize = true,
        Font = new Font("Segoe UI", 10.5f, FontStyle.Bold),
        ForeColor = Color.FromArgb(242, 245, 248),
        Margin = new Padding(0, 0, 0, 6) // Reduced heading margin from 10 to 6
    };

    private static Control CreateLabeledControl(string labelText, TextBox control)
    {
        var panel = new TableLayoutPanel
        {
            AutoSize = true,
            Dock = DockStyle.Top,
            ColumnCount = 1,
            RowCount = 2,
            Margin = new Padding(0, 0, 12, 4) // Reduced bottom margin from 8 to 4
        };
        panel.ColumnStyles.Clear();
        panel.RowStyles.Clear();
        panel.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        panel.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        panel.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        panel.Controls.Add(new Label { Text = labelText, AutoSize = true, ForeColor = Color.FromArgb(150, 162, 176), Margin = new Padding(0, 0, 0, 4) }, 0, 0);

        var borderPanel = new Panel
        {
            Dock = DockStyle.Top,
            Height = 36,
            BackColor = Color.FromArgb(33, 41, 52), // #212934
            Padding = new Padding(1)
        };
        
        control.BorderStyle = BorderStyle.None;
        control.BackColor = Color.FromArgb(9, 12, 15); // #090c0f
        control.ForeColor = Color.FromArgb(242, 245, 248);
        control.Dock = DockStyle.Fill;
        control.Font = new Font("Segoe UI", 10.5f);
        
        var innerPanel = new Panel
        {
            Dock = DockStyle.Fill,
            BackColor = Color.FromArgb(9, 12, 15),
            Padding = new Padding(8, 8, 8, 8)
        };
        
        innerPanel.Controls.Add(control);
        borderPanel.Controls.Add(innerPanel);
        
        control.Enter += (s, e) => borderPanel.BackColor = Color.FromArgb(0, 242, 254); // #00f2fe
        control.Leave += (s, e) => borderPanel.BackColor = Color.FromArgb(33, 41, 52); // #212934

        panel.Controls.Add(borderPanel, 0, 1);
        return panel;
    }

    private static void ConfigureButton(Button button, string text, bool primary)
    {
        button.Text = text;
        button.AutoSize = true;
        button.MinimumSize = new Size(primary ? 118 : 116, 38);
        button.Margin = new Padding(8, 0, 0, 0);
        button.FlatStyle = FlatStyle.Flat;
        button.FlatAppearance.BorderSize = 1;
        button.FlatAppearance.BorderColor = primary ? Color.FromArgb(0, 176, 196) : Color.FromArgb(33, 41, 52);
        button.BackColor = primary ? Color.FromArgb(0, 242, 254) : Color.FromArgb(20, 26, 34);
        button.ForeColor = primary ? Color.FromArgb(7, 9, 12) : Color.FromArgb(242, 245, 248);
        button.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
    }

    private static void ConfigureIconButton(Button button, string symbol, bool primary)
    {
        button.Text = symbol;
        button.Size = new Size(42, 38);
        button.MinimumSize = new Size(42, 38);
        button.Margin = new Padding(6, 0, 0, 0);
        button.FlatStyle = FlatStyle.Flat;
        button.FlatAppearance.BorderSize = 1;
        button.FlatAppearance.BorderColor = primary ? Color.FromArgb(0, 176, 196) : Color.FromArgb(33, 41, 52);
        button.BackColor = primary ? Color.FromArgb(0, 242, 254) : Color.FromArgb(20, 26, 34);
        button.ForeColor = primary ? Color.FromArgb(7, 9, 12) : Color.FromArgb(242, 245, 248);
        button.Font = new Font("Segoe UI", 12f, FontStyle.Bold);
    }

    private static Icon LoadAppIcon()
    {
        var iconPath = Path.Combine(AppContext.BaseDirectory, "phonecontrol.ico");
        return File.Exists(iconPath) ? new Icon(iconPath) : SystemIcons.Application;
    }

    private sealed class CardTableLayoutPanel : TableLayoutPanel
    {
        public CardTableLayoutPanel()
        {
            DoubleBuffered = true;
            CellBorderStyle = TableLayoutPanelCellBorderStyle.None;
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            using var path = CreateRoundRect(new Rectangle(0, 0, Width - 1, Height - 1), 4);
            using var fill = new SolidBrush(Color.FromArgb(20, 26, 34)); // #141a22
            using var border = new Pen(Color.FromArgb(33, 41, 52)); // #212934
            e.Graphics.FillPath(fill, path);
            e.Graphics.DrawPath(border, path);
            base.OnPaint(e);
        }

        private static GraphicsPath CreateRoundRect(Rectangle rect, int radius)
        {
            var path = new GraphicsPath();
            var diameter = radius * 2;
            path.AddArc(rect.X, rect.Y, diameter, diameter, 180, 90);
            path.AddArc(rect.Right - diameter, rect.Y, diameter, diameter, 270, 90);
            path.AddArc(rect.Right - diameter, rect.Bottom - diameter, diameter, diameter, 0, 90);
            path.AddArc(rect.X, rect.Bottom - diameter, diameter, diameter, 90, 90);
            path.CloseFigure();
            return path;
        }
    }
}
