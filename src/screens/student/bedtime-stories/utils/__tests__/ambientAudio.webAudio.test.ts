// Unit tests for the Web Audio API side of ambientAudio.ts — playPageFlip,
// silenceAllAmbient, createAmbient (and, through it, the internal
// createAmbientMusic synth and createAmbientTrack/rampVolume helpers).
//
// Real AudioContext/AudioNode/HTMLAudioElement don't exist in Jest's
// environment, so this file provides minimal mock implementations and
// verifies the module creates, connects, and controls them correctly —
// not that any actual sound is produced. Scheduled work (setTimeout-driven
// instrument loops) is exercised via a numeric-id timer shim (see below).

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  __esModule: true,
  default: { OS: 'web', select: (obj: any) => obj.web ?? obj.default ?? obj.ios },
  OS: 'web',
  select: (obj: any) => obj.web ?? obj.default ?? obj.ios,
}));

class MockAudioParam {
  value: number;
  constructor(initial = 0) { this.value = initial; }
  setValueAtTime(v: number) { this.value = v; return this; }
  linearRampToValueAtTime(v: number) { this.value = v; return this; }
  exponentialRampToValueAtTime(v: number) { this.value = v; return this; }
  cancelScheduledValues() { return this; }
}
class MockAudioNode {
  connections: any[] = [];
  connect(dest: any) { this.connections.push(dest); return dest; }
}
class MockGainNode extends MockAudioNode { gain = new MockAudioParam(1); }
class MockOscillatorNode extends MockAudioNode {
  frequency = new MockAudioParam(440);
  type = 'sine';
  started = false; stopped = false;
  start() { this.started = true; }
  stop() { this.stopped = true; }
}
class MockBiquadFilterNode extends MockAudioNode {
  frequency = new MockAudioParam(350); Q = new MockAudioParam(1); gain = new MockAudioParam(0); type = 'lowpass';
}
class MockBufferSourceNode extends MockAudioNode {
  buffer: any = null; started = false; stopped = false;
  start() { this.started = true; }
  stop() { this.stopped = true; }
}
class MockConvolverNode extends MockAudioNode { buffer: any = null; }
class MockAudioBuffer {
  data: Float32Array[];
  constructor(public numberOfChannels: number, public length: number, public sampleRate: number) {
    this.data = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }
  getChannelData(ch: number) { return this.data[ch]; }
}
class MockAudioContext {
  static instances: MockAudioContext[] = [];
  currentTime = 0; sampleRate = 44100; state: 'running' | 'suspended' | 'closed' = 'running';
  destination = {};
  oscillators: MockOscillatorNode[] = []; gains: MockGainNode[] = []; filters: MockBiquadFilterNode[] = [];
  bufferSources: MockBufferSourceNode[] = []; convolvers: MockConvolverNode[] = [];
  constructor() { MockAudioContext.instances.push(this); }
  createGain() { const n = new MockGainNode(); this.gains.push(n); return n; }
  createOscillator() { const n = new MockOscillatorNode(); this.oscillators.push(n); return n; }
  createBiquadFilter() { const n = new MockBiquadFilterNode(); this.filters.push(n); return n; }
  createBufferSource() { const n = new MockBufferSourceNode(); this.bufferSources.push(n); return n; }
  createConvolver() { const n = new MockConvolverNode(); this.convolvers.push(n); return n; }
  createBuffer(channels: number, len: number, rate: number) { return new MockAudioBuffer(channels, len, rate); }
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
}
class MockAudioElement {
  static instances: MockAudioElement[] = [];
  src: string; volume = 1; loop = false; currentTime = 0;
  listeners: Record<string, () => void> = {};
  playCalls = 0; pauseCalls = 0;
  constructor(src?: string) { this.src = src ?? ''; MockAudioElement.instances.push(this); }
  play() { this.playCalls++; return Promise.resolve(); }
  pause() { this.pauseCalls++; }
  addEventListener(evt: string, cb: () => void) { this.listeners[evt] = cb; }
}

// Real browsers give setTimeout/clearInterval NUMERIC ids — ambientAudio.ts's
// stop()/pause() cancellation logic (`typeof n === 'number'`) depends on that.
// Jest's built-in fake timers return Node Timeout OBJECTS instead, which
// would make every cancellation silently no-op and give a false read on
// this module's real (browser) behavior — so this file rolls its own
// numeric-id timer queue rather than using jest.useFakeTimers().
let timers: { id: number; time: number; cb: () => void }[] = [];
let intervals: { id: number; every: number; next: number; cb: () => void }[] = [];
let now = 0;
let nextId = 1;

