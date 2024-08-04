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
  res.json(users);
});

// GET user by ID
app.get('/users/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// POST new user
app.post('/users', (req, res) => {
  const newUser = {
    id: users.length + 1,
    name: req.body.name,
    email: req.body.email
  };
  users.push(newUser);
  res.status(201).json(newUser);
});

// POST new post
app.post('/posts', (req, res) => {
  const newPost = {
    id: posts.length + 1,
    title: req.body.title,
    body: req.body.body,
    userId: req.body.userId
  };
  posts.push(newPost);
  res.status(201).json(newPost);
});

// GET all posts
app.get('/posts', (req, res) => {
  res.json(posts);
});

// GET post by ID
app.get('/posts/:id', (req, res) => {
  const post = posts.find(p => p.id === parseInt(req.params.id));
  if (!post) return res.status(404).json({ error: 'Post not found' });
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

// 파일 업로드를 처리하는 라우트 추가
app.post('/upload', upload.single('file'), (req, res) => {
  res.status(201).json({ message: 'File uploaded successfully', filename: req.file.originalname });
});

// 파일 업로드 및 포스트 데이터를 처리하는 라우트 추가
app.post('/uploadPost', upload.single('file'), (req, res) => {
  const newPost = {
    id: posts.length + 1,
    title: req.body.title,
    body: req.body.body,
    userId: parseInt(req.body.userId),
    filename: req.file.originalname
  };
  posts.push(newPost);
  res.status(201).json(newPost);
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
