import type { Device, DeviceDetail, Property, Snapshot } from '@/types';
const home = { id: 'demo-home', name: '我的家', rooms: ['客厅', '卧室', '书房', '厨房', '玄关'] };
const make = (
  id: string,
  name: string,
  model: string,
  room: string,
  category: string,
  power: boolean | null,
  online = true,
  metrics: string | null = null,
): Device => ({
  did: `demo-${id}`,
  name,
  model,
  room,
  category,
  power,
  online,
  metrics,
  homeId: home.id,
  homeName: home.name,
  specType: category === 'sensor' ? '' : `urn:demo:${category}`,
});
export function createDemoSnapshot(): Snapshot {
  return {
    homes: [home, { id: 'demo-studio', name: '工作室', rooms: ['办公室'] }],
    devices: [
      make('light', '米家智能吸顶灯', 'yeelink.light.ceiling', '客厅', 'light', true),
      make(
        'ac',
        '米家互联网空调',
        'xiaomi.aircondition.v1',
        '客厅',
        'air-conditioner',
        true,
        true,
        '制冷 · 26°C',
      ),
      make(
        'purifier',
        '米家空气净化器 4',
        'zhimi.airpurifier.v4',
        '客厅',
        'purifier',
        true,
        true,
        '自动模式',
      ),
      make(
        'speaker',
        '小爱音箱 Pro',
        'xiaomi.wifispeaker.lx06',
        '客厅',
        'speaker',
        null,
        true,
        '待命中',
      ),
      make(
        'curtain',
        '米家智能窗帘',
        'lumi.curtain.acn',
        '卧室',
        'curtain',
        null,
        true,
        '已打开 80%',
      ),
      make('desk', '米家台灯 1S', 'yeelink.light.lamp', '书房', 'light', false),
      make(
        'vacuum',
        '米家扫拖机器人',
        'roborock.vacuum.a10',
        '玄关',
        'vacuum',
        null,
        true,
        '充电中',
      ),
      make(
        'sensor',
        '米家温湿度计',
        'miaomiaoce.sensor.ht',
        '卧室',
        'sensor',
        null,
        true,
        '24.6°C · 48%',
      ),
      make('outlet', '米家智能插座', 'chuangmi.plug.v3', '厨房', 'outlet', false, false),
      make(
        'camera',
        '米家智能摄像机',
        'chuangmi.camera.v1',
        '客厅',
        'camera',
        null,
        true,
        '隐私守护中',
      ),
      make(
        'lock',
        '米家智能门锁',
        'loock.lock.v1',
        '玄关',
        'lock',
        null,
        true,
        '已上锁 · 电量 86%',
      ),
      {
        ...make(
          'heater',
          '米家电热水器',
          'yunmi.waterheater.v1',
          '厨房',
          'heater',
          false,
          true,
          '设备需检查',
        ),
        fault: '水温传感器异常',
      },
      {
        ...make('studio-lamp', '工作室阅读灯', 'yeelink.light.lamp', '办公室', 'light', true),
        homeId: 'demo-studio',
        homeName: '工作室',
      },
    ],
    scenes: [
      { id: 'demo-arrive', name: '舒适到家', homeId: home.id, homeName: home.name },
      { id: 'demo-away', name: '安心离家', homeId: home.id, homeName: home.name },
      { id: 'demo-night', name: '晚安好梦', homeId: home.id, homeName: home.name },
      { id: 'demo-movie', name: '观影时光', homeId: home.id, homeName: home.name },
      { id: 'demo-work', name: '专注工作', homeId: 'demo-studio', homeName: '工作室' },
    ],
    updatedAt: new Date().toISOString(),
    cached: false,
    warnings: [],
  };
}
const prop = (
  piid: number,
  name: string,
  description: string,
  format: string,
  value: unknown,
  options: Partial<Property> = {},
): Property => ({
  siid: 2,
  piid,
  name,
  description,
  service: '设备控制',
  format,
  readable: true,
  writable: true,
  unit: null,
  range: null,
  valueList: [],
  value,
  error: null,
  ...options,
});
export function createDemoDetail(device: Device): DeviceDetail {
  const properties: Property[] = [];
  if (device.power !== null) properties.push(prop(1, 'on', '电源开关', 'bool', device.power));
  if (device.category === 'light')
    properties.push(
      prop(2, 'brightness', '亮度', 'uint8', 75, { range: [1, 100, 1], unit: '%' }),
      prop(3, 'color-temperature', '色温', 'uint16', 4000, { range: [2700, 6500, 100], unit: 'K' }),
    );
  if (device.category === 'air-conditioner')
    properties.push(
      prop(2, 'target-temperature', '目标温度', 'float', 26, { range: [16, 30, 0.5], unit: '°C' }),
      prop(3, 'mode', '运行模式', 'uint8', 2, {
        valueList: [
          { value: 1, description: '自动' },
          { value: 2, description: '制冷' },
          { value: 3, description: '制热' },
          { value: 4, description: '除湿' },
        ],
      }),
    );
  if (device.category === 'purifier')
    properties.push(
      prop(2, 'mode', '净化模式', 'uint8', 0, {
        valueList: [
          { value: 0, description: '自动' },
          { value: 1, description: '睡眠' },
          { value: 2, description: '最爱' },
        ],
      }),
      prop(3, 'pm2.5-density', 'PM2.5', 'uint16', 12, { writable: false, unit: 'μg/m³' }),
    );
  if (device.category === 'speaker')
    properties.push(prop(2, 'volume', '音量', 'uint8', 35, { range: [0, 100, 1], unit: '%' }));
  if (device.category === 'curtain')
    properties.push(
      prop(2, 'target-position', '开合程度', 'uint8', 80, { range: [0, 100, 1], unit: '%' }),
    );
  if (device.category === 'vacuum')
    properties.push(
      prop(2, 'battery-level', '剩余电量', 'uint8', 92, { writable: false, unit: '%' }),
      prop(3, 'status', '当前状态', 'uint8', 2, {
        writable: false,
        valueList: [
          { value: 1, description: '清扫中' },
          { value: 2, description: '充电中' },
        ],
      }),
    );
  if (device.category === 'sensor')
    properties.push(
      prop(2, 'temperature', '室内温度', 'float', 24.6, { writable: false, unit: '°C' }),
      prop(3, 'relative-humidity', '相对湿度', 'uint8', 48, { writable: false, unit: '%' }),
    );
  if (device.category === 'camera')
    properties.push(
      prop(2, 'privacy', '隐私模式', 'bool', false),
      prop(3, 'resolution', '视频清晰度', 'string', '2K', { writable: false }),
    );
  if (device.category === 'lock')
    properties.push(
      prop(2, 'locked', '门锁状态', 'bool', true, {
        writable: false,
        valueList: [
          { value: true, description: '已上锁' },
          { value: false, description: '未上锁' },
        ],
      }),
      prop(3, 'battery-level', '剩余电量', 'uint8', 86, { writable: false, unit: '%' }),
    );
  if (device.category === 'heater')
    properties.push(
      prop(2, 'target-temperature', '目标水温', 'uint8', 50, { range: [35, 75, 1], unit: '°C' }),
    );
  return {
    did: device.did,
    properties,
    actions:
      device.category === 'vacuum'
        ? [
            {
              siid: 2,
              aiid: 1,
              name: 'start-sweep',
              description: '开始清扫',
              service: '清扫控制',
              inputs: [],
            },
            {
              siid: 2,
              aiid: 2,
              name: 'stop-sweeping',
              description: '返回充电',
              service: '清扫控制',
              inputs: [],
            },
          ]
        : device.category === 'speaker'
          ? [
              {
                siid: 5,
                aiid: 1,
                name: 'execute-text-directive',
                description: '执行文字指令',
                service: '小爱同学',
                inputs: [1, 2],
              },
            ]
          : [],
  };
}
