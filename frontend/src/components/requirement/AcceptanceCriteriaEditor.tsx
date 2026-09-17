import { IconButton, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import Button from '@mui/material/Button';

interface AcceptanceCriteriaEditorProps {
  criteria: string[];
  errors?: (string | null)[];
  onChange: (criteria: string[]) => void;
}

export function AcceptanceCriteriaEditor({
  criteria,
  errors,
  onChange,
}: AcceptanceCriteriaEditorProps) {
  const handleAdd = () => {
    onChange([...criteria, '']);
  };

  const handleRemove = (index: number) => {
    onChange(criteria.filter((_, i) => i !== index));
  };

  const handleTextChange = (index: number, value: string) => {
    onChange(criteria.map((text, i) => (i === index ? value : text)));
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2" color="text.secondary">
        Acceptance Criteria
      </Typography>

      {criteria.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No acceptance criteria added yet.
        </Typography>
      )}

      {criteria.map((text, index) => (
        <Stack key={index} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, minWidth: 20 }}>
            {index + 1}.
          </Typography>
          <TextField
            fullWidth
            size="small"
            multiline
            placeholder="e.g. User can request a password reset using a registered email."
            value={text}
            error={Boolean(errors?.[index])}
            helperText={errors?.[index] ?? ' '}
            onChange={(e) => handleTextChange(index, e.target.value)}
          />
          <IconButton size="small" onClick={() => handleRemove(index)} sx={{ mt: 0.5 }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      ))}

      <Button size="small" startIcon={<AddIcon />} onClick={handleAdd} sx={{ alignSelf: 'flex-start' }}>
        Add Criterion
      </Button>
    </Stack>
  );
}
