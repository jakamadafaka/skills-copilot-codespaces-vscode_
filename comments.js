// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Store comments
const commentsByPostId = {};

// Get comments by post id
const getComments = (postId) => {
    return commentsByPostId[postId] || [];
};

// Post comments by post id
const postComments = (postId, comment) => {
    const comments = commentsByPostId[postId] || [];
    comments.push(comment);
    commentsByPostId[postId] = comments;
};

// Route handler
app.get('/posts/:id/comments', (req, res) => {
    const comments = getComments(req.params.id);
    res.status(200).send(comments);
});

// Route handler
app.post('/posts/:id/comments', async (req, res) => {
    const comment = req.body;
    postComments(req.params.id, comment);
    await axios.post('http://event-bus-clusterip-srv:3005/events', {
        type: 'CommentCreated',
        data: {
            id: comment.id,
            content: comment.content,
            postId: req.params.id,
            status: 'pending'
        }
    });
    res.status(200).send(commentsByPostId[req.params.id]);
});

// Route handler
app.post('/events', async (req, res) => {
    console.log('Event Received:', req.body.type);
    const { type, data } = req.body;
    if (type === 'CommentModerated') {
        const { postId, id, status, content } = data;
        const comments = commentsByPostId[postId];
        const comment = comments.find(comment => {
            return comment.id === id;
        });
        comment.status = status;
        await axios.post('http://event-bus-clusterip-srv:3005/events', {
            type: 'CommentUpdated',
            data: {
                id,
                postId,
                status,
                content
            }
        });
    }
    res.status(200).send({});
});

// Listen on port 3007
app.listen(3007, () => {
    console.log('Listening on port 3007');
});


