# Native backend

This directory is the complete Tauri 2 / Rust backend. There is **no Python runtime or sidecar**. `icons/generate_icons.py` is an optional, build-independent asset regeneration script only; packaged applications use the committed PNG/ICO files.

## Interface

Commands match `src/types.ts`; Tauri maps Rust snake_case arguments to camelCase (`ticketId`, `sceneId`, `homeId`). Errors reject with `{ code, message, retryable }`. `get_session` reports locally stored credential availability; the first cloud request detects invalid tokens and attempts a native refresh. Region defaults to `cn`. Frontend tickets contain only `loginUrl`, `expiresIn`, and a random `ticketId`; polling URLs and credentials stay native.

Settings defaults: system theme, scale 1, close to tray on, autostart off, scenes shown, unsupported devices shown, refresh interval 60 seconds, no default speaker or favorites. Scale must be 0.5–2; refresh interval is 0 (disabled) or 15–3600 seconds. The frontend owns refresh scheduling. Autostart uses the Tauri native plugin and reflects actual OS registration on read.

## Protocol and safety

- QR login follows Xiaomi `serviceLogin` → `longPolling/loginUrl` → `lp` → callback cookies. Polling does not hold the ticket map or credential lock. Cancellation and logout invalidate pending commits.
- Service-token refresh uses `passToken`, stable device identity, `sid=mijia`, and the callback `ssecurity`. Only explicit authentication failures are retried; generic cloud failures do not replay writes.
- Cloud calls use SHA-256 signed nonces, ordered SHA-1 request signatures, independently initialized RC4-drop1024 per parameter, and encrypted/gzip response decoding, matching the referenced `mijia-api` protocol.
- Login redirects are HTTPS-only, bounded, and restricted to Xiaomi domains. API redirects are disabled. Network errors do not serialize URLs or response bodies containing tickets.
- Windows current-user DPAPI protects credentials. No automatic upstream auth-file import. Unsupported operating systems refuse credential persistence rather than writing plaintext.
- Settings, public specs, and account-bound snapshots use same-directory atomic file replacement. Device names/IDs in the cache are not encrypted. Logout clears the snapshot and credentials; storage failures are explicit errors.
- MIoT specs define readable/writable flags, numeric types and bounds, range steps, enums, and action inputs. Writes are validated before cloud requests. Known-offline devices are rejected by the native control commands before spec lookup or network I/O (including property writes, actions, and voice). Gateway code `1` is `execution_unconfirmed`, not a fabricated execution success.
- The tray offers show/hide/quit and close-to-tray is configurable. There is deliberately no unrelated upstream release-check URL or automatic updater.

## Verification

Run `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, and `cargo test --lib`. The locked dependencies require Rust 1.90 or newer. Tests cover the RFC6229 RC4-drop1024 vector, fixed ordered-signature/encryption vectors, Unicode roundtrips, malformed crypto, spec parsing/value/action validation, settings, atomic replacement, cancellation, out-of-order QR flows, command-level account switches at spec barriers, and Windows DPAPI roundtrips. Verification here passed formatting, Clippy with warnings denied, all 27 offline unit tests, and the explicit live QR begin/cancel smoke test.

`cargo test --lib live_qr_begin_cancel -- --ignored` is an explicit live Xiaomi QR endpoint smoke test. It does not scan a QR, authenticate an account, persist credentials, or operate a device.

Authenticated login completion, refresh, property/action writes, scene execution, and voice control require a real Xiaomi account and hardware to exercise end to end. Public cloud endpoints can change without notice. Devices without public MIoT specs are visible but explicitly unsupported for control. A scene response without an explicit success receipt is reported as unconfirmed. The separately shared device endpoint is included; if it reports more pages without a supported cursor, the snapshot warns rather than implying completeness. No local-LAN transport, quick-device tray panel, draggable workbench, automatic updater, or automatic credential import is included.
