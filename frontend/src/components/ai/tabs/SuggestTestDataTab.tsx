import { useEffect, useState } from 'react';
import { Alert, Box, Button, Checkbox, CircularProgress, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { AiBadge } from '../AiBadge';
import { SourceContextCard } from '../SourceContextCard';
import { acceptTestData, suggestTestData } from '../../../api/ai';
import { fetchTestCases } from '../../../api/testCases';
import { aiErrorMessage } from '../../../utils/aiErrorMessage';
import { useProductContext } from '../../../context/ProductContext';
import type { ApiTestCase } from '../../../types/testCase';
import type { AiTestDataSuggestionItem, SuggestTestDataResult } from '../../../types/ai';

const TYPE_OPTIONS = ['INPUT', 'EXPECTED_OUTPUT', 'CREDENTIALS', 'CONFIGURATION', 'REFERENCE'];

type EditableTestData = AiTestDataSuggestionItem & { selected: boolean };

export function SuggestTestDataTab({ aiConfigured }: { aiConfigured: boolean }) {
  const { currentProduct } = useProductContext();
  const [testCases, setTestCases] = useState<ApiTestCase[]>([]);
  const [testCaseId, setTestCaseId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SuggestTestDataResult | null>(null);
  const [editable, setEditable] = useState<EditableTestData[]>([]);
  const [edited, setEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchTestCases(currentProduct?.id)
      .then(setTestCases)
      .catch(() => {});
  }, [currentProduct?.id]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSaveMessage(null);
    setEdited(false);
    try {
      const res = await suggestTestData(testCaseId);
      setResult(res);
      setEditable(res.testData.map((d) => ({ ...d, selected: true })));
    } catch (err) {
      setError(aiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const updateItem = (index: number, patch: Partial<AiTestDataSuggestionItem>) => {
    setEditable((items) => items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
    setEdited(true);
  };
  const toggleSelected = (index: number) => {
    setEditable((items) => items.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item)));
  };

  const handleSave = async () => {
    if (!result) return;
    const selected = editable
      .filter((item) => item.selected)
      .map(({ selected: _s, description, ...rest }) => ({ ...rest, description: description ?? undefined }));
    if (selected.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const res = await acceptTestData(result.suggestionId, selected, edited);
      setSaveMessage(`${res.created.length} test data record(s) created and saved.`);
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
        Select a test case and generate candidate test data. Nothing is saved to Test Data until you review
        and click Save.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          select
          size="small"
          label="Test Case"
          value={testCaseId}
          onChange={(e) => setTestCaseId(e.target.value)}
          sx={{ minWidth: 280 }}
        >
          <MenuItem value="">Select a test case…</MenuItem>
          {testCases.map((tc) => (
            <MenuItem key={tc.id} value={tc.id}>
              {tc.title}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
          disabled={!testCaseId || loading || !aiConfigured}
          onClick={handleGenerate}
        >
          Suggest Test Data
        </Button>
      </Stack>

      {!aiConfigured && <Alert severity="info" sx={{ mb: 2 }}>Configure an AI provider to use this feature.</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {saveMessage && <Alert severity="success" sx={{ mb: 2 }}>{saveMessage}</Alert>}

      {result && (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <AiBadge />
            <Typography variant="subtitle2">{editable.length} suggested test data item(s) — review before saving</Typography>
          </Stack>
          <SourceContextCard context={result.sourceContext} />
          {editable.map((item, index) => (
            <Paper key={index} variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                <Checkbox checked={item.selected} onChange={() => toggleSelected(index)} />
                <Stack spacing={1} sx={{ flexGrow: 1 }}>
                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="Name"
                      size="small"
                      value={item.name}
                      onChange={(e) => updateItem(index, { name: e.target.value })}
                      fullWidth
                    />
                    <TextField
                      select
                      label="Type"
                      size="small"
                      value={item.type ?? 'INPUT'}
                      onChange={(e) => updateItem(index, { type: e.target.value })}
                      sx={{ width: 200, flexShrink: 0 }}
                    >
                      {TYPE_OPTIONS.map((t) => (
                        <MenuItem key={t} value={t}>
                          {t}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>
                  <TextField
                    label="Description"
                    size="small"
                    value={item.description ?? ''}
                    onChange={(e) => updateItem(index, { description: e.target.value })}
                    fullWidth
                  />
                  <TextField
                    label="Value"
                    size="small"
                    multiline
                    minRows={2}
                    value={item.value}
                    onChange={(e) => updateItem(index, { value: e.target.value })}
                    fullWidth
                  />
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
