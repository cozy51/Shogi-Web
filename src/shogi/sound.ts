// Web Audio API を用いた駒音（パチッという木と木がぶつかる音）の合成
class SoundManager {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  // タイトル画面用アンビエントBGMの再生状態
  private musicActive: boolean = false;
  private musicTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private musicMasterGain: GainNode | null = null;
  private musicDroneOsc: OscillatorNode | null = null;
  private musicLfoOsc: OscillatorNode | null = null;
  private musicLoopCount: number = 0;
  private unlockAttached: boolean = false;

  // 陰旋法（都節音階）: A3を基点にした静謐な和の音階
  private readonly musicScale = [
    220.0, 233.08, 293.66, 329.63, 349.23, 440.0, 466.16, 587.33, 659.25, 698.46,
  ];

  // ゆったりとした一巡の旋律（null は休符）
  private readonly musicPhrase: Array<{ i: number | null; dur: number; vel: number }> = [
    { i: 5, dur: 1.1, vel: 0.2 },
    { i: 4, dur: 0.55, vel: 0.14 },
    { i: 2, dur: 1.1, vel: 0.18 },
    { i: null, dur: 0.55, vel: 0 },
    { i: 6, dur: 0.8, vel: 0.18 },
    { i: 5, dur: 0.55, vel: 0.14 },
    { i: 3, dur: 1.3, vel: 0.2 },
    { i: null, dur: 0.7, vel: 0 },
    { i: 7, dur: 1.0, vel: 0.16 },
    { i: 6, dur: 0.5, vel: 0.12 },
    { i: 4, dur: 1.6, vel: 0.18 },
    { i: null, dur: 0.9, vel: 0 },
    { i: 1, dur: 1.2, vel: 0.16 },
    { i: 0, dur: 2.2, vel: 0.22 },
  ];

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
      this.attachUnlockListener();
    }
  }

  // 自動再生制限で音が出ない環境向けに、初回のユーザー操作でcontextを解錠する
  private attachUnlockListener() {
    if (this.unlockAttached || typeof document === 'undefined') return;
    this.unlockAttached = true;
    const resume = () => {
      this.ctx?.resume();
    };
    document.addEventListener('pointerdown', resume, { once: true });
    document.addEventListener('keydown', resume, { once: true });
  }

  // 駒を指したときの音
  public playMoveSound() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // 1. 打撃の短いノイズ（木の硬い接触音）
      const bufferSize = this.ctx.sampleRate * 0.04;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.008));
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.Q.setValueAtTime(3.0, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.7, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      noiseSource.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      noiseSource.start(now);

      // 2. 盤の共鳴音（やや低いポンという余韻）
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.07);

      oscGain.gain.setValueAtTime(0.35, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // AudioContext未許可等の例外は無視
    }
  }

  // 王手時の警戒音
  public playCheckSound() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.setValueAtTime(880, now + 0.08);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }

  // 勝利時の和風祝賀ファンファーレ（華やかな上昇和音と響き）
  public playVictorySound() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // 祝賀アルペジオ（D5 -> G5 -> B5 -> D6）と余韻和音
      const notes = [
        { freq: 587.33, time: 0.00, dur: 0.18, vol: 0.22 }, // D5
        { freq: 783.99, time: 0.12, dur: 0.20, vol: 0.24 }, // G5
        { freq: 987.77, time: 0.24, dur: 0.22, vol: 0.26 }, // B5
        { freq: 1174.66, time: 0.36, dur: 0.65, vol: 0.30 }, // D6
        { freq: 783.99, time: 0.36, dur: 0.65, vol: 0.20 }, // G5 (和音)
      ];

      notes.forEach(({ freq, time, dur, vol }) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(vol, now + time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    } catch {}
  }

  // 敗北時の静かな終局音
  public playDefeatSound() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const notes = [
        { freq: 392.00, time: 0.00, dur: 0.25 }, // G4
        { freq: 329.63, time: 0.15, dur: 0.40 }, // E4
      ];

      notes.forEach(({ freq, time, dur }) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);

        gain.gain.setValueAtTime(0.18, now + time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    } catch {}
  }

  // タイトル画面用の和鐘・おりんの静謐な残響音（シブい寺院の鐘・水琴窟の響き）
  public playTitleSound() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // 和鐘の倍音構成（基音と複数の非整数倍音）
      const bellPartials = [
        { freq: 216, gain: 0.30, decay: 3.2 }, // 基音（低く厳かな響き）
        { freq: 582, gain: 0.22, decay: 2.8 }, // 第1倍音
        { freq: 844, gain: 0.18, decay: 2.2 }, // 第2倍音
        { freq: 1265, gain: 0.12, decay: 1.6 }, // 第3倍音（金属的なきらめき）
        { freq: 1724, gain: 0.08, decay: 1.1 }, // 高域（澄んだおりんの鈴音）
      ];

      bellPartials.forEach((partial) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // わずかなピッチ揺らぎを与えて自然な金属共鳴を表現
        osc.type = 'sine';
        osc.frequency.setValueAtTime(partial.freq, now);
        osc.frequency.linearRampToValueAtTime(partial.freq * 0.998, now + partial.decay);

        gain.gain.setValueAtTime(partial.gain, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + partial.decay);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + partial.decay);
      });
    } catch {}
  }

  // タイトル画面用アンビエントBGMの開始（箏の旋律＋低いドローンが途切れず流れ続ける）
  public startTitleMusic() {
    if (!this.enabled || this.musicActive) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const ctx = this.ctx;
      this.musicActive = true;

      const master = ctx.createGain();
      master.gain.setValueAtTime(0, ctx.currentTime);
      master.gain.linearRampToValueAtTime(1, ctx.currentTime + 2.2);
      master.connect(ctx.destination);
      this.musicMasterGain = master;

      // 常時流れる低いドローン（余韻の下支え）
      const drone = ctx.createOscillator();
      const droneGain = ctx.createGain();
      drone.type = 'sine';
      drone.frequency.setValueAtTime(110, ctx.currentTime); // A2
      droneGain.gain.setValueAtTime(0.05, ctx.currentTime);
      drone.connect(droneGain);
      droneGain.connect(master);
      drone.start();
      this.musicDroneOsc = drone;

      // ドローンにゆったりとした呼吸（LFO）を加える
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.07, ctx.currentTime);
      lfoGain.gain.setValueAtTime(0.03, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(droneGain.gain);
      lfo.start();
      this.musicLfoOsc = lfo;

      this.musicLoopCount = 0;
      this.scheduleMusicPhrase();
    } catch {
      this.musicActive = false;
    }
  }

  // タイトルBGMの静かなフェードアウト停止
  public stopTitleMusic() {
    if (!this.musicActive) return;
    this.musicActive = false;
    if (this.musicTimeoutId !== null) {
      clearTimeout(this.musicTimeoutId);
      this.musicTimeoutId = null;
    }
    try {
      if (this.ctx && this.musicMasterGain) {
        const now = this.ctx.currentTime;
        const g = this.musicMasterGain;
        g.gain.cancelScheduledValues(now);
        g.gain.setValueAtTime(g.gain.value, now);
        g.gain.linearRampToValueAtTime(0.0001, now + 1.0);
      }
      const stopTime = (this.ctx?.currentTime ?? 0) + 1.1;
      this.musicDroneOsc?.stop(stopTime);
      this.musicLfoOsc?.stop(stopTime);
    } catch {
      // 既に停止済み等の例外は無視
    }
    this.musicDroneOsc = null;
    this.musicLfoOsc = null;
    this.musicMasterGain = null;
  }

  // 一巡分の旋律を予約し、終わったタイミングで自身を再度呼び出してループさせる
  private scheduleMusicPhrase() {
    if (!this.musicActive || !this.ctx || !this.musicMasterGain) return;
    let cursor = 0;

    this.musicPhrase.forEach(({ i, dur, vel }) => {
      if (i !== null) {
        this.playMusicNote(this.musicScale[i], vel, cursor, dur);
      }
      cursor += dur;
    });

    // 2周に1度、遠くで鳴る鐘の残響をそっと重ねて単調さを和らげる
    this.musicLoopCount += 1;
    if (this.musicLoopCount % 2 === 0) {
      this.playDistantBell(cursor * 0.4);
    }

    this.musicTimeoutId = setTimeout(() => {
      this.scheduleMusicPhrase();
    }, cursor * 1000);
  }

  // 箏（こと）を思わせる柔らかい弾弦音を1音鳴らす
  private playMusicNote(freq: number, vel: number, offset: number, dur: number) {
    if (!this.ctx || !this.musicMasterGain) return;
    const ctx = this.ctx;
    const master = this.musicMasterGain;
    const now = ctx.currentTime + offset;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(vel, 0.0001), now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + dur + 0.05);

    // 高次倍音のきらめきを薄く重ねる
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(freq * 2, now);
    shimmerGain.gain.setValueAtTime(0.0001, now);
    shimmerGain.gain.exponentialRampToValueAtTime(Math.max(vel * 0.25, 0.0001), now + 0.015);
    shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + dur * 0.6);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(master);
    shimmer.start(now);
    shimmer.stop(now + dur * 0.6 + 0.05);
  }

  // 遠くの寺院から響くような、控えめな鐘の残響
  private playDistantBell(offset: number) {
    if (!this.ctx || !this.musicMasterGain) return;
    const ctx = this.ctx;
    const master = this.musicMasterGain;
    const now = ctx.currentTime + offset;
    const partials = [
      { freq: 216, gain: 0.05, decay: 3.0 },
      { freq: 582, gain: 0.03, decay: 2.4 },
    ];

    partials.forEach((p) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(p.freq, now);
      gain.gain.setValueAtTime(p.gain, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + p.decay);
    });
  }

  // メニュー選択時の竹打・拍子木音（小気味よい澄んだ木質クリック）
  public playMenuClick() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // 短いバンドパスノイズ
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.03);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.005));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200, now);
      filter.Q.setValueAtTime(4.5, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);

      // 高い木質のトーン
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(920, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.03);

      oscGain.gain.setValueAtTime(0.25, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.035);
    } catch {}
  }

  // 対局開始時の和太鼓・拍子木（重厚な低音の打ち鳴らしと引き締まる空気感）
  public playGameStartSound() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // 1. 和太鼓のドンという重低音（88Hzから40Hzへ急降下するサイン波）
      const taikoOsc = this.ctx.createOscillator();
      const taikoGain = this.ctx.createGain();

      taikoOsc.type = 'sine';
      taikoOsc.frequency.setValueAtTime(95, now);
      taikoOsc.frequency.exponentialRampToValueAtTime(42, now + 0.35);

      taikoGain.gain.setValueAtTime(0.65, now);
      taikoGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      taikoOsc.connect(taikoGain);
      taikoGain.connect(this.ctx.destination);

      taikoOsc.start(now);
      taikoOsc.stop(now + 0.58);

      // 2. 太鼓の皮の張り（中域のアタックノイズ）
      const hitBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.06), this.ctx.sampleRate);
      const hitData = hitBuffer.getChannelData(0);
      for (let i = 0; i < hitData.length; i++) {
        hitData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.012));
      }
      const hitSource = this.ctx.createBufferSource();
      hitSource.buffer = hitBuffer;

      const hitFilter = this.ctx.createBiquadFilter();
      hitFilter.type = 'lowpass';
      hitFilter.frequency.setValueAtTime(320, now);

      const hitGain = this.ctx.createGain();
      hitGain.gain.setValueAtTime(0.45, now);
      hitGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      hitSource.connect(hitFilter);
      hitFilter.connect(hitGain);
      hitGain.connect(this.ctx.destination);

      hitSource.start(now);

      // 3. 少し遅れて鳴る拍子木のカーンという音（0.12秒後）
      const woodDelay = 0.12;
      const woodOsc = this.ctx.createOscillator();
      const woodGain = this.ctx.createGain();

      woodOsc.type = 'triangle';
      woodOsc.frequency.setValueAtTime(1280, now + woodDelay);
      woodOsc.frequency.exponentialRampToValueAtTime(840, now + woodDelay + 0.15);

      woodGain.gain.setValueAtTime(0.35, now + woodDelay);
      woodGain.gain.exponentialRampToValueAtTime(0.001, now + woodDelay + 0.18);

      woodOsc.connect(woodGain);
      woodGain.connect(this.ctx.destination);

      woodOsc.start(now + woodDelay);
      woodOsc.stop(now + woodDelay + 0.20);
    } catch {}
  }
}

export const soundManager = new SoundManager();
