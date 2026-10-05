import { keyframes } from '@emotion/react';

// Shared ambient-motion keyframes used by the login page and the public
// home page so both surfaces feel like the same product.
export const drift1 = keyframes`
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(160px, 100px) scale(1.3); }
  100% { transform: translate(0, 0) scale(1); }
`;

export const drift2 = keyframes`
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-180px, 120px) scale(1.35); }
  100% { transform: translate(0, 0) scale(1); }
`;

export const drift3 = keyframes`
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(120px, -140px) scale(0.8); }
  100% { transform: translate(0, 0) scale(1); }
`;

export const floatY = keyframes`
  0%, 100% { transform: translateY(0); }
  25% { transform: translateY(-18px) rotate(-8deg); }
  50% { transform: translateY(-36px) rotate(0deg); }
  75% { transform: translateY(-18px) rotate(8deg); }
`;
