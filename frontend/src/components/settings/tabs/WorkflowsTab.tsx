import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  Paper,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  fetchApprovalPolicies,
  fetchWorkflows,
  updateApprovalPolicy,
  updateWorkflow,
} from '../../../api/adminConfig';
import { useAuth } from '../../../context/AuthContext';
import type { ApiApprovalPolicy, ApiWorkflow } from '../../../types/adminConfig';

const label = (status: string) =>
  status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');

function WorkflowEditor({
  workflow,
  canManage,
  onSaved,
  onMessage,
}: {
  workflow: ApiWorkflow;
  canManage: boolean;
  onSaved: (w: ApiWorkflow) => void;
  onMessage: (m: { text: string; error?: boolean }) => void;
}) {
  const toKey = (from: string, to: string) => `${from}>${to}`;
  const initial = () => new Set(workflow.transitions.map((t) => toKey(t.from, t.to)));
  const [allowed, setAllowed] = useState<Set<string>>(initial);
  const [enforced, setEnforced] = useState(workflow.enforced);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAllowed(initial());
    setEnforced(workflow.enforced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow]);

  const original = initial();
  const dirty =
    enforced !== workflow.enforced ||
    allowed.size !== original.size ||
    [...allowed].some((k) => !original.has(k));

  const toggle = (key: string) =>
    setAllowed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const save = async () => {
    setSaving(true);
    try {
      const transitions = [...allowed].map((k) => {
        const [from, to] = k.split('>');
        return { from, to };
      });
      const updated = await updateWorkflow(workflow.key, enforced, transitions);
      onSaved(updated);
      onMessage({ text: `${workflow.label} saved.` });
    } catch (err) {
      onMessage({ text: err instanceof Error ? err.message : 'Failed to save workflow.', error: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', mb: 1, gap: 1 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {workflow.label}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tick the status changes users are allowed to make. Rows are the current status, columns the new status.
          </Typography>
        </Box>
        <FormControlLabel
          control={
            <Switch checked={enforced} disabled={!canManage} onChange={(e) => setEnforced(e.target.checked)} />
          }
          label={enforced ? 'Enforced' : 'Not enforced (any change allowed)'}
        />
      </Stack>

      <TableContainer sx={{ mt: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>From \ To</TableCell>
              {workflow.statuses.map((to) => (
                <TableCell key={to} align="center">
                  {label(to)}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {workflow.statuses.map((from) => (
              <TableRow key={from}>
                <TableCell sx={{ fontWeight: 500 }}>{label(from)}</TableCell>
                {workflow.statuses.map((to) => (
                  <TableCell key={to} align="center">
                    {from === to ? (
                      '—'
                    ) : (
                      <Checkbox
                        size="small"
                        checked={allowed.has(toKey(from, to))}
                        disabled={!canManage}
                        onChange={() => toggle(toKey(from, to))}
                        slotProps={{ input: { 'aria-label': `${label(from)} to ${label(to)}` } }}
                      />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {canManage && (
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button variant="contained" onClick={() => void save()} disabled={!dirty || saving}>
            {saving ? <CircularProgress size={20} color="inherit" /> : 'Save'}
          </Button>
          <Button
            disabled={!dirty || saving}
            onClick={() => {
              setAllowed(initial());
              setEnforced(workflow.enforced);
            }}
          >
            Cancel
          </Button>
        </Stack>
      )}
    </Paper>
  );
}

function ApprovalPolicies({
  policies,
  canManage,
  onSaved,
  onMessage,
}: {
  policies: ApiApprovalPolicy[];
  canManage: boolean;
  onSaved: (p: ApiApprovalPolicy) => void;
  onMessage: (m: { text: string; error?: boolean }) => void;
}) {
  const change = async (
    policy: ApiApprovalPolicy,
    field: 'requireCommentOnApprove' | 'requireCommentOnReject',
    value: boolean,
  ) => {
    try {
      const updated = await updateApprovalPolicy(policy.key, {
        requireCommentOnApprove: policy.requireCommentOnApprove,
        requireCommentOnReject: policy.requireCommentOnReject,
        [field]: value,
      });
      onSaved(updated);
      onMessage({ text: `${policy.label} rules saved.` });
    } catch (err) {
      onMessage({ text: err instanceof Error ? err.message : 'Failed to save approval rules.', error: true });
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        Approval workflows
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Rules applied when a requirement is reviewed or a UAT cycle / release is signed off.
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Approval</TableCell>
            <TableCell align="center">Comment required to approve</TableCell>
            <TableCell align="center">Comment required to reject</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {policies.map((policy) => (
            <TableRow key={policy.key}>
              <TableCell>{policy.label}</TableCell>
              <TableCell align="center">
                <Switch
                  checked={policy.requireCommentOnApprove}
                  disabled={!canManage}
                  onChange={(e) => void change(policy, 'requireCommentOnApprove', e.target.checked)}
                />
              </TableCell>
              <TableCell align="center">
                {policy.rejectCommentLocked ? (
                  <Tooltip title="Always required for this approval.">
                    <span>
                      <Switch checked disabled />
                    </span>
                  </Tooltip>
                ) : (
                  <Switch
                    checked={policy.requireCommentOnReject}
                    disabled={!canManage}
                    onChange={(e) => void change(policy, 'requireCommentOnReject', e.target.checked)}
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}

export function WorkflowsTab() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('workflows:manage');
  const [workflows, setWorkflows] = useState<ApiWorkflow[] | null>(null);
  const [policies, setPolicies] = useState<ApiApprovalPolicy[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    Promise.all([fetchWorkflows(), fetchApprovalPolicies()])
      .then(([w, p]) => {
        setWorkflows(w);
        setPolicies(p);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load workflows.'));
  }, []);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!workflows) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      {workflows.map((workflow) => (
        <WorkflowEditor
          key={workflow.key}
          workflow={workflow}
          canManage={canManage}
          onMessage={setMessage}
          onSaved={(updated) => setWorkflows((prev) => prev?.map((w) => (w.key === updated.key ? updated : w)) ?? prev)}
        />
      ))}
      <ApprovalPolicies
        policies={policies}
        canManage={canManage}
        onMessage={setMessage}
        onSaved={(updated) => setPolicies((prev) => prev.map((p) => (p.key === updated.key ? updated : p)))}
      />
      <Snackbar
        open={Boolean(message)}
        autoHideDuration={4000}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {message ? (
          <Alert severity={message.error ? 'error' : 'success'} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Stack>
  );
}
