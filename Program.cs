using PhoneControl;

ApplicationConfiguration.Initialize();

var settingsStore = new PhoneControlSettingsStore(AppContext.BaseDirectory);
var server = new PhoneControlServer(settingsStore);

using var appContext = new TrayApplicationContext(settingsStore, server);
Application.Run(appContext);
