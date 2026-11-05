import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prepareImage, readImage } from '../../src/services/imageService.js';

describe('preparação e privacidade da foto', () => {
  const originalImage = globalThis.Image;
  const originalReader = globalThis.FileReader;
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => {
    vi.unstubAllGlobals();
    globalThis.Image = originalImage;
    globalThis.FileReader = originalReader;
  });

  it('lê foto como data URL e informa falha de leitura', async () => {
    const file = new File(['a'], 'photo.jpg', { type: 'image/jpeg' });
    await expect(readImage(file)).resolves.toBe('data:image/jpeg;base64,YQ==');
    vi.stubGlobal(
      'FileReader',
      class {
        readAsDataURL() {
          this.onerror();
        }
      },
    );
    await expect(readImage(file)).rejects.toThrow('ler a foto');
  });
  it('recusa arquivo incompatível antes de ler', async () => {
    await expect(prepareImage(new File(['x'], 'file.txt', { type: 'text/plain' }))).rejects.toThrow(
      'JPEG',
    );
  });
  it('redimensiona, reencoda em JPEG e não conserva EXIF', async () => {
    vi.stubGlobal(
      'Image',
      class {
        naturalWidth = 3200;
        naturalHeight = 2400;
        set src(value) {
          this.source = value;
          this.onload();
        }
      },
    );
    const canvas = document.createElement('canvas');
    const context = { fillRect: vi.fn(), drawImage: vi.fn() };
    vi.spyOn(canvas, 'getContext').mockReturnValue(context);
    vi.spyOn(canvas, 'toDataURL').mockReturnValue('data:image/jpeg;base64,YQ==');
    vi.spyOn(document, 'createElement').mockReturnValue(canvas);
    const result = await prepareImage(new File(['a'], 'photo.png', { type: 'image/png' }));
    expect(result).toBe('data:image/jpeg;base64,YQ==');
    expect(canvas.width).toBe(1600);
    expect(canvas.height).toBe(1200);
    expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.8);
    expect(context.drawImage).toHaveBeenCalledOnce();
  });
  it('trata foto corrompida, canvas indisponível e saída inválida', async () => {
    const file = new File(['a'], 'photo.jpg', { type: 'image/jpeg' });
    vi.stubGlobal(
      'Image',
      class {
        set src(value) {
          this.source = value;
          this.onerror();
        }
      },
    );
    await expect(prepareImage(file)).rejects.toThrow('corrompida');
    vi.stubGlobal(
      'Image',
      class {
        naturalWidth = 100;
        naturalHeight = 100;
        set src(value) {
          this.source = value;
          this.onload();
        }
      },
    );
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockReturnValue(null);
    vi.spyOn(document, 'createElement').mockReturnValue(canvas);
    await expect(prepareImage(file)).rejects.toThrow('preparar a foto');
    canvas.getContext.mockReturnValue({ fillRect() {}, drawImage() {} });
    vi.spyOn(canvas, 'toDataURL').mockReturnValue('data:,');
    await expect(prepareImage(file)).rejects.toThrow('válida');
  });
});
