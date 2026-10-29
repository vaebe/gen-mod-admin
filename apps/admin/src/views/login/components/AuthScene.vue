<template>
  <aside class="auth-scene" aria-label="GenMod 官方内容管理平台">
    <div class="auth-brand">
      <img src="/gen-mod-icon.png" alt="" width="42" height="42" />
      <div>
        <p class="auth-brand-name">GenMod <span>Admin</span></p>
        <p class="auth-brand-caption">官方内容管理</p>
      </div>
    </div>

    <div class="auth-intro">
      <h2>把好内容，<br />交给更多创作者。</h2>
      <p>维护游戏目录，整理官方 Skill，让每次版本更新都有序完成。</p>
    </div>

    <div class="content-archive" aria-hidden="true">
      <div class="archive-guide" />
      <div class="archive-sheet archive-sheet-back">
        <span class="archive-tab">游戏目录</span>
        <i /><i /><i />
      </div>
      <div class="archive-sheet archive-sheet-middle">
        <span class="archive-tab">Skill 资源</span>
        <i /><i /><i />
      </div>
      <div class="archive-sheet archive-sheet-front">
        <span class="archive-tab">版本发布</span>
        <div class="archive-document">
          <span class="archive-document-mark" />
          <div><i /><i /><i /></div>
        </div>
        <div class="archive-document">
          <span class="archive-document-mark archive-document-mark-muted" />
          <div><i /><i /></div>
        </div>
        <span class="archive-document-line" />
      </div>
      <img
        class="archive-brand"
        src="/gen-mod-icon.png"
        alt=""
        width="112"
        height="112"
        draggable="false"
      />
    </div>
  </aside>
</template>

<style scoped>
.auth-scene {
  --scene-ink: oklch(0.31 0.025 170);
  --scene-green: oklch(0.56 0.07 170);
  --scene-soft: oklch(0.93 0.025 167);
  position: relative;
  min-width: 0;
  padding-block: 16px;
}
.auth-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.auth-brand img {
  flex-shrink: 0;
}
.auth-brand-name {
  color: var(--scene-ink);
  font-size: 23px;
  font-weight: 650;
  letter-spacing: -0.03em;
  line-height: 1.25;
}
.auth-brand-name span {
  margin-left: 3px;
  color: var(--muted-foreground);
  font-size: 16px;
  font-weight: 400;
  letter-spacing: 0;
}
.auth-brand-caption {
  margin-top: 4px;
  color: var(--muted-foreground);
  font-size: 11px;
}
.auth-intro {
  margin-top: clamp(40px, 7vh, 72px);
}
.auth-intro h2 {
  color: var(--scene-ink);
  font-size: clamp(31px, 3.3vw, 43px);
  font-weight: 650;
  letter-spacing: -0.025em;
  line-height: 1.5;
  text-wrap: balance;
}
.auth-intro > p {
  max-width: 28em;
  margin-top: 18px;
  color: var(--muted-foreground);
  font-size: 13px;
  line-height: 1.9;
}
.content-archive {
  position: relative;
  width: min(100%, 425px);
  height: 258px;
  margin-top: 34px;
  animation: archive-arrive 600ms cubic-bezier(0.22, 1, 0.36, 1);
}
.archive-guide {
  position: absolute;
  inset: -6px -20px -22px -28px;
  background-image: radial-gradient(
    color-mix(in oklch, var(--scene-green) 20%, transparent) 1px,
    transparent 1px
  );
  background-size: 18px 18px;
  mask-image: radial-gradient(ellipse, black, transparent 70%);
}
.archive-sheet {
  position: absolute;
  width: 200px;
  height: 190px;
  border: 1px solid color-mix(in oklch, var(--scene-green) 20%, var(--border));
  border-radius: 12px;
  padding: 19px;
  background: var(--card);
  box-shadow: 0 12px 28px -20px color-mix(in oklch, var(--scene-ink) 30%, transparent);
}
.archive-sheet-back {
  left: 23px;
  top: 19px;
  transform: rotate(-12deg);
  background: color-mix(in oklch, var(--scene-soft) 65%, var(--card));
}
.archive-sheet-middle {
  left: 89px;
  top: 33px;
  transform: rotate(-3deg);
  background: color-mix(in oklch, var(--scene-soft) 35%, var(--card));
}
.archive-sheet-front {
  left: 153px;
  top: 54px;
  transform: rotate(8deg);
}
.archive-tab {
  display: block;
  margin-bottom: 25px;
  color: var(--scene-green);
  font-size: 11px;
}
.archive-sheet > i,
.archive-document i {
  display: block;
  width: 80%;
  height: 5px;
  margin-top: 9px;
  border-radius: 3px;
  background: color-mix(in oklch, var(--scene-green) 12%, var(--card));
}
.archive-sheet > i:last-child,
.archive-document i:last-child {
  width: 52%;
}
.archive-document {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 17px;
}
.archive-document > div {
  flex: 1;
}
.archive-document i {
  margin-top: 0;
  margin-bottom: 6px;
}
.archive-document-mark {
  display: block;
  width: 25px;
  height: 31px;
  flex-shrink: 0;
  border: 1px solid color-mix(in oklch, var(--scene-green) 22%, var(--card));
  border-radius: 4px;
  background: var(--scene-soft);
}
.archive-document-mark-muted {
  background: var(--muted);
  border-color: var(--border);
}
.archive-document-line {
  display: block;
  width: 100%;
  height: 1px;
  margin-top: 5px;
  background: var(--border);
}
.archive-brand {
  position: absolute;
  left: 36px;
  bottom: 0;
  transform: rotate(-9deg);
  filter: drop-shadow(3px 10px 10px oklch(0.25 0.02 170 / 0.12));
}
@keyframes archive-arrive {
  from {
    transform: translateY(12px);
  }
  to {
    transform: translateY(0);
  }
}
@media (max-width: 900px) {
  .auth-scene {
    display: flex;
    justify-content: center;
    padding: 0;
  }
  .auth-intro,
  .content-archive {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .content-archive {
    animation: none;
  }
}
</style>
