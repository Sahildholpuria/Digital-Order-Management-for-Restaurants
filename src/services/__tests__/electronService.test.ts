import { describe, it, expect } from 'vitest';
import { electronService } from '../electronService';

describe('electronService tests', () => {
  describe('compareVersions', () => {
    it('accurately identifies when version 1 is newer', () => {
      expect(electronService.compareVersions('2.5.1', '2.5.0')).toBe(1);
      expect(electronService.compareVersions('2.6.0', '2.5.9')).toBe(1);
      expect(electronService.compareVersions('3.0.0', '2.9.9')).toBe(1);
      expect(electronService.compareVersions('v2.5.1', '2.5.0')).toBe(1);
      expect(electronService.compareVersions('v3.0.0', 'v2.9.9')).toBe(1);
    });

    it('accurately identifies when version 1 is older', () => {
      expect(electronService.compareVersions('2.4.9', '2.5.0')).toBe(-1);
      expect(electronService.compareVersions('1.9.9', '2.0.0')).toBe(-1);
      expect(electronService.compareVersions('v2.4.0', '2.5.0')).toBe(-1);
    });

    it('accurately identifies equal versions', () => {
      expect(electronService.compareVersions('2.5.0', '2.5.0')).toBe(0);
      expect(electronService.compareVersions('v2.5.0', '2.5.0')).toBe(0);
      expect(electronService.compareVersions('v2.5.0', 'v2.5.0')).toBe(0);
    });

    it('handles differing segment lengths safely', () => {
      expect(electronService.compareVersions('2.5.0.1', '2.5.0')).toBe(1);
      expect(electronService.compareVersions('2.5', '2.5.0')).toBe(0);
      expect(electronService.compareVersions('2.5', '2.5.1')).toBe(-1);
    });
  });

  describe('isElectron', () => {
    it('returns false in normal web / node environments', () => {
      expect(electronService.isElectron()).toBe(false);
      expect(electronService.getPlatform()).toBe('web');
    });
  });
});
