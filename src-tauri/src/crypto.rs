//! Xiaomi's RC4-drop1024 protocol. This is a wire-compatibility requirement,
//! not a choice of cipher for local credential storage (which uses DPAPI).
use crate::error::{AppError, Result};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use rand::RngCore;
use sha1::{Digest, Sha1};
use sha2::Sha256;
use std::io::Read;

pub fn nonce() -> String {
    let mut bytes = vec![0u8; 8];
    rand::thread_rng().fill_bytes(&mut bytes);
    let minutes = (chrono::Utc::now().timestamp_millis() / 60_000) as u32;
    bytes.extend_from_slice(&minutes.to_be_bytes());
    B64.encode(bytes)
}
pub fn signed_nonce(secret: &str, nonce: &str) -> Result<String> {
    let mut hash = Sha256::new();
    hash.update(decode(secret)?);
    hash.update(decode(nonce)?);
    Ok(B64.encode(hash.finalize()))
}
fn decode(s: &str) -> Result<Vec<u8>> {
    B64.decode(s.trim())
        .map_err(|_| AppError::new("crypto", "云端加密数据无效"))
}
fn signature(uri: &str, signed: &str, params: &[(String, String)]) -> String {
    let mut parts = vec!["POST".to_owned(), uri.to_owned()];
    parts.extend(params.iter().map(|(k, v)| format!("{k}={v}")));
    parts.push(signed.into());
    B64.encode(Sha1::digest(parts.join("&").as_bytes()))
}
fn rc4_drop(key: &[u8], input: &[u8]) -> Result<Vec<u8>> {
    if key.is_empty() {
        return Err(AppError::new("crypto", "空加密密钥"));
    }
    let mut s = [0u8; 256];
    for (i, x) in s.iter_mut().enumerate() {
        *x = i as u8;
    }
    let mut j = 0usize;
    for i in 0..256 {
        j = (j + s[i] as usize + key[i % key.len()] as usize) % 256;
        s.swap(i, j);
    }
    let (mut i, mut j) = (0usize, 0usize);
    let mut result = Vec::with_capacity(input.len());
    for n in 0..1024 + input.len() {
        i = (i + 1) % 256;
        j = (j + s[i] as usize) % 256;
        s.swap(i, j);
        let k = s[(s[i] as usize + s[j] as usize) % 256];
        if n >= 1024 {
            result.push(input[n - 1024] ^ k);
        }
    }
    Ok(result)
}
pub fn encrypt(signed: &str, plain: &str) -> Result<String> {
    Ok(B64.encode(rc4_drop(&decode(signed)?, plain.as_bytes())?))
}
pub fn encrypted_params(
    uri: &str,
    secret: &str,
    nonce: &str,
    data: &str,
) -> Result<Vec<(String, String)>> {
    let signed = signed_nonce(secret, nonce)?;
    let mut params = vec![("data".into(), data.into())];
    params.push(("rc4_hash__".into(), signature(uri, &signed, &params)));
    for (_, v) in &mut params {
        *v = encrypt(&signed, v)?;
    }
    params.push(("signature".into(), signature(uri, &signed, &params)));
    params.push(("ssecurity".into(), secret.into()));
    params.push(("_nonce".into(), nonce.into()));
    Ok(params)
}
pub fn decrypt(secret: &str, nonce: &str, payload: &str) -> Result<Vec<u8>> {
    let signed = signed_nonce(secret, nonce)?;
    let bytes = rc4_drop(&decode(&signed)?, &decode(payload)?)?;
    if bytes.starts_with(&[0x1f, 0x8b]) {
        let mut out = Vec::new();
        flate2::read::GzDecoder::new(&bytes[..])
            .take(16 * 1024 * 1024)
            .read_to_end(&mut out)?;
        Ok(out)
    } else {
        Ok(bytes)
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rfc6229_drop1024_vector() {
        let out = rc4_drop(&[1, 2, 3, 4, 5], &[0; 16]).unwrap();
        assert_eq!(
            out,
            vec![
                0x30, 0xab, 0xbc, 0xc7, 0xc2, 0x0b, 0x01, 0x60, 0x9f, 0x23, 0xee, 0x2d, 0x5f, 0x6b,
                0xb7, 0xdf
            ]
        );
    }
    #[test]
    fn roundtrip_unicode() {
        let secret = B64.encode(b"secret");
        let nonce = B64.encode(b"123456789012");
        let signed = signed_nonce(&secret, &nonce).unwrap();
        let cipher = encrypt(&signed, "小爱同学🌿").unwrap();
        assert_eq!(
            decrypt(&secret, &nonce, &cipher).unwrap(),
            "小爱同学🌿".as_bytes()
        );
    }
    #[test]
    fn parameter_order_is_protocol_order() {
        let params = encrypted_params("/test", "c2VjcmV0", "MTIzNDU2Nzg5MDEy", "{}").unwrap();
        assert_eq!(
            params.iter().map(|p| p.0.as_str()).collect::<Vec<_>>(),
            ["data", "rc4_hash__", "signature", "ssecurity", "_nonce"]
        );
        assert_ne!(params[0].1, "{}");
    }
    #[test]
    fn fixed_upstream_compatible_signing_vector() {
        assert_eq!(
            signed_nonce("c2VjcmV0", "MTIzNDU2Nzg5MDEy").unwrap(),
            "r2zb+b912cRVSqTgqHH2cSzh3KzNECqBZaJ6HTytbWs="
        );
        let p = encrypted_params("/test", "c2VjcmV0", "MTIzNDU2Nzg5MDEy", "{}").unwrap();
        assert_eq!(p[0].1, "XxU=");
        assert_eq!(p[1].1, "Zy4qsvCEaJHqdsdZr4BPmaZPWwkSNOQpW15VnQ==");
        assert_eq!(p[2].1, "4HdF6Wa2c0KMcqfZ+YsiKnfjA9w=");
    }
    #[test]
    fn malformed_crypto_rejected() {
        assert!(signed_nonce("!", "abc").is_err());
        assert!(rc4_drop(&[], b"x").is_err());
    }
}
