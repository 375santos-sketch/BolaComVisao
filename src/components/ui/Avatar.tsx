import React from 'react';

const SIZES = { sm: 'h-9 w-9 text-ui-caption', md: 'h-11 w-11 text-ui-body', lg: 'h-16 w-16 text-ui-title sm:h-20 sm:w-20' };

/**
 * An athlete's (or anyone's) picture: the photo when there is one, otherwise the shirt number or the initials, on a
 * calm surface with the brand colour.
 */
export const Avatar: React.FC<{
  name: string;
  photoUrl?: string;
  number?: number | string | null;
  size?: keyof typeof SIZES;
  square?: boolean;
}> = ({ name, photoUrl, number, size = 'md', square = false }) => {
  const shape = square ? 'rounded-ui' : 'rounded-full';
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        referrerPolicy="no-referrer"
        className={`${SIZES[size]} ${shape} shrink-0 border border-ui-line-strong object-cover`}
      />
    );
  }
  const hasNumber = number !== null && number !== undefined && `${number}` !== '';
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
  return (
    <span
      aria-hidden
      className={`${SIZES[size]} ${shape} flex shrink-0 items-center justify-center border border-ui-line bg-ui-surface-2 font-['Chakra_Petch'] font-bold text-ui-brand`}
    >
      {hasNumber ? number : initials || '–'}
    </span>
  );
};
