import { useEffect, useState } from 'react';
import { Alert, Box, Button, Checkbox, CircularProgress, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { AiBadge } from '../AiBadge';
import { SourceContextCard } from '../SourceContextCard';
import { acceptScenarios, generateScenarios } from '../../../api/ai';
import { fetchRequirements } from '../../../api/requirements';
import { aiErrorMessage } from '../../../utils/aiErrorMessage';
import { useProductContext } from '../../../context/ProductContext';
import type { ApiRequirement } from '../../../types/requirement';
import type { AiScenarioSuggestionItem, GenerateScenariosResult } from '../../../types/ai';

const TYPE_OPTIONS = ['FUNCTIONAL', 'REGRESSION', 'INTEGRATION', 'SMOKE', 'EDGE_CASE'];
const PRIORITY_OPTIONS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

type EditableScenario = AiScenarioSuggestionItem & { selected: boolean };

export function GenerateScenariosTab({ aiConfigured }: { aiConfigured: boolean }) {
  const { currentProduct } = useProductContext();
  const [requirements, setRequirements] = useState<ApiRequirement[]>([]);
  const [requirementId, setRequirementId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateScenariosResult | null>(null);
  const [editable, setEditable] = useState<EditableScenario[]>([]);
  const [edited, setEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchRequirements(currentProduct?.id)
      .then(setRequirements)
      .catch(() => {});
  }, [currentProduct?.id]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSaveMessage(null);
    setEdited(false);
    try {
      const res = await generateScenarios(requirementId);
      setResult(res);
      setEditable(res.scenarios.map((s) => ({ ...s, selected: true })));
    } catch (err) {
      setError(aiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (index: number, patch: Partial<AiScenarioSuggestionItem>) => {
    setEditable((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    setEdited(true);
  };
  const toggleSelected = (index: number) => {
    setEditable((items) => items.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item)));
  };

  const handleSave = async () => {
    if (!result) return;
    const selected = editable.filter((item) => item.selected).map(({ selected: _s, ...rest }) => rest);
    if (selected.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const res = await acceptScenarios(result.suggestionId, selected, edited);
      setSaveMessage(`${res.created.length} test scenario(s) created and saved.`);
      setResult(null);
      setEditable([]);
    } catch (err) {
      setError(aiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Select a requirement and generate candidate test scenarios. Nothing is saved to Test Scenarios until
        you review and click Save.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          select
          size="small"
          label="Requirement"
          value={requirementId}
          onChange={(e) => setRequirementId(e.target.value)}
          sx={{ minWidth: 280 }}
        >
          <MenuItem value="">Select a requirement…</MenuItem>
          {requirements.map((r) => (
            <MenuItem key={r.id} value={r.id}>
              {r.title}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
          disabled={!requirementId || loading || !aiConfigured}
          onClick={handleGenerate}
        >
          Generate Scenarios
        </Button>
      </Stack>

      {!aiConfigured && <Alert severity="info" sx={{ mb: 2 }}>Configure an AI provider to use this feature.</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {saveMessage && <Alert severity="success" sx={{ mb: 2 }}>{saveMessage}</Alert>}

      {result && (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <AiBadge />
            <Typography variant="subtitle2">{editable.length} suggested scenario(s) — review before saving</Typography>
          </Stack>
          <SourceContextCard context={result.sourceContext} />
          {editable.map((item, index) => (
            <Paper key={index} variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                <Checkbox checked={item.selected} onChange={() => toggleSelected(index)} />
                <Stack spacing={1} sx={{ flexGrow: 1 }}>
                  <TextField
                    label="Title"
                    size="small"
                    value={item.title}
                    onChange={(e) => updateItem(index, { title: e.target.value })}
                    fullWidth
                  />
                  <TextField
                    label="Description"
                    size="small"
                    multiline
                    minRows={2}
                    value={item.description}
                    onChange={(e) => updateItem(index, { description: e.target.value })}
                    fullWidth
                  />
                  <Stack direction="row" spacing={2}>
                    <TextField
                      select
                      label="Type"
                      size="small"
                      value={item.type ?? 'FUNCTIONAL'}
                      onChange={(e) => updateItem(index, { type: e.target.value })}
                      sx={{ width: 180 }}
                    >
                      {TYPE_OPTIONS.map((t) => (
                        <MenuItem key={t} value={t}>
                          {t}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      select
                      label="Priority"
                      size="small"
                      value={item.priority ?? 'MEDIUM'}
                      onChange={(e) => updateItem(index, { priority: e.target.value })}
                      sx={{ width: 180 }}
                    >
                      {PRIORITY_OPTIONS.map((p) => (
                        <MenuItem key={p} value={p}>
                          {p}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>
                </Stack>
              </Stack>
            </Paper>
          ))}
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              color="success"
              disabled={saving || editable.every((i) => !i.selected)}
              onClick={handleSave}
            >
              Save Selected ({editable.filter((i) => i.selected).length})
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => {
                setResult(null);
                setEditable([]);
              }}
            >
              Discard
            </Button>
          </Stack>
        </Stack>
      )}
    </Box>
  );
}
