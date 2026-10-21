import type { Household } from '@/types/household';

export function createHousehold(homeId: string): Household {
  const studio = homeId === 'demo-studio';
  return {
    homeId,
    armed: false,
    notificationPreferences: { device: true, security: true, system: true },
    members: [
      { id: 'owner', name: '我', role: '管理员', color: 'mint', rooms: '全部房间' },
      {
        id: 'member-2',
        name: '小米同学',
        role: '家庭成员',
        color: 'peach',
        rooms: studio ? '办公室' : '全部房间',
      },
      {
        id: 'member-3',
        name: '家人',
        role: '家庭成员',
        color: 'lavender',
        rooms: studio ? '办公室' : '客厅、卧室',
      },
    ],
    cameras: studio
      ? [{ id: 'office', name: '办公室摄像机', room: '办公室', online: true, privacy: false }]
      : [
          { id: 'living', name: '客厅摄像机', room: '客厅', online: true, privacy: false },
          { id: 'entry', name: '大门摄像机', room: '玄关', online: true, privacy: false },
          { id: 'balcony', name: '阳台摄像机', room: '阳台', online: false, privacy: false },
          { id: 'kitchen', name: '厨房摄像机', room: '厨房', online: true, privacy: false },
        ],
    automations: [
      {
        id: 'cool',
        name: '让清凉，恰到好处',
        condition: '室内温度高于 28°C',
        action: '客厅空调 · 制冷 26°C',
        enabled: true,
        icon: 'temperature',
      },
      {
        id: 'night',
        name: '入夜后，灯为你亮起',
        condition: '每天 18:30',
        action: '开启客厅吸顶灯 · 亮度 75%',
        enabled: true,
        icon: 'time',
      },
      {
        id: 'leave',
        name: '出门后，家也会照顾自己',
        condition: '离家模式开启',
        action: '关闭灯光 · 开启家庭布防',
        enabled: false,
        icon: 'door',
      },
    ],
    messages: [
      {
        id: 'm1',
        title: '大门有人经过',
        description: '大门摄像机检测到人形活动，已保存事件片段。',
        time: '09:42',
        type: 'security',
        read: false,
      },
      {
        id: 'm2',
        title: '清扫任务已完成',
        description: '扫拖机器人完成全屋清扫，已返回充电座。',
        time: '09:18',
        type: 'device',
        read: false,
      },
      {
        id: 'm3',
        title: '室内空气，清新如初',
        description: '空气净化器已将室内 PM2.5 降至 12 μg/m³。',
        time: '08:56',
        type: 'device',
        read: true,
      },
      {
        id: 'm4',
        title: '家庭设备已同步',
        description: '本次同步完成，设备状态已更新。',
        time: '08:30',
        type: 'system',
        read: true,
      },
    ],
  };
}

function normalizeSeries(weights: number[], total: number) {
  const sum = weights.reduce((value, weight) => value + weight, 0);
  let remaining = total;
  return weights.map((weight, index) => {
    const value = Number(
      (index === weights.length - 1 ? remaining : (weight / sum) * total).toFixed(2),
    );
    remaining -= value;
    return value;
  });
}

export const energySeries = {
  day: normalizeSeries(
    [
      0.2, 0.15, 0.12, 0.1, 0.1, 0.2, 0.4, 0.7, 0.9, 0.7, 0.6, 0.5, 0.4, 0.5, 0.3, 0.4, 0.3, 0.5,
      0.7, 0.8, 0.6, 0.4, 0.2, 0.1,
    ],
    8.4,
  ),
  week: [7.6, 8.9, 7.8, 9.2, 8.6, 7.5, 8.4],
  month: normalizeSeries([26, 31, 28, 35, 32, 29, 33, 27, 30, 34, 28, 32], 126.7),
};
