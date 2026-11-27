// Nusantara Sky Courier — heads-up display.
// One file, one job: every instrument and readout drawn over the world.
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './config.js';
import { objectiveText } from './missions.js';

function headingDeg(heading) {
  const deg = ((heading * 180) / Math.PI) % 360;
  return Math.round((deg + 360) % 360);
}

function compassLabel(deg) {
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return points[Math.round(deg / 45) % 8];
}

function bar(ctx, x, y, w, h, fraction, color, label) {
  ctx.fillStyle = 'rgba(10,20,30,0.55)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, fraction)), h);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y - 6);
}

export function drawHud(ctx, state) {
  const { plane, missions, time } = state;
  const width = CANVAS_WIDTH;
  const height = CANVAS_HEIGHT;
  const altitudeFt = Math.round(plane.y * 30);
  const speedKt = Math.round(plane.speed * 1.8);
  const heading = headingDeg(plane.heading);

  ctx.textBaseline = 'alphabetic';

  // Top-left: altitude, speed, heading.
  // Panel is 104 tall so the three 26/26/20px lines sit on 32/32/28px steps
  // with no overlap (the old 86px panel stacked HDG onto SPD and the
  // 'ALT · SPD · HDG' caption onto HDG).
  ctx.fillStyle = 'rgba(10,20,30,0.55)';
  ctx.fillRect(16, 14, 300, 104);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`ALT ${altitudeFt} ft`, 28, 46);
  ctx.fillText(`SPD ${speedKt} kt`, 28, 78);
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`HDG ${String(heading).padStart(3, '0')}° ${compassLabel(heading)}`, 28, 106);

  // Top-centre: mission objective and message.
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(10,20,30,0.55)';
  const objective = objectiveText(missions);
  ctx.fillRect(width / 2 - 260, 14, 520, 34);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText(objective, width / 2, 37);
  if (missions.message && time < missions.messageUntil) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 19px sans-serif';
    ctx.fillText(missions.message, width / 2, 72);
  }

  // Top-right: fuel, damage, score, time.
  ctx.textAlign = 'left';
  bar(ctx, width - 236, 34, 200, 14, plane.fuel / 100, plane.fuel < 25 ? '#ef4444' : '#22c55e', 'FUEL');
  bar(ctx, width - 236, 66, 200, 14, 1 - plane.damage / 100, '#f97316', 'HULL');
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`SCORE ${missions.score}`, width - 236, 104);
  const elapsed = Math.max(0, Math.floor(time - missions.startedAt));
  const minutes = Math.floor(elapsed / 60);
  const seconds = String(elapsed % 60).padStart(2, '0');
  ctx.font = '15px sans-serif';
  ctx.fillText(`TIME ${minutes}:${seconds}`, width - 236, 126);

  // Bottom-left: artificial horizon.
  const hx = 78;
  const hy = height - 78;
  ctx.save();
  ctx.beginPath();
  ctx.arc(hx, hy, 52, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(hx - 52, hy - 52, 104, 52 + Math.sin(plane.pitch) * 30);
  ctx.fillStyle = '#92400e';
  ctx.fillRect(hx - 52, hy + Math.sin(plane.pitch) * 30, 104, 52);
  ctx.rotate(plane.roll);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(hx - 52, hy);
  ctx.lineTo(hx + 52, hy);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(hx, hy, 52, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ATTITUDE', hx, hy + 68);

  // Bottom-centre: throttle bar and gear/flaps.
  // Gear text sits below the bar: the old spot (height - 52) shared a
  // baseline with the bar's own 'THR' label (height - 50) and printed
  // on top of it.
  const throttleX = width / 2 - 110;
  bar(ctx, throttleX, height - 44, 220, 12, plane.throttle, '#38bdf8', 'THR');
  ctx.fillStyle = '#ffffff';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  const gearText = plane.gear ? 'GEAR DOWN' : 'GEAR UP';
  const flapText = plane.flaps ? ' · FLAPS' : '';
  ctx.fillText(`${gearText}${flapText} · G gear · F flaps · P pause`, width / 2, height - 18);

  // Centre: flight-path marker and pitch ladder.
  const cx = width / 2;
  const cy = height * 0.62;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, Math.PI * 2);
  ctx.moveTo(cx - 20, cy);
  ctx.lineTo(cx - 12, cy);
  ctx.moveTo(cx + 12, cy);
  ctx.lineTo(cx + 20, cy);
  ctx.moveTo(cx, cy - 20);
  ctx.lineTo(cx, cy - 12);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('+10°', cx + 90, cy - 44);
  ctx.fillText('-10°', cx + 90, cy + 48);

  // Warnings.
  ctx.textAlign = 'center';
  ctx.font = 'bold 22px sans-serif';
  if (plane.stalled && Math.floor(time * 2) % 2 === 0) {
    ctx.fillStyle = '#f87171';
    ctx.fillText('STALL — TURUNKAN HIDUNG, TAMBAH THROTTLE', width / 2, 130);
  } else if (plane.fuel < 25) {
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('LOW FUEL', width / 2, 130);
  }
}
