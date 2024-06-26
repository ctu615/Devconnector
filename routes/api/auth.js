const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');
const config = require('config');
const bcrypt = require('bcryptjs');
const { check, validationResult } = require('express-validator');

/**
 * @router   Get api/auth
 *
 * @desc     This is just a Test route
 *
 * @access   Public
 */

router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @router   POST api/auth
 *
 * @desc     Authenticate user &get token
 *
 * @access   Public
 */

router.post(
  '/',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array()
      });
    }

    //  Destructure to pullout everthing in with req.body instead of doing it individually

    const { email, password } = req.body;

    try {
      // See if user exists

      let user = await User.findOne({
        email
      });

      if (!user) {
        return res.status(400).json({
          errors: [
            {
              msg: 'Invalid Credentials'
            }
          ]
        });
      }

      //compares the current login pw to the stored encrypted user pw
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({
          errors: [
            {
              msg: 'Invalid Credentials'
            }
          ]
        });
      }

      // Return jsonwebtoken

      const payload = {
        user: {
          id: user.id
        }
      };

      jwt.sign(
        payload,
        config.get('jwtSecret'),
        {
          expiresIn: '5 days'
        },
        (err, token) => {
          if (err) throw err;
          res.json({
            token
          });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;
