import { DoorOpen, Moon, Play, ShieldCheck, Sparkles } from 'lucide-react';
import type { Scene } from '@/types';
export function scenePresentation(scene: Scene) {
  const name = scene.name.toLowerCase();
  if (/回家|arrive|home/.test(name))
    return { icon: DoorOpen, color: 'peach', subtitle: '把舒适的家，提前准备好' };
  if (/睡|晚安|sleep/.test(name))
    return { icon: Moon, color: 'lavender', subtitle: '卸下一天的忙碌，安心入眠' };
  if (/电影|movie|观影/.test(name))
    return { icon: Play, color: 'blue', subtitle: '灯光就绪，进入你的影院' };
  if (/离家|away/.test(name))
    return { icon: ShieldCheck, color: 'sage', subtitle: '出门在外，也让家井然有序' };
  return { icon: Sparkles, color: 'sage', subtitle: '让设备默契配合，一触即达' };
}
export function timeLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '尚未同步'
    : date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}
