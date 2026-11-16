import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import { cn } from '../../utils/cn';

interface PropertyImageProps {
  src?: string | null;
  alt: string;
  className?: string;
}

export const PropertyImage: React.FC<PropertyImageProps> = ({ src, alt, className }) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center bg-gradient-to-br from-[#0B1633] via-[#1B3B8C] to-[#0F2457] text-white/80 p-4 text-center',
          className
        )}
      >
        <Building2 className="h-8 w-8 text-[#C89B3C] mb-2" />
        <span className="text-xs font-medium line-clamp-2 max-w-[180px]">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={cn('object-cover', className)}
      loading="lazy"
    />
  );
};
