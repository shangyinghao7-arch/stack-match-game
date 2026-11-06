// 堆叠消消乐 - 游戏主逻辑
const EMOJIS = ['🐱','🐶','🐰','🦊','🐻','🐼','🐨','🦁','🐯','🐮','🐷','🐸'];
const SLOT_SIZE = 7;

class Game {
  constructor(canvas, ctx, systemInfo) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.dpr = systemInfo.pixelRatio || 1;

    // 游戏状态
    this.level = 1;
    this.cards = [];
    this.slots = [];
    this.history = [];
    this.tools = { undo: 3, shuffle: 3, hint: 3 };
    this.gameOver = false;
    this.win = false;
    this.showResult = false;

    // 布局计算
    this.cardW = 50;
    this.cardH = 60;
    this.slotY = this.height - 180;
    this.areaTop = 80;
    this.areaBottom = this.slotY - 30;

    this.initLevel();
  }

  initLevel() {
    this.cards = [];
    this.slots = [];
    this.history = [];
    this.gameOver = false;
    this.win = false;
    this.showResult = false;
    this.tools = { undo: 3, shuffle: 3, hint: 3 };

    const configs = [
      { types: 3, total: 18, layers: 2 },
      { types: 4, total: 27, layers: 3 },
      { types: 5, total: 36, layers: 3 },
      { types: 6, total: 45, layers: 4 },
      { types: 7, total: 54, layers: 4 },
    ];
    const cfg = configs[Math.min(this.level - 1, configs.length - 1)];

    const usedEmojis = EMOJIS.slice(0, cfg.types);
    let pool = [];
    const perType = cfg.total / cfg.types;
    for (const e of usedEmojis) {
      for (let i = 0; i < perType; i++) pool.push(e);
    }
    pool = pool.sort(() => Math.random() - 0.5);

    const areaW = this.width - 40;
    const areaH = this.areaBottom - this.areaTop;
    const startX = 20;

    let idx = 0;
    for (let layer = 0; layer < cfg.layers; layer++) {
      const count = Math.ceil(cfg.total / cfg.layers) + (layer === 0 ? 2 : 0);
      const offsetX = layer * 12;
      const offsetY = layer * 15;

      for (let i = 0; i < count && idx < pool.length; i++) {
        const maxX = areaW - this.cardW - offsetX;
        const maxY = areaH - this.cardH - offsetY;
        const x = startX + offsetX + Math.random() * Math.max(maxX - offsetX, 10);
        const y = this.areaTop + offsetY + Math.random() * Math.max(maxY - offsetY, 10);

        this.cards.push({
          id: idx,
          emoji: pool[idx],
          x: x,
          y: y,
          layer: layer,
          removed: false
        });
        idx++;
      }
    }
  }

  isCardBlocked(card) {
    const activeCards = this.cards.filter(c => !c.removed);
    for (const other of activeCards) {
      if (other.id === card.id) continue;
      if (other.layer <= card.layer) continue;

      const overlap = !(
        card.x + this.cardW <= other.x + 8 ||
        other.x + this.cardW <= card.x ||
        card.y + this.cardH <= other.y + 8 ||
        other.y + this.cardH <= card.y
      );
      if (overlap) return true;
    }
    return false;
  }

  onTouchStart(x, y) {
    if (this.showResult) {
      if (this.win) this.level++;
      this.initLevel();
      return;
    }
    if (this.gameOver) return;

    const sorted = [...this.cards].sort((a, b) => b.layer - a.layer);
    for (const card of sorted) {
      if (card.removed) continue;
      if (this.isCardBlocked(card)) continue;

      if (x >= card.x && x <= card.x + this.cardW &&
          y >= card.y && y <= card.y + this.cardH) {
        this.onCardClick(card);
        return;
      }
    }
  }

  onCardClick(card) {
    if (this.slots.length >= SLOT_SIZE) return;

    this.history.push({
      cardId: card.id,
      slotIndex: this.slots.length,
      emoji: card.emoji
    });

    this.slots.push(card.emoji);
    card.removed = true;

    if (tt.vibrateShort) tt.vibrateShort({ type: 'light' });

    setTimeout(() => this.checkMatch(), 200);
  }

  checkMatch() {
    const count = {};
    this.slots.forEach((e, i) => {
      if (!count[e]) count[e] = [];
      count[e].push(i);
    });

    let matchedEmoji = null;
    for (const e in count) {
      if (count[e].length >= 3) {
        matchedEmoji = e;
        break;
      }
    }

    if (matchedEmoji) {
      const indices = count[matchedEmoji].slice(0, 3);
      indices.sort((a, b) => b - a).forEach(i => {
        this.slots.splice(i, 1);
      });

      setTimeout(() => this.checkWin(), 200);
    } else {
      this.checkLose();
    }
  }

  checkWin() {
    const remaining = this.cards.filter(c => !c.removed).length;
    if (remaining === 0 && this.slots.length === 0) {
      this.gameOver = true;
      this.win = true;
      this.showResult = true;
    }
  }

  checkLose() {
    if (this.slots.length >= SLOT_SIZE) {
      this.gameOver = true;
      this.win = false;
      this.showResult = true;
    }
  }

  update() {
  }

  render() {
    const ctx = this.ctx;

    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`第 ${this.level} 关`, 20, 40);

    const remaining = this.cards.filter(c => !c.removed).length;
    ctx.textAlign = 'right';
    ctx.font = '14px sans-serif';
    ctx.fillText(`剩余: ${remaining}`, this.width - 20, 40);

    const total = this.cards.length;
    const removed = total - remaining;
    const pct = total > 0 ? removed / total : 0;
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(20, 55, this.width - 40, 6);
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(20, 55, (this.width - 40) * pct, 6);

    this.cards.forEach(card => {
      if (card.removed) return;

      const blocked = this.isCardBlocked(card);

      ctx.fillStyle = blocked ? 'rgba(255,255,255,0.4)' : '#ffffff';
      ctx.beginPath();
      ctx.roundRect(card.x, card.y, this.cardW, this.cardH, 8);
      ctx.fill();

      ctx.strokeStyle = blocked ? '#999' : '#ddd';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = '26px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = blocked ? 0.5 : 1;
      ctx.fillText(card.emoji, card.x + this.cardW / 2, card.y + this.cardH / 2);
      ctx.globalAlpha = 1;
    });

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.roundRect(15, this.slotY - 10, this.width - 30, 90, 16);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('卡槽（凑齐3个相同自动消除）', this.width / 2, this.slotY + 5);

    const slotW = 44;
    const slotGap = 5;
    const totalSlotW = SLOT_SIZE * slotW + (SLOT_SIZE - 1) * slotGap;
    const startSlotX = (this.width - totalSlotW) / 2;

    for (let i = 0; i < SLOT_SIZE; i++) {
      const sx = startSlotX + i * (slotW + slotGap);
      const sy = this.slotY + 15;

      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.roundRect(sx, sy, slotW, slotW + 8, 8);
      ctx.stroke();
      ctx.setLineDash([]);

      if (i < this.slots.length) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.roundRect(sx, sy, slotW, slotW + 8, 8);
        ctx.fill();

        ctx.font = '22px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.slots[i], sx + slotW / 2, sy + (slotW + 8) / 2);
      }
    }

    if (this.showResult) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, this.width, this.height);

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.roundRect(this.width / 2 - 120, this.height / 2 - 80, 240, 160, 20);
      ctx.fill();

      ctx.fillStyle = this.win ? '#22c55e' : '#ef4444';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        this.win ? '🎉 通关！' : '😢 挑战失败',
        this.width / 2,
        this.height / 2 - 30
      );

      ctx.fillStyle = '#666';
      ctx.font = '14px sans-serif';
      ctx.fillText(
        this.win ? `通过第 ${this.level} 关` : '卡槽已满，再试一次',
        this.width / 2,
        this.height / 2 + 10
      );

      ctx.fillStyle = '#667eea';
      ctx.font = '16px sans-serif';
      ctx.fillText('点击屏幕继续', this.width / 2, this.height / 2 + 50);
    }
  }
}

export default Game;
