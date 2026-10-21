use crate::{
    cloud::Cloud,
    error::{AppError, Result},
    models::*,
    spec,
};
use futures_util::{stream, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    collections::{HashMap, HashSet},
    sync::{atomic::AtomicBool, Arc},
};
use tokio::sync::{Mutex, RwLock};

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CachedSnapshot {
    user_id: String,
    snapshot: Snapshot,
}
pub struct Backend {
    pub cloud: Arc<Cloud>,
    pub settings: RwLock<Settings>,
    pub settings_write: Mutex<()>,
    pub close_to_tray: AtomicBool,
    snapshot: RwLock<Option<CachedSnapshot>>,
    specs: RwLock<HashMap<String, DeviceDetail>>,
    refresh_gate: Mutex<()>,
    cache_write: Mutex<()>,
}
impl Backend {
    pub fn new(cloud: Arc<Cloud>) -> Result<Self> {
        let settings = match cloud.storage.read::<Settings>("settings.json") {
            Ok(Some(s)) if s.validate().is_ok() => s,
            Ok(_) => Settings::default(),
            Err(e) => {
                eprintln!("Settings could not be loaded: {e}");
                Settings::default()
            }
        };
        let snapshot = match cloud.storage.read("snapshot.json") {
            Ok(s) => s,
            Err(e) => {
                eprintln!("Device cache could not be loaded: {e}");
                None
            }
        };
        Ok(Self {
            close_to_tray: AtomicBool::new(settings.minimize_to_tray),
            settings: RwLock::new(settings),
            settings_write: Mutex::new(()),
            snapshot: RwLock::new(snapshot),
            specs: RwLock::new(HashMap::new()),
            refresh_gate: Mutex::new(()),
            cache_write: Mutex::new(()),
            cloud,
        })
    }
    pub async fn cached_snapshot(&self) -> Result<Option<Snapshot>> {
        let epoch = self.cloud.epoch();
        let session = self.cloud.session().await;
        let cache = self.snapshot.read().await;
        if epoch != self.cloud.epoch() {
            return Ok(None);
        }
        Ok(cache
            .as_ref()
            .filter(|c| Some(&c.user_id) == session.user_id.as_ref())
            .map(|c| {
                let mut s = c.snapshot.clone();
                s.cached = true;
                s
            }))
    }
    pub async fn logout(&self) -> Result<()> {
        let _guard = self.cache_write.lock().await;
        let result = self.cloud.logout().await;
        *self.snapshot.write().await = None;
        result
    }
    pub async fn refresh_devices(&self) -> Result<Snapshot> {
        self.refresh_devices_at_epoch(self.cloud.epoch()).await
    }
    async fn refresh_devices_at_epoch(&self, epoch: u64) -> Result<Snapshot> {
        let _refresh = self.refresh_gate.lock().await;
        self.cloud.ensure_epoch(epoch)?;
        let user_id = self
            .cloud
            .session()
            .await
            .user_id
            .ok_or_else(AppError::auth)?;
        let result=self.cloud.request_at_epoch(epoch,"/v2/homeroom/gethome_merged",json!({"fg":true,"fetch_share":true,"fetch_share_dev":true,"fetch_cariot":true,"limit":300,"app_ver":7,"plat_form":0})).await?;
        let raw_homes = result["homelist"]
            .as_array()
            .ok_or_else(|| AppError::new("invalid_response", "家庭列表响应格式无效"))?;
        let mut homes = vec![];
        let mut devices = vec![];
        let mut scenes = vec![];
        let mut warnings = vec![];
        let mut location = HashMap::<String, (String, String, String)>::new();
        for home in raw_homes {
            let id = text(&home["id"]);
            if id.is_empty() {
                warnings.push("忽略了一个缺少标识的家庭".into());
                continue;
            }
            let name = home["name"].as_str().unwrap_or("未命名家庭").to_owned();
            let rooms: Vec<String> = home["roomlist"]
                .as_array()
                .into_iter()
                .flatten()
                .filter_map(|r| r["name"].as_str().map(str::to_owned))
                .collect();
            for room in home["roomlist"].as_array().into_iter().flatten() {
                let room_name = room["name"].as_str().unwrap_or("未分配房间");
                for did in room["dids"].as_array().into_iter().flatten() {
                    location.insert(text(did), (id.clone(), name.clone(), room_name.into()));
                }
            }
            homes.push(Home {
                id: id.clone(),
                name: name.clone(),
                rooms,
            });
            let owner = number_id(&home["uid"], "家庭所有者")?;
            let numeric_id = number_id(&home["id"], "家庭")?;
            let mut start = String::new();
            let mut seen = HashSet::new();
            loop {
                let page=self.cloud.request_at_epoch(epoch,"/home/home_device_list",json!({"home_owner":owner,"home_id":numeric_id,"limit":200,"start_did":start,"get_split_device":true,"support_smart_home":true,"get_cariot_device":true,"get_third_device":true})).await?;
                for raw in page["device_info"].as_array().into_iter().flatten() {
                    if let Some(d) = map_device(raw, &id, &name, &location) {
                        devices.push(d);
                    }
                }
                if !page["has_more"].as_bool().unwrap_or(false) {
                    break;
                }
                start = text(&page["max_did"]);
                if start.is_empty() || !seen.insert(start.clone()) || seen.len() > 100 {
                    return Err(AppError::new("invalid_response", "设备列表分页游标无效"));
                }
            }
            match self
                .cloud
                .request_at_epoch(
                    epoch,
                    "/appgateway/miot/appsceneservice/AppSceneService/GetSimpleSceneList",
                    json!({"app_version":12,"get_type":2,"home_id":id,"owner_uid":owner}),
                )
                .await
            {
                Ok(result) => {
                    for scene in result["manual_scene_info_list"]
                        .as_array()
                        .into_iter()
                        .flatten()
                    {
                        let scene_id = text(&scene["scene_id"]);
                        if !scene_id.is_empty() {
                            scenes.push(Scene {
                                id: scene_id,
                                name: scene["name"].as_str().unwrap_or("未命名场景").into(),
                                home_id: id.clone(),
                                home_name: name.clone(),
                            });
                        }
                    }
                }
                Err(e) => warnings.push(format!("{name} 的场景未能刷新: {}", e.message)),
            }
        }
        match self.cloud.request_at_epoch(epoch,"/v2/home/device_list_page",json!({"ssid":"<unknown ssid>","bssid":"02:00:00:00:00:00","getVirtualModel":true,"getHuamiDevices":1,"get_split_device":true,"support_smart_home":true,"get_cariot_device":true,"get_third_device":true,"get_phone_device":true,"get_miwear_device":true})).await {
            Ok(result)=>{
                let mut ids:HashSet<String>=devices.iter().map(|d|d.did.clone()).collect();
                for raw in result["list"].as_array().into_iter().flatten().filter(|r|is_shared(r)) {if let Some(d)=map_device(raw,"shared","共享设备",&location){if ids.insert(d.did.clone()){devices.push(d);}}}
                if devices.iter().any(|d|d.home_id=="shared"){homes.push(Home{id:"shared".into(),name:"共享设备".into(),rooms:vec![]});}
                if result["has_more"].as_bool()==Some(true){warnings.push("独立共享设备列表还有更多分页；当前仅显示本页（家庭设备列表已完整分页）".into());}
            },Err(e)=>warnings.push(format!("独立共享设备未能刷新: {}",e.message)),
        }
        let mut ids = HashSet::new();
        devices.retain(|d| ids.insert(d.did.clone()));
        // Specs are public metadata. Fetch concurrently with a strict bound, then batch
        // only useful status properties instead of making one network call per card.
        let status_devices: Vec<Device> = devices
            .iter()
            .filter(|d| d.online && !d.spec_type.is_empty())
            .cloned()
            .collect();
        let status_specs: Vec<_> = stream::iter(status_devices)
            .map(|d: Device| async move { (d.did.clone(), self.spec_for(&d).await) })
            .buffer_unordered(6)
            .collect()
            .await;
        let mut queries = vec![];
        let mut kinds = HashMap::new();
        let mut spec_failures = 0;
        for (did, result) in status_specs {
            match result {
                Ok(detail) => {
                    for p in detail.properties.iter().filter(|p| p.readable) {
                        if [
                            "on",
                            "temperature",
                            "relative-humidity",
                            "pm2.5-density",
                            "battery-level",
                        ]
                        .contains(&p.name.as_str())
                        {
                            queries.push(spec::prop_query(&did, p));
                            kinds.insert(
                                (did.clone(), p.siid, p.piid),
                                (p.name.clone(), p.unit.clone()),
                            );
                        }
                    }
                }
                Err(_) => spec_failures += 1,
            }
        }
        if spec_failures > 0 {
            warnings.push(format!(
                "{spec_failures} 台设备的公开规格暂不可用，状态未读取"
            ));
        }
        let mut metrics = HashMap::<String, Vec<String>>::new();
        let mut power = HashMap::new();
        let mut read_errors = 0;
        for batch in queries.chunks(50) {
            match self
                .cloud
                .request_at_epoch(
                    epoch,
                    "/miotspec/prop/get",
                    json!({"params":batch,"datasource":1}),
                )
                .await
            {
                Ok(result) => {
                    let rows = result
                        .as_array()
                        .ok_or_else(|| AppError::new("invalid_response", "设备属性响应格式无效"))?;
                    for row in rows {
                        if row["code"].as_i64() != Some(0) {
                            read_errors += 1;
                            continue;
                        }
                        let did = text(&row["did"]);
                        let key = (
                            did.clone(),
                            row["siid"].as_u64().unwrap_or(0) as u32,
                            row["piid"].as_u64().unwrap_or(0) as u32,
                        );
                        if let Some((name, unit)) = kinds.get(&key) {
                            if name == "on" {
                                if let Some(v) = row["value"].as_bool() {
                                    power.entry(did).or_insert(v);
                                }
                            } else if let Some(n) = row["value"].as_f64() {
                                let suffix = match name.as_str() {
                                    "temperature" => "°C",
                                    "relative-humidity" | "battery-level" => "%",
                                    "pm2.5-density" => " μg/m³",
                                    _ => unit.as_deref().unwrap_or(""),
                                };
                                metrics.entry(did).or_default().push(format!("{n}{suffix}"));
                            }
                        }
                    }
                }
                Err(e) => warnings.push(format!("部分设备状态未能刷新: {}", e.message)),
            }
        }
        if read_errors > 0 {
            warnings.push(format!(
                "{read_errors} 个设备属性未返回有效读数（可能离线或不支持云端读取）"
            ));
        }
        for d in &mut devices {
            d.power = power.get(&d.did).copied();
            d.metrics = metrics.remove(&d.did).map(|m| m.join(" · "));
        }
        devices.sort_by(|a, b| {
            (&a.home_name, &a.room, &a.name).cmp(&(&b.home_name, &b.room, &b.name))
        });
        let snapshot = Snapshot {
            homes,
            devices,
            scenes,
            updated_at: chrono::Utc::now().to_rfc3339(),
            cached: false,
            warnings,
        };
        let _commit = self.cache_write.lock().await;
        if epoch != self.cloud.epoch()
            || self.cloud.session().await.user_id.as_deref() != Some(user_id.as_str())
        {
            return Err(AppError::auth());
        }
        let cached = CachedSnapshot {
            user_id,
            snapshot: snapshot.clone(),
        };
        self.cloud.storage.write("snapshot.json", &cached)?;
        *self.snapshot.write().await = Some(cached);
        Ok(snapshot)
    }
    async fn device(&self, did: &str, epoch: u64) -> Result<Device> {
        self.cloud.ensure_epoch(epoch)?;
        if did.is_empty() || did.len() > 256 {
            return Err(AppError::invalid("设备标识无效"));
        }
        if let Some(d) = self
            .cached_snapshot()
            .await?
            .and_then(|s| s.devices.into_iter().find(|d| d.did == did))
        {
            self.cloud.ensure_epoch(epoch)?;
            return Ok(d);
        }
        self.refresh_devices_at_epoch(epoch)
            .await?
            .devices
            .into_iter()
            .find(|d| d.did == did)
            .ok_or_else(|| AppError::new("device_not_found", "设备不在当前账号的设备列表中"))
    }
    async fn device_for_control(&self, did: &str, epoch: u64) -> Result<Device> {
        let device = self.device(did, epoch).await?;
        if !device.online {
            return Err(AppError::new(
                "device_offline",
                "设备已离线，请刷新状态后重试",
            ));
        }
        Ok(device)
    }
    async fn spec_for(&self, device: &Device) -> Result<DeviceDetail> {
        if device.spec_type.is_empty() {
            return Err(AppError::new(
                "unsupported_device",
                "此设备没有公开的 MIoT 规格，暂不能控制",
            ));
        }
        if let Some(d) = self.specs.read().await.get(&device.spec_type).cloned() {
            let mut d = d;
            d.did = device.did.clone();
            return Ok(d);
        }
        let hash = format!("{:x}", Sha256::digest(device.spec_type.as_bytes()));
        let filename = format!("spec-{hash}.json");
        let cached = self.cloud.storage.read::<Value>(&filename).ok().flatten();
        let raw = if let Some(c) = cached.filter(|v| spec::parse_spec(v).is_ok()) {
            c
        } else {
            let raw: Value = self
                .cloud
                .client
                .get("https://miot-spec.org/miot-spec-v2/instance")
                .query(&[("type", &device.spec_type)])
                .send()
                .await?
                .error_for_status()?
                .json()
                .await?;
            spec::parse_spec(&raw)?;
            self.cloud.storage.write(&filename, &raw)?;
            raw
        };
        let mut detail = spec::parse_spec(&raw)?;
        self.specs
            .write()
            .await
            .insert(device.spec_type.clone(), detail.clone());
        detail.did = device.did.clone();
        Ok(detail)
    }
    pub async fn device_detail(&self, did: &str) -> Result<DeviceDetail> {
        let epoch = self.cloud.epoch();
        let device = self.device(did, epoch).await?;
        let mut detail = self.spec_for(&device).await?;
        let queries: Vec<_> = detail
            .properties
            .iter()
            .filter(|p| p.readable)
            .map(|p| spec::prop_query(did, p))
            .collect();
        for p in detail.properties.iter_mut().filter(|p| p.readable) {
            p.error = Some("设备未返回该属性".into());
        }
        for batch in queries.chunks(50) {
            let result = self
                .cloud
                .request_at_epoch(
                    epoch,
                    "/miotspec/prop/get",
                    json!({"params":batch,"datasource":1}),
                )
                .await?;
            for row in result
                .as_array()
                .ok_or_else(|| AppError::new("invalid_response", "属性响应不是列表"))?
            {
                if let Some(p) = detail.properties.iter_mut().find(|p| {
                    Some(p.siid as u64) == row["siid"].as_u64()
                        && Some(p.piid as u64) == row["piid"].as_u64()
                }) {
                    if row["code"].as_i64() == Some(0) && row.get("value").is_some() {
                        p.value = row["value"].clone();
                        p.error = None;
                    } else {
                        p.error = Some(format!("读取失败（{}）", text(&row["code"])));
                    }
                }
            }
        }
        self.cloud.ensure_epoch(epoch)?;
        Ok(detail)
    }
    pub async fn set_property(&self, did: &str, siid: u32, piid: u32, value: Value) -> Result<()> {
        let epoch = self.cloud.epoch();
        let device = self.device_for_control(did, epoch).await?;
        let detail = self.spec_for(&device).await?;
        let p = detail
            .properties
            .iter()
            .find(|p| p.siid == siid && p.piid == piid)
            .ok_or_else(|| AppError::invalid("设备规格中不存在该属性"))?;
        spec::validate_value(p, &value, true)?;
        let result = self
            .cloud
            .request_at_epoch(
                epoch,
                "/miotspec/prop/set",
                json!({"params":[{"did":did,"siid":siid,"piid":piid,"value":value}]}),
            )
            .await?;
        let result = result
            .as_array()
            .and_then(|a| a.first())
            .ok_or_else(|| AppError::new("invalid_response", "设备未返回写入结果"))?;
        spec::verify_write_result(result)
    }
    pub async fn run_action(
        &self,
        did: &str,
        siid: u32,
        aiid: u32,
        inputs: Vec<Value>,
    ) -> Result<()> {
        self.run_action_at_epoch(self.cloud.epoch(), did, siid, aiid, inputs)
            .await
    }
    async fn run_action_at_epoch(
        &self,
        epoch: u64,
        did: &str,
        siid: u32,
        aiid: u32,
        inputs: Vec<Value>,
    ) -> Result<()> {
        let device = self.device_for_control(did, epoch).await?;
        let detail = self.spec_for(&device).await?;
        spec::validate_action(&detail, siid, aiid, &inputs)?;
        let result = self
            .cloud
            .request_at_epoch(
                epoch,
                "/miotspec/action",
                json!({"params":{"did":did,"siid":siid,"aiid":aiid,"in":inputs}}),
            )
            .await?;
        spec::verify_write_result(&result)
    }
    pub async fn run_scene(&self, scene_id: &str, home_id: &str) -> Result<()> {
        let epoch = self.cloud.epoch();
        if scene_id.is_empty() || scene_id.len() > 256 || home_id.is_empty() || home_id.len() > 256
        {
            return Err(AppError::invalid("场景标识无效"));
        }
        let homes=self.cloud.request_at_epoch(epoch,"/v2/homeroom/gethome_merged",json!({"fg":true,"fetch_share":true,"fetch_share_dev":true,"fetch_cariot":true,"limit":300,"app_ver":7,"plat_form":0})).await?;
        let home = homes["homelist"]
            .as_array()
            .and_then(|a| a.iter().find(|h| text(&h["id"]) == home_id))
            .ok_or_else(|| AppError::new("home_not_found", "家庭不在当前账号中"))?;
        let owner = number_id(&home["uid"], "家庭所有者")?;
        let result=self.cloud.request_at_epoch(epoch,"/appgateway/miot/appsceneservice/AppSceneService/NewRunScene",json!({"scene_id":scene_id,"scene_type":2,"phone_id":"null","home_id":home_id,"owner_uid":owner})).await?;
        // This endpoint varies between a boolean receipt and an object with a code.
        if result == Value::Bool(true) {
            return Ok(());
        }
        if result.get("code").is_some() {
            return spec::verify_write_result(&result);
        }
        if result.get("success").and_then(Value::as_bool) == Some(true) {
            return Ok(());
        }
        Err(AppError::new(
            "execution_unconfirmed",
            "云端未明确确认场景执行成功，请在米家中核实",
        ))
    }
    pub async fn send_voice(&self, did: &str, text: &str, silent: bool) -> Result<()> {
        let epoch = self.cloud.epoch();
        if text.trim().is_empty() || text.chars().count() > 2000 {
            return Err(AppError::invalid("请输入 1–2000 字的语音指令"));
        }
        let device = self.device_for_control(did, epoch).await?;
        let detail = self.spec_for(&device).await?;
        let action = detail
            .actions
            .iter()
            .find(|a| a.name == "execute-text-directive")
            .ok_or_else(|| AppError::new("unsupported_device", "此设备不支持小爱文本指令"))?;
        let inputs = match action.inputs.len() {
            2 => vec![json!(text), json!(if silent { 1 } else { 0 })],
            1 if !silent => vec![json!(text)],
            _ => {
                return Err(AppError::new(
                    "unsupported_device",
                    "此音箱的文本指令参数与当前协议不兼容",
                ))
            }
        };
        self.run_action_at_epoch(epoch, did, action.siid, action.aiid, inputs)
            .await
    }
}
fn number_id(value: &Value, label: &str) -> Result<u64> {
    value
        .as_u64()
        .or_else(|| value.as_str().and_then(|s| s.parse().ok()))
        .ok_or_else(|| AppError::new("invalid_response", format!("{label}标识不是有效整数")))
}
fn is_shared(raw: &Value) -> bool {
    match &raw["owner"] {
        Value::Bool(v) => *v,
        Value::Number(n) => n.as_u64().is_some_and(|n| n > 0),
        Value::String(s) => !s.is_empty() && s != "0",
        _ => false,
    }
}
fn map_device(
    raw: &Value,
    home_id: &str,
    home_name: &str,
    location: &HashMap<String, (String, String, String)>,
) -> Option<Device> {
    let did = text(&raw["did"]);
    if did.is_empty() {
        return None;
    }
    let model = raw["model"].as_str().unwrap_or("").to_owned();
    let spec_type = raw["spec_type"].as_str().unwrap_or("").to_owned();
    let (home_id, home_name, room) = location
        .get(&did)
        .cloned()
        .unwrap_or_else(|| (home_id.into(), home_name.into(), "未分配房间".into()));
    let category = spec_type
        .split(':')
        .nth(3)
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| {
            if model.contains("speaker") {
                "speaker"
            } else {
                "other"
            }
        })
        .to_owned();
    Some(Device {
        name: raw["name"].as_str().unwrap_or(&did).to_owned(),
        did,
        model,
        home_id,
        home_name,
        room,
        online: raw["isOnline"].as_bool().unwrap_or(false),
        spec_type,
        power: None,
        category,
        metrics: None,
    })
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn mapping_uses_room_membership() {
        let mut loc = HashMap::new();
        loc.insert("1".into(), ("10".into(), "家".into(), "客厅".into()));
        let d=map_device(&json!({"did":1,"name":"台灯","model":"test.light","isOnline":true,"spec_type":"urn:miot-spec-v2:device:light:1"}),"shared","共享",&loc).unwrap();
        assert_eq!(d.home_id, "10");
        assert_eq!(d.room, "客厅");
        assert_eq!(d.category, "light");
        assert!(d.power.is_none());
    }
    async fn command_fixture() -> (tempfile::TempDir, Arc<Backend>) {
        let dir = tempfile::tempdir().unwrap();
        let cloud =
            Arc::new(Cloud::new(crate::storage::Storage::new(dir.path().into()).unwrap()).unwrap());
        cloud.replace_test_auth("A").await;
        let backend = Arc::new(Backend::new(cloud).unwrap());
        let device=map_device(&json!({"did":"shared-device","model":"test.light","isOnline":true,"spec_type":"urn:miot-spec-v2:device:light:1"}),"home","Home",&HashMap::new()).unwrap();
        *backend.snapshot.write().await = Some(CachedSnapshot {
            user_id: "A".into(),
            snapshot: Snapshot {
                homes: vec![],
                devices: vec![device.clone()],
                scenes: vec![],
                updated_at: String::new(),
                cached: true,
                warnings: vec![],
            },
        });
        let detail=spec::parse_spec(&json!({"services":[{"iid":2,"type":"urn:miot-spec-v2:service:light:1","properties":[{"iid":1,"type":"urn:miot-spec-v2:property:on:1","format":"bool","access":["read","write"]}],"actions":[{"iid":1,"type":"urn:miot-spec-v2:action:toggle:1","in":[1]}]}]})).unwrap();
        backend.specs.write().await.insert(device.spec_type, detail);
        (dir, backend)
    }
    #[tokio::test]
    async fn property_command_cannot_cross_account_at_spec_barrier() {
        let (_dir, backend) = command_fixture().await;
        let barrier = backend.specs.write().await;
        let command = backend.set_property("shared-device", 2, 1, json!(true));
        tokio::pin!(command);
        // Poll until blocked on spec metadata, strictly after the A-account lookup.
        assert!(futures_util::poll!(command.as_mut()).is_pending());
        backend.cloud.replace_test_auth("B").await;
        drop(barrier);
        let error = tokio::time::timeout(std::time::Duration::from_secs(1), command)
            .await
            .unwrap()
            .unwrap_err();
        assert_eq!(error.code, "authentication_required");
    }
    #[tokio::test]
    async fn action_command_cannot_cross_account_at_spec_barrier() {
        let (_dir, backend) = command_fixture().await;
        let barrier = backend.specs.write().await;
        let command = backend.run_action("shared-device", 2, 1, vec![json!(true)]);
        tokio::pin!(command);
        assert!(futures_util::poll!(command.as_mut()).is_pending());
        backend.cloud.replace_test_auth("B").await;
        drop(barrier);
        let error = tokio::time::timeout(std::time::Duration::from_secs(1), command)
            .await
            .unwrap()
            .unwrap_err();
        assert_eq!(error.code, "authentication_required");
    }
    async fn offline_fixture() -> (tempfile::TempDir, Arc<Backend>) {
        let (dir, backend) = command_fixture().await;
        backend
            .snapshot
            .write()
            .await
            .as_mut()
            .unwrap()
            .snapshot
            .devices[0]
            .online = false;
        (dir, backend)
    }
    #[tokio::test]
    async fn offline_property_rejected_before_spec_or_network() {
        let (_dir, backend) = offline_fixture().await;
        let _spec_barrier = backend.specs.write().await;
        let error = tokio::time::timeout(
            std::time::Duration::from_millis(100),
            backend.set_property("shared-device", 2, 1, json!(true)),
        )
        .await
        .expect("offline writes must reject before reading specs")
        .unwrap_err();
        assert_eq!(error.code, "device_offline");
    }
    #[tokio::test]
    async fn offline_action_rejected_before_spec_or_network() {
        let (_dir, backend) = offline_fixture().await;
        let _spec_barrier = backend.specs.write().await;
        let error = tokio::time::timeout(
            std::time::Duration::from_millis(100),
            backend.run_action("shared-device", 2, 1, vec![json!(true)]),
        )
        .await
        .expect("offline actions must reject before reading specs")
        .unwrap_err();
        assert_eq!(error.code, "device_offline");
    }
    #[tokio::test]
    async fn offline_voice_rejected_before_spec_or_network() {
        let (_dir, backend) = offline_fixture().await;
        let _spec_barrier = backend.specs.write().await;
        let error = tokio::time::timeout(
            std::time::Duration::from_millis(100),
            backend.send_voice("shared-device", "开灯", false),
        )
        .await
        .expect("offline voice must reject before reading specs")
        .unwrap_err();
        assert_eq!(error.code, "device_offline");
    }
    #[test]
    fn validates_numeric_ids() {
        assert_eq!(number_id(&json!("123"), "家庭").unwrap(), 123);
        assert!(number_id(&json!("a"), "家庭").is_err());
    }
}
