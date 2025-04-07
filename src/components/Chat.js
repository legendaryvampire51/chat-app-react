import React, { useState, useEffect, useRef } from 'react';
import { Box, Container, Paper, Typography, TextField, Button, IconButton, Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import io from 'socket.io-client';

const BACKEND_URL = 'https://chat-app-backend-ybjt.onrender.com';

const ChatContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  height: '80vh',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.background.paper,
}));

const MessagesContainer = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  overflow: 'auto',
  marginBottom: theme.spacing(2),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100],
  borderRadius: theme.shape.borderRadius,
}));

const MessageInput = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
}));

const SystemMessage = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  marginBottom: theme.spacing(1),
  '& .content': {
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    color: theme.palette.text.secondary,
    padding: theme.spacing(0.5, 2),
    borderRadius: theme.shape.borderRadius,
    fontSize: '0.875rem',
  }
}));

const Message = styled(Box)(({ theme, isCurrentUser }) => ({
  display: 'flex',
  justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
  marginBottom: theme.spacing(1),
  '& .content': {
    backgroundColor: isCurrentUser 
      ? theme.palette.primary.main 
      : theme.palette.mode === 'dark' 
        ? theme.palette.grey[700] 
        : theme.palette.grey[300],
    color: isCurrentUser ? theme.palette.primary.contrastText : 'inherit',
    padding: theme.spacing(1, 2),
    borderRadius: theme.shape.borderRadius,
    maxWidth: '70%',
    position: 'relative',
  },
  '& .message-header': {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(0.5),
  },
  '& .message-footer': {
    display: 'flex',
    justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginTop: theme.spacing(0.5),
  },
  '& .timestamp': {
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
  },
  '& .read-receipt': {
    fontSize: '0.75rem',
    color: theme.palette.primary.main,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  },
}));

const Chat = ({ theme, toggleTheme }) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messageStatus, setMessageStatus] = useState({});
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const newSocket = io(BACKEND_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('authenticated', (data) => {
      setIsAuthenticated(true);
      setOnlineUsers(data.users || []);
    });

    socket.on('message', (message) => {
      setMessages((prev) => [...prev, message]);
      // Update message status
      if (message.sender === username) {
        setMessageStatus(prev => ({
          ...prev,
          [message.id]: 'sent'
        }));
      }
    });

    socket.on('messageReceived', (data) => {
      setMessageStatus(prev => ({
        ...prev,
        [data.messageId]: 'received'
      }));
    });

    socket.on('messageRead', (data) => {
      setMessageStatus(prev => ({
        ...prev,
        [data.messageId]: 'read'
      }));
    });

    socket.on('userList', (users) => {
      setOnlineUsers(users || []);
    });

    socket.on('userJoined', (data) => {
      setOnlineUsers(data.users || []);
      setMessages((prev) => [
        ...prev,
        { type: 'system', text: `${data.username} joined the chat` },
      ]);
    });

    socket.on('userLeft', (data) => {
      setOnlineUsers(data.users || []);
      setMessages((prev) => [
        ...prev,
        { type: 'system', text: `${data.username} left the chat` },
      ]);
    });

    return () => {
      socket.off('connect');
      socket.off('authenticated');
      socket.off('message');
      socket.off('messageReceived');
      socket.off('messageRead');
      socket.off('userList');
      socket.off('userJoined');
      socket.off('userLeft');
    };
  }, [socket, username]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    socket?.emit('authenticate', { username });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !isAuthenticated || !socket) return;

    const messageId = Date.now().toString();
    const message = {
      id: messageId,
      text: newMessage,
      timestamp: new Date().toISOString(),
      sender: username
    };

    socket.emit('sendMessage', message);
    setNewMessage('');
    setMessageStatus(prev => ({
      ...prev,
      [messageId]: 'sending'
    }));
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getReadReceipt = (messageId) => {
    const status = messageStatus[messageId];
    switch (status) {
      case 'sending':
        return 'Sending...';
      case 'sent':
        return '✓';
      case 'received':
        return '✓✓';
      case 'read':
        return '✓✓ Read';
      default:
        return '';
    }
  };

  if (!isAuthenticated) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5">Join Chat</Typography>
            <Tooltip title="Toggle dark mode">
              <IconButton onClick={toggleTheme} color="inherit">
                {theme.palette.mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
              </IconButton>
            </Tooltip>
          </Box>
          <form onSubmit={handleLogin}>
            <TextField
              fullWidth
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin="normal"
              variant="outlined"
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mt: 2 }}
            >
              Join
            </Button>
          </form>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <ChatContainer elevation={3}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Chat Room</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="subtitle1">
              Online Users: {onlineUsers.length}
            </Typography>
            <Tooltip title="Toggle dark mode">
              <IconButton onClick={toggleTheme} color="inherit">
                {theme.palette.mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <MessagesContainer>
          {messages.map((message, index) => (
            message.type === 'system' ? (
              <SystemMessage key={index}>
                <Box className="content">
                  {message.text}
                </Box>
              </SystemMessage>
            ) : (
              <Message
                key={index}
                isCurrentUser={message.sender === username}
              >
                <Box className="content">
                  <div className="message-header">
                    <Typography variant="caption" color="inherit">
                      {message.sender}
                    </Typography>
                  </div>
                  <Typography variant="body1">
                    {message.text}
                  </Typography>
                  <div className="message-footer">
                    <Typography variant="caption" className="timestamp">
                      {formatTimestamp(message.timestamp)}
                    </Typography>
                    {message.sender === username && (
                      <Typography variant="caption" className="read-receipt">
                        {getReadReceipt(message.id)}
                      </Typography>
                    )}
                  </div>
                </Box>
              </Message>
            )
          ))}
          <div ref={messagesEndRef} />
        </MessagesContainer>
        <form onSubmit={handleSendMessage}>
          <MessageInput>
            <TextField
              fullWidth
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              variant="outlined"
              size="small"
            />
            <Button type="submit" variant="contained" color="primary">
              Send
            </Button>
          </MessageInput>
        </form>
      </ChatContainer>
    </Container>
  );
};

export default Chat; 