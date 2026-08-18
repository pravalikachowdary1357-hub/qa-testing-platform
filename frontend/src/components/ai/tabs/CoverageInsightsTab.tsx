import { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Grid, List, ListItem, ListItemText, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { AiBadge } from '../AiBadge';
import { SummaryCard } from '../../common/SummaryCard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { analyzeCoverage } from '../../../api/ai';
import { fetchProducts } from '../../../api/products';
import { aiErrorMessage } from '../../../utils/aiErrorMessage';
import { useProductContext } from '../../../context/ProductContext';
import type { ApiProduct } from '../../../types/product';
import type { AnalyzeCoverageResult } from '../../../types/ai';

export function CoverageInsightsTab({ aiConfigured }: { aiConfigured: boolean }) {
  const { currentProduct } = useProductContext();
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [productId, setProductId] = useState(currentProduct?.id ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeCoverageResult | null>(null);

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch(() => {});
  }, []);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await analyzeCoverage(productId));
    } catch (err) {
      setError(aiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        The coverage numbers below are always real, computed directly from this product's requirements and
        test executions -- the AI only adds a plain-language explanation of what they mean, grounded in
        those exact numbers.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          select
          size="small"
          label="Product"
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          sx={{ minWidth: 240 }}
        >
          <MenuItem value="">Select a product…</MenuItem>
          {products.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
          disabled={!productId || loading || !aiConfigured}
          onClick={handleAnalyze}
        >
          Analyze Coverage
        </Button>
      </Stack>

      {!aiConfigured && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Configure an AI provider for the narrative explanation. The full Coverage report is always
          available on the <strong>Reports</strong> page regardless.
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {result && (
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Requirement Coverage" value={`${result.coverageData.requirementCoveragePercent}%`} icon={AssignmentIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Test Coverage" value={`${result.coverageData.testCoveragePercent}%`} icon={AssignmentIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Pass Rate" value={`${result.coverageData.passRatePercent}%`} icon={AssignmentIcon} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard title="Failing Test Cases" value={result.coverageData.failCount} icon={AssignmentIcon} />
            </Grid>
          </Grid>

          {result.coverageData.uncoveredRequirementTitles.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Uncovered Requirements</Typography>
              {result.coverageData.uncoveredRequirementTitles.map((title) => (
                <Typography key={title} variant="body2" color="text.secondary">• {title}</Typography>
              ))}
            </Paper>
          )}

          {(result.narrative || result.topRisks.length > 0) && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
                <AiBadge />
                <Typography variant="subtitle2">AI Narrative</Typography>
              </Stack>
              {result.narrative && <Typography variant="body2" sx={{ mb: 1.5 }}>{result.narrative}</Typography>}
              {result.topRisks.length > 0 && (
                <List dense>
                  {result.topRisks.map((risk, i) => (
                    <ListItem key={i} sx={{ py: 0 }}>
                      <ListItemText primary={`• ${risk}`} />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          )}
        </Stack>
      )}
    </Box>
  );
}
