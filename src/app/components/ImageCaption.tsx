import type { AppImageItem } from '../config/appImages';

interface ImageCaptionProps {
  item: AppImageItem;
  variant?: 'overlay' | 'below' | 'compact';
  className?: string;
}

export function ImageCaption({ item, variant = 'overlay', className = '' }: ImageCaptionProps) {
  if (variant === 'compact') {
    return (
      <div className={className}>
        <p className="text-sm font-semibold text-gray-900">{item.title}</p>
      </div>
    );
  }

  if (variant === 'below') {
    return (
      <div className={`space-y-1 ${className}`}>
        <p className="text-sm font-bold text-gray-900">{item.title}</p>
        <p className="text-xs text-gray-600 leading-relaxed">{item.caption}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <p className="text-white font-bold text-sm drop-shadow-md">{item.title}</p>
      <p className="text-white/85 text-xs mt-1.5 leading-relaxed line-clamp-2 drop-shadow">
        {item.caption}
      </p>
    </div>
  );
}

interface CaptionedImageProps {
  item: AppImageItem;
  className?: string;
  imgClassName?: string;
  showCaption?: 'overlay' | 'below' | 'none';
}

export function CaptionedImage({
  item,
  className = '',
  imgClassName = '',
  showCaption = 'overlay',
}: CaptionedImageProps) {
  return (
    <figure className={`relative overflow-hidden ${className}`}>
      <img
        src={item.url}
        alt={`${item.title} — ${item.caption}`}
        className={`w-full h-full object-cover ${imgClassName}`}
        loading="lazy"
      />
      {showCaption === 'overlay' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <figcaption className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
            <ImageCaption item={item} variant="overlay" />
          </figcaption>
        </>
      )}
      {showCaption === 'below' && (
        <figcaption className="p-3 bg-white border-t">
          <ImageCaption item={item} variant="below" />
        </figcaption>
      )}
    </figure>
  );
}
