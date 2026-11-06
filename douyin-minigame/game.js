// 抖音小游戏入口文件
import Game from './js/game.js';

// 获取全局上下文
const canvas = tt.createCanvas();
const ctx = canvas.getContext('2d');

// 设置画布尺寸（适配屏幕）
const systemInfo = tt.getSystemInfoSync();
canvas.width = systemInfo.windowWidth;
canvas.height = systemInfo.windowHeight;

// 初始化游戏
const game = new Game(canvas, ctx, systemInfo);

// 触摸事件
canvas.addEventListener('touchstart', (e) => {
  const touch = e.touches[0];
  game.onTouchStart(touch.clientX, touch.clientY);
});

// 游戏主循环
function gameLoop() {
  game.update();
  game.render();
  requestAnimationFrame(gameLoop);
}

gameLoop();
