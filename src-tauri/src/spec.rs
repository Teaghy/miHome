use crate::{
    error::{AppError, Result},
    models::{text, Action, DeviceDetail, Property, ValueOption},
};
use serde_json::{json, Value};

fn urn_name(v: &Value) -> String {
    v.as_str()
        .unwrap_or("")
        .split(':')
        .nth(3)
        .unwrap_or("")
        .into()
}
fn id(v: &Value, key: &str) -> Result<u32> {
    v[key]
        .as_u64()
        .and_then(|n| u32::try_from(n).ok())
        .filter(|n| *n > 0)
        .ok_or_else(|| AppError::new("invalid_spec", format!("规格缺少有效 {key}")))
}
pub fn parse_spec(raw: &Value) -> Result<DeviceDetail> {
    let services = raw["services"]
        .as_array()
        .ok_or_else(|| AppError::new("invalid_spec", "设备规格缺少 services"))?;
    let mut properties = vec![];
    let mut actions = vec![];
    for svc in services {
        let siid = id(svc, "iid")?;
        let service = urn_name(&svc["type"]);
        for p in svc["properties"].as_array().into_iter().flatten() {
            let piid = id(p, "iid")?;
            let name = urn_name(&p["type"]);
            let access = p["access"].as_array();
            let has = |s: &str| access.is_some_and(|a| a.iter().any(|v| v.as_str() == Some(s)));
            let range = p["value-range"]
                .as_array()
                .map(|a| {
                    a.iter()
                        .map(|v| {
                            v.as_f64()
                                .ok_or_else(|| AppError::new("invalid_spec", "属性范围必须为数值"))
                        })
                        .collect::<Result<Vec<_>>>()
                })
                .transpose()?;
            if let Some(r) = &range {
                if r.len() != 3 || !r.iter().all(|n| n.is_finite()) || r[0] > r[1] || r[2] <= 0. {
                    return Err(AppError::new("invalid_spec", "属性范围定义无效"));
                }
            }
            let value_list = p["value-list"]
                .as_array()
                .into_iter()
                .flatten()
                .map(|v| ValueOption {
                    value: v["value"].clone(),
                    description: v["description"].as_str().unwrap_or("").into(),
                })
                .collect();
            let description = p["description"]
                .as_str()
                .filter(|s| !s.is_empty())
                .unwrap_or(&name)
                .to_owned();
            properties.push(Property {
                siid,
                piid,
                name,
                description,
                service: service.clone(),
                format: p["format"].as_str().unwrap_or("").into(),
                readable: has("read"),
                writable: has("write"),
                unit: p["unit"]
                    .as_str()
                    .filter(|s| *s != "none")
                    .map(str::to_owned),
                range,
                value_list,
                value: Value::Null,
                error: None,
            });
        }
        for a in svc["actions"].as_array().into_iter().flatten() {
            let aiid = id(a, "iid")?;
            let name = urn_name(&a["type"]);
            let description = a["description"]
                .as_str()
                .filter(|s| !s.is_empty())
                .unwrap_or(&name)
                .to_owned();
            let inputs = a["in"]
                .as_array()
                .into_iter()
                .flatten()
                .map(|v| {
                    v.as_u64()
                        .and_then(|n| u32::try_from(n).ok())
                        .filter(|n| *n > 0)
                        .ok_or_else(|| AppError::new("invalid_spec", "动作参数标识无效"))
                })
                .collect::<Result<Vec<_>>>()?;
            actions.push(Action {
                siid,
                aiid,
                name,
                description,
                service: service.clone(),
                inputs,
            });
        }
    }
    Ok(DeviceDetail {
        did: String::new(),
        properties,
        actions,
    })
}
pub fn validate_value(p: &Property, v: &Value, writable: bool) -> Result<()> {
    if writable && !p.writable {
        return Err(AppError::invalid(format!("{} 是只读属性", p.description)));
    }
    let invalid = || AppError::invalid(format!("{} 的值不符合 {} 规格", p.description, p.format));
    match p.format.as_str() {
        "bool" => {
            if !v.is_boolean() {
                return Err(invalid());
            }
        }
        "string" => {
            if !v.is_string() || v.as_str().unwrap().len() > 65536 {
                return Err(invalid());
            }
        }
        "float" => {
            if !v.as_f64().is_some_and(|n| n.is_finite()) {
                return Err(invalid());
            }
        }
        f if f.starts_with("uint") => {
            let n = v.as_u64().ok_or_else(invalid)?;
            let bits = f.trim_start_matches("uint").parse::<u32>().unwrap_or(32);
            if ![8, 16, 32, 64].contains(&bits) || (bits < 64 && n >= (1u64 << bits)) {
                return Err(invalid());
            }
        }
        f if f.starts_with("int") => {
            let n = v.as_i64().ok_or_else(invalid)?;
            let bits = f.trim_start_matches("int").parse::<u32>().unwrap_or(32);
            if ![8, 16, 32, 64].contains(&bits)
                || (bits < 64 && (n < -(1i64 << (bits - 1)) || n >= (1i64 << (bits - 1))))
            {
                return Err(invalid());
            }
        }
        _ => {
            return Err(AppError::new(
                "unsupported_format",
                format!("不支持验证此属性类型: {}", p.format),
            ))
        }
    }
    if !p.value_list.is_empty() && !p.value_list.iter().any(|o| o.value == *v) {
        return Err(AppError::invalid("该值不在设备枚举选项中"));
    }
    if let Some(r) = &p.range {
        let n = v.as_f64().ok_or_else(invalid)?;
        if n < r[0] || n > r[1] {
            return Err(AppError::invalid(format!(
                "数值必须在 {}–{} 之间",
                r[0], r[1]
            )));
        }
        let steps = (n - r[0]) / r[2];
        if (steps - steps.round()).abs() > 1e-6 * steps.abs().max(1.) {
            return Err(AppError::invalid(format!("数值步长必须为 {}", r[2])));
        }
    }
    Ok(())
}
pub fn validate_action(
    detail: &DeviceDetail,
    siid: u32,
    aiid: u32,
    inputs: &[Value],
) -> Result<()> {
    let a = detail
        .actions
        .iter()
        .find(|a| a.siid == siid && a.aiid == aiid)
        .ok_or_else(|| AppError::invalid("设备规格中不存在该动作"))?;
    if a.inputs.len() != inputs.len() {
        return Err(AppError::invalid(format!(
            "{} 需要 {} 个输入参数",
            a.description,
            a.inputs.len()
        )));
    }
    for (piid, v) in a.inputs.iter().zip(inputs) {
        let p = detail
            .properties
            .iter()
            .find(|p| p.siid == siid && p.piid == *piid)
            .ok_or_else(|| AppError::new("invalid_spec", "动作输入缺少属性规格，无法安全验证"))?;
        validate_value(p, v, false)?;
    }
    Ok(())
}
pub fn verify_write_result(result: &Value) -> Result<()> {
    let code = result
        .get("code")
        .and_then(Value::as_i64)
        .ok_or_else(|| AppError::new("invalid_response", "设备未返回执行状态"))?;
    if code == 0 {
        Ok(())
    } else if code == 1 {
        Err(AppError::new(
            "execution_unconfirmed",
            "网关已接收指令，但设备尚未确认执行，请刷新状态核实",
        ))
    } else {
        Err(AppError::api(
            code,
            format!("设备执行失败（{code}）: {}", text(&result["message"])),
        ))
    }
}
pub fn prop_query(did: &str, p: &Property) -> Value {
    json!({"did":did,"siid":p.siid,"piid":p.piid})
}

