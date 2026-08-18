import { keyframes } from '@emotion/react';

// Shared ambient-motion keyframes used by the login page and the public
// home page so both surfaces feel like the same product.
export const drift1 = keyframes`
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(60px, 40px) scale(1.12); }
  100% { transform: translate(0, 0) scale(1); }
`;

export const drift2 = keyframes`
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-70px, 50px) scale(1.15); }
  100% { transform: translate(0, 0) scale(1); }
`;

export const drift3 = keyframes`
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(45px, -55px) scale(0.9); }
  100% { transform: translate(0, 0) scale(1); }
`;

export const floatY = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-14px); }
`;
