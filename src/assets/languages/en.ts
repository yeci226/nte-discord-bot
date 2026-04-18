const langs: Record<string, any> = {
  Error: "An error occurred.",

  // News command
  news_NoPerm: "❌ You need `Manage Server` permission to use this command.",
  news_BindPlaceholder: "Currently bound to <count> channel(s)",
  news_BindDefault: "Select text channels...",
  news_BindCurrent: "Bind current channel",
  news_BindTip: "Select channels to receive **<lang>** · **<filter>** (multi-select):",
  news_BindTipRole: "Mention on post: <role>",
  news_DmBound: "✅ **This DM channel is already bound.**",
  news_DmSuccess: "✅ **Successfully bound.**\nYou will receive NTE news in this DM.",
  news_UnbindSuccess: "✅ **Successfully unbound.**",
  news_UnbindDetail: "Removed <scope> binding(s) (<count> channel(s)).",
  news_UnbindLangDetail: "Removed **<lang>** subscriptions from this server (<count> channel(s)).",
  news_UnbindScopeAll: "all server",
  news_UnbindScopeSingle: "this",
  news_NoSub: "No channels are currently bound.",
  news_SetupSuccess: "✅ **Settings updated.**",
  news_BindSuccessDetail: "The following channels will receive notifications:",
  news_BindFail: "❌ **Setup failed.**",
  news_BindFailDetail: "All selected channels are invalid. Please check bot permissions.",
  news_UnbindAll: "✅ **Settings updated.**\nAll channel bindings have been removed.",
  news_InvalidChannels: "⚠️ **The following channels could not be bound** (insufficient permissions):",
  news_PermissionMissing: "Missing: ",
  news_PermissionUnknown: "Unable to verify permissions",
  news_PermissionError: "Error while checking",
  news_ViewChannel: "View Channel",
  news_SendMessages: "Send Messages",
  news_PermissionTip: "Please ensure the bot has 'View Channel' and 'Send Messages' permissions.",
  news_BindCurrentSuccess: "✅ **Settings updated.**\nBound current channel <#<channelId>> to receive notifications.",

  // Language labels
  news_lang_tw: "繁體中文 (TW)",
  news_lang_cn: "简体中文 (CN)",
  news_lang_en: "English",
  news_lang_jp: "日本語 (JP)",

  // Filter labels
  news_filter_all:           "All (Website + Tweets)",
  news_filter_news_all:      "Website Latest",
  news_filter_news_gamenews: "Game News",
  news_filter_news_gameevent:"Events",
  news_filter_news_gamebroad:"System",
  news_filter_tweet:         "Official Tweets",

  // Force
  news_ForceTriggered: "✅ **Force push triggered.**\nThe latest content will be sent to all bound channels shortly.",
};

export default langs;
