import React, { useRef, useState } from 'react';
import { Check, Move, RefreshCw, X } from 'lucide-react';

interface AvatarCropModalProps {
  imageSrc: string;
  lang: 'en' | 'ru';
  onCancel: () => void;
  onApply: (croppedImage: string) => void;
}

interface CropOffset {
  x: number;
  y: number;
}

const CROP_SIZE = 288;
const OUTPUT_SIZE = 512;

const AvatarCropModal: React.FC<AvatarCropModalProps> = ({ imageSrc, lang, onCancel, onApply }) => {
  const isRussian = lang === 'ru';
  const imageRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ pointerX: number; pointerY: number; offset: CropOffset } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<CropOffset>({ x: 0, y: 0 });
  const [imageReady, setImageReady] = useState(false);
  const [error, setError] = useState('');

  const getBaseScale = () => {
    const image = imageRef.current;
    if (!image || !image.naturalWidth || !image.naturalHeight) return 1;
    return CROP_SIZE / Math.min(image.naturalWidth, image.naturalHeight);
  };

  const getDisplaySize = () => {
    const image = imageRef.current;
    if (!image) return { width: CROP_SIZE, height: CROP_SIZE };
    const scale = getBaseScale() * zoom;
    return { width: image.naturalWidth * scale, height: image.naturalHeight * scale };
  };

  const clampOffset = (nextOffset: CropOffset, nextZoom = zoom): CropOffset => {
    const image = imageRef.current;
    if (!image) return { x: 0, y: 0 };
    const scale = (CROP_SIZE / Math.min(image.naturalWidth, image.naturalHeight)) * nextZoom;
    const maxX = Math.max(0, (image.naturalWidth * scale - CROP_SIZE) / 2);
    const maxY = Math.max(0, (image.naturalHeight * scale - CROP_SIZE) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, nextOffset.x)),
      y: Math.min(maxY, Math.max(-maxY, nextOffset.y)),
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!imageReady) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerX: event.clientX, pointerY: event.clientY, offset };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    setOffset(clampOffset({
      x: dragRef.current.offset.x + event.clientX - dragRef.current.pointerX,
      y: dragRef.current.offset.y + event.clientY - dragRef.current.pointerY,
    }));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleZoomChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextZoom = Number(event.target.value);
    setZoom(nextZoom);
    setOffset(current => clampOffset(current, nextZoom));
  };

  const handleApply = () => {
    const image = imageRef.current;
    if (!imageReady || !image) return;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext('2d');
    if (!context) {
      setError(isRussian ? 'Не удалось обработать изображение.' : 'Could not process the image.');
      return;
    }

    const scale = getBaseScale() * zoom;
    const sourceSize = CROP_SIZE / scale;
    const sourceX = (getDisplaySize().width / 2 - offset.x - CROP_SIZE / 2) / scale;
    const sourceY = (getDisplaySize().height / 2 - offset.y - CROP_SIZE / 2) / scale;

    try {
      context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      onApply(canvas.toDataURL('image/jpeg', 0.9));
    } catch (cropError) {
      console.error('[AvatarCrop] Failed to crop image', cropError);
      setError(isRussian ? 'Не удалось обработать изображение.' : 'Could not process the image.');
    }
  };

  const displaySize = getDisplaySize();

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="avatar-crop-title" className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-overlay sm:p-7">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="avatar-crop-title" className="text-xl font-bold font-display text-fg">
              {isRussian ? 'Кадрирование аватара' : 'Crop your avatar'}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {isRussian ? 'Перемещайте изображение и настройте масштаб' : 'Drag the image and adjust the zoom'}
            </p>
          </div>
          <button type="button" onClick={onCancel} aria-label={isRussian ? 'Отмена' : 'Cancel'} className="rounded-full p-2 text-muted hover:bg-page">
            <X size={20} />
          </button>
        </header>

        <div
          className="relative mx-auto h-72 w-72 touch-none select-none overflow-hidden rounded-full bg-black/90"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ cursor: imageReady ? 'grab' : 'default' }}
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt=""
            draggable={false}
            onLoad={() => {
              setOffset({ x: 0, y: 0 });
              setImageReady(true);
              setError('');
            }}
            onError={() => {
              setImageReady(false);
              setError(isRussian ? 'Не удалось открыть изображение.' : 'Could not open the image.');
            }}
            className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
            style={{
              width: displaySize.width,
              height: displaySize.height,
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              visibility: imageReady ? 'visible' : 'hidden',
            }}
          />
          {!imageReady && !error && <RefreshCw className="absolute left-1/2 top-1/2 animate-spin text-white" size={24} />}
          <div className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-white/90 ring-inset" />
        </div>

        <label className="mt-6 block">
          <span className="mb-2 flex items-center justify-between text-sm font-medium text-fg">
            <span>{isRussian ? 'Масштаб' : 'Zoom'}</span>
            <span className="text-muted">{Math.round(zoom * 100)}%</span>
          </span>
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            onChange={handleZoomChange}
            disabled={!imageReady}
            aria-label={isRussian ? 'Масштаб изображения' : 'Image zoom'}
            className="w-full accent-[var(--accent)]"
          />
        </label>

        <p className="mt-2 flex items-center justify-center gap-2 text-xs text-muted">
          <Move size={14} />{isRussian ? 'Перетащите изображение для кадрирования' : 'Drag the image to position it'}
        </p>
        {error && <p role="alert" className="mt-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

        <footer className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-muted hover:bg-page">
            {isRussian ? 'Отмена' : 'Cancel'}
          </button>
          <button type="button" onClick={handleApply} disabled={!imageReady} className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-on hover:opacity-90 disabled:opacity-50">
            <Check size={17} />{isRussian ? 'Применить' : 'Apply'}
          </button>
        </footer>
      </section>
    </div>
  );
};

export default AvatarCropModal;