function mockSetTimeout(cb: () => void, ms = 0) {
  const id = nextId++;
  timers.push({ id, time: now + ms, cb });
  return id as any;
}
function mockClearTimeout(id: number) {
  timers = timers.filter(t => t.id !== id);
}
function mockSetInterval(cb: () => void, ms = 0) {
  const id = nextId++;
  intervals.push({ id, every: ms, next: now + ms, cb });
  return id as any;
}
function mockClearInterval(id: number) {
  intervals = intervals.filter(t => t.id !== id);
}
function advance(ms: number) {
  const target = now + ms;
  while (true) {
    const nextTimer = timers.filter(t => t.time <= target).sort((a, b) => a.time - b.time)[0];
    const nextIntervalTick = intervals.filter(t => t.next <= target).sort((a, b) => a.next - b.next)[0];
    const nextEvent = [nextTimer, nextIntervalTick].filter(Boolean).sort((a: any, b: any) =>
      (a.time ?? a.next) - (b.time ?? b.next))[0] as any;
    if (!nextEvent) break;
    now = nextEvent.time ?? nextEvent.next;
    if (nextEvent.every != null) { nextEvent.next += nextEvent.every; nextEvent.cb(); }
    else { timers = timers.filter(t => t !== nextEvent); nextEvent.cb(); }
  }
  now = target;
}

let ambientAudio: typeof import('../ambientAudio');

beforeEach(() => {
  jest.resetModules();
  timers = []; intervals = []; now = 0; nextId = 1;
  (global as any).setTimeout = mockSetTimeout;
  (global as any).clearTimeout = mockClearTimeout;
  (global as any).setInterval = mockSetInterval;
  (global as any).clearInterval = mockClearInterval;
  MockAudioContext.instances = [];
  MockAudioElement.instances = [];
  (global as any).AudioContext = MockAudioContext;
  (global as any).webkitAudioContext = MockAudioContext;
  (global as any).Audio = MockAudioElement;
  ambientAudio = require('../ambientAudio');
});

describe('playPageFlip', () => {
  test('creates one <audio> element pointed at the page-flip sound, sets volume, and plays it', () => {
    ambientAudio.playPageFlip();
    expect(MockAudioElement.instances).toHaveLength(1);
    const el = MockAudioElement.instances[0];
    expect(el.src).toContain('/sounds/page-flip.mp3');
    expect(el.volume).toBeCloseTo(0.6);
    expect(el.playCalls).toBe(1);
  });

  test('a second call reuses the cached instance instead of creating a new one', () => {
    ambientAudio.playPageFlip();
    ambientAudio.playPageFlip();
    expect(MockAudioElement.instances).toHaveLength(1);
    expect(MockAudioElement.instances[0].playCalls).toBe(2);
  });
});

describe('createAmbient — real mood-track path (e.g. ambarisha -> devotional.mp3)', () => {
  test('constructs an <audio> element for the mapped track, loops it, and ramps volume up from 0', () => {
    ambientAudio.createAmbient('ambarisha', null);
    expect(MockAudioElement.instances).toHaveLength(1);
    const track = MockAudioElement.instances[0];
    expect(track.src).toContain('/sounds/music/devotional.mp3');
    expect(track.loop).toBe(true);
    expect(track.volume).toBe(0); // starts silent, ramps in via setInterval
    expect(track.playCalls).toBe(1);

    advance(2000); // rampVolume's full 2000ms fade-in
    expect(track.volume).toBeCloseTo(0.28, 1);
  });

  test('pause()/resume()/stop() on a track-backed ambient delegate straight to the <audio> element', () => {
    const ambient = ambientAudio.createAmbient('ambarisha', null);
    const track = MockAudioElement.instances[0];

    ambient!.pause();
    expect(track.pauseCalls).toBe(1);

    ambient!.resume();
    expect(track.playCalls).toBe(2); // initial play + resume's play

    ambient!.stop();
    expect(track.pauseCalls).toBe(2);
    expect(track.src).toBe('');
  });

  test("a track load error falls back to the synth seamlessly (no crash, AudioContext gets created)", () => {
    ambientAudio.createAmbient('ambarisha', null);
    const track = MockAudioElement.instances[0];
    expect(MockAudioContext.instances).toHaveLength(0);

    track.listeners['error']();

    expect(MockAudioContext.instances).toHaveLength(1); // synth kicked in
  });
});

