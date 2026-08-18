import { Box } from '@mui/material';
import { drift1, drift2, drift3 } from '../../utils/motion';

const ANIMATIONS = [drift1, drift2, drift3];

interface BlobConfig {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  size: number;
  color: string;
  duration?: string;
}

// Reusable drifting-gradient backdrop so sections beyond the hero still feel
// alive instead of going flat -- same motion language as the login page.
export function AmbientBlobs({ blobs }: { blobs: BlobConfig[] }) {
  return (
    <>
      {blobs.map((blob, i) => (
        <Box
          key={i}
          aria-hidden
          sx={{
            position: 'absolute',
            top: blob.top,
            bottom: blob.bottom,
            left: blob.left,
            right: blob.right,
            width: blob.size,
            height: blob.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${blob.color} 0%, transparent 70%)`,
            animation: `${ANIMATIONS[i % ANIMATIONS.length]} ${blob.duration ?? '20s'} ease-in-out infinite`,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  );
}
