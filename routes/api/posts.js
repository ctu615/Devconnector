const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');
const Post = require('../../models/Post');
const User = require('../../models/User');
const checkObjectId = require('../../middleware/checkObjectId');

/**
 * @router   Post api/posts
 *
 * @desc     Create a post
 *
 * @access   Private
 */

router.post(
  '/',
  [auth, [check('text', 'Text is required').not().isEmpty()]],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array()
      });
    }

    try {
      const user = await User.findById(req.user.id).select('-password');
      const newPost = new Post({
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id
      });
      const post = await newPost.save();

      return res.json(post);
    } catch (err) {
      console.error(err.message);
      return res.status(500).send('Server Error');
    }
  }
);

/**
 * @router   GET api/posts
 *
 * @desc     Get all posts
 *
 * @access   Private
 */

router.get('/', auth, async (req, res) => {
  try {
    const posts = await Post.find().sort({
      date: -1
    });
    return res.json(posts);
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
});

/**
 * @router   GET api/posts/:id
 *
 * @desc     Get post by ID
 *
 * @access   Private
 */

router.get('/:id', [auth, checkObjectId('id')], async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({
        msg: 'Post not found'
      });
    }

    res.json(post);
  } catch (err) {
    console.error(err.message);
    /* if (err.kind === 'ObjectId') {
      return res.status(404).json({
        msg: 'Post not found'
      });
    }
    if (err.name === 'CastError') {
      return res.status(404).json({
        msg: 'Post not found'
      });
    }*/
    return res.status(500).send('Server Error');
  }
});

/**
 * @router   DELETE api/posts/:id
 *
 * @desc     Delete a post by ID
 *
 * @access   Private
 */

router.delete('/:id', [auth, checkObjectId('id')], async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    // Check that post exists
    if (!post) {
      return res.status(404).json({
        msg: 'Post not found'
      });
    }

    //Check user
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({
        msg: 'User not authorized'
      });
    }
    await post.remove();
    res.json({
      msg: 'Post removed'
    });
  } catch (err) {
    console.error(err.message);

    /* if (err.kind === 'ObjectId') {
      return res.status(404).json({
        msg: 'Post not found'
      });
    }

    if (err.name === 'CastError') {
      return res.status(404).json({
        msg: 'Post not found'
      });
    }*/
    return res.status(500).send('Server Error');
  }
});

/**
 * @router   PUT api/posts/like/:id
 *
 * @desc     Like a post by ID
 *
 * @access   Private
 */

router.put('/like/:id', [auth, checkObjectId('id')], async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    // Now check if the post has already been liked by the user

    if (post.likes.some((like) => like.user.toString() === req.user.id)) {
      return res.status(400).json({
        msg: 'Post already liked'
      });
    }
    //unshift puts it in the begining
    post.likes.unshift({
      user: req.user.id
    });

    await post.save();

    return res.json(post.likes);
  } catch (err) {
    console.error(err.message);

    return res.status(500).send('Server Error');
  }
});

/**
 * @router   PUT api/posts/like/:id
 *
 * @desc     Like a post by ID
 *
 * @access   Private
 */

router.put('/unlike/:id', [auth, checkObjectId('id')], async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    // Now check if the post has already been liked by the user

    if (!post.likes.some((like) => like.user.toString() === req.user.id)) {
      return res.status(400).json({
        msg: 'Post has not yet been liked'
      });
    }
    /*//Get remove index
    const removeIndex = post.likes
      .map((like) => like.user.toString())
      .indexOf(req.user.id);*/

    //Remove index
    post.likes = post.likes.filter(
      ({ user }) => user.toString() != req.user.id
    );

    await post.save();

    return res.json(post.likes);
  } catch (err) {
    console.error(err.message);

    return res.status(500).send('Server Error');
  }
});

/**
 * @router   Post api/posts/comment/:id
 *
 * @desc     Comment on a post
 *
 * @access   Private
 */

router.post(
  '/comment/:id',
  [
    auth,
    checkObjectId('id'),
    [check('text', 'Text is required').not().isEmpty()]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array()
      });
    }

    try {
      const user = await User.findById(req.user.id).select('-password');
      const post = await Post.findById(req.params.id);

      const newComment = {
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id
      };

      post.comments.unshift(newComment);
      await post.save();

      res.json(post.comments);
    } catch (err) {
      console.error(err.message);
      return res.status(500).send('Server Error');
    }
  }
);

/**
 * @router   DELETE api/posts/comment/:id/:comment_id
 *
 * @desc     Delete comment
 *
 * @access   Private
 */

router.delete('/comment/:id/:comment_id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    // Pull out comments
    const comment = post.comments.find(
      (comment) => comment.id === req.params.comment_id
    );

    // Make sure comment exists
    if (!comment) {
      return res.status(404).json({
        msg: 'Comment does not exist'
      });
    }

    /* // Check user
    if (comment.user.toString() !== req.user.id) {
      return res.status(401).json({
        msg: 'User not authorized',
      });
    }
*/
    // Get remove index
    /* const removeIndex = post.comments
      .map((comment) => comment.id)
      .indexOf(req.params.comment_id);

    post.comments.splice(removeIndex, 1);*/

    post.comments = post.comments.filter(
      ({ id }) => id !== req.params.comment_id
    );

    await post.save();

    return res.json(post.comments);
  } catch (err) {
    console.error(err.message);
    return res.status(500).send('Server Error');
  }
});

module.exports = router;
