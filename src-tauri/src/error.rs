use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppError {
    pub code: String,
    pub message: String,
    pub retryable: bool,
}
pub type Result<T> = std::result::Result<T, AppError>;
impl AppError {
    pub fn new(code: &str, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            retryable: false,
        }
    }
    pub fn api(code: i64, message: impl Into<String>) -> Self {
        Self::new(&format!("cloud_{code}"), message)
    }
    pub fn auth() -> Self {
        Self::new("authentication_required", "请重新扫码登录米家账号")
    }
    pub fn invalid(message: impl Into<String>) -> Self {
        Self::new("invalid_argument", message)
    }
}
impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.code, self.message)
    }
}
impl std::error::Error for AppError {}
impl From<reqwest::Error> for AppError {
    fn from(e: reqwest::Error) -> Self {
        // URLs may contain login tickets. Never serialize the reqwest error URL.
        Self {
            code: if e.is_timeout() { "timeout" } else { "network" }.into(),
            message: if e.is_timeout() {
                "请求超时，请重试"
            } else {
                "网络请求失败，请检查网络连接"
            }
            .into(),
            retryable: true,
        }
    }
}
impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        Self::new("storage", format!("本地数据读写失败: {e}"))
    }
}
impl From<serde_json::Error> for AppError {
    fn from(_: serde_json::Error) -> Self {
        Self::new("invalid_response", "无法解析数据格式")
    }
}
