import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { AiBadge } from '../AiBadge';
import { SourceContextCard } from '../SourceContextCard';
import { acceptTestCases, generateTestCases } from '../../../api/ai';
import { fetchTestScenarios } from '../../../api/testScenarios';
import { aiErrorMessage } from '../../../utils/aiErrorMessage';
import { useProductContext } from '../../../context/ProductContext';
import type { ApiTestScenario } from '../../../types/testScenario';
import type { AiTestCaseSuggestionItem, GenerateTestCasesResult } from '../../../types/ai';

const PRIORITY_OPTIONS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

type EditableTestCase = AiTestCaseSuggestionItem & { selected: boolean };

export function GenerateTestCasesTab({ aiConfigured }: { aiConfigured: boolean }) {
  const { currentProduct } = useProductContext();
  const [scenarios, setScenarios] = useState<ApiTestScenario[]>([]);
  const [testScenarioId, setTestScenarioId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateTestCasesResult | null>(null);
  const [editable, setEditable] = useState<EditableTestCase[]>([]);
  const [edited, setEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchTestScenarios(currentProduct?.id)
      .then(setScenarios)
      .catch(() => {});
  }, [currentProduct?.id]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSaveMessage(null);
    setEdited(false);
    try {
      const res = await generateTestCases(testScenarioId);
      setResult(res);
      setEditable(res.testCases.map((tc) => ({ ...tc, selected: true })));
    } catch (err) {
      setError(aiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (index: number, patch: Partial<AiTestCaseSuggestionItem>) => {
    setEditable((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    setEdited(true);
  };
  const updateStep = (tcIndex: number, stepIndex: number, patch: Partial<{ action: string; expectedResult: string }>) => {
    setEditable((items) =>
      items.map((item, i) =>
        i === tcIndex
          ? { ...item, steps: item.steps.map((s, si) => (si === stepIndex ? { ...s, ...patch } : s)) }
          : item,
      ),
    );
    setEdited(true);
  };
  const toggleSelected = (index: number) => {
    setEditable((items) => items.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item)));
  };

  const handleSave = async () => {
    if (!result) return;
    const selected = editable
      .filter((item) => item.selected)
      .map(({ selected: _s, preconditions, ...rest }) => ({ ...rest, preconditions: preconditions ?? undefined }));
    if (selected.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const res = await acceptTestCases(result.suggestionId, selected, edited);
      setSaveMessage(`${res.created.length} test case(s) created and saved.`);
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
        Select a test scenario and generate candidate test cases with steps. Nothing is saved to Test Cases
        until you review and click Save.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          select
          size="small"
          label="Test Scenario"
          value={testScenarioId}
          onChange={(e) => setTestScenarioId(e.target.value)}
          sx={{ minWidth: 280 }}
        >
          <MenuItem value="">Select a test scenario…</MenuItem>
          {scenarios.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {s.title}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
          disabled={!testScenarioId || loading || !aiConfigured}
          onClick={handleGenerate}
        >
          Generate Test Cases
        </Button>
      </Stack>

      {!aiConfigured && <Alert severity="info" sx={{ mb: 2 }}>Configure an AI provider to use this feature.</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {saveMessage && <Alert severity="success" sx={{ mb: 2 }}>{saveMessage}</Alert>}

      {result && (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <AiBadge />
            <Typography variant="subtitle2">{editable.length} suggested test case(s) — review before saving</Typography>
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
                      label="Preconditions"
                      size="small"
                      value={item.preconditions ?? ''}
                      onChange={(e) => updateItem(index, { preconditions: e.target.value })}
                      fullWidth
                    />
                    <TextField
                      select
                      label="Priority"
                      size="small"
                      value={item.priority ?? 'MEDIUM'}
                      onChange={(e) => updateItem(index, { priority: e.target.value })}
                      sx={{ width: 180, flexShrink: 0 }}
                    >
                      {PRIORITY_OPTIONS.map((p) => (
                        <MenuItem key={p} value={p}>
                          {p}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>
                  <TextField
                    label="Expected Result"
                    size="small"
                    value={item.expectedResult}
                    onChange={(e) => updateItem(index, { expectedResult: e.target.value })}
                    fullWidth
                  />
                  <Divider sx={{ my: 0.5 }} />
                  <Typography variant="caption" color="text.secondary">
                    Steps
                  </Typography>
                  {item.steps.map((step, stepIndex) => (
                    <Stack direction="row" spacing={1} key={stepIndex}>
                      <Typography variant="body2" sx={{ pt: 1, minWidth: 20 }}>
                        {stepIndex + 1}.
                      </Typography>
                      <TextField
                        size="small"
                        label="Action"
                        value={step.action}
                        onChange={(e) => updateStep(index, stepIndex, { action: e.target.value })}
                        fullWidth
                      />
                      <TextField
                        size="small"
                        label="Expected"
                        value={step.expectedResult}
                        onChange={(e) => updateStep(index, stepIndex, { expectedResult: e.target.value })}
                        fullWidth
                      />
                    </Stack>
                  ))}
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
