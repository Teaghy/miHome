use crate::error::{AppError, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub theme: String,
    pub scale: f64,
    pub minimize_to_tray: bool,
    pub auto_start: bool,
    pub show_scenes: bool,
    pub hide_unsupported: bool,
    pub refresh_interval: u32,
    pub default_speaker: Option<String>,
    pub favorites: Vec<String>,
}
impl Default for Settings {
    fn default() -> Self {
        Self {
            theme: "system".into(),
            scale: 1.0,
            minimize_to_tray: true,
            auto_start: false,
            show_scenes: true,
            hide_unsupported: false,
            refresh_interval: 60,
            default_speaker: None,
            favorites: vec![],
        }
    }
}
impl Settings {
    pub fn validate(&self) -> Result<()> {
        if !["system", "light", "dark"].contains(&self.theme.as_str()) {
            return Err(AppError::invalid("主题必须为 system、light 或 dark"));
        }
        if !self.scale.is_finite() || !(0.5..=2.0).contains(&self.scale) {
            return Err(AppError::invalid("界面缩放必须在 0.5–2.0 之间"));
        }
        if self.refresh_interval != 0 && !(15..=3600).contains(&self.refresh_interval) {
            return Err(AppError::invalid("刷新间隔为 0（停用）或 15–3600 秒"));
        }
        if self.favorites.len() > 1000
            || self.favorites.iter().any(|s| s.is_empty() || s.len() > 256)
            || self
                .default_speaker
                .as_ref()
                .is_some_and(|s| s.is_empty() || s.len() > 256)
        {
            return Err(AppError::invalid("设备标识无效"));
        }
        Ok(())
    }
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub authenticated: bool,
    pub user_id: Option<String>,
    pub region: String,
}
#[derive(Clone, Serialize, Deserialize)]
pub struct Home {
    pub id: String,
    pub name: String,
    pub rooms: Vec<String>,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Device {
    pub did: String,
    pub name: String,
    pub model: String,
    pub home_id: String,
    pub home_name: String,
    pub room: String,
    pub online: bool,
    pub spec_type: String,
    pub power: Option<bool>,
    pub category: String,
    pub metrics: Option<String>,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Scene {
    pub id: String,
    pub name: String,
    pub home_id: String,
    pub home_name: String,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub homes: Vec<Home>,
    pub devices: Vec<Device>,
    pub scenes: Vec<Scene>,
    pub updated_at: String,
    pub cached: bool,
    pub warnings: Vec<String>,
}
#[derive(Clone, Serialize, Deserialize)]
pub struct ValueOption {
    pub value: Value,
    pub description: String,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Property {
    pub siid: u32,
    pub piid: u32,
    pub name: String,
    pub description: String,
    pub service: String,
    pub format: String,
    pub readable: bool,
    pub writable: bool,
    pub unit: Option<String>,
    pub range: Option<Vec<f64>>,
    pub value_list: Vec<ValueOption>,
    pub value: Value,
    pub error: Option<String>,
}
#[derive(Clone, Serialize, Deserialize)]
pub struct Action {
    pub siid: u32,
    pub aiid: u32,
    pub name: String,
    pub description: String,
    pub service: String,
    pub inputs: Vec<u32>,
}
#[derive(Clone, Serialize, Deserialize)]
pub struct DeviceDetail {
    pub did: String,
    pub properties: Vec<Property>,
    pub actions: Vec<Action>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginTicket {
    pub login_url: String,
    pub expires_in: u64,
    pub ticket_id: String,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub version: String,
    pub data_dir: String,
    pub platform: String,
}
pub fn text(v: &Value) -> String {
    match v {
        Value::String(s) => s.clone(),
        Value::Number(n) => n.to_string(),
        _ => String::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn defaults_match_contract() {
        let s = Settings::default();
        s.validate().unwrap();
        let v = serde_json::to_value(s).unwrap();
        assert_eq!(v["minimizeToTray"], true);
        assert_eq!(v["refreshInterval"], 60);
        assert_eq!(v["defaultSpeaker"], Value::Null);
    }
    #[test]
    fn rejects_invalid_settings() {
        let mut s = Settings {
            scale: f64::NAN,
            ..Settings::default()
        };
        assert!(s.validate().is_err());
        s.scale = 1.;
        s.refresh_interval = 1;
        assert!(s.validate().is_err());
        s.refresh_interval = 0;
        assert!(s.validate().is_ok());
        s.theme = "invalid".into();
        assert!(s.validate().is_err());
    }
}
