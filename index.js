const express = require("express");
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("hi hello")
});
require('dotenv').config();
app.use(cors());
app.use(express.json());
const jwt = require('jsonwebtoken')

//////////////////////


const { MongoClient, ServerApiVersion, ObjectId, OrderedBulkOperation } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.p7jtpy2.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

function verifyJWT(req, res, next) {
  console.log('token', req.headers.authorization);
  const authHeadr = req.headers.authorization;
  if (!authHeadr) {
    return res.send(401).send(`unauthorized access`)
  };

  const token = authHeadr.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'forbidden access' })
    }
    req.decoded = decoded;
    next()
  })

}

async function run() {
  try {
    const productCollection = client.db('mobile').collection('products');
    const orderCollection = client.db('mobile').collection('order');
    const usersCollection = client.db('mobile').collection('users');

    app.get('/product', async (req, res) => {
      const query = {};
      const cursor = productCollection.find(query).limit(3);
      const products = await cursor.toArray();
      res.send(products)
    })
    app.get('/products', async (req, res) => {
      const query = {};
      const cursor = productCollection.find(query);
      const products = await cursor.toArray();
      res.send(products)
    });


    // ////////////////////////////////////////

    app.post('/order', async (req, res) => {
      const user = req.body;
      const result = await orderCollection.insertOne(user);
      res.send(result)
    });

    app.get('/order', async (req, res) => {
      const query = {};
      const cursor = orderCollection.find(query);
      const user = await cursor.toArray();
      res.send(user)
    })

    app.get('/orders', verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;

      if (email !== decodedEmail) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = { email: email };
      const orders = await orderCollection.find(query).toArray();
      res.send(orders)
    });

    app.delete('/orders/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    })

    // ////////////////////////////////

    // //////////////////////////////


    app.get('/jwt', async (req, res) => {
      const email = req.query.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
        return res.send({ accessToken: token })
      }
      console.log(user);
      res.status(403).send({ accessToken: '' })
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result)
    });

    app.get('/users', async (req, res) => {
      const query = {};
      const cursor = usersCollection.find(query);
      const users = (await cursor.toArray());
      res.send(users)
    });

    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;
      const query = {email : email};
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" })
    })

    app.put('/users/admin/:id', verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;

      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== 'admin') {
        return res.status(403).send({ message: 'forbidden access' });
      }

      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc, options);
      res.send(result)
    })



  } finally {

  }
}
run().catch(console.dir);


//////////////////////

app.listen(port, () => {
  console.log(`hi hello ${port}`)
})