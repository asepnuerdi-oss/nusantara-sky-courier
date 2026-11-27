// Nusantara Sky Courier — keyboard and mouse input.
// One file, one job: turn keys and pointer movement into flight controls.
export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const pointer = { x: 0, y: 0, down: false, active: false, movedAt: 0 };

  function onKeyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    if (!event.repeat) pressed.add(event.key.toLowerCase());
    keys.add(event.key.toLowerCase());
  }
  function onKeyUp(event) {
    keys.delete(event.key.toLowerCase());
  }
  function onPointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left - rect.width / 2;
    pointer.y = event.clientY - rect.top - rect.height / 2;
    pointer.active = true;
    pointer.movedAt = performance.now();
  }
  function onPointerDown(event) {
    pointer.down = true;
    onPointerMove(event);
  }
  function onPointerUp() {
    pointer.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);

  // True once for the key pressed since the last call to takePressed.
  function takePressed(key) {
    if (pressed.has(key)) {
      pressed.delete(key);
      return true;
    }
    return false;
  }

  function has(key) {
    return keys.has(key);
  }

  // The control vector for this frame. Keyboard wins over the mouse stick.
  function controls() {
    let pitch = 0;
    let roll = 0;
    if (has('arrowup') || has('w')) pitch += 1;
    if (has('arrowdown') || has('s')) pitch -= 1;
    if (has('arrowleft') || has('a')) roll -= 1;
    if (has('arrowright') || has('d')) roll += 1;
    const keyboardSteering = pitch !== 0 || roll !== 0;
    if (!keyboardSteering && pointer.active && performance.now() - pointer.movedAt < 4000) {
      roll = Math.max(-1, Math.min(1, pointer.x / 260));
      pitch = Math.max(-1, Math.min(1, -pointer.y / 220));
    }
    let throttleDelta = 0;
    if (has('shift')) throttleDelta += 0.6;
    if (has('control')) throttleDelta -= 0.6;
    if (has('w') && !has('arrowup')) throttleDelta += 0.25;
    if (pointer.down) throttleDelta += 0.5;
    return {
      pitch, roll, throttleDelta,
      brake: has(' ') || has('b'),
      start: takePressed('enter'),
      restart: takePressed('r'),
      pause: takePressed('p'),
      mute: takePressed('m'),
      gear: takePressed('g'),
      flaps: takePressed('f'),
    };
  }

  return { controls, takePressed, has };
}