describe('createAmbient — synth fallback (storyId with no mapped mood track)', () => {
  test('creates an AudioContext, a master gain wired to destination, and a reverb convolver', () => {
    ambientAudio.createAmbient('unmapped-story-id', null);
    expect(MockAudioContext.instances).toHaveLength(1);
    const ctx = MockAudioContext.instances[0];

    expect(ctx.gains.length).toBeGreaterThanOrEqual(1);
    const master = ctx.gains[0];
    expect(master.connections).toContain(ctx.destination);
    expect(ctx.convolvers).toHaveLength(1);
    expect(ctx.convolvers[0].connections).toContain(master);
  });

  test('always creates the Sa drone (root + octave oscillators), started immediately', () => {
    ambientAudio.createAmbient('unmapped-story-id', null);
    const ctx = MockAudioContext.instances[0];
    // Drone oscillators are created synchronously (not via setTimeout), unlike
    // the per-style instrument loops, so they exist before any timer advance.
    const droneOscillators = ctx.oscillators.filter(o => o.started);
    expect(droneOscillators.length).toBeGreaterThanOrEqual(2);
  });

  test('the master gain fades in from 0 toward a non-zero target over ~3 seconds', () => {
    ambientAudio.createAmbient('unmapped-story-id', null);
    const ctx = MockAudioContext.instances[0];
    const master = ctx.gains[0];
    expect(master.gain.value).toBeGreaterThan(0); // linearRampToValueAtTime already applied the target synchronously in the mock
  });

  test.each([
    ['tense keywords -> tabla style', { text: 'A fierce demon roared in the dark.' }],
    ['triumphant keywords -> tanpura style', { text: 'They found the golden treasure and celebrated.' }],
    ['water keywords -> flute style', { text: 'They swam across the wide river.' }],
    ['mysterious keywords -> veena style', { text: 'It was a strange and secret riddle.' }],
  ])('%s: the scheduled instrument loop creates real audio nodes once its timer fires', (_label, page) => {
    ambientAudio.createAmbient('unmapped-story-id', page as any);
    const ctx = MockAudioContext.instances[0];
    const oscillatorsBefore = ctx.oscillators.length;

    advance(8000); // covers every style's first scheduled tick/pluck/phrase/arpeggio

    expect(ctx.oscillators.length).toBeGreaterThan(oscillatorsBefore);
  });

  test('pause() ramps the gain down and suspends the AudioContext after the fade completes', () => {
    const ambient = ambientAudio.createAmbient('unmapped-story-id', null);
    const ctx = MockAudioContext.instances[0];

    ambient!.pause();
    expect(ctx.state).toBe('running'); // not yet — suspend is scheduled 280ms later
    advance(280);
    expect(ctx.state).toBe('suspended');
  });

  test('resume() un-suspends the context and ramps the gain back up', () => {
    const ambient = ambientAudio.createAmbient('unmapped-story-id', null);
    const ctx = MockAudioContext.instances[0];
    ambient!.pause();
    advance(280);
    expect(ctx.state).toBe('suspended');

    ambient!.resume();
    expect(ctx.state).toBe('running');
  });

  test('stop() clears every scheduled timer and closes the context after the fade-out', () => {
    const ambient = ambientAudio.createAmbient('unmapped-story-id', null);
    const ctx = MockAudioContext.instances[0];

    ambient!.stop();
    advance(1600);
    expect(ctx.state).toBe('closed');

    // Nothing further gets scheduled once stopped — advancing more time creates no new oscillators.
    const countAfterStop = ctx.oscillators.length;
    advance(10000);
    expect(ctx.oscillators.length).toBe(countAfterStop);
  });
});

describe('silenceAllAmbient', () => {
  test('pauses every registered ambient <audio> track, regardless of which ambient instance created it', () => {
    ambientAudio.createAmbient('ambarisha', null); // track-backed
    const track = MockAudioElement.instances.find(a => a.src.includes('devotional'))!;

    ambientAudio.silenceAllAmbient();

    expect(track.pauseCalls).toBeGreaterThanOrEqual(1);
  });

  test('suspends every registered running AudioContext, regardless of which ambient instance created it', () => {
    ambientAudio.createAmbient('unmapped-story-id', null); // synth-backed
    const ctx = MockAudioContext.instances[0];
    expect(ctx.state).toBe('running');

    ambientAudio.silenceAllAmbient();

    expect(ctx.state).toBe('suspended');
  });
});
