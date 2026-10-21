use crate::{
    crypto,
    error::{AppError, Result},
    models::{text, LoginTicket, Session},
    storage::Storage,
};
use reqwest::{
    cookie::{CookieStore, Jar},
    header::{HeaderValue, COOKIE},
    Client, Url,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    collections::HashMap,
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc,
    },
    time::{Duration, Instant},
};
use tokio::sync::{Mutex, RwLock};
use tokio_util::sync::CancellationToken;
use zeroize::{Zeroize, ZeroizeOnDrop};

const SERVICE_LOGIN: &str = "https://account.xiaomi.com/pass/serviceLogin";
#[derive(Clone, Serialize, Deserialize, Zeroize, ZeroizeOnDrop)]
#[serde(rename_all = "camelCase")]
pub struct Credentials {
    pub user_id: String,
    pub c_user_id: String,
    pub pass_token: String,
    pub service_token: String,
    pub ssecurity: String,
    pub device_id: String,
    pub pass_o: String,
    pub ua: String,
    pub region: String,
    pub saved_at: i64,
}
impl Credentials {
    fn new() -> Self {
        let device_id = uuid::Uuid::new_v4().simple().to_string()[..16].to_owned();
        let pass_o = uuid::Uuid::new_v4().simple().to_string()[..16].to_owned();
        let id = uuid::Uuid::new_v4().simple().to_string().to_uppercase();
        Self {user_id:String::new(),c_user_id:String::new(),pass_token:String::new(),service_token:String::new(),ssecurity:String::new(),device_id,pass_o:pass_o.clone(),ua:format!("Android-15-11.0.701-Xiaomi-23046RP50C-OS2.0.212.0.VMYCNXM-{id}-CN-{id}-{id}-SmartHome-MI_APP_STORE-{id}|{id}|{pass_o}-64"),region:"cn".into(),saved_at:0}
    }
    fn valid(&self) -> bool {
        ![
            &self.user_id,
            &self.c_user_id,
            &self.service_token,
            &self.ssecurity,
        ]
        .iter()
        .any(|s| s.is_empty())
    }
}
struct PendingLogin {
    data: Value,
    creds: Credentials,
    client: Client,
    jar: Arc<Jar>,
    cancel: CancellationToken,
    deadline: Instant,
    epoch: u64,
    waiting: std::sync::atomic::AtomicBool,
}
pub struct Cloud {
    pub client: Client,
    auth: RwLock<Option<Credentials>>,
    tickets: Mutex<HashMap<String, Arc<PendingLogin>>>,
    auth_write: Mutex<()>,
    refresh_gate: Mutex<()>,
    epoch: AtomicU64,
    login_generation: AtomicU64,
    pub storage: Storage,
}
impl Cloud {
    pub fn new(storage: Storage) -> Result<Self> {
        let auth = match storage.load_auth::<Credentials>() {
            Ok(Some(a)) if a.valid() => Some(a),
            Ok(_) => None,
            Err(e) => {
                eprintln!("Credentials could not be loaded: {e}");
                None
            }
        };
        let client = Client::builder()
            .use_rustls_tls()
            .redirect(reqwest::redirect::Policy::none())
            .cookie_store(true)
            .connect_timeout(Duration::from_secs(15))
            .timeout(Duration::from_secs(35))
            .user_agent("MiHome-Native/0.1")
            .build()?;
        Ok(Self {
            client,
            auth: RwLock::new(auth),
            tickets: Mutex::new(HashMap::new()),
            auth_write: Mutex::new(()),
            refresh_gate: Mutex::new(()),
            epoch: AtomicU64::new(0),
            login_generation: AtomicU64::new(0),
            storage,
        })
    }
    #[cfg(test)]
    pub(crate) async fn replace_test_auth(&self, user_id: &str) {
        let _guard = self.auth_write.lock().await;
        let mut a = Credentials::new();
        a.user_id = user_id.into();
        a.c_user_id = format!("c-{user_id}");
        a.service_token = "test-token".into();
        a.pass_token = "test-pass".into();
        a.ssecurity = "c2VjcmV0".into();
        let mut auth = self.auth.write().await;
        *auth = Some(a);
        self.epoch.fetch_add(1, Ordering::SeqCst);
    }
    pub fn epoch(&self) -> u64 {
        self.epoch.load(Ordering::SeqCst)
    }
    pub async fn session(&self) -> Session {
        let a = self.auth.read().await;
        Session {
            authenticated: a.is_some(),
            user_id: a.as_ref().map(|a| a.user_id.clone()),
            region: a
                .as_ref()
                .map(|a| a.region.clone())
                .unwrap_or_else(|| "cn".into()),
        }
    }
    pub async fn begin_login(&self) -> Result<LoginTicket> {
        // Login does not reuse another program's plaintext credential files.
        let generation = self.login_generation.fetch_add(1, Ordering::SeqCst) + 1;
        let epoch = self.prepare_login(generation).await?;
        let creds = Credentials::new();
        let jar = Arc::new(Jar::default());
        let client = login_client(jar.clone())?;
        let location = service_location(&client, &creds).await?;
        let url = trusted_url(required(&location, "location")?)?;
        let mut query: Vec<(String, String)> = url
            .query_pairs()
            .map(|(k, v)| (k.into_owned(), v.into_owned()))
            .collect();
        query.extend([
            ("theme".into(), "".into()),
            ("bizDeviceType".into(), "".into()),
            ("_hasLogo".into(), "false".into()),
            ("_qrsize".into(), "240".into()),
            (
                "_dc".into(),
                chrono::Utc::now().timestamp_millis().to_string(),
            ),
        ]);
        let data = parse_service(
            client
                .get("https://account.xiaomi.com/longPolling/loginUrl")
                .header("User-Agent", &creds.ua)
                .query(&query)
                .send()
                .await?,
        )
        .await?;
        verify_service(&data)?;
        let login_url = required(&data, "loginUrl")?.to_owned();
        trusted_url(&login_url)?;
        trusted_url(required(&data, "lp")?)?;
        let expires = data
            .get("timeout")
            .and_then(Value::as_u64)
            .filter(|v| *v > 0 && *v <= 600)
            .unwrap_or(120);
        let id = uuid::Uuid::new_v4().to_string();
        let pending = Arc::new(PendingLogin {
            data,
            creds,
            client,
            jar,
            cancel: CancellationToken::new(),
            deadline: Instant::now() + Duration::from_secs(expires),
            epoch,
            waiting: std::sync::atomic::AtomicBool::new(false),
        });
        self.install_ticket(id.clone(), pending, generation).await?;
        Ok(LoginTicket {
            login_url,
            expires_in: expires,
            ticket_id: id,
        })
    }
    async fn prepare_login(&self, generation: u64) -> Result<u64> {
        let _guard = self.auth_write.lock().await;
        if generation != self.login_generation.load(Ordering::SeqCst) {
            return Err(AppError::new(
                "login_cancelled",
                "登录请求已被更新的二维码取代",
            ));
        }
        for p in self.tickets.lock().await.drain().map(|(_, p)| p) {
            p.cancel.cancel();
        }
        Ok(self.epoch.load(Ordering::SeqCst))
    }
    async fn install_ticket(
        &self,
        id: String,
        pending: Arc<PendingLogin>,
        generation: u64,
    ) -> Result<()> {
        let _guard = self.auth_write.lock().await;
        if pending.epoch != self.epoch.load(Ordering::SeqCst)
            || generation != self.login_generation.load(Ordering::SeqCst)
        {
            return Err(AppError::new("login_cancelled", "登录请求已失效，请重试"));
        }
        let mut tickets = self.tickets.lock().await;
        // Only the most recently STARTED QR flow may supersede an existing ticket.
        for p in tickets.values() {
            p.cancel.cancel();
        }
        tickets.clear();
        tickets.insert(id, pending);
        Ok(())
    }
    pub async fn wait_login(&self, id: &str) -> Result<Session> {
        let pending = self
            .tickets
            .lock()
            .await
            .get(id)
            .cloned()
            .ok_or_else(|| AppError::new("login_expired", "登录二维码已过期，请刷新"))?;
        if pending.waiting.swap(true, Ordering::SeqCst) {
            return Err(AppError::new("login_in_progress", "该二维码正在等待登录"));
        }
        // The map lock is released before long polling. Logout and cancellation remain responsive.
        let result = tokio::select! {
            _=pending.cancel.cancelled()=>Err(AppError::new("login_cancelled","登录已取消")),
            _=tokio::time::sleep_until(pending.deadline.into())=>Err(AppError::new("login_expired","登录二维码已过期，请刷新")),
            result=self.complete_login(&pending)=>result,
        };
        let creds = match result {
            Ok(creds) => creds,
            Err(error) => {
                self.tickets.lock().await.remove(id);
                return Err(error);
            }
        };
        let _guard = self.auth_write.lock().await;
        if pending.cancel.is_cancelled()
            || pending.epoch != self.epoch.load(Ordering::SeqCst)
            || pending.deadline <= Instant::now()
        {
            return Err(AppError::new("login_cancelled", "登录已取消或过期"));
        }
        // Commit is outside select! so cancellation cannot interrupt between writing
        // the DPAPI file and publishing the in-memory credentials.
        let mut auth = self.auth.write().await;
        self.storage.save_auth(&creds)?;
        *auth = Some(creds);
        self.epoch.fetch_add(1, Ordering::SeqCst);
        drop(auth);
        self.tickets.lock().await.remove(id);
        Ok(self.session().await)
    }
    async fn complete_login(&self, p: &PendingLogin) -> Result<Credentials> {
        let lp = trusted_url(required(&p.data, "lp")?)?;
        let data = parse_service(
            p.client
                .get(lp)
                .header("User-Agent", &p.creds.ua)
                .timeout(Duration::from_secs(125))
                .send()
                .await?,
        )
        .await?;
        verify_service(&data)?;
        let mut creds = p.creds.clone();
        creds.user_id = required_text(&data, "userId")?;
        creds.c_user_id = required_text(&data, "cUserId")?;
        creds.ssecurity = required(&data, "ssecurity")?.into();
        creds.pass_token = required(&data, "passToken")?.into();
        complete_callback(&p.client, &p.jar, &data, &mut creds).await?;
        Ok(creds)
    }
    pub async fn cancel_login(&self, id: &str) -> Result<()> {
        let _guard = self.auth_write.lock().await;
        if let Some(p) = self.tickets.lock().await.remove(id) {
            p.cancel.cancel();
        }
        Ok(())
    }
    pub async fn logout(&self) -> Result<()> {
        let _guard = self.auth_write.lock().await;
        self.epoch.fetch_add(1, Ordering::SeqCst);
        self.login_generation.fetch_add(1, Ordering::SeqCst);
        for p in self.tickets.lock().await.drain().map(|(_, p)| p) {
            p.cancel.cancel();
        }
        *self.auth.write().await = None;
        // Attempt every removal even if one fails, so credentials are never left in memory.
        let auth_result = self.storage.remove("credentials.dpapi");
        let cache_result = self.storage.remove("snapshot.json");
        auth_result?;
        cache_result?;
        Ok(())
    }
    async fn refresh(&self, old: &Credentials, epoch: u64) -> Result<Credentials> {
        let _gate = self.refresh_gate.lock().await;
        if epoch != self.epoch.load(Ordering::SeqCst) {
            return Err(AppError::auth());
        }
        let current = self.auth.read().await.clone().ok_or_else(AppError::auth)?;
        if current.user_id != old.user_id {
            return Err(AppError::auth());
        }
        if current.service_token != old.service_token {
            return Ok(current);
        }
        let jar = Arc::new(Jar::default());
        let client = login_client(jar.clone())?;
        let data = service_location(&client, &current).await?;
        if data.get("code").and_then(Value::as_i64) != Some(0) {
            return Err(AppError::auth());
        }
        let mut updated = current.clone();
        updated.ssecurity = required(&data, "ssecurity")?.into();
        complete_callback(&client, &jar, &data, &mut updated).await?;
        let _guard = self.auth_write.lock().await;
        if epoch != self.epoch.load(Ordering::SeqCst) {
            return Err(AppError::auth());
        }
        self.storage.save_auth(&updated)?;
        *self.auth.write().await = Some(updated.clone());
        Ok(updated)
    }
    pub fn ensure_epoch(&self, epoch: u64) -> Result<()> {
        if epoch != self.epoch() {
            Err(AppError::auth())
        } else {
            Ok(())
        }
    }
    pub async fn request_at_epoch(&self, epoch: u64, uri: &str, data: Value) -> Result<Value> {
        self.ensure_epoch(epoch)?;
        let auth = self.auth.read().await.clone().ok_or_else(AppError::auth)?;
        self.ensure_epoch(epoch)?;
        let result = match self.request_with(epoch, &auth, uri, &data).await {
            Err(e)
                if [
                    "authentication_required",
                    "cloud_-10030",
                    "cloud_-10020",
                    "cloud_3",
                    "cloud_-6",
                    "cloud_401",
                ]
                .contains(&e.code.as_str()) =>
            {
                let updated = self.refresh(&auth, epoch).await?;
                self.request_with(epoch, &updated, uri, &data).await
            }
            result => result,
        };
        if epoch != self.epoch.load(Ordering::SeqCst) {
            return Err(AppError::auth());
        }
        result
    }
    async fn request_with(
        &self,
        epoch: u64,
        a: &Credentials,
        uri: &str,
        data: &Value,
    ) -> Result<Value> {
        self.ensure_epoch(epoch)?;
        let nonce = crypto::nonce();
        let params =
            crypto::encrypted_params(uri, &a.ssecurity, &nonce, &serde_json::to_string(data)?)?;
        let host = match a.region.as_str() {
            "cn" => "https://api.mijia.tech/app".into(),
            region if ["us", "de", "ru", "sg", "in", "i2"].contains(&region) => {
                format!("https://{region}.api.io.mi.com/app")
            }
            _ => return Err(AppError::invalid("不支持的服务器区域")),
        };
        let cookies=format!("userId={}; cUserId={}; yetAnotherServiceToken={}; serviceToken={}; timezone_id=Asia/Shanghai; timezone=GMT%2B08%3A00; is_daylight=0; dst_offset=0; channel=MI_APP_STORE; countryCode=CN; PassportDeviceId={}; locale=zh_CN",a.user_id,a.c_user_id,a.service_token,a.service_token,a.device_id);
        let cookie = HeaderValue::from_str(&cookies)
            .map_err(|_| AppError::new("invalid_credentials", "认证信息包含非法字符"))?;
        self.ensure_epoch(epoch)?;
        let response = self
            .client
            .post(format!("{host}{uri}"))
            .header("User-Agent", &a.ua)
            .header(COOKIE, cookie)
            .header("Accept-Encoding", "identity")
            .header("miot-accept-encoding", "GZIP")
            .header("miot-encrypt-algorithm", "ENCRYPT-RC4")
            .header("x-xiaomi-protocal-flag-cli", "PROTOCAL-HTTP2")
            .form(&params)
            .send()
            .await?;
        if response.status() == reqwest::StatusCode::UNAUTHORIZED {
            return Err(AppError::auth());
        }
        let response = response.error_for_status()?;
        let body = response.text().await?;
        let parsed: Value = match serde_json::from_str(&body) {
            Ok(v) => v,
            Err(_) => serde_json::from_slice(&crypto::decrypt(&a.ssecurity, &nonce, &body)?)?,
        };
        let code = parsed
            .get("code")
            .and_then(Value::as_i64)
            .ok_or_else(|| AppError::new("invalid_response", "云端响应缺少状态码"))?;
        if code != 0 {
            return Err(AppError::api(
                code,
                parsed
                    .get("message")
                    .or_else(|| parsed.get("desc"))
                    .and_then(Value::as_str)
                    .unwrap_or("米家云端请求失败"),
            ));
        }
        parsed
            .get("result")
            .cloned()
            .ok_or_else(|| AppError::new("invalid_response", "云端响应缺少 result"))
    }
}
fn login_client(jar: Arc<Jar>) -> Result<Client> {
    let redirects = reqwest::redirect::Policy::custom(|attempt| {
        if attempt.previous().len() >= 10 {
            attempt.error("too many login redirects")
        } else if trusted_url(attempt.url().as_str()).is_err() {
            attempt.error("untrusted login redirect")
        } else {
            attempt.follow()
        }
    });
    Ok(Client::builder()
        .use_rustls_tls()
        .redirect(redirects)
        .cookie_provider(jar)
        .connect_timeout(Duration::from_secs(15))
        .timeout(Duration::from_secs(35))
        .build()?)
}
async fn service_location(client: &Client, a: &Credentials) -> Result<Value> {
    let cookie = format!(
        "deviceId={};pass_o={};passToken={};userId={};cUserId={};uLocale=zh_CN",
        a.device_id, a.pass_o, a.pass_token, a.user_id, a.c_user_id
    );
    let data = parse_service(
        client
            .get(SERVICE_LOGIN)
            .query(&[("_json", "true"), ("sid", "mijia"), ("_locale", "zh_CN")])
            .header("User-Agent", &a.ua)
            .header(
                COOKIE,
                HeaderValue::from_str(&cookie).map_err(|_| AppError::auth())?,
            )
            .send()
            .await?,
    )
    .await?;
    required(&data, "location")?;
    Ok(data)
}
async fn parse_service(response: reqwest::Response) -> Result<Value> {
    let text = response.error_for_status()?.text().await?;
    Ok(serde_json::from_str(
        text.strip_prefix("&&&START&&&").unwrap_or(&text),
    )?)
}
fn verify_service(data: &Value) -> Result<()> {
    let code = data.get("code").and_then(Value::as_i64).unwrap_or(0);
    if code != 0 {
        Err(AppError::api(
            code,
            data.get("desc")
                .and_then(Value::as_str)
                .unwrap_or("登录请求失败"),
        ))
    } else {
        Ok(())
    }
}
fn required<'a>(v: &'a Value, key: &str) -> Result<&'a str> {
    v.get(key)
        .and_then(Value::as_str)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| AppError::new("invalid_response", format!("云端响应缺少 {key}")))
}
fn required_text(v: &Value, key: &str) -> Result<String> {
    let s = text(&v[key]);
    if s.is_empty() {
        Err(AppError::new(
            "invalid_response",
            format!("云端响应缺少 {key}"),
        ))
    } else {
        Ok(s)
    }
}
fn trusted_url(s: &str) -> Result<Url> {
    let url = Url::parse(s).map_err(|_| AppError::new("invalid_response", "登录 URL 无效"))?;
    let host = url.host_str().unwrap_or("");
    if url.scheme() != "https"
        || !url.username().is_empty()
        || url.password().is_some()
        || url.port_or_known_default() != Some(443)
        || !["xiaomi.com", "mi.com", "mijia.tech", "xiaomi.net"]
            .iter()
            .any(|d| host == *d || host.ends_with(&format!(".{d}")))
    {
        return Err(AppError::new(
            "invalid_response",
            "登录 URL 不属于受信任的小米服务器",
        ));
    }
    Ok(url)
}
async fn complete_callback(
    client: &Client,
    jar: &Jar,
    data: &Value,
    a: &mut Credentials,
) -> Result<()> {
    let location = trusted_url(required(data, "location")?)?;
    let response = client
        .get(location.clone())
        .header("User-Agent", &a.ua)
        .send()
        .await?
        .error_for_status()?;
    let final_url = response.url().clone();
    let mut cookies = HashMap::new();
    for u in [
        location,
        final_url,
        Url::parse("https://api.mijia.tech/").unwrap(),
        Url::parse("https://api.io.mi.com/").unwrap(),
    ] {
        if let Some(header) = jar.cookies(&u) {
            if let Ok(header) = header.to_str() {
                for pair in header.split(';') {
                    if let Some((k, v)) = pair.trim().split_once('=') {
                        cookies.insert(k.to_owned(), v.to_owned());
                    }
                }
            }
        }
    }
    a.service_token = cookies.get("serviceToken").cloned().ok_or_else(|| {
        AppError::new(
            "authentication_required",
            "登录回调未返回 serviceToken，请重新登录",
        )
    })?;
    if let Some(v) = cookies.get("cUserId") {
        a.c_user_id = v.clone();
    }
    if let Some(v) = cookies.get("passToken") {
        a.pass_token = v.clone();
    }
    a.saved_at = chrono::Utc::now().timestamp_millis();
    if !a.valid() {
        return Err(AppError::auth());
    }
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn login_url_host_boundaries() {
        assert!(trusted_url("https://account.xiaomi.com/longPolling/x").is_ok());
        assert!(trusted_url("https://account.xiaomi.com.evil.test/x").is_err());
        assert!(trusted_url("http://account.xiaomi.com/x").is_err());
    }
    #[tokio::test]
    async fn cancelled_longpoll_releases_ticket_lock() {
        let dir = tempfile::tempdir().unwrap();
        let cloud = Arc::new(Cloud::new(Storage::new(dir.path().into()).unwrap()).unwrap());
        let jar = Arc::new(Jar::default());
        let cancel = CancellationToken::new();
        cancel.cancel();
        cloud.tickets.lock().await.insert(
            "cancelled".into(),
            Arc::new(PendingLogin {
                data: serde_json::json!({"lp":"https://account.xiaomi.com/longPolling/unused"}),
                creds: Credentials::new(),
                client: login_client(jar.clone()).unwrap(),
                jar,
                cancel,
                deadline: Instant::now() + Duration::from_secs(120),
                epoch: 0,
                waiting: std::sync::atomic::AtomicBool::new(false),
            }),
        );
        let error = tokio::time::timeout(Duration::from_secs(1), cloud.wait_login("cancelled"))
            .await
            .unwrap()
            .err()
            .unwrap();
        assert_eq!(error.code, "login_cancelled");
        assert!(cloud.tickets.lock().await.is_empty());
        assert!(!cloud.session().await.authenticated);
    }
    fn pending_for_test(epoch: u64) -> Arc<PendingLogin> {
        let jar = Arc::new(Jar::default());
        Arc::new(PendingLogin {
            data: Value::Null,
            creds: Credentials::new(),
            client: login_client(jar.clone()).unwrap(),
            jar,
            cancel: CancellationToken::new(),
            deadline: Instant::now() + Duration::from_secs(120),
            epoch,
            waiting: std::sync::atomic::AtomicBool::new(false),
        })
    }
    #[tokio::test]
    async fn older_qr_completion_cannot_replace_newer_ticket() {
        let dir = tempfile::tempdir().unwrap();
        let cloud = Cloud::new(Storage::new(dir.path().into()).unwrap()).unwrap();
        cloud.login_generation.store(2, Ordering::SeqCst);
        let newer = pending_for_test(0);
        cloud
            .install_ticket("newer".into(), newer.clone(), 2)
            .await
            .unwrap();
        assert_eq!(
            cloud
                .install_ticket("older".into(), pending_for_test(0), 1)
                .await
                .err()
                .unwrap()
                .code,
            "login_cancelled"
        );
        assert_eq!(
            cloud.prepare_login(1).await.err().unwrap().code,
            "login_cancelled"
        );
        assert!(!newer.cancel.is_cancelled());
        assert!(cloud.tickets.lock().await.contains_key("newer"));
    }
    #[tokio::test]
    async fn stale_request_epoch_cannot_capture_new_account() {
        let dir = tempfile::tempdir().unwrap();
        let cloud = Cloud::new(Storage::new(dir.path().into()).unwrap()).unwrap();
        cloud.replace_test_auth("A").await;
        let epoch = cloud.epoch();
        cloud.replace_test_auth("B").await;
        let result = tokio::time::timeout(
            Duration::from_secs(1),
            cloud.request_at_epoch(epoch, "/must-never-send", serde_json::json!({})),
        )
        .await
        .unwrap();
        assert_eq!(result.err().unwrap().code, "authentication_required");
    }
    #[tokio::test]
    async fn logout_invalidates_ticket_and_generation() {
        let dir = tempfile::tempdir().unwrap();
        let cloud = Cloud::new(Storage::new(dir.path().into()).unwrap()).unwrap();
        let epoch = cloud.epoch();
        cloud.logout().await.unwrap();
        assert_ne!(epoch, cloud.epoch());
        assert!(!cloud.session().await.authenticated);
        assert_eq!(
            cloud.wait_login("missing").await.err().unwrap().code,
            "login_expired"
        );
    }
    #[tokio::test]
    #[ignore = "Live Xiaomi server QR smoke test; no account credentials or scan required"]
    async fn live_qr_begin_cancel() {
        let dir = tempfile::tempdir().unwrap();
        let cloud = Cloud::new(Storage::new(dir.path().into()).unwrap()).unwrap();
        let ticket = cloud.begin_login().await.unwrap();
        assert!(ticket.login_url.starts_with("https://"));
        assert!(!ticket.ticket_id.is_empty());
        cloud.cancel_login(&ticket.ticket_id).await.unwrap();
        assert!(!cloud.session().await.authenticated);
        assert!(!dir.path().join("credentials.dpapi").exists());
    }
    #[test]
    fn credential_contract_is_not_frontend_session() {
        let a = Credentials::new();
        assert!(!a.valid());
        assert_eq!(a.region, "cn");
        assert_eq!(a.device_id.len(), 16);
    }
}
