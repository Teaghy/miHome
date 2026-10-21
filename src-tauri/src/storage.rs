use crate::error::{AppError, Result};
use serde::{de::DeserializeOwned, Serialize};
use std::{fs, io::Write, path::PathBuf};
use zeroize::Zeroizing;

#[derive(Clone)]
pub struct Storage {
    pub dir: PathBuf,
}
impl Storage {
    pub fn new(dir: PathBuf) -> Result<Self> {
        fs::create_dir_all(&dir)?;
        Ok(Self { dir })
    }
    pub fn read<T: DeserializeOwned>(&self, name: &str) -> Result<Option<T>> {
        match fs::read(self.dir.join(name)) {
            Ok(bytes) => Ok(Some(serde_json::from_slice(&bytes)?)),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(e) => Err(e.into()),
        }
    }
    pub fn write<T: Serialize>(&self, name: &str, value: &T) -> Result<()> {
        self.atomic(name, &serde_json::to_vec_pretty(value)?)
    }
    pub fn atomic(&self, name: &str, bytes: &[u8]) -> Result<()> {
        let mut file = tempfile::NamedTempFile::new_in(&self.dir)?;
        file.write_all(bytes)?;
        file.as_file().sync_all()?;
        file.persist(self.dir.join(name))
            .map_err(|e| AppError::from(e.error))?;
        Ok(())
    }
    pub fn remove(&self, name: &str) -> Result<()> {
        match fs::remove_file(self.dir.join(name)) {
            Ok(()) => Ok(()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(e) => Err(e.into()),
        }
    }
    pub fn save_auth<T: Serialize>(&self, value: &T) -> Result<()> {
        let plain = Zeroizing::new(serde_json::to_vec(value)?);
        self.atomic("credentials.dpapi", &protect(&plain)?)
    }
    pub fn load_auth<T: DeserializeOwned>(&self) -> Result<Option<T>> {
        let bytes = match fs::read(self.dir.join("credentials.dpapi")) {
            Ok(b) => b,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
            Err(e) => return Err(e.into()),
        };
        let plain = Zeroizing::new(unprotect(&bytes)?);
        Ok(Some(serde_json::from_slice(&plain)?))
    }
}

#[cfg(windows)]
fn dpapi(input: &[u8], encrypt: bool) -> Result<Vec<u8>> {
    use windows_sys::Win32::{
        Foundation::LocalFree,
        Security::Cryptography::{
            CryptProtectData, CryptUnprotectData, CRYPTPROTECT_UI_FORBIDDEN, CRYPT_INTEGER_BLOB,
        },
    };
    let source = CRYPT_INTEGER_BLOB {
        cbData: input
            .len()
            .try_into()
            .map_err(|_| AppError::new("credential_storage", "认证数据过长"))?,
        pbData: input.as_ptr() as *mut u8,
    };
    let mut output = CRYPT_INTEGER_BLOB {
        cbData: 0,
        pbData: std::ptr::null_mut(),
    };
    // Current-user DPAPI scope, no machine-wide flag; never writes plaintext credentials.
    let ok = unsafe {
        if encrypt {
            CryptProtectData(
                &source,
                std::ptr::null(),
                std::ptr::null(),
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                CRYPTPROTECT_UI_FORBIDDEN,
                &mut output,
            )
        } else {
            CryptUnprotectData(
                &source,
                std::ptr::null_mut(),
                std::ptr::null(),
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                CRYPTPROTECT_UI_FORBIDDEN,
                &mut output,
            )
        }
    };
    if ok == 0 {
        return Err(AppError::new(
            "credential_storage",
            format!("Windows 凭据保护失败: {}", std::io::Error::last_os_error()),
        ));
    }
    let bytes =
        unsafe { std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec() };
    unsafe {
        std::ptr::write_bytes(output.pbData, 0, output.cbData as usize);
        LocalFree(output.pbData as *mut _);
    }
    Ok(bytes)
}
#[cfg(windows)]
fn protect(input: &[u8]) -> Result<Vec<u8>> {
    dpapi(input, true)
}
#[cfg(windows)]
fn unprotect(input: &[u8]) -> Result<Vec<u8>> {
    dpapi(input, false)
}
#[cfg(not(windows))]
fn protect(_: &[u8]) -> Result<Vec<u8>> {
    Err(AppError::new(
        "unsupported_platform",
        "此版本凭据存储需要 Windows DPAPI",
    ))
}
#[cfg(not(windows))]
fn unprotect(_: &[u8]) -> Result<Vec<u8>> {
    Err(AppError::new(
        "unsupported_platform",
        "此版本凭据存储需要 Windows DPAPI",
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn atomic_replacement_and_removal() {
        let d = tempfile::tempdir().unwrap();
        let s = Storage::new(d.path().into()).unwrap();
        s.write("test.json", &vec![1, 2]).unwrap();
        s.write("test.json", &vec![3]).unwrap();
        assert_eq!(s.read::<Vec<i32>>("test.json").unwrap(), Some(vec![3]));
        s.remove("test.json").unwrap();
        assert!(s.read::<Vec<i32>>("test.json").unwrap().is_none());
    }
    #[cfg(windows)]
    #[test]
    fn dpapi_roundtrip() {
        let plain = b"secret never stored plaintext";
        let cipher = protect(plain).unwrap();
        assert_ne!(cipher, plain);
        assert_eq!(unprotect(&cipher).unwrap(), plain);
    }
}
