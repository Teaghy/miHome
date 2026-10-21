import { ChevronRight, Play, Sparkles } from 'lucide-react';
import { useMiHomeContext } from '@/app/MiHomeContext';
import { scenePresentation } from '@/utils/presentation';

export function QuickScenes() {
  const { settings, scenes, page, runScene, navigate } = useMiHomeContext();
  if (!settings.showScenes || (page !== 'home' && page !== 'devices')) return null;

  return (
    <section className="quick-section" aria-label="快捷场景">
      <div className="quick-heading">
        <span>
          <Sparkles size={16} />
          快捷场景
        </span>
        <button aria-label="查看全部场景" onClick={() => navigate('scenes')}>
          全部
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="quick-scenes">
        {scenes.slice(0, 4).map((scene) => {
          const { icon: Icon, color } = scenePresentation(scene);
          return (
            <button
              key={scene.id}
              className={`quick-scene ${color}`}
              onClick={() => runScene(scene)}
            >
              <span className="scene-icon">
                <Icon size={21} strokeWidth={1.7} />
              </span>
              <span className="scene-copy">
                <strong>{scene.name}</strong>
                <small>{scenePresentation(scene).subtitle}</small>
              </span>
              <Play size={13} className="scene-play" />
            </button>
          );
        })}
        {!scenes.length && (
          <p className="mini-empty">在米家 App 中创建手动场景，同步后即可使用。</p>
        )}
      </div>
    </section>
  );
}