#[cfg(test)]
mod tests {
    use super::*;
    fn sample() -> Value {
        json!({"services":[{"iid":2,"type":"urn:miot-spec-v2:service:light:1","properties":[{"iid":1,"type":"urn:miot-spec-v2:property:on:1","description":"开关","format":"bool","access":["read","write"]},{"iid":2,"type":"urn:miot-spec-v2:property:brightness:1","description":"亮度","format":"uint8","access":["read","write"],"value-range":[0,100,5]},{"iid":3,"type":"urn:miot-spec-v2:property:mode:1","format":"uint8","access":["read"],"value-list":[{"value":0,"description":"正常"},{"value":1,"description":"睡眠"}]}],"actions":[{"iid":1,"type":"urn:miot-spec-v2:action:toggle:1","in":[1]}]}]})
    }
    #[test]
    fn parses_services_ranges_actions() {
        let d = parse_spec(&sample()).unwrap();
        assert_eq!(d.properties.len(), 3);
        assert_eq!(d.properties[1].range, Some(vec![0., 100., 5.]));
        assert_eq!(d.actions[0].inputs, vec![1]);
        assert_eq!(d.properties[0].service, "light");
    }
    #[test]
    fn validates_type_range_step_enum_and_access() {
        let d = parse_spec(&sample()).unwrap();
        assert!(validate_value(&d.properties[0], &json!(true), true).is_ok());
        assert!(validate_value(&d.properties[0], &json!(1), true).is_err());
        assert!(validate_value(&d.properties[1], &json!(105), true).is_err());
        assert!(validate_value(&d.properties[1], &json!(51), true).is_err());
        assert!(validate_value(&d.properties[1], &json!(50), true).is_ok());
        assert!(validate_value(&d.properties[2], &json!(0), true).is_err());
        assert!(validate_value(&d.properties[2], &json!(2), false).is_err());
    }
    #[test]
    fn validates_action_input_without_write_access() {
        let d = parse_spec(&sample()).unwrap();
        assert!(validate_action(&d, 2, 1, &[json!(true)]).is_ok());
        assert!(validate_action(&d, 2, 1, &[]).is_err());
        assert!(validate_action(&d, 2, 1, &[json!("x")]).is_err());
    }
    #[test]
    fn malformed_specs_fail() {
        assert!(parse_spec(&json!({})).is_err());
        let mut v = sample();
        v["services"][0]["properties"][1]["value-range"] = json!([0, 100, 0]);
        assert!(parse_spec(&v).is_err());
    }
    #[test]
    fn gateway_receipt_not_fake_success() {
        assert!(verify_write_result(&json!({"code":0})).is_ok());
        assert_eq!(
            verify_write_result(&json!({"code":1})).unwrap_err().code,
            "execution_unconfirmed"
        );
        assert!(verify_write_result(&json!({})).is_err());
    }
}
