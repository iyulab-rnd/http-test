const express = require('express');
const multer = require('multer');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

let users = [
  { id: 1, name: 'John Doe', email: 'john@example.com' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
];

let posts = [];

// GET all users
app.get('/users', (req, res) => {
  let filteredUsers = users;

  if (req.query.name) {
    filteredUsers = filteredUsers.filter(u => u.name.includes(req.query.name));
  }

  if (req.query.limit) {
    filteredUsers = filteredUsers.slice(0, parseInt(req.query.limit));
  }

  res.json(filteredUsers);
});

// GET user by ID
app.get('/users/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// POST new user
app.post('/users', (req, res) => {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(req.body.email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const newUser = {
    id: users.length + 1,
    name: req.body.name,
    email: req.body.email
  };
  users.push(newUser);
  res.status(201).json(newUser);
});

// PUT update user
app.put('/users/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.name = req.body.name || user.name;
  user.email = req.body.email || user.email;

  res.json(user);
});

// DELETE user
app.delete('/users/:id', (req, res) => {
  const userIndex = users.findIndex(u => u.id === parseInt(req.params.id));
  if (userIndex === -1) return res.status(404).json({ error: 'User not found' });

  users.splice(userIndex, 1);
  res.status(204).send();
});

// POST new post
app.post('/posts', (req, res) => {
  if (!req.body.title || !req.body.body || !req.body.userId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const newPost = {
    id: posts.length + 1,
    title: req.body.title,
    body: req.body.body,
    userId: parseInt(req.body.userId)
  };
  posts.push(newPost);
  res.status(201).json(newPost);
});

// GET post by ID
app.get('/posts/:id', (req, res) => {
  const post = posts.find(p => p.id === parseInt(req.params.id));
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json(post);
});

// PATCH update post title
app.patch('/posts/:id', (req, res) => {
  const post = posts.find(p => p.id === parseInt(req.params.id));
  if (!post) return res.status(404).json({ error: 'Post not found' });

  post.title = req.body.title || post.title;
  res.json(post);
});

// GET comments for a post (simulated)
app.get('/posts/:postId/comments', (req, res) => {
  const postId = parseInt(req.params.postId);
  const comments = posts.find(p => p.id === postId)?.comments || [];
  res.json(comments.map((comment, index) => ({
    postId,
    id: index + 1,
    ...comment
  })));
});

// POST new comment on post
app.post('/posts/:postId/comments', (req, res) => {
  const post = posts.find(p => p.id === parseInt(req.params.postId));
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const comment = {
    body: req.body.body,
    userId: req.body.userId
  };

  if (!post.comments) post.comments = [];
  post.comments.push(comment);

  res.status(201).json(comment);
});

// GET all posts with query parameters
app.get('/posts', (req, res) => {
  let filteredPosts = posts;

  if (req.query.userId) {
    filteredPosts = filteredPosts.filter(p => p.userId === parseInt(req.query.userId));
  }

  if (req.query.limit) {
    filteredPosts = filteredPosts.slice(0, parseInt(req.query.limit));
  }

  res.json(filteredPosts);
});

// GET all posts by user
app.get('/users/:id/posts', (req, res) => {
  const userPosts = posts.filter(p => p.userId === parseInt(req.params.id));
  res.json(userPosts);
});

// 파일 업로드를 처리하는 라우트 추가
app.post('/upload', upload.single('file'), (req, res) => {
  res.status(201).json({ message: 'File uploaded successfully', filename: req.file.originalname });
});

// FormData 데이터를 처리하는 라우트 추가
app.post('/submitForm', upload.none(), (req, res) => {
  const newUser = {
    id: users.length + 1,
    name: req.body.name,
    email: req.body.email
  };
  users.push(newUser);
  res.status(201).json(newUser);
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
