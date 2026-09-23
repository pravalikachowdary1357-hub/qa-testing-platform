import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Link,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import StorageIcon from '@mui/icons-material/Storage';
import DnsIcon from '@mui/icons-material/Dns';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import BugReportIcon from '@mui/icons-material/BugReport';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ApiIcon from '@mui/icons-material/Api';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import TimelineIcon from '@mui/icons-material/Timeline';
import VerifiedIcon from '@mui/icons-material/Verified';
import AssessmentIcon from '@mui/icons-material/Assessment';
import type SvgIcon from '@mui/material/SvgIcon';
import { StatusChip } from '../common/StatusChip';
import { ProductDocumentsTab } from '../productdocument/ProductDocumentsTab';
import { ProductComponentsTab } from './ProductComponentsTab';
import { ProductTeamTab } from './ProductTeamTab';
import { ProductSprintsTab } from './ProductSprintsTab';
import { ProductBuildsTab } from './ProductBuildsTab';
import { fetchProduct } from '../../api/products';
import { ApiError } from '../../api/client';
import { useProductContext } from '../../context/ProductContext';
import type { ApiProduct, ProductStatus, ReleaseReadiness } from '../../types/product';

const STATUS_LABELS: Record<string, ProductStatus> = {
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  DEPRECATED: 'Deprecated',
};

const READINESS_LABELS: Record<string, ReleaseReadiness> = {
  READY: 'Ready',
  CONDITIONAL: 'Conditional',
  NOT_READY: 'Not Ready',
};

// Same icon per module as the sidebar (routeConfig.tsx), so a link here is
// instantly recognizable as "the same place" once the user navigates there.
const QUICK_LINKS: { label: string; path: string; icon: typeof SvgIcon }[] = [
  { label: 'Requirements', path: '/requirements', icon: AssignmentIcon },
  { label: 'Test Planning', path: '/test-planning', icon: EventNoteIcon },
  { label: 'Test Scenarios', path: '/test-scenarios', icon: AccountTreeIcon },
  { label: 'Test Cases', path: '/test-cases', icon: FactCheckIcon },
  { label: 'Test Data', path: '/test-data', icon: StorageIcon },
  { label: 'Environments', path: '/environments', icon: DnsIcon },
  { label: 'Test Execution', path: '/test-execution', icon: PlayCircleIcon },
  { label: 'Defects', path: '/defects', icon: BugReportIcon },
  { label: 'Automation', path: '/automation', icon: SmartToyIcon },
  { label: 'API Testing', path: '/api-testing', icon: ApiIcon },
  { label: 'Performance Testing', path: '/performance-testing', icon: SpeedIcon },
  { label: 'Security Testing', path: '/security-testing', icon: SecurityIcon },
  { label: 'UAT', path: '/uat', icon: HowToRegIcon },
  { label: 'Traceability', path: '/traceability', icon: TimelineIcon },
  { label: 'Releases', path: '/release-quality', icon: VerifiedIcon },
  { label: 'Reports', path: '/reports', icon: AssessmentIcon },
];

interface ProductDetailDialogProps {
  productId: string | null;
  onClose: () => void;
}

export function ProductDetailDialog({ productId, onClose }: ProductDetailDialogProps) {
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const { setCurrentProduct } = useProductContext();
  const navigate = useNavigate();

  useEffect(() => {
    setActiveTab(0);
  }, [productId]);

  useEffect(() => {
    if (!productId) {
      setProduct(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setProduct(null);
    setError(null);

    fetchProduct(productId)
      .then((data) => {
        if (!cancelled) setProduct(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? `Failed to load product (HTTP ${err.status}).`
            : 'Failed to load product. Is the backend running?',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const goToModule = (path: string) => {
    if (!product) return;
    setCurrentProduct(product);
    onClose();
    navigate(path);
  };

  return (
    <Dialog open={Boolean(productId)} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pb: 0 }}>Product Workspace</DialogTitle>

      {product && (
        <Tabs
          value={activeTab}
          onChange={(_e, value: number) => setActiveTab(value)}
          sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Overview" />
          <Tab label="Components" />
          <Tab label="Team" />
          <Tab label="Files/Documents" />
          <Tab label="Sprints" />
          <Tab label="Builds" />
        </Tabs>
      )}

      <DialogContent>
        {!product && !error && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {error && <Alert severity="error">{error}</Alert>}

        {product && activeTab === 1 && <ProductComponentsTab productId={product.id} />}

        {product && activeTab === 2 && (
          <ProductTeamTab productId={product.id} organizationId={product.organizationId} />
        )}

        {product && activeTab === 3 && <ProductDocumentsTab productId={product.id} />}

        {product && activeTab === 4 && <ProductSprintsTab productId={product.id} />}

        {product && activeTab === 5 && <ProductBuildsTab productId={product.id} />}

        {product && activeTab === 0 && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="h6">{product.name}</Typography>
                {product.productKey && (
                  <Chip label={product.productKey} size="small" variant="outlined" />
                )}
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {product.organization.name}
                {product.project ? ` · ${product.project.name}` : ' · No project assigned'}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <StatusChip status={STATUS_LABELS[product.status]} />
              <StatusChip status={READINESS_LABELS[product.releaseReadiness]} />
            </Stack>

            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Quick Links
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
                {QUICK_LINKS.map(({ label, path, icon: Icon }) => (
                  <Button
                    key={path}
                    size="small"
                    variant="outlined"
                    startIcon={<Icon fontSize="small" />}
                    onClick={() => goToModule(path)}
                  >
                    {label}
                  </Button>
                ))}
              </Stack>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Description
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {product.description}
              </Typography>
            </Box>

            <Stack direction="row" spacing={4} sx={{ flexWrap: 'wrap' }} useFlexGap>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Application URL
                </Typography>
                {product.applicationUrl ? (
                  <Link
                    href={product.applicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="body2"
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                  >
                    {product.applicationUrl}
                    <OpenInNewIcon sx={{ fontSize: 14 }} />
                  </Link>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    —
                  </Typography>
                )}
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Repository URL
                </Typography>
                {product.repositoryUrl ? (
                  <Link
                    href={product.repositoryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="body2"
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                  >
                    {product.repositoryUrl}
                    <OpenInNewIcon sx={{ fontSize: 14 }} />
                  </Link>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    —
                  </Typography>
                )}
              </Box>
            </Stack>

            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Product Owner
                </Typography>
                <Typography variant="body2">
                  {product.productOwner ? `${product.productOwner.name} (${product.productOwner.email})` : '—'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Current Version
                </Typography>
                <Typography variant="body2">{product.currentVersion || '—'}</Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Environment
                </Typography>
                <Typography variant="body2">{product.environment}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Release
                </Typography>
                <Typography variant="body2">{product.release}</Typography>
              </Box>
            </Stack>

            <Divider />

            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Test Coverage
                </Typography>
                <Typography variant="body2">{product.testCoverage}%</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Pass Rate
                </Typography>
                <Typography variant="body2">{product.passRate}%</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Open Defects
                </Typography>
                <Typography variant="body2">{product.openDefects}</Typography>
              </Box>
            </Stack>

            <Divider />

            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body2">
                  {new Date(product.createdAt).toLocaleString()}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Updated
                </Typography>
                <Typography variant="body2">
                  {new Date(product.updatedAt).toLocaleString()}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
