import React, { useState, useEffect, useRef } from 'react';
import { Box, Container, Paper, Typography, TextField, Button, List } from '@mui/material';
import { styled } from '@mui/material/styles';
import io from 'socket.io-client';

const BACKEND_URL = 'https://chat-app-backend-ybjt.onrender.com';

const ChatContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  height: '80vh',
  display: 'flex',
  flexDirection: 'column',
}));

const MessagesContainer = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  overflow: 'auto',
  marginBottom: theme.spacing(2),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.grey[100],
  borderRadius: theme.shape.borderRadius,
}));

const MessageInput = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
}));

const Message = styled(Box)(({ theme, isCurrentUser }) => ({
  display: 'flex',
  justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
  marginBottom: theme.spacing(1),
  '& .content': {
    backgroundColor: isCurrentUser ? theme.palette.primary.main : theme.palette.grey[300],
    color: isCurrentUser ? theme.palette.primary.contrastText : 'inherit',
    padding: theme.spacing(1, 2),
    borderRadius: theme.shape.borderRadius,
    maxWidth: '70%',
  },
}));

const Chat = () => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
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
      setOnlineUsers(data.users);
    });

    socket.on('message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on('userList', (users) => {
      setOnlineUsers(users);
    });

    socket.on('userJoined', (data) => {
      setOnlineUsers(data.users);
      setMessages((prev) => [
        ...prev,
        { type: 'system', text: `${data.username} joined the chat` },
      ]);
    });

    socket.on('userLeft', (data) => {
      setOnlineUsers(data.users);
      setMessages((prev) => [
        ...prev,
        { type: 'system', text: `${data.username} left the chat` },
      ]);
    });

    return () => {
      socket.off('connect');
      socket.off('authenticated');
      socket.off('message');
      socket.off('userList');
      socket.off('userJoined');
      socket.off('userLeft');
    };
  }, [socket]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    socket.emit('authenticate', { username });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !isAuthenticated) return;

    socket.emit('sendMessage', {
      text: newMessage,
      timestamp: new Date().toISOString(),
    });
    setNewMessage('');
  };

  if (!isAuthenticated) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Join Chat
          </Typography>
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
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6">Chat Room</Typography>
          <Typography variant="subtitle1">
            Online Users: {onlineUsers.length}
          </Typography>
        </Box>
        <MessagesContainer>
          {messages.map((message, index) => (
            <Message
              key={index}
              isCurrentUser={message.sender === username}
            >
              <Box className="content">
                {message.type === 'system' ? (
                  <Typography variant="body2" color="textSecondary">
                    {message.text}
                  </Typography>
                ) : (
                  <>
                    <Typography variant="caption" color="inherit">
                      {message.sender}
                    </Typography>
                    <Typography variant="body1">
                      {message.text}
                    </Typography>
                  </>
                )}
              </Box>
            </Message>
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