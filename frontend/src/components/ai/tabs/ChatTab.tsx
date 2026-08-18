import { useEffect, useRef, useState } from 'react';
import { Alert, Avatar, Box, CircularProgress, IconButton, Paper, Stack, TextField, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import { sendChatMessage } from '../../../api/ai';
import { aiErrorMessage } from '../../../utils/aiErrorMessage';
import type { ChatMessage } from '../../../types/ai';

// There is no user/session model in TestSphere to persist conversation
// history against server-side, so the conversation lives in the browser
// (localStorage) -- every turn is still recorded server-side in the
// AiSuggestion audit trail (visible in the History tab), just not threaded
// back into a "session" the server itself understands.
const STORAGE_KEY = 'testsphere.ai.chatHistory';

function loadHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

export function ChatTab({ aiConfigured }: { aiConfigured: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadHistory());
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const message = input.trim();
    if (!message || sending) return;
    setInput('');
    setError(null);
    const history = messages;
    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    setSending(true);
    try {
      const res = await sendChatMessage(message, history);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.reply }]);
    } catch (err) {
      setError(aiErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        A general QA/testing assistant. It does not have live access to this organization's data -- for
        release readiness, coverage, or defect specifics, use the dedicated tabs, which ground the AI in
        real computed numbers.
      </Typography>

      {!aiConfigured && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Configure an AI provider to chat. Messages you send will fail clearly rather than receive a
          fabricated reply.
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper variant="outlined" sx={{ height: 420, overflowY: 'auto', p: 2, mb: 2 }}>
        {messages.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
            No messages yet. Ask something about test planning, defect triage, or release readiness.
          </Typography>
        )}
        <Stack spacing={2}>
          {messages.map((m, i) => (
            <Stack key={i} direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
              <Avatar sx={{ width: 28, height: 28, bgcolor: m.role === 'user' ? 'primary.main' : 'secondary.main' }}>
                {m.role === 'user' ? <PersonIcon fontSize="small" /> : <SmartToyIcon fontSize="small" />}
              </Avatar>
              <Paper
                variant="outlined"
                sx={{
                  p: 1.5,
                  maxWidth: '75%',
                  bgcolor: m.role === 'user' ? 'primary.main' : 'background.paper',
                  color: m.role === 'user' ? 'primary.contrastText' : 'text.primary',
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{m.content}</Typography>
              </Paper>
            </Stack>
          ))}
          {sending && (
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Avatar sx={{ width: 28, height: 28, bgcolor: 'secondary.main' }}><SmartToyIcon fontSize="small" /></Avatar>
              <CircularProgress size={18} />
            </Stack>
          )}
          <div ref={bottomRef} />
        </Stack>
      </Paper>

      <Stack direction="row" spacing={1}>
        <TextField
          fullWidth
          size="small"
          placeholder="Ask the AI testing assistant…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={!aiConfigured}
        />
        <IconButton color="primary" onClick={handleSend} disabled={!input.trim() || sending || !aiConfigured}>
          <SendIcon />
        </IconButton>
      </Stack>
      {messages.length > 0 && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 1, display: 'inline-block', cursor: 'pointer' }}
          onClick={handleClear}
        >
          Clear conversation
        </Typography>
      )}
    </Box>
  );
}
