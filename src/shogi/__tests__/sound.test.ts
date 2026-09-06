import { describe, it, expect, beforeEach } from 'vitest';
import { soundManager } from '../sound';

describe('Sound Manager Audio Synthesis Module', () => {
  beforeEach(() => {
    soundManager.enabled = true;
  });

  it('allows toggling sound enabled state', () => {
    expect(soundManager.enabled).toBe(true);
    soundManager.enabled = false;
    expect(soundManager.enabled).toBe(false);
  });

  it('safely handles playTitleSound without exceptions even when AudioContext is mocked or absent', () => {
    expect(() => {
      soundManager.playTitleSound();
    }).not.toThrow();
  });

  it('safely handles playMenuClick without exceptions', () => {
    expect(() => {
      soundManager.playMenuClick();
    }).not.toThrow();
  });

  it('safely handles playGameStartSound without exceptions', () => {
    expect(() => {
      soundManager.playGameStartSound();
    }).not.toThrow();
  });

  it('safely handles move, check, victory, defeat sounds without exceptions', () => {
    expect(() => {
      soundManager.playMoveSound();
      soundManager.playCheckSound();
      soundManager.playVictorySound();
      soundManager.playDefeatSound();
    }).not.toThrow();
  });

  it('does nothing and throws no error when sound is disabled', () => {
    soundManager.enabled = false;
    expect(() => {
      soundManager.playTitleSound();
      soundManager.playMenuClick();
      soundManager.playGameStartSound();
      soundManager.playMoveSound();
      soundManager.playVictorySound();
    }).not.toThrow();
  });
});
