import { useMiHomeContext } from '@/app/MiHomeContext';
import { ArrowUpRight, CircleHelp, Layers3, Play, RefreshCw } from 'lucide-react';
import { scenePresentation } from '@/utils/presentation';
export function ScenesPage() {
  const { visibleScenes, refreshing, refresh, runScene, query, setSearch } = useMiHomeContext();
  return (
    <section className="scenes-section">
      <div className="section-heading">
        <div>
          <h2>
            我的智能场景<span>{visibleScenes.length}</span>
          </h2>
          <span className="muted-note">场景来自你的米家家庭，执行前需要确认</span>
        </div>
        <button
          className="button secondary small"
          disabled={refreshing}
          onClick={() => void refresh()}
        >
          <RefreshCw size={15} />
          同步场景
        </button>
      </div>
      <div className="scene-grid">
        {visibleScenes.map((scene) => {
          const { icon: Icon, color, subtitle } = scenePresentation(scene);
          return (
            <article className={`scene-card ${color}`} key={scene.id}>
              <span className="large-scene-icon">
                <Icon size={29} strokeWidth={1.4} />
              </span>
              <span className="scene-home">{scene.homeName}</span>
              <h3>{scene.name}</h3>
              <p>{subtitle}</p>
              <button className="button scene-run-button" onClick={() => runScene(scene)}>
                <Play size={14} fill="currentColor" />
                运行场景
                <ArrowUpRight size={15} />
              </button>
            </article>
          );
        })}
      </div>
      {!visibleScenes.length && (
        <div className="empty-state">
          <Layers3 size={36} strokeWidth={1.3} />
          <h3>{query ? '没有找到这个场景' : '让生活多一点默契'}</h3>
          <p>{query ? '请尝试其他关键词。' : '在米家 App 中创建手动场景，再回到这里同步。'}</p>
          {query && (
            <button className="button secondary" onClick={() => setSearch('')}>
              清除搜索
            </button>
          )}
        </div>
      )}
      <div className="scene-info">
        <CircleHelp size={17} />
        <div>
          <strong>关于智能场景</strong>
          <p>
            这里只显示当前家庭可手动运行的场景。场景的创建、编辑与自动化条件请在米家 App 中管理。
          </p>
        </div>
      </div>
    </section>
  );
}
