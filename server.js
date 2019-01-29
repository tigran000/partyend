const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectID;
const isAuth = require('./is-auth');
const axios = require('axios');
const path = require('path');
const app = express();
const url = 'mongodb+srv://emer:vzgo@cluster0-fyxxq.mongodb.net/test?retryWrites=true'

const PORT = process.env.PORT || 3001

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'client', 'build')));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.get('/api/profile', isAuth, (req, res) => {
  const { user } = req.token
  MongoClient.connect(url, { useNewUrlParser: true })
    .then(client => {
      client
        .db('test')
        .collection('user')
        .findOne({ _id: user._id })
        .then(user => {
          res.json(user)
        })
      client.close();
    }).catch(err => {
      console.log(err);
      client.close();
    })
})

app.post('/api/wishlist', isAuth, (req, res) => {
  MongoClient.connect(url, { useNewUrlParser: true })
    .then(client => {
      client
        .db('test')
        .collection('user')
        .findOneAndUpdate(
          { _id: req.token.user._id },
          {
            $push: {
              wishlist: {
                _id: ObjectId(),
                ...req.body
              }
            }
          }, { returnOriginal: false })
        .then(response => {
          res.json(response.value.wishlist)
        });
      client.close();
    })
    .catch(err => {
      console.log(err);
      client.close();
    })
})


app.delete('/api/wishlist/:deleteid', isAuth, (req, res) => {
  MongoClient.connect(url, { useNewUrlParser: true })
    .then(client => {
      client
        .db('test')
        .collection('user')
        .findOneAndUpdate({ _id: req.token.user._id },
          {
            $pull: {
              wishlist: { _id: ObjectId(req.params.deleteid) }
            }
          }, { returnOriginal: false })
        .then(response => {
          res.json(response.value.wishlist)
        })
      client.close()
    }).catch(err => {
      console.log(err);
      client.close();
    })
})

app.post('/api/login', (req, res) => {
  const { user } = req.body
  const appToken = '2274361302637500|UZM9d63xxNjwt8-Z5lZcsL_d4X4' // got from request specifing  clientId and clientSecret
  const link = 'https://graph.facebook.com/debug_token?input_token=' + user.userToken + '&access_token=' + appToken
  axios.get(link)
    .then(response => {
      console.log(response.data.data.user_id)
      if (!response.data.data.user_id) {
        res.status(400).json({ error: "Invalid User" })
      } else {
        delete user.userToken
        MongoClient.connect(url, { useNewUrlParser: true })
          .then(client => {
            client
              .db('test')
              .collection('user')
              .updateOne({ _id: user._id }, { $set: user }, { upsert: true })
            client.close();
          })
          .catch(err => {
            console.log(err);
            client.close();
          })

 
        jwt.sign({ user }, 'tigranssecretkey', (err, token) => {
          res.json({
            token
          });
        });
      }
    })
});



// app.get('/*', (req, res) => {
//   res.sendFile(path.join(__dirname, "client", 'build', 'index.html'));
// })
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`)
});