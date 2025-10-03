import { BaseProvider, XAIProvider, OpenAIProvider } from '../index';

describe('AI Changelog Generator', () => {
  describe('Provider Classes', () => {
    it('should export BaseProvider', () => {
      expect(BaseProvider).toBeDefined();
      expect(typeof BaseProvider).toBe('function');
    });

    it('should export XAIProvider', () => {
      expect(XAIProvider).toBeDefined();
      expect(typeof XAIProvider).toBe('function');
    });

    it('should export OpenAIProvider', () => {
      expect(OpenAIProvider).toBeDefined();
      expect(typeof OpenAIProvider).toBe('function');
    });
  });

  describe('BaseProvider', () => {
    it('should be defined as abstract class', () => {
      expect(BaseProvider).toBeDefined();
      expect(typeof BaseProvider).toBe('function');
    });
  });

  describe('XAIProvider', () => {
    it('should create instance with apiKey', () => {
      const provider = new XAIProvider('test-key');
      expect(provider).toBeInstanceOf(XAIProvider);
      expect(provider).toBeInstanceOf(BaseProvider);
    });
  });

  describe('OpenAIProvider', () => {
    it('should create instance with apiKey', () => {
      const provider = new OpenAIProvider('test-key');
      expect(provider).toBeInstanceOf(OpenAIProvider);
      expect(provider).toBeInstanceOf(BaseProvider);
    });
  });
});
