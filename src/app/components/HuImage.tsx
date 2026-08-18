import { useState } from 'react';
import { HU_IMAGE_FALLBACKS, HU_IMAGES } from '../config/appImages';

type ImageKey = keyof typeof HU_IMAGES;

interface HuImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  imageKey: ImageKey;
}

export function HuImage({ imageKey, src, alt, onError, ...props }: HuImageProps) {
  const [activeSrc, setActiveSrc] = useState(src ?? HU_IMAGES[imageKey]);

  return (
    <img
      {...props}
      src={activeSrc}
      alt={alt ?? ''}
      onError={(event) => {
        const fallback = HU_IMAGE_FALLBACKS[imageKey];
        if (activeSrc !== fallback) setActiveSrc(fallback);
        onError?.(event);
      }}
    />
  );
}
