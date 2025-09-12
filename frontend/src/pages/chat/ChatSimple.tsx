import type { ChatMessage } from 'src/services/ai-chat.service';

import { useRef, useState, useEffect } from 'react';

import {
  Box,
  Card,
  Chip,
  Paper,
  Stack,
  Avatar,
  Button,
  Container,
  TextField,
  Typography,
  IconButton,
  CircularProgress,
} from '@mui/material';

import { 
  getAIResponse, 
  clearChatHistory,
  saveMessagesToStorage,
  loadMessagesFromStorage
} from 'src/services/ai-chat.service';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages on component mount
  useEffect(() => {
    const loadedMessages = loadMessagesFromStorage();
    setMessages(loadedMessages);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save messages to storage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      saveMessagesToStorage(messages);
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const messageText = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: messageText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      // Get AI response
      const updatedMessages = [...messages, userMessage];
      const aiResponseText = await getAIResponse(updatedMessages);
      
      // Add AI response
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: aiResponseText,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to get AI response:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Error: Could not fetch response. Please try again later.',
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
  };

  const handleClearChat = () => {
    clearChatHistory();
    setMessages([]);
  };

  const formatTime = (date: Date) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        AI Assistant
      </Typography>

      <Card sx={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
        {/* Chat Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h6">AI Chat Assistant</Typography>
              <Chip
                label={`${messages.length} messages`}
                color="primary"
                variant="outlined"
                size="small"
              />
            </Box>
            {messages.length > 0 && (
              <Button
                variant="outlined"
                size="small"
                onClick={handleClearChat}
                startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
              >
                Clear Chat
              </Button>
            )}
          </Stack>
        </Box>

        {/* Messages Area */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <Scrollbar sx={{ height: '100%', p: 2 }}>
            <Stack spacing={2}>
              {messages.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Welcome to AI Assistant
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Start a conversation by typing a message below
                  </Typography>
                </Box>
              )}
              
              {messages.map((message) => (
                <Box
                  key={message.id}
                  sx={{
                    display: 'flex',
                    justifyContent: message.isUser ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Stack
                    direction={message.isUser ? 'row-reverse' : 'row'}
                    spacing={1}
                    alignItems="flex-end"
                    sx={{ maxWidth: '70%' }}
                  >
                    <Avatar
                      sx={{ 
                        width: 32, 
                        height: 32,
                        bgcolor: message.isUser ? 'primary.main' : 'secondary.main'
                      }}
                    >
                      {message.isUser ? (
                        <Iconify icon="solar:user-rounded-bold" />
                      ) : (
                        <Iconify icon="solar:chat-round-dots-bold" />
                      )}
                    </Avatar>
                    
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 1, mb: 0.5, display: 'block' }}
                      >
                        {message.isUser ? 'You' : 'AI Assistant'}
                      </Typography>
                      
                      <Paper
                        elevation={1}
                        sx={{
                          p: 1.5,
                          bgcolor: message.isUser ? 'primary.main' : 'background.paper',
                          color: message.isUser ? 'primary.contrastText' : 'text.primary',
                          borderRadius: 2,
                        }}
                      >
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {message.text}
                        </Typography>
                      </Paper>
                      
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: 'block',
                          textAlign: message.isUser ? 'right' : 'left',
                          mt: 0.5,
                        }}
                      >
                        {formatTime(new Date(message.timestamp))}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              ))}
              
              {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                      <Iconify icon="solar:chat-round-dots-bold" />
                    </Avatar>
                    <Paper
                      elevation={1}
                      sx={{
                        p: 1.5,
                        bgcolor: 'background.paper',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <CircularProgress size={16} />
                      <Typography variant="body2" color="text.secondary">
                        AI is thinking...
                      </Typography>
                    </Paper>
                  </Stack>
                </Box>
              )}
              
              <div ref={messagesEndRef} />
            </Stack>
          </Scrollbar>
        </Box>

        {/* Input Area */}
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Stack direction="row" spacing={1} component="form" onSubmit={handleSendMessage} alignItems="flex-end">
            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder="Ask me anything... (Enter to send, Shift+Enter for new line)"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              variant="outlined"
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                },
              }}
            />
            <IconButton
              type="submit"
              color="primary"
              disabled={!inputValue.trim() || isLoading}
              sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                height: 40,
                width: 40,
                flexShrink: 0,
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
                '&.Mui-disabled': {
                  bgcolor: 'action.disabledBackground',
                  color: 'action.disabled',
                },
              }}
            >
              {isLoading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <Iconify icon="eva:arrow-forward-fill" width={20} />
              )}
            </IconButton>
          </Stack>
        </Box>
      </Card>
    </Container>
  );
}
